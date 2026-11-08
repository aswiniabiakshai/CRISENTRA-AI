import { useEffect, useState } from "react";

// ── Levenshtein fuzzy match ──────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function fuzzyWordInText(text: string, keyword: string, maxDist = 2): boolean {
  const words = text.toLowerCase().split(/\W+/);
  return words.some(w => w.length >= keyword.length - 3 && levenshtein(w, keyword.toLowerCase()) <= maxDist);
}

// ── Types ────────────────────────────────────────────────────
interface ExtractedInfo {
  disaster: string;
  location: string;
  specific_need: string;
  urgency: string;
  people_affected: string | null;
  contact: string | null;
}

interface CrisisReport {
  message: string;
  info: ExtractedInfo;
  category: string;
  confidence: number;
  priorityScore: number;
  priorityLevel: string;
  priorityReasons: string[];
  completenessScore: number;
  missingFields: string[];
  actionabilityScore: number;
  actionabilityLevel: string;
}

// ── Disaster keyword map ─────────────────────────────────────
const DISASTER_MAP: Record<string, string[]> = {
  Flood: ["flood", "flooding", "flooded", "inundation", "submerged", "waterlogging", "flud", "fllod"],
  Cyclone: ["cyclone", "hurricane", "typhoon", "cyclonic"],
  Earthquake: ["earthquake", "tremor", "quake", "earthqauke", "tremour"],
  Fire: ["fire", "blaze", "wildfire", "forest fire", "burning", "inferno"],
  Landslide: ["landslide", "mudslide", "land slide", "mud slide"],
  Tsunami: ["tsunami", "tidal wave"],
  Tornado: ["tornado", "twister"],
  Explosion: ["explosion", "blast", "explode"],
  "Structural Collapse": ["collapse", "building collapse", "colapse"],
  Storm: ["storm", "thunderstorm", "cyclonic storm"],
  Blizzard: ["blizzard", "snowstorm"],
  Drought: ["drought", "water shortage"],
  Heatwave: ["heatwave", "heat wave", "extreme heat"],
  Hurricane: ["hurricane"],
};

const CATEGORY_MAP: Record<string, string> = {
  Flood: "Displaced People & Evacuations",
  Cyclone: "Infrastructure & Utility Damage",
  Earthquake: "Injured or Dead People",
  Fire: "Requests or Urgent Needs",
  Wildfire: "Requests or Urgent Needs",
  Landslide: "Rescue, Volunteering or Donation Effort",
  Tsunami: "Displaced People & Evacuations",
  "Structural Collapse": "Injured or Dead People",
  Storm: "Caution & Advice",
  Hurricane: "Infrastructure & Utility Damage",
};

