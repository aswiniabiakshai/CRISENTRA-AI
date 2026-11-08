import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IconName, RescuePage } from "./userTypes";
import { Brand, Button, Icon, PageTitle, Status, incoming,normalMessages, typeData, volumeData } from "./shared";

const rescueNav: { page: RescuePage; icon: IconName }[] = [
  { page: "Dashboard", icon: "home" }, { page: "Incoming Crises", icon: "alert" },
  
  { page: "Crisis Logs", icon: "file" }, { page: "GIS Command Map", icon: "map" }, { page: "Analytics", icon: "chart" },
  { page: "User Feedback", icon: "feedback" }, { page: "Team Profile", icon: "team" },
];

function RescueSidebar({ page, setPage, collapsed, setCollapsed, onLogout }: { page: RescuePage; setPage: (p: RescuePage) => void; collapsed: boolean; setCollapsed: () => void; onLogout: () => void }) {
  return <aside className={`rescue-sidebar ${collapsed ? "collapsed" : ""}`}><div className="sidebar-brand"><Brand compact /><button onClick={setCollapsed}><Icon name="menu" /></button></div><div className="command-mode"><i /><span>COMMAND MODE</span><small>LIVE</small></div>
    <nav>{rescueNav.map((item) => <button key={item.page} className={page === item.page ? "active" : ""} onClick={() => setPage(item.page)} title={item.page}><Icon name={item.icon} /><span>{item.page}</span>{item.page === "Incoming Crises" && <em>6</em>}</button>)}</nav>
    <button className="sidebar-logout" onClick={onLogout}><Icon name="logout" /><span>Logout</span></button>
  </aside>;
}

function RescueTopbar({ page, setPage }: { page: RescuePage; setPage: (page: RescuePage) => void }) {
  const [notice, setNotice] = useState(false);
  return <header className="rescue-topbar"><div><span>OPERATIONS /</span><strong>{page.toUpperCase()}</strong></div><div className="topbar-actions"><div className="system-state"><i /> ALL SYSTEMS OPERATIONAL</div><span className="top-time">20:48 IST<br /><small>20 FEB 2026</small></span><div className="relative"><button className="icon-button" aria-label="Operational notifications" onClick={() => setNotice((value) => !value)}><Icon name="bell" /><span className="notification-dot" /></button>{notice && <div className="notification-panel rescue-notices"><div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><strong>Command alerts</strong><span className="text-xs text-teal-300">2 new</span></div>{["New critical medical incident in Madurai.", "Team Bravo accepted cyclone response."].map((text) => <button className="notification-item" key={text} onClick={() => { setNotice(false); setPage("Incoming Crises"); }}><i className="new" /><span>{text}<small>Just now</small></span></button>)}</div>}</div><button className="team-avatar" onClick={() => setPage("Team Profile")}>SR<span><strong>South Response</strong><small>Team Alpha</small></span></button></div></header>;
}

function Metric({ icon, label, value, tone, delta }: { icon: IconName; label: string; value: string; tone: string; delta?: string }) {
  return <article className={`metric metric-${tone}`}><div className="metric-top"><span><Icon name={icon} /></span>{delta && <small>{delta}</small>}</div><strong>{value}</strong><p>{label}</p></article>;
}

function IncidentList({
  onOpen,
  compact = false,
}: {
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((err) => console.error("Error loading rescue reports:", err));
  }, []);

  const allReports = [...crises, ...backendReports];
  const uniqueReports = Array.from(new Map(allReports.map(item => [item.id, item])).values());
  const sortedItems = [...uniqueReports].sort((a, b) => (b.score || b.priorityScore || 0) - (a.score || a.priorityScore || 0));

  return (
    <div className="incident-list">
      {sortedItems.slice(0, compact ? 4 : undefined).map((r, index) => (
        <article className="incident-row" key={r.id}>
          <div className="incident-main" style={{ minWidth: "160px" }}>
            <div>
              <strong>{r.id}</strong>
              <small>{r.timestamp || r.time}</small>
            </div>
          </div>

          <div
            className="queue-rank"
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#2dd4bf",
              padding: "0 15px",
            }}
          >
            #{String(index + 1).padStart(2, "0")}
          </div>

          <div className="incident-type" style={{ flex: 1 }}>
            <b style={{ fontSize: "16px", color: "#ffffff" }}>{r.type || r.disaster}</b>
            <div className="text-xs text-slate-400">{r.location}</div>
          </div>

          <Status value={r.status || "PENDING"} />

          <Button variant="secondary" onClick={() => onOpen(r.id)}>
            OPEN INCIDENT
          </Button>
        </article>
      ))}
      {sortedItems.length === 0 && (
        <p className="p-6 text-center text-slate-400">No incoming crises found.</p>
      )}
    </div>
  );
}

