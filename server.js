import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { InferenceClient } from "@huggingface/inference";

const execFileAsync = promisify(execFile);

/* ============================================================
   CRISENTRA AI - ENVIRONMENT & CONFIG
   ============================================================ */

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = loadEnv();
const SERPAPI_API_KEY = env.SERPAPI_API_KEY || env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY;
const HF_TOKEN = env.HF_TOKEN || process.env.HF_TOKEN;
const hf = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

const PORT = Number(
  env.API_PORT || env.PORT || process.env.API_PORT || process.env.PORT || 3001
);

const PROJECT_ROOT = (() => {
  const currentDirectory = process.cwd();
  const parentDirectory = path.resolve(currentDirectory, "..");
  if (fs.existsSync(path.join(currentDirectory, "roberta.py"))) return currentDirectory;
  if (fs.existsSync(path.join(parentDirectory, "roberta.py"))) return parentDirectory;
  return parentDirectory;
})();

const PYTHON_COMMAND = (() => {
  const venvCandidates = [
    path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe"),
    path.join(PROJECT_ROOT, "venv", "Scripts", "python.exe"),
    path.join(PROJECT_ROOT, ".venv", "bin", "python"),
    path.join(PROJECT_ROOT, "venv", "bin", "python"),
  ];
  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return process.platform === "win32" ? "python" : "python3";
})();

const TRANSLATION_SCRIPT = path.resolve(PROJECT_ROOT, "translation.py");
const FILE_EXTRACTOR_SCRIPT = path.resolve(PROJECT_ROOT, "file_extractor.py");
const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

/* ============================================================
   PYTHON ANALYSIS ENGINE
   ============================================================ */

async function analyzeWithPythonEngine(
  message,
  hasPhotos = false,
  hasVideos = false,
  evidenceStatus = null,
  evidenceValid = null
) {
  const pythonCode = [
    "import json",
    "import sys",
    "from main_analysis_engine import analyze_message",
    "has_photos = sys.argv[2].lower() == 'true'",
    "has_videos = sys.argv[3].lower() == 'true'",
    "ev_status = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'null' else None",
    "ev_valid_raw = sys.argv[5] if len(sys.argv) > 5 else 'null'",
    "ev_valid = True if ev_valid_raw.lower() == 'true' else (False if ev_valid_raw.lower() == 'false' else None)",
    "result = analyze_message(sys.argv[1], has_photos=has_photos, has_videos=has_videos, evidence_status=ev_status, evidence_valid=ev_valid)",
    "print(json.dumps(result, ensure_ascii=False, default=str))",
  ].join("\n");

  const { stdout, stderr } = await execFileAsync(
    PYTHON_COMMAND,
    [
      "-c",
      pythonCode,
      message,
      String(hasPhotos),
      String(hasVideos),
      String(evidenceStatus ?? "null"),
      String(evidenceValid ?? "null"),
    ],
    {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    }
  );

  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);

  if (!lines.length) {
    throw new Error(stderr || "Python engine returned no result.");
  }

  let result;
  try {
    result = JSON.parse(lines[lines.length - 1]);
  } catch {
    throw new Error("Could not parse Python analysis result. Check main_analysis_engine.py.");
  }

  return result;
}

function inspectMagicBytesBuffer(buf) {
  if (!buf || buf.length < 8) return { valid: false, format: "unknown" };
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { valid: true, format: "jpeg", media: "image" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { valid: true, format: "png", media: "image" };
  }
  // WEBP: RIFF ... WEBP
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") {
    return { valid: true, format: "webp", media: "image" };
  }
  // GIF: GIF87a / GIF89a
  if (buf.slice(0, 6).toString("ascii") === "GIF87a" || buf.slice(0, 6).toString("ascii") === "GIF89a") {
    return { valid: true, format: "gif", media: "image" };
  }
  // MP4 / MOV: ftyp at index 4
  if (buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp") {
    return { valid: true, format: "mp4", media: "video" };
  }
  // WEBM: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { valid: true, format: "webm", media: "video" };
  }
  // AVI: RIFF ... AVI
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "AVI ") {
    return { valid: true, format: "avi", media: "video" };
  }
  return { valid: false, format: "unsupported" };
}

async function validateEvidenceWithPython(destPath, originalName, message = "", disaster = "", location = "") {
  const pythonCode = [
    "import json",
    "import sys",
    "from evidence_validator import validate_evidence_file",
    "file_path = sys.argv[1]",
    "original_name = sys.argv[2]",
    "msg = sys.argv[3] if len(sys.argv) > 3 else ''",
    "disaster = sys.argv[4] if len(sys.argv) > 4 else ''",
    "loc = sys.argv[5] if len(sys.argv) > 5 else ''",
    "try:",
    "    with open(file_path, 'rb') as f:",
    "        data = f.read()",
    "    res = validate_evidence_file(data, original_name, message=msg, disaster_type=disaster, location=loc)",
    "except Exception as e:",
    "    res = {'valid': False, 'status': 'requires_verification', 'reason': 'Evidence requires manual verification', 'detail': str(e), 'requires_manual_verification': True}",
    "print(json.dumps(res, ensure_ascii=False, default=str))",
  ].join("\n");

  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON_COMMAND,
      ["-c", pythonCode, destPath, originalName, message || "", disaster || "", location || ""],
      {
        cwd: PROJECT_ROOT,
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 5 * 1024 * 1024,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      }
    );

    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) {
      return {
        valid: false,
        status: "requires_verification",
        reason: "Evidence requires manual verification",
        requires_manual_verification: true,
      };
    }
    return JSON.parse(lines[lines.length - 1]);
  } catch (err) {
    console.warn("Evidence validation error:", err);
    return {
      valid: false,
      status: "requires_verification",
      reason: "Evidence requires manual verification",
      requires_manual_verification: true,
      error: String(err),
    };
  }
}

/* ============================================================
   TRANSLATION VIA PYTHON
   ============================================================ */

async function translateWithPython(text) {
  if (!text || !text.trim()) {
    return {
      original_text: text,
      translated_text: text,
      language: "Unknown",
    };
  }

  try {
    const { stdout } = await execFileAsync(
      PYTHON_COMMAND,
      [TRANSLATION_SCRIPT, "--translate", text],
      {
        cwd: PROJECT_ROOT,
        windowsHide: true,
        timeout: 30000,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      }
    );

    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const parsed = JSON.parse(lines[lines.length - 1]);
    return {
      original_text: parsed.original_text || text,
      translated_text: parsed.translated_text || text,
      language: parsed.language || "Unknown",
    };
  } catch (err) {
    console.error("Python translation failed:", err);
    return {
      original_text: text,
      translated_text: text,
      language: "Unknown",
    };
  }
}

/* ============================================================
   CRISIS REPORT STORAGE
   ============================================================ */

const REPORTS_FILE = path.resolve(process.cwd(), "crisentra_reports.json");

const WORD_MAP = {
  zero: 0, no: 0, none: 0, nil: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90, hundred: 100
};

function parseNumWord(str) {
  if (!str) return null;
  const clean = String(str).toLowerCase().trim().replace(/,/g, "");
  if (/^\d+$/.test(clean)) {
    const v = parseInt(clean, 10);
    return v < 100000 ? v : null;
  }
  if (WORD_MAP[clean] !== undefined) return WORD_MAP[clean];
  const parts = clean.split(/[\s-]+/);
  if (parts.length === 2 && WORD_MAP[parts[0]] !== undefined && WORD_MAP[parts[1]] !== undefined) {
    return WORD_MAP[parts[0]] + WORD_MAP[parts[1]];
  }
  return null;
}

const numPattern = "(\\b\\d[\\d,]*\\b|zero|no|none|nil|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";

