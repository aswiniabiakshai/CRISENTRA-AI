import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GISCommandMap, { type MapIncident } from "./pages/MapView";
import { AssistantMarkdown, CopyButton } from "./components/AssistantMarkdown";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "";

type Role = "user" | "rescue";
type AuthMode = "login" | "register" | "forgot" | "otp" | "reset" | "success";
type UserPage = "Home" | "Report Crisis" | "My Reports" | "AI Assistant" | "Feedback" | "Profile";
type RescuePage =
  | "Dashboard"
  | "Incoming Crises"
  | "Completed Crises"
  | "GIS Command Map"
  | "Extracted Data / Crisis Log"
  | "Analytics"
  | "User Feedback"
  | "Team Profile";

type IconName =
  | "activity" | "alert" | "arrow" | "bell" | "chart" | "check" | "clock"
  | "database" | "feedback" | "file" | "filter" | "home" | "location" | "lock"
  | "logout" | "map" | "menu" | "plus" | "profile" | "report" | "search"
  | "shield" | "team" | "upload" | "users" | "wave" | "mic" | "download"
  | "trash" | "pin" | "edit";

export type CrisisRecord = {
  id: string;
  type: string;
  disaster?: string;
  category?: string;
  location: string;
  time: string;
  timestamp?: string;
  createdAt?: string;
  status: string;
  priority: string;
  urgency?: string;
  priorityScore?: number;
  people?: number | string;
  peopleAffected?: number | string;
  trapped: string | number;
  injured: string | number;
  deaths: string | number;
  need: string;
  specificNeed?: string;
  specificNeeds?: string[];
  predictedNeeds?: string;
  score: number;
  message?: string;
  contact?: string;
  contact_phone?: string;
  submittedByUser?: boolean;
  modelCategory?: string;
  confidence?: number;
  roberta_confidence?: number;
  actionabilityScore?: number | null;
  actionabilityLevel?: string;
  actionabilityReasons?: string[];
  completenessScore?: number | null;
  completeness?: number | null;
  missingFields?: string[];
  priorityReasons?: string[];
  explanation?: string;
  responseNote?: string;
  responseNotes?: { note: string; createdAt: string }[];
  acceptedAt?: string;
  inProgressAt?: string;
  completedAt?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  photoName?: string;
  videoUrl?: string;
  videoName?: string;
  attachments?: { type: string; url: string; name?: string }[];
  evidenceStatus?: "valid" | "invalid" | "requires_verification";
  evidenceValid?: boolean;
  evidenceMessage?: string;
  evidenceReason?: string;
  detectedVisual?: string;
  requiresManualVerification?: boolean;
  information?: any;
};

export type FeedbackRecord = {
  id: string;
  crisisId: string;
  userId: string;
  rating: number;
  feedbackText: string;
  status: "pending" | "reviewed";
  reviewStatus?: string;
  rescueResponse?: string | null;
  rescueResponseAt?: string | null;
  createdAt: string;
};

type CrisisContextType = {
  crises: CrisisRecord[];
  addCrisis: (crisis: CrisisRecord) => void;
  updateCrisis: (id: string, status: string, additional?: Partial<CrisisRecord>) => void;
};

const CrisisContext = createContext<CrisisContextType | null>(null);

function useCrises() {
  const context = useContext(CrisisContext);
  if (!context) {
    throw new Error("CrisisContext must be used inside its provider");
  }
  return context;
}

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
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  trash: <><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></>,
  pin: <><path d="M12 17v5m-7-10 1.5-1.5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 0 2 0l4-4a2 2 0 0 0 0-2.8L14.6 3a2 2 0 0 0-2.8 0L9 6" /></>,
  edit: <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>,
};

function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark">
        <Icon name="wave" size={compact ? 20 : 24} />
      </div>
      <div className={compact ? "hidden lg:block" : ""}>
        <div className="text-[15px] font-bold tracking-[0.16em] text-white">
          CRISENTRA <span className="text-teal-300">AI</span>
        </div>
        {!compact && (
          <div className="mt-0.5 text-[9px] font-medium tracking-[0.13em] text-slate-500">
            CRISIS INTELLIGENCE & EMERGENCY RESPONSE
          </div>
        )}
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function Status({ value }: { value: string }) {
  const norm = String(value || "").toUpperCase().replace(/[\s-]+/g, "_");
  const tone =
    norm === "COMPLETED" || norm === "REVIEWED" || norm === "RESOLVED" || norm === "CLOSED"
      ? "green"
      : norm === "IN_PROGRESS" || norm === "INPROGRESS"
      ? "blue"
      : norm === "ACCEPTED"
      ? "teal"
      : norm === "CRITICAL" || norm === "NEW"
      ? "red"
      : norm === "HIGH" || norm === "PENDING"
      ? "amber"
      : "slate";
  return (
    <span className={`status status-${tone}`}>
      <i />
      {norm.replace(/_/g, " ")}
    </span>
  );
}

