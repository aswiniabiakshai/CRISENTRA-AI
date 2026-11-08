import { useState, type FormEvent } from "react";
import AIAssistant from "../pages/ChatBot";
import type { CitizenReport, ReportStatus, UserFeedback } from "./userTypes";

interface LibraryItem {
  name: string;
  type: string;
  time: string;
}

interface Props {
  reports: CitizenReport[];
  feedback: UserFeedback[];
  sharedLibrary: LibraryItem[];
  onLibraryUpdate: (items: LibraryItem[]) => void;
  onReportSubmitted: (report: CitizenReport) => void;
  onFeedbackSubmitted: (feedback: UserFeedback) => void;
  onLogout: () => void;
}

type UserPage = "Home" | "Report Crisis" | "My Reports" | "Status" | "Feedback" | "AI Assistant" | "Profile";

const NAV_ITEMS: { id: UserPage; label: string; icon: string }[] = [
  { id: "Home", label: "Home", icon: "HM" },
  { id: "Report Crisis", label: "Report Crisis", icon: "RC" },
  { id: "My Reports", label: "My Reports", icon: "MR" },
  { id: "Status", label: "Status", icon: "ST" },
  { id: "Feedback", label: "Feedback", icon: "FB" },
  { id: "AI Assistant", label: "AI Assistant", icon: "AI" },
  { id: "Profile", label: "Profile", icon: "PR" },
];

const STATUS_STEPS: { label: string; status: ReportStatus }[] = [
  { label: "Report Submitted", status: "Submitted" },
  { label: "Processing", status: "Processing" },
  { label: "Rescue Team Notified", status: "Processing" },
  { label: "Response In Progress", status: "In Progress" },
  { label: "Completed", status: "Completed" },
];

const STATUS_ORDER: Record<ReportStatus, number> = {
  Submitted: 0,
  Processing: 2,
  "In Progress": 3,
  Completed: 4,
};

function detectDisaster(message: string) {
  const options = ["Flood", "Fire", "Earthquake", "Cyclone", "Landslide", "Tsunami"];
  return options.find((item) => message.toLowerCase().includes(item.toLowerCase())) ?? "Emergency";
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <header className="user-page-heading">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}>{status}</span>;
}

