import { useState } from "react";
import type { ReportEntry } from "./CrisisAnalyser";

interface QueueItem {
  id: number;
  rank: number;
  disaster: string;
  location: string;
  priority: "Critical" | "High" | "Standard";
  score: number;
  reasons: string[];
  timestamp: string;
  trapped: string;
  injured: string;
  deaths: string;
}

const STATIC_QUEUE: QueueItem[] = [
  {
    id: 5, rank: 1, disaster: "Earthquake", location: "Manipur", priority: "Critical", score: 98,
    timestamp: "2026-09-11 18:05",
    trapped: "45 people", injured: "67 people", deaths: "11 people",
    reasons: [
      "Disaster Type: Earthquake — High structural collapse risk",
      "Death Impact: 11 people confirmed fatalities",
      "Injured Impact: 67 people requiring medical evacuation",
      "Trapped Impact: 45 people under debris — active rescue required",
      "Response Needs: Search & Rescue, Medical & First Aid",
    ],
  },
  {
    id: 2, rank: 2, disaster: "Cyclone", location: "Visakhapatnam", priority: "Critical", score: 95,
    timestamp: "2026-09-13 22:35",
    trapped: "None Reported", injured: "34 people", deaths: "5 people",
    reasons: [
      "Disaster Type: Cyclone — widespread infrastructure destruction",
      "Death Impact: 5 confirmed casualties",
      "Injured Impact: 34 people needing urgent medical care",
      "Response Needs: Medical & First Aid, Shelter & Bedding",
      "Ongoing storm conditions increasing risk level",
    ],
  },
  {
    id: 1, rank: 3, disaster: "Flood", location: "Chennai", priority: "Critical", score: 88,
    timestamp: "2026-09-14 06:12",
    trapped: "23 people", injured: "15 people", deaths: "2 people",
    reasons: [
      "Disaster Type: Flood — rising water levels in Adyar river basin",
      "Trapped Impact: 23 people stranded in submerged areas",
      "Death Impact: 2 confirmed fatalities",
      "Injured Impact: 15 people with injuries",
      "Response Needs: Search & Rescue, Medical & First Aid",
    ],
  },
  {
    id: 3, rank: 4, disaster: "Landslide", location: "Wayanad", priority: "High", score: 72,
    timestamp: "2026-09-13 14:20",
    trapped: "12 people", injured: "8 people", deaths: "None Reported",
    reasons: [
      "Disaster Type: Landslide — debris flow blocking rescue routes",
      "Trapped Impact: 12 people under rubble — time-critical rescue",
      "Injured Impact: 8 people with physical injuries",
      "Response Needs: Search & Rescue priority",
    ],
  },
  {
    id: 4, rank: 5, disaster: "Fire", location: "Mumbai", priority: "High", score: 61,
    timestamp: "2026-09-12 09:50",
    trapped: "None Reported", injured: "6 people", deaths: "1 people",
    reasons: [
      "Disaster Type: Industrial Fire — chemical exposure risk",
      "Death Impact: 1 fatality confirmed",
      "Injured Impact: 6 people with burn and smoke inhalation injuries",
      "Response Needs: Medical & First Aid, Food & Water Rations",
    ],
  },
  {
    id: 6, rank: 6, disaster: "Flash Flood", location: "Uttarakhand", priority: "High", score: 56,
    timestamp: "2026-09-10 11:30",
    trapped: "8 people", injured: "None Reported", deaths: "None Reported",
    reasons: [
      "Disaster Type: Flash Flood — rapid water level rise",
      "Trapped Impact: 8 people stranded on elevated terrain",
      "Road infrastructure damage blocking access routes",
      "Response Needs: Search & Rescue, Food & Water Rations",
    ],
  },
];

function buildReasonsFromReport(report: ReportEntry): string[] {
  const reasons: string[] = [];
  reasons.push(`Disaster Type: ${report.disaster}`);
  if (report.deaths !== "None Reported") reasons.push(`Death Impact: ${report.deaths}`);
  if (report.trapped !== "None Reported") reasons.push(`Trapped Impact: ${report.trapped} — active rescue required`);
  if (report.injured !== "None Reported") reasons.push(`Injured Impact: ${report.injured} requiring medical care`);
  if (report.specificNeed && report.specificNeed !== "General Relief") reasons.push(`Response Needs: ${report.specificNeed}`);
  return reasons;
}

