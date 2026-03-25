import { jwtDecode } from "jwt-decode";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type KeyboardEvent,
} from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import ChatHeader from "../components/ChatHeader";
import ChatScreen from "../components/ChatScreen";
import Sidebar from "../components/Sidebar";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";

type Server = { id: string; name: string; admin_id: string };
type ChatMessage = {
  id?: string;
  sender: string;
  content: string;
  created_at?: string;
};

export default function ChatLayout() {
  const logout = useAuthStore((s) => s.logout);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [roomID, setRoomID] = useState<string | number>();
  const [server, setServer] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState("");

  const token = localStorage.getItem("token");

  // Decode JWT once
  const { username, currentUserId } = useMemo(() => {
    if (!token) return { username: undefined, currentUserId: "" };
    try {
      const decoded = jwtDecode<{ sub: string; username: string }>(token);
      return { username: decoded.username, currentUserId: decoded.sub };
    } catch {
      return { username: undefined, currentUserId: "" };
    }
  }, [token]);

  const ws = useRef<WebSocket | null>(null);

  const activeServer = server.find((s) => s.id === activeServerId);
  const isAdmin = activeServer?.admin_id === currentUserId;

  // Fetch message history when room changes
  useEffect(() => {
    if (!roomID || !activeServerId || !token) return;
    fetch(`${baseUrl}/messages/${roomID}`, options("GET", token))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setChat(Array.isArray(data) ? data : []))
      .catch((err) => console.error("History fetch error:", err));
  }, [roomID, activeServerId, token]);

  // WebSocket connection
  useEffect(() => {
    if (!username || !room || !activeServerId || !token) return;

    ws.current?.close();
    const wsUrl = baseUrl.replace(/^http/, "ws");
    ws.current = new WebSocket(`${wsUrl}/ws/${roomID}?token=${token}`);

    ws.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setChat((prev) => [...prev, {
          id: payload.id,
          sender: payload.sender,
          content: payload.content,
          created_at: new Date().toISOString(),
        }]);
      } catch {
        setChat((prev) => [...prev, { sender: "System", content: String(event.data) }]);
      }
    };
    ws.current.onerror = (error) => console.error("WebSocket error:", error);

    return () => ws.current?.close();
  }, [room, username, roomID, activeServerId, token]);

  const selectedRoom = (roomName: string, id: string | number) => {
    setRoomID(id);
    setRoom(roomName);
    setIsSidebarOpen(false);
  };

  const getServer = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${baseUrl}/servers`, options("GET", token));
      if (!res.ok) return;
      const ans = await res.json();
      setServer(Array.isArray(ans) ? ans : []);
    } catch (e) {
      console.error("Failed to fetch servers:", e);
    }
  }, [token]);

  useEffect(() => {
    getServer();
  }, [getServer]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const send = () => {
    if (!message.trim() || ws.current?.readyState !== WebSocket.OPEN) return;
    ws.current.send(message);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); send(); }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      const res = await fetch(`${baseUrl}/messages/${msgId}`, options("DELETE", token));
      if (res.ok) setChat((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="app-shell" data-theme={theme}>
      {isSidebarOpen && <div className="overlay" onClick={() => setIsSidebarOpen(false)} />}

      <Sidebar
        getServer={getServer}
        onSelectRoom={selectedRoom}
        onToggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        activeRoomName={room}
        server={server}
        onServerChange={(id) => {
          setActiveServerId(id);
          setChat([]);
          setRoom("");
          setRoomID("");
        }}
      />

      <main className="chat">
        <ChatHeader
          onOpenSidebar={() => setIsSidebarOpen(true)}
          userName={username}
          roomName={room || ""}
          onToggleTheme={toggleTheme}
          onLogout={logout}
        />

        {roomID && activeServerId ? (
          <>
            <ChatScreen
              username={username}
              messages={chat}
              isAdmin={isAdmin}
              onDeleteMessage={handleDeleteMessage}
            />
            <div className="chat-input border-t border-border">
              <div className="chat-input-wrapper">
                <button
                  className="emoji-button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Choose Emoji"
                >
                  😀
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker-container" ref={emojiPickerRef}>
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                      searchDisabled={false}
                      skinTonesDisabled
                      width={300}
                      height={400}
                    />
                  </div>
                )}
                <input
                  type="text"
                  placeholder={`Message ${room ? "#" + room : "..."}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                <button
                  className="send"
                  onClick={send}
                  disabled={!message.trim()}
                  title="Send message"
                  style={{ opacity: message.trim() ? 1 : 0.5, cursor: message.trim() ? "pointer" : "not-allowed" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-chat-state">
            <div className="cs-empty-icon" style={{ fontSize: 72, filter: "grayscale(1) opacity(0.3)" }}>💬</div>
            <div className="cs-empty-title" style={{ fontSize: 24 }}>Welcome to PingSpace!</div>
            <div className="cs-empty-sub" style={{ fontSize: 16 }}>
              Select a server and a channel from the left sidebar to start chatting.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}