import type { ReactNode } from "react";
import type { IconName } from "./userTypes";

const paths: Record<IconName, ReactNode> = {
  activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
  alert: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
  arrow: <><path d="m9 18 6-6-6-6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  chart: <><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  feedback: <><path d="M4 5h16v12H8l-4 4V5Z" /><path d="M8 9h8m-8 4h5" /></>,
  file: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h4M9 13h6m-6 4h6" /></>,
  filter: <><path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" /></>,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10m-9 10v-6h4v6" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  logout: <><path d="M10 5H5v14h5m4-3 4-4-4-4m4 4H9" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  report: <><path d="M12 3v12m0 4h.01" /><circle cx="12" cy="12" r="10" /></>,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
  shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></>,
  team: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20a6 6 0 0 1 12 0m1-5a5 5 0 0 1 5 5" /></>,
  upload: <><path d="M12 16V4m-4 4 4-4 4 4M4 14v6h16v-6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2" /><path d="M16 15a5 5 0 0 1 5 5" /></>,
  wave: <><path d="M3 12h3l2-6 4 12 3-8 2 4h4" /></>,
};

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export const reports = [
  { id: "CRS-2026-00124", type: "Urban Flood", location: "Velachery, Chennai", time: "Today, 7:42 PM", status: "IN PROGRESS", priority: "Critical", people: 20, need: "Food & clean water", score: 94 },
  { id: "CRS-2026-00121", type: "Building Fire", location: "Anna Nagar, Chennai", time: "Today, 6:18 PM", status: "PROCESSING", priority: "High", people: 8, need: "Medical assistance", score: 82 },
  { id: "CRS-2026-00118", type: "Road Block", location: "Gandhipuram, Coimbatore", time: "Yesterday, 4:05 PM", status: "COMPLETED", priority: "Medium", people: 0, need: "Road clearance", score: 58 },
  { id: "CRS-2026-00112", type: "Landslide", location: "Coonoor, Nilgiris", time: "Feb 18, 11:30 AM", status: "COMPLETED", priority: "Critical", people: 34, need: "Search & rescue", score: 91 },
];

export const incoming = [
  ...reports,
  { id: "CRS-2026-00127", type: "Cyclone Damage", location: "Nagapattinam", time: "2 min ago", status: "PENDING", priority: "High", people: 45, need: "Shelter & power", score: 88 },
  { id: "CRS-2026-00126", type: "Medical Emergency", location: "Madurai", time: "7 min ago", status: "PENDING", priority: "Critical", people: 3, need: "Ambulance", score: 96 },
];

export const normalMessages = [
  {
    id: "MSG-001",
    message: "I'm sad today.",
    time: "Just now",
    category: "Normal Message",
  },
  {
    id: "MSG-002",
    message: "Had a nice day at college.",
    time: "Today",
    category: "Normal Message",
  },
];

export const volumeData = [
  { day: "Mon", incidents: 18 }, { day: "Tue", incidents: 25 }, { day: "Wed", incidents: 19 },
  { day: "Thu", incidents: 32 }, { day: "Fri", incidents: 28 }, { day: "Sat", incidents: 41 }, { day: "Sun", incidents: 35 },
];
export const typeData = [
  { name: "Flood", value: 38, color: "#27c6b8" }, { name: "Fire", value: 24, color: "#f59e72" },
  { name: "Medical", value: 19, color: "#7d9cff" }, { name: "Other", value: 19, color: "#66758b" },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <div className="brand-mark"><Icon name="wave" size={compact ? 20 : 24} /></div>
    <div className={compact ? "hidden lg:block" : ""}>
      <div className="text-[15px] font-bold tracking-[0.16em] text-white">CRISENTRA <span className="text-teal-300">AI</span></div>
      {!compact && <div className="mt-0.5 text-[9px] font-medium tracking-[0.13em] text-slate-500">CRISIS INTELLIGENCE & EMERGENCY RESPONSE</div>}
    </div>
  </div>;
}

export function Button({ children, onClick, variant = "primary", className = "", type = "button" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string; type?: "button" | "submit";
}) {
  return <button type={type} onClick={onClick} className={`btn btn-${variant} ${className}`}>{children}</button>;
}

export function Field({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} /></label>;
}

export function Status({ value }: { value: string }) {
  const tone = value === "COMPLETED" || value === "REVIEWED" ? "green" : value === "IN PROGRESS" ? "blue" : value === "Critical" || value === "NEW" ? "red" : value === "High" ? "amber" : "slate";
  return <span className={`status status-${tone}`}><i />{value}</span>;
}
export function PageTitle({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>;
}
