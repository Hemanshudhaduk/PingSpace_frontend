import { useState, useEffect, useRef, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";
import "./RoomMemberManagement.css";

/* ─────────────────────────── types ─────────────────────────── */
type Room = { id: string | number; name: string; visibility?: "public" | "private" };
type RoomMember = { id: string; user_id: string; role: string; username?: string };
type ServerMember = { id: string; username?: string };

type Props = {
  isOpen: boolean;
  room: Room | null;
  serverId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  onClose: () => void;
  onMemberAdded?: () => void;
};

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
export default function RoomMemberManagement({
  isOpen,
  room,
  serverId,
  currentUserId: providedUserId,
  isAdmin = false,
  onClose,
  onMemberAdded,
}: Props) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const token = getToken() || "";

  // Get current user ID from token if not provided
  const currentUserId = useMemo(() => {
    if (providedUserId) return providedUserId;
    if (!token) return "";
    try {
      const decoded = jwtDecode<{ sub: string }>(token);
      return decoded.sub;
    } catch {
      return "";
    }
  }, [token, providedUserId]);

  const getDisplayName = (value?: string, fallback = "Unknown member") => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
  };

  const getInitial = (value?: string) => getDisplayName(value).charAt(0).toUpperCase();

  const normalizeMember = (member: Partial<RoomMember>) => ({
    id: String(member.id ?? member.user_id ?? ""),
    user_id: String(member.user_id ?? member.id ?? ""),
    role: member.role ?? "member",
    username: getDisplayName(member.username),
  });

  /* ── auto-focus on open ── */
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 80);
    setSearchQuery("");
    setError(null);
    setSuccess(false);
  }, [isOpen]);

  /* ── close on Escape ─────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ── Fetch current members ──────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || !room?.id) return;
    setLoading(true);
    setError(null);
    fetch(`${baseUrl}/rooms/${room.id}/members`, options("GET", token))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        // Create a lookup map of user_id -> username from server members
        const usernameLookup = new Map(
          serverMembers.map((member) => [member.id, member.username])
        );

        setMembers(
          Array.isArray(data)
            ? data.map((member: Partial<RoomMember>) => ({
                id: String(member.id ?? member.user_id ?? ""),
                user_id: String(member.user_id ?? member.id ?? ""),
                role: member.role ?? "member",
                // Use username from API response, or look it up from server members
                username: getDisplayName(
                  member.username || usernameLookup.get(String(member.user_id ?? ""))
                ),
              }))
            : [],
        );
      })
      .catch((err) => {
        console.error("Failed to fetch members:", err);
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, room?.id, token, serverMembers]);

  /* ── Fetch server members ──────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || !serverId) return;
    fetch(`${baseUrl}/server_user/${serverId}`, options("GET", token))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setServerMembers(
          Array.isArray(data)
            ? data.map((member: Partial<ServerMember>) => ({
                id: String(member.id ?? ""),
                username: getDisplayName(member.username),
              }))
            : [],
        );
      })
      .catch((err) => {
        console.error("Failed to fetch server members:", err);
        setServerMembers([]);
      });
  }, [isOpen, serverId, token]);

  /* ── Filter available members (not already in room) ────────── */
  const availableMembers = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.user_id));
    const q = searchQuery.trim().toLowerCase();
    return serverMembers
      .filter((m) => {
        const name = getDisplayName(m.username).toLowerCase();
        return !memberIds.has(m.id) && name.includes(q);
      })
      .slice(0, 8); // Limit suggestions
  }, [members, serverMembers, searchQuery]);

  /* ── Handle add member ─────────────────────────────────────── */
  const handleAddMember = async () => {
    if (!room?.id || !selectedMemberId) return;

    setAddMemberLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = { user_id: selectedMemberId, role: "member" };
      const res = await fetch(
        `${baseUrl}/rooms/${room.id}/members`,
        options("POST", token, payload)
      );

      if (!res.ok) {
        const data: { detail?: string } = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to add member");
      }

      setSuccess(true);
      setSuccessMessage("Member added successfully");
      setSelectedMemberId(null);
      setSearchQuery("");
      onMemberAdded?.();

      fetch(`${baseUrl}/rooms/${room.id}/members`, options("GET", token))
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setMembers(Array.isArray(data) ? data.map(normalizeMember) : []))
        .catch(console.error);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddMemberLoading(false);
    }
  };

  /* ── Handle remove member ──────────────────────────────────── */
  const handleRemoveMember = async (member: RoomMember) => {
    if (!room?.id) return;

    const isSelf = member.user_id === currentUserId;
    const isAdminMember = member.role === "admin";

    if (!isSelf && !isAdmin) return;
    if (isAdminMember && !isSelf) return;

    const confirmed = window.confirm(
      isSelf ? "Leave this room?" : `Remove ${getDisplayName(member.username)} from this room?`,
    );
    if (!confirmed) return;

    setRemovingMemberId(member.id);
    setError(null);

    try {
      const res = await fetch(
        `${baseUrl}/rooms/${room.id}/members/${member.user_id}`,
        options("DELETE", token)
      );

      if (!res.ok) {
        const data: { detail?: string; message?: string } = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? data.message ?? "Failed to remove member");
      }

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setSuccess(true);
      setSuccessMessage(isSelf ? "You left the room" : "Member removed");
      if (isSelf) {
        setTimeout(() => onClose(), 900);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  /* ── backdrop click ────────────────────────────────────────── */
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !room) return null;

  return (
    <div
      className="rmm-backdrop"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        className="rmm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rmm-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rmm-header">
          <div>
            <h2 id="rmm-title" className="rmm-title">
              <LockIcon /> Manage Access
            </h2>
            <p className="rmm-desc">
              {room.name} · {room.visibility === "private" ? "Private room" : "Public room"}
            </p>
          </div>
          <button
            type="button"
            className="rmm-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="rmm-content">
          {error && <div className="rmm-alert error">{error}</div>}
          {success && <div className="rmm-alert success">{successMessage}</div>}

          {isAdmin && (
            <div className="rmm-section">
              <h3 className="rmm-section-title">Add Members</h3>
              <div className="rmm-search-box">
                <SearchIcon className="rmm-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="rmm-search-input"
                  placeholder="Search server members..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedMemberId(null);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="rmm-clear-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedMemberId(null);
                    }}
                    aria-label="Clear member search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {searchQuery && availableMembers.length > 0 && (
                <div className="rmm-suggestions">
                  {availableMembers.map((member) => {
                    const displayName = getDisplayName(member.username);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`rmm-suggestion-item ${
                          selectedMemberId === member.id ? "selected" : ""
                        }`}
                        onClick={() => setSelectedMemberId(member.id)}
                      >
                        <span className="rmm-avatar">{getInitial(member.username)}</span>
                        <span className="rmm-suggestion-name">{displayName}</span>
                        {selectedMemberId === member.id && (
                          <span className="rmm-checkmark">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchQuery && availableMembers.length === 0 && (
                <p className="rmm-no-results">No addable members found</p>
              )}

              <button
                type="button"
                className="rmm-btn rmm-btn-add"
                onClick={handleAddMember}
                disabled={!selectedMemberId || addMemberLoading}
              >
                {addMemberLoading ? (
                  <><span className="rmm-spinner" /> Adding...</>
                ) : (
                  <><PlusIcon /> Add Member</>
                )}
              </button>
            </div>
          )}

          {/* Members List Section */}
          <div className="rmm-section">
            <h3 className="rmm-section-title">
              Current Members ({members.length})
            </h3>

            {loading ? (
              <div className="rmm-loading">
                <span className="rmm-spinner-lg" /> Loading...
              </div>
            ) : members.length === 0 ? (
              <p className="rmm-no-members">No members yet</p>
            ) : (
              <div className="rmm-members-list">
                {members.map((member) => (
                  (() => {
                    const memberName = getDisplayName(member.username);
                    const firstChar = getInitial(member.username);
                    const isSelf = member.user_id === currentUserId;
                    const canRemove = isAdmin ? member.role !== "admin" : isSelf;

                    return (
                      <div key={member.id} className="rmm-member-item">
                        <div className="rmm-member-info">
                          <span className="rmm-member-avatar">{firstChar}</span>
                          <div className="rmm-member-details">
                            <span className="rmm-member-name">
                              {memberName}
                              {isSelf && <span className="rmm-you-badge">You</span>}
                            </span>
                            <span className="rmm-member-role">
                              {member.role === "admin" ? "🔐 Admin" : "👤 Member"}
                            </span>
                          </div>
                        </div>
                        {canRemove && (
                          <button
                            type="button"
                            className="rmm-btn-remove"
                            onClick={() => handleRemoveMember(member)}
                            disabled={removingMemberId === member.id}
                            aria-label={isSelf ? "Leave room" : `Remove ${memberName}`}
                            title={isSelf ? "Leave room" : "Remove member"}
                          >
                            {removingMemberId === member.id ? (
                              <span className="rmm-spinner-sm" />
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="rmm-footer">
          <button
            type="button"
            className="rmm-btn rmm-btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inline SVG Icons ─────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