function extractDeathsFromMessage(msg) {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();

  // Explicit zero
  if (/\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:deaths?|fatalities|casualties|loss\s+of\s+life|fatal\s+casualties)\b|\b(?:no\s+one|nobody)\s+(?:has\s+|was\s+|were\s+)?(?:died|killed|dead|perished)\b|\b(?:without\s+any|no)\s+(?:loss\s+of\s+life|lives\s+lost|fatalities|deaths?|casualties)\b/i.test(m)) {
    return 0;
  }

  const patterns = [
    new RegExp('\\b(?:deaths?|fatalities|casualties|dead|killed|loss\\s+of\\s+life)\\s*[:=-]\\s*' + numPattern + '\\b', 'i'),
    new RegExp('\\b(?:death\\s+toll|fatalities|toll|loss\\s+of\\s+life|number\\s+of\\s+deaths?)\\s*(?:of|is|was|has\\s+reached|reached|stands\\s+at|at|has\\s+risen\\s+to|rose\\s+to|climbed\\s+to|hit)?\\s*[:=-]?\\s*' + numPattern + '\\b', 'i'),
    new RegExp('\\b(?:killed|killing)\\s+(?:at\\s+least\\s+|up\\s+to\\s+|around\\s+|approx(?:\\.|\\s+)?\\s*)?' + numPattern + '\\s*(?:people|persons|individuals|citizens|residents|victims)?\\b', 'i'),
    new RegExp('\\b(?:left|leaving)\\s+(?:at\\s+least\\s+|up\\s+to\\s+|around\\s+|approx(?:\\.|\\s+)?\\s*)?' + numPattern + '\\s*(?:people\\s+)?(?:dead|deceased|fatalities)?\\b', 'i'),
    new RegExp('\\b(?:claimed|took)\\s+(?:the\\s+lives\\s+of\\s+)?' + numPattern + '\\s*(?:lives|people|individuals|persons|victims)?\\b', 'i'),
    new RegExp('\\b(?:deaths?|loss)\\s+of\\s+' + numPattern + '\\s+(?:people|persons|individuals|residents|victims|lives)\\b', 'i'),
    new RegExp('\\b' + numPattern + '\\s+(?:[a-z]+\\s+){0,3}(?:lost\\s+(?:their\\s+|a\\s+)?(?:lives|life))\\b', 'i'),
    new RegExp('\\b' + numPattern + '\\s+(?:[a-z]+\\s+){0,3}(?:succumbed\\s+to\\s+injuries)\\b', 'i'),
    new RegExp('\\b' + numPattern + '\\s+(?:[a-z]+\\s+){0,3}(?:bodies\\s+(?:found|recovered)|dead\\s+bodies|corpses)\\b', 'i'),
    new RegExp('\\b' + numPattern + '\\s+(?:[a-z]+\\s+){0,3}(?:died|dead|death|deaths|fatalities|killed|perished|deceased|casualties|casualty)\\b', 'i'),
  ];

  for (const pat of patterns) {
    const match = m.match(pat);
    if (match) {
      const val = parseNumWord(match[1]);
      if (val !== null) return val;
    }
  }
  return null;
}

function parseCountValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const s = String(val).trim();
  if (!s || /^(none reported|not reported|not detected|null|undefined|none|unknown|n\/a)$/i.test(s)) return null;
  if (/^(0|zero|no deaths|no injuries|no one trapped|zero deaths|no casualties)$/i.test(s)) return 0;
  const m = s.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  const wordVal = parseNumWord(s);
  if (wordVal !== null) return wordVal;
  return null;
}

function extractInjuriesFromMessage(msg) {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();
  if (/\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:injuries|injured|wounded|hurt)\b|\bno\s+one\s+(?:was\s+|were\s+)?(?:injured|hurt|wounded)\b|\bwithout\s+any\s+injuries\b/i.test(m)) {
    return 0;
  }
  const patterns = [
    new RegExp('\\b(?:injured|injuries|wounded|hurt)\\s*[:=-]\\s*' + numPattern + '\\b', 'i'),
    new RegExp('\\b' + numPattern + '\\s+(?:[a-z]+\\s+){0,3}(?:injured|injuries|wounded|hurt)\\b', 'i'),
    new RegExp('\\b(?:left|leaving|reported)\\s+(?:at\\s+least\\s+|up\\s+to\\s+|around\\s+|approx(?:\\.|\\s+)?\\s*)?' + numPattern + '\\s*(?:people\\s+)?(?:injured|wounded|hurt)\\b', 'i'),
  ];
  for (const pat of patterns) {
    const match = m.match(pat);
    if (match) {
      const val = parseNumWord(match[1]);
      if (val !== null) return val;
    }
  }
  return null;
}

function extractTrappedFromMessage(msg) {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();
  if (/\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:trapped|stranded|stuck|marooned)\b|\bno\s+one\s+(?:was\s+|were\s+)?(?:trapped|stranded|stuck)\b/i.test(m)) {
    return 0;
  }
  const patterns = [
    new RegExp('\\b(?:trapped|stranded|stuck|marooned)\\s*[:=-]\\s*' + numPattern + '\\b', 'i'),
    new RegExp('\\b' + numPattern + '\\s+(?:[a-z]+\\s+){0,3}(?:trapped|stranded|stuck|marooned)\\b', 'i'),
    new RegExp('\\b(?:has|have)\\s+trapped\\s+' + numPattern + '\\s+(?:people|persons|residents|citizens|workers)?\\b', 'i'),
    new RegExp('\\b(?:trapped|stranded)\\s+' + numPattern + '\\s+(?:people|persons|residents|citizens|workers)?\\b', 'i'),
  ];
  for (const pat of patterns) {
    const match = m.match(pat);
    if (match) {
      const val = parseNumWord(match[1]);
      if (val !== null) return val;
    }
  }
  return null;
}