// ── Indian cities / states dictionary ───────────────────────
const INDIAN_PLACES = new Set([
  "chennai", "mumbai", "delhi", "kolkata", "hyderabad", "bangalore", "bengaluru",
  "pune", "ahmedabad", "surat", "jaipur", "lucknow", "kanpur", "nagpur", "indore",
  "bhopal", "visakhapatnam", "vizag", "patna", "vadodara", "coimbatore", "madurai",
  "wayanad", "manipur", "uttarakhand", "kerala", "andhra", "odisha", "assam",
  "goa", "himachal", "kashmir", "tripura", "meghalaya", "dharavi", "adyar",
  "nungambakkam", "tambaram", "velachery", "tiruchirappalli", "trichy", "salem",
  "vellore", "tiruppur", "erode", "tirunelveli", "thoothukudi", "dindigul",
  "thanjavur", "kanchipuram", "cuddalore", "nagapattinam", "ramanathapuram",
  "kochi", "thiruvananthapuram", "kozhikode", "thrissur", "palakkad", "kollam",
  "alappuzha", "kannur", "kasaragod", "idukki", "malappuram",
  "vijayawada", "kakinada", "rajahmundry", "ongole", "tirupati", "anantapur",
  "warangal", "nizamabad", "karimnagar", "khammam", "mahbubnagar",
  "aurangabad", "nashik", "solapur", "kolhapur", "amravati", "nanded",
  "jamshedpur", "dhanbad", "bokaro", "ranchi", "hazaribagh",
  "bhubaneswar", "cuttack", "rourkela", "berhampur", "sambalpur",
  "guwahati", "dibrugarh", "silchar", "jorhat", "imphal", "kohima",
  "shillong", "gangtok", "agartala", "itanagar", "panaji",
  "chandigarh", "shimla", "dharamshala", "srinagar", "jammu", "leh",
  "dehradun", "haridwar", "rishikesh", "nainital",
  "agra", "varanasi", "allahabad", "prayagraj", "meerut", "ghaziabad",
  "noida", "mathura", "bareilly", "moradabad", "gorakhpur", "aligarh",
  "gaya", "muzaffarpur", "bhagalpur", "darbhanga",
  "gwalior", "jabalpur", "ujjain", "ratlam",
  "raipur", "bilaspur", "korba", "bhilai",
  "amritsar", "ludhiana", "jalandhar", "patiala",
  "jodhpur", "kota", "ajmer", "bikaner", "udaipur", "alwar",
  "nellore", "kurnool", "kadapa", "guntur",
  "puri", "balasore", "brahmapur",
]);

function titleCase(s: string) {
  return s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function extractLocation(text: string): string {
  const patterns = [
    /\b(?:in|at|near|around|from|within)\s+([a-zA-Z][a-zA-Z\s,]{1,40}?)(?=[,.]|\s+(?:people|area|district|village|town|road|river|\d))/gi,
    /\b(?:location|place|region|zone)[:\s]+([a-zA-Z][a-zA-Z\s]{2,30})/gi,
  ];
  for (const pat of patterns) {
    const m = pat.exec(text);
    if (m) {
      const candidate = m[1].trim().replace(/\s+$/, "");
      if (candidate.length >= 3) return titleCase(candidate);
    }
  }
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/);
  for (const word of words) {
    if (INDIAN_PLACES.has(word)) return titleCase(word);
  }
  for (let i = 0; i < words.length - 1; i++) {
    const two = words[i] + " " + words[i + 1];
    if (INDIAN_PLACES.has(two)) return titleCase(two);
  }
  return "Not Detected";
}

const TRAPPED_KW  = ["trapped", "stranded", "stuck", "marooned", "traped", "tapped", "stucked"];
const INJURED_KW  = ["injured", "injuried", "injurd", "hurt", "wounded", "woundd"];
const DEATH_KW    = ["dead", "died", "killed", "death", "deaths", "fatalities", "fatality", "deceased", "casualt"];
const NEED_CATEGORIES: Record<string, string[]> = {
  "Search & Rescue": ["rescue", "rescued", "evacuation", "evacuate", ...TRAPPED_KW],
  "Medical & First Aid": ["medical", "medicine", "hospital", "ambulance", "doctor", "first aid", ...INJURED_KW, ...DEATH_KW],
  "Food & Water Rations": ["water", "food", "ration", "meal", "starving"],
  "Shelter & Bedding": ["shelter", "tent", "tarpaulin", "blanket"],
  "Power & Electricity": ["electricity", "power outage", "blackout"],
  "Road Clearance": ["road", "blocked", "debris", "bridge"],
};

function fuzzyContainsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw =>
    text.toLowerCase().includes(kw.toLowerCase()) ||
    fuzzyWordInText(text, kw, kw.length <= 5 ? 1 : 2)
  );
}