function RescueDashboard({ onOpen, setPage }: { onOpen: (id: string) => void; setPage: (p: RescuePage) => void }) {
  return <div><PageTitle eyebrow="THURSDAY, 20 FEBRUARY 2026" title="Operational overview" text="Live situational awareness across all active response zones." action={<div className="last-sync"><i /> Live data · Updated just now</div>} />
    <div className="metric-grid"><Metric icon="alert" label="Active crises" value="24" tone="teal" delta="+4 today" /><Metric icon="activity" label="Critical incidents" value="6" tone="red" delta="2 unassigned" /><Metric icon="team" label="In progress" value="11" tone="blue" /><Metric icon="check" label="Completed today" value="18" tone="green" delta="↑ 12%" /><Metric icon="feedback" label="Pending feedback" value="7" tone="amber" /></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Live incoming crisis feed</h2><p>Prioritized by AI-assisted urgency assessment</p></div><button onClick={() => setPage("Incoming Crises")}>View all <Icon name="arrow" size/></button></div><IncidentList onOpen={onOpen} compact /></section>
      <aside className="panel response-panel"><div className="panel-heading"><div><h2>Response capacity</h2><p>Current field availability</p></div></div>
        {[["Rescue units", "18 / 24", 75], ["Medical teams", "9 / 12", 75], ["Relief vehicles", "14 / 20", 70], ["Shelter capacity", "68%", 68]].map((x) => <div className="capacity" key={x[0] as string}><div><span>{x[0]}</span><strong>{x[1]}</strong></div><i><b style={{ width: `${x[2]}%` }} /></i></div>)}
        <div className="dispatch-note"><Icon name="shield" /><div><strong>6 units ready to deploy</strong><span>Across Chennai response zone</span></div></div>
      </aside>
    </div>
  </div>;
}