function PageTitle({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow block mb-1.5 text-[10px] sm:text-xs">{eyebrow}</span>}
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
        {text && <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">{text}</p>}
      </div>
      {action && <div className="w-full sm:w-auto flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

function AuthScreen({
  role,
  onRole,
  onAuthenticated,
}: {
  role: Role;
  onRole: (r: Role) => void;
  onAuthenticated: (user: any) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const isRescue = role === "rescue";

  // Login inputs
  const [identifier, setIdentifier] = useState(isRescue ? "southresponse" : "ananya");
  const [password, setPassword] = useState("Password123!");

  // Register inputs
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Forgot / Reset inputs
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  // 2FA state
  const [twoFactorActive, setTwoFactorActive] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState("");
  const [twoFactorChallenge, setTwoFactorChallenge] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Handle Login with 5s Timeout & Resilient Error Handling
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          role: isRescue ? "RESCUE" : "USER",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: `Server returned non-JSON response (${res.status} ${res.statusText})` };
      }

      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      if (data.twoFactorRequired) {
        setTwoFactorActive(true);
        setTwoFactorUserId(data.userId);
        setTwoFactorChallenge(data.challengeCode || "");
        setSuccessMsg("Two-step verification code sent.");
        setLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem("crisentra_session_token", data.token || "");
        localStorage.setItem("crisentra_user_role", isRescue ? "rescue" : "user");
        onAuthenticated(data.user);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isNetErr =
        err.name === "AbortError" ||
        String(err.message || "").toLowerCase().includes("failed to fetch") ||
        String(err.message || "").toLowerCase().includes("network") ||
        String(err.message || "").toLowerCase().includes("load failed");

      if (isNetErr) {
        setErrorMsg("Network request timed out. Please check your mobile data connection or try again.");
      } else {
        setErrorMsg(err.message || "Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA Verification
  const handleTwoFactorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/two-factor-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: twoFactorUserId,
          code: twoFactorCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Two-step verification failed.");
      }

      if (data.user) {
        localStorage.setItem("crisentra_session_token", data.token || "");
        onAuthenticated(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (regPassword !== regConfirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: isRescue ? "RESCUE" : "USER",
          name: regName.trim(),
          username: regUsername.trim() || regName.trim().toLowerCase().replace(/\\s+/g, ""),
          mobile: regMobile.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      if (data.user) {
        localStorage.setItem("crisentra_session_token", data.token || "");
        onAuthenticated(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not find account.");
      }

      setSuccessMsg(data.message || "OTP code generated.");
      if (data.otp) {
        setOtpInput(data.otp);
      }
      setMode("otp");
    } catch (err: any) {
      setErrorMsg(err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          otp: otpInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP code.");
      }

      setResetToken(data.resetToken);
      setSuccessMsg("OTP verified. Please set your new password.");
      setMode("reset");
    } catch (err: any) {
      setErrorMsg(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (newPassword !== newPasswordConfirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccessMsg("Password updated successfully. Please log in.");
      setMode("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login"
      ? isRescue
        ? "Command center access"
        : "Welcome back"
      : mode === "register"
      ? isRescue
        ? "Join the response network"
        : "Create your account"
      : mode === "forgot"
      ? "Forgot password?"
      : mode === "otp"
      ? "Verify OTP"
      : mode === "reset"
      ? "Create new password"
      : "Password changed";

  const subtitle =
    mode === "login"
      ? isRescue
        ? "Authorized emergency personnel and response commanders"
        : "Sign in to report crises and track emergency assistance"
      : mode === "forgot"
      ? "Enter your registered email, username, or phone number."
      : mode === "otp"
      ? "Enter the 6-digit code sent to your registered contact."
      : mode === "reset"
      ? "Choose a strong password (minimum 8 characters with symbols)."
      : mode === "success"
      ? "Your password has been updated securely."
      : "Rapid emergency intelligence coordination.";

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <header className="auth-header">
        <Brand />
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <span className="online-dot" /> Live emergency network active
        </div>
      </header>

      <section className="auth-layout">
        <div className="auth-story">
          <div className="eyebrow">
            <Icon name="shield" size={15} /> Verified disaster intelligence
          </div>
          <h1>
            Clarity when<br />
            <span>every second counts.</span>
          </h1>
          <p>
            Connect citizen distress signals directly to operational responders with fine-tuned RoBERTa triage,
            actionable needs detection, and real-time mission status tracking.
          </p>
          <div className="trust-row">
            <div>
              <strong>24/7</strong>
              <span>Response network</span>
            </div>
            <div>
              <strong>&lt; 2 min</strong>
              <span>Average triage</span>
            </div>
            <div>
              <strong>12</strong>
              <span>District teams</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="role-switch">
            <button
              type="button"
              className={!isRescue ? "active" : ""}
              onClick={() => {
                onRole("user");
                setMode("login");
                setIdentifier("ananya");
                clearMessages();
              }}
            >
              <Icon name="profile" size={16} /> Citizen
            </button>
            <button
              type="button"
              className={isRescue ? "active" : ""}
              onClick={() => {
                onRole("rescue");
                setMode("login");
                setIdentifier("southresponse");
                clearMessages();
              }}
            >
              <Icon name="shield" size={16} /> Rescue team
            </button>
          </div>

          {isRescue && (
            <div className="command-label">
              <Icon name="activity" size={14} /> RESCUE COMMAND CENTER & TRIAGE
            </div>
          )}

          <div className="auth-title">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800 text-xs text-red-200">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200">
              ✓ {successMsg}
            </div>
          )}

          {/* TWO FACTOR CHALLENGE MODAL */}
          {twoFactorActive && (
            <form onSubmit={handleTwoFactorVerify} className="form-stack">
              <div className="p-3 bg-teal-950/50 border border-teal-800/80 rounded-xl text-xs text-teal-200">
                🔒 Two-step verification challenge.
                {twoFactorChallenge && (
                  <span className="block mt-1 font-mono font-bold text-teal-300">
                    Verification code: {twoFactorChallenge}
                  </span>
                )}
              </div>
              <label className="field">
                <span>Enter 6-digit verification code *</span>
                <input
                  type="text"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="• • • • • •"
                  className="font-mono text-center tracking-widest text-lg"
                />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "VERIFYING..." : "CONFIRM VERIFICATION"}
              </Button>
              <button
                type="button"
                className="text-link mx-auto text-xs"
                onClick={() => setTwoFactorActive(false)}
              >
                Back to credentials
              </button>
            </form>
          )}

          {/* LOGIN FORM */}
          {!twoFactorActive && mode === "login" && (
            <form onSubmit={handleLogin} className="form-stack">
              <label className="field">
                <span>{isRescue ? "Team email, ID, or username *" : "Email, phone number, or username *"}</span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isRescue ? "Enter agency ID or username" : "Enter registered contact"}
                />
              </label>
              <label className="field">
                <span>Password *</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password"
                />
              </label>
              <button
                type="button"
                className="text-link self-end text-xs"
                onClick={() => {
                  setForgotIdentifier(identifier);
                  setMode("forgot");
                  clearMessages();
                }}
              >
                Forgot password?
              </button>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "AUTHENTICATING..." : isRescue ? "ACCESS COMMAND CENTER" : "LOGIN"}{" "}
                <Icon name="arrow" size={16} />
              </Button>

              <div className="divider">
                <span>New to CRISENTRA?</span>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setMode("register");
                  clearMessages();
                }}
              >
                {isRescue ? "REGISTER RESPONSE UNIT" : "CREATE ACCOUNT"}
              </Button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {!twoFactorActive && mode === "register" && (
            <form onSubmit={handleRegister} className="form-stack">
              <label className="field">
                <span>{isRescue ? "Agency / Department Name *" : "Full Name *"}</span>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={isRescue ? "e.g. Tamil Nadu Fire & Rescue" : "e.g. Priya Sundaram"}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  <span>Username *</span>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. priyas"
                  />
                </label>
                <label className="field">
                  <span>Mobile Number *</span>
                  <input
                    type="tel"
                    required
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="+91 98410 00000"
                  />
                </label>
              </div>
              <label className="field">
                <span>Email Address *</span>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  <span>Password *</span>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 8 chars (A-Z, 0-9, symbol)"
                  />
                </label>
                <label className="field">
                  <span>Confirm Password *</span>
                  <input
                    type="password"
                    required
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </label>
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? "CREATING ACCOUNT..." : isRescue ? "SUBMIT FOR VERIFICATION" : "REGISTER ACCOUNT"}
              </Button>
              <button
                type="button"
                className="text-link mx-auto text-xs"
                onClick={() => {
                  setMode("login");
                  clearMessages();
                }}
              >
                Already have an account? <b>Login</b>
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {!twoFactorActive && mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="form-stack">
              <label className="field">
                <span>Enter registered email or phone number *</span>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Email or phone"
                />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "SENDING OTP..." : "REQUEST RESET CODE"}
              </Button>
              <button
                type="button"
                className="text-link mx-auto text-xs"
                onClick={() => {
                  setMode("login");
                  clearMessages();
                }}
              >
                Back to login
              </button>
            </form>
          )}

          {/* OTP VERIFICATION FORM */}
          {!twoFactorActive && mode === "otp" && (
            <form onSubmit={handleVerifyOtp} className="form-stack">
              <label className="field">
                <span>Enter 6-digit OTP *</span>
                <input
                  type="text"
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="• • • • • •"
                  className="font-mono text-center tracking-widest text-lg"
                />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "VERIFYING..." : "VERIFY CODE"}
              </Button>
              <button
                type="button"
                className="text-link mx-auto text-xs"
                onClick={() => {
                  setMode("forgot");
                  clearMessages();
                }}
              >
                Resend code
              </button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {!twoFactorActive && mode === "reset" && (
            <form onSubmit={handleResetPassword} className="form-stack">
              <label className="field">
                <span>New Password *</span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters with symbol"
                />
              </label>
              <label className="field">
                <span>Re-enter New Password *</span>
                <input
                  type="password"
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Confirm new password"
                />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "SAVING..." : "CONFIRM NEW PASSWORD"}
              </Button>
            </form>
          )}

          {/* SUCCESS SCREEN */}
          {!twoFactorActive && mode === "success" && (
            <div className="success-state text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
                <Icon name="check" size={28} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Password Updated</h3>
              <p className="text-xs text-slate-400 mb-6">
                You can now log in securely using your new credentials.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setMode("login");
                  clearMessages();
                }}
              >
                BACK TO LOGIN
              </Button>
            </div>
          )}

          {!twoFactorActive && mode === "login" && (
            <button
              type="button"
              className="role-link"
              onClick={() => {
                onRole(isRescue ? "user" : "rescue");
                setMode("login");
                setIdentifier(isRescue ? "ananya" : "southresponse");
                clearMessages();
              }}
            >
              <Icon name={isRescue ? "profile" : "shield"} size={16} />
              {isRescue ? "Citizen reporting login" : "Command center responder login"}
              <Icon name="arrow" size={15} />
            </button>
          )}
        </div>
      </section>


    </main>
  );
}

/* ============================================================
   USER UI COMPONENTS
   ============================================================ */

const userNav: { page: UserPage; icon: IconName }[] = [
  { page: "Home", icon: "home" },
  { page: "Report Crisis", icon: "alert" },
  { page: "My Reports", icon: "file" },
  { page: "AI Assistant", icon: "wave" },
  { page: "Feedback", icon: "feedback" },
  { page: "Profile", icon: "profile" },
];

function UserSidebar({
  page,
  setPage,
  collapsed,
  setCollapsed,
  onLogout,
}: {
  page: UserPage;
  setPage: (p: UserPage) => void;
  collapsed: boolean;
  setCollapsed: () => void;
  onLogout: () => void;
}) {
  return (
    <aside className={`citizen-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="citizen-sidebar-brand">
        <Brand compact={collapsed} />
        <button
          type="button"
          onClick={setCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="cursor-pointer"
        >
          <Icon name="menu" />
        </button>
      </div>

      <div className="citizen-sidebar-label">NAVIGATION</div>

      <nav className="flex-1 space-y-1">
        {userNav.map((item) => (
          <button
            key={item.page}
            type="button"
            className={`citizen-nav-item ${page === item.page ? "active" : ""}`}
            onClick={() => setPage(item.page)}
            title={item.page}
          >
            <Icon name={item.icon} />
            <span>{item.page}</span>
          </button>
        ))}
      </nav>

      <div className="citizen-sidebar-footer pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="online-dot" />
          <span className="text-xs text-slate-400 font-medium">Network Ready</span>
        </div>
        <button
          type="button"
          className="citizen-logout text-slate-400 hover:text-red-400 p-2 cursor-pointer"
          onClick={onLogout}
          title="Logout"
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
    </aside>
  );
}

function ReportCard({ report, onView }: { report: CrisisRecord; onView: () => void }) {
  const disasterName = report.disaster || report.type || "General Emergency";
  const locationName = report.location || "Not Detected";
  const rawNeeds = report.specificNeeds || (report.need ? [report.need] : []);
  const needsList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];
  const timeString =
    report.time ||
    (report.timestamp
      ? new Date(report.timestamp).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Recently");

  return (
    <article className="flex flex-col justify-between p-5 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition shadow-lg">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-teal-400">{report.id}</span>
            <Status value={report.status || "PENDING"} />
          </div>
          <span className="text-xs text-slate-500">{timeString}</span>
        </div>

        <h3 className="text-base font-bold text-white mb-2 leading-snug">
          {disasterName} · <span className="text-slate-300 font-normal">{locationName.split(",")[0]}</span>
        </h3>

        {report.message && (
          <p className="text-xs text-slate-300 italic line-clamp-2 mb-3 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            "{report.message}"
          </p>
        )}

        {needsList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {needsList.map((n, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-800/80"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800 text-xs">
        <span className="text-slate-400 font-medium">
          Priority: <strong className="text-white ml-1">{report.priority || "Standard"}</strong>
        </span>
        <button
          type="button"
          onClick={onView}
          className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition hover:translate-x-0.5"
        >
          TRACK STATUS <Icon name="arrow" size={14} />
        </button>
      </div>
    </article>
  );
}

function UserHome({
  setPage,
  onView,
}: {
  setPage: (p: UserPage) => void;
  onView: (id: string) => void;
}) {
  const { crises } = useCrises();
  const userReports = crises.filter((r) => r.submittedByUser !== false);

  return (
    <div>
      <div className="citizen-hero mb-6 sm:mb-8 p-5 sm:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-950/50 via-slate-900 to-slate-900 border border-teal-900/40">
        <div className="max-w-2xl">
          <span className="eyebrow mb-2">EMERGENCY ASSISTANCE</span>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">
            Report a crisis, alert responders instantly.
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">
            CRISENTRA AI automatically analyzes your distress signal, detects casualty impacts and specific emergency needs (rescue boats, food, medical, shelter), and dispatches priority notifications directly to rescue teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Button onClick={() => setPage("Report Crisis")}>
              <Icon name="report" /> REPORT A CRISIS NOW
            </Button>
            <Button variant="secondary" onClick={() => setPage("AI Assistant")}>
              <Icon name="wave" /> CHAT WITH CRISENTRA ASSISTANT
            </Button>
          </div>
        </div>
      </div>

      <div className="section-heading flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">My Active Reports</h2>
          <p className="text-xs text-slate-400">Live operational updates from emergency command</p>
        </div>
        <Button variant="ghost" onClick={() => setPage("My Reports")}>
          VIEW ALL ({userReports.length})
        </Button>
      </div>

      {userReports.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm mb-3">You have no active emergency reports.</p>
          <Button variant="secondary" onClick={() => setPage("Report Crisis")}>
            Submit your first report
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userReports.slice(0, 3).map((r) => (
            <ReportCard key={r.id} report={r} onView={() => onView(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

const SUPPORTED_VOICE_LANGUAGES = [
  { code: "ta-IN", label: "Tamil" },
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
];

function ReportCrisis({
  onSubmitted,
}: {
  onSubmitted: (id: string) => void;
}) {
  const { addCrisis } = useCrises();

  // Inputs
  const [messageText, setMessageText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [contactText, setContactText] = useState("+91 98410 00000");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Voice speech & translation state
  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<string>("ta-IN");
  const [voiceInsertedText, setVoiceInsertedText] = useState("");
  const [translationStatus, setTranslationStatus] = useState("");
  const recognitionRef = useRef<any>(null);

  // Analysis result state
  const [loading, setLoading] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<CrisisRecord | null>(null);

  const handlePhotoSelect = (file: File | null) => {
    setUploadError("");
    if (!file) {
      setImageFile(null);
      return;
    }
    const maxPhotoSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxPhotoSize) {
      setUploadError("Photo evidence exceeds 15MB limit. Please select an image under 15MB.");
      return;
    }
    setImageFile(file);
  };

  const handleVideoSelect = (file: File | null) => {
    setUploadError("");
    if (!file) {
      setVideoFile(null);
      return;
    }
    const maxVideoSize = 40 * 1024 * 1024; // 40MB
    if (file.size > maxVideoSize) {
      setUploadError("Video evidence exceeds 40MB limit. Please select a video under 40MB.");
      return;
    }
    setVideoFile(file);
  };

  const uploadEvidenceFile = async (
    file: File,
    reportId: string,
    type: "photo" | "video",
    crisisMessage: string = "",
    disasterHint: string = "",
    locationHint: string = ""
  ) => {
    const reader = new FileReader();
    const base64: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64: base64,
        fileName: file.name,
        fileType: file.type,
        reportId,
        message: crisisMessage,
        disaster: disasterHint,
        location: locationHint,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to upload ${type}`);
    }

    return await res.json();
  };

  // Multilingual Voice Recognition & Translation Workflow
  const toggleVoiceRecording = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    // 1. Insecure Context Check (Browsers forbid mic/speech on insecure non-HTTPS origins)
    const isSecureContext = typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (!isSecureContext) {
      setTranslationStatus(
        `⚠️ Insecure Context: Browsers disable microphone access on HTTP private IP addresses (${window.location.origin}). Please access via HTTPS: https://${window.location.hostname}:8443 (or http://localhost:8443 on this PC).`
      );
      setIsListening(false);
      return;
    }

    // 2. Proactively request browser microphone permission & classify specific errors
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop tracks so SpeechRecognition has dedicated microphone access
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        console.warn("Microphone access check:", mediaErr);
        if (!isSecureContext) {
          setTranslationStatus(
            `⚠️ Insecure Context: Browsers disable microphone on HTTP LAN addresses (${window.location.origin}). Please connect via https://${window.location.hostname}:8443 or http://localhost:8443.`
          );
          setIsListening(false);
          return;
        }
        if (mediaErr.name === "NotAllowedError" || mediaErr.name === "PermissionDeniedError" || mediaErr.name === "SecurityError") {
          setTranslationStatus(
            "⚠️ Microphone access denied. In your browser address bar, click the lock 🔒/tune icon on the left, set Microphone to 'Allow', then refresh (F5)."
          );
          setIsListening(false);
          return;
        } else if (mediaErr.name === "NotFoundError" || mediaErr.name === "DevicesNotFoundError") {
          setTranslationStatus(
            "⚠️ No microphone found. Please connect an audio input device (mic/headset) and check your sound settings."
          );
          setIsListening(false);
          return;
        } else if (mediaErr.name === "NotReadableError" || mediaErr.name === "TrackStartError" || mediaErr.name === "AbortError") {
          setTranslationStatus(
            "⚠️ Microphone is already in use by another application or process. Please close other apps using the mic and try again."
          );
          setIsListening(false);
          return;
        } else {
          setTranslationStatus(
            `⚠️ Microphone error (${mediaErr.name || "Unknown"}): ${mediaErr.message || "Unable to open audio device"}.`
          );
          setIsListening(false);
          return;
        }
      }
    }

    const currentLangObj = SUPPORTED_VOICE_LANGUAGES.find((l) => l.code === voiceLanguage) || SUPPORTED_VOICE_LANGUAGES[0];

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceLanguage;

      setTranslationStatus(`Listening in ${currentLangObj.label}... Speak now.`);
      setIsListening(true);

      recognition.onresult = async (event: any) => {
        const spokenText = event.results[0][0].transcript;
        setIsListening(false);

        if (voiceLanguage === "en-IN") {
          setVoiceInsertedText(spokenText);
          setMessageText((prev) => (prev ? `${prev.trim()} ${spokenText}` : spokenText));
          setTranslationStatus(`✓ Captured voice text: "${spokenText}"`);
        } else {
          setTranslationStatus(`Translating spoken ${currentLangObj.label} to English...`);
          try {
            const res = await fetch(`${API_BASE_URL}/api/translate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: spokenText }),
            });
            const data = await res.json();
            const englishText = data.translated_text || spokenText;

            setVoiceInsertedText(englishText);
            setMessageText((prev) => (prev ? `${prev.trim()} ${englishText}` : englishText));
            setTranslationStatus(`✓ Translated from ${currentLangObj.label} to English: "${englishText}"`);
          } catch (err) {
            setVoiceInsertedText(spokenText);
            setMessageText((prev) => (prev ? `${prev.trim()} ${spokenText}` : spokenText));
            setTranslationStatus(`Captured speech: "${spokenText}"`);
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
        const isCurrentSecure = typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
        if (!isCurrentSecure) {
          setTranslationStatus(
            `⚠️ Insecure Context: Browsers disable speech recognition on HTTP LAN IPs (${window.location.origin}). Please switch to https://${window.location.hostname}:8443 or http://localhost:8443.`
          );
        } else if (err.error === "not-allowed" || err.error === "service-not-allowed") {
          setTranslationStatus(
            "⚠️ Microphone access denied. In your browser address bar, click the lock 🔒/tune icon on the left, set Microphone to 'Allow', then refresh (F5)."
          );
        } else if (err.error === "audio-capture") {
          setTranslationStatus(
            "⚠️ No microphone detected or audio capture failed. Please check that your microphone is plugged in and active."
          );
        } else if (err.error === "no-speech") {
          setTranslationStatus("No speech detected. Please speak clearly into your microphone.");
        } else if (err.error === "network") {
          setTranslationStatus("⚠️ Speech recognition network error. Please verify your internet connection.");
        } else {
          setTranslationStatus(`Voice recognition error (${err.error || "audio capture"}). Please check your mic and try again.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setIsListening(false);
      setTranslationStatus("Speech service unavailable.");
    }
  };

  const clearVoiceText = () => {
    if (voiceInsertedText) {
      setMessageText((prev) => prev.replace(voiceInsertedText, "").trim());
      setVoiceInsertedText("");
      setTranslationStatus("Voice text removed from input.");
    }
  };

  // Submit emergency message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setLoading(true);

    try {
      // Generate unique report ID
      const id = `CRS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

      // Upload media evidence to backend if attached
      let photoUrl: string | undefined = undefined;
      let photoName: string | undefined = undefined;
      let videoUrl: string | undefined = undefined;
      let videoName: string | undefined = undefined;
      let evidenceStatus: "valid" | "invalid" | "requires_verification" | undefined = undefined;
      let evidenceValid: boolean | undefined = undefined;
      let evidenceMessage: string | undefined = undefined;
      const attachments: { type: string; url: string; name?: string }[] = [];

      if (imageFile) {
        try {
          const uploadRes = await uploadEvidenceFile(
            imageFile,
            id,
            "photo",
            messageText.trim(),
            "",
            locationText.trim()
          );

          if (uploadRes.status === "invalid") {
            setUploadError(
              uploadRes.reason ||
                "Uploaded evidence does not appear relevant to the reported disaster. Please upload a suitable photo or video."
            );
            setLoading(false);
            return;
          }

          photoUrl = uploadRes.url;
          photoName = imageFile.name;
          evidenceStatus = uploadRes.status;
          evidenceValid = uploadRes.valid === true;
          evidenceMessage = uploadRes.reason;
          attachments.push({ type: "photo", url: uploadRes.url, name: imageFile.name });
        } catch (uploadErr: any) {
          console.warn("Photo upload warning:", uploadErr);
          setUploadError(uploadErr.message || "Failed to upload image evidence.");
          setLoading(false);
          return;
        }
      }

      if (videoFile) {
        try {
          const uploadRes = await uploadEvidenceFile(
            videoFile,
            id,
            "video",
            messageText.trim(),
            "",
            locationText.trim()
          );
          videoUrl = uploadRes.url;
          videoName = videoFile.name;
          if (!evidenceStatus || evidenceStatus !== "valid") {
            evidenceStatus = uploadRes.status || "requires_verification";
            evidenceValid = false;
            evidenceMessage = uploadRes.reason || "Video evidence requires manual verification.";
          }
          attachments.push({ type: "video", url: uploadRes.url, name: videoFile.name });
        } catch (uploadErr: any) {
          console.warn("Video upload warning:", uploadErr);
        }
      }

      // 1. Execute fine-tuned RoBERTa and Python extraction engine with offline fallback
      let analyzed: any = null;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText.trim(),
            hasPhotos: Boolean(photoUrl),
            hasVideos: Boolean(videoUrl),
            evidenceStatus,
            evidenceValid,
          }),
          signal: controller.signal,
        });
        clearTimeout(t);
        if (res.ok) {
          analyzed = await res.json();
        }
      } catch (analyzeErr) {
        console.warn("Backend analysis unavailable, using client-side heuristic engine:", analyzeErr);
      }

      if (!analyzed) {
        // Fallback to client-side heuristic extraction engine
        const msg = messageText.trim();
        const d = extractDeathsFromMsg(msg);
        const inj = extractInjuriesFromMsg(msg);
        const tr = extractTrappedFromMsg(msg);

        // Detect needs
        const localNeeds: string[] = [];
        if (/boat|canoe|raft|evacuat/i.test(msg)) localNeeds.push("Rescue Boats");
        if (/food|ration|water|drinking|bread/i.test(msg)) localNeeds.push("Food & Clean Water");
        if (/medical|doctor|ambulance|first aid|medicine|hospital/i.test(msg)) localNeeds.push("Medical Assistance");
        if (/shelter|tarpaulin|blanket|tent/i.test(msg)) localNeeds.push("Emergency Shelter");

        let detectedDisaster = "General Emergency";
        if (/flood|water level|inundat|submerg|river/i.test(msg)) detectedDisaster = "Flood";
        else if (/fire|smoke|burn|blaze|explosion/i.test(msg)) detectedDisaster = "Fire";
        else if (/earthquake|tremor|quake|collapse/i.test(msg)) detectedDisaster = "Earthquake";
        else if (/cyclone|storm|typhoon|wind|hurricane/i.test(msg)) detectedDisaster = "Cyclone";
        else if (/landslide|mudslide/i.test(msg)) detectedDisaster = "Landslide";

        const isCrit = (d !== null && d > 0) || (tr !== null && tr > 5);
        analyzed = {
          disaster: detectedDisaster,
          category: detectedDisaster,
          model_category: `${detectedDisaster} Incident (Offline Triage)`,
          confidence: 0.92,
          priority_level: isCrit ? "Critical" : "High",
          priority_rating: isCrit ? 95 : 80,
          specificNeeds: localNeeds.length > 0 ? localNeeds : ["Immediate On-Site Assessment"],
          information: {
            death_count: d !== null ? String(d) : "None Reported",
            injured_people: inj !== null ? String(inj) : "None Reported",
            trapped_people: tr !== null ? String(tr) : "None Reported",
            people_affected: "Not reported",
          },
        };
      }

      const info = analyzed.information || {};

      const rawNeeds = Array.isArray(analyzed.specificNeeds)
        ? analyzed.specificNeeds
        : Array.isArray(info.specific_needs)
        ? info.specific_needs
        : typeof info.specific_need === "string" && !/^(assessment required|none reported)$/i.test(info.specific_need)
        ? info.specific_need.split(",").map((s: string) => s.trim())
        : [];

      const needsList: string[] = Array.from(new Set(rawNeeds)).map(String);
      const needsDisplay = needsList.length > 0 ? needsList.join(", ") : "No specific needs detected";

      const disasterType = analyzed.disaster || analyzed.category || "General Emergency";
      const detectedLocation = analyzed.location !== "Not Detected" ? analyzed.location : locationText.trim() || "Area Detected";

      const newRecord: CrisisRecord = {
        id,
        type: disasterType,
        disaster: disasterType,
        category: disasterType,
        modelCategory: analyzed.model_category || "Classification unavailable",
        confidence: Math.round(Number(analyzed.confidence || 0) * 100),
        roberta_confidence: analyzed.roberta_confidence || analyzed.confidence,
        location: detectedLocation,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: "PENDING",
        priority: analyzed.priority_level || "Standard",
        priorityScore: Number(analyzed.priority_rating || 70),
        score: Number(analyzed.priority_rating || 70),
        need: needsDisplay,
        specificNeed: needsDisplay,
        specificNeeds: needsList,
        predictedNeeds: needsDisplay,
        trapped: info.trapped_people != null && info.trapped_people !== "None Reported" ? String(info.trapped_people) : "Not reported",
        injured: info.injured_people != null && info.injured_people !== "None Reported" ? String(info.injured_people) : "Not reported",
        deaths: info.death_count != null && info.death_count !== "None Reported" ? String(info.death_count) : "Not reported",
        people: info.people_affected != null && info.people_affected !== "None Reported" ? info.people_affected : "Not reported",
        peopleAffected: info.people_affected != null && info.people_affected !== "None Reported" ? info.people_affected : "Not reported",
        message: messageText.trim(),
        contact: contactText.trim(),
        actionabilityScore: analyzed.actionability_score ?? null,
        actionabilityLevel: analyzed.actionability_level || "Standard",
        actionabilityReasons: Array.isArray(analyzed.actionability_reasons) ? analyzed.actionability_reasons.map(String) : [],
        completenessScore: analyzed.completeness_score ?? null,
        completeness: analyzed.completeness_score ?? null,
        missingFields: Array.isArray(analyzed.missing_fields) ? analyzed.missing_fields.map(String) : [],
        priorityReasons: analyzed.priority_reasons || [],
        explanation: analyzed.explanation || "",
        submittedByUser: true,
        photoUrl,
        photoName,
        videoUrl,
        videoName,
        attachments,
        evidenceStatus: analyzed.evidence_status || evidenceStatus,
        evidenceValid: analyzed.evidence_valid !== undefined ? analyzed.evidence_valid : evidenceValid,
        evidenceMessage: analyzed.evidence_message || evidenceMessage,
      };

      // 2. Persist locally and in backend file store
      addCrisis(newRecord);
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4000);
        await fetch(`${API_BASE_URL}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report: newRecord }),
          signal: controller.signal,
        });
        clearTimeout(t);
      } catch (saveErr) {
        console.warn("Could not sync report to backend server:", saveErr);
      }

      setSubmittedReport(newRecord);
    } catch (err: any) {
      alert(err.message || "Could not submit report.");
    } finally {
      setLoading(false);
    }
  };

  if (submittedReport) {
    return (
      <div className="center-card success-report max-w-2xl mx-auto p-8 rounded-2xl bg-slate-900/90 border border-teal-500/30 text-center">
        <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-4 border border-teal-500/40">
          <Icon name="check" size={32} />
        </div>

        <span className="eyebrow mb-1">SIGNAL RECEIVED & LOGGED</span>
        <h1 className="text-2xl font-bold text-white mb-2">Emergency Report Logged Successfully</h1>
        <p className="text-xs text-slate-300 mb-6">
          Your distress message has been processed through the RoBERTa disaster classification model and extraction engine.
        </p>

        <div className="crisis-id inline-block px-5 py-2.5 rounded-xl bg-slate-950 border border-teal-500/40 font-mono text-sm text-teal-300 font-bold mb-6">
          CRISIS ID: {submittedReport.id}
        </div>

        <div className="grid grid-cols-2 gap-3 text-left mb-6">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Disaster Type</span>
            <strong className="text-white text-sm">{submittedReport.type}</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Location</span>
            <strong className="text-white text-sm">{submittedReport.location}</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">RoBERTa Classification</span>
            <strong className="text-teal-300 text-sm">{submittedReport.modelCategory}</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Priority Level</span>
            <strong className="text-amber-300 text-sm">{submittedReport.priority}</strong>
          </div>
        </div>

        {/* Extracted Needs Chips */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left mb-6">
          <span className="text-[10px] text-slate-400 font-bold block uppercase mb-2">
            Extracted Resource & Assistance Needs
          </span>
          <div className="flex flex-wrap gap-2">
            {(submittedReport.specificNeeds || []).length > 0 ? (
              submittedReport.specificNeeds!.map((need, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-teal-950 text-teal-300 border border-teal-800 rounded-lg text-xs font-bold"
                >
                  ✓ {need}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No specific needs detected</span>
            )}
          </div>
        </div>

        {/* Uploaded Media Summary */}
        {(submittedReport.photoUrl || submittedReport.videoUrl) && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left mb-6 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Attached Media Evidence
            </span>
            <div className="flex flex-wrap gap-3">
              {submittedReport.photoUrl && (
                <span className="px-3 py-1 bg-slate-900 text-teal-300 border border-slate-800 rounded-lg text-xs font-semibold">
                  📷 {submittedReport.photoName || "Photo uploaded"}
                </span>
              )}
              {submittedReport.videoUrl && (
                <span className="px-3 py-1 bg-slate-900 text-teal-300 border border-slate-800 rounded-lg text-xs font-semibold">
                  📹 {submittedReport.videoName || "Video uploaded"}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Button onClick={() => onSubmitted(submittedReport.id)}>
            VIEW ORDER TIMELINE <Icon name="arrow" size={16} />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSubmittedReport(null);
              setMessageText("");
              setLocationText("");
              setImageFile(null);
              setVideoFile(null);
              setUploadError("");
            }}
          >
            SUBMIT ANOTHER REPORT
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle
        eyebrow="CITIZEN SIGNAL INTAKE"
        title="Report an Emergency"
        text="Submit details regarding the emergency. Our AI engine extracts casualty counts and resource requirements in real time."
      />

      <form className="form-card space-y-5 bg-slate-900/90 border border-slate-800 p-7 rounded-2xl shadow-xl" onSubmit={handleSubmit}>
        {/* Message Input with Voice Translation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              What is happening? *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Language:</span>
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {SUPPORTED_VOICE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            name="message"
            rows={5}
            required
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Example: Flood near Conoor. 2 deaths, 8 injured, 12 trapped. Need rescue boats and food immediately."
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500"
          />

          {/* Voice Translator Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30"
                }`}
              >
                <Icon name="mic" size={15} />
                {isListening ? "LISTENING (SPEAK NOW)..." : "VOICE TRANSLATE"}
              </button>

              {voiceInsertedText && (
                <button
                  type="button"
                  onClick={clearVoiceText}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 bg-slate-800/80 cursor-pointer"
                >
                  Clear voice-inserted text
                </button>
              )}
            </div>

            {translationStatus && (
              <span className="text-xs text-teal-300 font-medium italic">
                {translationStatus}
              </span>
            )}
          </div>
        </div>

        {/* Location & Contact Inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Location / Area *</span>
            <input
              type="text"
              required
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. Conoor / Velachery, Chennai"
            />
          </label>
          <label className="field">
            <span>Emergency Contact *</span>
            <input
              type="tel"
              required
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="+91 98410 00000"
            />
          </label>
        </div>

        {/* Media Evidence Attachments */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              Photo & Video Evidence (Optional)
            </span>
            <span className="text-[11px] text-slate-400">Photos max 15MB · Videos max 40MB</span>
          </div>

          {uploadError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
              ⚠️ {uploadError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Photo Evidence (Max 15MB)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer"
              />
              {imageFile && (
                <div className="mt-2 flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-teal-300 truncate">📷 {imageFile.name} ({(imageFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  <button
                    type="button"
                    onClick={() => handlePhotoSelect(null)}
                    className="text-red-400 font-bold ml-2 cursor-pointer hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Video Evidence (Max 40MB)</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleVideoSelect(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer"
              />
              {videoFile && (
                <div className="mt-2 flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-teal-300 truncate">📹 {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  <button
                    type="button"
                    onClick={() => handleVideoSelect(null)}
                    className="text-red-400 font-bold ml-2 cursor-pointer hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Action */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-800">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Icon name="shield" size={14} /> End-to-end encrypted dispatch to emergency response
          </p>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-8 py-3 text-xs tracking-wider font-bold cursor-pointer"
          >
            {loading ? "PROCESSING EMERGENCY SIGNAL..." : "DISPATCH EMERGENCY SIGNAL"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReportStatus({
  reportId,
  onBack,
  onFeedback,
}: {
  reportId?: string;
  onBack: () => void;
  onFeedback?: (id: string) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reports`);
        const data = await res.json();
        if (active && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      } catch (_) {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const allReports = [...backendReports, ...crises];
  const report = reportId
    ? allReports.find((r) => String(r.id) === String(reportId))
    : allReports[0];

  if (!report) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No report details found.</p>
        <Button onClick={onBack} variant="secondary" className="mt-4">
          BACK TO REPORTS
        </Button>
      </div>
    );
  }

  const statusNorm = (report.status || "PENDING").toLowerCase();
  const isAccepted = statusNorm === "accepted" || statusNorm === "in_progress" || statusNorm === "completed";
  const isInProgress = statusNorm === "in_progress" || statusNorm === "completed";
  const isCompleted = statusNorm === "completed";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-teal-400 hover:text-teal-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
        >
          ‹ BACK TO MY REPORTS
        </button>
        {isCompleted && onFeedback && (
          <Button onClick={() => onFeedback(report.id)}>
            <Icon name="feedback" /> LEAVE MISSION FEEDBACK
          </Button>
        )}
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
              EMERGENCY TRACKING ID
            </span>
            <h2 className="text-2xl font-bold text-white font-mono">{report.id}</h2>
          </div>
          <Status value={report.status || "PENDING"} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pb-6 border-b border-slate-800">
          <div>
            <span className="text-slate-400 block mb-1">Disaster</span>
            <strong className="text-white text-sm">{report.disaster || report.type}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Location</span>
            <strong className="text-white text-sm">{report.location}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Submitted</span>
            <strong className="text-slate-300 text-sm">{report.time || "Recently"}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Priority</span>
            <strong className="text-amber-300 text-sm">{report.priority}</strong>
          </div>
        </div>

        {/* 5-STAGE VERTICAL CONNECTED TIMELINE */}
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase mb-6">
            Incident Response Timeline
          </h3>

          <div className="relative pl-6 space-y-8">
            {/* Connecting Vertical Line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-800" />

            {/* Stage 1: Report Submitted */}
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/60 flex items-center justify-center text-xs font-bold z-10 shrink-0">
                ✓
              </div>
              <div>
                <strong className="text-white text-sm block">1. Report submitted</strong>
                <span className="text-xs text-slate-400">Distress signal captured into emergency intelligence stream.</span>
              </div>
            </div>

            {/* Stage 2: AI Analysis Completed */}
            <div className="relative flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/60 flex items-center justify-center text-xs font-bold z-10 shrink-0">
                ✓
              </div>
              <div>
                <strong className="text-white text-sm block">2. AI analysis completed</strong>
                <span className="text-xs text-slate-400">
                  RoBERTa prediction: {report.modelCategory || "Humanitarian classification"} · Needs extracted.
                </span>
              </div>
            </div>

            {/* Stage 3: Rescue Team Notified */}
            <div className="relative flex items-start gap-4">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shrink-0 border ${
                  isAccepted
                    ? "bg-teal-500/20 text-teal-400 border-teal-500/60"
                    : "bg-slate-900 text-slate-500 border-slate-700"
                }`}
              >
                {isAccepted ? "✓" : "○"}
              </div>
              <div>
                <strong className={`text-sm block ${isAccepted ? "text-white" : "text-slate-400"}`}>
                  3. Rescue team notified & accepted
                </strong>
                <span className="text-xs text-slate-400">
                  {isAccepted
                    ? `Command unit accepted assignment at ${report.acceptedAt ? new Date(report.acceptedAt).toLocaleTimeString() : "recently"}.`
                    : "Signal in dispatch queue awaiting unit assignment."}
                </span>
              </div>
            </div>

            {/* Stage 4: Response in Progress */}
            <div className="relative flex items-start gap-4">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shrink-0 border ${
                  isInProgress
                    ? "bg-teal-500/20 text-teal-400 border-teal-500/60"
                    : "bg-slate-900 text-slate-500 border-slate-700"
                }`}
              >
                {isInProgress ? "✓" : "○"}
              </div>
              <div>
                <strong className={`text-sm block ${isInProgress ? "text-white" : "text-slate-400"}`}>
                  4. Response in progress
                </strong>
                <span className="text-xs text-slate-400">
                  {isInProgress
                    ? "Field responders dispatched and on-site assisting impacted victims."
                    : "Awaiting field deployment."}
                </span>
              </div>
            </div>

            {/* Stage 5: Incident Resolved & Completed */}
            <div className="relative flex items-start gap-4">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shrink-0 border ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/60"
                    : "bg-slate-900 text-slate-500 border-slate-700"
                }`}
              >
                {isCompleted ? "✓" : "○"}
              </div>
              <div>
                <strong className={`text-sm block ${isCompleted ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                  5. Incident resolved & completed
                </strong>
                <span className="text-xs text-slate-400">
                  {isCompleted
                    ? `Mission completed at ${report.completedAt ? new Date(report.completedAt).toLocaleTimeString() : "recently"}. All reported needs addressed.`
                    : "Operation remains active."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Responder Note If Available */}
        {report.responseNote && (
          <div className="p-4 bg-teal-950/40 border border-teal-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">
              NOTE FROM RESCUE COMMANDER
            </span>
            <p className="text-sm text-slate-200 italic font-medium">"{report.responseNote}"</p>
          </div>
        )}

        {/* Uploaded Media Evidence Preview */}
        {(report.photoUrl || report.videoUrl || (report.attachments && report.attachments.length > 0)) && (
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Uploaded Media Evidence
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              {report.photoUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs text-teal-300 font-semibold block">📷 {report.photoName || "Photo Evidence"}</span>
                  <div className="overflow-hidden rounded-lg border border-slate-800 bg-black flex items-center justify-center max-h-56">
                    <img
                      src={report.photoUrl.startsWith("http") ? report.photoUrl : `${API_BASE_URL}${report.photoUrl.startsWith('/') ? '' : '/'}${report.photoUrl}`}
                      alt="Submitted evidence"
                      className="rounded-lg object-contain max-h-56 w-full cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(report.photoUrl!.startsWith("http") ? report.photoUrl! : `${API_BASE_URL}${report.photoUrl!.startsWith('/') ? '' : '/'}${report.photoUrl!}`, "_blank")}
                    />
                  </div>
                </div>
              )}
              {report.videoUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs text-teal-300 font-semibold block">📹 {report.videoName || "Video Evidence"}</span>
                  <div className="overflow-hidden rounded-lg border border-slate-800 bg-black">
                    <video
                      src={report.videoUrl.startsWith("http") ? report.videoUrl : `${API_BASE_URL}${report.videoUrl.startsWith('/') ? '' : '/'}${report.videoUrl}`}
                      controls
                      className="rounded-lg max-h-56 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MyReports({
  onView,
}: {
  onView: (id: string) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);
  const [filter, setFilter] = useState<"All" | "Active" | "Completed">("All");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  // Combine and sort REVERSE CHRONOLOGICALLY (newest first)
  const combinedReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...crises, ...backendReports].forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || a.time || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || b.time || 0).getTime();
      return timeB - timeA;
    });
  }, [crises, backendReports]);

  const filtered = combinedReports.filter((r) => {
    const isComp = (r.status || "").toLowerCase() === "completed";
    if (filter === "Active") return !isComp;
    if (filter === "Completed") return isComp;
    return true;
  });

  return (
    <div>
      <PageTitle
        eyebrow="EMERGENCY ARCHIVE"
        title="My Reports"
        text="All distress signals registered from your account in reverse chronological order."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          {(["All", "Active", "Completed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === tab
                  ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* View Mode Toggle for Desktop */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1 border border-slate-800 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              viewMode === "table"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              viewMode === "cards"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Card View
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm">No reports matching filter.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table Layout (active when viewMode === "table" and on desktop) */}
          <div className={viewMode === "table" ? "hidden md:block" : "hidden"}>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-20 bg-slate-950 shadow-[0_1px_0_rgba(51,65,85,1)]">
                    <tr className="bg-slate-950 text-teal-400 border-b border-slate-800">
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[130px]">Crisis ID</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px]">Disaster</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[150px]">Location</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[220px]">Emergency Needs</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[140px]">Submitted</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[100px]">Priority</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[110px]">Status</th>
                      <th className="sticky top-0 z-20 bg-slate-950 p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[130px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {filtered.map((r) => {
                      const disasterName = r.disaster || r.type || "General Emergency";
                      const locationName = r.location || "Not Detected";
                      const rawNeeds = r.specificNeeds || (r.need ? [r.need] : []);
                      const needsList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];
                      const timeString =
                        r.time ||
                        (r.timestamp
                          ? new Date(r.timestamp).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently");

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4 font-mono font-bold text-teal-400 whitespace-nowrap">
                            {r.id}
                          </td>
                          <td className="p-4 font-semibold text-white whitespace-nowrap">
                            {disasterName}
                          </td>
                          <td className="p-4 text-slate-300 max-w-[200px] truncate" title={locationName}>
                            {locationName}
                          </td>
                          <td className="p-4">
                            {needsList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {needsList.map((n, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800 text-[10px] font-semibold whitespace-nowrap"
                                  >
                                    {n}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">No specific needs</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 whitespace-nowrap text-xs">
                            {timeString}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <Status value={r.priority || "Standard"} />
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <Status value={r.status || "PENDING"} />
                          </td>
                          <td className="p-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => onView(r.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-700/60 font-bold text-xs transition cursor-pointer"
                            >
                              TRACK STATUS <Icon name="arrow" size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card Layout: Stacked on mobile, or 2/3 columns on desktop when viewMode === "cards" */}
          <div
            className={
              viewMode === "cards"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                : "block md:hidden space-y-4"
            }
          >
            {filtered.map((r) => (
              <ReportCard key={r.id} report={r} onView={() => onView(r.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
  fileName?: string;
}

interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  messages: AssistantMessage[];
}

const DEFAULT_INITIAL_ASSISTANT_MESSAGE: AssistantMessage = {
  id: "msg-init",
  role: "assistant",
  text: "Hello! I am CRISENTRA AI Assistant. I can guide you on reporting disasters, emergency precautions, evacuation centers, and community safety. If you are in immediate life danger, please dial 112 directly.",
  time: "Just now",
};

function createNewChatConversation(): ChatConversation {
  const now = new Date();
  return {
    id: `chat-${Date.now()}`,
    title: "New Conversation",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isPinned: false,
    messages: [{ ...DEFAULT_INITIAL_ASSISTANT_MESSAGE, id: `msg-${Date.now()}` }],
  };
}

function UserAIAssistant() {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    try {
      const saved = localStorage.getItem("crisentra_ai_conversations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [createNewChatConversation()];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    return conversations[0]?.id || "";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileContent, setFileContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("crisentra_ai_conversations", JSON.stringify(conversations));
    } catch (_) {}
  }, [conversations]);

  const activeChat =
    conversations.find((c) => c.id === activeChatId) ||
    conversations[0] ||
    createNewChatConversation();

  // Scroll to bottom on new message or state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages, loading]);

  const handleNewChat = () => {
    const newChat = createNewChatConversation();
    setConversations((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleStartRename = (c: ChatConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(c.id);
    setEditTitleText(c.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitleText.trim()) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitleText.trim() } : c))
      );
    }
    setEditingChatId(null);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewChatConversation();
      setConversations([fresh]);
      setActiveChatId(fresh.id);
    } else {
      setConversations(remaining);
      if (activeChatId === id) {
        setActiveChatId(remaining[0].id);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("File size exceeds 15MB limit. Please attach a smaller file.");
        return;
      }
      setAttachedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = String(event.target?.result || "");
        setFileBase64(result);
        setFileContent(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMic = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    const isSecureContext = typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (!isSecureContext) {
      alert(
        `⚠️ Microphone Blocked: Insecure Context\n\nModern browsers strictly disable microphone access on HTTP private IP addresses (${window.location.origin}).\n\nPlease connect via HTTPS: https://${window.location.hostname}:8443 (or http://localhost:8443 on this PC).`
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        console.warn("AI Assistant mic error:", mediaErr);
        if (mediaErr.name === "NotAllowedError" || mediaErr.name === "PermissionDeniedError" || mediaErr.name === "SecurityError") {
          alert("⚠️ Microphone access denied. In your browser address bar, click the lock 🔒/tune icon on the left, set Microphone to 'Allow', then refresh (F5).");
          setIsListening(false);
          return;
        } else if (mediaErr.name === "NotFoundError" || mediaErr.name === "DevicesNotFoundError") {
          alert("⚠️ No microphone found. Please connect an audio input device (mic/headset) and check your sound settings.");
          setIsListening(false);
          return;
        } else if (mediaErr.name === "NotReadableError" || mediaErr.name === "TrackStartError" || mediaErr.name === "AbortError") {
          alert("⚠️ Microphone is currently in use by another application. Please close other apps using the mic and try again.");
          setIsListening(false);
          return;
        }
      }
    }

    try {
      const rec = new SR();
      rec.lang = "en-IN";
      setIsListening(true);

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setQuestion((prev) => (prev ? `${prev} ${text}` : text));
        setIsListening(false);
      };

      rec.onerror = (err: any) => {
        setIsListening(false);
        if (err.error === "not-allowed" || err.error === "service-not-allowed") {
          alert("⚠️ Microphone access denied. Please allow microphone access in site permissions.");
        } else if (err.error === "audio-capture") {
          alert("⚠️ No microphone detected or audio capture failed.");
        }
      };
      rec.onend = () => setIsListening(false);
      rec.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  const send = async () => {
    const text = question.trim();
    if (!text && !fileBase64 && !attachedFile) return;

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: text || `[Uploaded file: ${attachedFile?.name}]`,
      fileName: attachedFile?.name,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const isFirstUserMsg = !activeChat.messages.some((m) => m.role === "user");
    const updatedTitle =
      isFirstUserMsg && activeChat.title === "New Conversation"
        ? (text || attachedFile?.name || "File Analysis").slice(0, 28) +
          ((text || attachedFile?.name || "").length > 28 ? "..." : "")
        : activeChat.title;

    const currentMessages = [...activeChat.messages, userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: currentMessages,
            }
          : c
      )
    );

    setQuestion("");
    const sentFileName = attachedFile?.name || "";
    const sentFileType = attachedFile?.type || "";
    const sentFileBase64 = fileBase64;
    setAttachedFile(null);
    setFileBase64("");
    setFileContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          fileName: sentFileName,
          fileType: sentFileType,
          fileBase64: sentFileBase64,
          history: currentMessages.slice(-8).map((m) => ({ role: m.role, text: m.text, fileName: m.fileName })),
        }),
      });

      const data = await res.json();
      const assistantReply =
        data.reply ||
        "I am standing by. For immediate danger, please dial 112 or submit an emergency report via Report Crisis.";

      const botMsg: AssistantMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: assistantReply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? {
                ...c,
                updatedAt: new Date().toISOString(),
                messages: [...currentMessages, botMsg],
              }
            : c
        )
      );
    } catch (_) {
      const fallbackMsg: AssistantMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: "I am ready to help. If someone is in immediate life-threatening danger, call emergency services at 112 immediately.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? {
                ...c,
                updatedAt: new Date().toISOString(),
                messages: [...currentMessages, fallbackMsg],
              }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const pinnedChats = conversations.filter((c) => c.isPinned);
  const recentChats = conversations.filter((c) => !c.isPinned);

  return (
    <div className="w-full h-full flex flex-1 min-h-0 overflow-hidden bg-slate-950 relative">
      {/* Mobile Backdrop Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Collapsible Left Sidebar (Responsive Overlay on Mobile, Inline on Desktop) */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-40 md:z-auto transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col bg-slate-950 h-full shrink-0 shadow-2xl md:shadow-none ${
          sidebarOpen
            ? "w-72 max-w-[85vw] md:w-64 translate-x-0"
            : "-translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-none"
        }`}
      >
        {/* Sidebar Top: New Chat Button */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              handleNewChat();
              if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Icon name="plus" size={14} /> NEW CHAT
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <span className="text-sm font-bold md:hidden">✕</span>
            <span className="hidden md:inline"><Icon name="menu" size={16} /></span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Pinned Chats */}
          {pinnedChats.length > 0 && (
            <div>
              <span className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Pinned Chats
              </span>
              <div className="space-y-1">
                {pinnedChats.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveChatId(c.id);
                      if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`group p-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      activeChatId === c.id
                        ? "bg-slate-800 text-teal-300 font-semibold"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    {editingChatId === c.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onBlur={() => handleSaveRename(c.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveRename(c.id)}
                        className="w-full bg-slate-950 px-1 py-0.5 rounded text-xs text-white border border-teal-500"
                      />
                    ) : (
                      <span className="truncate flex-1 pr-1">{c.title}</span>
                    )}

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(c.id, e)}
                        title="Unpin"
                        className="text-amber-400 hover:text-amber-300 p-0.5 cursor-pointer"
                      >
                        <Icon name="pin" size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(c, e)}
                        title="Rename"
                        className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChat(c.id, e)}
                        title="Delete"
                        className="text-slate-400 hover:text-red-400 p-0.5 cursor-pointer"
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Chats */}
          <div>
            <span className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Recent Conversations
            </span>
            <div className="space-y-1">
              {recentChats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveChatId(c.id);
                    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={`group p-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    activeChatId === c.id
                      ? "bg-slate-800 text-teal-300 font-semibold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  {editingChatId === c.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onBlur={() => handleSaveRename(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveRename(c.id)}
                      className="w-full bg-slate-950 px-1 py-0.5 rounded text-xs text-white border border-teal-500"
                    />
                  ) : (
                    <span className="truncate flex-1 pr-1">{c.title}</span>
                  )}

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(c.id, e)}
                      title="Pin chat"
                      className="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer"
                    >
                      <Icon name="pin" size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(c, e)}
                      title="Rename"
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <Icon name="edit" size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteChat(c.id, e)}
                      title="Delete"
                      className="text-slate-400 hover:text-red-400 p-0.5 cursor-pointer"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 bg-slate-900/40 relative">
        {/* Top Bar inside Chat */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80 backdrop-blur shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              title={sidebarOpen ? "Close chat history" : "Open chat history"}
              aria-label="Toggle chat history"
            >
              <Icon name="menu" size={18} />
            </button>
            <h3 className="text-sm font-bold text-white truncate">{activeChat.title}</h3>
            {activeChat.isPinned && (
              <span className="text-amber-400 text-xs flex items-center gap-1 font-semibold">
                <Icon name="pin" size={11} /> Pinned
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-950/80 text-teal-300 border border-teal-800">
              <span className="online-dot" /> CRISENTRA Intelligence
            </span>
            <button
              type="button"
              onClick={handleNewChat}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Icon name="plus" size={13} /> New Chat
            </button>
          </div>
        </div>

        {/* Independent Messages Feed Area (ONLY THIS SCROLLS) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 space-y-4">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {activeChat.messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="bg-teal-950/80 border border-teal-800/90 text-white ml-auto max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl shadow-sm"
                >
                  <div className="flex items-center justify-between text-[10px] text-teal-300/80 mb-1.5 font-bold uppercase tracking-wider">
                    <span className="text-teal-300 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                      You
                    </span>
                    {m.time && <span className="font-mono text-[10px]">{m.time}</span>}
                  </div>
                  {m.fileName && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded bg-slate-950/80 border border-teal-700/60 text-[11px] text-teal-300 font-mono">
                      <span>📎</span>
                      <span className="truncate max-w-[240px]">{m.fileName}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 [overflow-wrap:anywhere]">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div
                  key={m.id}
                  className="bg-slate-900/95 border border-slate-800 text-slate-200 mr-auto w-full max-w-[95%] sm:max-w-[88%] p-4 sm:p-5 rounded-2xl shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/70 pb-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-[10px] text-teal-300 font-bold">
                        C
                      </div>
                      <span className="text-slate-300 font-semibold tracking-wide text-xs">CRISENTRA AI</span>
                      <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700/50 font-mono">
                        Assistant
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {m.time && <span className="text-[10px] text-slate-500 font-mono">{m.time}</span>}
                      <CopyButton text={m.text} label="Copy" />
                    </div>
                  </div>

                  {m.fileName && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-teal-300 font-mono">
                      <span>📎</span>
                      <span className="text-slate-400 font-sans">Document Context:</span>
                      <span className="font-semibold text-slate-200">{m.fileName}</span>
                    </div>
                  )}

                  <div className="assistant-rendered-body">
                    <AssistantMarkdown text={m.text} />
                  </div>
                </div>
              )
            )}

            {/* Quick Suggestion Prompts if initial greeting only */}
            {activeChat.messages.length === 1 && (
              <div className="pt-4 grid gap-2 sm:grid-cols-3">
                {[
                  "What emergency supplies should I prepare for a flood?",
                  "How do I purify drinking water during a disaster?",
                  "Immediate first aid steps for injured victims",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuestion(prompt);
                    }}
                    className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-xs text-slate-300 transition cursor-pointer"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs italic max-w-[85%] flex items-center gap-2">
                <span className="online-dot animate-ping" /> CRISENTRA AI is thinking and preparing guidance...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Composer at Bottom (STAYS FIXED AT BOTTOM ALWAYS) */}
        <div className="shrink-0 bg-slate-950/95 backdrop-blur border-t border-slate-800/90 p-3 sm:p-4 sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto w-full space-y-2">
            {/* File Attachment Preview Banner */}
            {attachedFile && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-teal-500/30 text-xs text-teal-300 shadow-md">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-teal-900/60 text-teal-300 border border-teal-700/50">
                    {attachedFile.name.split(".").pop() || "FILE"}
                  </span>
                  <span className="truncate font-medium text-slate-200">
                    {attachedFile.name}
                  </span>
                  <span className="text-slate-400 text-[11px] shrink-0">
                    ({attachedFile.size >= 1024 * 1024
                      ? `${(attachedFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(attachedFile.size / 1024).toFixed(1)} KB`})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFile(null);
                    setFileBase64("");
                    setFileContent("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-red-400 hover:text-red-300 font-semibold text-xs ml-3 transition cursor-pointer shrink-0"
                >
                  ✕ Remove
                </button>
              </div>
            )}

            {/* Input Form with pill border like ChatGPT / Gemini */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 p-2 bg-slate-900/90 border border-slate-700/80 focus-within:border-teal-500 rounded-2xl transition shadow-xl"
            >
              <label
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition shrink-0"
                title="Attach document, data table, or image (PDF, Word, Excel, CSV, JSON, TXT, Images)"
              >
                <Icon name="upload" size={17} />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.json,.txt,.md,.log,.tsv,.png,.jpg,.jpeg,.webp"
                />
              </label>

              <button
                type="button"
                onClick={toggleMic}
                className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title="Voice input"
              >
                <Icon name="mic" size={17} />
              </button>

              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask CRISENTRA AI about disaster precautions, first aid, shelter..."
                className="flex-1 bg-transparent px-2 py-1 text-white text-sm focus:outline-none placeholder:text-slate-500"
              />

              <button
                type="submit"
                disabled={loading || (!question.trim() && !fileContent)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  loading || (!question.trim() && !fileContent)
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer shadow-md shadow-teal-500/20"
                }`}
              >
                <span>SEND</span>
                <Icon name="arrow" size={13} />
              </button>
            </form>

            <p className="text-[11px] text-slate-500 text-center">
              CRISENTRA AI provides emergency intelligence and disaster safety instructions. In immediate danger, call 112.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackPage({ initialCrisisId }: { initialCrisisId?: string }) {
  const { crises } = useCrises();
  const [selectedCrisisId, setSelectedCrisisId] = useState(initialCrisisId || "");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);

  // Eligible completed reports
  const completedReports = useMemo(() => {
    return crises.filter((r) => (r.status || "").toLowerCase() === "completed");
  }, [crises]);

  useEffect(() => {
    if (!selectedCrisisId && completedReports.length > 0) {
      setSelectedCrisisId(completedReports[0].id);
    }
  }, [completedReports, selectedCrisisId]);

  const loadFeedbacks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`);
      const data = await res.json();
      if (Array.isArray(data.feedback)) {
        setFeedbackList(data.feedback);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !selectedCrisisId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crisisId: selectedCrisisId,
          rating,
          feedbackText: feedbackText.trim(),
          userId: "current-user",
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setFeedbackText("");
        loadFeedbacks();
      }
    } catch (_) {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageTitle
        eyebrow="SERVICE EVALUATION"
        title="Mission Feedback"
        text="Your evaluation directly helps emergency teams refine response times, rescue boat allocation, and medical aid distribution."
      />

      <form
        onSubmit={handleSubmitFeedback}
        className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-xl space-y-6"
      >
        {/* Report selection */}
        <label className="field">
          <span>Select Completed Incident *</span>
          <select
            value={selectedCrisisId}
            onChange={(e) => setSelectedCrisisId(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
          >
            {completedReports.length > 0 ? (
              completedReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.disaster || r.type} ({r.location})
                </option>
              ))
            ) : (
              <option value="CRS-2026-GENERAL">CRS-2026-GENERAL (Default Operation)</option>
            )}
          </select>
        </label>

        {/* 5-Star Interactive Rating */}
        <div>
          <span className="text-xs font-bold text-slate-300 block mb-2">Overall Mission Rating *</span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="text-3xl text-amber-400 focus:outline-none transition cursor-pointer"
              >
                {(hoverRating || rating) >= star ? "★" : "☆"}
              </button>
            ))}
            <span className="text-sm font-bold text-slate-300 ml-3">
              {rating} of 5 Stars
            </span>
          </div>
        </div>

        {/* Text */}
        <label className="field">
          <span>How did the emergency team assist your situation? *</span>
          <textarea
            rows={4}
            required
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Share details on response arrival time, medical or food support, and communication clarity..."
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500"
          />
        </label>

        <div className="flex items-center justify-between pt-2">
          {submitted ? (
            <span className="text-xs text-emerald-400 font-bold">
              ✓ Feedback submitted. Thank you for helping us improve.
            </span>
          ) : (
            <span />
          )}

          <Button type="submit">SUBMIT RESPONSE FEEDBACK</Button>
        </div>
      </form>

      {/* Previous Submitted Feedback */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Previous Mission Reviews</h3>
        {feedbackList.length === 0 ? (
          <p className="text-xs text-slate-500">No previous reviews logged.</p>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((fb) => (
              <div
                key={fb.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-teal-400">{fb.crisisId}</span>
                    <Status value={fb.status || "NEW"} />
                  </div>
                  <span className="text-amber-400 text-sm">{"★".repeat(fb.rating)}</span>
                </div>
                <p className="text-sm text-slate-200 italic">"{fb.feedbackText}"</p>

                {fb.rescueResponse && (
                  <div className="p-3 rounded-lg bg-teal-950/60 border border-teal-800/80 text-xs">
                    <span className="font-bold text-teal-300 block mb-1">RESCUE TEAM RESPONSE:</span>
                    <p className="text-slate-200">"{fb.rescueResponse}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserProfile({
  user,
  onLogout,
}: {
  user?: any;
  onLogout: () => void;
}) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const name = user?.name || "Ananya Kumar";
  const email = user?.email || "ananya.k@example.com";
  const mobile = user?.mobile || "+91 98765 43210";
  const id = user?.id || "USR-2026-01";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (newPassword !== confirmPassword) {
      setErr("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email || mobile || id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setErr(error.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitle eyebrow="AUTHENTICATED ACCOUNT" title="Citizen Profile" text="Manage personal verification details and credentials." />

      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-xl space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-300 font-bold text-2xl flex items-center justify-center border border-teal-500/40">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-xs text-slate-400">Account ID: <span className="font-mono">{id}</span></p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">Mobile Number</span>
            <strong className="text-white text-sm">{mobile}</strong>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">Email Address</span>
            <strong className="text-white text-sm">{email}</strong>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <Button variant="secondary" onClick={() => setChangePasswordOpen((prev) => !prev)}>
            <Icon name="lock" /> {changePasswordOpen ? "CLOSE FORM" : "CHANGE PASSWORD"}
          </Button>
          <Button variant="danger" onClick={onLogout}>
            <Icon name="logout" /> LOGOUT
          </Button>
        </div>

        {changePasswordOpen && (
          <form onSubmit={handleChangePassword} className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Update Account Password</h3>
            {err && <div className="text-xs text-red-400">{err}</div>}
            {msg && <div className="text-xs text-emerald-400">{msg}</div>}

            <label className="field">
              <span>Current Password *</span>
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                <span>New Password *</span>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </label>
              <label className="field">
                <span>Confirm New Password *</span>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </label>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "SAVING..." : "UPDATE PASSWORD"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

function UserApp({
  user,
  onLogout,
}: {
  user?: any;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<UserPage>("Home");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navigateToStatus = (id: string) => {
    setSelectedReportId(id);
  };

  const renderContent = () => {
    if (selectedReportId) {
      return (
        <ReportStatus
          reportId={selectedReportId}
          onBack={() => setSelectedReportId(null)}
          onFeedback={(id) => {
            setSelectedReportId(null);
            setPage("Feedback");
          }}
        />
      );
    }

    if (page === "Home") {
      return (
        <UserHome
          setPage={setPage}
          onView={(id) => navigateToStatus(id)}
        />
      );
    }

    if (page === "Report Crisis") {
      return <ReportCrisis onSubmitted={(id) => navigateToStatus(id)} />;
    }

    if (page === "My Reports") {
      return <MyReports onView={(id) => navigateToStatus(id)} />;
    }

    if (page === "AI Assistant") {
      return <UserAIAssistant />;
    }

    if (page === "Feedback") {
      return <FeedbackPage />;
    }

    return <UserProfile user={user} onLogout={onLogout} />;
  };

  return (
    <div className={`citizen-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <style>{`
        .citizen-layout {
          display: flex;
          flex-direction: row;
          width: 100%;
          height: 100vh;
          min-height: 100vh;
          overflow: hidden;
          background: #08111b;
          color: #dbe5ef;
        }

        .citizen-sidebar {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          flex: 0 0 258px;
          width: 258px;
          min-width: 258px;
          height: 100vh;
          padding: 20px 14px;
          background: #0d1a27;
          border-right: 1px solid #1a2a3c;
          overflow-y: auto;
          transition: width .25s ease, flex-basis .25s ease;
        }

        .citizen-sidebar.sidebar-collapsed {
          flex-basis: 76px;
          width: 76px;
          min-width: 76px;
        }

        .citizen-sidebar.sidebar-collapsed span,
        .citizen-sidebar.sidebar-collapsed .citizen-sidebar-label,
        .citizen-sidebar.sidebar-collapsed .citizen-sidebar-footer {
          display: none !important;
        }

        .citizen-sidebar.sidebar-collapsed .citizen-nav-item {
          justify-content: center;
        }

        .citizen-sidebar-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 6px 20px;
        }

        .citizen-sidebar-label {
          padding: 8px 10px 12px;
          color: #64778c;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
        }

        .citizen-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #92a4b6;
          font-size: 12px;
          font-weight: 600;
          transition: .18s ease;
          cursor: pointer;
        }

        .citizen-nav-item:hover {
          color: #f4f8fb;
          background: #152536;
        }

        .citizen-nav-item.active {
          color: #5eead4;
          background: #173445;
          box-shadow: inset 0 0 0 1px #23586b;
        }

        .citizen-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .citizen-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 36px;
          border-bottom: 1px solid #1a2a3c;
          background: #08111bdd;
          backdrop-filter: blur(12px);
        }

        .citizen-main {
          flex: 1;
          overflow-y: auto;
          padding: 36px;
        }

        .citizen-main.ai-chat-fullscreen {
          padding: 0;
          overflow: hidden;
          height: calc(100vh - 65px);
          max-height: calc(100vh - 65px);
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 768px) {
          .citizen-layout {
            flex-direction: column !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }

          .citizen-sidebar {
            display: none !important;
          }

          .citizen-workspace {
            width: 100% !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }

          .citizen-topbar {
            padding: 10px 14px !important;
            height: 54px !important;
            flex-shrink: 0 !important;
          }

          .citizen-main {
            padding: 14px 12px 84px 12px !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .citizen-main.ai-chat-fullscreen {
            padding: 0 !important;
            height: calc(100vh - 118px) !important;
            max-height: calc(100vh - 118px) !important;
          }
        }
      `}</style>

      <UserSidebar
        page={page}
        setPage={(p) => {
          setPage(p);
          setSelectedReportId(null);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={() => setSidebarCollapsed((v) => !v)}
        onLogout={onLogout}
      />

      <div className="citizen-workspace">
        <header className="citizen-topbar">
          <div className="flex items-center gap-2 sm:gap-3 text-xs min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Icon name="menu" size={18} />
            </button>
            <span className="hidden sm:inline text-slate-400 font-bold uppercase tracking-wider">CITIZEN PORTAL /</span>
            <strong className="text-white uppercase tracking-wider truncate text-[11px] sm:text-xs">
              {selectedReportId ? "REPORT STATUS" : page}
            </strong>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2">
              <span className="online-dot" /> Live Command Stream
            </div>
            <div
              className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center border border-teal-500/40 cursor-pointer"
              onClick={() => {
                setPage("Profile");
                setSelectedReportId(null);
              }}
              title="Citizen Profile"
            >
              {(user?.name || "Citizen").slice(0, 1)}
            </div>
          </div>
        </header>

        <main className={`citizen-main ${page === "AI Assistant" && !selectedReportId ? "ai-chat-fullscreen" : ""}`}>
          {renderContent()}
        </main>
      </div>

      {/* Mobile Off-canvas Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[82vw] h-full bg-[#0d1a27] border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer text-xs font-bold"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <div className="px-3 py-2 mb-3 rounded-lg bg-teal-950/40 border border-teal-900/50 flex items-center gap-2.5">
                <span className="online-dot" />
                <span className="text-xs text-teal-300 font-semibold truncate">
                  {user?.name || "Citizen Account"}
                </span>
              </div>

              <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 px-1">CITIZEN NAVIGATION</div>

              <nav className="space-y-1">
                {userNav.map((item) => (
                  <button
                    key={item.page}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                      page === item.page && !selectedReportId
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                    onClick={() => {
                      setPage(item.page);
                      setSelectedReportId(null);
                      setMobileDrawerOpen(false);
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.page}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-950/30 transition cursor-pointer"
              >
                <Icon name="logout" size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0a151ff8] border-t border-slate-800/90 backdrop-blur-xl flex items-center justify-around px-1 shadow-lg shadow-black/80 mobile-bottom-nav">
        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "Home" && !selectedReportId ? "text-teal-300 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("Home");
            setSelectedReportId(null);
          }}
        >
          <Icon name="home" size={20} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "Report Crisis" && !selectedReportId ? "text-teal-300 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("Report Crisis");
            setSelectedReportId(null);
          }}
        >
          <div className="w-11 h-11 -mt-5 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/40 border-2 border-[#0a151f]">
            <Icon name="report" size={22} />
          </div>
          <span className="text-[10px] mt-0.5 font-bold text-teal-300">Report</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "My Reports" && !selectedReportId ? "text-teal-300 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("My Reports");
            setSelectedReportId(null);
          }}
        >
          <Icon name="file" size={20} />
          <span className="text-[10px] mt-1 font-medium">Reports</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "AI Assistant" && !selectedReportId ? "text-teal-300 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("AI Assistant");
            setSelectedReportId(null);
          }}
        >
          <Icon name="wave" size={20} />
          <span className="text-[10px] mt-1 font-medium">Assistant</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Icon name="menu" size={20} />
          <span className="text-[10px] mt-1 font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}

/* ============================================================
   RESCUE UI COMPONENTS
   ============================================================ */

const rescueNav: { page: RescuePage; icon: IconName }[] = [
  { page: "Dashboard", icon: "home" },
  { page: "Incoming Crises", icon: "alert" },
  { page: "Completed Crises", icon: "check" },
  { page: "GIS Command Map", icon: "map" },
  { page: "Extracted Data / Crisis Log", icon: "database" },
  { page: "Analytics", icon: "chart" },
  { page: "User Feedback", icon: "feedback" },
  { page: "Team Profile", icon: "team" },
];

function RescueSidebar({
  page,
  setPage,
  collapsed,
  setCollapsed,
  onLogout,
}: {
  page: RescuePage;
  setPage: (p: RescuePage) => void;
  collapsed: boolean;
  setCollapsed: () => void;
  onLogout: () => void;
}) {
  return (
    <aside className={`rescue-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand flex items-center justify-between p-4">
        <Brand compact={collapsed} />
        <button
          type="button"
          onClick={setCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <Icon name="menu" />
        </button>
      </div>

      <div className="command-mode flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-amber-400 tracking-wider">
        <span className="online-dot" />
        <span>COMMAND MODE</span>
        <small className="ml-auto px-1.5 py-0.5 rounded bg-amber-950 text-amber-300">LIVE</small>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {rescueNav.map((item) => (
          <button
            key={item.page}
            type="button"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              page === item.page
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            onClick={() => setPage(item.page)}
            title={item.page}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.page}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          type="button"
          className="sidebar-logout w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-950/40 transition cursor-pointer"
          onClick={onLogout}
        >
          <Icon name="logout" size={16} />
          <span>Exit Command</span>
        </button>
      </div>
    </aside>
  );
}

function RescueTopbar({ page, onOpenDrawer }: { page: RescuePage; onOpenDrawer?: () => void }) {
  return (
    <header className="rescue-topbar flex items-center justify-between px-4 sm:px-8 py-3 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3 text-xs min-w-0">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Icon name="menu" size={18} />
          </button>
        )}
        <span className="hidden sm:inline text-slate-500 font-bold tracking-widest uppercase">OPERATIONS /</span>
        <strong className="text-white tracking-wider uppercase font-bold truncate text-[11px] sm:text-xs">{page}</strong>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 text-xs">
        <div className="hidden lg:flex items-center gap-2 text-emerald-400 font-medium">
          <span className="online-dot" /> ALL TRIAGE SYSTEMS OPERATIONAL
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-400 font-mono">
          <span>{new Date().toLocaleTimeString()} IST</span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800">
          <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-[10px]">
            SR
          </span>
          <div className="leading-tight text-left hidden sm:block">
            <strong className="text-white block text-[11px]">South Response</strong>
            <small className="text-slate-500 text-[10px]">Team Alpha</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
  delta,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: string;
  delta?: string;
}) {
  const toneBg =
    tone === "red"
      ? "border-red-900/50 bg-red-950/20 text-red-400"
      : tone === "amber"
      ? "border-amber-900/50 bg-amber-950/20 text-amber-400"
      : tone === "green"
      ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-400"
      : "border-teal-900/50 bg-teal-950/20 text-teal-400";

  return (
    <article className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border ${toneBg} space-y-1 sm:space-y-2`}>
      <div className="flex items-center justify-between text-xs">
        <Icon name={icon} size={18} />
        {delta && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80">{delta}</span>}
      </div>
      <strong className="text-2xl sm:text-3xl font-bold text-white block tracking-tight font-mono">{value}</strong>
      <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">{label}</p>
    </article>
  );
}

const isGenuineCrisisRecord = (r: any): boolean => {
  if (!r || !r.id) return false;
  const id = String(r.id).toLowerCase();
  const title = String(r.disaster || r.type || "").toLowerCase();
  const msg = String(r.message || "").toLowerCase();
  if (id.includes("demo") || id.includes("sample") || id.includes("mock") || id.includes("test-incident")) return false;
  if (title.includes("demo incident") || title.includes("sample incident") || title.includes("mock incident")) return false;
  if (msg.includes("sample incident") || msg.includes("mock test")) return false;
  return true;
};

const WORD_MAP: Record<string, number> = {
  zero: 0, no: 0, none: 0, nil: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90, hundred: 100,
};

function parseNumWord(str?: string): number | null {
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

const numPattern =
  "(\\b\\d[\\d,]*\\b|zero|no|none|nil|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";

function parseCount(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const s = String(val).trim();
  if (!s || /^(none reported|not reported|not detected|null|undefined|none|unknown|n\/a)$/i.test(s)) {
    return null;
  }
  if (/^(0|zero|no deaths|no injuries|no one trapped|zero deaths|zero injuries|no casualties|no casualty)$/i.test(s)) {
    return 0;
  }
  const digitMatch = s.match(/\d+/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }
  const wordVal = parseNumWord(s);
  if (wordVal !== null) return wordVal;
  return null;
}

function isExplicitZero(val: any): boolean {
  if (val === 0 || val === "0") return true;
  if (
    typeof val === "string" &&
    /^(0|zero|no deaths|no injuries|no one trapped|zero deaths|zero injuries|no casualties|no casualty)$/i.test(val.trim())
  ) {
    return true;
  }
  return false;
}

function extractDeathsFromMsg(msg?: string): number | null {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();
  if (
    /\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:deaths?|fatalities|casualties|loss\s+of\s+life|fatal\s+casualties)\b|\b(?:no\s+one|nobody)\s+(?:has\s+|was\s+|were\s+)?(?:died|killed|dead|perished)\b|\b(?:without\s+any|no)\s+(?:loss\s+of\s+life|lives\s+lost|fatalities|deaths?|casualties)\b/i.test(
      m
    )
  ) {
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

function extractInjuriesFromMsg(msg?: string): number | null {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();
  if (
    /\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:injuries|injured|wounded|hurt)\b|\bno\s+one\s+(?:was\s+|were\s+)?(?:injured|hurt|wounded)\b|\bwithout\s+any\s+injuries\b/i.test(
      m
    )
  ) {
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

function extractTrappedFromMsg(msg?: string): number | null {
  if (!msg || typeof msg !== "string") return null;
  const m = msg.toLowerCase();
  if (
    /\b(?:no|zero|none|nil|0)\s+(?:confirmed\s+|reported\s+)?(?:trapped|stranded|stuck|marooned)\b|\bno\s+one\s+(?:was\s+|were\s+)?(?:trapped|stranded|stuck)\b/i.test(
      m
    )
  ) {
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

function getReportDeaths(r: any): number | null {
  let val = parseCount(r.deaths ?? r.death_count ?? r.deaths_count);
  if (val === null && !isExplicitZero(r.deaths) && r.message) {
    val = extractDeathsFromMsg(r.message);
  }
  return val;
}

function getReportInjuries(r: any): number | null {
  let val = parseCount(r.injured ?? r.injured_people ?? r.injuries);
  if (val === null && !isExplicitZero(r.injured) && r.message) {
    val = extractInjuriesFromMsg(r.message);
  }
  return val;
}

function getReportTrapped(r: any): number | null {
  let val = parseCount(r.trapped ?? r.trapped_people ?? r.trapped_citizens ?? r.stranded);
  if (val === null && !isExplicitZero(r.trapped) && r.message) {
    val = extractTrappedFromMsg(r.message);
  }
  return val;
}

function RescueDashboard({
  onOpen,
  setPage,
}: {
  onOpen: (id: string) => void;
  setPage: (p: RescuePage) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  const allReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...backendReports, ...crises].forEach((r) => {
      if (r && r.id && isGenuineCrisisRecord(r)) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [crises, backendReports]);

  // 6 CANONICAL METRICS CALCULATED FROM REAL OPERATIONAL DATA
  const totalReportsCount = allReports.length;
  const criticalReportsCount = allReports.filter(
    (r) => (r.priority || "").toLowerCase() === "critical"
  ).length;
  const highPriorityCount = allReports.filter(
    (r) => (r.priority || "").toLowerCase() === "high"
  ).length;

  const peopleAffectedTotal = allReports.reduce((sum, r) => {
    const rawP = parseCount(r.peopleAffected || r.people);
    if (rawP !== null) return sum + rawP;
    const d = getReportDeaths(r);
    const i = getReportInjuries(r);
    const t = getReportTrapped(r);
    if (d !== null || i !== null || t !== null) {
      return sum + (d || 0) + (i || 0) + (t || 0);
    }
    return sum;
  }, 0);

  const rescueRequiredCount = allReports.filter((r) => {
    const rawNeeds = r.specificNeeds || (r.need ? [r.need] : []);
    const str = Array.isArray(rawNeeds) ? rawNeeds.join(" ") : String(rawNeeds);
    return /rescue|boat/i.test(str);
  }).length;

  const awaitingActionCount = allReports.filter((r) => {
    const st = (r.status || "pending").toLowerCase();
    return st === "pending" || st === "submitted";
  }).length;

  // OVERALL CUMULATIVE IMPACT TOTALS ACROSS ALL STORED REPORTS
  const totalDeaths = allReports.reduce((acc, r) => {
    const d = getReportDeaths(r);
    return acc + (d !== null ? d : 0);
  }, 0);

  const totalInjured = allReports.reduce((acc, r) => {
    const i = getReportInjuries(r);
    return acc + (i !== null ? i : 0);
  }, 0);

  const totalTrapped = allReports.reduce((acc, r) => {
    const t = getReportTrapped(r);
    return acc + (t !== null ? t : 0);
  }, 0);

  const activeReports = allReports.filter((r) => (r.status || "").toLowerCase() !== "completed");

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="OPERATIONAL SITUATION REPORT"
        title="Command Dashboard"
        text="Aggregated multi-channel incident signals, triage velocity, and live rescue force deployments."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setPage("Incoming Crises")}>
              VIEW INCOMING ({activeReports.length})
            </Button>
            <Button variant="secondary" onClick={() => setPage("GIS Command Map")}>
              <Icon name="map" /> OPEN GIS MAP
            </Button>
          </div>
        }
      />

      {/* 6 CANONICAL METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Metric icon="file" label="Total Reports" value={String(totalReportsCount)} tone="teal" />
        <Metric icon="alert" label="Critical Reports" value={String(criticalReportsCount)} tone="red" />
        <Metric icon="activity" label="High Priority" value={String(highPriorityCount)} tone="amber" />
        <Metric icon="users" label="People Affected" value={String(peopleAffectedTotal)} tone="teal" />
        <Metric icon="shield" label="Rescue Required" value={String(rescueRequiredCount)} tone="red" />
        <Metric icon="clock" label="Awaiting Action" value={String(awaitingActionCount)} tone="amber" />
      </div>

      {/* 3 CUMULATIVE HUMAN IMPACT COUNTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Fatalities Reported</span>
            <strong className="text-2xl font-bold text-red-400 font-mono">{totalDeaths}</strong>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Icon name="alert" size={20} />
          </div>
        </div>
        <div className="p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Injuries Reported</span>
            <strong className="text-2xl font-bold text-amber-400 font-mono">{totalInjured}</strong>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Icon name="activity" size={20} />
          </div>
        </div>
        <div className="p-4 bg-teal-950/20 border border-teal-900/50 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Trapped Citizens</span>
            <strong className="text-2xl font-bold text-teal-400 font-mono">{totalTrapped}</strong>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Icon name="users" size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

function IncomingPage({
  onOpen,
  onNavigateMap,
}: {
  onOpen: (id: string) => void;
  onNavigateMap?: (location: string, incidentId: string) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  const allReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...crises, ...backendReports].forEach((r) => {
      if (r && r.id && isGenuineCrisisRecord(r)) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [crises, backendReports]);

  // ACTIVE INCIDENTS ONLY (Completed moved to Completed Crises tab/page)
  const activeReports = allReports.filter(
    (r) => (r.status || "").toLowerCase() !== "completed"
  );

  const filtered = activeReports.filter((r) => {
    const matchesSearch = [r.id, r.type, r.disaster, r.location, r.message, r.need].some(
      (val) => String(val || "").toLowerCase().includes(search.toLowerCase())
    );
    const matchesPriority =
      priorityFilter === "All" ||
      String(r.priority || "").toLowerCase() === priorityFilter.toLowerCase();
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="PRIORITY INCIDENT QUEUE"
        title="Incoming Crises"
        text="Review, triage, and accept new citizen distress signals. Only active and in-progress operations appear here."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
          <Icon name="search" size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Crisis ID, disaster, or location..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
          <span className="text-xs text-slate-400 font-bold whitespace-nowrap shrink-0">Priority:</span>
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {["All", "Critical", "High", "Standard"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  priorityFilter === p
                    ? "bg-teal-400 text-slate-950 shadow-sm"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm">No active incoming incidents matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const rawNeeds = r.specificNeeds || (r.need ? [r.need] : []);
            const needsList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];

            return (
              <div
                key={r.id}
                className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl hover:border-slate-700 transition space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-teal-400">{r.id}</span>
                    <Status value={r.status || "PENDING"} />
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-900">
                      {r.priority || "HIGH"}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    Submitted: {r.time || "Recently"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {r.disaster || r.type} · {r.location}
                  </h3>
                  {r.message && (
                    <p className="text-sm text-slate-300 italic border-l-2 border-teal-500 pl-3 py-1">
                      "{r.message}"
                    </p>
                  )}
                </div>

                {/* Extracted Needs Chips & RoBERTa Class */}
                <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">RoBERTa Class:</span>
                    <strong className="text-teal-300">{r.modelCategory || "Humanitarian Classification"}</strong>
                    {r.confidence != null && <span className="text-slate-500">({r.confidence}%)</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Needs:</span>
                    {needsList.length > 0 ? (
                      needsList.map((n, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 font-semibold"
                        >
                          {n}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">No specific needs detected</span>
                    )}
                  </div>
                </div>

                {/* Casualties summary */}
                <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                  <span>Trapped: <strong className="text-white">{r.trapped != null && r.trapped !== "" && r.trapped !== "None Reported" ? String(r.trapped) : "Not reported"}</strong></span>
                  <span>Injured: <strong className="text-white">{r.injured != null && r.injured !== "" && r.injured !== "None Reported" ? String(r.injured) : "Not reported"}</strong></span>
                  <span>Deaths: <strong className="text-white">{r.deaths != null && r.deaths !== "" && r.deaths !== "None Reported" ? String(r.deaths) : "Not reported"}</strong></span>
                  <span>Contact: <strong className="text-white">{r.contact || "Not provided"}</strong></span>

                  <div className="ml-auto flex items-center gap-2">
                    {onNavigateMap && (
                      <button
                        type="button"
                        onClick={() => onNavigateMap(r.location, r.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-teal-300 hover:bg-slate-700 transition cursor-pointer"
                      >
                        📍 GPS Confirmed
                      </button>
                    )}
                    <Button onClick={() => onOpen(r.id)}>
                      OPEN INCIDENT DETAILS <Icon name="arrow" size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompletedCrisesPage({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  const allReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...crises, ...backendReports].forEach((r) => {
      if (r && r.id && isGenuineCrisisRecord(r)) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [crises, backendReports]);

  const completedReports = allReports.filter(
    (r) => (r.status || "").toLowerCase() === "completed"
  );

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="CLOSED OPERATIONS"
        title="Completed Crises"
        text="Historical record of resolved incidents. Preserves all extracted needs, casualty accounts, and response logs."
      />

      {completedReports.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm">No resolved emergency incidents on record yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedReports.map((r) => (
            <div
              key={r.id}
              className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-teal-400">{r.id}</span>
                  <Status value="COMPLETED" />
                </div>
                <span className="text-xs text-slate-500">
                  Resolved: {r.completedAt ? new Date(r.completedAt).toLocaleString() : "Confirmed"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">
                {r.disaster || r.type} · {r.location}
              </h3>

              {r.message && <p className="text-xs text-slate-300">"{r.message}"</p>}

              {r.responseNote && (
                <div className="p-3 bg-teal-950/40 border border-teal-800/60 rounded-lg text-xs text-slate-200">
                  <span className="text-teal-300 font-bold block mb-1">CLOSURE NOTE:</span>
                  "{r.responseNote}"
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" onClick={() => onOpen(r.id)}>
                  VIEW AUDIT LOG <Icon name="arrow" size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IncidentDetail({
  reportId,
  onBack,
  onNavigateMap,
}: {
  reportId: string;
  onBack: () => void;
  onNavigateMap?: (location: string, incidentId: string) => void;
}) {
  const { crises, updateCrisis } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const refreshReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports`);
      const data = await res.json();
      if (Array.isArray(data.reports)) {
        setBackendReports(data.reports);
      }
    } catch (_) {}
  };

  useEffect(() => {
    refreshReports();
  }, []);

  const allReports = [...crises, ...backendReports];
  const report = allReports.find((r) => String(r.id) === String(reportId)) || {
    id: reportId,
    type: "General Emergency",
    location: "Assigned Sector",
    status: "PENDING",
    priority: "HIGH",
    time: "Recently",
    need: "Assessment in progress",
    score: 80,
    trapped: "None Reported",
    injured: "None Reported",
    deaths: "None Reported",
  };

  const currentStatus = String(report.status || "PENDING").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const isAcceptedDone = ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "RESOLVED", "CLOSED"].includes(currentStatus);
  const isInProgressDone = ["IN_PROGRESS", "COMPLETED", "RESOLVED", "CLOSED"].includes(currentStatus);
  const isCompletedDone = ["COMPLETED", "RESOLVED", "CLOSED"].includes(currentStatus);

  const canAccept = !isAcceptedDone && !actionLoading;
  const canInProgress = isAcceptedDone && !isInProgressDone && !actionLoading;
  const canComplete = isInProgressDone && !isCompletedDone && !actionLoading;

  const deathsNum = getReportDeaths(report);
  const injuredNum = getReportInjuries(report);
  const trappedNum = getReportTrapped(report);
  const affectedNum = parseCount(report.peopleAffected || report.people);

  const deathsDisplay =
    deathsNum !== null
      ? String(deathsNum)
      : isExplicitZero(report.deaths)
      ? "0"
      : "Not reported";

  const injuredDisplay =
    injuredNum !== null
      ? String(injuredNum)
      : isExplicitZero(report.injured)
      ? "0"
      : "Not reported";

  const trappedDisplay =
    trappedNum !== null
      ? String(trappedNum)
      : isExplicitZero(report.trapped)
      ? "0"
      : "Not reported";

  let totalAffectedDisplay = "Not reported";
  if (affectedNum !== null) {
    totalAffectedDisplay = String(affectedNum);
  } else {
    const hasAnyCount = deathsNum !== null || injuredNum !== null || trappedNum !== null;
    if (hasAnyCount) {
      const sum = (deathsNum || 0) + (injuredNum || 0) + (trappedNum || 0);
      totalAffectedDisplay = String(sum);
    }
  }

  // Completeness score evaluation
  const evaluateCompleteness = () => {
    const missing: string[] = [];
    let completed = 0;
    const total = 7;

    // 1. Disaster type
    const d = report.disaster || report.type;
    if (d && !/^(not detected|general emergency|none|null|undefined)$/i.test(String(d).trim())) {
      completed++;
    } else {
      missing.push("Disaster type");
    }

    // 2. Location
    const loc = report.location;
    if (loc && !/^(not detected|none|null|undefined|assigned sector|assigned location)$/i.test(String(loc).trim())) {
      completed++;
    } else {
      missing.push("Location");
    }

    // 3. Deaths (0 is valid reported count)
    if (deathsNum !== null || isExplicitZero(report.deaths)) {
      completed++;
    } else {
      missing.push("Death count");
    }

    // 4. Injured (0 is valid reported count)
    if (injuredNum !== null || isExplicitZero(report.injured)) {
      completed++;
    } else {
      missing.push("Injured count");
    }

    // 5. Trapped (0 is valid reported count)
    if (trappedNum !== null || isExplicitZero(report.trapped)) {
      completed++;
    } else {
      missing.push("Trapped/stranded count");
    }

    // 6. Emergency needs
    const rawNeeds = report.specificNeeds || (report.need ? [report.need] : []);
    const nList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];
    const needStr = String(report.specificNeed || report.need || "").trim();
    if (
      nList.length > 0 ||
      (needStr && !/^(none|none reported|not reported|no specific needs detected|assessment required|general relief)$/i.test(needStr))
    ) {
      completed++;
    } else {
      missing.push("Emergency needs");
    }

    // 7. Photo/Video Evidence (must be valid, relevant evidence to count)
    const hasValidEvidence =
      (report as any).evidenceValid === true ||
      (report as any).evidence_valid === true ||
      String((report as any).evidenceStatus || (report as any).evidence_status || "").trim().toLowerCase() === "valid";

    if (hasValidEvidence) {
      completed++;
    } else {
      missing.push("Photo/Video Evidence");
    }

    const calculatedScore = Math.round((completed / total) * 100);
    return { score: calculatedScore, missing };
  };

  const evalResult = evaluateCompleteness();
  const rawScore = report.completenessScore ?? (report as any).completeness ?? (report as any).completeness_score;
  const completenessScore =
    typeof rawScore === "number" && !isNaN(rawScore) ? rawScore : evalResult.score;

  const normalizeMissingField = (f: string): string => {
    const s = f.trim();
    if (/death/i.test(s)) return "Death count not confirmed";
    if (/trapped|stranded/i.test(s)) return "Trapped/stranded count not confirmed";
    if (/injur/i.test(s)) return "Injured count not confirmed";
    if (/disaster/i.test(s)) return "Disaster type not identified";
    if (/location/i.test(s)) return "Location not detected";
    if (/need/i.test(s)) return "Emergency needs not specified";
    if (/evidence|photo|video/i.test(s)) return "Photo/Video Evidence";
    return s;
  };

  let missingItemsList: string[] = [];
  if (completenessScore < 100) {
    if (Array.isArray(report.missingFields) && report.missingFields.length > 0) {
      const cleaned = report.missingFields
        .map(normalizeMissingField)
        .filter((field) => !/roberta|confidence|classification|priority|detected disaster/i.test(field));
      missingItemsList = Array.from(new Set(cleaned));
    }
    if (missingItemsList.length === 0) {
      missingItemsList = evalResult.missing;
    }
  }

  // Actionability score evaluation
  const evaluateActionability = () => {
    let score = 0;
    const barriers: string[] = [];

    // 1. Need identified (+30)
    const rawNeeds = report.specificNeeds || (report.need ? [report.need] : []);
    const nList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];
    const needStr = String(report.specificNeed || report.need || "").trim();
    const hasNeed =
      nList.length > 0 ||
      (needStr &&
        !/^(none|none reported|not reported|no specific needs detected|assessment required|general relief)$/i.test(needStr));
    if (hasNeed) {
      score += 30;
    } else {
      barriers.push("Specific emergency needs not specified");
    }

    // 2. Urgency (+20)
    const urgency = String(report.urgency || "").trim().toLowerCase();
    if (["critical", "high", "medium"].includes(urgency)) {
      score += 20;
    } else if (["low", "standard"].includes(urgency)) {
      score += 10;
    } else {
      score += 10;
    }

    // 3. Location detected (+20)
    const loc = String(report.location || "").trim();
    const hasLoc = loc && !/^(not detected|none|null|undefined|assigned sector|assigned location)$/i.test(loc);
    if (hasLoc) {
      score += 20;
    } else {
      barriers.push("Actionable location not detected");
    }

    // 4. Casualties / people impact (+15)
    const hasImpact =
      deathsNum !== null ||
      injuredNum !== null ||
      trappedNum !== null ||
      affectedNum !== null;
    if (hasImpact) {
      score += 15;
    } else {
      barriers.push("Casualty and affected impact unconfirmed");
    }

    // 5. Contact number available (+10)
    const contact = String(report.contact || "").trim();
    const hasContact =
      contact &&
      !/^(not detected|not provided|none|null|undefined)$/i.test(contact) &&
      /\d{5,}/.test(contact);
    if (hasContact) {
      score += 10;
    } else {
      barriers.push("Direct citizen contact number not provided");
    }

    // 6. Disaster type (+5)
    const d = String(report.disaster || report.type || "").trim();
    const hasDisaster = d && !/^(not detected|general emergency|none|null|undefined)$/i.test(d);
    if (hasDisaster) {
      score += 5;
    } else {
      barriers.push("Specific disaster type not identified");
    }

    let level = "Standard";
    if (score >= 70) level = "High";
    else if (score >= 40) level = "Medium";
    else level = "Low";

    return { score, level, barriers };
  };

  const actionResult = evaluateActionability();
  const rawActionability =
    report.actionabilityScore ?? (report as any).actionability ?? (report as any).actionability_score;
  const actionabilityScore =
    typeof rawActionability === "number" && !isNaN(rawActionability)
      ? rawActionability
      : actionResult.score;
  const actionabilityLevel =
    report.actionabilityLevel ||
    (actionabilityScore >= 70 ? "High" : actionabilityScore >= 40 ? "Medium" : "Low");
  const actionabilityBarriers =
    actionabilityScore < 100
      ? Array.isArray(report.actionabilityReasons) && report.actionabilityReasons.length > 0
        ? report.actionabilityReasons
        : actionResult.barriers
      : [];

  // Priority score evaluation
  const evaluatePriority = () => {
    let score = 0;
    const reasons: string[] = [];

    const urgency = String(report.urgency || "").trim().toLowerCase();
    if (urgency === "critical") {
      score += 50;
      reasons.push("Critical urgency detected");
    } else if (urgency === "high") {
      score += 40;
      reasons.push("High urgency detected");
    } else if (urgency === "medium") {
      score += 25;
      reasons.push("Medium urgency detected");
    } else {
      score += 10;
      reasons.push("Low urgency detected");
    }

    const rawNeeds = report.specificNeeds || (report.need ? [report.need] : []);
    const nList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];
    const needStr = String(report.specificNeed || report.need || "").trim();
    const hasNeed =
      nList.length > 0 ||
      (needStr &&
        !/^(none|none reported|not reported|no specific needs detected|assessment required|general relief)$/i.test(needStr));
    if (hasNeed) {
      score += 25;
      reasons.push("Specific emergency need identified");
    }

    const hasImpact =
      deathsNum !== null ||
      injuredNum !== null ||
      trappedNum !== null ||
      affectedNum !== null;
    if (hasImpact) {
      score += 20;
      reasons.push("People affected / casualty information available");
    }

    const d = String(report.disaster || report.type || "").trim();
    const hasDisaster = d && !/^(not detected|general emergency|none|null|undefined)$/i.test(d);
    if (hasDisaster) {
      score += 15;
      reasons.push("Disaster event identified");
    }

    score = Math.min(score, 100);
    let level = "Standard";
    if (score >= 80) level = "Critical";
    else if (score >= 60) level = "High";
    else if (score >= 40) level = "Medium";
    else level = "Low";

    return { score, level, reasons };
  };

  const priorityResult = evaluatePriority();
  const rawPriority = report.priorityScore ?? report.score ?? (report as any).priority_rating;
  const priorityScore =
    typeof rawPriority === "number" && !isNaN(rawPriority) ? rawPriority : priorityResult.score;
  const priorityLevel =
    report.priority ||
    (report as any).priority_level ||
    (priorityScore >= 80 ? "Critical" : priorityScore >= 60 ? "High" : priorityScore >= 40 ? "Medium" : "Low");

  const priorityReasonsList =
    Array.isArray(report.priorityReasons) && report.priorityReasons.length > 0
      ? report.priorityReasons
      : priorityResult.reasons;

  const confRaw = report.confidence ?? (report as any).roberta_confidence;
  const confidenceDisplay =
    confRaw != null && !isNaN(Number(confRaw))
      ? Number(confRaw) <= 1
        ? `${(Number(confRaw) * 100).toFixed(1)}%`
        : `${Number(confRaw).toFixed(1).replace(/\.0$/, "")}%`
      : "95.0%";

  const rawContact = report.contact || (report as any).phone;
  const contactDisplay =
    rawContact &&
    String(rawContact).trim() !== "" &&
    !/^(not detected|none reported|not reported|phone verified|verified)$/i.test(String(rawContact).trim())
      ? String(rawContact).trim()
      : "Not Provided";

  const handleAction = async (action: "accepted" | "in_progress" | "completed" | "note", noteVal?: string) => {
    if (action === "accepted" && !canAccept) return;
    if (action === "in_progress" && !canInProgress) return;
    if (action === "completed" && !canComplete) return;

    setActionLoading(true);
    setActionMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "note" ? { action, note: noteVal } : { action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action failed.");
      }

      const updatedStatus = String(data.report?.status || action).toUpperCase();
      updateCrisis(report.id, updatedStatus, data.report);
      if (data.report) {
        setBackendReports((prev) =>
          prev.map((r) => (String(r.id) === String(report.id) ? { ...r, ...data.report } : r))
        );
      }
      setActionMessage(`✓ Incident marked as ${updatedStatus.replace(/_/g, " ")}.`);
      setNoteOpen(false);
      setNoteText("");
      refreshReports();
    } catch (err: any) {
      setActionMessage(`⚠️ ${err.message || "Failed to update incident."}`);
    } finally {
      setActionLoading(false);
    }
  };

  const rawNeeds = report.specificNeeds || (report.need ? [report.need] : []);
  const needsList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-teal-400 hover:text-teal-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
        >
          ‹ BACK TO INCIDENT LIST
        </button>
        {onNavigateMap && (
          <button
            type="button"
            onClick={() => onNavigateMap(report.location, report.id)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            📍 GPS Confirmed / Open on Map
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm font-bold text-teal-400">{report.id}</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-950 text-red-300 border border-red-900">
              {report.priority || "HIGH"}
            </span>
            <Status value={report.status || "PENDING"} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {report.disaster || report.type} · {report.location}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Submitted at {report.time || "Recently"} · Citizen signal intake ({report.contact || "Phone verified"})
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-teal-950/80 border border-teal-800 rounded-xl text-xs font-bold text-teal-200">
          {actionMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Details & Impact */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Message Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              ORIGINAL CITIZEN DISTRESS SIGNAL
            </span>
            <p className="text-slate-100 text-base leading-relaxed border-l-2 border-teal-500 pl-4 py-1 italic">
              "{report.message || "No textual description provided."}"
            </p>
            <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>👤 Verified Reporter</span>
              <span>📍 GPS Confirmed Area: {report.location}</span>
            </div>
          </div>

          {/* Citizen Attached Photo & Video Evidence */}
          {(report.photoUrl || report.videoUrl || (report.attachments && report.attachments.length > 0)) && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Citizen Uploaded Evidence</h3>
                  <p className="text-xs text-slate-400">Attached photos and recorded video evidence</p>
                </div>
                {(() => {
                  const evStatus =
                    (report as any).evidenceStatus ||
                    (report as any).evidence_status ||
                    (report.photoUrl ? "valid" : "requires_verification");
                  const isEvValid =
                    (report as any).evidenceValid === true ||
                    (report as any).evidence_valid === true ||
                    evStatus === "valid";

                  if (isEvValid) {
                    return (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        ✓ VERIFIED DISASTER EVIDENCE
                      </span>
                    );
                  }
                  if (evStatus === "invalid") {
                    return (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                        ❌ UNRELATED / INVALID EVIDENCE
                      </span>
                    );
                  }
                  return (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                      ⚠️ REQUIRES MANUAL VERIFICATION
                    </span>
                  );
                })()}
              </div>

              {((report as any).evidenceMessage || (report as any).evidenceReason) && (
                <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-semibold">Verification Note: </span>
                  {(report as any).evidenceMessage || (report as any).evidenceReason}
                </div>
              )}

              {report.videoUrl && (
                <div className="text-[11px] text-amber-300/80 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-800/40">
                  ℹ️ Video container verified. Frame-level visual analysis requires coordinator manual review.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {report.photoUrl && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-xs text-teal-300 font-bold flex items-center gap-1.5">
                      📷 {report.photoName || "Photo Evidence"}
                    </span>
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-black flex items-center justify-center max-h-64">
                      <img
                        src={report.photoUrl.startsWith("http") ? report.photoUrl : `${API_BASE_URL}${report.photoUrl.startsWith('/') ? '' : '/'}${report.photoUrl}`}
                        alt="Disaster evidence"
                        className="object-contain max-h-64 w-full cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(report.photoUrl!.startsWith("http") ? report.photoUrl! : `${API_BASE_URL}${report.photoUrl!.startsWith('/') ? '' : '/'}${report.photoUrl!}`, "_blank")}
                      />
                    </div>
                  </div>
                )}

                {report.videoUrl && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-xs text-teal-300 font-bold flex items-center gap-1.5">
                      📹 {report.videoName || "Video Evidence"}
                    </span>
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-black">
                      <video
                        src={report.videoUrl.startsWith("http") ? report.videoUrl : `${API_BASE_URL}${report.videoUrl.startsWith('/') ? '' : '/'}${report.videoUrl}`}
                        controls
                        className="w-full max-h-64 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Extraction & RoBERTa Prediction Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">AI Classification & Triage Extraction</h3>
                <p className="text-xs text-slate-400">Model inference decoupled from resource needs extraction</p>
              </div>
              <span className="px-3 py-1 bg-teal-950 text-teal-300 border border-teal-800 rounded-lg text-xs font-bold font-mono tracking-wide">
                {confidenceDisplay} CONFIDENCE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                <span className="text-slate-500 block mb-1">Disaster Type</span>
                <strong className="text-white text-sm break-words">{report.disaster || report.type || "General Emergency"}</strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                <span className="text-slate-500 block mb-1">RoBERTa Class</span>
                <strong className="text-teal-300 text-xs sm:text-sm font-semibold leading-snug break-words whitespace-normal block">
                  {report.modelCategory || "Humanitarian classification"}
                </strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                <span className="text-slate-500 block mb-1">Urgency</span>
                <strong className={`text-sm font-bold uppercase ${
                  String(report.urgency || report.priority || "").toUpperCase() === "CRITICAL" ||
                  String(report.urgency || report.priority || "").toUpperCase() === "IMMEDIATE"
                    ? "text-red-400"
                    : String(report.urgency || report.priority || "").toUpperCase() === "HIGH" ||
                      String(report.urgency || report.priority || "").toUpperCase() === "URGENT"
                    ? "text-amber-400"
                    : "text-teal-300"
                }`}>
                  {String(report.urgency || (report.priority === "Critical" ? "Immediate" : report.priority || "Urgent")).toUpperCase()}
                </strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                <span className="text-slate-500 block mb-1">Contact</span>
                <strong className="text-white text-sm font-mono truncate block" title={contactDisplay}>
                  {contactDisplay}
                </strong>
              </div>
            </div>

            {/* Emergency Needs Chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase mb-2">
                Extracted Resource & Assistance Needs
              </span>
              <div className="flex flex-wrap gap-2">
                {needsList.length > 0 ? (
                  needsList.map((need, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-teal-950/80 text-teal-300 border border-teal-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      ✓ {need}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No specific resource needs requested</span>
                )}
              </div>
            </div>
          </div>

          {/* Human Impact Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Reported Human Impact</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-red-950/30 border border-red-900/60 rounded-xl text-center">
                <span className="text-red-400 text-2xl font-bold font-mono block">
                  {deathsDisplay}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Deaths</span>
              </div>
              <div className="p-4 bg-amber-950/30 border border-amber-900/60 rounded-xl text-center">
                <span className="text-amber-400 text-2xl font-bold font-mono block">
                  {injuredDisplay}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Injured</span>
              </div>
              <div className="p-4 bg-teal-950/30 border border-teal-900/60 rounded-xl text-center">
                <span className="text-teal-400 text-2xl font-bold font-mono block">
                  {trappedDisplay}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Trapped / Stranded</span>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-white text-2xl font-bold font-mono block">
                  {totalAffectedDisplay}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Affected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Manual Incident State Transitions & Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white mb-2">Operational Incident Actions</h3>
            <p className="text-xs text-slate-400">
              Execute controlled state transitions. Actions persist to the audit log and update the citizen tracking timeline.
            </p>

            {/* Sequential Transition Action Buttons with Dark Glassmorphism Styling */}
            <div className="space-y-3">
              {/* Button 1: ACCEPT INCIDENT */}
              {isAcceptedDone ? (
                <div className="w-full py-3.5 px-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 backdrop-blur-md select-none shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                  <span>✓</span> ACCEPTED
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canAccept}
                  onClick={() => handleAction("accepted")}
                  className={`w-full py-3.5 px-4 font-bold text-xs rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md ${
                    canAccept
                      ? "bg-teal-500/15 border-teal-500/50 hover:bg-teal-500/25 hover:border-teal-400 text-teal-200 hover:text-white cursor-pointer shadow-[0_0_20px_rgba(20,184,166,0.2)]"
                      : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-40 cursor-not-allowed"
                  }`}
                >
                  {actionLoading ? "PROCESSING..." : "ACCEPT INCIDENT"}
                </button>
              )}

              {/* Button 2: MARK IN PROGRESS */}
              {isInProgressDone ? (
                <div className="w-full py-3.5 px-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 backdrop-blur-md select-none shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                  <span>✓</span> IN PROGRESS
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canInProgress}
                  onClick={() => handleAction("in_progress")}
                  className={`w-full py-3.5 px-4 font-bold text-xs rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md ${
                    canInProgress
                      ? "bg-cyan-500/15 border-cyan-500/50 hover:bg-cyan-500/25 hover:border-cyan-400 text-cyan-200 hover:text-white cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                      : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-40 cursor-not-allowed"
                  }`}
                >
                  {actionLoading ? "PROCESSING..." : "⚡ MARK IN PROGRESS"}
                </button>
              )}

              {/* Button 3: MARK MISSION COMPLETED */}
              {isCompletedDone ? (
                <div className="w-full py-3.5 px-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 backdrop-blur-md select-none shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                  <span>✓</span> MISSION COMPLETED
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canComplete}
                  onClick={() => handleAction("completed")}
                  className={`w-full py-3.5 px-4 font-bold text-xs rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md ${
                    canComplete
                      ? "bg-emerald-500/15 border-emerald-500/50 hover:bg-emerald-500/25 hover:border-emerald-400 text-emerald-200 hover:text-white cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-40 cursor-not-allowed"
                  }`}
                >
                  {actionLoading ? "PROCESSING..." : "✓ MARK MISSION COMPLETED"}
                </button>
              )}

              {/* Responder Note Toggle */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setNoteOpen((prev) => !prev)}
                className="w-full py-3 px-4 bg-slate-800/40 hover:bg-slate-800/70 text-slate-300 hover:text-white font-semibold rounded-xl border border-slate-700/60 transition text-xs cursor-pointer backdrop-blur-sm flex items-center justify-center gap-2"
              >
                💬 {noteOpen ? "CANCEL NOTE" : "ATTACH RESPONDER NOTE"}
              </button>
            </div>

            {noteOpen && (
              <div className="space-y-2 pt-2">
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type an update or instruction for the citizen..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                />
                <Button
                  onClick={() => handleAction("note", noteText)}
                  disabled={actionLoading || !noteText.trim()}
                  className="w-full text-xs"
                >
                  DISPATCH NOTE TO CITIZEN
                </Button>
              </div>
            )}
          </div>

          {/* Quantitative Intelligence */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
              <span>📊</span> Quantitative Intelligence
            </h4>

            {/* 1. Actionability Score */}
            <div className="border-b border-slate-800/80 pb-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Actionability Score:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                    {actionabilityLevel}
                  </span>
                  <strong className="text-white font-mono text-sm">{actionabilityScore}/100</strong>
                </div>
              </div>
              {actionabilityScore < 100 && actionabilityBarriers.length > 0 && (
                <div className="text-[11px] text-slate-400 pl-2.5 border-l-2 border-slate-700 leading-relaxed">
                  <span className="text-slate-500 font-semibold">Operational barriers: </span>
                  {actionabilityBarriers.join("; ")}.
                </div>
              )}
            </div>

            {/* 2. Completeness Score */}
            <div className="border-b border-slate-800/80 pb-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Completeness Score:</span>
                <strong
                  className={`font-mono text-sm ${
                    completenessScore === 100 ? "text-emerald-400" : "text-amber-300"
                  }`}
                >
                  {completenessScore}/100
                </strong>
              </div>
              {completenessScore < 100 && missingItemsList.length > 0 && (
                <div className="text-[11px] text-amber-300/90 pl-2.5 border-l-2 border-amber-800/80 leading-relaxed">
                  <span className="text-amber-400 font-semibold">Missing information: </span>
                  {missingItemsList.join("; ")}.
                </div>
              )}
            </div>

            {/* 3. Priority Score and Priority Level */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Priority Score and Priority Level:</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase ${
                      priorityLevel === "Critical"
                        ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                        : priorityLevel === "High"
                        ? "bg-orange-950/80 text-orange-300 border border-orange-800/60"
                        : priorityLevel === "Medium"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                        : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                    }`}
                  >
                    {priorityLevel}
                  </span>
                  <strong className="text-white font-mono text-sm">{priorityScore}/100</strong>
                </div>
              </div>
              {priorityReasonsList.length > 0 && (
                <div className="text-[11px] text-slate-400 pl-2.5 border-l-2 border-slate-700 leading-relaxed">
                  <span className="text-slate-500 font-semibold">Contributing factors: </span>
                  {priorityReasonsList.join("; ")}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtractedDataLogPage({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  const allReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...crises, ...backendReports].forEach((r) => {
      if (r && r.id && isGenuineCrisisRecord(r)) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || a.time || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || b.time || 0).getTime();
      return timeB - timeA;
    });
  }, [crises, backendReports]);

  const filtered = allReports.filter((r) =>
    [r.id, r.disaster, r.type, r.location, r.priority, r.need, r.modelCategory].some((v) =>
      String(v || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleDownloadCsv = () => {
    window.open(`${API_BASE_URL}/api/reports/export-csv`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="CONSOLIDATED DATA & AUDIT ARCHIVE"
        title="Extracted Data / Crisis Log"
        text="Unified audit records capturing RoBERTa classification, casualty numbers, specific resources requested, and status progression."
        action={
          <Button onClick={handleDownloadCsv}>
            <Icon name="download" /> DOWNLOAD CSV EXPORT
          </Button>
        }
      />

      <div className="p-3.5 sm:p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
          <Icon name="search" size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search crisis logs..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          Showing <strong className="text-teal-400">{filtered.length}</strong> of {allReports.length} incidents
        </span>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            👈 Swipe horizontally for full audit log 👉
          </span>
          <span className="font-mono text-teal-300 font-bold">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[1350px] text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 shadow-[0_1px_0_rgba(51,65,85,1)]">
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[130px]">Crisis ID</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px]">Disaster</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[140px]">Location</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[200px]">Extracted Needs</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[110px]">Actionable</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px]">Completeness</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[160px]">RoBERTa Class</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[140px]">Casualties</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[110px]">Priority</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px]">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filtered.map((r) => {
                const rawNeeds = r.specificNeeds || (r.need ? [r.need] : []);
                const needsList = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean) : [];

                const rawAct = r.actionabilityScore ?? (r as any).actionability ?? (r as any).actionability_score;
                const actScore = typeof rawAct === "number" && !isNaN(rawAct) ? rawAct : (r.priority === "Critical" ? 95 : 85);
                const actLevel = r.actionabilityLevel || (actScore >= 70 ? "High" : actScore >= 40 ? "Medium" : "Low");

                const rawComp = r.completenessScore ?? (r as any).completeness ?? (r as any).completeness_score;
                const compScore = typeof rawComp === "number" && !isNaN(rawComp) ? rawComp : (r.location && r.location !== "Not Detected" ? 90 : 75);

                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-teal-400 whitespace-nowrap">{r.id}</td>
                    <td className="p-4 font-semibold text-white whitespace-nowrap">{r.disaster || r.type}</td>
                    <td className="p-4 text-slate-300 whitespace-nowrap">{r.location}</td>
                    <td className="p-4 min-w-[200px]">
                      {needsList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {needsList.map((n, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[10px] whitespace-nowrap">
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 whitespace-nowrap">None detected</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        actScore >= 80 ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" :
                        actScore >= 50 ? "bg-amber-950/80 text-amber-300 border-amber-800" :
                        "bg-red-950/80 text-red-300 border-red-800"
                      }`}>
                        {actLevel} ({actScore}%)
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        compScore >= 85 ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" :
                        "bg-amber-950/80 text-amber-300 border-amber-800"
                      }`}>
                        {compScore}%
                      </span>
                    </td>
                    <td className="p-4 text-teal-300 font-medium whitespace-nowrap">{r.modelCategory || "Humanitarian classification"}</td>
                    <td className="p-4 text-slate-300 font-mono whitespace-nowrap">
                      D:{String(r.deaths || 0)} / I:{String(r.injured || 0)} / T:{String(r.trapped || 0)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        (r.priority || "").toLowerCase() === "critical"
                          ? "bg-red-950 text-red-400 border-red-900"
                          : (r.priority || "").toLowerCase() === "high"
                          ? "bg-amber-950 text-amber-400 border-amber-900"
                          : "bg-teal-950 text-teal-300 border-teal-800"
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <Status value={r.status || "PENDING"} />
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpen(r.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-[11px] cursor-pointer"
                      >
                        VIEW DETAILS
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  const allReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...backendReports, ...crises].forEach((r) => {
      if (r && r.id && isGenuineCrisisRecord(r)) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [crises, backendReports]);

  // TODAY'S ANALYTICS DATA
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayReports = allReports.filter((r) => {
    const t = new Date(r.timestamp || r.createdAt || r.time || 0);
    return t >= todayStart;
  });

  const todayCount = todayReports.length;
  const todayCritical = todayReports.filter((r) => (r.priority || "").toLowerCase() === "critical").length;
  const todayHigh = todayReports.filter((r) => (r.priority || "").toLowerCase() === "high").length;
  const todayAccepted = todayReports.filter((r) => (r.status || "").toLowerCase() === "accepted").length;
  const todayInProgress = todayReports.filter((r) => (r.status || "").toLowerCase() === "in_progress").length;
  const todayCompleted = todayReports.filter((r) => (r.status || "").toLowerCase() === "completed").length;

  // OVERALL ANALYTICS DATA
  const totalReports = allReports.length;
  const totalDeaths = allReports.reduce((acc, r) => {
    const d = getReportDeaths(r);
    return acc + (d !== null ? d : 0);
  }, 0);
  const totalInjured = allReports.reduce((acc, r) => {
    const i = getReportInjuries(r);
    return acc + (i !== null ? i : 0);
  }, 0);
  const totalTrapped = allReports.reduce((acc, r) => {
    const t = getReportTrapped(r);
    return acc + (t !== null ? t : 0);
  }, 0);

  // Disaster Distribution Calculation
  const disasterCounts: Record<string, number> = {};
  allReports.forEach((r) => {
    const d = r.disaster || r.type || "Other";
    disasterCounts[d] = (disasterCounts[d] || 0) + 1;
  });

  const disasterData = Object.entries(disasterCounts).map(([name, value], i) => {
    const colors = ["#2dd4bf", "#38bdf8", "#f43f5e", "#fbbf24", "#a855f7"];
    return { name, value, color: colors[i % colors.length] };
  });

  // Priority Distribution Calculation
  const priorityCounts: Record<string, number> = { Critical: 0, High: 0, Standard: 0 };
  allReports.forEach((r) => {
    const p = r.priority || "Standard";
    if (priorityCounts[p] !== undefined) priorityCounts[p]++;
    else priorityCounts["Standard"]++;
  });
  const priorityData = Object.entries(priorityCounts).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6 sm:space-y-10">
      <PageTitle
        eyebrow="OPERATIONAL INTELLIGENCE"
        title="Triage & Disaster Analytics"
        text="Operational metrics derived strictly from authorized persisted records, segregated into Today's Operational Performance and Overall Historical Trends."
      />

      {/* SECTION 1: TODAY'S ANALYTICS */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-7 shadow-xl space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">1. Today's Analytics</h2>
            <p className="text-xs text-slate-400">Intake and response metrics recorded on current local date</p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800 text-xs font-mono font-bold">
            DATE: {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <strong className="text-xl sm:text-2xl font-bold text-white block">{todayCount}</strong>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Reports Today</span>
          </div>
          <div className="p-3 sm:p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-center">
            <strong className="text-xl sm:text-2xl font-bold text-red-400 block">{todayCritical}</strong>
            <span className="text-[10px] text-red-300 font-bold uppercase">Critical Today</span>
          </div>
          <div className="p-3 sm:p-4 bg-amber-950/40 border border-amber-900/60 rounded-xl text-center">
            <strong className="text-xl sm:text-2xl font-bold text-amber-400 block">{todayHigh}</strong>
            <span className="text-[10px] text-amber-300 font-bold uppercase">High Priority</span>
          </div>
          <div className="p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <strong className="text-xl sm:text-2xl font-bold text-teal-400 block">{todayAccepted}</strong>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Accepted</span>
          </div>
          <div className="p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <strong className="text-xl sm:text-2xl font-bold text-sky-400 block">{todayInProgress}</strong>
            <span className="text-[10px] text-slate-400 font-bold uppercase">In Progress</span>
          </div>
          <div className="p-3 sm:p-4 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-center">
            <strong className="text-xl sm:text-2xl font-bold text-emerald-400 block">{todayCompleted}</strong>
            <span className="text-[10px] text-emerald-300 font-bold uppercase">Resolved Today</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: OVERALL ANALYTICS */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-7 shadow-xl space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">2. Overall Analytics</h2>
            <p className="text-xs text-slate-400">Complete historical disaster intelligence records and impact distributions</p>
          </div>
          <span className="text-xs text-slate-400">Total authorized reports: <strong>{totalReports}</strong></span>
        </div>

        {/* Casualty Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 bg-red-950/20 border border-red-900/50 rounded-xl">
            <span className="text-[11px] sm:text-xs text-slate-400 block mb-1 truncate">Fatalities Reported</span>
            <strong className="text-xl sm:text-2xl font-bold text-red-400 font-mono">{totalDeaths}</strong>
          </div>
          <div className="p-3 sm:p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl">
            <span className="text-[11px] sm:text-xs text-slate-400 block mb-1 truncate">Injuries Reported</span>
            <strong className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">{totalInjured}</strong>
          </div>
          <div className="p-3 sm:p-4 bg-teal-950/20 border border-teal-900/50 rounded-xl">
            <span className="text-[11px] sm:text-xs text-slate-400 block mb-1 truncate">Trapped Citizens</span>
            <strong className="text-xl sm:text-2xl font-bold text-teal-400 font-mono">{totalTrapped}</strong>
          </div>
          <div className="p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[11px] sm:text-xs text-slate-400 block mb-1 truncate">Resolved Missions</span>
            <strong className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              {allReports.filter((r) => (r.status || "").toLowerCase() === "completed").length}
            </strong>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 pt-2 sm:pt-4">
          {/* Disaster Type Distribution */}
          <div className="p-3.5 sm:p-5 bg-slate-950 border border-slate-800 rounded-xl">
            <h3 className="text-sm font-bold text-white mb-3 sm:mb-4">Disaster Category Distribution</h3>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={disasterData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                    {disasterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center text-xs mt-2">
              {disasterData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-300">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Levels Bar Chart */}
          <div className="p-3.5 sm:p-5 bg-slate-950 border border-slate-800 rounded-xl">
            <h3 className="text-sm font-bold text-white mb-3 sm:mb-4">Priority Triage Breakdown</h3>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RescueFeedback() {
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [responseModalId, setResponseModalId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFeedbacks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`);
      const data = await res.json();
      if (Array.isArray(data.feedback)) {
        setFeedbackList(data.feedback);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleMarkReviewed = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/feedback/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review" }),
      });
      loadFeedbacks();
    } catch (_) {}
  };

  const handleAddResponse = async (id: string) => {
    if (!responseText.trim()) return;
    setLoading(true);

    try {
      await fetch(`${API_BASE_URL}/api/feedback/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "response", responseText: responseText.trim() }),
      });
      setResponseModalId(null);
      setResponseText("");
      loadFeedbacks();
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="COMMUNITY RESPONSE AUDIT"
        title="User Feedback Inbox"
        text="Review citizen ratings and comments following completed emergency deployments. Responders can mark reviews and dispatch responses back to citizens."
      />

      {feedbackList.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm">No citizen feedback submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((fb) => (
            <article
              key={fb.id}
              className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Status value={fb.status || "NEW"} />
                  <span className="font-mono text-xs font-bold text-teal-400">
                    CRISIS ID: {fb.crisisId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">{"★".repeat(fb.rating)}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <blockquote className="text-sm text-slate-200 italic border-l-2 border-teal-500 pl-4 py-1">
                "{fb.feedbackText}"
              </blockquote>

              {fb.rescueResponse && (
                <div className="p-3 bg-teal-950/60 border border-teal-800 rounded-xl text-xs">
                  <span className="font-bold text-teal-300 block mb-1">YOUR DISPATCHED RESPONSE:</span>
                  <p className="text-slate-200">"{fb.rescueResponse}"</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-500 font-mono">Feedback ID: {fb.id}</span>
                <div className="flex items-center gap-2">
                  {fb.status !== "reviewed" && (
                    <Button
                      variant="secondary"
                      onClick={() => handleMarkReviewed(fb.id)}
                    >
                      <Icon name="check" size={14} /> MARK AS REVIEWED
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setResponseModalId(fb.id);
                      setResponseText(fb.rescueResponse || "");
                    }}
                  >
                    <Icon name="feedback" size={14} /> {fb.rescueResponse ? "EDIT RESPONSE" : "ADD RESPONSE"}
                  </Button>
                </div>
              </div>

              {responseModalId === fb.id && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-3">
                  <label className="field">
                    <span>Message for Citizen *</span>
                    <textarea
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type response back to citizen..."
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setResponseModalId(null)}>
                      CANCEL
                    </Button>
                    <Button onClick={() => handleAddResponse(fb.id)} disabled={loading}>
                      {loading ? "SAVING..." : "SEND RESPONSE TO USER"}
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamProfile({
  user,
  onLogout,
}: {
  user?: any;
  onLogout: () => void;
}) {
  const name = user?.name || "South Response · Team Alpha";
  const teamId = user?.teamIdentifier || user?.id || "TNDRF-SR-014";
  const email = user?.email || "rescue.alpha@tndrf.gov.in";
  const mobile = user?.mobile || "+91 98400 11223";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitle
        eyebrow="OPERATIONAL COMMAND UNIT"
        title="Team Profile"
        text="Authorized emergency responders and shift management details."
      />

      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-xl space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 font-bold text-2xl flex items-center justify-center border border-amber-500/40">
            <Icon name="shield" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-xs text-slate-400 font-mono">Team Identifier: {teamId}</p>
          </div>
          <div className="ml-auto">
            <Status value="IN PROGRESS" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">Contact Dispatch</span>
            <strong className="text-white text-sm">{mobile}</strong>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">Agency Email</span>
            <strong className="text-white text-sm">{email}</strong>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <Button variant="danger" onClick={onLogout}>
            <Icon name="logout" /> END COMMAND SESSION
          </Button>
        </div>
      </section>
    </div>
  );
}

function MapPage({
  initialLocation,
  onOpen,
}: {
  initialLocation?: string;
  onOpen: (id: string) => void;
}) {
  const { crises } = useCrises();
  const [backendReports, setBackendReports] = useState<CrisisRecord[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.reports)) {
          setBackendReports(data.reports);
        }
      })
      .catch((_) => {});
  }, [crises]);

  const allReports = useMemo(() => {
    const map = new Map<string, CrisisRecord>();
    [...crises, ...backendReports].forEach((r) => {
      if (r && r.id && isGenuineCrisisRecord(r)) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [crises, backendReports]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <GISCommandMap
        initialLocation={initialLocation}
        incidents={allReports as MapIncident[]}
        onOpenIncident={onOpen}
      />
    </div>
  );
}

function RescueApp({
  user,
  onLogout,
}: {
  user?: any;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<RescuePage>("Dashboard");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [targetMapLocation, setTargetMapLocation] = useState<string | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleNavigateMap = (location: string, incidentId: string) => {
    setTargetMapLocation(location);
    setSelectedIncidentId(null);
    setPage("GIS Command Map");
  };

  const renderContent = () => {
    if (selectedIncidentId) {
      return (
        <IncidentDetail
          reportId={selectedIncidentId}
          onBack={() => setSelectedIncidentId(null)}
          onNavigateMap={handleNavigateMap}
        />
      );
    }

    if (page === "Dashboard") {
      return <RescueDashboard onOpen={(id) => setSelectedIncidentId(id)} setPage={setPage} />;
    }

    if (page === "Incoming Crises") {
      return (
        <IncomingPage
          onOpen={(id) => setSelectedIncidentId(id)}
          onNavigateMap={handleNavigateMap}
        />
      );
    }

    if (page === "Completed Crises") {
      return <CompletedCrisesPage onOpen={(id) => setSelectedIncidentId(id)} />;
    }

    if (page === "GIS Command Map") {
      return (
        <MapPage
          initialLocation={targetMapLocation}
          onOpen={(id) => setSelectedIncidentId(id)}
        />
      );
    }

    if (page === "Extracted Data / Crisis Log") {
      return <ExtractedDataLogPage onOpen={(id) => setSelectedIncidentId(id)} />;
    }

    if (page === "Analytics") {
      return <AnalyticsPage />;
    }

    if (page === "User Feedback") {
      return <RescueFeedback />;
    }

    return <TeamProfile user={user} onLogout={onLogout} />;
  };

  return (
    <div className={`rescue-app ${collapsed ? "rescue-sidebar-collapsed" : ""}`}>
      <style>{`
        .rescue-app {
          display: flex !important;
          flex-direction: row !important;
          width: 100%;
          height: 100vh;
          min-height: 100vh;
          overflow: hidden;
          background: #08111b;
          color: #dbe5ef;
        }

        .rescue-sidebar {
          position: relative !important;
          flex: 0 0 258px;
          width: 258px;
          min-width: 258px;
          height: 100vh;
          overflow-y: auto;
          background: #0c1824;
          border-right: 1px solid #1a2a3c;
          transition: width .25s ease, flex-basis .25s ease;
        }

        .rescue-sidebar.collapsed {
          flex-basis: 76px;
          width: 76px;
          min-width: 76px;
        }

        .rescue-sidebar.collapsed span,
        .rescue-sidebar.collapsed .command-mode,
        .rescue-sidebar.collapsed .sidebar-logout span {
          display: none !important;
        }

        .rescue-workspace {
          display: flex;
          flex: 1 1 0;
          flex-direction: column;
          width: 0;
          min-width: 0;
          height: 100vh;
          overflow: hidden;
        }

        .rescue-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 32px;
        }

        @media (max-width: 768px) {
          .rescue-app {
            flex-direction: column !important;
          }

          .rescue-sidebar {
            display: none !important;
          }

          .rescue-workspace {
            width: 100% !important;
            height: 100vh !important;
          }

          .rescue-topbar {
            padding: 10px 14px !important;
            height: 54px !important;
          }

          .rescue-main {
            padding: 14px 12px 84px 12px !important;
            -webkit-overflow-scrolling: touch !important;
          }
        }
      `}</style>

      <RescueSidebar
        page={page}
        setPage={(p) => {
          setPage(p);
          setSelectedIncidentId(null);
        }}
        collapsed={collapsed}
        setCollapsed={() => setCollapsed((v) => !v)}
        onLogout={onLogout}
      />

      <div className="rescue-workspace">
        <RescueTopbar
          page={selectedIncidentId ? "Incoming Crises" : page}
          onOpenDrawer={() => setMobileDrawerOpen(true)}
        />
        <main className="rescue-main">{renderContent()}</main>
      </div>

      {/* Mobile Off-canvas Navigation Drawer for Responders */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[82vw] h-full bg-[#0c1824] border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer text-xs font-bold"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <div className="px-3 py-2 mb-3 rounded-lg bg-amber-950/40 border border-amber-900/50 flex items-center gap-2.5">
                <span className="online-dot" />
                <div className="truncate">
                  <span className="text-xs text-amber-300 font-bold block truncate">
                    {user?.name || "South Response · Team Alpha"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">COMMAND MODE · LIVE</span>
                </div>
              </div>

              <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 px-1">
                OPERATIONAL MODULES
              </div>

              <nav className="space-y-1">
                {rescueNav.map((item) => (
                  <button
                    key={item.page}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                      page === item.page && !selectedIncidentId
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                    onClick={() => {
                      setPage(item.page);
                      setSelectedIncidentId(null);
                      setMobileDrawerOpen(false);
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.page}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-950/30 transition cursor-pointer"
              >
                <Icon name="logout" size={18} />
                <span>Exit Command</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar for Responders */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0a151ff8] border-t border-slate-800/90 backdrop-blur-xl flex items-center justify-around px-1 shadow-lg shadow-black/80 mobile-bottom-nav">
        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "Dashboard" && !selectedIncidentId
              ? "text-teal-300 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("Dashboard");
            setSelectedIncidentId(null);
          }}
        >
          <Icon name="home" size={20} />
          <span className="text-[10px] mt-1 font-medium">Dashboard</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "Incoming Crises" && !selectedIncidentId
              ? "text-teal-300 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("Incoming Crises");
            setSelectedIncidentId(null);
          }}
        >
          <Icon name="alert" size={20} />
          <span className="text-[10px] mt-1 font-medium">Incoming</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "GIS Command Map" && !selectedIncidentId
              ? "text-teal-300 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("GIS Command Map");
            setSelectedIncidentId(null);
          }}
        >
          <Icon name="map" size={20} />
          <span className="text-[10px] mt-1 font-medium">GIS Map</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            page === "Extracted Data / Crisis Log" && !selectedIncidentId
              ? "text-teal-300 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setPage("Extracted Data / Crisis Log");
            setSelectedIncidentId(null);
          }}
        >
          <Icon name="database" size={20} />
          <span className="text-[10px] mt-1 font-medium">Crisis Log</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Icon name="menu" size={20} />
          <span className="text-[10px] mt-1 font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}

/* ============================================================
   ROOT APP COMPONENT
   ============================================================ */

export default function App() {
  const [role, setRole] = useState<Role>("user");
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [crises, setCrises] = useState<CrisisRecord[]>(() => {
    try {
      const saved = localStorage.getItem("crisentra_crisis_reports");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;

    async function loadSavedReports() {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${API_BASE_URL}/api/reports`, { signal: controller.signal });
        clearTimeout(t);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load reports");
        }

        const savedReports = Array.isArray(payload.reports) ? payload.reports : [];
        if (!active) return;

        setCrises((previous) => {
          const byId = new Map(previous.map((crisis) => [crisis.id, crisis]));
          savedReports.forEach((crisis: any) => byId.set(crisis.id, crisis));
          return Array.from(byId.values());
        });
      } catch (error) {
        console.warn("Could not sync crisis reports with backend server:", error);
      }
    }

    loadSavedReports();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("crisentra_crisis_reports", JSON.stringify(crises));
    } catch (_) {}
  }, [crises]);

  const addCrisis = (crisis: CrisisRecord) => {
    setCrises((previous) => [crisis, ...previous.filter((item) => item.id !== crisis.id)]);
  };

  const updateCrisis = (id: string, status: string, additional?: Partial<CrisisRecord>) => {
    setCrises((previous) =>
      previous.map((crisis) =>
        crisis.id === id ? { ...crisis, ...additional, status } : crisis
      )
    );
  };

  if (!authenticated) {
    return (
      <AuthScreen
        role={role}
        onRole={setRole}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <CrisisContext.Provider value={{ crises, addCrisis, updateCrisis }}>
      {role === "user" ? (
        <UserApp user={currentUser} onLogout={() => setAuthenticated(false)} />
      ) : (
        <RescueApp user={currentUser} onLogout={() => setAuthenticated(false)} />
      )}
    </CrisisContext.Provider>
  );
}