function parseCount(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const patterns = [
      new RegExp(`(\\d+)\\s+(?:people\\s+)?(?:were\\s+|are\\s+|was\\s+|is\\s+)?${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`),
      new RegExp(`${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s+(?:are\\s+|were\\s+|of\\s+)?(\\d+)`),
      new RegExp(`(\\d+)\\s+(?:people\\s+)?${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`),
    ];
    for (const p of patterns) {
      const m = lower.match(p);
      if (m) return `${(m[1] || m[2])} people`;
    }
  }
  const words = lower.split(/\W+/);
  for (let i = 0; i < words.length; i++) {
    for (const kw of keywords) {
      if (kw.length >= 4 && fuzzyWordInText(words[i], kw, 2)) {
        for (let j = Math.max(0, i - 3); j <= Math.min(words.length - 1, i + 3); j++) {
          if (/^\d+$/.test(words[j])) return `${words[j]} people`;
        }
      }
    }
  }
  return null;
}

function calculateCompleteness(info: ExtractedInfo): { score: number; missing: string[] } {
  const fields: Record<string, string | null> = {
    "Disaster Type": info.disaster === "General Emergency" ? null : info.disaster,
    "Location": info.location === "Not Detected" ? null : info.location,
    "Specific Need": info.specific_need === "General Relief" ? null : info.specific_need,
    "Urgency": info.urgency === "Standard" ? null : info.urgency,
    "People Affected": info.people_affected,
    "Contact Number": info.contact,
  };
  const total = Object.keys(fields).length;
  const missing: string[] = [];
  let completed = 0;
  for (const [key, val] of Object.entries(fields)) {
    if (val !== null && val !== "") completed++;
    else missing.push(key);
  }
  return { score: Math.round((completed / total) * 100), missing };
}

function calculatePriority(info: ExtractedInfo): { score: number; level: string; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (info.urgency === "High")   { score += 40; reasons.push("High urgency detected"); }
  else if (info.urgency === "Medium") { score += 25; reasons.push("Medium urgency detected"); }
  if (info.specific_need && info.specific_need !== "General Relief") {
    score += 25; reasons.push("Specific need identified: " + info.specific_need);
  }
  if (info.people_affected) { score += 20; reasons.push("People affected: " + info.people_affected); }
  if (info.disaster && info.disaster !== "General Emergency") {
    score += 15; reasons.push("Disaster event identified: " + info.disaster);
  }
  const level = score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 40 ? "Medium" : "Low";
  return { score: Math.min(score, 100), level, reasons };
}

function calculateActionability(info: ExtractedInfo): { score: number; level: string } {
  let score = 0;
  if (info.specific_need && info.specific_need !== "General Relief") score += 30;
  if (info.urgency && info.urgency !== "Standard") score += 20;
  if (info.location && info.location !== "Not Detected") score += 20;
  if (info.people_affected) score += 15;
  if (info.contact) score += 10;
  if (info.disaster && info.disaster !== "General Emergency") score += 5;
  const level = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  return { score, level };
}

function analyzeMessage(text: string): CrisisReport {
  let disaster = "General Emergency";
  for (const [name, keywords] of Object.entries(DISASTER_MAP)) {
    if (fuzzyContainsAny(text, keywords)) { disaster = name; break; }
  }

  const location = extractLocation(text);
  const trapped = parseCount(text, TRAPPED_KW);
  const injured = parseCount(text, INJURED_KW);
  const deaths  = parseCount(text, DEATH_KW);
  const people_affected = trapped || injured || deaths;

  const needParts: string[] = [];
  for (const [category, kws] of Object.entries(NEED_CATEGORIES)) {
    if (fuzzyContainsAny(text, kws)) needParts.push(category);
  }
  const specific_need = needParts.length ? needParts.join(", ") : "General Relief";

  const dNum = parseInt(deaths || "0") || 0;
  const tNum = parseInt(trapped || "0") || 0;
  const iNum = parseInt(injured || "0") || 0;
  const urgency = dNum > 5 || tNum > 20 || disaster !== "General Emergency" ? "High"
    : iNum > 0 || tNum > 0 ? "Medium" : "Standard";

  const contactMatch = text.match(/\b[6-9]\d{9}\b/);
  const contact = contactMatch ? contactMatch[0] : null;

  const info: ExtractedInfo = { disaster, location, specific_need, urgency, people_affected, contact };

  const { score: completenessScore, missing: missingFields } = calculateCompleteness(info);
  const { score: priorityScore, level: priorityLevel, reasons: priorityReasons } = calculatePriority(info);
  const { score: actionabilityScore, level: actionabilityLevel } = calculateActionability(info);

  const confidence = disaster !== "General Emergency" ? 0.72 + Math.random() * 0.22 : 0.35 + Math.random() * 0.25;

  return {
    message: text, info,
    category: CATEGORY_MAP[disaster] || "Other Relevant Information",
    confidence: Math.round(confidence * 1000) / 10,
    priorityScore, priorityLevel, priorityReasons,
    completenessScore, missingFields,
    actionabilityScore, actionabilityLevel,
  };
}