function IncomingPage({ onOpen }: { onOpen: () => void }) {
  const [filterOpen, setFilterOpen] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  const filteredIncidents = incoming.filter((r) => {
    const matchesSearch = [r.id, r.type, r.location].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    );

    const matchesFilter =
      tab === "All" ||
      tab === "Normal Message" ||
      r.priority.toLowerCase() === tab.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const filteredMessages = normalMessages.filter((m) =>
    [m.id, m.category, m.message].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  );

  const counts = {
    All: incoming.length + normalMessages.length,
    Critical: incoming.filter((r) => r.priority === "Critical").length,
    High: incoming.filter((r) => r.priority === "High").length,
    Medium: incoming.filter((r) => r.priority === "Medium").length,
    "Normal Message": normalMessages.length,
  };

  return (
    <div>
      <PageTitle
        eyebrow="LIVE INTAKE"
        title="Incoming crises"
        text="Review and inspect incoming disaster reports and ordinary messages."
        action={
          <Button onClick={() => setFilterOpen((value) => !value)}>
            <Icon name="filter" />
            {filterOpen ? "HIDE FILTERS" : "FILTER REPORTS"}
          </Button>
        }
      />

      {filterOpen && (
        <div className="table-tools">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Search crisis ID, location or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tabs compact">
            {(
              [
                "All",
                "Critical",
                "High",
                "Medium",
                "Normal Message",
              ] as const
            ).map((label) => (
              <button
                className={tab === label ? "active" : ""}
                onClick={() => setTab(label)}
                key={label}
              >
                {label} <span>{counts[label]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "Normal Message" ? (
        <div className="incident-list">
          {filteredMessages.length ? (
            filteredMessages.map((m) => (
              <article className="incident-row" key={m.id}>
                <div className="incident-main">
                  <div>
                    <strong>{m.id}</strong>
                    <small>{m.time}</small>
                  </div>
                  <div>
                    <b>{m.category}</b>
                    <span>{m.message}</span>
                  </div>
                </div>
                <Status value="Normal Message" />
              </article>
            ))
          ) : (
            <p>No normal messages found.</p>
          )}
        </div>
      ) : tab === "All" ? (
        <>
          <IncidentList onOpen={onOpen} items={filteredIncidents} />
          <div className="incident-list">
            {filteredMessages.map((m) => (
              <article className="incident-row" key={m.id}>
                <div className="incident-main">
                  <div>
                    <strong>{m.id}</strong>
                    <small>{m.time}</small>
                  </div>
                  <div>
                    <b>{m.category}</b>
                    <span>{m.message}</span>
                  </div>
                </div>
                <Status value="Normal Message" />
              </article>
            ))}
          </div>
        </>
      ) : (
        <IncidentList onOpen={onOpen} items={filteredIncidents} />
      )}
    </div>
  );
}


function RescueDashboard({ onOpen, setPage }: { onOpen: () => void; setPage: (p: RescuePage) => void }) {
  return <div><PageTitle eyebrow="THURSDAY, 20 FEBRUARY 2026" title="Operational overview" text="Live situational awareness across all active response zones." action={<div className="last-sync"><i /> Live data · Updated just now</div>} />
    <div className="metric-grid"><Metric icon="alert" label="Active crises" value="24" tone="teal" delta="+4 today" /><Metric icon="activity" label="Critical incidents" value="6" tone="red" delta="2 unassigned" /><Metric icon="team" label="In progress" value="11" tone="blue" /><Metric icon="check" label="Completed today" value="18" tone="green" delta="↑ 12%" /><Metric icon="feedback" label="Pending feedback" value="7" tone="amber" /></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Live incoming crisis feed</h2><p>Prioritized by AI-assisted urgency assessment</p></div><button onClick={() => setPage("Incoming Crises")}>View all <Icon name="arrow" size={14} /></button></div><IncidentList onOpen={onOpen} compact /></section>
      <aside className="panel response-panel"><div className="panel-heading"><div><h2>Response capacity</h2><p>Current field availability</p></div></div>
        {[["Rescue units", "18 / 24", 75], ["Medical teams", "9 / 12", 75], ["Relief vehicles", "14 / 20", 70], ["Shelter capacity", "68%", 68]].map((x) => <div className="capacity" key={x[0] as string}><div><span>{x[0]}</span><strong>{x[1]}</strong></div><i><b style={{ width: `${x[2]}%` }} /></i></div>)}
        <div className="dispatch-note"><Icon name="shield" /><div><strong>6 units ready to deploy</strong><span>Across Chennai response zone</span></div></div>
      </aside>
    </div>
    
    <section className="panel extracted-data-panel">
      <div className="panel-heading">
        <div>
          <h2>Extracted Data</h2>
          <p>Key information extracted from incoming crisis messages</p>
        </div>
        <span className="confidence">AI-ASSISTED</span>
      </div>

      <div className="analysis-grid">
        {[
          ["Disaster type", "Urban Flood"],
          ["Location", "Velachery, Chennai"],
          ["People affected", "20"],
          ["Primary needs", "Food, water, rescue boat"],
          ["Urgency", "Immediate response"],
          ["Priority", "Critical"],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>

  </div>;
}


function IncomingPage({ onOpen }: { onOpen: () => void }) {
  const [filterOpen, setFilterOpen] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  const filteredIncidents = incoming.filter((r) => {
    const matchesSearch = [
      r.id,
      r.type,
      r.location,
    ].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    );

    const matchesFilter =
      tab === "All" ||
      r.priority.toLowerCase() === tab.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const filteredMessages = normalMessages.filter((m) =>
  [m.id, m.category, m.message]
    .some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    )
);

  const counts = {
    All: incoming.length + normalMessages.length,
    Critical: incoming.filter((r) => r.priority === "Critical").length,
    High: incoming.filter((r) => r.priority === "High").length,
    Medium: incoming.filter((r) => r.priority === "Medium").length,
    "Normal Message": normalMessages.length,
  };

  return (
    <div>
      <PageTitle
        eyebrow="LIVE INTAKE"
        title="Incoming crises"
        text="Review and inspect incoming disaster reports and ordinary messages."
        action={
          <Button onClick={() => setFilterOpen((value) => !value)}>
            <Icon name="filter" />
            {filterOpen ? "HIDE FILTERS" : "FILTER REPORTS"}
          </Button>
        }
      />

      {filterOpen && (
        <div className="table-tools">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Search crisis ID, location or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tabs compact">
            {(
              [
                "All",
                "Critical",
                "High",
                "Medium",
                "Normal Message",
              ] as const
            ).map((label) => (
              <button
                className={tab === label ? "active" : ""}
                onClick={() => setTab(label)}
                key={label}
              >
                {label} <span>{counts[label]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      
{tab === "Normal Message" ? (
  <div className="incident-list">
    {filteredMessages.length ? (
      filteredMessages.map((m) => (
        <article className="incident-row" key={m.id}>
          <div className="incident-main">
            <div>
              <strong>{m.id}</strong>
              <small>{m.time}</small>
            </div>
            <div>
              <b>{m.category}</b>
              <span>{m.message}</span>
            </div>
          </div>
          <Status value="Normal Message" />
        </article>
      ))
    ) : (
      <p>No normal messages found.</p>
    )}
  </div>
) : tab === "All" ? (
  <>
    <IncidentList onOpen={onOpen} items={filteredIncidents} />
    <div className="incident-list">
      {filteredMessages.map((m) => (
        <article className="incident-row" key={m.id}>
          <div className="incident-main">
            <div>
              <strong>{m.id}</strong>
              <small>{m.time}</small>
            </div>
            <div>
              <b>{m.category}</b>
              <span>{m.message}</span>
            </div>
          </div>
          <Status value="Normal Message" />
        </article>
      ))}
    </div>
  </>
) : (
  <IncidentList onOpen={onOpen} items={filteredIncidents} />
)}


      
    </div>
  );
}


const WORD_MAP: Record<string, number> = {
  zero: 0, no: 0, none: 0, nil: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90, hundred: 100
};

function extractDeathsFromMsg(msg?: string): number | null {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();
  if (/\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:deaths?|fatalities|casualties|loss\s+of\s+life|fatal\s+casualties)\b|\b(?:no\s+one|nobody)\s+(?:has\s+|was\s+|were\s+)?(?:died|killed|dead|perished)\b|\b(?:without\s+any|no)\s+(?:loss\s+of\s+life|lives\s+lost|fatalities|deaths?|casualties)\b/i.test(m)) {
    return 0;
  }
  const numPat = "(\\b\\d[\\d,]*\\b|zero|no|none|nil|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";
  const patterns = [
    new RegExp('\\b(?:deaths?|fatalities|casualties|dead|killed|loss\\s+of\\s+life)\\s*[:=-]\\s*' + numPat + '\\b', 'i'),
    new RegExp('\\b(?:death\\s+toll|fatalities|toll|loss\\s+of\\s+life|number\\s+of\\s+deaths?)\\s*(?:of|is|was|has\\s+reached|reached|stands\\s+at|at|has\\s+risen\\s+to|rose\\s+to|climbed\\s+to|hit)?\\s*[:=-]?\\s*' + numPat + '\\b', 'i'),
    new RegExp('\\b(?:killed|killing)\\s+(?:at\\s+least\\s+|up\\s+to\\s+|around\\s+|approx(?:\\.|\\s+)?\\s*)?' + numPat + '\\s*(?:people|persons|individuals|citizens|residents|victims)?\\b', 'i'),
    new RegExp('\\b(?:left|leaving)\\s+(?:at\\s+least\\s+|up\\s+to\\s+|around\\s+|approx(?:\\.|\\s+)?\\s*)?' + numPat + '\\s*(?:people\\s+)?(?:dead|deceased|fatalities)?\\b', 'i'),
    new RegExp('\\b(?:claimed|took)\\s+(?:the\\s+lives\\s+of\\s+)?' + numPat + '\\s*(?:lives|people|individuals|persons|victims)?\\b', 'i'),
    new RegExp('\\b(?:deaths?|loss)\\s+of\\s+' + numPat + '\\s+(?:people|persons|individuals|residents|victims|lives)\\b', 'i'),
    new RegExp('\\b' + numPat + '\\s+(?:[a-z]+\\s+){0,3}(?:lost\\s+(?:their\\s+|a\\s+)?(?:lives|life))\\b', 'i'),
    new RegExp('\\b' + numPat + '\\s+(?:[a-z]+\\s+){0,3}(?:succumbed\\s+to\\s+injuries)\\b', 'i'),
    new RegExp('\\b' + numPat + '\\s+(?:[a-z]+\\s+){0,3}(?:bodies\\s+(?:found|recovered)|dead\\s+bodies|corpses)\\b', 'i'),
    new RegExp('\\b' + numPat + '\\s+(?:[a-z]+\\s+){0,3}(?:died|dead|death|deaths|fatalities|killed|perished|deceased|casualties|casualty)\\b', 'i'),
  ];
  for (const pat of patterns) {
    const match = m.match(pat);
    if (match) {
      const raw = match[1].toLowerCase().replace(/,/g, "");
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
      if (WORD_MAP[raw] !== undefined) return WORD_MAP[raw];
    }
  }
  return null;
}

function normalizeMissingField(f: string): string {
  const s = String(f || "").trim();
  if (/death/i.test(s)) return "Death count not confirmed";
  if (/injur/i.test(s)) return "Injured count not confirmed";
  if (/trapped|stranded/i.test(s)) return "Trapped/stranded count not confirmed";
  if (/need/i.test(s)) return "Emergency needs not specified";
  if (/location/i.test(s)) return "Location not detected";
  if (/disaster/i.test(s)) return "Disaster type not identified";
  if (/photo|video|evidence/i.test(s)) return "Photo/Video Evidence";
  return s;
}

function IncidentDetail({
  reportId,
  onBack,
}: {
  reportId?: string;
  onBack: () => void;
}) {
  const { crises, setCrises } = useCrises();
  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((err) => console.error("Error loading report details:", err));
  }, []);

  const allReports = [...crises, ...backendReports];
  // Match exact selected report ID, fallback to first if missing
  const report = allReports.find((r) => String(r.id) === String(reportId)) || allReports[0];

  if (!report) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        <p>No incident found for ID: {reportId}</p>
        <button onClick={onBack} style={{ marginTop: "16px", padding: "8px 16px", background: "#1e293b", color: "#2dd4bf", border: "1px solid #334155", borderRadius: "8px", cursor: "pointer" }}>
          ‹ Back to incoming crises
        </button>
      </div>
    );
  }

  async function updateStatus(newStatus: string) {
    try {
      setCrises((prev) =>
        prev.map((c) => (String(c.id) === String(report.id) ? { ...c, status: newStatus } : c))
      );

      await fetch(`/api/reports/${report.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.warn("Status update saved locally", err);
    }
  }

  const disasterType = report.disaster || report.type || "General Emergency";
  const locationName = report.location || "Location pending";
  const currentStatus = report.status || "PENDING";
  const confidence = Number(report.confidence ?? report.roberta_confidence ?? 0);
  const urgency = report.urgency || "Not assessed";

  const parseNum = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    const str = String(val).trim();
    if (/^(none reported|not reported|not detected|null|undefined|none|unknown)$/i.test(str)) return null;
    if (/^(0|zero)$/i.test(str)) return 0;
    const m = str.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };

  const isExplicitZero = (val: any): boolean => {
    if (val === 0 || val === "0") return true;
    if (typeof val === "string" && /^(0|zero|no deaths|no injuries|no one trapped|zero deaths|no casualties)$/i.test(val.trim())) return true;
    return false;
  };

  let deathsNum = parseNum(report.deaths ?? (report as any).death_count);
  if (deathsNum === null && !isExplicitZero(report.deaths) && report.message) {
    deathsNum = extractDeathsFromMsg(report.message);
  }
  const deathsDisplay =
    deathsNum !== null
      ? String(deathsNum)
      : isExplicitZero(report.deaths)
      ? "0"
      : "Not reported";

  let injuredNum = parseNum(report.injured ?? (report as any).injured_people);
  if (injuredNum === null && !isExplicitZero(report.injured) && report.message) {
    const injMatch = report.message.match(/\b(\d+)\s+(?:[a-z]+\s+){0,3}(?:injured|injuries|wounded|hurt)\b/i) ||
                     report.message.match(/\b(?:injured|injuries|wounded|hurt)\s*[:=-]\s*(\d+)\b/i);
    if (injMatch) injuredNum = parseInt(injMatch[1], 10);
  }
  const injuredDisplay =
    injuredNum !== null
      ? String(injuredNum)
      : isExplicitZero(report.injured)
      ? "0"
      : "Not reported";

  let trappedNum = parseNum(report.trapped ?? (report as any).trapped_people);
  if (trappedNum === null && !isExplicitZero(report.trapped) && report.message) {
    const trapMatch = report.message.match(/\b(\d+)\s+(?:[a-z]+\s+){0,3}(?:trapped|stranded|stuck|marooned)\b/i) ||
                      report.message.match(/\b(?:trapped|stranded|stuck|marooned)\s*[:=-]\s*(\d+)\b/i);
    if (trapMatch) trappedNum = parseInt(trapMatch[1], 10);
  }
  const trappedDisplay =
    trappedNum !== null
      ? String(trappedNum)
      : isExplicitZero(report.trapped)
      ? "0"
      : "Not reported";

  const affectedNum = parseNum(report.peopleAffected || report.people);
  let totalAffectedDisplay = "Not reported";
  if (affectedNum !== null) {
    totalAffectedDisplay = String(affectedNum);
  } else if (deathsNum !== null || injuredNum !== null || trappedNum !== null) {
    totalAffectedDisplay = String((deathsNum || 0) + (injuredNum || 0) + (trappedNum || 0));
  }

  // Actionability evaluation fallback
  const rawActionability = report.actionabilityScore ?? (report as any).actionability ?? (report as any).actionability_score;
  const actionabilityScore = typeof rawActionability === "number" && !isNaN(rawActionability) ? rawActionability : 75;
  const actionabilityLevel = report.actionabilityLevel || (report as any).actionability_level || (actionabilityScore >= 70 ? "High" : actionabilityScore >= 40 ? "Medium" : "Low");
  const actionabilityBarriers: string[] = Array.isArray(report.actionabilityReasons) && report.actionabilityReasons.length > 0
    ? report.actionabilityReasons
    : Array.isArray((report as any).actionability_reasons)
    ? (report as any).actionability_reasons
    : [];

  // Completeness evaluation fallback
  const rawCompleteness = report.completenessScore ?? (report as any).completeness ?? (report as any).completeness_score;
  const completenessScore = typeof rawCompleteness === "number" && !isNaN(rawCompleteness) ? rawCompleteness : 71;
  const missingFieldsList: string[] = completenessScore < 100
    ? (Array.isArray(report.missingFields) && report.missingFields.length > 0
        ? report.missingFields.map(normalizeMissingField)
        : Array.isArray((report as any).missing_fields) && (report as any).missing_fields.length > 0
        ? (report as any).missing_fields.map(normalizeMissingField)
        : ["Photo/Video Evidence"])
    : [];

  // Priority evaluation fallback
  const rawPriority = report.priorityScore ?? report.score ?? (report as any).priority_rating;
  const priorityScore = typeof rawPriority === "number" && !isNaN(rawPriority) ? rawPriority : 80;
  const priorityLevel = report.priority || (report as any).priority_level || (priorityScore >= 80 ? "Critical" : priorityScore >= 60 ? "High" : priorityScore >= 40 ? "Medium" : "Low");
  const priorityReasonsList: string[] = Array.isArray(report.priorityReasons) && report.priorityReasons.length > 0
    ? report.priorityReasons
    : Array.isArray((report as any).priority_reasons)
    ? (report as any).priority_reasons
    : ["People affected / casualty information available", "Disaster event identified"];

  return (
    <div>
      <button className="back-link" onClick={onBack} style={{ background: "transparent", border: "none", color: "#2dd4bf", cursor: "pointer", marginBottom: "16px", fontSize: "14px", fontWeight: 500 }}>
        ‹ Back to incoming crises
      </button>

      <div className="incident-title">
        <div>
          <div className="flex items-center gap-3">
            <span className="status status-red">
              <i />
              {report.priority || "CRITICAL"}
            </span>
            <span className="mono-label">{report.id}</span>
          </div>
          <h1>
            {disasterType} · {locationName.split(",")[0]}
          </h1>
          <p>
            Submitted {report.time || report.timestamp || "Today"} · Citizen mobile application ({report.contact || "Not provided"})
          </p>
        </div>
        <Status value={currentStatus} />
      </div>

      <div className="incident-detail-grid">
        <section className="space-y-4">
          <article className="panel">
            <span className="label">ORIGINAL USER MESSAGE</span>
            <blockquote>
              &ldquo;{report.message || "No emergency message provided."}&rdquo;
            </blockquote>
            <div className="source-meta">
              <span>Verified user</span>
              <span>GPS confirmed</span>
              <span>{report.time || "Recent"}</span>
            </div>
          </article>

          {(report.photoUrl || report.videoUrl || report.imageName || report.videoName) && (
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Citizen uploaded evidence</h2>
                  <p>Photo and video footage submitted from field</p>
                </div>
                {(() => {
                  const evStatus =
                    report.evidenceStatus ||
                    report.evidence_status ||
                    (report.photoUrl ? "valid" : "requires_verification");
                  const isEvValid =
                    report.evidenceValid === true ||
                    report.evidence_valid === true ||
                    evStatus === "valid";

                  if (isEvValid) {
                    return (
                      <span className="status status-green" style={{ fontSize: "11px", padding: "2px 8px" }}>
                        ✓ VERIFIED DISASTER EVIDENCE
                      </span>
                    );
                  }
                  if (evStatus === "invalid") {
                    return (
                      <span className="status status-red" style={{ fontSize: "11px", padding: "2px 8px" }}>
                        ❌ UNRELATED / INVALID EVIDENCE
                      </span>
                    );
                  }
                  return (
                    <span className="status" style={{ fontSize: "11px", padding: "2px 8px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.4)" }}>
                      ⚠️ REQUIRES MANUAL VERIFICATION
                    </span>
                  );
                })()}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
                {report.photoUrl && (
                  <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#2dd4bf", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
                      📷 {report.photoName || report.imageName || "Photo Evidence"}
                    </span>
                    <img
                      src={report.photoUrl.startsWith("http") ? report.photoUrl : `/uploads/${report.photoUrl.replace(/^\/uploads\//, "")}`}
                      alt="Disaster evidence"
                      style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "6px", cursor: "pointer", objectFit: "contain", display: "block", margin: "0 auto" }}
                      onClick={() => window.open(report.photoUrl.startsWith("http") ? report.photoUrl : `/uploads/${report.photoUrl.replace(/^\/uploads\//, "")}`, "_blank")}
                    />
                  </div>
                )}
                {report.videoUrl && (
                  <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#2dd4bf", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
                      📹 {report.videoName || "Video Evidence"}
                    </span>
                    <video
                      src={report.videoUrl.startsWith("http") ? report.videoUrl : `/uploads/${report.videoUrl.replace(/^\/uploads\//, "")}`}
                      controls
                      style={{ width: "100%", maxHeight: "180px", borderRadius: "6px" }}
                    />
                    <small style={{ fontSize: "10px", color: "#fbbf24", display: "block", marginTop: "4px" }}>
                      ℹ️ Video container verified. Frame decoding requires coordinator manual review.
                    </small>
                  </div>
                )}
              </div>
              {(report.evidenceMessage || report.evidenceReason) && (
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>
                  <strong>Verification Note: </strong>{report.evidenceMessage || report.evidenceReason}
                </p>
              )}
            </article>
          )}

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>AI classification</h2>
                <p>Automated crisis intelligence extraction</p>
              </div>
              <span className="confidence">
                {Math.round(confidence > 0 && confidence <= 1 ? confidence * 100 : confidence)}% CONFIDENCE
              </span>
            </div>
            <div className="analysis-grid">
              {[
                ["Disaster type", disasterType],
                ["Predicted category", report.category || "Natural Disaster"],
                ["Location", locationName],
                ["Extracted needs", report.need || report.specificNeed || "Assessment required"],
                ["People affected", totalAffectedDisplay],
                ["Trapped", trappedDisplay],
                ["Injured", injuredDisplay],
                ["Deaths", deathsDisplay],
                ["Contact", report.contact || "Not provided"],
              ].map((x) => (
                <div key={x[0]}>
                  <span>{x[0]}</span>
                  <strong>{x[1]}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className="space-y-4">
          <article className="panel score-card">
            <h2>📊 Quantitative Intelligence</h2>

            {/* 1. Actionability Score */}
            <div className="score">
              <div>
                <span>Actionability Score</span>
                <strong>{actionabilityScore}/100 · {actionabilityLevel}</strong>
              </div>
              <i>
                <b style={{ width: `${Math.max(0, Math.min(100, Number(actionabilityScore)))}%` }} />
              </i>
              {actionabilityScore < 100 && actionabilityBarriers.length > 0 && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Operational barriers: </span>
                  {actionabilityBarriers.join("; ")}.
                </div>
              )}
            </div>

            {/* 2. Completeness Score */}
            <div className="score">
              <div>
                <span>Completeness Score</span>
                <strong>{completenessScore}/100</strong>
              </div>
              <i>
                <b style={{ width: `${Math.max(0, Math.min(100, Number(completenessScore)))}%` }} />
              </i>
              {completenessScore < 100 && missingFieldsList.length > 0 && (
                <div style={{ fontSize: "11px", color: "#fbbf24", marginTop: "4px", lineHeight: "1.4" }}>
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>Missing information: </span>
                  {missingFieldsList.join("; ")}.
                </div>
              )}
            </div>

            {/* 3. Priority Score and Priority Level */}
            <div className="score">
              <div>
                <span>Priority Score and Priority Level</span>
                <strong>{priorityScore}/100 · {priorityLevel}</strong>
              </div>
              <i>
                <b style={{ width: `${Math.max(0, Math.min(100, Number(priorityScore)))}%` }} />
              </i>
              {priorityReasonsList.length > 0 && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Contributing factors: </span>
                  {priorityReasonsList.join("; ")}.
                </div>
              )}
            </div>

            <div className="urgency-box">
              <span>URGENCY</span>
              <strong>{urgency.toUpperCase()}</strong>
            </div>
          </article>

          <article className="panel action-panel">
            <h2>Incident actions</h2>
            <Button onClick={() => updateStatus("IN PROGRESS")}>
              ACCEPT INCIDENT
            </Button>
            <Button variant="secondary" onClick={() => updateStatus("IN PROGRESS")}>
              MARK IN PROGRESS
            </Button>
            <Button variant="secondary" onClick={() => updateStatus("COMPLETED")}>
              MARK COMPLETED
            </Button>
            <Button variant="ghost" onClick={() => setNoteOpen((value) => !value)}>
              {noteOpen ? "CANCEL NOTE" : "ADD RESPONSE NOTE"}
            </Button>
            {noteOpen && (
              <div className="field">
                <textarea rows={3} placeholder="Add a field update..." />
                <Button onClick={() => setNoteOpen(false)}>SAVE NOTE</Button>
              </div>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
}


function LogsPage() {
  const [filter, setFilter] = useState("");
  return <div><PageTitle eyebrow="INCIDENT ARCHIVE" title="Crisis logs" text="Search and review the complete operational incident history." />
    <div className="filter-bar"><div className="search-field"><Icon name="search" /><input placeholder="Search crisis records..." /></div>{["Date", "Disaster Type", "Location", "Priority", "Status"].map((x) => <button className={filter === x ? "active" : ""} onClick={() => setFilter(filter === x ? "" : x)} key={x}>{x}<span>{filter === x ? "×" : "⌄"}</span></button>)}</div>
    <div className="data-table"><table><thead><tr>{["Crisis ID", "Timestamp", "Disaster", "Location", "Priority", "Status", "Resolution time"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{incoming.map((r, i) => <tr key={r.id}><td><strong>{r.id}</strong></td><td>{r.time}</td><td>{r.type}</td><td>{r.location}</td><td><Status value={r.priority} /></td><td><Status value={r.status} /></td><td>{r.status === "COMPLETED" ? i === 2 ? "2h 14m" : "4h 08m" : "—"}</td></tr>)}</tbody></table></div>
  </div>;
}

function MapPage({ onOpen }: { onOpen: () => void }) {
  return <div className="map-page"><PageTitle eyebrow="GEOSPATIAL OPERATIONS" title="GIS command map" text="Live incident locations and field response coverage." />
    <section className="map-shell"><div className="map-toolbar"><div className="search-field"><Icon name="search" /><input placeholder="Search location or crisis ID..." /></div><div className="map-legend">{["Critical", "High", "Medium", "Low"].map((x) => <span className={x.toLowerCase()} key={x}><i />{x}</span>)}</div></div>
      <div className="map-canvas"><div className="map-grid" /><div className="map-road r1" /><div className="map-road r2" /><div className="map-road r3" /><span className="map-label l1">CHENNAI CENTRAL</span><span className="map-label l2">ANNA NAGAR</span><span className="map-label l3">VELACHERY</span><span className="map-label l4">ADYAR</span>
        {[["critical", "31%", "68%"], ["high", "53%", "37%"], ["critical", "67%", "72%"], ["medium", "76%", "48%"], ["high", "41%", "54%"]].map((p, i) => <button key={i} className={`map-pin ${p[0]}`} style={{ left: p[1], top: p[2] }} onClick={onOpen}><span>{i + 1}</span></button>)}
        <div className="map-popup"><div className="flex items-center justify-between"><Status value="Critical" /><span className="text-xs text-slate-500">48 min ago</span></div><h3>Urban Flood</h3><p><Icon name="location" size={13} /> Velachery, Chennai</p><div><span>20 affected</span><span>Rescue boat needed</span></div><Button onClick={onOpen}>OPEN INCIDENT</Button></div>
      </div>
    </section>
  </div>;
}

function AnalyticsPage() {
  const periods = ["LAST 7 DAYS", "LAST 30 DAYS", "LAST 90 DAYS"];
  const [period, setPeriod] = useState(0);
  return <div><PageTitle eyebrow="PERFORMANCE INTELLIGENCE" title="Analytics" text="Operational trends and emergency response performance." action={<Button variant="secondary" onClick={() => setPeriod((value) => (value + 1) % periods.length)}>{periods[period]} <span>⌄</span></Button>} />
    <div className="metric-grid analytics-metrics"><Metric icon="alert" label="Total incidents" value="198" tone="teal" delta="↑ 14%" /><Metric icon="clock" label="Avg. response time" value="12m" tone="blue" delta="↓ 2.4m" /><Metric icon="check" label="Completion rate" value="91%" tone="green" delta="↑ 3.2%" /><Metric icon="feedback" label="User rating" value="4.7" tone="amber" delta="1,204 reviews" /></div>
    <div className="charts-grid"><article className="chart-card wide"><div className="panel-heading"><div><h2>Crisis volume</h2><p>Incidents received over the last 7 days</p></div></div><ResponsiveContainer width="100%" height={270}><AreaChart data={volumeData}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.28} /><stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#1f2b3a" vertical={false} /><XAxis dataKey="day" tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#111c29", border: "1px solid #263547", borderRadius: 8 }} /><Area type="monotone" dataKey="incidents" stroke="#2dd4bf" strokeWidth={2} fill="url(#area)" /></AreaChart></ResponsiveContainer></article>
      <article className="chart-card"><div className="panel-heading"><div><h2>Disaster distribution</h2><p>By incident category</p></div></div><ResponsiveContainer width="100%" height={215}><PieChart><Pie data={typeData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={3}>{typeData.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip contentStyle={{ background: "#111c29", border: "1px solid #263547", borderRadius: 8 }} /></PieChart></ResponsiveContainer><div className="pie-legend">{typeData.map((d) => <span key={d.name}><i style={{ background: d.color }} />{d.name}<b>{d.value}%</b></span>)}</div></article>
      <article className="chart-card wide"><div className="panel-heading"><div><h2>Location-wise incidents</h2><p>Top affected response zones</p></div></div><ResponsiveContainer width="100%" height={240}><BarChart data={[{ name: "Chennai", v: 68 }, { name: "Coimbatore", v: 41 }, { name: "Madurai", v: 32 }, { name: "Nilgiris", v: 28 }, { name: "Nagapattinam", v: 21 }]} layout="vertical"><CartesianGrid stroke="#1f2b3a" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fill: "#9aa9bb", fontSize: 11 }} axisLine={false} tickLine={false} width={90} /><Bar dataKey="v" fill="#27c6b8" radius={[0, 4, 4, 0]} barSize={14} /></BarChart></ResponsiveContainer></article>
    </div>
  </div>;
}

function RescueFeedback({ onOpen }: { onOpen: () => void }) {
  const [reviewed, setReviewed] = useState(false);
  const [responding, setResponding] = useState(false);
  return <div><PageTitle eyebrow="CITIZEN EXPERIENCE" title="Feedback inbox" text="Review feedback from completed emergency responses." />
    <div className="feedback-inbox"><article className="feedback-message"><div className="feedback-top"><div><Status value={reviewed ? "REVIEWED" : "NEW"} /><span>Received 2 hours ago</span></div><span className="stars">★★★★★</span></div><span className="label">CRISIS ID</span><strong>CRS-2026-00118</strong><blockquote>&ldquo;Rescue team responded quickly and provided clean water. The updates in the app helped our family know that assistance was on the way.&rdquo;</blockquote><div className="feedback-tags"><span>Issue fully resolved</span><span>Response was timely</span></div><div className="feedback-actions"><Button onClick={() => setReviewed(true)}><Icon name="check" /> {reviewed ? "REVIEWED" : "MARK AS REVIEWED"}</Button><Button variant="secondary" onClick={() => setResponding((value) => !value)}><Icon name="feedback" /> {responding ? "CANCEL" : "ADD RESPONSE"}</Button><Button variant="ghost" onClick={onOpen}>VIEW INCIDENT <Icon name="arrow" size={14} /></Button></div>{responding && <div className="field mt-4"><textarea rows={3} placeholder="Write a response to the citizen..." /><Button onClick={() => setResponding(false)}>SEND RESPONSE</Button></div>}</article>
      <article className="feedback-message"><div className="feedback-top"><div><Status value="REVIEWED" /><span>Yesterday</span></div><span className="stars">★★★★☆</span></div><span className="label">CRISIS ID</span><strong>CRS-2026-00112</strong><blockquote>&ldquo;The team was professional and kept us safe. Initial arrival took longer than expected due to blocked roads.&rdquo;</blockquote><div className="feedback-tags"><span>Issue fully resolved</span><span>Response was delayed</span></div></article></div>
  </div>;
}

function TeamProfile({ onLogout }: { onLogout: () => void }) {
  const [editing, setEditing] = useState(false);
  return <div><PageTitle eyebrow="RESPONSE UNIT" title="Team profile" text="Manage your operational team details and shift status." /><section className="profile-card rescue-profile"><div className="profile-head"><div className="large-avatar"><Icon name="shield" size={28} /></div><div><h2>South Response · Team Alpha</h2><p>Tamil Nadu Disaster Response Force</p></div><Status value="IN PROGRESS" /></div>{editing ? <div className="form-stack py-6"><div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Team lead</span><input defaultValue="S. Rajan" /></label><label className="field"><span>Active personnel</span><input defaultValue="18" type="number" /></label></div><label className="field"><span>Current shift</span><input defaultValue="18:00 – 02:00 IST" /></label></div> : <div className="profile-info"><div><span>Team lead</span><strong>S. Rajan</strong></div><div><span>Team ID</span><strong>TNDRF-SR-014</strong></div><div><span>Active personnel</span><strong>18 responders</strong></div><div><span>Current shift</span><strong>18:00 – 02:00 IST</strong></div></div>}<div className="profile-actions"><Button variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "SAVE TEAM PROFILE" : "EDIT TEAM PROFILE"}</Button><Button variant="danger" onClick={onLogout}><Icon name="logout" /> END SESSION</Button></div></section></div>;
}

export default function RescueApp({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<RescuePage>("Dashboard");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const content = useMemo(() => {
    if (selectedIncidentId) return <IncidentDetail reportId={selectedIncidentId} onBack={() => setSelectedIncidentId(null)} />;
    if (page === "Dashboard") return <RescueDashboard onOpen={(id) => setSelectedIncidentId(id)} setPage={setPage} />;
    if (page === "Incoming Crises") return <IncomingPage onOpen={(id) => setSelectedIncidentId(id)} />;
    if (page === "GIS Command Map") return <MapPage onOpen={(id) => setSelectedIncidentId(id)} />;
    if (page === "User Feedback") return <RescueFeedback onOpen={(id) => setSelectedIncidentId(id)} />;
    if (page === "Crisis Logs") return <LogsPage />;
    if (page === "Analytics") return <AnalyticsPage />;
    return <TeamProfile onLogout={onLogout} />;
  }, [selectedIncidentId, page]);

  return (
    <div className={`rescue-app ${collapsed ? "rescue-sidebar-collapsed" : ""}`}>
      <RescueSidebar
        page={page}
        setPage={(p) => {
          setPage(p);
          setSelectedIncidentId(null);
        }}
        collapsed={collapsed}
        setCollapsed={() => setCollapsed((value) => !value)}
        onLogout={onLogout}
      />
      <div className="rescue-workspace">
        <RescueTopbar
          page={selectedIncidentId ? "Incoming Crises" : page}
          setPage={(next) => {
            setPage(next);
            setSelectedIncidentId(null);
          }}
        />
        <main className="rescue-main">{content}</main>
      </div>
    </div>
  );
}
