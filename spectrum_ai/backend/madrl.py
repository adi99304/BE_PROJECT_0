import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical
from sklearn.preprocessing import MinMaxScaler

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

REGION_COL = "Jio_Cluster"

FEATURES = [
    "Bandwidth_MHz",
    "Frequency_MHz",
    "Paging_Success_Rate",
    "Power_Usage_kW",
    "Energy_Consumption_kWh"
]


class Actor(nn.Module):
    def __init__(self, s_dim, a_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(s_dim, 128),
            nn.ReLU(),
            nn.Linear(128, a_dim)
        )

    def forward(self, x):
        return Categorical(logits=self.net(x))


class Critic(nn.Module):
    def __init__(self, s_dim, n_agents):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(s_dim*n_agents, 256),
            nn.ReLU(),
            nn.Linear(256, 1)
        )

    def forward(self, states):
        return self.net(states.view(states.size(0), -1))


class SpectrumEnv:
    def __init__(self, region_data, regions):
        self.region_data = region_data
        self.regions = regions
        self.n_agents = len(regions)
        self.t = 0
        self.min_len = min(len(v) for v in region_data.values())

    def reset(self):
        self.t = np.random.randint(0, self.min_len-1)
        return self.get_state()

    def get_state(self):
        return torch.stack(
            [self.region_data[r][self.t] for r in self.regions]
        ).to(DEVICE)

    def step(self, actions, spectrum):
        delta_map = torch.tensor([-0.10, -0.05, 0, 0.05, 0.10], device=DEVICE)
        delta = delta_map[actions]

        new_spectrum = torch.clamp(spectrum * (1 + delta), 5, 100)

        utilization = new_spectrum.mean() / 100
        fairness = (new_spectrum.sum()**2) / (
            self.n_agents * (new_spectrum**2).sum() + 1e-8
        )
        energy = self.get_state()[:, -1].mean()

        reward = 2*utilization + 3*fairness - energy

        self.t += 1
        done = self.t >= self.min_len-1

        return self.get_state(), reward, done, new_spectrum


def run_madrl():
    df = pd.read_csv("data/PanIndia_energy.csv")
    df = df[[REGION_COL] + FEATURES].dropna()

    scaler = MinMaxScaler()
    df[FEATURES] = scaler.fit_transform(df[FEATURES])

    regions = df[REGION_COL].unique().tolist()
    N_AGENTS = len(regions)

    region_data = {
        r: torch.tensor(
            df[df[REGION_COL] == r][FEATURES].values,
            dtype=torch.float32
        )
        for r in regions
    }

    env = SpectrumEnv(region_data, regions)

    STATE_DIM = len(FEATURES)
    ACTION_DIM = 5

    actors = [Actor(STATE_DIM, ACTION_DIM).to(DEVICE) for _ in range(N_AGENTS)]
    critic = Critic(STATE_DIM, N_AGENTS).to(DEVICE)

    actor_opt = optim.Adam(
        [p for a in actors for p in a.parameters()], lr=3e-4
    )
    critic_opt = optim.Adam(critic.parameters(), lr=1e-3)

    init_vals = []
    for r in regions:
        avg_bw = region_data[r][:,0].mean() * 100
        init_vals.append(max(avg_bw, 5.0))

    current_spectrum = torch.tensor(init_vals, device=DEVICE)
    initial_spectrum = current_spectrum.clone()

    EPISODES = 25
    GAMMA = 0.96

    for ep in range(EPISODES):
        state = env.reset()
        spectrum = current_spectrum.clone()
        done = False

        states, rewards = [], []

        while not done:
            actions = []

            for i, actor in enumerate(actors):
                dist = actor(state[i])
                actions.append(dist.sample())

            actions = torch.stack(actions)
            next_state, reward, done, spectrum = env.step(actions, spectrum)

            states.append(state)
            rewards.append(reward)
            state = next_state

        returns, G = [], 0
        for r in reversed(rewards):
            G = r + GAMMA*G
            returns.insert(0, G)
        returns = torch.tensor(returns, device=DEVICE)

        values = critic(torch.stack(states)).squeeze()
        critic_loss = nn.MSELoss()(values, returns)

        critic_opt.zero_grad()
        critic_loss.backward()
        critic_opt.step()

        advantage = returns - values.detach()
        actor_loss = 0

        for t in range(len(states)):
            for i in range(N_AGENTS):
                dist = actors[i](states[t][i])
                actor_loss += -dist.log_prob(actions[i]) * advantage[t]

        actor_opt.zero_grad()
        actor_loss.backward()
        actor_opt.step()

        current_spectrum = spectrum.clone()

        # -------------------------
    # SAVE TRAINED MODEL
    # -------------------------
    torch.save({
        "actors": [a.state_dict() for a in actors],
        "critic": critic.state_dict(),
        "spectrum": current_spectrum,
        "regions": regions,
        "initial_spectrum": initial_spectrum,
        "final_spectrum": current_spectrum
    }, "madrl_model.pt")

    print("MADRL model saved.")

    return regions, initial_spectrum.cpu().numpy(), current_spectrum.cpu().numpy()
if __name__ == "__main__":
    run_madrl()
