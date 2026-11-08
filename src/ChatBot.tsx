import React, { useState, useRef, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────
interface Turn {
  id: string;
  userVersions: string[];
  activeUserVersionIdx: number;
  aiVersions: Record<number, string[]>;
  activeAiVersionIdx: Record<number, number>;
  feedback: Record<string, "good" | "bad" | null>;
  userEditing: boolean;
  editDraft: string;
}

interface ChatSession {
  id: string;
  title: string;
  turns: Turn[];
  pinned: boolean;
  createdAt: number;
}

interface LibraryItem { name: string; type: string; time: string; }

// ── localStorage helpers ─────────────────────────────────────
const LS_CHATS_KEY = "crisentra_chats_v2";
const LS_SERP_KEY  = "crisentra_serpapi_key";

function loadChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(LS_CHATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatSession[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [{ id: "chat_1", title: "New Chat", turns: [], pinned: false, createdAt: Date.now() }];
}

function saveChats(chats: ChatSession[]) {
  try { localStorage.setItem(LS_CHATS_KEY, JSON.stringify(chats)); } catch (_) {}
}

function loadSerpKey(): string {
  try { return localStorage.getItem(LS_SERP_KEY) || ""; } catch (_) { return ""; }
}

function saveSerpKey(key: string) {
  try { localStorage.setItem(LS_SERP_KEY, key); } catch (_) {}
}

// ── SerpAPI ──────────────────────────────────────────────────
async function querySerpApi(userQuery: string, apiKey: string): Promise<string> {
  if (!apiKey) return buildFallbackResponse(userQuery);
  try {
    const q = userQuery.replace(/\s+/g, " ").trim().slice(0, 200);
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}&engine=google&num=5&hl=en&gl=in`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const parts: string[] = [];

    const reconstructed = data.reconstructed_markdown;
    if (reconstructed && typeof reconstructed === "string" && reconstructed.trim()) {
      parts.push(reconstructed.trim());
    }

    if (!parts.length) {
      const textBlocks = data.text_blocks || data.ai_overview?.text_blocks || [];
      for (const b of textBlocks) {
        const t = (b as any).text || (b as any).snippet || "";
        if (t) parts.push(String(t));
      }
    }

    if (!parts.length) {
      const ab = data.answer_box;
      if (ab?.answer) parts.push(ab.answer);
      else if (ab?.snippet) parts.push(ab.snippet);
      else if (ab?.list) parts.push((ab.list as string[]).join("\n"));
    }

    if (!parts.length && data.knowledge_graph?.description) {
      parts.push(data.knowledge_graph.description);
    }

    if (!parts.length && data.organic_results?.length) {
      const snippets = (data.organic_results as any[])
        .slice(0, 4)
        .filter((r: any) => r.snippet)
        .map((r: any) => `**${r.title}**\n${r.snippet}`);
      if (snippets.length) parts.push(snippets.join("\n\n"));
    }

    const answer = parts.join("\n\n").trim();
    return answer || buildFallbackResponse(userQuery);
  } catch (e) {
    console.error("SerpAPI error:", e);
    return buildFallbackResponse(userQuery);
  }
}

function buildFallbackResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("flood")) return `## Flood Emergency Response

**Immediate Actions:**
- Deploy water rescue teams with boats to submerged areas
- Establish evacuation routes to higher ground
- Set up temporary relief camps with food, water, and medical aid
- Coordinate with NDRF and State Disaster Response Force

**Key Facts:**
Floods are India's most frequent disaster, affecting ~40 million hectares annually. The Brahmaputra valley, Gangetic plains, and coastal regions face highest risk.

**Response Protocol:**
1. Alert district administration and NDRF command center
2. Deploy pre-positioned relief material (boats, life jackets, food packets)
3. Establish medical camps for waterborne disease prevention
4. Coordinate with telecom for emergency communication

**Helplines:** NDRF 011-24363260 · NDMA 1078`;

  if (q.includes("earthquake")) return `## Earthquake Emergency Response

**Immediate Actions:**
- Activate NDRF urban search and rescue teams
- Deploy acoustic detection and thermal imaging equipment
- Establish medical triage zones away from all structures
- Check gas lines and electrical infrastructure for secondary hazards

**Key Facts:**
India lies in one of the world's most seismically active regions. Zones IV and V cover 59% of land area.

**Response Protocol:**
1. Rapid damage assessment via aerial survey
2. Prioritize rescue of trapped survivors (survival rate drops after 72 hours)
3. Emergency communication using satellite phones

**Helplines:** NDMA 1078 · NDRF 011-24363260`;

  if (q.includes("cyclone")) return `## Cyclone Emergency Response

**Pre-landfall Actions:**
- Issue coastal evacuation orders for zones within 10–50 km
- Deploy pre-positioned relief at cyclone shelters
- Coordinate with Indian Coast Guard for maritime rescue

**Key Facts:**
Bay of Bengal cyclones account for 7% of global tropical cyclones. Odisha, Andhra Pradesh, West Bengal face highest risk.

**Helplines:** IMD Cyclone Warning 044-28121951 · NDRF 011-24363260`;

  if (q.includes("fire")) return `## Fire Emergency Response

**Immediate Actions:**
- Alert fire departments and request aerial water bombing if needed
- Evacuate 500m radius from fire perimeter
- Set up emergency medical stations for burn and smoke inhalation cases

**Response Protocol:**
1. Assess fire type (industrial/chemical/forest/urban) to determine response
2. Deploy specialized hazmat teams for chemical fires
3. Establish incident command post upwind of fire`;

  if (q.includes("landslide")) return `## Landslide Emergency Response

**Immediate Actions:**
- Immediately secure affected area and restrict access
- Deploy specialized mountain rescue teams
- Use acoustic sensors and thermal cameras to detect survivors

**Key Facts:**
Landslides affect 15% of India's land area. Western Ghats, Himalayan states, and Northeast India face highest risk.`;

  return `## Crisis Management Assessment

**Situation Analysis:**
Based on the information provided, here is the structured emergency response guidance:

**Key Actions Required:**
1. **Immediate**: Alert local emergency services and district administration
2. **Short-term**: Deploy NDRF teams and establish incident command post
3. **Medical**: Set up triage centers and coordinate with nearest hospitals
4. **Logistics**: Mobilize food, water, shelter materials through state stockpiles

**Response Coordination:**
- State Emergency Operations Center (SEOC): Activated for multi-district events
- NDRF Battalions: Specialized rescue and relief operations
- Indian Armed Forces: Available for large-scale disasters under State request

**Helplines:**
- NDMA Emergency: 1078
- NDRF: 011-24363260
- PM Relief Fund: 011-23015401`;
}

// ── Content parsers ───────────────────────────────────────────
function parseContent(text: string): Array<{ type: "text" | "code"; content: string; lang?: string }> {
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "text", content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ")) return <div key={i} className="font-orbitron text-sm font-bold mb-2 mt-3" style={{ color: "#38bdf8" }}>{line.slice(3)}</div>;
    if (line.startsWith("### ")) return <div key={i} className="font-semibold text-slate-200 mt-2 text-sm">{line.slice(4)}</div>;
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) return <div key={i} className="font-semibold text-slate-200 mt-2">{line.trim().slice(2, -2)}</div>;
    if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} className="flex gap-2 text-slate-300 text-sm my-0.5"><span className="text-slate-500 flex-shrink-0">•</span><span>{renderInline(line.slice(2))}</span></div>;
    if (/^\d+\./.test(line)) return <div key={i} className="flex gap-2 text-slate-300 text-sm my-0.5"><span className="text-slate-500 flex-shrink-0">{line.match(/^\d+/)![0]}.</span><span>{renderInline(line.replace(/^\d+\.\s*/, ""))}</span></div>;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <div key={i} className="text-slate-300 text-sm leading-relaxed">{renderInline(line)}</div>;
  });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="text-slate-200">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  sharedLibrary: LibraryItem[];
  onLibraryUpdate: (items: LibraryItem[]) => void;
}

