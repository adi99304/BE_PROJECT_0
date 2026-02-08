import React, { useState } from "react";
import axios from "axios";
import { Bar, Doughnut } from "react-chartjs-2";
import Plot from 'react-plotly.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const runAllocation = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/run-allocation");
      setData(res.data);
    } catch (error) {
      console.error("Error running allocation:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = data
    ? {
        labels: Object.keys(data),
        datasets: [
          {
            label: "Final Allocation (MHz)",
            data: Object.values(data).map(v => v.final || 0),
            backgroundColor: "#6366f1",
            borderRadius: 8,
            barThickness: 32
          }
        ]
      }
    : null;

  const total = data
    ? Object.values(data).reduce((a, b) => a + (b.final || 0), 0).toFixed(0)
    : "-";

  const TOTAL_SPECTRUM = 1200;
  const allocatedSpectrum = data ? parseFloat(total) : 0;
  const availableSpectrum = TOTAL_SPECTRUM - allocatedSpectrum;
  const allocatedPercent = data ? ((allocatedSpectrum / TOTAL_SPECTRUM) * 100).toFixed(1) : 0;
  const availablePercent = data ? ((availableSpectrum / TOTAL_SPECTRUM) * 100).toFixed(1) : 0;

  const utilizationData = {
    labels: ["Allocated", "Available"],
    datasets: [
      {
        data: data ? [allocatedSpectrum, availableSpectrum] : [0, 100],
        backgroundColor: ["#6366f1", "#22d3ee"],
        borderWidth: 0
      }
    ]
  };

  const topRegionsData = data
    ? {
        labels: Object.entries(data)
          .sort((a, b) => (b[1].final || 0) - (a[1].final || 0))
          .slice(0, 5)
          .map(([key]) => key),
        datasets: [
          {
            label: "Final Spectrum (MHz)",
            data: Object.entries(data)
              .sort((a, b) => (b[1].final || 0) - (a[1].final || 0))
              .slice(0, 5)
              .map(([, value]) => value.final || 0),
            backgroundColor: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
            borderRadius: 6,
            barThickness: 24
          }
        ]
      }
    : null;

  return (
    <div style={styles.container}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={styles.main}>
        {activeTab === "Dashboard" && (
          <DashboardView
            data={data}
            loading={loading}
            runAllocation={runAllocation}
            total={total}
            allocatedPercent={allocatedPercent}
            allocatedSpectrum={allocatedSpectrum}
            availableSpectrum={availableSpectrum}
            availablePercent={availablePercent}
            utilizationData={utilizationData}
            chartData={chartData}
            topRegionsData={topRegionsData}
            TOTAL_SPECTRUM={TOTAL_SPECTRUM}
          />
        )}

        {activeTab === "Allocation" && (
          <AllocationView
            data={data}
            loading={loading}
            runAllocation={runAllocation}
          />
        )}

        {/* {activeTab === "Policy" && (
          <div style={styles.comingSoon}>
            <div style={styles.comingSoonIcon}>📋</div>
            <h2 style={styles.comingSoonTitle}>Policy Management</h2>
            <p style={styles.comingSoonText}>This feature is coming soon</p>
          </div>
        )} */}

        {activeTab === "Policy" && (
  <div>
    <h2 style={styles.title}>Policy Guardian Insights</h2>
    <p style={styles.subtitle}>
      RAG-based regulatory validation from TRAI & NFAP documents
    </p>

    {!data && (
      <p>Run allocation first to view policy compliance.</p>
    )}

    {data && (
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeaderRow}>
            <th style={styles.tableHeader}>State</th>
            <th style={styles.tableHeader}>Final MHz</th>
            <th style={styles.tableHeader}>Policy Cap</th>
            <th style={styles.tableHeader}>Status</th>
            <th style={styles.tableHeader}>Allocation Reason</th>
            <th style={styles.tableHeader}>Policy Reason</th>

          </tr>
        </thead>

        <tbody>
          {Object.entries(data).map(([state, v]) => (
            <tr key={state} style={styles.tableRow}>
              <td style={styles.tableCell}>{state}</td>
              <td style={styles.tableCell}>{v.final.toFixed(2)}</td>
              <td style={styles.tableCell}>{v.policy_cap}</td>

              <td style={styles.tableCell}>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 700,
                  color: v.policy_status === "CAPPED" ? "#dc2626" : "#16a34a",
                  background: v.policy_status === "CAPPED"
                    ? "#fee2e2"
                    : "#dcfce7"
                }}>
                  {v.policy_status}
                </span>
              </td>
<td title={v.allocation_reason}>View</td>
<td title={v.policy_reason}>View</td>


            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}


        {activeTab === "Settings" && (
          <div style={styles.comingSoon}>
            <div style={styles.comingSoonIcon}>⚙️</div>
            <h2 style={styles.comingSoonTitle}>Settings</h2>
            <p style={styles.comingSoonText}>This feature is coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AllocationView({ data, loading, runAllocation }) {
  // Indian States and Union Territories mapping
  const stateNameMap = {
    "AP": "Andhra Pradesh", "AR": "Arunachal Pradesh", "AS": "Assam", "BR": "Bihar",
    "CG": "Chhattisgarh", "GA": "Goa", "GJ": "Gujarat", "HR": "Haryana",
    "HP": "Himachal Pradesh", "JH": "Jharkhand", "KA": "Karnataka", "KL": "Kerala",
    "MP": "Madhya Pradesh", "MH": "Maharashtra", "MN": "Manipur", "ML": "Meghalaya",
    "MZ": "Mizoram", "NL": "Nagaland", "OR": "Odisha", "PB": "Punjab",
    "RJ": "Rajasthan", "SK": "Sikkim", "TN": "Tamil Nadu", "TS": "Telangana",
    "TR": "Tripura", "UP": "Uttar Pradesh", "UK": "Uttarakhand", "WB": "West Bengal",
    "AN": "Andaman and Nicobar", "CH": "Chandigarh", "DH": "Dadra and Nagar Haveli and Daman and Diu",
    "DL": "Delhi", "JK": "Jammu and Kashmir", "LA": "Ladakh", "LD": "Lakshadweep", "PY": "Puducherry"
  };

  // GeoJSON state codes mapping (ISO codes used by Plotly)
  const stateCodeMapping = {
    "AP": "IN-AP", "AR": "IN-AR", "AS": "IN-AS", "BR": "IN-BR",
    "CG": "IN-CT", "GA": "IN-GA", "GJ": "IN-GJ", "HR": "IN-HR",
    "HP": "IN-HP", "JH": "IN-JH", "KA": "IN-KA", "KL": "IN-KL",
    "MP": "IN-MP", "MH": "IN-MH", "MN": "IN-MN", "ML": "IN-ML",
    "MZ": "IN-MZ", "NL": "IN-NL", "OR": "IN-OR", "PB": "IN-PB",
    "RJ": "IN-RJ", "SK": "IN-SK", "TN": "IN-TN", "TS": "IN-TG",
    "TR": "IN-TR", "UP": "IN-UP", "UK": "IN-UT", "WB": "IN-WB",
    "AN": "IN-AN", "CH": "IN-CH", "DH": "IN-DH", "DL": "IN-DL",
    "JK": "IN-JK", "LA": "IN-LA", "LD": "IN-LD", "PY": "IN-PY"
  };

  // Get allocation category based on percentile
  const getAllocationCategory = (value, allValues) => {
    const sorted = allValues.sort((a, b) => a - b);
    const percentile = (sorted.indexOf(value) / sorted.length) * 100;
    
    if (percentile >= 80) return { category: "Very High", range: "80-100%", color: "#d32f2f" };
    if (percentile >= 60) return { category: "High", range: "60-80%", color: "#ff6f00" };
    if (percentile >= 40) return { category: "Medium", range: "40-60%", color: "#ffa726" };
    if (percentile >= 20) return { category: "Low", range: "20-40%", color: "#4fc3f7" };
    return { category: "Very Low", range: "0-20%", color: "#1e88e5" };
  };

  const getChoroplethData = () => {
  if (!data) return { locations: [], z: [], text: [] };

  const locations = [];
  const z = [];
  const text = [];

  Object.entries(data).forEach(([state, values]) => {
    locations.push(state);   // <-- STATE NAME DIRECTLY
    z.push(values.final || 0);

    text.push(
      `${state}<br>
       Initial: ${(values.initial || 0).toFixed(2)} MHz<br>
       Final: ${(values.final || 0).toFixed(2)} MHz<br>
       Change: ${(values.change || 0).toFixed(2)} MHz`
    );
  });

  return { locations, z, text };
};

  const mapData = getChoroplethData();

  // Calculate statistics
  const getStatistics = () => {
    if (!data) return { highest: null, lowest: null, average: 0, total: 0 };

    const entries = Object.entries(data);
    const sorted = entries.sort((a, b) => (b[1].final || 0) - (a[1].final || 0));
    
    return {
      highest: { state: sorted[0][0], value: sorted[0][1].final },
      lowest: { state: sorted[sorted.length - 1][0], value: sorted[sorted.length - 1][1].final },
      average: Object.values(data).reduce((a, b) => a + (b.final || 0), 0) / entries.length,
      total: entries.length
    };
  };

  const stats = getStatistics();

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Spectrum Allocation Map of India</h2>
          <p style={styles.subtitle}>State-wise spectrum allocation based on MADRL optimization</p>
        </div>
        <button 
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1
          }} 
          onClick={runAllocation}
          disabled={loading}
        >
          {loading ? "Running..." : "Run Allocation"}
        </button>
      </div>

      {/* Main Choropleth Map */}
      <div style={styles.mapSection}>
        <div style={styles.mapHeaderSection}>
          <div>
            <h3 style={styles.mapTitle}>SPECTRUM ALLOCATION</h3>
            <h4 style={styles.mapSubtitle}>OF INDIAN STATES</h4>
          </div>
          {data && (
            <div style={styles.overallScore}>
              <div style={styles.overallLabel}>Overall India</div>
              <div style={styles.overallValue}>
                {stats.average.toFixed(1)}
                <span style={styles.overallUnit}>MHz</span>
              </div>
              <div style={styles.overallSubtext}>(average allocation)</div>
            </div>
          )}
        </div>

        {data ? (
          <>
            <div style={styles.mapContainer}>
              <Plot
                data={[
                  {
                    type: 'choropleth',
                    geojson: 'https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson',
                    locations: mapData.locations,
                    z: mapData.z,
                    text: mapData.text,
                    hoverinfo: 'text',
                    featureidkey: 'properties.ST_NM',
                    colorscale: [
                      [0, '#0d47a1'],      // Very Low - Deep Blue
                      [0.25, '#1e88e5'],   // Low - Blue
                      [0.5, '#4fc3f7'],    // Medium - Light Blue
                      [0.75, '#ffa726'],   // High - Orange
                      [1, '#d32f2f']       // Very High - Red
                    ],
                    colorbar: {
                      title: {
                        text: 'Allocation<br>(MHz)',
                        side: 'right',
                        font: {
                          size: 14,
                          color: '#1e293b',
                          family: 'Inter, sans-serif',
                          weight: 600
                        }
                      },
                      thickness: 25,
                      len: 0.6,
                      x: 1.02,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#cbd5e1',
                      borderwidth: 1,
                      tickfont: {
                        size: 12,
                        color: '#475569',
                        family: 'Inter, sans-serif'
                      },
                      tickformat: '.1f'
                    },
                    marker: {
                      line: {
                        color: 'white',
                        width: 2
                      }
                    },
                    showscale: true
                  }
                ]}
                layout={{
                  geo: {
                    fitbounds: 'locations',
                    visible: true,
                    bgcolor: '#f8fafc',
                    showland: true,
                    landcolor: '#e2e8f0',
                    showcountries: false,
                    showlakes: false,
                    projection: {
                      type: 'mercator'
                    }
                  },
                  paper_bgcolor: 'white',
                  plot_bgcolor: 'white',
                  margin: { t: 20, b: 20, l: 20, r: 100 },
                  height: 600,
                  hoverlabel: {
                    bgcolor: '#1e293b',
                    bordercolor: '#1e293b',
                    font: {
                      color: 'white',
                      size: 14,
                      family: 'Inter, sans-serif'
                    },
                    align: 'left'
                  },
                  font: {
                    family: 'Inter, sans-serif'
                  }
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                  toImageButtonOptions: {
                    format: 'png',
                    filename: 'india_spectrum_allocation',
                    height: 1000,
                    width: 1400,
                    scale: 2
                  },
                  responsive: true
                }}
                style={{ width: '100%', height: '600px' }}
              />
            </div>

            {/* Legend */}
            <div style={styles.legendSection}>
              <div style={styles.legendTitle}>Allocation Categories</div>
              <div style={styles.legendItems}>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#d32f2f'}}></div>
                  <div style={styles.legendText}>
                    <div style={styles.legendLabel}>Very High</div>
                    <div style={styles.legendRange}>Top 20%</div>
                  </div>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#ff6f00'}}></div>
                  <div style={styles.legendText}>
                    <div style={styles.legendLabel}>High</div>
                    <div style={styles.legendRange}>60-80%</div>
                  </div>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#ffa726'}}></div>
                  <div style={styles.legendText}>
                    <div style={styles.legendLabel}>Medium</div>
                    <div style={styles.legendRange}>40-60%</div>
                  </div>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#4fc3f7'}}></div>
                  <div style={styles.legendText}>
                    <div style={styles.legendLabel}>Low</div>
                    <div style={styles.legendRange}>20-40%</div>
                  </div>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#1e88e5'}}></div>
                  <div style={styles.legendText}>
                    <div style={styles.legendLabel}>Very Low</div>
                    <div style={styles.legendRange}>Bottom 20%</div>
                  </div>
                </div>
              </div>
              <div style={styles.legendFooter}>
                <div style={styles.sourceText}>
                  Source: MADRL Spectrum Allocation Model
                </div>
                <div style={styles.noteText}>
                  Note: Categories based on final allocation percentiles across all states
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.noData}>
            <div style={styles.noDataIcon}>🗺️</div>
            <div style={styles.noDataText}>No allocation data available</div>
            <div style={styles.noDataSubtext}>Click "Run Allocation" to generate the India map</div>
          </div>
        )}
      </div>

      {/* Statistics Grid */}
      {data && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fee2e2', color: '#dc2626'}}>🔴</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Highest Allocation</div>
              <div style={styles.statValue}>{stats.highest.state}</div>
              <div style={styles.statName}>{stateNameMap[stats.highest.state]}</div>
              <div style={styles.statSubtext}>{stats.highest.value.toFixed(2)} MHz</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#dbeafe', color: '#2563eb'}}>🔵</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Lowest Allocation</div>
              <div style={styles.statValue}>{stats.lowest.state}</div>
              <div style={styles.statName}>{stateNameMap[stats.lowest.state]}</div>
              <div style={styles.statSubtext}>{stats.lowest.value.toFixed(2)} MHz</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fef3c7', color: '#f59e0b'}}>📊</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Average Allocation</div>
              <div style={styles.statValue}>{stats.average.toFixed(2)}</div>
              <div style={styles.statName}>MHz per state</div>
              <div style={styles.statSubtext}>Across all regions</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#dcfce7', color: '#16a34a'}}>🎯</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Coverage</div>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statName}>States & UTs</div>
              <div style={styles.statSubtext}>Complete allocation</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {data && (
        <div style={styles.fullWidthSection}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Detailed State-wise Allocation Data</h3>
            <span style={styles.badge}>{Object.keys(data).length} States/UTs</span>
          </div>
          <div style={styles.detailedTableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>Rank</th>
                  <th style={styles.tableHeader}>Code</th>
                  <th style={styles.tableHeader}>State/UT Name</th>
                  <th style={styles.tableHeader}>Initial (MHz)</th>
                  <th style={styles.tableHeader}>Final (MHz)</th>
                  <th style={styles.tableHeader}>Change (MHz)</th>
                  <th style={styles.tableHeader}>Change %</th>
                  <th style={styles.tableHeader}>Category</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data)
                  .sort((a, b) => (b[1].final || 0) - (a[1].final || 0))
                  .map(([state, values], idx) => {
                    const initial = values.initial || 0;
                    const final = values.final || 0;
                    const change = values.change || 0;
                    const changePercent = initial !== 0 ? ((change / initial) * 100).toFixed(1) : "0.0";
                    const isPositive = change >= 0;
                    
                    const allValues = Object.values(data).map(v => v.final || 0);
                    const category = getAllocationCategory(final, allValues);
                    
                    return (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.rankBadge}>#{idx + 1}</div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.stateCode}>{state}</div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.regionName}>{stateNameMap[state] || state}</div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.normalText}>{initial.toFixed(2)}</span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.valueText}>{final.toFixed(2)}</span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.changeText,
                            color: isPositive ? "#10b981" : "#ef4444"
                          }}>
                            {isPositive ? "+" : ""}{change.toFixed(2)}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.changeText,
                            color: isPositive ? "#10b981" : "#ef4444"
                          }}>
                            {isPositive ? "+" : ""}{changePercent}%
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.categoryBadge,
                            backgroundColor: category.color + '20',
                            color: category.color,
                            borderColor: category.color
                          }}>
                            {category.category}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// Dashboard and other components remain the same as before
function DashboardView({
  data, loading, runAllocation, total, allocatedPercent,
  allocatedSpectrum, availableSpectrum, availablePercent,
  utilizationData, chartData, topRegionsData, TOTAL_SPECTRUM
}) {
  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Spectrum Allocation Dashboard</h2>
          <p style={styles.subtitle}>Real-time monitoring and analytics</p>
        </div>
        <button 
          style={{...styles.button, opacity: loading ? 0.6 : 1}} 
          onClick={runAllocation}
          disabled={loading}
        >
          {loading ? "Running..." : "Run Allocation"}
        </button>
      </div>

      <div style={styles.cards}>
        <Card title="Total Spectrum" value={`${total} MHz`} percentage="+12.5%" icon="∿" iconColor="#6366f1" />
        <Card title="Regions" value={data ? Object.keys(data).length : "-"} percentage="+3" icon="◈" iconColor="#8b5cf6" />
        <Card title="Efficiency" value={data ? `${allocatedPercent}%` : "-"} percentage={data ? `${allocatedSpectrum.toFixed(0)} MHz` : "-"} icon="✦" iconColor="#10b981" />
        <Card title="Policy Status" value="Compliant" percentage="100%" icon="⚡" iconColor="#f59e0b" />
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartBoxLarge}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Allocation Results</h3>
            <span style={styles.badge}>{data ? `${Object.keys(data).length} Regions` : "No Data"}</span>
          </div>
          <div style={styles.tableWrapper}>
            {data ? (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Region</th>
                    <th style={styles.tableHeader}>Final Allocation (MHz)</th>
                    <th style={styles.tableHeader}>Percentage</th>
                    <th style={styles.tableHeader}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data).sort((a, b) => (b[1].final || 0) - (a[1].final || 0)).map(([region, values], idx) => {
                    const finalValue = values.final || 0;
                    const percentage = ((finalValue / parseFloat(total)) * 100).toFixed(1);
                    return (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}><div style={styles.regionName}>{region}</div></td>
                        <td style={styles.tableCell}><span style={styles.valueText}>{finalValue.toFixed(2)}</span></td>
                        <td style={styles.tableCell}>
                          <div style={styles.percentageBar}>
                            <div style={{...styles.percentageFill, width: `${percentage}%`}} />
                            <span style={styles.percentageText}>{percentage}%</span>
                          </div>
                        </td>
                        <td style={styles.tableCell}><span style={styles.statusBadge}>Active</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={styles.noData}>
                <div style={styles.noDataIcon}>📊</div>
                <div style={styles.noDataText}>No allocation data available</div>
                <div style={styles.noDataSubtext}>Click "Run Allocation" to generate results</div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.chartBox}>
          <div style={styles.chartHeader}><h3 style={styles.chartTitle}>Utilization</h3></div>
          <div style={styles.utilizationContent}>
            <div style={styles.doughnutWrapper}>
              <div style={styles.doughnutCenter}>
                <div style={styles.doughnutValue}>{data ? `${allocatedPercent}%` : "0%"}</div>
                <div style={styles.doughnutLabel}>Allocated</div>
              </div>
              <Doughnut data={utilizationData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "70%" }} />
            </div>
            <div style={styles.utilizationStats}>
              <div style={styles.statItem}>
                <div style={{...styles.statDot, backgroundColor: "#6366f1"}}></div>
                <div style={styles.statContent2}>
                  <div style={styles.statLabel}>Allocated</div>
                  <div style={styles.statValue2}>{data ? `${allocatedSpectrum.toFixed(1)} MHz` : "0 MHz"}</div>
                  <div style={styles.statPercent}>{data ? `${allocatedPercent}%` : "0%"}</div>
                </div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <div style={{...styles.statDot, backgroundColor: "#22d3ee"}}></div>
                <div style={styles.statContent2}>
                  <div style={styles.statLabel}>Available</div>
                  <div style={styles.statValue2}>{data ? `${availableSpectrum.toFixed(1)} MHz` : `${TOTAL_SPECTRUM} MHz`}</div>
                  <div style={styles.statPercent}>{data ? `${availablePercent}%` : "100%"}</div>
                </div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <div style={{...styles.statDot, backgroundColor: "#8b5cf6"}}></div>
                <div style={styles.statContent2}>
                  <div style={styles.statLabel}>Total Capacity</div>
                  <div style={styles.statValue2}>{TOTAL_SPECTRUM} MHz</div>
                  <div style={styles.statPercent}>100%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.chartsRow}>
        {chartData && (
          <div style={styles.chartBoxLarge}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>Regional Allocation</h3>
              <span style={styles.viewAll}>View All →</span>
            </div>
            <div style={styles.chartWrapper}>
              <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        )}
        {topRegionsData && (
          <div style={styles.chartBox}>
            <div style={styles.chartHeader}><h3 style={styles.chartTitle}>Top 5 Regions</h3></div>
            <div style={styles.chartWrapper}>
              <Bar data={topRegionsData} options={{ indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerItem}>
          <span style={styles.footerLabel}>Last Updated:</span>
          <span style={styles.footerValue}>{new Date().toLocaleString()}</span>
        </div>
        <div style={styles.footerItem}>
          <span style={styles.footerLabel}>Status:</span>
          <span style={{...styles.footerValue, color: "#10b981"}}>● Active</span>
        </div>
      </div>
    </>
  );
}

function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { name: "Dashboard", icon: "📊" },
    { name: "Allocation", icon: "🗺️" },
    { name: "Policy", icon: "📋" },
    { name: "Settings", icon: "⚙️" }
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoSection}>
        <div style={styles.logo}>AS</div>
        <div>
          <h3 style={styles.logoText}>AI Spectrum</h3>
          <p style={styles.logoSubtext}>Analytics</p>
        </div>
      </div>
      <nav style={styles.nav}>
        {navItems.map((item, idx) => (
          <div key={idx} style={item.name === activeTab ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab(item.name)}>
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.name}</span>
          </div>
        ))}
      </nav>
      <div style={styles.sidebarFooter}>
        <div style={styles.modelInfo}>
          <div style={styles.modelLabel}>Model</div>
          <div style={styles.modelValue}>MADRL v2.1</div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, percentage, icon, iconColor }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={{...styles.cardIcon, background: `${iconColor}15`, color: iconColor}}>{icon}</div>
        <div style={styles.cardPercentage}>{percentage}</div>
      </div>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, background: iconColor}}></div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" },
  sidebar: { width: 240, background: "white", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", boxShadow: "2px 0 8px rgba(0,0,0,0.02)" },
  logoSection: { padding: "24px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: 16 },
  logoText: { fontSize: 16, fontWeight: "700", margin: 0, color: "#0f172a" },
  logoSubtext: { fontSize: 11, margin: "2px 0 0 0", color: "#64748b" },
  nav: { padding: "20px 12px", flex: 1 },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", color: "#64748b", borderRadius: 8, fontSize: 14, fontWeight: "500", marginBottom: 6, cursor: "pointer", transition: "all 0.2s" },
  navItemActive: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", borderRadius: 8, fontSize: 14, fontWeight: "600", marginBottom: 6, cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" },
  navIcon: { fontSize: 18 },
  sidebarFooter: { padding: "16px", borderTop: "1px solid #f1f5f9" },
  modelInfo: { background: "#f8fafc", padding: 12, borderRadius: 8 },
  modelLabel: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  modelValue: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  main: { flex: 1, padding: "32px 36px", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { fontSize: 26, fontWeight: "700", margin: 0, color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", margin: "6px 0 0 0" },
  button: { padding: "11px 22px", border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "600", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", transition: "all 0.2s" },
  cards: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 24 },
  card: { background: "white", padding: 18, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardIcon: { fontSize: 28, width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  cardPercentage: { fontSize: 12, fontWeight: "600", color: "#10b981" },
  cardTitle: { color: "#64748b", fontSize: 13, marginBottom: 6, fontWeight: "500" },
  cardValue: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  progressBar: { height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", width: "72%", borderRadius: 2 },
  chartsRow: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 },
  chartBox: { background: "white", padding: 22, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" },
  chartBoxLarge: { background: "white", padding: 22, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  chartTitle: { fontSize: 16, fontWeight: "700", margin: 0, color: "#0f172a" },
  badge: { fontSize: 11, color: "#6366f1", background: "#eff6ff", padding: "5px 10px", borderRadius: 6, fontWeight: "600" },
  viewAll: { fontSize: 13, color: "#6366f1", fontWeight: "600", cursor: "pointer" },
  chartWrapper: { height: 240, position: "relative" },
  doughnutWrapper: { height: 200, position: "relative", flex: 1 },
  doughnutCenter: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10 },
  doughnutValue: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  doughnutLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  footer: { display: "flex", gap: 28, padding: "18px 22px", background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" },
  footerItem: { display: "flex", gap: 8, alignItems: "center" },
  footerLabel: { fontSize: 13, color: "#64748b" },
  footerValue: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  tableWrapper: { maxHeight: 280, overflowY: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeaderRow: { borderBottom: "2px solid #f1f5f9", position: "sticky", top: 0, background: "white", zIndex: 1 },
  tableHeader: { textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  tableRow: { borderBottom: "1px solid #f8fafc" },
  tableCell: { padding: "14px 16px", fontSize: 14, color: "#0f172a" },
  regionName: { fontWeight: "600", color: "#0f172a" },
  valueText: { fontWeight: "600", color: "#6366f1" },
  percentageBar: { position: "relative", height: 24, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", paddingLeft: 8 },
  percentageFill: { position: "absolute", left: 0, top: 0, height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 4 },
  percentageText: { position: "relative", fontSize: 12, fontWeight: "600", color: "#0f172a", zIndex: 1 },
  statusBadge: { display: "inline-block", padding: "4px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: 12, fontSize: 12, fontWeight: "600" },
  noData: { textAlign: "center", padding: "60px 20px", color: "#94a3b8" },
  noDataIcon: { fontSize: 48, marginBottom: 16 },
  noDataText: { fontSize: 16, fontWeight: "600", color: "#64748b", marginBottom: 8 },
  noDataSubtext: { fontSize: 13, color: "#94a3b8" },
  fullWidthSection: { background: "white", padding: 22, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", marginBottom: 24 },
  detailedTableWrapper: { maxHeight: 500, overflowY: "auto" },
  normalText: { fontWeight: "500", color: "#64748b" },
  changeText: { fontWeight: "700", fontSize: 14 },
  utilizationContent: { display: "flex", gap: 24, alignItems: "center" },
  utilizationStats: { flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  statItem: { display: "flex", alignItems: "flex-start", gap: 12 },
  statDot: { width: 12, height: 12, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  statContent2: { flex: 1 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: "500", marginBottom: 4 },
  statValue2: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 2 },
  statPercent: { fontSize: 13, fontWeight: "600", color: "#6366f1" },
  statDivider: { height: 1, background: "#f1f5f9", margin: "4px 0" },
  mapSection: { background: "white", padding: 32, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", marginBottom: 24 },
  mapHeaderSection: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  mapTitle: { fontSize: 20, fontWeight: "700", color: "#dc2626", margin: 0, letterSpacing: "0.5px" },
  mapSubtitle: { fontSize: 18, fontWeight: "700", color: "#2563eb", margin: "4px 0 0 0" },
  overallScore: { textAlign: "right", background: "#fef3c7", padding: "16px 24px", borderRadius: 12, border: "2px solid #fbbf24" },
  overallLabel: { fontSize: 12, fontWeight: "600", color: "#92400e", marginBottom: 4 },
  overallValue: { fontSize: 36, fontWeight: "800", color: "#dc2626", lineHeight: 1 },
  overallUnit: { fontSize: 16, fontWeight: "600", color: "#64748b", marginLeft: 4 },
  overallSubtext: { fontSize: 11, color: "#78716c", marginTop: 4 },
  mapContainer: { borderRadius: 12, overflow: "hidden", background: "#f8fafc", border: "1px solid #e2e8f0" },
  legendSection: { marginTop: 24, padding: 20, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" },
  legendTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 16 },
  legendItems: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 },
  legendItem: { display: "flex", alignItems: "center", gap: 10 },
  legendBox: { width: 32, height: 32, borderRadius: 6, flexShrink: 0, border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  legendText: { flex: 1 },
  legendLabel: { fontSize: 13, fontWeight: "600", color: "#1e293b", marginBottom: 2 },
  legendRange: { fontSize: 11, color: "#64748b" },
  legendFooter: { marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" },
  sourceText: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  noteText: { fontSize: 10, color: "#94a3b8", fontStyle: "italic" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 24 },
  statCard: { background: "white", padding: 20, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 16 },
  statIcon: { fontSize: 32, width: 56, height: 56, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statContent: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 4, fontFamily: "monospace" },
  statName: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 2 },
  statSubtext: { fontSize: 12, color: "#64748b" },
  stateCode: { fontWeight: "700", color: "#6366f1", fontSize: 13, fontFamily: "monospace" },
  rankBadge: { display: "inline-block", padding: "4px 10px", background: "#f1f5f9", color: "#475569", borderRadius: 6, fontSize: 12, fontWeight: "700", fontFamily: "monospace" },
  categoryBadge: { display: "inline-block", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: "700", border: "1.5px solid", textTransform: "uppercase", letterSpacing: "0.5px" },
  comingSoon: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" },
  comingSoonIcon: { fontSize: 64, marginBottom: 20 },
  comingSoonTitle: { fontSize: 28, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  comingSoonText: { fontSize: 16, color: "#64748b" }
};

export default App;