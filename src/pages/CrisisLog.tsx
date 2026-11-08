import React, { useState } from "react";
import type { ReportEntry } from "./CrisisAnalyser";

export type ReportRow = ReportEntry;

const SAMPLE_REPORTS: ReportRow[] = [
  { id: 1, timestamp: "2026-09-14 06:12", disaster: "Flood", category: "Displaced People & Evacuations", location: "Chennai", trapped: "23 people", injured: "15 people", deaths: "2 people", specificNeed: "Search & Rescue, Medical & First Aid", priority: "Critical", priorityScore: 88, message: "Major flooding in Chennai near Adyar riverbank, 23 people trapped." },
  { id: 2, timestamp: "2026-09-13 22:35", disaster: "Cyclone", category: "Infrastructure & Utility Damage", location: "Visakhapatnam", trapped: "None Reported", injured: "34 people", deaths: "5 people", specificNeed: "Medical & First Aid, Shelter & Bedding", priority: "Critical", priorityScore: 95, message: "Cyclone Tej made landfall near Vizag, multiple casualties reported." },
  { id: 3, timestamp: "2026-09-13 14:20", disaster: "Landslide", category: "Rescue, Volunteering or Donation Effort", location: "Wayanad", trapped: "12 people", injured: "8 people", deaths: "None Reported", specificNeed: "Search & Rescue", priority: "High", priorityScore: 72, message: "Landslide in Wayanad district, 12 people trapped under debris." },
  { id: 4, timestamp: "2026-09-12 09:50", disaster: "Fire", category: "Requests or Urgent Needs", location: "Mumbai", trapped: "None Reported", injured: "6 people", deaths: "1 people", specificNeed: "Medical & First Aid, Food & Water Rations", priority: "High", priorityScore: 61, message: "Industrial fire outbreak in Dharavi, Mumbai. 6 injured." },
  { id: 5, timestamp: "2026-09-11 18:05", disaster: "Earthquake", category: "Injured or Dead People", location: "Manipur", trapped: "45 people", injured: "67 people", deaths: "11 people", specificNeed: "Search & Rescue, Medical & First Aid", priority: "Critical", priorityScore: 98, message: "Magnitude 6.2 earthquake in Manipur. Major structural damage." },
  { id: 6, timestamp: "2026-09-10 11:30", disaster: "Flash Flood", category: "Displaced People & Evacuations", location: "Uttarakhand", trapped: "8 people", injured: "None Reported", deaths: "None Reported", specificNeed: "Search & Rescue, Food & Water Rations", priority: "High", priorityScore: 56, message: "Flash floods in Uttarakhand, roads blocked, 8 stranded." },
];

interface Props {
  reports?: ReportRow[];
}

function priorityColor(p: string) {
  if (p === "Critical") return { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" };
  if (p === "High") return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" };
  return { color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" };
}

function exportCSV(rows: ReportRow[]) {
  const headers = ["Index", "Timestamp", "Disaster", "Category", "Location", "Trapped", "Injured", "Deaths", "Specific Need", "Priority", "Priority Score", "Message"];
  const csvRows = rows.map(r => [
    r.id, r.timestamp, r.disaster, r.category, r.location,
    r.trapped, r.injured, r.deaths, r.specificNeed, r.priority, r.priorityScore,
    `"${r.message.replace(/"/g, "\"\"")}"`,
  ]);
  const content = [headers, ...csvRows].map(r => r.join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crisis_reports_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrisisReports({ reports: propReports }: Props) {
  const reports = propReports && propReports.length > 0 ? propReports : SAMPLE_REPORTS;
  const [filter, setFilter] = useState<"All" | "Critical" | "High" | "Standard">("All");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = filter === "All" ? reports : reports.filter(r => r.priority === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="font-orbitron text-2xl font-bold tracking-widest" style={{ color: "#e2e8f0" }}>CRISIS REPORTS</h1>
        <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.5), transparent)" }} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {(["All", "Critical", "High", "Standard"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`neon-btn px-4 py-1.5 text-xs ${filter === f ? "active" : ""}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => exportCSV(filtered)}
          className="neon-btn px-4 py-1.5 text-xs flex items-center gap-2"
          style={{ color: "#34d399", borderColor: "rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.08)" }}>
          ⬇ EXPORT CSV
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "TOTAL REPORTS", value: reports.length, color: "#38bdf8" },
          { label: "CRITICAL", value: reports.filter(r => r.priority === "Critical").length, color: "#f87171" },
          { label: "HIGH", value: reports.filter(r => r.priority === "High").length, color: "#fbbf24" },
          { label: "STANDARD", value: reports.filter(r => r.priority === "Standard").length, color: "#34d399" },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-3">
            <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-500 mb-1">{s.label}</div>
            <div className="font-orbitron text-2xl font-bold" style={{ color: s.color, textShadow: `0 0 10px ${s.color}60` }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.2)", background: "rgba(15,23,42,0.6)" }}>
                {["#", "Timestamp", "Disaster", "Location", "Priority", "Score", "Details"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-rajdhani font-bold tracking-widest text-slate-500" style={{ fontSize: "11px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const pc = priorityColor(row.priority);
                const isExpanded = expanded === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(56,189,248,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={() => setExpanded(isExpanded ? null : row.id)}>
                      <td className="px-4 py-3 font-orbitron text-xs" style={{ color: "#38bdf8" }}>{String(row.id).padStart(3, "0")}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-outfit">{row.timestamp}</td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#38bdf8" }}>{row.disaster}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#34d399" }}>{row.location}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-rajdhani font-bold"
                          style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.color }}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-orbitron text-xs" style={{ color: pc.color }}>{row.priorityScore}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{isExpanded ? "▲" : "▼"}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`exp-${row.id}`} style={{ background: "rgba(56,189,248,0.03)" }}>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-rajdhani font-bold text-slate-500 tracking-widest mb-1">CATEGORY</div>
                              <div className="text-slate-300">{row.category}</div>
                            </div>
                            <div>
                              <div className="font-rajdhani font-bold text-slate-500 tracking-widest mb-1">SPECIFIC NEED</div>
                              <div style={{ color: "#c084fc" }}>{row.specificNeed}</div>
                            </div>
                            <div>
                              <div className="font-rajdhani font-bold text-slate-500 tracking-widest mb-1">CASUALTIES</div>
                              <div className="text-slate-300">
                                Deaths: <span style={{ color: "#f87171" }}>{row.deaths}</span> ·
                                Trapped: <span style={{ color: "#fbbf24" }}> {row.trapped}</span> ·
                                Injured: <span style={{ color: "#38bdf8" }}> {row.injured}</span>
                              </div>
                            </div>
                            <div>
                              <div className="font-rajdhani font-bold text-slate-500 tracking-widest mb-1">ORIGINAL REPORT</div>
                              <div className="text-slate-400 italic">&ldquo;{row.message}&rdquo;</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 font-rajdhani font-semibold tracking-wider">
              NO REPORTS FOUND
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