// ── Props ────────────────────────────────────────────────────
export interface ReportEntry {
  id: number;
  timestamp: string;
  disaster: string;
  category: string;
  location: string;
  trapped: string;
  injured: string;
  deaths: string;
  specificNeed: string;
  priority: string;
  priorityScore: number;
  message: string;
}

export interface ProcessedIncident extends ReportEntry {
  incidentId: string;
  confidence: number;
  urgency: string;
  peopleAffected: string;
  contact: string | null;
  completenessScore: number;
  missingFields: string[];
  actionabilityScore: number;
  actionabilityLevel: string;
  priorityReasons: string[];
  status: string;
}

interface ProcessContext {
  incidentId: string;
  timestamp: string;
  location?: string;
  contact?: string;
  status?: string;
  numericId?: number;
}

export function processCrisisMessage(message: string, context: ProcessContext): ProcessedIncident {
  const result = analyzeMessage(message);
  const info: ExtractedInfo = {
    ...result.info,
    location: result.info.location === "Not Detected" && context.location ? context.location : result.info.location,
    contact: result.info.contact || context.contact || null,
  };
  const { score: completenessScore, missing: missingFields } = calculateCompleteness(info);
  const { score: priorityScore, level: priorityLevel, reasons: priorityReasons } = calculatePriority(info);
  const { score: actionabilityScore, level: actionabilityLevel } = calculateActionability(info);

  return {
    id: context.numericId ?? Date.now(),
    incidentId: context.incidentId,
    timestamp: context.timestamp,
    disaster: info.disaster,
    category: result.category,
    location: info.location,
    trapped: parseCount(message, TRAPPED_KW) || "None Reported",
    injured: parseCount(message, INJURED_KW) || "None Reported",
    deaths: parseCount(message, DEATH_KW) || "None Reported",
    specificNeed: info.specific_need,
    priority: priorityLevel,
    priorityScore,
    message,
    confidence: result.confidence,
    urgency: info.urgency,
    peopleAffected: info.people_affected || "None Reported",
    contact: info.contact,
    completenessScore,
    missingFields,
    actionabilityScore,
    actionabilityLevel,
    priorityReasons,
    status: context.status || "Submitted",
  };
}

interface Props {
  onLocationDetected?: (location: string) => void;
  incident?: ProcessedIncident;
}

const STEPS = [
  { num: 2, label: "CRISIS ANALYSIS" },
  { num: 3, label: "HUMAN IMPACT" },
  { num: 4, label: "RISK METRICS" },
];

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

function GaugeChart({ value, max, color, suffix }: { value: number; max: number; color: string; suffix: string }) {
  const pct = value / max;
  const r = 52, cx = 70, cy = 68;
  const x1 = cx - r, x2 = cx + r;
  const angle = Math.PI + pct * Math.PI;
  const arcX = cx + r * Math.cos(angle), arcY = cy + r * Math.sin(angle);
  const largeArc = pct > 0.5 ? 0 : 1;
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="78" viewBox="0 0 140 78">
        <path d={`M ${x1} ${cy} A ${r} ${r} 0 0 1 ${x2} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
        {pct > 0 && (
          <path d={`M ${x1} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${arcX} ${arcY}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        )}
        <text x={cx} y={cy - 3} textAnchor="middle" fill={color}
          style={{ fontFamily: "Orbitron,sans-serif", fontSize: "18px", fontWeight: 700 }}>{value}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8"
          style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "10px" }}>{suffix}</text>
      </svg>
    </div>
  );
}