function hydrateReport(report) {
  if (!report || typeof report !== "object") return report;
  const r = { ...report };

  // 1. Casualties extraction / normalization
  let deathsVal = parseCountValue(r.deaths ?? r.death_count ?? r.deaths_count);
  if (deathsVal === null && r.message) {
    deathsVal = extractDeathsFromMessage(r.message);
  }
  if (deathsVal !== null) {
    r.deaths = String(deathsVal);
    r.death_count = deathsVal;
  } else if (!r.deaths || r.deaths === "None Reported" || r.deaths === "null") {
    r.deaths = "Not reported";
    r.death_count = null;
  }

  let injuredVal = parseCountValue(r.injured ?? r.injured_people ?? r.injuries);
  if (injuredVal === null && r.message) {
    injuredVal = extractInjuriesFromMessage(r.message);
  }
  if (injuredVal !== null) {
    r.injured = String(injuredVal);
    r.injured_people = injuredVal;
  } else if (!r.injured || r.injured === "None Reported" || r.injured === "null") {
    r.injured = "Not reported";
    r.injured_people = null;
  }

  let trappedVal = parseCountValue(r.trapped ?? r.trapped_people ?? r.trapped_citizens ?? r.stranded);
  if (trappedVal === null && r.message) {
    trappedVal = extractTrappedFromMessage(r.message);
  }
  if (trappedVal !== null) {
    r.trapped = String(trappedVal);
    r.trapped_people = trappedVal;
  } else if (!r.trapped || r.trapped === "None Reported" || r.trapped === "null") {
    r.trapped = "Not reported";
    r.trapped_people = null;
  }

  const affectedVal = parseCountValue(r.peopleAffected ?? r.people ?? r.people_affected);

  // 2. Completeness calculation (7 criteria)
  let completed = 0;
  const missing = [];

  const disaster = String(r.disaster || r.type || "").trim();
  if (disaster && !/^(not detected|general emergency|none|null|undefined)$/i.test(disaster)) {
    completed++;
  } else {
    missing.push("Disaster type not identified");
  }

  const loc = String(r.location || "").trim();
  if (loc && !/^(not detected|none|null|undefined|assigned sector|assigned location)$/i.test(loc)) {
    completed++;
  } else {
    missing.push("Location not detected");
  }

  if (deathsVal !== null) {
    completed++;
  } else {
    missing.push("Death count not confirmed");
  }

  if (injuredVal !== null) {
    completed++;
  } else {
    missing.push("Injured count not confirmed");
  }

  if (trappedVal !== null) {
    completed++;
  } else {
    missing.push("Trapped/stranded count not confirmed");
  }

  const rawNeeds = Array.isArray(r.specificNeeds) ? r.specificNeeds : (r.need ? [r.need] : []);
  const needStr = String(r.specificNeed || r.need || "").trim();
  if (rawNeeds.length > 0 || (needStr && !/^(none|none reported|not reported|no specific needs detected|assessment required|general relief)$/i.test(needStr))) {
    completed++;
  } else {
    missing.push("Emergency needs not specified");
  }

  const hasValidEvidence =
    r.evidenceValid === true ||
    r.evidence_valid === true ||
    String(r.evidenceStatus || r.evidence_status || "").trim().toLowerCase() === "valid";

  if (hasValidEvidence) {
    completed++;
  } else {
    missing.push("Photo/Video Evidence");
  }

  const calculatedCompleteness = Math.round((completed / 7) * 100);
  r.completenessScore = calculatedCompleteness;
  r.completeness = calculatedCompleteness;
  r.completeness_score = calculatedCompleteness;
  r.missingFields = calculatedCompleteness < 100 ? missing : [];
  r.missing_fields = r.missingFields;

  // 3. Actionability calculation
  let actionScore = 0;
  const barriers = [];

  if (rawNeeds.length > 0 || (needStr && !/^(none|none reported|not reported|no specific needs detected|assessment required|general relief)$/i.test(needStr))) {
    actionScore += 30;
  } else {
    barriers.push("Specific emergency needs not specified");
  }

  const urgency = String(r.urgency || "").trim().toLowerCase();
  if (["critical", "high", "medium"].includes(urgency)) {
    actionScore += 20;
  } else {
    actionScore += 10;
  }

  if (loc && !/^(not detected|none|null|undefined|assigned sector|assigned location)$/i.test(loc)) {
    actionScore += 20;
  } else {
    barriers.push("Actionable location not detected");
  }

  if (deathsVal !== null || injuredVal !== null || trappedVal !== null || affectedVal !== null) {
    actionScore += 15;
  } else {
    barriers.push("Casualty and affected impact unconfirmed");
  }

  const contact = String(r.contact || r.phone || "").trim();
  if (contact && !/^(not detected|not provided|none|null|undefined)$/i.test(contact) && /\d{5,}/.test(contact)) {
    actionScore += 10;
  } else {
    barriers.push("Direct citizen contact number not provided");
  }

  if (disaster && !/^(not detected|general emergency|none|null|undefined)$/i.test(disaster)) {
    actionScore += 5;
  } else {
    barriers.push("Specific disaster type not identified");
  }

  const actionLevel = actionScore >= 70 ? "High" : actionScore >= 40 ? "Medium" : "Low";
  r.actionabilityScore = actionScore;
  r.actionability = actionScore;
  r.actionability_score = actionScore;
  r.actionabilityLevel = r.actionabilityLevel || actionLevel;
  r.actionability_level = r.actionabilityLevel;
  r.actionabilityReasons = actionScore < 100 ? barriers : [];
  r.actionability_reasons = r.actionabilityReasons;

  // 4. Priority calculation
  let priScore = 0;
  const priReasons = [];

  if (urgency === "critical") {
    priScore += 50;
    priReasons.push("Critical urgency detected");
  } else if (urgency === "high") {
    priScore += 40;
    priReasons.push("High urgency detected");
  } else if (urgency === "medium") {
    priScore += 25;
    priReasons.push("Medium urgency detected");
  } else {
    priScore += 10;
    priReasons.push("Low urgency detected");
  }

  if (rawNeeds.length > 0 || (needStr && !/^(none|none reported|not reported|no specific needs detected|assessment required|general relief)$/i.test(needStr))) {
    priScore += 25;
    priReasons.push("Specific emergency need identified");
  }

  if (deathsVal !== null || injuredVal !== null || trappedVal !== null || affectedVal !== null) {
    priScore += 20;
    priReasons.push("People affected / casualty information available");
  }

  if (disaster && !/^(not detected|general emergency|none|null|undefined)$/i.test(disaster)) {
    priScore += 15;
    priReasons.push("Disaster event identified");
  }

  priScore = Math.min(priScore, 100);
  const priLevel = priScore >= 80 ? "Critical" : priScore >= 60 ? "High" : priScore >= 40 ? "Medium" : "Low";

  const currentPriority = String(r.priority || r.priority_level || "").trim().toLowerCase();
  if (!currentPriority || currentPriority === "not assessed" || currentPriority === "undefined" || (r.priorityScore === 0 && priScore > 0)) {
    r.priorityScore = priScore;
    r.score = priScore;
    r.priority = priLevel;
  } else {
    r.priorityScore = Number(r.priorityScore ?? r.score ?? priScore);
    r.priority = r.priority || priLevel;
  }
  r.priority_level = r.priority;
  r.priority_rating = r.priorityScore;
  r.priorityReasons = Array.isArray(r.priorityReasons) && r.priorityReasons.length > 0 ? r.priorityReasons : priReasons;
  r.priority_reasons = r.priorityReasons;

  return r;
}

function loadReports() {
  try {
    if (!fs.existsSync(REPORTS_FILE)) return [];
    const content = fs.readFileSync(REPORTS_FILE, "utf8").trim();
    if (!content) return [];
    const reports = JSON.parse(content);
    return Array.isArray(reports)
      ? reports
          .filter((report) => report && typeof report === "object" && report.id != null)
          .map(hydrateReport)
      : [];
  } catch (error) {
    console.error("Failed to load crisis reports:", error);
    return [];
  }
}

function saveReports(reports) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), "utf8");
}

