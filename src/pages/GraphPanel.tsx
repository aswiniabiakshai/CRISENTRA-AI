import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ReportEntry } from "./CrisisAnalyser";

const SAMPLE_REPORTS: ReportEntry[] = [
  { id: 1, timestamp: "2026-09-14 06:12", disaster: "Flood", category: "Displaced People & Evacuations", location: "Chennai", trapped: "23 people", injured: "15 people", deaths: "2 people", specificNeed: "Search & Rescue, Medical & First Aid", priority: "Critical", priorityScore: 88, message: "" },
  { id: 2, timestamp: "2026-09-13 22:35", disaster: "Cyclone", category: "Infrastructure & Utility Damage", location: "Visakhapatnam", trapped: "None Reported", injured: "34 people", deaths: "5 people", specificNeed: "Medical & First Aid, Shelter & Bedding", priority: "Critical", priorityScore: 95, message: "" },
  { id: 3, timestamp: "2026-09-13 14:20", disaster: "Landslide", category: "Rescue, Volunteering or Donation Effort", location: "Wayanad", trapped: "12 people", injured: "8 people", deaths: "None Reported", specificNeed: "Search & Rescue", priority: "High", priorityScore: 72, message: "" },
  { id: 4, timestamp: "2026-09-12 09:50", disaster: "Fire", category: "Requests or Urgent Needs", location: "Mumbai", trapped: "None Reported", injured: "6 people", deaths: "1 people", specificNeed: "Medical & First Aid, Food & Water Rations", priority: "High", priorityScore: 61, message: "" },
  { id: 5, timestamp: "2026-09-11 18:05", disaster: "Earthquake", category: "Injured or Dead People", location: "Manipur", trapped: "45 people", injured: "67 people", deaths: "11 people", specificNeed: "Search & Rescue, Medical & First Aid", priority: "Critical", priorityScore: 98, message: "" },
  { id: 6, timestamp: "2026-09-10 11:30", disaster: "Flash Flood", category: "Displaced People & Evacuations", location: "Uttarakhand", trapped: "8 people", injured: "None Reported", deaths: "None Reported", specificNeed: "Search & Rescue, Food & Water Rations", priority: "High", priorityScore: 56, message: "" },
];

// Seed daily incident trend (last 14 days)
const TREND_SEED = [
  { date: "Sep 04", incidents: 1, critical: 0, high: 1 },
  { date: "Sep 05", incidents: 2, critical: 1, high: 1 },
  { date: "Sep 06", incidents: 1, critical: 0, high: 1 },
  { date: "Sep 07", incidents: 3, critical: 2, high: 1 },
  { date: "Sep 08", incidents: 2, critical: 1, high: 1 },
  { date: "Sep 09", incidents: 4, critical: 2, high: 2 },
  { date: "Sep 10", incidents: 3, critical: 1, high: 2 },
  { date: "Sep 11", incidents: 5, critical: 3, high: 2 },
  { date: "Sep 12", incidents: 3, critical: 1, high: 2 },
  { date: "Sep 13", incidents: 4, critical: 2, high: 2 },
  { date: "Sep 14", incidents: 2, critical: 1, high: 1 },
  { date: "Sep 15", incidents: 3, critical: 1, high: 2 },
  { date: "Sep 16", incidents: 4, critical: 2, high: 2 },
  { date: "Sep 17", incidents: 2, critical: 1, high: 1 },
];

const DISASTER_COLORS: Record<string, string> = {
  Flood: "#38bdf8", Cyclone: "#c084fc", Earthquake: "#f87171",
  Fire: "#f97316", Landslide: "#fbbf24", Tsunami: "#34d399",
  Storm: "#22d3ee", "Flash Flood": "#60a5fa", "General Emergency": "#94a3b8",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#f87171", High: "#fbbf24", Standard: "#34d399",
};

