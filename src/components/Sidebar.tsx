import { jwtDecode } from "jwt-decode";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import ServerSidebar from "./ServerSidebar";
import { getToken } from "../store/authStore";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import InputModal from "./InputModal";
import ServerSettingsModal from "./ServerSettingsModal";
import ChannelSettingsModal from "./ChannelSettingsModal";
import JoinRequestsModal from "./JoinRequestsModal";

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

export default function Sidebar({
  getServer,
  onSelectRoom,
  isOpen,
  activeRoomName,
  server,
  onServerChange,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeServerId, setActiveServerID] = useState<string | undefined>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [settingsRoom, setSettingsRoom] = useState<Room | null>(null);

  const tokenString = getToken() || "";

  // Decode JWT once, not on every render
  const currentUserId = useMemo(() => {
    if (!tokenString) return "";
    try {
      return jwtDecode<{ sub: string }>(tokenString).sub;
    } catch {
      return "";
    }
  }, [tokenString]);

  const activeServer = useMemo(
    () =>
      activeServerId && server
        ? (server.find((s) => s.id === activeServerId) ?? null)
        : null,
    [activeServerId, server],
  );

  const isAdmin = activeServer?.admin_id === currentUserId;

  const getRoom = useCallback(async () => {
    if (!activeServerId) return;

    setLoading(true); // start loader
    setRooms([]);
    try {
      const response = await fetch(
        `${baseUrl}/rooms/${activeServerId}`,
        options("GET", tokenString),
      );
      const data = await response.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      setRooms([]);
    } finally {
      setLoading(false); // stop loader
    }
  }, [activeServerId, tokenString]);

  // Fetch rooms whenever active server changes
  useEffect(() => {
    getRoom();
  }, [getRoom]);

  // Poll join requests only when admin
  useEffect(() => {
    if (!activeServerId || !isAdmin) return;

    let lastCount = 0;

    const checkRequests = () => {
      fetch(
        `${baseUrl}/join_requests/${activeServerId}`,
        options("GET", tokenString),
      )
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
  const handleSeverID = (serverID: string) => {
    if (serverID) setActiveServerID(serverID);
    onServerChange?.(serverID);
  };

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rooms.filter((r) => r.name.toLowerCase().includes(q)) : rooms;
  }, [rooms, query]);

  const handleSubmit = async (values: Record<string, string | number>) => {
    if (!activeServerId) return;
    try {
      const payload = {
        name: String(values.name || "").trim(),
        description: String(values.description || "").trim(),
        server_id: activeServerId,
      };
      await fetch(`${baseUrl}/rooms`, options("POST", tokenString, payload));
      setShow(false);
      getRoom();
    } catch (error) {
      console.error(error);
    }
  };

  const handleInvite = () => {
    if (!activeServerId) return;
    const inviteLink = `${window.location.origin}/join?server=${activeServerId}/${currentUserId}`;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        setShowInviteModal(true);
        setTimeout(() => setShowInviteModal(false), 2000);
      })
      .catch(() => alert(`Invite Link: ${inviteLink}`));
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-row">
        <ServerSidebar
          getServer={getServer}
          server={server}
          parent={handleSeverID}
        />

        <div className="sidebar-content">
          <div className="sidebar-header">
            {activeServer ? (
              <>
                <div className="brand">{activeServer.name}</div>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isAdmin && (
                    <button
                      onClick={() => setShowJoinRequests(true)}
                      className="invite-button"
                      aria-label="Join Requests"
                      title="Join Requests"
                      style={{ position: "relative" }}
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
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {pendingCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: "bold",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowServerSettings(true)}
                    className="invite-button"
                    aria-label="Server Settings"
                    title="Server Settings"
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
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleInvite}
                    className="invite-button"
                    aria-label="Invite"
                    title="Invite people"
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </button>
                  {showInviteModal && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: 8,
                        background: "#22c55e",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        zIndex: 50,
                      }}
                    >
                      Copied!
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="brand" style={{ color: "var(--muted)" }}>
                No Server
              </div>
            )}
          </div>

          <div style={{ padding: "12px 16px 4px", flexShrink: 0 }}>
            <input
              type="text"
              className="search"
              placeholder="Search channels..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="section-title">Text Channels</div>
              {activeServer && (
                <button
                  onClick={() => setShow(true)}
                  aria-label="Create channel"
                  title="Create channel"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 4,
                    marginRight: 4,
                    borderRadius: 4,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color = "var(--muted)")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="channel-list">
            {!activeServer ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Select a server to view channels.
              </div>
            ) : loading ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                ⏳ Loading channels...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                {query
                  ? "No channels match your search."
                  : "No channels in this server."}
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className={`channel-item ${activeRoomName === room.name ? "active" : ""}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingRight: "8px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={() => onSelectRoom(room.name, room.id)}
                  >
                    <span className="channel-hash">#</span>
                    <span className="channel-name">{room.name}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsRoom(room);
                      }}
                      title="Edit Channel"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.color = "var(--text)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.color = "var(--muted)")
                      }
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {show && (
        <InputModal
          isOpen={show}
          title="Create Channel"
          description="A channel is where your team communicates."
          submitLabel="Create Channel"
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 6C3 4.89 3.89 4 5 4H15C16.11 4 17 4.89 17 6V13C17 14.11 16.11 15 15 15H11.5L8.5 17.5V15H5C3.89 15 3 14.11 3 13V6Z"
                stroke="#6366f1"
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
              />
              <circle cx="7.5" cy="9.5" r="1" fill="#6366f1" />
              <circle cx="10" cy="9.5" r="1" fill="#6366f1" />
              <circle cx="12.5" cy="9.5" r="1" fill="#6366f1" />
            </svg>
          }
          onClose={() => setShow(false)}
          fields={[
            {
              name: "name",
              label: "Channel Name",
              placeholder: "e.g. general",
              required: true,
              type: "text",
              maxLength: 50,
            },
            {
              name: "description",
              label: "Topic (optional)",
              placeholder: "What's this channel about?",
              type: "text",
              rows: 3,
              maxLength: 200, 
            },
          ]}
          onSubmit={handleSubmit}
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