export default function UserApp({
  reports,
  feedback,
  sharedLibrary,
  onLibraryUpdate,
  onReportSubmitted,
  onFeedbackSubmitted,
  onLogout,
}: Props) {
  const [page, setPage] = useState<UserPage>("Home");
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.id ?? "");
  const [reportTab, setReportTab] = useState<"All" | "Active" | "Completed">("All");
  const [submitted, setSubmitted] = useState<CitizenReport | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const loggedInUser = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("crisentra_user") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const userName = loggedInUser.name || "User";
  const userMobile = loggedInUser.mobile || "Not provided";
  const userEmail = loggedInUser.email || "Not provided";

  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0];
  const activeReports = reports.filter((report) => report.status !== "Completed");
  const filteredReports = reports.filter((report) => {
    if (reportTab === "Active") return report.status !== "Completed";
    if (reportTab === "Completed") return report.status === "Completed";
    return true;
  });

  const goToStatus = (report: CitizenReport) => {
    setSelectedReportId(report.id);
    setPage("Status");
  };

  
  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();

    const imageFile = form.get("image") as File | null;
    const videoFile = form.get("video") as File | null;

    const now = new Date();
    const id = `CRS-${now.getFullYear()}-${String(125 + reports.length).padStart(5, "0")}`;

    let photoUrl: string | undefined = undefined;
    let photoName: string | undefined = undefined;
    let videoUrl: string | undefined = undefined;
    let videoName: string | undefined = undefined;
    let evidenceStatus: "valid" | "invalid" | "requires_verification" | undefined = undefined;
    let evidenceValid: boolean | undefined = undefined;
    let evidenceMessage: string | undefined = undefined;

    const fileToBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    if (imageFile && imageFile.size > 0) {
      try {
        const base64 = await fileToBase64(imageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: imageFile.name,
            fileType: imageFile.type,
            reportId: id,
            message,
            disaster: detectDisaster(message),
            location,
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          alert(errData.error || "Failed to upload image evidence.");
          return;
        }

        const uploadData = await uploadRes.json();
        if (uploadData.status === "invalid") {
          alert(
            uploadData.reason ||
              "Uploaded evidence does not appear relevant to the reported disaster. Please upload a suitable photo or video."
          );
          return;
        }

        photoUrl = uploadData.url;
        photoName = imageFile.name;
        evidenceStatus = uploadData.status;
        evidenceValid = uploadData.valid === true;
        evidenceMessage = uploadData.reason;
      } catch (uploadErr: any) {
        console.warn("Photo upload error:", uploadErr);
      }
    }

    if (videoFile && videoFile.size > 0) {
      try {
        const base64 = await fileToBase64(videoFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: videoFile.name,
            fileType: videoFile.type,
            reportId: id,
            message,
            disaster: detectDisaster(message),
            location,
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          alert(errData.error || "Failed to upload video evidence.");
          return;
        }

        const uploadData = await uploadRes.json();
        videoUrl = uploadData.url;
        videoName = videoFile.name;
        if (!evidenceStatus || evidenceStatus !== "valid") {
          evidenceStatus = uploadData.status || "requires_verification";
          evidenceValid = false;
          evidenceMessage = uploadData.reason || "Video evidence requires manual verification.";
        }
      } catch (uploadErr: any) {
        console.warn("Video upload error:", uploadErr);
      }
    }

    let analysis: any = {};

    // 1. Call the existing backend analysis engine (includes RoBERTa)
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          hasPhotos: Boolean(photoUrl),
          hasVideos: Boolean(videoUrl),
          evidenceStatus,
          evidenceValid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Crisis analysis failed:", errorText);
        alert("Crisis analysis failed. Please try submitting again.");
        return;
      }

      analysis = await response.json();
      console.log("[ANALYSIS RESPONSE]", analysis);

      if (!analysis || !analysis.information) {
        console.error("Invalid analysis response:", analysis);
        alert("Analysis result is incomplete. Please try again.");
        return;
      }
    } catch (error) {
      console.error("Could not connect to analysis backend:", error);
    }

    const info = analysis.information ?? {};

    const extractedNeeds = Array.isArray(info.specific_needs)
      ? info.specific_needs.join(", ")
      : info.specific_needs || info.specific_need || analysis.specificNeeds || analysis.predictedNeeds || "Not detected";

    const report = {
      id,
      message,
      disaster: info.disaster || detectDisaster(message),
      location: info.location || location,
      contact,
      submittedAt: now.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      timestamp: now.toISOString(),
      status: "Submitted" as ReportStatus,

      // Actual AI analysis fields
      category: analysis.category || "Classification unavailable",
      modelCategory:
        analysis.model_category ||
        analysis.modelCategory ||
        "Not available",
      confidence: Number(
        analysis.confidence ?? analysis.roberta_confidence ?? 0
      ),
      need: extractedNeeds,
      specificNeed: extractedNeeds,
      urgency: info.urgency || "Not detected",
      people: info.people_affected ?? "Not reported",
      trapped: info.trapped_people ?? "Not reported",
      injured: info.injured_people ?? "Not reported",
      deaths: info.death_count ?? "Not reported",
      priority: analysis.priority_level || "Not assessed",
      priorityScore: Number(analysis.priority_rating ?? 0),
      priorityReasons: Array.isArray(analysis.priority_reasons) ? analysis.priority_reasons.map(String) : [],
      actionability: analysis.actionability_score ?? null,
      actionabilityScore: analysis.actionability_score ?? null,
      actionabilityLevel: analysis.actionability_level || "Standard",
      actionabilityReasons: Array.isArray(analysis.actionability_reasons) ? analysis.actionability_reasons.map(String) : [],
      completeness: analysis.completeness_score ?? null,
      completenessScore: analysis.completeness_score ?? null,
      missingFields: Array.isArray(analysis.missing_fields) ? analysis.missing_fields.map(String) : [],

      imageName: photoName || (imageFile?.size ? imageFile.name : undefined),
      videoName: videoName || (videoFile?.size ? videoFile.name : undefined),
      photoUrl,
      photoName,
      videoUrl,
      videoName,
      evidenceStatus,
      evidenceValid,
      evidenceMessage,
    } as CitizenReport;

    // 2. Update the citizen portal
    
    // 3. Save the same report for the Rescue Team portal
    try {
      const saveResponse = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });

      if (!saveResponse.ok) {
        
        console.error(
          "Report could not be saved for Rescue Team:",
          await saveResponse.text()
        );
        alert("Report could not be saved. Please try again.");
        return;
      }

      const savedData = await saveResponse.json();
      const savedReport = savedData.report ?? report;

      onReportSubmitted(savedReport);
      setSelectedReportId(savedReport.id);
      setSubmitted(savedReport);
      event.currentTarget.reset();
    } catch (error) {
      console.error("Could not save report to backend:", error);
    }
  };



  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onFeedbackSubmitted({
      id: `FDB-${Date.now()}`,
      reportId: String(form.get("reportId")),
      rating: Number(form.get("rating")),
      category: String(form.get("category")),
      message: String(form.get("message")),
      submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    });
    setFeedbackSent(true);
    event.currentTarget.reset();
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <style>{`
      .user-layout-shell {
        display: flex !important;
        flex-direction: row !important;
        width: 100%;
        height: 100vh;
        min-height: 100vh;
        overflow: hidden;
      }

      .user-layout-shell > .user-sidebar {
        position: relative !important;
        flex: 0 0 264px;
        width: 264px !important;
        min-width: 264px;
        height: 100vh;
        overflow-y: auto;
        transition: width 0.25s ease, flex-basis 0.25s ease;
        z-index: 20;
      }

      .user-layout-shell.sidebar-collapsed > .user-sidebar {
        flex-basis: 76px;
        width: 76px !important;
        min-width: 76px;
      }

      .user-layout-shell > .role-main {
        flex: 1 1 0 !important;
        width: 0;
        min-width: 0;
        max-width: none;
        height: 100vh;
        overflow-y: auto;
        transition: flex 0.25s ease;
      }

      .user-layout-shell .user-content,
      .user-layout-shell .user-ai-shell {
        width: 100%;
        min-width: 0;
        max-width: none;
      }

      .user-layout-shell .user-ai-shell {
        min-height: 100%;
      }

      .user-layout-shell.sidebar-collapsed .user-sidebar nav button {
        justify-content: center;
        padding-inline: 0;
      }

      .user-layout-shell.sidebar-collapsed .user-sidebar nav button > span:not(.nav-monogram),
      .user-layout-shell.sidebar-collapsed .user-sidebar nav button > b,
      .user-layout-shell.sidebar-collapsed .user-sidebar .role-logo small,
      .user-layout-shell.sidebar-collapsed .user-sidebar .sidebar-account > div:not(.account-avatar),
      .user-layout-shell.sidebar-collapsed .user-sidebar .sidebar-logout,
      .user-layout-shell.sidebar-collapsed .user-sidebar .system-online {
        display: none !important;
      }

      .user-layout-shell.sidebar-collapsed .user-sidebar .sidebar-account {
        justify-content: center;
      }

      @media (max-width: 760px) {
        .user-layout-shell {
          height: auto;
          min-height: 100vh;
          overflow: visible;
        }

        .user-layout-shell > .user-sidebar {
          flex-basis: 76px;
          width: 76px !important;
          min-width: 76px;
        }

        .user-layout-shell > .role-main {
          height: auto;
          min-height: 100vh;
          overflow: visible;
        }
      }
    `}</style>
      <aside className={`role-sidebar user-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        
<div className="role-logo">
  <div><span className="logo-signal">C</span> CRISENTRA</div>
  <small>CITIZEN RESPONSE PORTAL</small>

  <button
    type="button"
    className="sidebar-toggle"
    onClick={() => setSidebarCollapsed((current) => !current)}
    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
  >
    ☰
  </button>
</div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} type="button" className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>
              <span className="nav-monogram">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "My Reports" && <b>{reports.length}</b>}
              {page === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="account-avatar">{userInitials}</div>
          <div><strong>{userName}</strong><small>Citizen account</small></div>
        </div>
        <button type="button" className="sidebar-logout" onClick={onLogout}>LOGOUT</button>
        <div className="system-online"><i /> RESPONSE NETWORK ONLINE</div>
      </aside>

      <main className="role-main">
        <div className="top-accent" />
        {page === "AI Assistant" ? (
          <div className="user-ai-shell">
            <AIAssistant sharedLibrary={sharedLibrary} onLibraryUpdate={onLibraryUpdate} />
          </div>
        ) : (
          <div className="user-content">
            {page === "Home" && (
              <section className="user-page home-page">
                <div className="welcome-band">
                  <div>
                    <span className="section-kicker">CITIZEN RESPONSE PORTAL</span>
                    <h1>Welcome, {userName}</h1>
                    <p>Your direct connection to coordinated emergency response.</p>
                  </div>
                  <div className="network-pill"><i /> ALL SYSTEMS OPERATIONAL</div>
                </div>
                <div className="home-grid">
                  <article className="glass-card primary-action-card">
                    <span className="card-index">01 / EMERGENCY REPORTING</span>
                    <div className="action-symbol">!</div>
                    <h2>Need urgent assistance?</h2>
                    <p>Send verified crisis details directly to the CRISENTRA rescue coordination network.</p>
                    <button className="neon-btn strong-action" type="button" onClick={() => setPage("Report Crisis")}>REPORT A CRISIS <span>→</span></button>
                  </article>
                  <div className="home-side-stack">
                    <article className="glass-card active-summary">
                      <div className="summary-title"><span>MY ACTIVE REPORTS</span><b>{activeReports.length}</b></div>
                      {activeReports.slice(0, 2).map((report) => (
                        <button type="button" key={report.id} onClick={() => goToStatus(report)} className="report-mini">
                          <div><strong>{report.id}</strong><span>{report.disaster} · {report.location}</span></div>
                          <StatusBadge status={report.status} />
                        </button>
                      ))}
                      {activeReports.length === 0 && <p className="empty-copy">No active reports.</p>}
                    </article>
                    <article className="glass-card recent-status">
                      <span className="card-index">RECENT REPORT STATUS</span>
                      <div className="status-row-large">
                        <div><strong>{reports[0]?.disaster}</strong><span>{reports[0]?.location}</span></div>
                        {reports[0] && <StatusBadge status={reports[0].status} />}
                      </div>
                      <div className="mini-track"><span className="complete" /><span className="complete" /><span className="active" /><span /></div>
                      <button type="button" className="text-action" onClick={() => reports[0] && goToStatus(reports[0])}>VIEW STATUS DETAILS →</button>
                    </article>
                  </div>
                </div>
                <div className="support-strip">
                  <span>For immediate life-threatening emergencies, contact</span>
                  <strong>112</strong>
                  <span>National Emergency Response Support System</span>
                </div>
              </section>
            )}

            {page === "Report Crisis" && (
              <section className="user-page report-page">
                <PageHeading eyebrow="EMERGENCY REPORTING" title="Report a crisis" copy="Share clear, accurate information so rescue teams can coordinate the right response." />
                {submitted ? (
                  <div className="glass-card submission-success">
                    <div className="success-ring">✓</div>
                    <span>REPORT SUBMITTED SUCCESSFULLY</span>
                    <h2>{submitted.id}</h2>
                    <div className="success-details">
                      <div><small>SUBMITTED TIME</small><strong>{submitted.submittedAt}</strong></div>
                      <div><small>CURRENT STATUS</small><StatusBadge status={submitted.status} /></div>
                    </div>
                    <p>Your report has entered the response network. You can follow updates without seeing internal operational data.</p>
                    <div className="success-actions">
                      <button type="button" className="neon-btn" onClick={() => goToStatus(submitted)}>TRACK REPORT</button>
                      <button type="button" className="auth-secondary" onClick={() => setSubmitted(null)}>SUBMIT ANOTHER</button>
                    </div>
                  </div>
                ) : (
                  <form className="glass-card crisis-form" onSubmit={submitReport}>
                    <div className="form-alert"><strong>Provide essential details</strong><span>Describe what happened, who needs help, and any immediate danger.</span></div>
                    <label className="form-field full">
                      <span>CRISIS MESSAGE <b>REQUIRED</b></span>
                      <textarea className="glass-input" required name="message" placeholder="Example: Flood in Chennai. 20 people are trapped and need food and water urgently." />
                      <small>Include the disaster type, people affected, and urgent needs.</small>
                    </label>
                    <div className="form-grid">
                      <label className="form-field">
                        <span>LOCATION <b>REQUIRED</b></span>
                        <input className="glass-input" required name="location" placeholder="Area, city, landmark" />
                      </label>
                      <label className="form-field">
                        <span>CONTACT NUMBER <b>REQUIRED</b></span>
                        <input className="glass-input" required name="contact" type="tel" placeholder="+91 98765 43210" />
                      </label>
                      <label className="upload-box">
                        <input name="image" type="file" accept="image/*" />
                        <span className="upload-icon">IMG</span><strong>IMAGE ATTACHMENT</strong><small>JPG, PNG up to 10 MB</small>
                      </label>
                      <label className="upload-box">
                        <input name="video" type="file" accept="video/*" />
                        <span className="upload-icon">VID</span><strong>VIDEO ATTACHMENT</strong><small>MP4, MOV up to 50 MB</small>
                      </label>
                    </div>
                    <button className="neon-btn send-report" type="submit">SEND CRISIS REPORT <span>→</span></button>
                  </form>
                )}
              </section>
            )}

            {page === "My Reports" && (
              <section className="user-page">
                <PageHeading eyebrow="REPORT HISTORY" title="My reports" copy="Only reports submitted from your account are shown here." />
                <div className="report-tabs">
                  {(["All", "Active", "Completed"] as const).map((tab) => (
                    <button type="button" key={tab} className={reportTab === tab ? "active" : ""} onClick={() => setReportTab(tab)}>{tab}</button>
                  ))}
                </div>
                <div className="reports-list glass-card">
                  <div className="report-table-head"><span>CRISIS ID</span><span>DISASTER</span><span>LOCATION</span><span>DATE</span><span>STATUS</span><span /></div>
                  {filteredReports.map((report) => (
                    <div className="report-table-row" key={report.id}>
                      <strong>{report.id}</strong><span>{report.disaster}</span><span>{report.location}</span><span>{report.submittedAt}</span>
                      <StatusBadge status={report.status} />
                      <button type="button" onClick={() => goToStatus(report)}>VIEW DETAILS →</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {page === "Status" && selectedReport && (
              <section className="user-page status-page">
                <PageHeading eyebrow="LIVE REPORT TRACKING" title="Report status" copy="Follow public response milestones for your submitted crisis." />
                <div className="status-layout">
                  <article className="glass-card status-summary-card">
                    <span className="card-index">CRISIS ID</span>
                    <h2>{selectedReport.id}</h2>
                    <div className="status-disaster">{selectedReport.disaster}<span>{selectedReport.location}</span></div>
                    <div className="current-state"><small>CURRENT STATUS</small><StatusBadge status={selectedReport.status} /></div>
                    <div className="public-note">Operational scores, extracted fields, and internal rescue notes remain private to the response team.</div>
                  </article>
                  <article className="glass-card timeline-card">
                    <span className="card-index">RESPONSE TIMELINE</span>
                    <div className="status-timeline">
                      {STATUS_STEPS.map((step, index) => {
                        const currentIndex = STATUS_ORDER[selectedReport.status];
                        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
                        return (
                          <div className={`timeline-step ${state}`} key={step.label}>
                            <span>{state === "done" ? "✓" : state === "current" ? "●" : "○"}</span>
                            <div><strong>{step.label}</strong><small>{state === "done" ? "Completed" : state === "current" ? "Current stage" : "Pending"}</small></div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </div>
              </section>
            )}

            {page === "Feedback" && (
              <section className="user-page feedback-page">
                <PageHeading eyebrow="SERVICE FEEDBACK" title="Share feedback" copy="Feedback is available after a report is completed and is sent directly to the Rescue Team." />
                <form className="glass-card feedback-form" onSubmit={submitFeedback}>
                  <label className="form-field">
                    <span>COMPLETED REPORT</span>
                    <select className="glass-input" required name="reportId" defaultValue="">
                      <option value="" disabled>Select a completed report</option>
                      {reports.filter((report) => report.status === "Completed").map((report) => <option key={report.id} value={report.id}>{report.id} — {report.disaster}</option>)}
                    </select>
                  </label>
                  <fieldset>
                    <legend>RATING</legend>
                    <div className="rating-row">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <label key={rating}><input required type="radio" name="rating" value={rating} /><span>★</span></label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="form-field">
                    <span>CATEGORY</span>
                    <select className="glass-input" required name="category" defaultValue="">
                      <option value="" disabled>Select feedback category</option>
                      {["Issue fully resolved", "Partially resolved", "Still need assistance", "Response was delayed", "Other"].map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>FEEDBACK</span>
                    <textarea className="glass-input" required name="message" placeholder="Tell the response team about your experience." />
                  </label>
                  <button type="submit" className="neon-btn auth-primary">SUBMIT FEEDBACK</button>
                  {feedbackSent && <div className="auth-notice">FEEDBACK SUBMITTED TO RESCUE TEAM</div>}
                  {feedback.length > 0 && <small className="feedback-count">{feedback.length} feedback submission saved.</small>}
                </form>
              </section>
            )}

            {page === "Profile" && (
              <section className="user-page">
                <PageHeading eyebrow="ACCOUNT" title="Profile" copy="Keep your contact details current for emergency follow-up." />
                <div className="glass-card profile-card">
                  <div className="profile-avatar">{userInitials}</div>

<div className="profile-identity">
  <h2>{userName}</h2>
  <span>Verified citizen account</span>
</div>

<div className="profile-grid">
  <label className="form-field">
    <span>FULL NAME</span>
    <input
      className="glass-input"
      defaultValue={userName}
    />
  </label>

  <label className="form-field">
    <span>MOBILE NUMBER</span>
    <input
      className="glass-input"
      defaultValue={userMobile}
    />
  </label>

  <label className="form-field">
    <span>EMAIL</span>
    <input
      className="glass-input"
      defaultValue={userEmail}
    />
  </label>

  <label className="form-field">
    <span>PRIMARY CITY</span>
    <input
      className="glass-input"
      defaultValue="Not provided"
    />
  </label>
</div>
                  <button type="button" className="neon-btn profile-save">SAVE PROFILE</button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