function createReportId() {
  return `CRS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
}

/* ============================================================
   FEEDBACK STORAGE
   ============================================================ */

const FEEDBACK_FILE = path.resolve(process.cwd(), "crisentra_feedback.json");

function loadFeedback() {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    const content = fs.readFileSync(FEEDBACK_FILE, "utf8").trim();
    if (!content) return [];
    const items = JSON.parse(content);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error("Failed to load feedback:", error);
    return [];
  }
}

function saveFeedback(items) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2), "utf8");
}

/* ============================================================
   USER AUTHENTICATION STORAGE & SECURITY
   ============================================================ */

const USERS_FILE = path.resolve(process.cwd(), "crisentra_users.json");

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const content = fs.readFileSync(USERS_FILE, "utf8").trim();
    if (!content) return [];
    const users = JSON.parse(content);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Failed to load users:", error);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  try {
    const [salt, storedHash] = String(storedPassword).split(":");
    if (!salt || !storedHash) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

function validateStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

const activeSessions = new Map();
const passwordResetOtps = new Map();
const twoFactorChallenges = new Map();

function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeMobile(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function samePhone(p1, p2) {
  const d1 = normalizeMobile(p1);
  const d2 = normalizeMobile(p2);
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  return d1.length >= 10 && d2.length >= 10 && d1.slice(-10) === d2.slice(-10);
}

function findUserByAuthIdentifier(users, identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;
  const lower = value.toLowerCase();

  return users.find((user) => {
    const emailMatch = user.email && String(user.email).toLowerCase() === lower;
    const usernameMatch = (user.username && String(user.username).toLowerCase() === lower) ||
                          (user.name && String(user.name).toLowerCase() === lower);
    const mobileMatch = (user.mobile || user.phone) && samePhone(user.mobile || user.phone, value);
    const userIdMatch = user.id && String(user.id).toLowerCase() === lower;
    const teamIdMatch = user.teamIdentifier && String(user.teamIdentifier).toLowerCase() === lower;
    return emailMatch || usernameMatch || mobileMatch || userIdMatch || teamIdMatch;
  });
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function createUserId(role = "USER") {
  const prefix = role.toUpperCase() === "RESCUE" ? "RES" : "USR";
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const userId = activeSessions.get(token);
  if (!userId) return null;
  const users = loadUsers();
  return users.find((user) => String(user.id) === String(userId)) || null;
}

/* ============================================================
   REQUEST HELPERS & JSON RESPONSE
   ============================================================ */

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50_000_000) {
        req.destroy();
        reject(new Error("Request body exceeds limit."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-voice-language",
  });
  res.end(JSON.stringify(payload));
}

/* ============================================================
   FILE CONTENT EXTRACTOR ENGINE
   ============================================================ */

async function extractFileContent({ fileName = "document", fileType = "", fileBase64 = "" }) {
  if (!fileBase64) {
    return {
      success: false,
      error: "No file content provided.",
      text: "",
      fileName,
    };
  }

  return new Promise((resolve) => {
    try {
      const child = spawn(PYTHON_COMMAND, [FILE_EXTRACTOR_SCRIPT], {
        cwd: PROJECT_ROOT,
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          try { child.kill(); } catch (_) {}
          resolve({
            success: false,
            error: "File extraction timed out after 35 seconds.",
            text: "",
            fileName,
          });
        }
      }, 35000);

      child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });

      child.on("close", (code) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        try {
          const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
          if (lines.length > 0) {
            const parsed = JSON.parse(lines[lines.length - 1]);
            return resolve(parsed);
          }
          return resolve({
            success: false,
            error: stderr || `File extractor exited with code ${code}`,
            text: "",
            fileName,
          });
        } catch (e) {
          return resolve({
            success: false,
            error: `Failed to parse extractor output: ${e.message}`,
            text: "",
            fileName,
          });
        }
      });

      child.on("error", (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({
          success: false,
          error: `Extractor execution failed: ${err.message}`,
          text: "",
          fileName,
        });
      });

      const payload = JSON.stringify({ fileName, fileType, fileBase64 });
      child.stdin.write(payload);
      child.stdin.end();
    } catch (err) {
      resolve({
        success: false,
        error: `Could not start file extraction: ${err.message}`,
        text: "",
        fileName,
      });
    }
  });
}

/* ============================================================
   GEMINI AI ASSISTANT CLIENT (WITH MULTIMODAL & DOCUMENT INTELLIGENCE)
   ============================================================ */

async function callGeminiAssistant(userMessage, history = [], fileData = null) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const systemInstruction = `You are CRISENTRA AI Assistant, an expert disaster intelligence, emergency response, and document analysis assistant.
Your mission is to provide life-saving guidance, crisis instructions, disaster preparedness tips, emergency intelligence, and analyze user-submitted documents, data, and imagery.
If someone is facing an immediate life threat, always advise them to call 112 immediately.

STRICT GROUNDING & DOCUMENT ANALYSIS RULES:
- When a document, table, spreadsheet, image, or report is attached or provided, ground your answers strictly on the actual extracted content.
- If asked for counts, statistics, totals, or trends from data (CSV/Excel/JSON), compute them accurately using the provided rows and columns.
- Summarize clearly: highlight affected locations, casualties (injured, deaths, trapped), emergency needs (medical, rescue, food/water, boat), and severity/priority levels.
- If specific information is NOT present in the file, state clearly that it is not mentioned in the provided content rather than inventing details.
- Never hallucinate non-existent numbers, names, or incident records.
- You understand English, Tamil, and Tanglish. If the user writes in Tamil or Tanglish, reply helpfully in their preferred language.`;

  const contents = [];

  // Filter history to last 6 turns and ensure alternating user/model turns
  const cleanHistory = history.slice(-6).map((h) => ({
    role: h.role === "assistant" || h.role === "model" ? "model" : "user",
    text: String(h.text || h.content || "").trim(),
  })).filter((h) => h.text.length > 0);

  let isFirst = true;
  for (const h of cleanHistory) {
    if (isFirst && h.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: `[System Instruction]\n${systemInstruction}\n\n[User Message]:\n${h.text}` }],
      });
      isFirst = false;
    } else {
      // Avoid two consecutive messages of the same role
      if (contents.length > 0 && contents[contents.length - 1].role === h.role) {
        contents[contents.length - 1].parts[0].text += `\n\n${h.text}`;
      } else {
        contents.push({
          role: h.role,
          parts: [{ text: h.text }],
        });
      }
    }
  }

  // Construct current turn
  const currentParts = [];
  const prefix = isFirst ? `[System Instruction]\n${systemInstruction}\n\n` : "";
  let promptText = userMessage || "";

  if (fileData) {
    if (fileData.success === false) {
      promptText = `${prefix}[File Attachment Note]: The user attached a file named "${fileData.fileName || "document"}", but content extraction was not successful (${fileData.error || "Unsupported or empty format"}). Please politely inform the user what occurred and note that supported formats include PDF, DOCX, TXT, Markdown, CSV, XLSX, JSON, and PNG/JPEG images.\n\nUser Question: ${userMessage || "Please analyze this file."}`;
      currentParts.push({ text: promptText });
    } else if (fileData.isImage && fileData.base64) {
      currentParts.push({
        inlineData: {
          mimeType: fileData.mimeType || "image/jpeg",
          data: fileData.base64,
        },
      });
      const imgPrompt = `${prefix}[Attached Image: ${fileData.fileName || "image"}]\nPlease carefully inspect this emergency/disaster image. Identify visible damage, flood/water levels, collapsed structures, fire/smoke, trapped individuals, road blockage, or other critical safety hazards.\n\nUser Question/Request:\n${userMessage || "Please analyze this disaster image and explain what you observe, safety risks, and recommended actions."}`;
      currentParts.push({ text: imgPrompt });
    } else {
      const ext = path.extname(fileData.fileName || "").toLowerCase();
      // If PDF has no digital text but base64 is present, use Gemini's native PDF reading
      if (ext === ".pdf" && (!fileData.text || fileData.text.trim().length === 0) && fileData.base64) {
        currentParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: fileData.base64,
          },
        });
        currentParts.push({
          text: `${prefix}[Attached PDF Document: ${fileData.fileName}]\nPlease inspect and read this document thoroughly.\n\nUser Question/Request:\n${userMessage || "Please summarize this document and extract key findings."}`,
        });
      } else {
        const docText = (fileData.text || "").slice(0, 65000);
        const docPrompt = `${prefix}[Attached File: ${fileData.fileName || "Document"}]\n\n--- EXTRACTED FILE CONTENT START ---\n${docText}\n--- EXTRACTED FILE CONTENT END ---\n\nUser Question / Instruction:\n${userMessage || "Please analyze, summarize, and extract all key facts, statistics, and emergency details from this document."}`;
        currentParts.push({ text: docPrompt });
      }
    }
  } else {
    currentParts.push({ text: `${prefix}${promptText}` });
  }

  // Ensure last role is user and avoid consecutive duplicate roles
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({ role: "user", parts: currentParts });
  }

  const candidateModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      const postData = JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
        },
      });

      const options = {
        hostname: "generativelanguage.googleapis.com",
        port: 443,
        path: `/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 35000,
      };

      const result = await new Promise((resolve) => {
        const req = https.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(data);
                const reply = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply && reply.trim()) {
                  return resolve({ success: true, reply: reply.trim(), provider: `Gemini (${model})` });
                }
              }
              console.warn(`Gemini model ${model} HTTP ${res.statusCode}:`, data.slice(0, 200));
              resolve({ success: false, statusCode: res.statusCode });
            } catch (err) {
              resolve({ success: false, error: err.message });
            }
          });
        });

        req.on("error", (err) => {
          console.warn(`Gemini model ${model} network error:`, err.message);
          resolve({ success: false, error: err.message });
        });

        req.on("timeout", () => {
          req.destroy();
          console.warn(`Gemini model ${model} request timed out.`);
          resolve({ success: false, error: "timeout" });
        });

        req.write(postData);
        req.end();
      });

      if (result.success && result.reply) {
        return result;
      }
    } catch (e) {
      console.warn(`Error trying Gemini model ${model}:`, e.message);
    }
  }

  return null;
}

/* ============================================================
   OLLAMA AI ASSISTANT CLIENT (LOCAL FALLBACK)
   ============================================================ */