function priorityTier(p: string): "Critical" | "High" | "Standard" {
  if (p === "Critical") return "Critical";
  if (p === "High") return "High";
  return "Standard";
}

function PriorityBadge({ priority, score }: { priority: string; score: number }) {
  const colors: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    Critical: { text: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.4)", glow: "#f87171" },
    High: { text: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)", glow: "#fbbf24" },
    Standard: { text: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.4)", glow: "#34d399" },
  };
  const c = colors[priority] || colors.Standard;
  return (
    <div className="flex items-center gap-2">
      <span className="px-2.5 py-1 rounded-full font-rajdhani font-bold text-xs"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
        {priority}
      </span>
      <span className="font-orbitron text-sm font-bold" style={{ color: c.text, textShadow: `0 0 8px ${c.glow}60` }}>
        {score}/100
      </span>
    </div>
  );
}

interface Props {
  reports?: ReportEntry[];
}

export default function PriorityQueue({ reports }: Props) {
  const [expanded, setExpanded] = useState<number | null>(1);

  const liveItems: QueueItem[] = (reports || []).map(r => ({
    id: r.id,
    rank: 0,
    disaster: r.disaster,
    location: r.location,
    priority: priorityTier(r.priority),
    score: r.priorityScore,
    reasons: buildReasonsFromReport(r),
    timestamp: r.timestamp,
    trapped: r.trapped,
    injured: r.injured,
    deaths: r.deaths,
  }));

  const queue: QueueItem[] = (liveItems.length > 0
    ? [...liveItems].sort((a, b) => b.score - a.score)
    : STATIC_QUEUE
  ).map((item, i) => ({ ...item, rank: i + 1 }));

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="font-orbitron text-2xl font-bold tracking-widest" style={{ color: "#e2e8f0" }}>PRIORITY QUEUE</h1>
        <div className="text-xs text-slate-500 mt-1 font-rajdhani tracking-wider">Disasters ranked by urgency — showing which incidents need immediate response and why</div>
        <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, rgba(248,113,113,0.5), transparent)" }} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        {[
          { label: "Critical", color: "#f87171" },
          { label: "High", color: "#fbbf24" },
          { label: "Standard", color: "#34d399" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
            {l.label}
          </div>
        ))}
        {liveItems.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: "#34d399" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#34d399" }} />
            Live data ({liveItems.length} reports)
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {queue.map(item => {
          const isOpen = expanded === item.id;
          const rankColors: Record<number, string> = { 1: "#f87171", 2: "#f97316", 3: "#fbbf24", 4: "#a3e635", 5: "#34d399", 6: "#22d3ee" };
          const rankColor = rankColors[item.rank] || "#94a3b8";

          return (
            <div key={item.id} className="glass-card overflow-hidden transition-all">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : item.id)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg flex-shrink-0"
                  style={{ background: `${rankColor}18`, border: `2px solid ${rankColor}50`, color: rankColor, textShadow: `0 0 10px ${rankColor}` }}>
                  {item.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-orbitron text-sm font-bold val-disaster">{item.disaster}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs font-rajdhani font-semibold" style={{ color: "#34d399" }}>📍 {item.location}</span>
                    <span className="text-xs text-slate-600">{item.timestamp}</span>
                  </div>
                  <div className="mt-1">
                    <PriorityBadge priority={item.priority} score={item.score} />
                  </div>
                </div>
                <div className="text-slate-600 text-xs flex-shrink-0">{isOpen ? "▲" : "▼"}</div>
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(56,189,248,0.12)", background: "rgba(5,11,20,0.4)" }} className="px-5 py-4">
                  <div className="mb-4">
                    <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-500 mb-2">WHY THIS PRIORITY</div>
                    <div className="space-y-1.5">
                      {item.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="mt-0.5 flex-shrink-0" style={{ color: rankColor }}>›</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "DEATHS", value: item.deaths, color: "#f87171" },
                      { label: "TRAPPED", value: item.trapped, color: "#fbbf24" },
                      { label: "INJURED", value: item.injured, color: "#38bdf8" },
                    ].map(c => (
                      <div key={c.label} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-600 mb-1">{c.label}</div>
                        <div className="text-xs font-semibold" style={{ color: c.color }}>{c.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-rajdhani font-bold tracking-widest text-slate-500">PRIORITY SCORE</span>
                      <span style={{ color: rankColor }}>{item.score}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${item.score}%`, background: `linear-gradient(90deg, ${rankColor}, ${rankColor}aa)`, boxShadow: `0 0 8px ${rankColor}` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
