import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def run_priority_allocator(regions, initial, final):
    TOTAL_SPECTRUM = 1200
    ALPHA = 0.6
    BETA = 0.4
    MIN_REGION_BW = 5

    priority_df = pd.read_csv("data/priority_list.csv")

    p_cols = [
        "spectrum_usage","financial_importance","military_importance",
        "election_importance","disaster_risk","news_priority"
    ]

    scaler = MinMaxScaler()
    priority_df[p_cols] = scaler.fit_transform(priority_df[p_cols])

    priority_df["priority_weight"] = (
        0.35 * priority_df["spectrum_usage"] +
        0.20 * priority_df["financial_importance"] +
        0.20 * priority_df["military_importance"] +
        0.10 * priority_df["election_importance"] +
        0.10 * priority_df["disaster_risk"] +
        0.05 * priority_df["news_priority"]
    )

    priority_map = dict(
        zip(priority_df["state"].str.lower(),
            priority_df["priority_weight"])
    )

    madrl_delta = final - initial
    madrl_delta = madrl_delta - madrl_delta.min() + 1e-6
    madrl_delta = madrl_delta / madrl_delta.sum()

    scores = []
    for i, region in enumerate(regions):
        pr = priority_map.get(region.lower(), 0.5)
        scores.append(ALPHA*madrl_delta[i] + BETA*pr)

    scores = np.array(scores)
    scores = scores / scores.sum()

    remaining_bw = TOTAL_SPECTRUM - (len(regions)*MIN_REGION_BW)
    allocated_bw = scores*remaining_bw + MIN_REGION_BW

    return allocated_bw