async function callOllamaAssistant(userMessage, history = [], fileContext = "") {
  const systemPrompt = `You are CRISENTRA AI Assistant, a compassionate and expert disaster intelligence & emergency response assistant.
Your mission is to provide life-saving guidance, crisis instructions, disaster preparedness tips, and platform usage help.
If someone is facing an immediate life threat, always advise them to call 112 immediately.
Be clear, accurate, structured, and helpful. You understand English, Tamil, and Tanglish. If the user writes in Tamil or Tanglish, reply helpfully in their preferred language.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: String(h.text || h.content || ""),
    })),
  ];

  let promptText = userMessage;
  if (fileContext) {
    promptText = `[Attached Document/File Content]:\n${fileContext.slice(0, 3000)}\n\n[User Question]: ${userMessage}`;
  }
  messages.push({ role: "user", content: promptText });

  try {
    const postData = JSON.stringify({
      model: "qwen2.5:3b",
      messages,
      stream: false,
    });

    const options = {
      hostname: "127.0.0.1",
      port: 11434,
      path: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 30000,
    };

    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(data);
              const reply = parsed?.message?.content || parsed?.response || "I am ready to help with emergency information.";
              resolve({ reply, provider: "Ollama (qwen2.5)" });
            } else {
              resolve({
                reply: "CRISENTRA AI is active. If someone is in immediate danger, please dial emergency services at 112 or use Report Crisis immediately.",
                provider: "Fallback",
              });
            }
          } catch {
            resolve({
              reply: "CRISENTRA AI is standing by. In an emergency, dial 112 or submit an emergency report via Report Crisis.",
              provider: "Fallback",
            });
          }
        });
      });

      req.on("error", () => {
        resolve({
          reply: "I am CRISENTRA AI Assistant. To request rescue or medical aid, please submit a signal using the Report Crisis form or call 112 for immediate assistance.",
          provider: "Fallback",
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          reply: "Request timed out. For immediate life-saving emergency support, dial 112 directly.",
          provider: "Timeout Fallback",
        });
      });

      req.write(postData);
      req.end();
    });
  } catch {
    return {
      reply: "Emergency information assistant: Dial 112 for immediate danger or use Report Crisis.",
      provider: "Fallback",
    };
  }
}

/* ============================================================
   AI ASSISTANT UNIFIED DISPATCHER
   ============================================================ */

async function callAIAssistant({ userMessage, history = [], fileData = null }) {
  // 1. Try Google Gemini with document / vision / reasoning
  try {
    const geminiRes = await callGeminiAssistant(userMessage, history, fileData);
    if (geminiRes && geminiRes.reply) {
      return geminiRes;
    }
  } catch (err) {
    console.error("Gemini assistant error:", err);
  }

  // 2. Try Ollama (Local LLM fallback)
  try {
    const ollamaFileText = fileData?.text ? fileData.text.slice(0, 4000) : "";
    const ollamaRes = await callOllamaAssistant(userMessage, history, ollamaFileText);
    if (ollamaRes && ollamaRes.provider !== "Fallback" && ollamaRes.provider !== "Timeout Fallback") {
      return ollamaRes;
    }
  } catch (_) {}

  // 3. Document-aware smart fallback
  if (fileData) {
    if (fileData.success === false) {
      return {
        reply: `CRISENTRA AI was unable to read the file "${fileData.fileName}". ${fileData.error || "Please attach a supported format."}\n\nSupported formats: PDF, DOCX, TXT, Markdown, CSV, XLSX, JSON, and PNG/JPEG images.`,
        provider: "CRISENTRA Document Intelligence",
      };
    }
    if (fileData.text) {
      return {
        reply: `📄 **File Received:** ${fileData.fileName}\n\nCRISENTRA AI has extracted **${fileData.text.length} characters** of content from your document. External AI processing is temporarily unavailable, but if you are facing an active emergency, call 112 directly or submit an urgent signal via **Report Crisis**.`,
        provider: "CRISENTRA File Reader",
      };
    }
  }

  return {
    reply: "CRISENTRA AI Assistant is active. For immediate life-threatening danger, dial 112 immediately or submit an emergency report via Report Crisis.",
    provider: "CRISENTRA Emergency System",
  };
}

/* ============================================================
   HTTP SERVER & ROUTES
   ============================================================ */

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  // 1. Health Check
  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, { ok: true, service: "CRISENTRA AI", port: PORT });
    return;
  }

  // 1.1 Static Uploads Serving
  if (req.method === "GET" && req.url.startsWith("/uploads/")) {
    try {
      const cleanPath = decodeURIComponent(req.url.replace(/^\/uploads\//, "")).replace(/(\.\.[\/\\])/g, "");
      const filePath = path.join(UPLOADS_DIR, cleanPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".mp4": "video/mp4",
          ".webm": "video/webm",
          ".mov": "video/quicktime",
          ".avi": "video/x-msvideo",
        };
        const contentType = mimeMap[ext] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      sendJson(res, 404, { error: "Uploaded media file not found." });
      return;
    } catch (e) {
      sendJson(res, 500, { error: "Failed to read media file." });
      return;
    }
  }

  // 1.2 File Upload Endpoint (Photo & Video Evidence)
  if (req.method === "POST" && req.url === "/api/upload") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const fileBase64 = parsed.fileBase64 || parsed.data;
      const originalName = String(parsed.fileName || "evidence").trim();
      const fileType = String(parsed.fileType || "").toLowerCase();
      const reportId = String(parsed.reportId || "CRS").replace(/[^a-zA-Z0-9_-]/g, "");
      const crisisMessage = String(parsed.message || "").trim();
      const disasterHint = String(parsed.disaster || "").trim();
      const locationHint = String(parsed.location || "").trim();

      if (!fileBase64) {
        sendJson(res, 400, { error: "No file content provided." });
        return;
      }

      const isImage = fileType.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(originalName);
      const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(originalName);

      if (!isImage && !isVideo) {
        sendJson(res, 400, { error: "Invalid file type. Only photo (JPEG/PNG/WEBP) and video (MP4/WEBM/MOV) evidence are allowed." });
        return;
      }

      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Binary magic byte validation: inspect binary header, do not trust extensions alone
      const magicInspection = inspectMagicBytesBuffer(buffer);
      if (!magicInspection.valid) {
        sendJson(res, 400, {
          error: "Corrupted or unsupported file format. Please upload a valid image (JPEG, PNG, WEBP) or video (MP4, WEBM, MOV).",
        });
        return;
      }

      const maxPhotoSize = 15 * 1024 * 1024;
      const maxVideoSize = 40 * 1024 * 1024;
      if (isImage && buffer.length > maxPhotoSize) {
        sendJson(res, 400, { error: "Photo evidence exceeds maximum size limit of 15MB." });
        return;
      }
      if (isVideo && buffer.length > maxVideoSize) {
        sendJson(res, 400, { error: "Video evidence exceeds maximum size limit of 40MB." });
        return;
      }

      const ext = path.extname(originalName) || (isImage ? ".jpg" : ".mp4");
      const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const savedFileName = `${reportId}_${Date.now()}_${safeBase}${ext}`;
      const destPath = path.join(UPLOADS_DIR, savedFileName);

      fs.writeFileSync(destPath, buffer);

      // Deep AI content validation against crisis message and disaster context
      const validationRes = await validateEvidenceWithPython(
        destPath,
        originalName,
        crisisMessage,
        disasterHint,
        locationHint
      );

      sendJson(res, 201, {
        success: true,
        url: `/uploads/${savedFileName}`,
        fileName: originalName,
        savedAs: savedFileName,
        fileType: isImage ? "image" : "video",
        size: buffer.length,
        valid: validationRes.valid === true,
        status: validationRes.status || (validationRes.valid ? "valid" : "invalid"),
        reason: validationRes.reason || "",
        detectedVisual: validationRes.detected_visual || "",
        confidence: validationRes.confidence || 0,
        requiresManualVerification:
          validationRes.requires_manual_verification === true ||
          validationRes.status === "requires_verification",
      });
      return;
    } catch (err) {
      console.error("Upload error:", err);
      sendJson(res, 500, { error: "Failed to upload evidence file." });
      return;
    }
  }

  // 1.3 Audio Transcription Endpoint (/api/transcribe)
  if (req.method === "POST" && req.url === "/api/transcribe") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const text = String(parsed.text || "").trim();
      const audioBase64 = parsed.audio || parsed.audioBase64;
      const language = parsed.language || "ta-IN";

      if (text) {
        const transResult = await translateWithPython(text);
        sendJson(res, 200, {
          success: true,
          originalText: text,
          translatedText: transResult.translated_text || text,
          language: transResult.language || language,
        });
        return;
      }

      if (audioBase64) {
        const tempWav = path.join(UPLOADS_DIR, `speech_${Date.now()}.wav`);
        const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
        fs.writeFileSync(tempWav, Buffer.from(cleanBase64, "base64"));

        const pythonCode = `
import sys, json
import speech_recognition as sr
r = sr.Recognizer()
lang = sys.argv[2] if len(sys.argv) > 2 else "ta-IN"
try:
    with sr.AudioFile(sys.argv[1]) as source:
        audio = r.record(source)
    text = r.recognize_google(audio, language=lang)
    print(json.dumps({"success": True, "text": text, "language": lang}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;
        try {
          const { stdout } = await execFileAsync(PYTHON_COMMAND, ["-c", pythonCode, tempWav, language], {
            cwd: PROJECT_ROOT,
            windowsHide: true,
            timeout: 20000,
          });
          try { fs.unlinkSync(tempWav); } catch (_) {}
          const lines = stdout.trim().split(/\\r?\\n/).filter(Boolean);
          const pyRes = JSON.parse(lines[lines.length - 1]);
          if (pyRes.success && pyRes.text) {
            const transResult = await translateWithPython(pyRes.text);
            sendJson(res, 200, {
              success: true,
              originalText: pyRes.text,
              translatedText: transResult.translated_text || pyRes.text,
              language: transResult.language || language,
            });
            return;
          }
          sendJson(res, 400, { success: false, error: pyRes.error || "Could not transcribe audio." });
          return;
        } catch (subErr) {
          try { fs.unlinkSync(tempWav); } catch (_) {}
          sendJson(res, 500, { success: false, error: "Audio speech recognition process failed." });
          return;
        }
      }

      sendJson(res, 400, { error: "Audio or text data required for transcription." });
      return;
    } catch (err) {
      sendJson(res, 500, { error: "Transcription service error." });
      return;
    }
  }

  // 2. Translation Route
  if (req.method === "POST" && req.url === "/api/translate") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const text = String(parsed.text || "").trim();

      if (!text) {
        sendJson(res, 400, { error: "Text cannot be empty." });
        return;
      }

      const result = await translateWithPython(text);
      sendJson(res, 200, result);
      return;
    } catch (error) {
      console.error("Translation route error:", error);
      sendJson(res, 500, { error: "Translation failed." });
      return;
    }
  }

  // 3. AI Assistant Route
  if (req.method === "POST" && req.url === "/api/assistant") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const message = String(parsed.message || "").trim();
      const history = Array.isArray(parsed.history) ? parsed.history : [];
      const fileName = String(parsed.fileName || "").trim();
      const fileType = String(parsed.fileType || "").trim();
      const fileBase64 = String(parsed.fileBase64 || parsed.fileData || "").trim();
      const fileContent = String(parsed.fileContent || parsed.attachedContent || "").trim();

      if (!message && !fileBase64 && !fileContent) {
        sendJson(res, 400, { error: "Please enter a message or attach a file." });
        return;
      }

      // Check file size security limit (prevent huge base64 bombs, max ~25MB base64)
      if (fileBase64 && fileBase64.length > 25 * 1024 * 1024) {
        sendJson(res, 400, {
          error: "Attached file is too large. Please upload files under 15MB.",
          reply: "The attached file exceeds the 15MB size limit. Please upload a smaller document, table, or photo.",
        });
        return;
      }

      let fileData = null;
      if (fileBase64) {
        fileData = await extractFileContent({ fileName, fileType, fileBase64 });
      } else if (fileContent) {
        fileData = {
          success: true,
          fileName: fileName || "text_document.txt",
          fileType: "txt",
          text: fileContent,
        };
      }

      const aiResponse = await callAIAssistant({ userMessage: message, history, fileData });
      sendJson(res, 200, {
        success: true,
        reply: aiResponse.reply,
        provider: aiResponse.provider,
        fileName: fileName || null,
      });
      return;
    } catch (error) {
      console.error("Assistant route error:", error);
      sendJson(res, 500, {
        error: "AI Assistant encountered an error.",
        reply: "CRISENTRA AI Assistant is active. For urgent life-threatening crises, contact 112 immediately or report on the Report Crisis page.",
      });
      return;
    }
  }

  // 4. Crisis Analysis Route
  if (req.method === "POST" && req.url === "/api/analyze") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const message = String(parsed.message || "").trim();
      const hasPhotos = parsed.hasPhotos === true;
      const hasVideos = parsed.hasVideos === true;
      const evidenceStatus = parsed.evidenceStatus || parsed.evidence_status || null;
      const evidenceValid =
        parsed.evidenceValid !== undefined
          ? parsed.evidenceValid === true
          : parsed.evidence_valid !== undefined
          ? parsed.evidence_valid === true
          : null;

      if (!message) {
        sendJson(res, 400, { error: "Please enter a crisis message." });
        return;
      }

      const result = await analyzeWithPythonEngine(
        message,
        hasPhotos,
        hasVideos,
        evidenceStatus,
        evidenceValid
      );
      const info = result.information || {};

      const rawNeeds = Array.isArray(result.specificNeeds)
        ? result.specificNeeds
        : Array.isArray(info.specific_needs)
        ? info.specific_needs
        : typeof info.specific_need === "string" &&
          info.specific_need.trim() &&
          !/^(assessment required|no specific needs detected|general relief|none reported)$/i.test(info.specific_need.trim())
        ? info.specific_need.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const needsArray = Array.from(new Set(rawNeeds));
      const specificNeedsDisplay = needsArray.length > 0
        ? needsArray.join(", ")
        : "No specific needs detected";

      const contact = info.contact || "Not Detected";
      const disasterName = info.disaster || result.disaster || result.category || "General Emergency";
      const locationName = info.location || "Not Detected";

      const normalizedResult = {
        ...result,
        category: disasterName,
        disaster: disasterName,
        location: locationName,
        model_category: result.model_category || "Classification unavailable",
        confidence: Number(result.confidence ?? 0),
        roberta_confidence: Number(result.roberta_confidence ?? result.confidence ?? 0),
        specificNeeds: needsArray,
        predictedNeeds: specificNeedsDisplay,
        priority_level: result.priority_level || "Standard",
        priority_rating: Number(result.priority_rating ?? 0),
        actionability_score: result.actionability_score ?? null,
        actionability_level: result.actionability_level || "Standard",
        actionability_reasons: Array.isArray(result.actionability_reasons) ? result.actionability_reasons : [],
        completeness_score: result.completeness_score ?? null,
        missing_fields: Array.isArray(result.missing_fields) ? result.missing_fields : [],
        evidence_status: result.evidence_status ?? evidenceStatus ?? (hasPhotos || hasVideos ? "requires_verification" : null),
        evidence_valid: result.evidence_valid ?? (evidenceValid === true),
        evidence_message: result.evidence_message || result.evidence_reason || "",
        priority_reasons: Array.isArray(result.priority_reasons) ? result.priority_reasons : [],
        explanation: result.explanation || "",
        information: {
          ...info,
          disaster: disasterName,
          location: locationName,
          people_affected: info.people_affected ?? "Not reported",
          trapped_people: info.trapped_people ?? "Not reported",
          injured_people: info.injured_people ?? "Not reported",
          death_count: info.death_count ?? "Not reported",
          specific_needs: needsArray,
          specific_need: specificNeedsDisplay,
          urgency: info.urgency || "Low",
          contact,
        },
        trapped: info.trapped_people ?? "Not reported",
        injured: info.injured_people ?? "Not reported",
        deaths: info.death_count ?? "Not reported",
        peopleAffected: info.people_affected ?? "Not reported",
        contact,
        phone: contact,
        message,
      };

      sendJson(res, 200, normalizedResult);
      return;
    } catch (error) {
      console.error("Analysis error:", error);
      sendJson(res, 500, { error: error.message || "Crisis analysis failed." });
      return;
    }
  }

  // 5. Auth: Register
  if (req.method === "POST" && req.url === "/api/auth/register") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const role = String(parsed.role || "USER").trim().toUpperCase();
      const name = String(parsed.name || parsed.username || "").trim();
      const username = String(parsed.username || name || "").trim();
      const mobile = String(parsed.mobile || parsed.phone || "").trim();
      const email = String(parsed.email || "").trim().toLowerCase();
      const password = String(parsed.password || "");

      if (!name || (!mobile && !email) || !password) {
        sendJson(res, 400, { error: "Required registration fields are missing." });
        return;
      }

      if (!validateStrongPassword(password)) {
        sendJson(res, 400, {
          error: "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.",
        });
        return;
      }

      const users = loadUsers();

      // Enforce strict uniqueness on email, mobile, and username
      const existingUser = users.find((u) => {
        const emailMatch = email && u.email && String(u.email).toLowerCase() === email;
        const mobileMatch = mobile && (u.mobile || u.phone) && samePhone(u.mobile || u.phone, mobile);
        const usernameMatch = username && ((u.username && String(u.username).toLowerCase() === username.toLowerCase()) ||
                                           (u.name && String(u.name).toLowerCase() === username.toLowerCase()));
        return emailMatch || mobileMatch || usernameMatch;
      });

      if (existingUser) {
        sendJson(res, 409, { error: "User already exists" });
        return;
      }

      const newUser = {
        id: createUserId(role),
        role,
        name,
        username,
        mobile: mobile || null,
        email: email || null,
        passwordHash: hashPassword(password),
        verified: role === "RESCUE" ? true : false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      saveUsers(users);

      const token = createSessionToken();
      activeSessions.set(token, newUser.id);

      sendJson(res, 201, {
        success: true,
        user: sanitizeUser(newUser),
        token,
      });
      return;
    } catch (error) {
      console.error("Register error:", error);
      sendJson(res, 500, { error: "Registration failed." });
      return;
    }
  }

  // 6. Auth: Login
  if (req.method === "POST" && req.url === "/api/auth/login") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const identifier = String(parsed.identifier || parsed.email || parsed.mobile || parsed.username || "").trim();
      const password = String(parsed.password || "");
      const expectedRole = parsed.role ? String(parsed.role).trim().toUpperCase() : null;

      if (!identifier || !password) {
        sendJson(res, 400, { error: "Identifier and password are required." });
        return;
      }

      const users = loadUsers();
      const user = findUserByAuthIdentifier(users, identifier);

      if (!user) {
        sendJson(res, 404, { error: "User not found. Please register." });
        return;
      }

      if (!verifyPassword(password, user.passwordHash)) {
        sendJson(res, 401, { error: "Invalid credentials." });
        return;
      }

      if (expectedRole && user.role !== expectedRole) {
        sendJson(res, 403, { error: `Unauthorized. This account is registered as ${user.role}.` });
        return;
      }

      // Check if 2FA challenge is requested
      if (parsed.requireTwoFactor || user.twoFactorEnabled) {
        const challengeCode = createOtp();
        twoFactorChallenges.set(user.id, {
          code: challengeCode,
          expiresAt: Date.now() + 5 * 60 * 1000,
          attempts: 0,
        });
        console.log(`[2FA Challenge for ${user.name} (${user.id})]: Code ${challengeCode}`);
        sendJson(res, 200, {
          twoFactorRequired: true,
          userId: user.id,
          message: "Two-step verification code generated.",
          challengeCode, // Provided for local verification
        });
        return;
      }

      const token = createSessionToken();
      activeSessions.set(token, user.id);

      sendJson(res, 200, {
        success: true,
        user: sanitizeUser(user),
        token,
      });
      return;
    } catch (error) {
      console.error("Login error:", error);
      sendJson(res, 500, { error: "Login failed." });
      return;
    }
  }

  // 7. Auth: Two-Factor Verification
  if (req.method === "POST" && req.url === "/api/auth/two-factor-verify") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const userId = String(parsed.userId || "").trim();
      const code = String(parsed.code || "").trim();

      const challenge = twoFactorChallenges.get(userId);
      if (!challenge || Date.now() > challenge.expiresAt) {
        twoFactorChallenges.delete(userId);
        sendJson(res, 400, { error: "Verification challenge expired. Please login again." });
        return;
      }

      if (challenge.attempts >= 5) {
        twoFactorChallenges.delete(userId);
        sendJson(res, 429, { error: "Too many failed attempts. Please login again." });
        return;
      }

      if (challenge.code !== code) {
        challenge.attempts += 1;
        sendJson(res, 400, { error: "Invalid verification code." });
        return;
      }

      twoFactorChallenges.delete(userId);
      const users = loadUsers();
      const user = users.find((u) => u.id === userId);
      if (!user) {
        sendJson(res, 404, { error: "User not found." });
        return;
      }

      const token = createSessionToken();
      activeSessions.set(token, user.id);

      sendJson(res, 200, {
        success: true,
        user: sanitizeUser(user),
        token,
      });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Verification failed." });
      return;
    }
  }

  // 8. Auth: Change Password
  if (req.method === "POST" && req.url === "/api/auth/change-password") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const identifier = String(parsed.identifier || "").trim();
      const currentPassword = String(parsed.currentPassword || "");
      const newPassword = String(parsed.newPassword || "");

      if (!identifier || !currentPassword || !newPassword) {
        sendJson(res, 400, { error: "All password fields are required." });
        return;
      }

      if (!validateStrongPassword(newPassword)) {
        sendJson(res, 400, {
          error: "New password must be at least 8 characters and contain uppercase, lowercase, number, and special character.",
        });
        return;
      }

      const users = loadUsers();
      const user = findUserByAuthIdentifier(users, identifier);

      if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        sendJson(res, 401, { error: "Current password is incorrect." });
        return;
      }

      user.passwordHash = hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      sendJson(res, 200, { success: true, message: "Password updated successfully." });
      return;
    } catch (error) {
      console.error("Change password error:", error);
      sendJson(res, 500, { error: "Failed to change password." });
      return;
    }
  }

  // 9. Auth: Forgot Password OTP Challenge
  if (req.method === "POST" && req.url === "/api/auth/forgot-password") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const identifier = String(parsed.identifier || "").trim();

      if (!identifier) {
        sendJson(res, 400, { error: "Email or phone number is required." });
        return;
      }

      const users = loadUsers();
      const user = findUserByAuthIdentifier(users, identifier);

      if (!user) {
        sendJson(res, 404, { error: "No account found with that identifier." });
        return;
      }

      const otp = createOtp();
      passwordResetOtps.set(user.id, {
        userId: user.id,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        verified: false,
        attempts: 0,
      });

      console.log(`[PASSWORD RESET OTP for ${user.email || user.mobile}]: ${otp}`);

      sendJson(res, 200, {
        success: true,
        message: "Verification code sent to your registered contact.",
        delivery: user.email ? "email" : "phone",
        otp, // Included for local test environment
      });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Unable to process password reset request." });
      return;
    }
  }

  // 10. Auth: Verify OTP
  if (req.method === "POST" && req.url === "/api/auth/verify-otp") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const identifier = String(parsed.identifier || "").trim();
      const otp = String(parsed.otp || "").trim();

      if (!identifier || !otp) {
        sendJson(res, 400, { error: "Identifier and OTP are required." });
        return;
      }

      const users = loadUsers();
      const user = findUserByAuthIdentifier(users, identifier);

      if (!user) {
        sendJson(res, 404, { error: "Account not found." });
        return;
      }

      const resetData = passwordResetOtps.get(user.id);
      if (!resetData || Date.now() > resetData.expiresAt) {
        passwordResetOtps.delete(user.id);
        sendJson(res, 400, { error: "OTP has expired. Please request a new OTP." });
        return;
      }

      if (resetData.attempts >= 5) {
        passwordResetOtps.delete(user.id);
        sendJson(res, 429, { error: "Too many failed attempts. Please request a new OTP." });
        return;
      }

      if (resetData.otp !== otp) {
        resetData.attempts += 1;
        sendJson(res, 400, { error: "Invalid OTP code." });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      resetData.verified = true;
      resetData.resetToken = resetToken;
      resetData.resetTokenExpiresAt = Date.now() + 10 * 60 * 1000;
      passwordResetOtps.set(user.id, resetData);

      sendJson(res, 200, {
        success: true,
        message: "OTP verified successfully.",
        resetToken,
      });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Unable to verify OTP." });
      return;
    }
  }

  // 11. Auth: Reset Password
  if (req.method === "POST" && req.url === "/api/auth/reset-password") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const resetToken = String(parsed.resetToken || "").trim();
      const newPassword = String(parsed.newPassword || "");

      if (!resetToken || !newPassword) {
        sendJson(res, 400, { error: "Reset token and new password are required." });
        return;
      }

      if (!validateStrongPassword(newPassword)) {
        sendJson(res, 400, {
          error: "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.",
        });
        return;
      }

      let matchedUserId = null;
      for (const [userId, resetData] of passwordResetOtps.entries()) {
        if (resetData.resetToken === resetToken && resetData.verified === true) {
          if (Date.now() <= resetData.resetTokenExpiresAt) {
            matchedUserId = userId;
          }
          break;
        }
      }

      if (!matchedUserId) {
        sendJson(res, 400, { error: "Invalid or expired password reset session." });
        return;
      }

      passwordResetOtps.delete(matchedUserId);
      const users = loadUsers();
      const user = users.find((u) => u.id === matchedUserId);

      if (!user) {
        sendJson(res, 404, { error: "User not found." });
        return;
      }

      user.passwordHash = hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      sendJson(res, 200, { success: true, message: "Password reset successfully." });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Password reset failed." });
      return;
    }
  }

  // 12. Reports: Get & Post
  if (req.method === "GET" && req.url === "/api/reports") {
    try {
      const reports = loadReports();
      sendJson(res, 200, { reports });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Failed to load reports." });
      return;
    }
  }

  if (req.method === "POST" && req.url === "/api/reports") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const report = parsed.report;

      if (!report || typeof report !== "object") {
        sendJson(res, 400, { error: "Report data is required." });
        return;
      }

      const reports = loadReports();
      const newReport = hydrateReport({
        ...report,
        id: report.id || createReportId(),
        status: report.status || "pending",
        createdAt: report.createdAt || new Date().toISOString(),
      });

      reports.unshift(newReport);
      saveReports(reports);

      sendJson(res, 201, { report: newReport, existing: false });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Failed to save report." });
      return;
    }
  }

  // 13. Reports: CSV Export
  if (req.method === "GET" && req.url === "/api/reports/export-csv") {
    try {
      const reports = loadReports();

      function escapeCsv(val) {
        if (val === null || val === undefined) return '""';
        const str = Array.isArray(val) ? val.join("; ") : String(val);
        return `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      }

      const headers = [
        "Crisis ID",
        "Disaster Type",
        "Location",
        "Latitude",
        "Longitude",
        "User Contact",
        "Submission Time",
        "People Affected",
        "Deaths",
        "Injured",
        "Trapped",
        "Extracted Emergency Needs",
        "RoBERTa Classification",
        "Confidence",
        "Priority Level",
        "Priority Rating",
        "Actionability Score",
        "Completeness Score",
        "Missing Details",
        "Current Status",
        "Accepted Time",
        "In Progress Time",
        "Completed Time",
        "Original Message",
      ];

      const rows = reports.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.disaster || r.type || "General Emergency"),
        escapeCsv(r.location || "Not Detected"),
        escapeCsv(r.lat || r.latitude || ""),
        escapeCsv(r.lng || r.longitude || ""),
        escapeCsv(r.contact || r.phone || ""),
        escapeCsv(r.time || r.timestamp || r.createdAt || ""),
        escapeCsv(r.peopleAffected || r.people || "None Reported"),
        escapeCsv(r.deaths || "None Reported"),
        escapeCsv(r.injured || "None Reported"),
        escapeCsv(r.trapped || "None Reported"),
        escapeCsv(r.specificNeeds || r.need || r.specificNeed || "No specific needs detected"),
        escapeCsv(r.modelCategory || r.model_category || "Classification unavailable"),
        escapeCsv(r.confidence != null ? `${r.confidence}%` : "Unavailable"),
        escapeCsv(r.priority || r.priority_level || "Standard"),
        escapeCsv(r.priorityScore ?? r.score ?? 0),
        escapeCsv(r.actionabilityScore ?? "N/A"),
        escapeCsv(r.completenessScore ?? "N/A"),
        escapeCsv(r.missingFields || []),
        escapeCsv((r.status || "PENDING").toUpperCase()),
        escapeCsv(r.acceptedAt || ""),
        escapeCsv(r.inProgressAt || ""),
        escapeCsv(r.completedAt || ""),
        escapeCsv(r.message || ""),
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=crisentra_crisis_logs_${new Date().toISOString().slice(0, 10)}.csv`,
        "Access-Control-Allow-Origin": "*",
      });
      res.end(csvContent);
      return;
    } catch (error) {
      console.error("CSV Export error:", error);
      sendJson(res, 500, { error: "Failed to export CSV." });
      return;
    }
  }

  // 14. Reports: PATCH Incident Status Update Route
  if (req.method === "PATCH" && req.url.startsWith("/api/reports/")) {
    try {
      const rawUrl = req.url.split("?")[0];
      let reportId = "";
      let isCompleteShortcut = false;

      if (rawUrl.endsWith("/complete")) {
        reportId = decodeURIComponent(rawUrl.replace("/api/reports/", "").replace("/complete", ""));
        isCompleteShortcut = true;
      } else {
        reportId = decodeURIComponent(rawUrl.replace("/api/reports/", ""));
      }

      if (!reportId || reportId.includes("/")) {
        sendJson(res, 400, { error: "Valid report ID is required." });
        return;
      }

      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");
      const reports = loadReports();

      let index = reports.findIndex(
        (item) => String(item?.id ?? "").trim() === String(reportId).trim()
      );

      const now = new Date().toISOString();
      let report;

      if (index === -1) {
        report = {
          id: reportId,
          disaster: "General Emergency",
          location: "Assigned Location",
          status: "accepted",
          createdAt: now,
          updatedAt: now,
        };
        reports.unshift(report);
        index = 0;
      } else {
        report = { ...reports[index] };
      }

      if (isCompleteShortcut) {
        report.status = "completed";
        report.completedAt = now;
        report.responseNote = "The rescue team has completed the response to this crisis.";
      } else if (data.action) {
        const action = data.action;
        if (!["accepted", "in_progress", "completed", "note"].includes(action)) {
          sendJson(res, 400, { error: "Invalid action." });
          return;
        }

        if (action === "accepted") {
          report.status = "accepted";
          report.acceptedAt = now;
          report.responseNote = "The rescue team has accepted this crisis report.";
        } else if (action === "in_progress") {
          report.status = "in_progress";
          report.inProgressAt = now;
          report.responseNote = "The rescue team has started responding to this crisis.";
        } else if (action === "completed") {
          report.status = "completed";
          report.completedAt = now;
          report.responseNote = "The rescue team has completed the response to this crisis.";
        } else if (action === "note") {
          const note = String(data.note || "").trim();
          if (!note) {
            sendJson(res, 400, { error: "Response note is required." });
            return;
          }
          report.responseNote = note;
          report.responseNotes = [
            ...(Array.isArray(report.responseNotes) ? report.responseNotes : []),
            { note, createdAt: now },
          ];
        }
      } else {
        // Direct field edit / update
        Object.assign(report, data);
      }

      report.updatedAt = now;
      reports[index] = hydrateReport(report);
      saveReports(reports);

      sendJson(res, 200, { message: "Incident updated successfully.", report });
      return;
    } catch (error) {
      console.error("Report patch error:", error);
      sendJson(res, 500, { error: "Failed to update report." });
      return;
    }
  }

  // 15. Feedback: GET, POST, PATCH
  if (req.method === "GET" && req.url === "/api/feedback") {
    try {
      const items = loadFeedback();
      sendJson(res, 200, { feedback: items });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Failed to load feedback." });
      return;
    }
  }

  if (req.method === "POST" && req.url === "/api/feedback") {
    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const crisisId = String(parsed.crisisId || "").trim();
      const rating = Number(parsed.rating || 5);
      const feedbackText = String(parsed.feedbackText || parsed.text || "").trim();
      const userId = String(parsed.userId || "anonymous").trim();

      if (!crisisId || !feedbackText) {
        sendJson(res, 400, { error: "Crisis ID and feedback text are required." });
        return;
      }

      const items = loadFeedback();
      const newFeedback = {
        id: `FB-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
        crisisId,
        userId,
        rating: Math.max(1, Math.min(5, rating)),
        feedbackText,
        status: "pending",
        reviewStatus: "unreviewed",
        rescueResponse: null,
        rescueResponseAt: null,
        createdAt: new Date().toISOString(),
      };

      items.unshift(newFeedback);
      saveFeedback(items);

      sendJson(res, 201, { success: true, feedback: newFeedback });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Failed to save feedback." });
      return;
    }
  }

  if (req.method === "PATCH" && req.url.startsWith("/api/feedback/")) {
    try {
      const feedbackId = decodeURIComponent(req.url.replace("/api/feedback/", "").split("?")[0]);
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");

      const items = loadFeedback();
      const index = items.findIndex((f) => String(f.id) === String(feedbackId));

      if (index === -1) {
        sendJson(res, 404, { error: "Feedback not found." });
        return;
      }

      const item = { ...items[index] };
      const now = new Date().toISOString();

      if (parsed.action === "review" || parsed.markReviewed) {
        item.status = "reviewed";
        item.reviewStatus = "reviewed";
        item.reviewedAt = now;
      }

      if (parsed.action === "response" || parsed.rescueResponse) {
        item.rescueResponse = String(parsed.rescueResponse || parsed.responseText || "").trim();
        item.rescueResponseAt = now;
        item.status = "reviewed";
        item.reviewStatus = "reviewed";
      }

      item.updatedAt = now;
      items[index] = item;
      saveFeedback(items);

      sendJson(res, 200, { success: true, feedback: item });
      return;
    } catch (error) {
      sendJson(res, 500, { error: "Failed to update feedback." });
      return;
    }
  }

  // Fallback 404
  sendJson(res, 404, { error: "Endpoint not found." });
});

/* ============================================================
   START SERVER
   ============================================================ */

server.listen(PORT, () => {
  console.log("");
  console.log("==============================================");
  console.log("CRISENTRA AI SECURE ENGINE & API");
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`Python: ${PYTHON_COMMAND}`);
  console.log("==============================================");
  console.log("");
});
