import { useState, type FormEvent } from "react";

export type AppRole = "USER" | "RESCUE_TEAM";
type AuthView = "login" | "register" | "forgot";

interface Props {
  onAuthenticated: (role: AppRole) => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "";

export default function RoleAuth({ onAuthenticated }: Props) {
  const [role, setRole] = useState<AppRole>("USER");
  const [view, setView] = useState<AuthView>("login");
  const [forgotStep, setForgotStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Login
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration
  const [registerName, setRegisterName] = useState("");
  const [registerMobile, setRegisterMobile] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerTeamIdentifier, setRegisterTeamIdentifier] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isStrongPassword = (password: string) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    // =========================
    // LOGIN
    // =========================
    if (view === "login") {
      if (!loginIdentifier.trim()) {
        setNotice("ENTER YOUR EMAIL, MOBILE NUMBER OR USER ID.");
        return;
      }

      if (!loginPassword) {
        setNotice("ENTER YOUR PASSWORD.");
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: loginIdentifier.trim(),
            password: loginPassword,
            role,
          }),
        });

        let data: any = {};
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error("Unable to connect to authentication service. Please check your network connection.");
        }

        if (!response.ok) {
          setNotice(
            data.error || "Account not found. Please register first."
          );
          return;
        }

        // Store authentication information
        localStorage.setItem("crisentra_auth_token", data.token);
        localStorage.setItem(
          "crisentra_user",
          JSON.stringify(data.user)
        );

        const authenticatedRole: AppRole =
          data.user?.role === "RESCUE_TEAM"
            ? "RESCUE_TEAM"
            : "USER";

        onAuthenticated(authenticatedRole);
      } catch (error) {
        console.error("Login error:", error);
        setNotice(
          "UNABLE TO CONNECT TO CRISENTRA SERVER."
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // =========================
    // REGISTER
    // =========================
    if (view === "register") {
      if (!registerName.trim()) {
        setNotice(
          role === "USER"
            ? "ENTER YOUR FULL NAME."
            : "ENTER YOUR TEAM NAME."
        );
        return;
      }

      if (!registerMobile.trim()) {
        setNotice("ENTER YOUR MOBILE NUMBER.");
        return;
      }

      if (role === "USER" && !registerEmail.trim()) {
        setNotice("ENTER YOUR EMAIL ADDRESS.");
        return;
      }

      if (
        role === "RESCUE_TEAM" &&
        !registerTeamIdentifier.trim()
      ) {
        setNotice("ENTER YOUR TEAM EMAIL / ID.");
        return;
      }

      if (!isStrongPassword(registerPassword)) {
        setNotice(
          "PASSWORD MUST BE AT LEAST 8 CHARACTERS WITH UPPERCASE, LOWERCASE, NUMBER AND SPECIAL CHARACTER."
        );
        return;
      }

      if (registerPassword !== confirmPassword) {
        setNotice("PASSWORDS DO NOT MATCH.");
        return;
      }

      try {
        setLoading(true);

        const payload =
          role === "USER"
            ? {
                role,
                name: registerName.trim(),
                mobile: registerMobile.trim(),
                email: registerEmail.trim(),
                password: registerPassword,
              }
            : {
                role,
                name: registerName.trim(),
                mobile: registerMobile.trim(),
                teamIdentifier:
                  registerTeamIdentifier.trim(),
                password: registerPassword,
              };

        const response = await fetch(
          `${API_BASE}/api/auth/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        let data: any = {};
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error("Unable to connect to authentication service. Please check your network connection.");
        }

        if (!response.ok) {
          // Example:
          // "User already exists."
          // "Rescue team already exists."
          setNotice(data.error || "REGISTRATION FAILED.");
          return;
        }

        // Backend automatically creates a session after registration
        localStorage.setItem(
          "crisentra_auth_token",
          data.token
        );

        localStorage.setItem(
          "crisentra_user",
          JSON.stringify(data.user)
        );

        const authenticatedRole: AppRole =
          data.user?.role === "RESCUE_TEAM"
            ? "RESCUE_TEAM"
            : "USER";

        onAuthenticated(authenticatedRole);
      } catch (error) {
        console.error("Registration error:", error);
        setNotice(
          "UNABLE TO CONNECT TO CRISENTRA SERVER."
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // =========================
    // FORGOT PASSWORD
    // =========================
    if (forgotStep < 3) {
      setForgotStep((step) => step + 1);
    } else {
      setNotice("PASSWORD CHANGED");
      setForgotStep(4);
    }
  };

  const roleName =
    role === "USER" ? "USER" : "RESCUE TEAM";

  const selectRole = (nextRole: AppRole) => {
    setRole(nextRole);
    setView("login");
    setForgotStep(0);
    setNotice("");

    setLoginIdentifier("");
    setLoginPassword("");
  };

  return (
    <div className={`auth-shell auth-${view}`}>
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />

      <section className="auth-brand">
        <p className="auth-eyebrow">
          <span className="trust-shield">◇</span>{" "}
          TRUSTED EMERGENCY COORDINATION
        </p>

        <h1>
          Clarity when
          <br />
          <span>every second</span>
          <br />
          <span>matters.</span>
        </h1>

        <p className="auth-copy">
          Report critical situations, stay informed, and
          connect with response teams through one secure
          disaster intelligence platform.
        </p>

        <div className="auth-stats">
          <div>
            <strong>24/7</strong>
            <span>RESPONSE NETWORK</span>
          </div>

          <div>
            <strong>&lt; 2 min</strong>
            <span>AVERAGE ALERT</span>
          </div>

          <div>
            <strong>12</strong>
            <span>ACTIVE ZONES</span>
          </div>
        </div>

        <div className="auth-status">
          <i /> CRISENTRA RESPONSE NETWORK ONLINE
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-role-tabs">
          <button
            type="button"
            className={role === "USER" ? "active" : ""}
            onClick={() => selectRole("USER")}
          >
            <span>♙</span> Citizen
          </button>

          <button
            type="button"
            className={
              role === "RESCUE_TEAM" ? "active" : ""
            }
            onClick={() => selectRole("RESCUE_TEAM")}
          >
            <span>♢</span> Rescue team
          </button>
        </div>

        {view === "login" && (
          <>
            <div className="auth-role">
              {role === "USER"
                ? "CITIZEN RESPONSE PORTAL"
                : "RESCUE TEAM COMMAND CENTER"}
            </div>

            <h2>
              {role === "USER"
                ? "Citizen access"
                : "Command center access"}
            </h2>

            <p className="auth-subtitle">
              {role === "USER"
                ? "Report emergencies and track response status"
                : "Authorized emergency personnel only"}
            </p>
          </>
        )}

        {view === "register" && (
          <>
            <div className="auth-role">
              {roleName} REGISTRATION
            </div>

            <h2>Create account</h2>

            <p className="auth-subtitle">
              Register for secure{" "}
              {roleName.toLowerCase()} access.
            </p>
          </>
        )}

        {view === "forgot" && (
          <>
            <div className="auth-role">
              SECURE ACCOUNT RECOVERY
            </div>

            <h2>
              {forgotStep === 4
                ? "Password changed"
                : "Recover access"}
            </h2>

            <p className="auth-subtitle">
              {
                [
                  "Enter your registered email or mobile number.",
                  "Enter the OTP sent to your device.",
                  "Verify the security code.",
                  "Create a strong new password.",
                  "Your password has been updated successfully.",
                ][forgotStep]
              }
            </p>
          </>
        )}

        <form onSubmit={submit} className="auth-form">
          {/* =========================
              LOGIN
          ========================= */}
          {view === "login" && (
            <>
              <label>
                <span>
                  {role === "USER"
                    ? "EMAIL OR MOBILE NUMBER / USER ID"
                    : "TEAM EMAIL / ID"}
                </span>

                <input
                  className="glass-input"
                  required
                  value={loginIdentifier}
                  onChange={(event) =>
                    setLoginIdentifier(event.target.value)
                  }
                  placeholder={
                    role === "USER"
                      ? "Enter email, mobile number or user ID"
                      : "Enter team email or team ID"
                  }
                />
              </label>

              <label>
                <span>PASSWORD</span>

                <input
                  className="glass-input"
                  required
                  type="password"
                  value={loginPassword}
                  onChange={(event) =>
                    setLoginPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                />
              </label>

              <button
                className="auth-link"
                type="button"
                onClick={() => {
                  setNotice("");
                  setForgotStep(0);
                  setView("forgot");
                }}
              >
                Forgot Password?
              </button>

              <button
                className="neon-btn auth-primary"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "AUTHENTICATING..."
                  : role === "USER"
                    ? "ACCESS CITIZEN PORTAL"
                    : "ACCESS COMMAND CENTER"}

                {!loading && <span>→</span>}
              </button>
            </>
          )}

          {/* =========================
              REGISTER
          ========================= */}
          {view === "register" && (
            <>
              <label>
                <span>
                  {role === "USER"
                    ? "FULL NAME"
                    : "TEAM NAME"}
                </span>

                <input
                  className="glass-input"
                  required
                  type="text"
                  value={registerName}
                  onChange={(event) =>
                    setRegisterName(event.target.value)
                  }
                  placeholder={
                    role === "USER"
                      ? "Full Name"
                      : "Team Name"
                  }
                />
              </label>

              {role === "RESCUE_TEAM" && (
                <label>
                  <span>TEAM EMAIL / ID</span>

                  <input
                    className="glass-input"
                    required
                    type="text"
                    value={registerTeamIdentifier}
                    onChange={(event) =>
                      setRegisterTeamIdentifier(
                        event.target.value
                      )
                    }
                    placeholder="Team Email / ID"
                  />
                </label>
              )}

              <label>
                <span>MOBILE NUMBER</span>

                <input
                  className="glass-input"
                  required
                  type="tel"
                  value={registerMobile}
                  onChange={(event) =>
                    setRegisterMobile(event.target.value)
                  }
                  placeholder="Mobile Number"
                />
              </label>

              {role === "USER" && (
                <label>
                  <span>EMAIL</span>

                  <input
                    className="glass-input"
                    required
                    type="email"
                    value={registerEmail}
                    onChange={(event) =>
                      setRegisterEmail(event.target.value)
                    }
                    placeholder="Email"
                  />
                </label>
              )}

              <label>
                <span>PASSWORD</span>

                <input
                  className="glass-input"
                  required
                  type="password"
                  value={registerPassword}
                  onChange={(event) =>
                    setRegisterPassword(
                      event.target.value
                    )
                  }
                  placeholder="Password"
                />
              </label>

              <label>
                <span>CONFIRM PASSWORD</span>

                <input
                  className="glass-input"
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm Password"
                />
              </label>

              <button
                className="neon-btn auth-primary"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "CREATING ACCOUNT..."
                  : "CREATE ACCOUNT"}
              </button>

              <button
                className="auth-link"
                type="button"
                onClick={() => {
                  setNotice("");
                  setView("login");
                }}
              >
                Back to Login
              </button>
            </>
          )}

          {/* =========================
              FORGOT PASSWORD
          ========================= */}
          {view === "forgot" && forgotStep < 4 && (
            <>
              {forgotStep === 0 && (
                <input
                  className="glass-input auth-standalone-input"
                  required
                  placeholder="Email / Mobile Number"
                />
              )}

              {(forgotStep === 1 ||
                forgotStep === 2) && (
                <input
                  className="glass-input auth-standalone-input otp-input"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                />
              )}

              {forgotStep === 3 && (
                <>
                  <input
                    className="glass-input auth-standalone-input"
                    required
                    type="password"
                    placeholder="New Password"
                  />

                  <input
                    className="glass-input auth-standalone-input"
                    required
                    type="password"
                    placeholder="Confirm New Password"
                  />
                </>
              )}

              <button
                className="neon-btn auth-primary"
                type="submit"
              >
                {
                  [
                    "SEND OTP",
                    "VERIFY OTP",
                    "CONTINUE",
                    "CHANGE PASSWORD",
                  ][forgotStep]
                }
              </button>

              <button
                className="auth-link"
                type="button"
                onClick={() => {
                  setNotice("");
                  setView("login");
                }}
              >
                Back to Login
              </button>
            </>
          )}

          {view === "forgot" && forgotStep === 4 && (
            <button
              className="neon-btn auth-primary"
              type="button"
              onClick={() => {
                setNotice("");
                setView("login");
              }}
            >
              BACK TO LOGIN
            </button>
          )}
        </form>

        {notice && (
          <div className="auth-notice">
            {notice}
          </div>
        )}

        {view === "login" && (
          <>
            <div className="auth-divider">
              <span>NEW TO CRISENTRA?</span>
            </div>

            <button
              className="role-switch"
              type="button"
              onClick={() => {
                setNotice("");
                setView("register");
              }}
            >
              Create{" "}
              {role === "USER"
                ? "citizen"
                : "rescue team"}{" "}
              account <span>→</span>
            </button>
          </>
        )}
      </section>
    </div>
  );
}
