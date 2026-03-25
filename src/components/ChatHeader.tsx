import { useState, useMemo } from "react";
import UserSettingsModal from "./UserSettingsModal";
import { getToken } from "../store/authStore";
import { jwtDecode } from "jwt-decode";

type ChatHeaderProps = {
  onOpenSidebar?: () => void;
  onToggleTheme?: () => void;
  onLogout?: () => void;
  userName?: string;
  roomName?: string;
};

export default function ChatHeader({
  onOpenSidebar,
  roomName,
  userName,
  onToggleTheme,
  onLogout,
}: ChatHeaderProps) {
  const [showUserSettings, setShowUserSettings] = useState(false);
  const tokenString = useMemo(() => getToken() || "", []);
  const currentUserId = useMemo(() => {
    if (!tokenString) return "";
    try {
      return jwtDecode<{ sub: string }>(tokenString).sub;
    } catch {
      return "";
    }
  }, [tokenString]);

  return (
    <header className="ch-header">
      {/* Hamburger — mobile only */}
      <button
        className="ch-menu"
        aria-label="Open sidebar"
        onClick={onOpenSidebar}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Channel hash + name */}
      <div className="ch-title-wrap">
        {roomName ? (
          <>
            <span>#</span>
            <span>{roomName}</span>
          </>
        ) : (
          <span>Select a channel</span>
        )}
      </div>

      {/* Right actions */}
      <div className="ch-actions">
        {/* Theme toggle */}
        <button
          className="ch-icon-btn"
          title="Toggle theme"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>

        {/* User avatar + logout */}
        <div
          className="ch-user"
          style={{ cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          onClick={() => setShowUserSettings(true)}
        >
          <div className="ch-avatar" title={userName}>
            {userName?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="ch-username">{userName}</span>
        </div>

        <button
          className="ch-icon-btn ch-logout"
          title="Logout"
          onClick={onLogout}
          aria-label="Logout"
          style={{ marginLeft: "12px" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {showUserSettings && userName && currentUserId &&(
        <UserSettingsModal
          isOpen={showUserSettings}
          userId={currentUserId}
          currentUsername={userName!}
          onClose={() => setShowUserSettings(false)}
        />
      )}
    </header>
  );
}