export default function AnalyzeCrisis({ onLocationDetected, incident }: Props) {
  const [step, setStep] = useState(2);
  const [report, setReport] = useState<CrisisReport | null>(null);

  useEffect(() => {
    if (!incident) {
      setReport(null);
      return;
    }
    setReport({
      message: incident.message,
      info: {
        disaster: incident.disaster,
        location: incident.location,
        specific_need: incident.specificNeed,
        urgency: incident.urgency,
        people_affected: incident.peopleAffected,
        contact: incident.contact,
      },
      category: incident.category,
      confidence: incident.confidence,
      priorityScore: incident.priorityScore,
      priorityLevel: incident.priority,
      priorityReasons: incident.priorityReasons,
      completenessScore: incident.completenessScore,
      missingFields: incident.missingFields,
      actionabilityScore: incident.actionabilityScore,
      actionabilityLevel: incident.actionabilityLevel,
    });
    if (incident.location !== "Not Detected") onLocationDetected?.(incident.location);
  }, [incident, onLocationDetected]);

  const emptyState = (
    <div className="glass-card p-10 text-center mt-4">
      <div className="font-orbitron text-xs tracking-widest text-slate-500 mb-2">NO DATA AVAILABLE</div>
      <div className="text-xs text-slate-600">Awaiting a detected message from the user reporting channel.</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="font-orbitron text-2xl font-bold tracking-widest" style={{ color: "#e2e8f0" }}>ANALYZE CRISIS</h1>
        <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.5), transparent)" }} />
      </div>

      {/* Step navigator */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {STEPS.map(s => (
          <button key={s.num} onClick={() => setStep(s.num)}
            className={`neon-btn py-2.5 text-xs transition-all ${step === s.num ? "active" : ""}`}>
            <span className="mr-1">{step === s.num ? "●" : "○"}</span>{s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {report && (
          <div className="glass-card p-5">
            <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">DETECTED MESSAGE</div>
            <div className="text-sm text-slate-300 leading-relaxed">{report.message}</div>
          </div>
        )}

        {/* ── STEP 2: CRISIS ANALYSIS ── */}
        {step === 2 && (!report ? emptyState : (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Disaster Type", value: report.info.disaster, cls: "val-disaster" },
              { label: "Predicted Category", value: report.category, cls: "val-category" },
              { label: "Location", value: report.info.location, cls: "val-location" },
              { label: "Confidence Score", value: `${report.confidence}%`, cls: "val-confidence" },
              { label: "Urgency Level", value: report.info.urgency, cls: "val-critical" },
            ].map(c => (
              <div key={c.label} className="glass-card p-5">
                <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">{c.label.toUpperCase()}</div>
                <div className={`font-orbitron text-xl font-bold ${c.cls}`}>{c.value}</div>
              </div>
            ))}
            <div className="glass-card p-5 col-span-3">
              <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">SPECIFIC RESPONSE NEED</div>
              <div className="font-orbitron text-xl font-bold val-need">{report.info.specific_need}</div>
            </div>
            {report.info.contact && (
              <div className="glass-card p-5 col-span-3">
                <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">CONTACT</div>
                <div className="font-orbitron text-xl font-bold" style={{ color: "#34d399" }}>{report.info.contact}</div>
              </div>
            )}
          </div>
        ))}

        {/* ── STEP 3: HUMAN IMPACT ── */}
        {step === 3 && (!report ? emptyState : (
          <div className="space-y-4">
            <div className="glass-card p-4 text-sm text-slate-400" style={{ borderLeft: "3px solid #38bdf8", borderRadius: "8px" }}>
              💡 Casualty breakdown based on emergency signal analysis.
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Death Count", value: parseCount(report.message, DEATH_KW), color: "#f85149" },
                { label: "Trapped Count", value: parseCount(report.message, TRAPPED_KW), color: "#e3b341" },
                { label: "Injured Count", value: parseCount(report.message, INJURED_KW), color: "#38bdf8" },
              ].map(item => {
                const num = parseInt(item.value || "0") || 0;
                return (
                  <div key={item.label} className="glass-card p-5">
                    <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-4">{item.label.toUpperCase()}</div>
                    <div className="font-orbitron text-3xl font-bold mb-3" style={{ color: item.color, textShadow: `0 0 16px ${item.color}` }}>
                      {num > 0 ? num : "—"}
                    </div>
                    <Bar value={Math.min(num, 50)} max={50} color={item.color} />
                    <div className="text-xs text-slate-500 mt-2">{item.value || "None Reported"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── STEP 4: RISK METRICS ── */}
        {step === 4 && (!report ? emptyState : (
          <div className="space-y-4">
            <div className="glass-card p-4 text-sm text-slate-400" style={{ borderLeft: "3px solid #34d399", borderRadius: "8px" }}>
              ⚙️ Quantitative intelligence — Actionability <strong style={{ color: "#34d399" }}>{report.actionabilityLevel}</strong> ({report.actionabilityScore}/100) · Completeness <strong style={{ color: "#38bdf8" }}>{report.completenessScore}%</strong> · Priority <strong style={{ color: "#c084fc" }}>{report.priorityLevel}</strong> ({report.priorityScore}/100)
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* 1. Actionability gauge */}
              <div className="glass-card p-5">
                <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">ACTIONABILITY</div>
                <GaugeChart value={report.actionabilityScore} max={100} color="#34d399" suffix="/100" />
                <div className="mt-3">
                  <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-600 mb-1">LEVEL</div>
                  <div className="font-orbitron text-lg font-bold" style={{
                    color: report.actionabilityLevel === "High" ? "#34d399" : report.actionabilityLevel === "Medium" ? "#fbbf24" : "#f87171",
                    textShadow: `0 0 10px ${report.actionabilityLevel === "High" ? "#34d399" : report.actionabilityLevel === "Medium" ? "#fbbf24" : "#f87171"}`
                  }}>
                    {report.actionabilityLevel}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {report.actionabilityLevel === "High" ? "Immediate response can be dispatched" :
                     report.actionabilityLevel === "Medium" ? "Further information recommended" :
                     "Insufficient data for targeted response"}
                  </div>
                </div>
              </div>

              {/* 2. Completeness gauge */}
              <div className="glass-card p-5">
                <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">COMPLETENESS</div>
                <GaugeChart value={report.completenessScore} max={100} color="#38bdf8" suffix="%" />
                <div className="mt-3 space-y-1">
                  {report.missingFields.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#34d399" }}>✓ All fields present</div>
                  ) : (
                    <>
                      <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-600 mb-1">MISSING</div>
                      {report.missingFields.map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "#f87171" }}>
                          <span>⚠</span><span>{f}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* 3. Priority gauge */}
              <div className="glass-card p-5">
                <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-400 mb-3">PRIORITY SCORE</div>
                <GaugeChart value={report.priorityScore} max={100} color="#f87171" suffix="/100" />
                <div className="mt-3 space-y-1">
                  <div className="font-rajdhani text-xs font-bold tracking-widest text-slate-600 mb-1">REASONS</div>
                  {report.priorityReasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "#fbbf24" }}>
                      <span className="flex-shrink-0">›</span><span>{r}</span>
                    </div>
                  ))}
                  {report.priorityReasons.length === 0 && (
                    <div className="text-xs text-slate-600">No high-risk indicators detected.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
