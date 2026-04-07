import { jwtDecode } from "jwt-decode";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import ServerSidebar from "./ServerSidebar";
import { getToken } from "../store/authStore";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import CreateRoomModal from "./CreateRoomModal";
import ServerSettingsModal from "./ServerSettingsModal";
import ChannelSettingsModal from "./ChannelSettingsModal";
import JoinRequestsModal from "./JoinRequestsModal";

/* ─────────────────────────── types ─────────────────────────── */
type Room = { name: string; id: string | number };
type Server = { name: string; id: string; admin_id: string };

type SidebarProps = {
  getServer: () => void;
  onSelectRoom: (roomName: string, id: string | number) => void;
  onToggleTheme: () => void;
  isOpen?: boolean;
  headerSlot?: ReactNode;
  activeRoomName?: string;
  server?: Server[];
  onServerChange?: (serverId: string) => void;
};

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({
  getServer,
  onSelectRoom,
  isOpen,
  activeRoomName,
  server,
  onServerChange,
}: SidebarProps) {
  const [query, setQuery]                       = useState("");
  const [showCreateRoom, setShowCreateRoom]     = useState(false);
  const [showInviteToast, setShowInviteToast]   = useState(false);
  const [activeServerId, setActiveServerId]     = useState<string | undefined>();
  const [rooms, setRooms]                       = useState<Room[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [pendingCount, setPendingCount]         = useState(0);
  const [settingsRoom, setSettingsRoom]         = useState<Room | null>(null);

  const tokenString = getToken() || "";

  const currentUserId = useMemo(() => {
    if (!tokenString) return "";
    try { return jwtDecode<{ sub: string }>(tokenString).sub; }
    catch { return ""; }
  }, [tokenString]);

  const activeServer = useMemo(
    () =>
      activeServerId && server
        ? (server.find((s) => s.id === activeServerId) ?? null)
        : null,
    [activeServerId, server],
  );

  const isAdmin = activeServer?.admin_id === currentUserId;

  /* ── Fetch rooms ── */
  const getRoom = useCallback(async () => {
    if (!activeServerId) return;
    setLoading(true);
    setRooms([]);
    try {
      const res = await fetch(
        `${baseUrl}/rooms/${activeServerId}`,
        options("GET", tokenString),
      );
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [activeServerId, tokenString]);

  useEffect(() => { getRoom(); }, [getRoom]);

  /* ── Poll join requests (admin only) ── */
  useEffect(() => {
    if (!activeServerId || !isAdmin) return;
    let lastCount = 0;
    const checkRequests = () => {
      fetch(`${baseUrl}/join_requests/${activeServerId}`, options("GET", tokenString))
        .then((res) => res.json())
        .then((data) => {
          if (!Array.isArray(data)) return;
          if (data.length > lastCount) setShowJoinRequests(true);
          lastCount = data.length;
          setPendingCount(data.length);
        })
        .catch(console.error);
    };
    checkRequests();
    const interval = setInterval(checkRequests, 5000);
    return () => clearInterval(interval);
  }, [activeServerId, isAdmin, tokenString]);

  /* ── Handlers ── */
  const handleServerSelect = (serverID: string) => {
    if (serverID) setActiveServerId(serverID);
    onServerChange?.(serverID);
  };

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rooms.filter((r) => r.name.toLowerCase().includes(q)) : rooms;
  }, [rooms, query]);

  const handleInvite = () => {
    if (!activeServerId) return;
    const inviteLink = `${window.location.origin}/join?server=${activeServerId}/${currentUserId}`;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        setShowInviteToast(true);
        setTimeout(() => setShowInviteToast(false), 2000);
      })
      .catch(() => alert(`Invite Link: ${inviteLink}`));
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-row">
        <ServerSidebar
          getServer={getServer}
          server={server}
          parent={handleServerSelect}
        />

        <div className="sidebar-content">
          {/* ── Header ── */}
          <div className="sidebar-header">
            {activeServer ? (
              <>
                <div className="brand">{activeServer.name}</div>
                <div className="sidebar-header-actions">
                  {isAdmin && (
                    <button
                      onClick={() => setShowJoinRequests(true)}
                      className="sidebar-action-btn"
                      aria-label="Join Requests"
                      title="Join Requests"
                    >
                      <UsersIcon />
                      {pendingCount > 0 && (
                        <span className="sidebar-badge">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowServerSettings(true)}
                    className="sidebar-action-btn"
                    aria-label="Server Settings"
                    title="Server Settings"
                  >
                    <SettingsIcon />
                  </button>
                  <button
                    onClick={handleInvite}
                    className="sidebar-action-btn"
                    aria-label="Invite people"
                    title="Invite people"
                  >
                    <InviteIcon />
                  </button>

                  {showInviteToast && (
                    <div className="sidebar-invite-toast">
                      <CheckIcon /> Copied!
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="brand sidebar-brand-muted">No Server</div>
            )}
          </div>

          {/* ── Search ── */}
          <div className="sidebar-search-wrap">
            <div className="sidebar-search-inner">
              <SearchIcon />
              <input
                type="text"
                className="search"
                placeholder="Search channels..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ── Section title ── */}
          <div className="section">
            <div className="section-row">
              <div className="section-title">Text Channels</div>
              {activeServer && isAdmin && (
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="section-add-btn"
                  aria-label="Create channel"
                  title="Create channel"
                >
                  <PlusSmIcon />
                </button>
              )}
            </div>
          </div>

          {/* ── Channel list ── */}
          <div className="channel-list">
            {!activeServer ? (
              <div className="channel-empty">
                <EmptyServerIcon />
                <span>Select a server to view channels.</span>
              </div>
            ) : loading ? (
              <div className="channel-empty">
                <div className="channel-loading-spinner" />
                <span>Loading channels...</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="channel-empty">
                <EmptyChannelIcon />
                <span>
                  {query
                    ? "No channels match your search."
                    : "No channels in this server."}
                </span>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className={`channel-item ${activeRoomName === room.name ? "active" : ""}`}
                >
                  <div
                    className="channel-item-main"
                    onClick={() => onSelectRoom(room.name, room.id)}
                  >
                    <span className="channel-hash">#</span>
                    <span className="channel-name">{room.name}</span>
                  </div>
                  {isAdmin && (
                    <button
                      className="channel-settings-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsRoom(room);
                      }}
                      title="Edit Channel"
                      aria-label={`Edit ${room.name}`}
                    >
                      <SmallGearIcon />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateRoom && activeServerId && (
        <CreateRoomModal
          isOpen={showCreateRoom}
          serverId={activeServerId}
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={getRoom}
        />
      )}
      {activeServer && (
        <ServerSettingsModal
          isOpen={showServerSettings}
          server={activeServer}
          currentUserId={currentUserId}
          onClose={() => setShowServerSettings(false)}
          onServerUpdated={getServer}
          onServerDeleted={() => {
            getServer();
            onServerChange?.("");
          }}
        />
      )}
      {settingsRoom && (
        <ChannelSettingsModal
          isOpen={!!settingsRoom}
          room={settingsRoom}
          isAdmin={isAdmin}
          onClose={() => setSettingsRoom(null)}
          onRoomUpdated={getRoom}
          onRoomDeleted={() => {
            getRoom();
            if (activeRoomName === settingsRoom.name) onSelectRoom("", "");
          }}
        />
      )}
      {showJoinRequests && activeServerId && (
        <JoinRequestsModal
          serverId={activeServerId}
          onClose={() => setShowJoinRequests(false)}
        />
      )}
    </aside>
  );
}

/* ── Inline SVG Icons ─────────────────────────────────────── */
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const InviteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusSmIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SmallGearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
    <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EmptyServerIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const EmptyChannelIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);
