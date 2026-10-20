# Metric Reference & Academic Disclosures

## Mathematical Definitions

### 1. Viewer Session
A discrete, time-stamped episode during which a detected person's centroid is continuously tracked within the defined Central Monitoring Zone (ROI).

$$\text{Estimated Duration} = \Delta t = t_{\text{departure}} - t_{\text{arrival}}$$

### 2. Average Presence Duration
Computed solely over eligible completed sessions ($\Delta t \ge \tau_{\text{min}}$):

$$\overline{D} = \frac{\sum_{i=1}^{N_{\text{completed}}} D_i}{N_{\text{completed}}}$$

Where $N_{\text{completed}}$ is the count of sessions exceeding the minimum threshold (default 1.0s).

### 3. Campaign Audience Share
The relative proportion of audience presence sessions attributed to campaign $k$ within the selected timeframe:

$$\text{Share}_k = \left( \frac{S_k}{S_{\text{total}}} \right) \times 100\%$$

Where:
- $S_k$: Total sessions attributed to campaign $k$.
- $S_{\text{total}}$: Aggregated sessions across all campaigns in timeframe.

---

## Technical Disclosures & Limitations

1. **Presence vs. Visual Attention:**
   - Computer vision bounding boxes and centroid tracking quantify **presence and spatial dwell** within the camera's field of view.
   - It does not quantify retinal gaze, pupillometry, or cognitive attention. Metric labels in this application explicitly state **Estimated Presence Duration**.

2. **Re-identification Constraints:**
   - In accordance with strict ethical standards, this application avoids biometric facial recognition or facial embedding databases.
   - If an audience member departs the zone and returns later, a new numerical tracking ID is assigned.
