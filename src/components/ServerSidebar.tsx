import { useState, useEffect, useRef, useMemo } from "react";
import { options } from "../helper/fetchOptions";
import { getToken, useAuthStore } from "../store/authStore";
import { baseUrl } from "../helper/constant";
import { jwtDecode } from "jwt-decode";
import InputModal from "./InputModal";
import UserSettingsModal from "./UserSettingsModal";

/* ─────────────────────────── types ─────────────────────────── */
type Server = { name: string; id: string; admin_id: string };
type TokenPayload = { id: string; sub?: string };

type ServerProps = {
  server?: Server[];
  onToggleTheme?: () => void;
  parent?: (serverId: string) => void;
  getServer?: () => void;
};

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
const ServerSidebar = ({ getServer, server, parent }: ServerProps) => {
  const [activeId, setActiveId] = useState<string>("home");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuthStore();

  /* ── Decode token safely inside component ── */
  const token = useMemo(() => getToken() || "", []);

  const decoded = useMemo(() => {
    if (!token) return null;
    try { return jwtDecode<TokenPayload>(token); }
    catch { return null; }
  }, [token]);

  const userId = decoded?.id || "";
  const userName = decoded?.sub || "";

  /* Close profile popover on outside click */
  useEffect(() => {
    if (!showProfile) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfile]);

  /* ── Create server handler ── */
  const handleCreateServer = async (values: Record<string, string | number>) => {
    const payload = {
      name: String(values.name || "").trim(),
      description: String(values.description || "").trim(),
      owner_id: decoded?.id,
    };
    try {
      const res = await fetch(`${baseUrl}/servers`, options("POST", token, payload));
      await res.json();
      setShowCreateModal(false);
      getServer?.();
    } catch (error) {
      console.error(error);
    }
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="server-sidebar">
      {/* ── Home button ── */}
      <button
        className={"server-item home" + (activeId === "home" ? " active" : "")}
        aria-label="Home"
        title="Home"
        onClick={() => setActiveId("home")}
      >
        <div className="server-avatar">
          <PingSpaceIcon />
        </div>
      </button>

      <div className="server-separator" />

      {/* ── Server list ── */}
      <div className="server-list">
        {server?.map((s) => (
          <button
            key={s.id}
            className={"server-item" + (activeId === s.id ? " active" : "")}
            aria-label={s.name}
            data-tooltip={s.name}
            onClick={() => {
              setActiveId(s.id);
              if (typeof parent === "function") parent(s.id);
            }}
          >
            <div className="server-avatar">
              {s.name?.slice(0, 2)?.toUpperCase()}
            </div>
            <span className="server-tooltip">{s.name}</span>
          </button>
        ))}
      </div>

      {/* ── Add server button ── */}
      <button
        className="server-item server-add"
        aria-label="Create a server"
        title="Create a server"
        onClick={() => setShowCreateModal(true)}
      >
        <PlusIcon />
      </button>

      {/* ── Create Server Modal ── */}
      {showCreateModal && (
        <InputModal
          isOpen={showCreateModal}
          title="Create a server"
          description="Set your server details. You can change these later."
          submitLabel="Create server"
          icon={<ServerPlusIcon />}
          onClose={() => setShowCreateModal(false)}
          fields={[
            {
              name: "name",
              label: "Server Name",
              placeholder: "My awesome server",
              required: true,
              type: "text",
              maxLength: 50,
            },
            {
              name: "description",
              label: "Description",
              placeholder: "What's this server about? (optional)",
              type: "textarea",
              rows: 3,
              maxLength: 200,
            },
          ]}
          onSubmit={handleCreateServer}
        />
      )}

      {/* ── Profile section ── */}
      <div className="profile-section">
        <div className="profile-anchor" ref={profileRef}>
          {showProfile && (
            <div className="profile-popover">
              <div className="profile-row">
                <div className="profile-avatar">
                  {userName?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="profile-meta">
                  <div className="profile-name">{userName || "User"}</div>
                  <div className="profile-sub">Online</div>
                </div>
              </div>

              <div className="profile-divider" />

              <button
                className="profile-menu-btn"
                onClick={() => {
                  setShowProfile(false);
                  setShowUserSettings(true);
                }}
              >
                <GearIcon /> User Settings
              </button>

              <button className="profile-menu-btn profile-logout-btn" onClick={logout}>
                <LogoutIcon /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── User Settings Modal ── */}
      {showUserSettings && userName && userId && (
        <UserSettingsModal
          isOpen={showUserSettings}
          userId={userId}
          currentUsername={userName}
          onClose={() => setShowUserSettings(false)}
        />
      )}
    </div>
  );
};

export default ServerSidebar;

/* ── Inline SVG Icons ─────────────────────────────────────── */
const PingSpaceIcon = () => (
  <span
    style={{
      fontWeight: 800,
      fontSize: "18px",
      letterSpacing: "-0.5px",
      lineHeight: 1,
      fontFamily: "'Inter', sans-serif",
      background: "linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      userSelect: "none",
    }}
  >
    PS
  </span>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ServerPlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M3 6C3 4.89 3.89 4 5 4H15C16.11 4 17 4.89 17 6V13C17 14.11 16.11 15 15 15H11.5L8.5 17.5V15H5C3.89 15 3 14.11 3 13V6Z"
      stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinejoin="round"
    />
    <circle cx="7.5" cy="9.5" r="1" fill="#6366f1" />
    <circle cx="10" cy="9.5" r="1" fill="#6366f1" />
    <circle cx="12.5" cy="9.5" r="1" fill="#6366f1" />
  </svg>
);

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M10 2H13a1 1 0 011 1v10a1 1 0 01-1 1H10M7 11l3-3-3-3M10 8H2"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
