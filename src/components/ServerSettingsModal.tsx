import { useState, useEffect, useCallback } from "react";
import "./Serversettingsmodal.css";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";

/* ─────────────────────────── types ─────────────────────────── */
type Server = { id: string; name: string; admin_id: string };
type Member = { id: string; username: string; role: string };
type Tab    = "overview" | "members";

type Props = {
  isOpen: boolean;
  server: Server;
  currentUserId: string;
  onClose: () => void;
  onServerUpdated: () => void;
  onServerDeleted: () => void;
};

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
export default function ServerSettingsModal({
  isOpen,
  server,
  currentUserId,
  onClose,
  onServerUpdated,
  onServerDeleted,
}: Props) {
  const [activeTab,      setActiveTab]      = useState<Tab>("overview");
  const [serverName,     setServerName]     = useState(server.name);
  const [members,        setMembers]        = useState<Member[]>([]);
  const [membersLoaded,  setMembersLoaded]  = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const isAdmin = server.admin_id === currentUserId;
  const token   = getToken() || "";

  /* reset every time the modal opens */
  useEffect(() => {
    if (!isOpen) return;
    setServerName(server.name);
    setError(null);
    setActiveTab("overview");
    setMembersLoaded(false);
    setMembers([]);
  }, [isOpen, server]);

  /* lazy-load members only on first visit to that tab */
  const fetchMembers = useCallback(async () => {
    if (membersLoaded || membersLoading) return;
    setMembersLoading(true);
    try {
      const res  = await fetch(`${baseUrl}/server_user/${server.id}`, options("GET", token));
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
      setMembersLoaded(true);
    } catch {
      setError("Could not load members.");
    } finally {
      setMembersLoading(false);
    }
  }, [membersLoaded, membersLoading, server.id, token]);

  useEffect(() => {
    if (isOpen && activeTab === "members") fetchMembers();
  }, [isOpen, activeTab, fetchMembers]);

  /* ── actions ────────────────────────────────────────────── */
  const handleUpdate = async () => {
    if (!serverName.trim() || serverName === server.name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${baseUrl}/servers/${server.id}`,
        options("PUT", token, { name: serverName }),
      );
      if (!res.ok) throw new Error("Failed to update server.");
      onServerUpdated();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this server? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/servers/${server.id}`, options("DELETE", token));
      if (!res.ok) throw new Error("Failed to delete server.");
      onServerDeleted();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
      setDeleting(false);
    }
  };

  const handleKick = async (memberId: string) => {
    if (!window.confirm("Remove this member from the server?")) return;
    try {
      const res = await fetch(`${baseUrl}/server_users/${memberId}`, options("DELETE", token));
      if (!res.ok) throw new Error("Failed to remove member.");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  /* close on backdrop click */
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  /* close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="ssm-backdrop" onClick={onBackdropClick} role="presentation">
      <div
        className="ssm-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Server Settings"
      >
        {/* ── Sidebar ── */}
        <aside className="ssm-sidebar">
          <div className="ssm-server-label" title={server.name}>
            {server.name}
          </div>

          <button
            className={`ssm-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="ssm-tab-icon">⚙️</span>
            Overview
          </button>

          <button
            className={`ssm-tab-btn ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            <span className="ssm-tab-icon">👥</span>
            Members
          </button>
        </aside>

        {/* ── Main content ── */}
        <div className="ssm-content">
          {/* header */}
          <div className="ssm-header">
            <h2 className="ssm-title">
              {activeTab === "overview" ? "Server Overview" : "Members"}
            </h2>
            <button className="ssm-close-btn" onClick={onClose} aria-label="Close dialog">
              ✕
            </button>
          </div>

          {/* body */}
          <div className="ssm-body">
            {error && (
              <div className="ssm-error" role="alert">
                {error}
              </div>
            )}

            {/* ── Overview ── */}
            {activeTab === "overview" && (
              <>
                <div className="ssm-field">
                  <label className="ssm-label" htmlFor="ssm-server-name">
                    Server Name
                  </label>
                  <input
                    id="ssm-server-name"
                    type="text"
                    className="ssm-input"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    disabled={!isAdmin}
                    maxLength={100}
                    placeholder="Enter server name"
                  />
                  {!isAdmin && (
                    <span className="ssm-input-hint ssm-muted-text">
                      Only the server admin can rename this server.
                    </span>
                  )}
                </div>

                <div className="ssm-footer">
                  {isAdmin ? (
                    <>
                      <button
                        className="ssm-btn ssm-btn-danger"
                        onClick={handleDelete}
                        disabled={deleting || saving}
                      >
                        {deleting ? "Deleting…" : "🗑 Delete Server"}
                      </button>
                      <button
                        className="ssm-btn ssm-btn-primary"
                        onClick={handleUpdate}
                        disabled={
                          saving ||
                          !serverName.trim() ||
                          serverName === server.name
                        }
                      >
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <p className="ssm-muted-text">
                      You are a member of this server.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Members ── */}
            {activeTab === "members" && (
              <>
                {membersLoading ? (
                  <div className="ssm-spinner-wrap">
                    <div className="ssm-spinner" role="status" aria-label="Loading members" />
                  </div>
                ) : (
                  <div className="ssm-member-scroll">
                    <div className="ssm-member-count">
                      {members.length} member{members.length !== 1 ? "s" : ""}
                    </div>

                    {members.map((m) => (
                      <div key={m.id} className="ssm-member-row">
                        <div className="ssm-member-info">
                          <div className="ssm-avatar">
                            {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="ssm-member-text">
                            <div className="ssm-member-name">
                              {m.username}
                              {m.id === server.admin_id && " 👑"}
                            </div>
                            <div className="ssm-member-role">{m.role}</div>
                          </div>
                        </div>

                        {isAdmin && m.id !== currentUserId && (
                          <button
                            className="ssm-kick-btn"
                            onClick={() => handleKick(m.id)}
                          >
                            Kick
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}