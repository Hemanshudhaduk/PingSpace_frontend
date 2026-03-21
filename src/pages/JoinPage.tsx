import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken } from "../store/authStore";
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

  const serverId = searchParams.get("server");

  const handleJoinServer = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("You must be logged in to join a server.");
      navigate("/");
      return;
    }

    if (!serverId) {
      setError("Invalid invite link.");
      return;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const userId = decoded.sub; // Backend stores the ID in the "sub" field


      if (!userId) {
        setError("Invalid authentication token.");
        return;
      }

      setLoading(true);
      setError(null);

      // Join the server (role: "member" for regular invites)
      const payload = {
        user_id: userId,
        server_id: serverId,
        role: "member"
      };
      
      const response = await fetch(
        `${baseUrl}/server_users`,
        options("POST", token, payload)
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check if user is already a member
        if (response.status === 400 || response.status === 409) {
          setSuccess(true);
          setTimeout(() => {
            navigate("/chat");
          }, 1500);
          return;
        }

        throw new Error(errorData.detail || errorData.message || "Failed to join server");
      }

      const data = await response.json();
      console.log("Joined server:", data);
      setSuccess(true);
      
      // Redirect to chat after a short delay
      setTimeout(() => {
        navigate("/chat");
      }, 1500);
    } catch (err: any) {
      console.error("Error joining server:", err);
      setError(err.message || "An error occurred while joining the server. Please try again.");
      setLoading(false);
    }
  }, [serverId, navigate]);

  useEffect(() => {
    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated && !getToken()) {
      navigate(`/?returnUrl=/join?server=${serverId || ""}`);
      return;
    }

    // If no server ID in URL, show error
    if (!serverId) {
      setError("Invalid invite link. No server ID provided.");
      return;
    }

    // Auto-join if authenticated
    if (isAuthenticated && serverId) {
      handleJoinServer();
    }
  }, [isAuthenticated, serverId, navigate, handleJoinServer]);

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
            <h1 className="login-title">Success!</h1>
            <p className="login-subtitle" style={{ color: "#ffffff", marginBottom: 8 }}>
              You've successfully joined the server!
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
            <h1 className="login-title">Joining server...</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <span className="login-spinner" style={{ width: 16, height: 16 }} />
              <p className="login-subtitle" style={{ margin: 0 }}>
                Please wait while we add you to the server.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="login-title">Join Server</h1>
            <p className="login-subtitle">
              Click the button below to join this server.
            </p>
            <button
              onClick={handleJoinServer}
              className="login-btn su-btn"
              style={{ marginTop: "20px" }}
            >
              Join Server
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
