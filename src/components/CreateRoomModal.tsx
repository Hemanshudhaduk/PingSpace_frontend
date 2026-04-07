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
  const [channelType, setChannelType] = useState<"text" | "voice">("text");
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
    setChannelType("text");
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
              <h2 id="crm-title" className="crm-title">Create Channel</h2>
              <p className="crm-desc">A channel is where your team communicates.</p>
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

          {/* Channel type picker */}
          <div className="crm-field">
            <label className="crm-label">Channel Type</label>
            <div className="crm-type-picker">
              <button
                type="button"
                className={`crm-type-option ${channelType === "text" ? "active" : ""}`}
                onClick={() => setChannelType("text")}
              >
                <TextChannelIcon /> Text
              </button>
              <button
                type="button"
                className={`crm-type-option ${channelType === "voice" ? "active" : ""}`}
                onClick={() => setChannelType("voice")}
              >
                <VoiceChannelIcon /> Voice
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

const TextChannelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const VoiceChannelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

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
