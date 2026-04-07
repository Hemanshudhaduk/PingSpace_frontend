import { useState, useEffect } from "react";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";
import "./ChannelSettingsModal.css";

/* ─────────────────────────── types ─────────────────────────── */
type Room = { name: string; id: string | number; description?: string };
type Tab = "overview" | "danger";

type Props = {
  isOpen: boolean;
  room: Room;
  isAdmin: boolean;
  onClose: () => void;
  onRoomUpdated: () => void;
  onRoomDeleted: () => void;
};

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
export default function ChannelSettingsModal({
  isOpen,
  room,
  isAdmin,
  onClose,
  onRoomUpdated,
  onRoomDeleted,
}: Props) {
  const [activeTab,   setActiveTab]   = useState<Tab>("overview");
  const [channelName, setChannelName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState<string | null>(null);

  const token = getToken() || "";

  /* reset on open */
  useEffect(() => {
    if (!isOpen) return;
    setChannelName(room.name);
    setDescription(room.description || "");
    setError(null);
    setSuccess(null);
    setActiveTab("overview");
  }, [isOpen, room]);

  /* close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ── actions ────────────────────────────────────────────── */
  const handleUpdate = async () => {
    if (!channelName.trim()) return;
    const nameUnchanged = channelName === room.name;
    const descUnchanged = description === (room.description || "");
    if (nameUnchanged && descUnchanged) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `${baseUrl}/rooms/${room.id}`,
        options("PUT", token, { name: channelName, description }),
      );
      if (!res.ok) throw new Error("Failed to update channel");
      setSuccess("Channel updated successfully!");
      onRoomUpdated();
      setTimeout(() => onClose(), 800);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to completely delete this channel? All messages will be lost.",
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `${baseUrl}/rooms/${room.id}`,
        options("DELETE", token),
      );
      if (!res.ok) throw new Error("Failed to delete channel");
      onRoomDeleted();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
      setDeleting(false);
    }
  };

  /* backdrop click */
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const hasChanges =
    channelName !== room.name ||
    description !== (room.description || "");

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="csm-backdrop" onClick={onBackdropClick} role="presentation">
      <div
        className="csm-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Channel Settings"
      >
        {/* ── Sidebar ── */}
        <aside className="csm-sidebar">
          <div className="csm-channel-label" title={room.name}>
            # {room.name}
          </div>

          <button
            className={`csm-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="csm-tab-icon"><GearIcon /></span>
            Overview
          </button>

          {isAdmin && (
            <>
              <div className="csm-sidebar-divider" />
              <button
                className={`csm-tab-btn ${activeTab === "danger" ? "active" : ""}`}
                onClick={() => setActiveTab("danger")}
                style={activeTab === "danger" ? { color: "#f87171" } : undefined}
              >
                <span className="csm-tab-icon"><WarningIcon /></span>
                Danger Zone
              </button>
            </>
          )}
        </aside>

        {/* ── Main content ── */}
        <div className="csm-content">
          {/* header */}
          <div className="csm-header">
            <h2 className="csm-title">
              {activeTab === "overview" ? "Channel Overview" : "Danger Zone"}
            </h2>
            <button
              className="csm-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <CloseIcon />
            </button>
          </div>

          {/* body */}
          <div className="csm-body">
            {error && (
              <div className="csm-alert error" role="alert">{error}</div>
            )}
            {success && (
              <div className="csm-alert success">{success}</div>
            )}

            {/* ── Overview tab ── */}
            {activeTab === "overview" && (
              <>
                {/* Channel preview card */}
                <div className="csm-preview-card">
                  <div className="csm-preview-icon">
                    <HashIcon />
                  </div>
                  <div>
                    <div className="csm-preview-name">{channelName || room.name}</div>
                    <div className="csm-preview-sub">
                      {description || "No topic set"}
                    </div>
                  </div>
                </div>

                <div className="csm-field">
                  <label className="csm-label" htmlFor="csm-channel-name">
                    Channel Name
                  </label>
                  <input
                    id="csm-channel-name"
                    type="text"
                    className="csm-input"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    disabled={!isAdmin}
                    maxLength={50}
                    placeholder="Enter channel name"
                  />
                </div>

                <div className="csm-field">
                  <label className="csm-label" htmlFor="csm-channel-desc">
                    Channel Topic
                  </label>
                  <textarea
                    id="csm-channel-desc"
                    className="csm-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isAdmin}
                    maxLength={200}
                    placeholder="What is this channel about?"
                    rows={3}
                  />
                </div>

                {!isAdmin && (
                  <div className="csm-info-card">
                    <span className="csm-info-icon"><LockIcon /></span>
                    Only server admins can modify channel settings.
                  </div>
                )}
              </>
            )}

            {/* ── Danger Zone tab ── */}
            {activeTab === "danger" && isAdmin && (
              <div className="csm-danger-card">
                <div className="csm-danger-title">
                  <WarningIcon /> Delete Channel
                </div>
                <p className="csm-danger-text">
                  Permanently removes <strong>#{room.name}</strong> and all its
                  messages. This action cannot be undone and your data cannot be
                  recovered.
                </p>
                <button
                  className="csm-btn csm-btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <><span className="csm-spinner" /> Deleting...</>
                  ) : (
                    <><TrashIcon /> Delete this channel</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer — only on overview tab for admin */}
          {activeTab === "overview" && isAdmin && (
            <div className="csm-footer">
              <button
                className="csm-btn csm-btn-ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="csm-btn csm-btn-primary"
                onClick={handleUpdate}
                disabled={saving || !channelName.trim() || !hasChanges}
              >
                {saving ? (
                  <><span className="csm-spinner" /> Saving...</>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline SVG Icons ─────────────────────────────────────── */
const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const HashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
