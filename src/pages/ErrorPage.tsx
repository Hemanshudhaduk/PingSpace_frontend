import { useNavigate } from "react-router-dom";

type ErrorPageProps = {
  title?: string;
  message?: string;
  errors?: { field: string; msg: string }[];
  onRetry?: () => void;
  returnPath?: string;
};

export default function ErrorPage({
  title = "Validation Error",
  message = "Please check the errors below and try again.",
  errors = [],
  onRetry,
  returnPath = "/",
}: ErrorPageProps) {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-bg">
        <div className="blob blob-1" style={{ background: "radial-gradient(circle, #ef4444 0%, transparent 70%)" }} />
        <div className="blob blob-2" style={{ background: "radial-gradient(circle, #f87171 0%, transparent 70%)" }} />
        <div className="blob blob-3" style={{ background: "radial-gradient(circle, #fca5a5 0%, transparent 70%)", opacity: 0.35 }} />
      </div>

      <div className="login-card" style={{ maxWidth: 500, background: "rgba(15, 15, 23, 0.85)" }}>
        {/* Error Icon */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
            {title}
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 14, margin: 0 }}>
            {message}
          </p>
        </div>

        {/* Error List */}
        {errors.length > 0 && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#f87171", margin: "0 0 12px", textTransform: "uppercase" }}>
              Required Fields:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, listStyle: "none" }}>
              {errors.map((err, idx) => (
                <li
                  key={idx}
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 13,
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#f87171", fontWeight: 600, flexShrink: 0 }}>•</span>
                  <span>
                    <strong style={{ color: "#fff" }}>{err.field}</strong> — {err.msg}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate(returnPath)}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "transparent",
              color: "#f87171",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: 14,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Go Back
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "linear-gradient(135deg, #6C63FF, #3ECFCF)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: 14,
                boxShadow: "0 4px 12px rgba(108, 99, 255, 0.3)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