function parseNum(s: string) {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "10px", padding: "10px 14px", backdropFilter: "blur(12px)" }}>
      {label && <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-xs font-semibold" style={{ color: p.color || p.fill }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

interface Props {
  reports?: ReportEntry[];
}

export default function Analytics({ reports }: Props) {
  const allReports = (reports && reports.length > 0) ? reports : SAMPLE_REPORTS;

  // Disaster type frequency
  const typeMap: Record<string, number> = {};
  allReports.forEach(r => { typeMap[r.disaster] = (typeMap[r.disaster] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, count]) => ({ name, count, fill: DISASTER_COLORS[name] || "#94a3b8" })).sort((a, b) => b.count - a.count);

  // Priority distribution
  const prioMap: Record<string, number> = { Critical: 0, High: 0, Standard: 0 };
  allReports.forEach(r => { prioMap[r.priority] = (prioMap[r.priority] || 0) + 1; });
  const prioData = Object.entries(prioMap).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  // Casualty totals
  let totalTrapped = 0, totalInjured = 0, totalDeaths = 0;
  allReports.forEach(r => {
    totalTrapped += parseNum(r.trapped);
    totalInjured += parseNum(r.injured);
    totalDeaths += parseNum(r.deaths);
  });

  // Avg priority score
  const avgScore = Math.round(allReports.reduce((s, r) => s + r.priorityScore, 0) / allReports.length);

  // Trend: append live reports to seed
  const trendData = TREND_SEED.map(day => ({ ...day }));
  if (reports && reports.length > 0) {
    const today = trendData[trendData.length - 1];
    today.incidents += reports.length;
    today.critical += reports.filter(r => r.priority === "Critical").length;
    today.high += reports.filter(r => r.priority === "High").length;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="font-orbitron text-2xl font-bold tracking-widest" style={{ color: "#e2e8f0" }}>ANALYTICS</h1>
        <div className="text-xs text-slate-500 mt-1 font-rajdhani tracking-wider">Up-to-date incident trends, disaster breakdown, and response metrics</div>
        <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.5), transparent)" }} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "TOTAL INCIDENTS", value: allReports.length, color: "#38bdf8" },
            { label: "AVG PRIORITY SCORE", value: `${avgScore}/100`, color: "#c084fc" },
            { label: "TOTAL CASUALTIES", value: totalTrapped + totalInjured + totalDeaths, color: "#f87171" },
            { label: "CRITICAL EVENTS", value: allReports.filter(r => r.priority === "Critical").length, color: "#f97316" },
          ].map(k => (
            <div key={k.label} className="glass-card px-4 py-4">
              <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-500 mb-2">{k.label}</div>
              <div className="font-orbitron text-2xl font-bold" style={{ color: k.color, textShadow: `0 0 12px ${k.color}60` }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Incident trend (area) */}
        <div className="glass-card p-5">
          <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-4">INCIDENT TREND — LAST 14 DAYS</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,189,248,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Rajdhani" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Rajdhani" }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Area type="monotone" dataKey="incidents" name="Total" stroke="#38bdf8" strokeWidth={2} fill="url(#gTotal)" dot={false} />
              <Area type="monotone" dataKey="critical" name="Critical" stroke="#f87171" strokeWidth={1.5} fill="url(#gCritical)" dot={false} />
              <Area type="monotone" dataKey="high" name="High" stroke="#fbbf24" strokeWidth={1.5} fill="url(#gHigh)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom row: type bar + priority pie + casualty bars */}
        <div className="grid grid-cols-3 gap-4">

          {/* Disaster type breakdown */}
          <div className="glass-card p-5 col-span-1">
            <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-4">DISASTER TYPE BREAKDOWN</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,189,248,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Rajdhani" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={68} tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "Rajdhani" }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Priority distribution donut */}
          <div className="glass-card p-5 col-span-1">
            <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-4">PRIORITY DISTRIBUTION</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={prioData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                  dataKey="value" nameKey="name" paddingAngle={3}
                  stroke="none">
                  {prioData.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: "#94a3b8", fontSize: "11px", fontFamily: "Rajdhani" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Casualty stats */}
          <div className="glass-card p-5 col-span-1">
            <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-4">CUMULATIVE CASUALTIES</div>
            <div className="space-y-4 mt-2">
              {[
                { label: "DEATHS", value: totalDeaths, color: "#f87171", max: Math.max(totalDeaths, 1) },
                { label: "TRAPPED", value: totalTrapped, color: "#fbbf24", max: Math.max(totalTrapped, 1) },
                { label: "INJURED", value: totalInjured, color: "#38bdf8", max: Math.max(totalInjured, 1) },
              ].map(c => {
                const maxVal = Math.max(totalDeaths, totalTrapped, totalInjured, 1);
                return (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-rajdhani font-bold tracking-widest text-slate-500">{c.label}</span>
                      <span className="font-orbitron font-bold" style={{ color: c.color }}>{c.value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${(c.value / maxVal) * 100}%`,
                          background: `linear-gradient(90deg, ${c.color}, ${c.color}88)`,
                          boxShadow: `0 0 8px ${c.color}80`,
                        }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Score bar chart */}
            <div className="mt-5">
              <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">TOP PRIORITY SCORES</div>
              <div className="space-y-2">
                {[...allReports].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 truncate font-rajdhani">{r.location}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full"
                        style={{
                          width: `${r.priorityScore}%`,
                          background: PRIORITY_COLORS[r.priority] || "#38bdf8",
                          boxShadow: `0 0 6px ${PRIORITY_COLORS[r.priority] || "#38bdf8"}80`,
                        }} />
                    </div>
                    <span className="text-xs font-orbitron font-bold w-8 text-right" style={{ color: PRIORITY_COLORS[r.priority] || "#38bdf8" }}>{r.priorityScore}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
