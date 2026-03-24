import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken, isTokenExpired } from "../store/authStore";
import { jwtDecode } from "jwt-decode";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { useAuthStore } from "../store/authStore";

type TokenPayload = { id: string; sub?: string };

const JoinPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const serverParam = searchParams.get("server");
  const parts = serverParam ? serverParam.split("/") : [];
  const serverId = parts[0] || "";
  const senderUserId = parts.length > 1 ? parts[1] : undefined;

  const handleJoinServer = useCallback(async () => {
    const token = getToken();

    // ❌ No token
    if (!token) {
      setError("You must be logged in to join a server.");
      navigate("/");
      return;
    }

    // ❌ Token expired (NEW LOGIC)
    if (isTokenExpired(token)) {
      localStorage.removeItem("token");
      setError("Session expired. Please login again.");
      navigate("/");
      return;
    }

    if (!serverId) {
      setError("Invalid invite link.");
      return;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const userId = decoded.sub || decoded.id;

      if (!userId) {
        setError("Invalid authentication token.");
        return;
      }

      setLoading(true);
      setError(null);

      // Check if the sender is the admin
      const serverRes = await fetch(`${baseUrl}/servers/${serverId}`, options("GET", token));
      if (!serverRes.ok) throw new Error("Failed to fetch server details");
      const serverData = await serverRes.json();
      const isAdminInvite = senderUserId === serverData.admin_id;

      if (isAdminInvite) {
        // Direct join
        const joinRes = await fetch(`${baseUrl}/servers/${serverId}/join`, options("POST", token, { user_id: userId }));
        if (!joinRes.ok) {
          const errorData = await joinRes.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || "Failed to join server");
        }
        setSuccess(true);
        setTimeout(() => navigate("/chat"), 1500);
      } else {
        // Send join request
        const payload = {
          server_id: serverId
        };

        const response = await fetch(
          `${baseUrl}/join_requests`,
          options("POST", token, payload)
        );

        // ❌ Handle expired token from backend (IMPORTANT)
        if (response.status === 401) {
          localStorage.removeItem("token");
          setError("Session expired. Please login again.");
          navigate("/");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 400 || response.status === 409) {
            setSuccess(true);
            setTimeout(() => navigate("/chat"), 1500);
            return;
          }

          throw new Error(
            errorData.detail || errorData.message || "Failed to join server"
          );
        }

        setSuccess(true);
        setTimeout(() => navigate("/chat"), 1500);
      }

    } catch (err: unknown) {
      console.error("Error joining server:", err);
      setError(err instanceof Error ? err.message : "An error occurred while joining the server.");
      setLoading(false);
    }
  }, [serverId, senderUserId, navigate]);

  useEffect(() => {
    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated && !getToken()) {
      navigate(`/?returnUrl=/join?server=${serverParam || ""}`);
      return;
    }

    // If no server ID in URL, show error
    if (!serverId) {
      setError("Invalid invite link. No server ID provided.");
      return;
    }

    // Removed auto-join so user can see the message before clicking join.
  }, [isAuthenticated, serverId, serverParam, navigate]);

  if (!serverId) {
    return (
      <div className="login-page">
        {/* Animated background blobs */}
        <div className="login-bg">
          <div className="blob blob-1" style={{ background: "radial-gradient(circle, #3ECFCF 0%, transparent 70%)" }} />
          <div className="blob blob-2" style={{ background: "radial-gradient(circle, #6C63FF 0%, transparent 70%)" }} />
          <div className="blob blob-3" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", opacity: 0.35 }} />
        </div>
        <div className="login-card" style={{ maxWidth: 440 }}>
          <div className="login-brand">
            <div className="login-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="url(#grad2)" />
                <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3ECFCF" />
                    <stop offset="1" stopColor="#6C63FF" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="login-brand-name">PingSpace</span>
          </div>
          <h1 className="login-title">Invalid link</h1>
          <p className="login-subtitle">Invalid invite link. No server ID provided.</p>
          <div className="login-footer">
            <a href="/" className="login-link">Go to home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="blob blob-1" style={{ background: "radial-gradient(circle, #3ECFCF 0%, transparent 70%)" }} />
        <div className="blob blob-2" style={{ background: "radial-gradient(circle, #6C63FF 0%, transparent 70%)" }} />
        <div className="blob blob-3" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", opacity: 0.35 }} />
      </div>

      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-brand">
          <div className="login-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#grad2)" />
              <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="grad2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3ECFCF" />
                  <stop offset="1" stopColor="#6C63FF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="login-brand-name">PingSpace</span>
        </div>

        {success ? (
          <>
            <h1 className="login-title">Request Sent!</h1>
            <p className="login-subtitle" style={{ color: "#ffffff", marginBottom: 8 }}>
              If the admin accepts the request, you can join the server.
            </p>
            <p className="login-subtitle">
              Redirecting to chat...
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="login-title">Unable to join</h1>
            <div className="login-error" style={{ marginTop: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
            <div className="login-footer" style={{ marginTop: "16px" }}>
              <a href="/chat" className="login-link">Go to chat</a> | <a href="/" className="login-link">Go to home</a>
            </div>
          </>
        ) : loading ? (
          <>
            <h1 className="login-title">Sending Request...</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <span className="login-spinner" style={{ width: 16, height: 16 }} />
              <p className="login-subtitle" style={{ margin: 0 }}>
                Please wait while we send your request to the admin.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="login-title">Join Server</h1>
            <p className="login-subtitle">
              If the admin accepts the request then after you can join this server.
            </p>
            <button
              onClick={handleJoinServer}
              className="login-btn su-btn"
              style={{ marginTop: "20px" }}
            >
              Request to Join
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <div className="login-footer" style={{ marginTop: "16px" }}>
              <a href="/chat" className="login-link">Go to chat</a> | <a href="/" className="login-link">Go to home</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
