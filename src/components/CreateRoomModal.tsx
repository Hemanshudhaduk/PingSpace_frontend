import { useState, useEffect, useRef } from "react";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";
import "./CreateRoomModal.css";

/* ─────────────────────────── types ─────────────────────────── */
type Props = {
  isOpen: boolean;
  serverId: string;
  onClose: () => void;
  onRoomCreated: () => void;
};

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
export default function CreateRoomModal({
  isOpen,
  serverId,
  onClose,
  onRoomCreated,
}: Props) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const token   = getToken() || "";

  /* reset on open + auto-focus */
  useEffect(() => {
    if (!isOpen) return;
    setChannelName("");
    setDescription("");
    setVisibility("public");
    setError(null);
    setSuccess(false);
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [isOpen]);

  /* close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ── submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        name: channelName.trim(),
        description: description.trim(),
        server_id: serverId,
        visibility: visibility,
      };
      const res = await fetch(`${baseUrl}/rooms`, options("POST", token, payload));
      if (!res.ok) {
        const data: { detail?: string } = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to create channel");
      }
      setSuccess(true);
      onRoomCreated();
      setTimeout(() => onClose(), 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* backdrop click */
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const nameLen = channelName.length;
  const descLen = description.length;

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div
      className="crm-backdrop"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        className="crm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-icon-wrap">
              <HashIcon />
            </div>
            <div>
              <h2 id="crm-title" className="crm-title">Create Room</h2>
              <p className="crm-desc">A room is where your team communicates.</p>
            </div>
          </div>
          <button
            type="button"
            className="crm-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="crm-form">
          {error   && <div className="crm-alert error">{error}</div>}
          {success && <div className="crm-alert success">Channel created!</div>}

          {/* Visibility picker */}
          <div className="crm-field">
            <label className="crm-label">Room Visibility</label>
            <div className="crm-visibility-picker">
              <button
                type="button"
                className={`crm-visibility-option ${visibility === "public" ? "active" : ""}`}
                onClick={() => setVisibility("public")}
              >
                <GlobeIcon /> Public
                <span className="crm-visibility-desc">Everyone can see & access</span>
              </button>
              <button
                type="button"
                className={`crm-visibility-option ${visibility === "private" ? "active" : ""}`}
                onClick={() => setVisibility("private")}
              >
                <LockIcon /> Private
                <span className="crm-visibility-desc">Invite members manually</span>
              </button>
            </div>
          </div>

          {/* Name input */}
          <div className="crm-field">
            <label htmlFor="crm-name" className="crm-label">
              Channel Name <span className="crm-required-dot" />
            </label>
            <input
              ref={nameRef}
              id="crm-name"
              type="text"
              className="crm-input"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g. general"
              maxLength={50}
              required
            />
            <span className={`crm-charcount ${nameLen > 42 ? "warn" : ""}`}>
              {nameLen} / 50
            </span>
          </div>

          {/* Description */}
          <div className="crm-field">
            <label htmlFor="crm-desc-input" className="crm-label">
              Topic
              <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 10, color: "inherit", opacity: 0.7 }}>
                (optional)
              </span>
            </label>
            <textarea
              id="crm-desc-input"
              className="crm-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              maxLength={200}
              rows={3}
            />
            <span className={`crm-charcount ${descLen > 170 ? "warn" : ""}`}>
              {descLen} / 200
            </span>
          </div>

          <div className="crm-divider" />

          {/* Actions */}
          <div className="crm-actions">
            <button
              type="button"
              className="crm-btn crm-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`crm-btn crm-btn-create ${success ? "success" : ""}`}
              disabled={loading || !channelName.trim()}
            >
              {loading ? (
                <><span className="crm-spinner" /> Creating...</>
              ) : success ? (
                <><CheckIcon /> Done!</>
              ) : (
                <><PlusIcon /> Create Channel</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Inline SVG Icons ─────────────────────────────────────── */
const HashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
//     <line x1="8" y1="23" x2="16" y2="23" />
//   </svg>
// );

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