// ── Main component ────────────────────────────────────────────
export default function AIAssistant({ sharedLibrary, onLibraryUpdate }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<"chat" | "library">("chat");

  const [chats, setChats] = useState<ChatSession[]>(() => loadChats());
  const [currentChatId, setCurrentChatId] = useState(() => loadChats()[0]?.id ?? "chat_1");

  useEffect(() => { saveChats(chats); }, [chats]);

  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; dataUrl?: string } | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState("");
  const [moreMenuTurnId, setMoreMenuTurnId] = useState<string | null>(null);
  const [shareExportOpen, setShareExportOpen] = useState(false);

  const [serpKey, setSerpKey] = useState(loadSerpKey);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  // Voice for chat input
  const [chatListening, setChatListening] = useState(false);
  const chatRecRef = useRef<any>(null);
  const chatFinalRef = useRef("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatTitleInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const currentChatObj = chats.find(c => c.id === currentChatId) || chats[0];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentChatObj?.turns, isLoading]);
  useEffect(() => { if (editingChatId) chatTitleInputRef.current?.focus(); }, [editingChatId]);
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false); setShowSubMenu(false);
      }
      setMoreMenuTurnId(null);
      setShareExportOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function commitSerpKey() {
    const k = keyDraft.trim();
    setSerpKey(k);
    saveSerpKey(k);
    setShowKeyInput(false);
    setKeyDraft("");
  }

  // ── Chat voice mic ────────────────────────────────────────
  const toggleChatVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice recognition requires Chrome."); return; }

    if (chatListening) {
      if (chatRecRef.current) { try { chatRecRef.current.abort(); } catch (_) {} chatRecRef.current = null; }
      setChatListening(false);
      return;
    }

    chatFinalRef.current = inputText;
    setChatListening(true);

    function makeRec(): any {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) chatFinalRef.current += t + " ";
          else interim += t;
        }
        setInputText(chatFinalRef.current + interim);
      };

      rec.onerror = () => { setChatListening(false); chatRecRef.current = null; };

      rec.onend = () => {
        if (chatRecRef.current) {
          try {
            const next = makeRec();
            chatRecRef.current = next;
          } catch (_) { setChatListening(false); chatRecRef.current = null; }
        }
      };

      rec.start();
      return rec;
    }

    chatRecRef.current = makeRec();
    setTimeout(() => textInputRef.current?.focus(), 100);
  }, [chatListening, inputText]);

  // ── Chat CRUD ─────────────────────────────────────────────
  function newChat() {
    const id = `chat_${Date.now()}`;
    setChats(prev => [...prev, { id, title: "New Chat", turns: [], pinned: false, createdAt: Date.now() }]);
    setCurrentChatId(id);
    setView("chat");
  }

  function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setChats(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) {
        const nid = `chat_${Date.now()}`;
        setCurrentChatId(nid);
        return [{ id: nid, title: "New Chat", turns: [], pinned: false, createdAt: Date.now() }];
      }
      if (id === currentChatId) setCurrentChatId(next[next.length - 1].id);
      return next;
    });
  }

  function togglePin(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }

  function updateCurrentChat(updater: (turns: Turn[]) => Turn[]) {
    setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, turns: updater(c.turns) } : c));
  }

  function updateTurn(turnId: string, updater: (t: Turn) => Turn) {
    updateCurrentChat(turns => turns.map(t => t.id === turnId ? updater(t) : t));
  }

  // ── Send message ──────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    const file = attachedFile;
    if (!text && !file) return;

    // Stop voice
    if (chatListening) {
      if (chatRecRef.current) { try { chatRecRef.current.abort(); } catch (_) {} chatRecRef.current = null; }
      setChatListening(false);
    }

    const userContent = [
      file ? `📄 **Attached:** \`${file.name}\`` : "",
      text,
    ].filter(Boolean).join("\n");

    const turnId = `turn_${Date.now()}`;
    const newTurn: Turn = {
      id: turnId,
      userVersions: [userContent],
      activeUserVersionIdx: 0,
      aiVersions: { 0: [] },
      activeAiVersionIdx: { 0: 0 },
      feedback: {},
      userEditing: false,
      editDraft: "",
    };

    const capturedChatId = currentChatId;
    setChats(prev => prev.map(c => {
      if (c.id !== capturedChatId) return c;
      const newTitle = c.turns.length === 0 ? (text || file?.name || "New Chat").slice(0, 32) : c.title;
      return { ...c, title: newTitle, turns: [...c.turns, newTurn] };
    }));

    if (file) {
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const ext = file.name.split(".").pop() || "file";
      if (!sharedLibrary.find(i => i.name === file.name)) {
        onLibraryUpdate([...sharedLibrary, { name: file.name, type: ext, time: ts }]);
      }
    }

    setInputText("");
    chatFinalRef.current = "";
    setAttachedFile(null);
    setIsLoading(true);
    textInputRef.current?.focus();

    const serpQuery = `disaster emergency crisis response India: ${text.slice(0, 180)}`.slice(0, 220);
    const aiReply = await querySerpApi(serpQuery, serpKey);

    let fullReply = aiReply;
    if (file && text) fullReply = `**Regarding \`${file.name}\`:**\n\n${aiReply}`;
    else if (file && !text) fullReply = `I've received \`${file.name}\`. Here's relevant information:\n\n${aiReply}`;

    setChats(prev => prev.map(c => {
      if (c.id !== capturedChatId) return c;
      return {
        ...c,
        turns: c.turns.map(t => {
          if (t.id !== turnId) return t;
          return { ...t, aiVersions: { ...t.aiVersions, 0: [fullReply] } };
        }),
      };
    }));
    setIsLoading(false);
  }, [inputText, attachedFile, currentChatId, sharedLibrary, onLibraryUpdate, serpKey, chatListening]);

  async function commitEdit(turnId: string) {
    const turn = currentChatObj.turns.find(t => t.id === turnId);
    if (!turn) return;
    const newText = turn.editDraft.trim();
    if (!newText) return;
    const newUserIdx = turn.userVersions.length;
    updateTurn(turnId, t => ({
      ...t,
      userVersions: [...t.userVersions, newText],
      activeUserVersionIdx: newUserIdx,
      aiVersions: { ...t.aiVersions, [newUserIdx]: [] },
      activeAiVersionIdx: { ...t.activeAiVersionIdx, [newUserIdx]: 0 },
      userEditing: false,
    }));
    setIsLoading(true);
    const aiReply = await querySerpApi(`disaster crisis: ${newText.slice(0, 180)}`, serpKey);
    setChats(prev => prev.map(c => {
      if (c.id !== currentChatId) return c;
      return { ...c, turns: c.turns.map(t => {
        if (t.id !== turnId) return t;
        const uIdx = t.userVersions.length - 1;
        return { ...t, aiVersions: { ...t.aiVersions, [uIdx]: [aiReply] } };
      })};
    }));
    setIsLoading(false);
  }

  async function redoResponse(turnId: string) {
    const turn = currentChatObj.turns.find(t => t.id === turnId);
    if (!turn) return;
    const uIdx = turn.activeUserVersionIdx;
    const userText = turn.userVersions[uIdx];
    setIsLoading(true);
    const aiReply = await querySerpApi(`disaster crisis management: ${userText.slice(0, 180)}`, serpKey);
    setChats(prev => prev.map(c => {
      if (c.id !== currentChatId) return c;
      return { ...c, turns: c.turns.map(t => {
        if (t.id !== turnId) return t;
        const versions = [...(t.aiVersions[uIdx] || []), aiReply];
        return { ...t, aiVersions: { ...t.aiVersions, [uIdx]: versions }, activeAiVersionIdx: { ...t.activeAiVersionIdx, [uIdx]: versions.length - 1 } };
      })};
    }));
    setIsLoading(false);
  }

  function branchChat(turnId: string) {
    const idx = currentChatObj.turns.findIndex(t => t.id === turnId);
    const turnsToKeep = currentChatObj.turns.slice(0, idx + 1);
    const nid = `chat_${Date.now()}`;
    setChats(prev => [...prev, {
      id: nid,
      title: `Branch: ${currentChatObj.title}`,
      turns: turnsToKeep.map(t => ({ ...t, id: `${t.id}_br` })),
      pinned: false,
      createdAt: Date.now(),
    }]);
    setCurrentChatId(nid);
    setMoreMenuTurnId(null);
  }

  function listenToTurn(text: string) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").replace(/##/g, ""));
      utt.lang = "en-IN";
      window.speechSynthesis.speak(utt);
    }
    setMoreMenuTurnId(null);
  }

  function exportChat() {
    const content = currentChatObj.turns.map(t => {
      const uIdx = t.activeUserVersionIdx;
      const uText = t.userVersions[uIdx] || "";
      const aVersions = t.aiVersions[uIdx] || [];
      const aIdx = t.activeAiVersionIdx[uIdx] || 0;
      const aText = aVersions[aIdx] || "";
      return `User:\n${uText}\n\nAI Assistant:\n${aText}\n\n${"─".repeat(60)}\n`;
    }).join("\n");
    const blob = new Blob([`CRISENTRA AI — Chat Export\n${currentChatObj.title}\n${"═".repeat(60)}\n\n${content}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${currentChatObj.title}.txt`; a.click();
    URL.revokeObjectURL(url);
    setShareExportOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isText = /\.(txt|csv|py|js|ts|jsx|tsx|json|md|html|css|sql|xml|yaml|yml|log)$/i.test(file.name);
    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(file.name);
    if (isText) {
      const reader = new FileReader();
      reader.onload = ev => { setAttachedFile({ name: file.name, content: String(ev.target?.result || "") }); setTimeout(() => textInputRef.current?.focus(), 10); };
      reader.readAsText(file);
    } else if (isImage) {
      const reader = new FileReader();
      reader.onload = ev => { setAttachedFile({ name: file.name, content: "", dataUrl: String(ev.target?.result) }); setTimeout(() => textInputRef.current?.focus(), 10); };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile({ name: file.name, content: "" });
      setTimeout(() => textInputRef.current?.focus(), 10);
    }
    e.target.value = "";
    setShowPlusMenu(false);
    setShowSubMenu(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function copyText(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

  function downloadCode(code: string, lang: string) {
    const ext: Record<string, string> = { python: "py", javascript: "js", typescript: "ts", bash: "sh", sql: "sql", json: "json", html: "html", css: "css" };
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `code.${ext[lang] || "txt"}`; a.click();
    URL.revokeObjectURL(url);
  }

  const sortedChats = [...chats].sort((a, b) => {
    if (b.pinned !== a.pinned) return b.pinned ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── SIDEBAR ── */}
      <div className="flex-shrink-0 flex flex-col transition-all duration-300"
        style={{ width: sidebarOpen ? "240px" : "52px", background: "rgba(8,15,28,0.75)", borderRight: "1px solid rgba(56,189,248,0.15)", backdropFilter: "blur(12px)", overflow: "hidden" }}>

        {sidebarOpen ? (
          <>
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(56,189,248,0.12)" }}>
              <span className="font-orbitron text-sm font-bold tracking-wider" style={{ color: "#38bdf8" }}>AI ASSISTANT</span>
              <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-sm">◧</button>
            </div>

            <div className="px-3 pt-3 flex-shrink-0">
              <button onClick={newChat} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", color: "#38bdf8" }}>
                <span className="text-lg font-light leading-none">+</span>
                <span className="font-rajdhani font-semibold tracking-wide">New Chat</span>
              </button>
            </div>

            <div className="px-3 pt-2 flex-shrink-0">
              <button onClick={() => setView("library")}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${view === "library" ? "text-slate-200" : "text-slate-400 hover:text-slate-200"}`}
                style={view === "library" ? { background: "rgba(255,255,255,0.08)" } : {}}>
                <span>📚</span>
                <span className="font-rajdhani font-semibold tracking-wide">Library</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2">
              <div className="px-2 pb-2 font-rajdhani text-xs font-bold tracking-widest text-slate-600">RECENTS</div>
              {sortedChats.map(chat => {
                const isActive = chat.id === currentChatId && view === "chat";
                const isEditing = editingChatId === chat.id;
                return (
                  <div key={chat.id}
                    className="group flex items-center gap-1 px-2 py-1.5 rounded-xl mb-0.5 cursor-pointer transition-all"
                    style={isActive ? { background: "rgba(255,255,255,0.07)" } : {}}
                    onClick={() => { setCurrentChatId(chat.id); setView("chat"); }}>
                    {chat.pinned && <span className="text-xs flex-shrink-0" style={{ color: "#fbbf24" }}>📌</span>}
                    {isEditing ? (
                      <input ref={chatTitleInputRef} value={editChatTitle}
                        onChange={e => setEditChatTitle(e.target.value)}
                        onBlur={() => { setChats(prev => prev.map(c => c.id === chat.id ? { ...c, title: editChatTitle.trim() || c.title } : c)); setEditingChatId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { setChats(prev => prev.map(c => c.id === chat.id ? { ...c, title: editChatTitle.trim() || c.title } : c)); setEditingChatId(null); } e.stopPropagation(); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent outline-none border-b text-xs min-w-0"
                        style={{ color: "#e2e8f0", borderColor: "rgba(56,189,248,0.5)" }} />
                    ) : (
                      <span className="flex-1 text-xs truncate" style={{ color: isActive ? "#e2e8f0" : "#94a3b8" }}>
                        {chat.turns.length > 0 ? "💬" : "○"} {chat.title}
                      </span>
                    )}
                    {!isEditing && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button title="Rename" onClick={e => { e.stopPropagation(); setEditingChatId(chat.id); setEditChatTitle(chat.title); }}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 text-xs">✏</button>
                        <button title={chat.pinned ? "Unpin" : "Pin"} onClick={e => togglePin(chat.id, e)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-yellow-400 text-xs">📌</button>
                        <button title="Delete" onClick={e => deleteChat(chat.id, e)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-red-400 text-xs">✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SerpAPI key */}
            <div className="px-4 pb-3 pt-2 flex-shrink-0 space-y-2" style={{ borderTop: "1px solid rgba(56,189,248,0.1)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: serpKey ? "#34d399" : "#f87171", boxShadow: serpKey ? "0 0 5px #34d399" : "0 0 5px #f87171" }} />
                  <span className="font-rajdhani text-xs text-slate-600">{serpKey ? "SerpAPI Connected" : "No API Key"}</span>
                </div>
                <button onClick={() => { setShowKeyInput(p => !p); setKeyDraft(serpKey); }}
                  className="text-xs text-slate-500 hover:text-slate-200 underline">
                  {serpKey ? "Change" : "Add Key"}
                </button>
              </div>
              {showKeyInput && (
                <div className="space-y-1.5">
                  <input
                    type="password"
                    value={keyDraft}
                    onChange={e => setKeyDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") commitSerpKey(); }}
                    placeholder="Paste SerpAPI key…"
                    className="w-full glass-input px-2 py-1.5 text-xs"
                    autoFocus />
                  <div className="flex gap-1">
                    <button onClick={commitSerpKey} className="neon-btn flex-1 py-1 text-xs">Save</button>
                    <button onClick={() => setShowKeyInput(false)} className="flex-1 py-1 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-4 px-2">
            <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">◧</button>
            <button onClick={newChat} className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-light transition-all"
              style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)" }} title="New Chat">+</button>
            <button onClick={() => { setSidebarOpen(true); setView("library"); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all" title="Library">📚</button>
          </div>
        )}
      </div>

      {/* ── MAIN PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {view === "library" ? (
          <LibraryView items={sharedLibrary} />
        ) : (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
              <div className="font-rajdhani text-sm font-semibold text-slate-400 truncate">{currentChatObj?.title}</div>
              <div className="relative flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setShareExportOpen(p => !p)} className="neon-btn px-3 py-1.5 text-xs flex items-center gap-1.5">
                  ↑ Share / Export
                </button>
                {shareExportOpen && (
                  <div className="absolute top-9 right-0 rounded-xl py-1 z-50"
                    style={{ background: "#262626", border: "1px solid #383838", width: "180px", boxShadow: "0 8px 24px rgba(0,0,0,0.85)" }}>
                    <DropItem label="📥 Export as .txt" onClick={exportChat} />
                    <DropItem label="📋 Copy all text" onClick={() => {
                      copyText(currentChatObj.turns.map(t => `User: ${t.userVersions[t.activeUserVersionIdx]}\nAI: ${(t.aiVersions[t.activeUserVersionIdx] || [])[t.activeAiVersionIdx[t.activeUserVersionIdx] || 0] || ""}`).join("\n\n"));
                      setShareExportOpen(false);
                    }} />
                  </div>
                )}
              </div>
            </div>

            {/* Chat scroll area */}
            <div className="flex-1 overflow-y-auto chat-scroll px-6 pt-5 pb-2">
              {(!currentChatObj || currentChatObj.turns.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="font-orbitron text-2xl font-medium mb-2" style={{ color: "#e2e8f0" }}>Where should we begin?</div>
                  <div className="text-sm text-slate-500 max-w-xs">Ask anything about crisis management, disaster response, or upload a file for analysis.</div>
                  {!serpKey && (
                    <div className="mt-4 px-4 py-2 rounded-xl text-xs" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                      ⚠ No SerpAPI key — add one in the sidebar for live AI responses
                    </div>
                  )}
                </div>
              )}

              {currentChatObj?.turns.map(turn => {
                const uIdx = turn.activeUserVersionIdx;
                const userText = turn.userVersions[uIdx] || "";
                const aiVersionArr = turn.aiVersions[uIdx] || [];
                const aIdx = turn.activeAiVersionIdx[uIdx] ?? 0;
                const aiText = aiVersionArr[aIdx] || "";
                const feedbackKey = `${uIdx}_${aIdx}`;
                const currentFeedback = turn.feedback[feedbackKey] ?? null;
                const isLastTurn = turn.id === currentChatObj.turns[currentChatObj.turns.length - 1]?.id;

                return (
                  <div key={turn.id} className="mb-6">
                    {/* USER BUBBLE */}
                    <div className="flex justify-end mb-4">
                      <div className="relative max-w-[78%] group">
                        {turn.userVersions.length > 1 && (
                          <div className="flex items-center justify-end gap-2 mb-1 text-xs text-slate-500">
                            <button onClick={() => updateTurn(turn.id, t => ({ ...t, activeUserVersionIdx: Math.max(0, uIdx - 1) }))} className="hover:text-slate-300 disabled:opacity-30" disabled={uIdx === 0}>‹</button>
                            <span>{uIdx + 1} / {turn.userVersions.length}</span>
                            <button onClick={() => updateTurn(turn.id, t => ({ ...t, activeUserVersionIdx: Math.min(t.userVersions.length - 1, uIdx + 1) }))} className="hover:text-slate-300 disabled:opacity-30" disabled={uIdx === turn.userVersions.length - 1}>›</button>
                          </div>
                        )}
                        {turn.userEditing ? (
                          <div className="space-y-2">
                            <textarea value={turn.editDraft}
                              onChange={e => updateTurn(turn.id, t => ({ ...t, editDraft: e.target.value }))}
                              className="glass-input w-full p-3 text-sm resize-none rounded-2xl"
                              rows={3} autoFocus />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => updateTurn(turn.id, t => ({ ...t, userEditing: false }))} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg transition-all" style={{ background: "rgba(255,255,255,0.04)" }}>Cancel</button>
                              <button onClick={() => commitEdit(turn.id)} className="neon-btn text-xs px-4 py-1.5">Send Edit</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap"
                              style={{ background: "rgba(33,38,45,0.9)", border: "1px solid rgba(56,189,248,0.15)", color: "#f8f8f2" }}>
                              {userText}
                            </div>
                            <div className="flex gap-1 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ActionBtn title="Edit" onClick={() => updateTurn(turn.id, t => ({ ...t, userEditing: true, editDraft: t.userVersions[t.activeUserVersionIdx] }))}>✏</ActionBtn>
                              <ActionBtn title="Copy" onClick={() => copyText(userText)}>📋</ActionBtn>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* AI RESPONSE */}
                    {(aiText || (isLoading && isLastTurn)) && (
                      <div className="flex gap-3 group">
                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{ background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8" }}>
                          AI
                        </div>
                        <div className="flex-1 min-w-0">
                          {aiVersionArr.length > 1 && (
                            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                              <button onClick={() => updateTurn(turn.id, t => ({ ...t, activeAiVersionIdx: { ...t.activeAiVersionIdx, [uIdx]: Math.max(0, (t.activeAiVersionIdx[uIdx] || 0) - 1) } }))} className="hover:text-slate-300 disabled:opacity-30" disabled={aIdx === 0}>‹</button>
                              <span>Response {aIdx + 1} / {aiVersionArr.length}</span>
                              <button onClick={() => updateTurn(turn.id, t => ({ ...t, activeAiVersionIdx: { ...t.activeAiVersionIdx, [uIdx]: Math.min((t.aiVersions[uIdx] || []).length - 1, (t.activeAiVersionIdx[uIdx] || 0) + 1) } }))} className="hover:text-slate-300 disabled:opacity-30" disabled={aIdx === aiVersionArr.length - 1}>›</button>
                            </div>
                          )}

                          {isLoading && isLastTurn && !aiText ? (
                            <div className="flex gap-1 items-center pt-2">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                                  style={{ background: "#38bdf8", animationDelay: `${i * 0.15}s` }} />
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2">
                                {parseContent(aiText).map((part, pi) =>
                                  part.type === "code" ? (
                                    <CodeBlock key={pi} code={part.content} lang={part.lang || "text"}
                                      onCopy={() => copyText(part.content)}
                                      onDownload={() => downloadCode(part.content, part.lang || "text")} />
                                  ) : (
                                    <div key={pi}>{renderMarkdown(part.content)}</div>
                                  )
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <button onClick={() => updateTurn(turn.id, t => ({ ...t, feedback: { ...t.feedback, [feedbackKey]: t.feedback[feedbackKey] === "good" ? null : "good" } }))}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all"
                                  style={{ background: currentFeedback === "good" ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.04)", color: currentFeedback === "good" ? "#34d399" : "#64748b", border: `1px solid ${currentFeedback === "good" ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.06)"}` }}
                                  title="Good response">👍</button>
                                <button onClick={() => updateTurn(turn.id, t => ({ ...t, feedback: { ...t.feedback, [feedbackKey]: t.feedback[feedbackKey] === "bad" ? null : "bad" } }))}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all"
                                  style={{ background: currentFeedback === "bad" ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.04)", color: currentFeedback === "bad" ? "#f87171" : "#64748b", border: `1px solid ${currentFeedback === "bad" ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.06)"}` }}
                                  title="Bad response">👎</button>
                                <button onClick={() => redoResponse(turn.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sm text-slate-500 hover:text-slate-200 transition-all"
                                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                                  title="Regenerate">🔄</button>
                                <button onClick={() => copyText(aiText)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sm text-slate-500 hover:text-slate-200 transition-all"
                                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                                  title="Copy">📋</button>
                                <div className="relative">
                                  <button onClick={e => { e.stopPropagation(); setMoreMenuTurnId(moreMenuTurnId === turn.id ? null : turn.id); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-sm text-slate-500 hover:text-slate-200 transition-all"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>⋯</button>
                                  {moreMenuTurnId === turn.id && (
                                    <div className="absolute bottom-9 left-0 rounded-xl py-1 z-50"
                                      style={{ background: "#262626", border: "1px solid #383838", width: "210px", boxShadow: "0 8px 24px rgba(0,0,0,0.85)" }}
                                      onClick={e => e.stopPropagation()}>
                                      <DropItem label="🌿 Branch in new chat" onClick={() => branchChat(turn.id)} />
                                      <DropItem label="🔊 Listen" onClick={() => listenToTurn(aiText)} />
                                      <DropItem label="📄 Export response" onClick={() => { const b = new Blob([aiText], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "response.txt"; a.click(); URL.revokeObjectURL(u); setMoreMenuTurnId(null); }} />
                                      <DropItem label="✉ Draft in Gmail" onClick={() => { window.open(`mailto:?subject=Crisis Report&body=${encodeURIComponent(aiText.slice(0, 1000))}`); setMoreMenuTurnId(null); }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* ── FIXED CAPSULE INPUT ── */}
            <div className="px-6 pb-5 pt-3 flex-shrink-0"
              style={{ background: "linear-gradient(to top, rgba(5,11,20,0.97) 70%, transparent)" }}>

              {attachedFile && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                    style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8" }}>
                    {attachedFile.dataUrl
                      ? <img src={attachedFile.dataUrl} alt="preview" className="w-6 h-6 rounded object-cover" />
                      : <span>📄</span>}
                    <span className="max-w-[180px] truncate">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="ml-1 text-slate-400 hover:text-slate-200 font-bold">✕</button>
                  </div>
                </div>
              )}

              <div className="relative flex items-center gap-2 px-3 py-2 rounded-3xl"
                style={{ background: "#212121", border: "1px solid #383838" }}>

                {/* + LEFT button */}
                <div className="relative flex-shrink-0" ref={plusMenuRef}>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setShowPlusMenu(p => !p); setShowSubMenu(false); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xl font-light transition-colors"
                    style={{ color: showPlusMenu ? "#fff" : "#9b9b9b" }}>
                    +
                  </button>

                  {showPlusMenu && (
                    <div className="absolute bottom-12 left-0 rounded-2xl py-1.5 z-50"
                      style={{ background: "#262626", border: "1px solid #383838", width: "220px", boxShadow: "0 8px 24px rgba(0,0,0,0.85)" }}>
                      <PlusMenuItem icon="📎" label="Add photos & files"
                        onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} />
                      <div className="relative"
                        onMouseEnter={() => setShowSubMenu(true)}
                        onMouseLeave={() => setShowSubMenu(false)}>
                        <PlusMenuItem icon="📄" label="Recent files" arrow onClick={() => setShowSubMenu(p => !p)} />
                        {showSubMenu && (
                          <div className="absolute rounded-2xl p-2 z-50"
                            style={{ background: "#262626", border: "1px solid #383838", width: "230px", bottom: 0, left: "226px", boxShadow: "0 8px 24px rgba(0,0,0,0.85)" }}>
                            <div className="text-xs font-semibold text-slate-500 px-2 pb-2 mb-1" style={{ borderBottom: "1px solid #383838" }}>
                              📚 Select from library
                            </div>
                            <div className="max-h-40 overflow-y-auto">
                              {sharedLibrary.length === 0 ? (
                                <div className="text-xs text-center text-slate-600 py-4">No recent files</div>
                              ) : (
                                sharedLibrary.slice().reverse().map((item, i) => (
                                  <button key={i}
                                    onClick={() => { setAttachedFile({ name: item.name, content: "File selected from library." }); setShowPlusMenu(false); setShowSubMenu(false); textInputRef.current?.focus(); }}
                                    className="w-full text-left text-xs px-2 py-2 rounded-lg truncate transition-colors"
                                    style={{ color: "#ececec" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#333")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    📄 {item.name}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Text input */}
                <input ref={textInputRef} type="text" value={inputText}
                  onChange={e => { setInputText(e.target.value); chatFinalRef.current = e.target.value; }}
                  onKeyDown={handleKeyDown}
                  placeholder={chatListening ? "🔴 Listening… speak now" : "Ask anything or request changes…"}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{ color: "#ececec", fontFamily: "Outfit,sans-serif" }} />

                {/* Voice mic button */}
                <button
                  type="button"
                  onClick={toggleChatVoice}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all"
                  title={chatListening ? "Stop voice" : "Voice input"}
                  style={{
                    background: chatListening ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.06)",
                    border: chatListening ? "1px solid rgba(248,113,113,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    color: chatListening ? "#f87171" : "#9b9b9b",
                    boxShadow: chatListening ? "0 0 8px rgba(248,113,113,0.4)" : "none",
                  }}>
                  {chatListening ? "⏹" : "🎤"}
                </button>

                {/* Send */}
                <button type="button" onClick={sendMessage} disabled={isLoading}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all disabled:opacity-50"
                  style={{ background: "#3b82f6", color: "#fff" }}>
                  ➔
                </button>

                <input ref={fileInputRef} type="file" className="hidden" tabIndex={-1} onChange={handleFileChange} />
              </div>

              {chatListening && (
                <div className="flex items-center gap-2 mt-1.5 px-2">
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="w-0.5 rounded-full animate-bounce"
                        style={{ height: `${8 + (i % 3) * 4}px`, background: "#f87171", animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "#f87171" }}>Listening — speak now · tap ⏹ to stop</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function ActionBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      className="w-6 h-6 flex items-center justify-center rounded-lg text-xs text-slate-500 hover:text-slate-200 transition-all"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {children}
    </button>
  );
}

function PlusMenuItem({ icon, label, arrow, onClick }: { icon: string; label: string; arrow?: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left rounded-xl transition-all"
      style={{ color: "#ececec", background: hovered ? "#333" : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div className="flex items-center gap-3"><span>{icon}</span><span>{label}</span></div>
      {arrow && <span className="text-xs text-slate-500">›</span>}
    </button>
  );
}

function DropItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      className="w-full text-left text-xs px-3 py-2 transition-colors"
      style={{ color: "#ececec", background: hovered ? "#333" : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {label}
    </button>
  );
}

function CodeBlock({ code, lang, onCopy, onDownload }: { code: string; lang: string; onCopy: () => void; onDownload: () => void }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#1a1f2e", border: "1px solid rgba(56,189,248,0.2)" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#151b2d", borderBottom: "1px solid rgba(56,189,248,0.15)" }}>
        <span className="font-rajdhani text-xs font-bold tracking-widest text-slate-500">{lang.toUpperCase()}</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors">
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
          <button onClick={onDownload} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors">
            ⬇ Download
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs overflow-x-auto" style={{ fontFamily: "JetBrains Mono,monospace", color: "#e2e8f0", lineHeight: 1.6 }}>
        {code}
      </pre>
    </div>
  );
}

function LibraryView({ items }: { items: LibraryItem[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4">
      <div className="mb-5">
        <h2 className="font-orbitron text-xl font-bold tracking-wider mb-1" style={{ color: "#e2e8f0" }}>📚 Library</h2>
        <div className="text-xs text-slate-500">Files shared in AI Assistant conversations</div>
      </div>
      {items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="font-rajdhani font-semibold text-slate-400">Library is empty</div>
          <div className="text-xs text-slate-600 mt-1">Upload files in chat to see them here.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice().reverse().map((item, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}>
                {item.type === "pdf" ? "📕" : item.type === "csv" ? "📊" : ["png","jpg","jpeg","gif","webp"].includes(item.type) ? "🖼️" : "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-200 truncate">{item.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Type: {item.type.toUpperCase()} · Added: {item.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
