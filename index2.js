const data = {
  kpis: [
    { label: "Revenue Orbit", value: "$2.48M", delta: "+12.4% vs last orbit", trend: "up", spark: [42, 44, 49, 53, 55, 61, 66, 71] },
    { label: "Active Users", value: "184,920", delta: "+6.8% active", trend: "up", spark: [64, 63, 68, 71, 74, 75, 77, 80] },
    { label: "Conversion Rate", value: "7.82%", delta: "+0.52 pp", trend: "up", spark: [4.8, 5.1, 5.6, 6.2, 6.5, 6.9, 7.3, 7.82] },
    { label: "System Load", value: "68%", delta: "-2.1% load", trend: "down", spark: [72, 73, 70, 69, 71, 68, 67, 68] },
    { label: "Anomaly Score", value: "3.1%", delta: "-0.8% risk", trend: "down", spark: [4.5, 4.3, 4.1, 3.9, 3.5, 3.4, 3.2, 3.1] },
    { label: "Forecast Confidence", value: "91%", delta: "+1.9% certainty", trend: "up", spark: [82, 84, 85, 86, 88, 89, 90, 91] }
  ],
  trend: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    revenue: [1.78, 1.84, 1.95, 2.02, 2.08, 2.14, 2.17, 2.22, 2.28, 2.34, 2.41, 2.48],
    users: [118, 123, 129, 136, 141, 149, 154, 162, 168, 173, 179, 185]
  },
  channels: [
    { name: "Direct", pct: 34 },
    { name: "Partner", pct: 27 },
    { name: "Organic", pct: 21 },
    { name: "Paid", pct: 12 },
    { name: "Referral", pct: 6 }
  ],
  regions: [
    { region: "NA-West", revenue: "$812K", users: "48,220", conv: "8.1%" },
    { region: "EU-Core", revenue: "$694K", users: "45,980", conv: "7.6%" },
    { region: "APAC-North", revenue: "$502K", users: "39,460", conv: "7.9%" },
    { region: "LATAM", revenue: "$293K", users: "28,110", conv: "6.8%" },
    { region: "MEA", revenue: "$179K", users: "23,150", conv: "6.1%" }
  ],
  anomalies: [
    "Telemetry variance spike on Segment C-12 (+2.1 sigma)",
    "Session drop detected in EU-Core cluster for 03:00-03:08 UTC",
    "Conversion jitter above baseline in campaign node P-7"
  ],
  health: [
    { label: "Ingest", v: "99.98%" },
    { label: "ETL", v: "97.2%" },
    { label: "Warehouse", v: "100%" },
    { label: "Models", v: "91%" },
    { label: "API Mesh", v: "98.4%" },
    { label: "Cache", v: "96.8%" },
    { label: "Alerts", v: "89.1%" },
    { label: "Backups", v: "100%" }
  ],
  events: [
    { t: "11:04:18", type: "SYNC", sev: "low", msg: "Nightly orbit sync completed." },
    { t: "11:06:55", type: "ALERT", sev: "med", msg: "Traffic vector drift on APAC-North." },
    { t: "11:10:09", type: "MODEL", sev: "low", msg: "Forecast model recalibrated with fresh telemetry." },
    { t: "11:13:27", type: "RISK", sev: "high", msg: "Anomaly cluster C-12 exceeded warning threshold." },
    { t: "11:16:44", type: "OPS", sev: "low", msg: "Operator checkpoint acknowledged." }
  ]
};

function linePath(values, width, height, padding = 0) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - min) / span) * (height - 2 * padding);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function renderKpis() {
  const grid = document.getElementById("kpiGrid");
  grid.innerHTML = data.kpis.map((kpi, i) => {
    const path = linePath(kpi.spark, 220, 34, 1);
    return `
      <article class="panel kpi-card reveal" style="--d:${340 + i * 90}ms">
        <div class="kpi-head">
          <p class="kpi-label">${kpi.label}</p>
          <span class="kpi-dot"></span>
        </div>
        <p class="kpi-value">${kpi.value}</p>
        <p class="kpi-delta ${kpi.trend}">${kpi.delta}</p>
        <svg class="sparkline" viewBox="0 0 220 34" aria-hidden="true">
          <path d="${path}" fill="none" stroke="rgba(89,221,255,.88)" stroke-width="1.8" />
        </svg>
      </article>
    `;
  }).join("");
}

function renderTrendChart() {
  const svg = document.getElementById("trendChart");
  const W = 900, H = 340, P = 42;
  const rev = data.trend.revenue;
  const usr = data.trend.users;
  const months = data.trend.months;

  const revPath = linePath(rev, W, H, P);
  const usrPath = linePath(usr, W, H, P);

  const yLines = [0, 1, 2, 3, 4];
  const grid = yLines.map((_, i) => {
    const y = P + ((H - 2 * P) / 4) * i;
    return `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="rgba(124,189,245,.16)" stroke-width="1"/>`;
  }).join("");

  const xTicks = months.map((m, i) => {
    const x = P + (i / (months.length - 1)) * (W - 2 * P);
    return `<text x="${x}" y="${H - 14}" fill="rgba(170,191,216,.7)" font-size="11" text-anchor="middle">${m}</text>`;
  }).join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="revGlow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(89,221,255,.9)" />
        <stop offset="100%" stop-color="rgba(143,125,255,.9)" />
      </linearGradient>
    </defs>
    ${grid}
    <path d="${revPath}" fill="none" stroke="url(#revGlow)" stroke-width="3"/>
    <path d="${usrPath}" fill="none" stroke="rgba(224,183,124,.88)" stroke-width="2" stroke-dasharray="4 5"/>
    ${xTicks}
    <text x="${P}" y="18" fill="rgba(196,230,255,.82)" font-size="12">Revenue ($M)</text>
    <text x="${W - P}" y="18" fill="rgba(255,224,178,.82)" font-size="12" text-anchor="end">Users (K)</text>
  `;
}

function renderChannels() {
  const wrap = document.getElementById("channelBars");
  wrap.innerHTML = data.channels.map(ch => `
    <div class="bar-row">
      <span class="bar-label">${ch.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${ch.pct}%"></div></div>
      <span class="bar-val">${ch.pct}%</span>
    </div>
  `).join("");
}

function renderAnomalies() {
  document.getElementById("anomalyList").innerHTML = data.anomalies.map(a => `<li>${a}</li>`).join("");
}

function renderRegions() {
  document.getElementById("regionTable").innerHTML = data.regions.map(r => `
    <tr><td>${r.region}</td><td>${r.revenue}</td><td>${r.users}</td><td>${r.conv}</td></tr>
  `).join("");
}

function renderHealth() {
  document.getElementById("healthMatrix").innerHTML = data.health.map(c => `
    <div class="cell">${c.label}<span class="v">${c.v}</span></div>
  `).join("");
}

function renderEvents() {
  document.getElementById("eventLog").innerHTML = data.events.map(e => `
    <li>
      <span>${e.t}</span>
      <span>${e.type}</span>
      <span class="sev ${e.sev}">${e.sev}</span>
      <span>${e.msg}</span>
    </li>
  `).join("");
}

function tickTime() {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  document.getElementById("timestamp").textContent = `${hh}:${mm}:${ss} UTC`;
}

renderKpis();
renderTrendChart();
renderChannels();
renderAnomalies();
renderRegions();
renderHealth();
renderEvents();
tickTime();
setInterval(tickTime, 1000);
