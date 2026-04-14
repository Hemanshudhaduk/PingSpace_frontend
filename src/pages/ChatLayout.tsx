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

type Attachment = {
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
};
type ChatMessage = {
  id?: string;
  sender: string;
  content?: string;
  created_at?: string;
  timestamp?: string;
  type?: "text" | "image" | "file" | "voice" | "video";
  attachment?: Attachment;
};

const getTimestamp = (msg: ChatMessage) => msg.timestamp || msg.created_at || "";

const sortChatMessages = (messages: ChatMessage[]) =>
  [...messages].sort((a, b) => {
    const ta = Date.parse(getTimestamp(a));
    const tb = Date.parse(getTimestamp(b));
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return ta - tb;
  });

const normalizeChatMessage = (msg: Partial<ChatMessage>): ChatMessage => ({
  ...msg,
  sender: msg.sender ?? "System",
  timestamp: msg.timestamp ?? msg.created_at ?? new Date().toISOString(),
});

export default function ChatLayout() {
  const logout = useAuthStore((s) => s.logout);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messageCache = useRef<Record<string, ChatMessage[]>>({});
  const [message, setMessage] = useState("");
  const [roomID, setRoomID] = useState<string | number>();
  const [server, setServer] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState("");

  const token = localStorage.getItem("token");

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!roomID || !activeServerId || !token) return;

    const roomIdStr = String(roomID);
    if (!messageCache.current[roomIdStr]) {
      setIsLoadingMessages(true);
    } else {
      setIsLoadingMessages(false);
    }

    const controller = new AbortController();

    fetch(`${baseUrl}/messages/${roomID}`, {
      ...options("GET", token),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) {
          if (!messageCache.current[roomIdStr]) setChat([]);
          setIsLoadingMessages(false);
          return;
        }
        const normalized = data.map((msg) => normalizeChatMessage(msg));
        const sorted = sortChatMessages(normalized);
        setChat(sorted);
        messageCache.current[roomIdStr] = sorted;
        setIsLoadingMessages(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // ✅ ignore cancelled requests
        console.error("History fetch error:", err);
        setIsLoadingMessages(false);
      });

    return () => controller.abort(); // ✅ cancel if roomID changes before fetch completes
  }, [roomID, activeServerId, token]);

  useEffect(() => {
    if (!username || !room || !activeServerId || !token) return;

    ws.current?.close();
    const wsUrl = baseUrl.replace(/^http/, "ws");
    ws.current = new WebSocket(`${wsUrl}/ws/${roomID}?token=${token}`);

    ws.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "rate_limit") return;

        const nextMessage = normalizeChatMessage({
          id: payload.id,
          sender: payload.sender,
          content: payload.content,
          timestamp: payload.timestamp ?? new Date().toISOString(),
          type: payload.type ?? "text",
          attachment: payload.attachment ?? null,
        });

        setChat((prev) => {
          const next = sortChatMessages([...prev, nextMessage]);
          if (roomID) messageCache.current[String(roomID)] = next;
          return next;
        });
      } catch {
        setChat((prev) => {
          const next = sortChatMessages([
            ...prev,
            normalizeChatMessage({ sender: "System", content: String(event.data) }),
          ]);
          if (roomID) messageCache.current[String(roomID)] = next;
          return next;
        });
      }
    };
    ws.current.onerror = (error) => console.error("WebSocket error:", error);

    return () => ws.current?.close();
  }, [room, username, roomID, activeServerId, token]);

  const selectedRoom = (roomName: string, id: string | number) => {
    const roomIdStr = String(id);
    if (messageCache.current[roomIdStr]) {
      setChat(messageCache.current[roomIdStr]);
    } else {
      setChat([]);
    }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
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
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      const res = await fetch(
        `${baseUrl}/messages/${msgId}`,
        options("DELETE", token),
      );
      if (res.ok) {
        setChat((prev) => {
          const next = prev.filter((m) => m.id !== msgId);
          if (roomID) messageCache.current[String(roomID)] = next;
          return next;
        });
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const uploadFile = async (file: File) => {
    if (!roomID || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("room_id", String(roomID));

      const res = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        // ✅ NO Content-Type header — browser sets multipart boundary automatically
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Upload failed");
      }
      // ✅ no need to setChat — WebSocket broadcast handles it
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await uploadFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="app-shell" data-theme={theme}>
      {isSidebarOpen && (
        <div className="overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

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
              isLoading={isLoadingMessages}
            />
            <div className="chat-input border-t border-border">
              <div className="chat-input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                    e.target.value = ""; // reset so same file can be picked again
                  }}
                />
                <button
                  className="emoji-button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  disabled={uploading}
                >
                  {uploading ? "⏳" : "📎"}
                </button>

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
                      width={Math.min(320, window.innerWidth - 40)}
                      height={Math.min(400, window.innerHeight - 200)}
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
                  className={`emoji-button ${isRecording ? "recording" : ""}`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  title="Hold to record voice"
                  style={{ color: isRecording ? "#ef4444" : undefined }}
                >
                  🎤
                </button>
                <button
                  className="send"
                  onClick={send}
                  disabled={!message.trim()}
                  title="Send message"
                  style={{
                    opacity: message.trim() ? 1 : 0.5,
                    cursor: message.trim() ? "pointer" : "not-allowed",
                  }}
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-chat-state">
            <div
              className="cs-empty-icon"
              style={{ fontSize: 72, filter: "grayscale(1) opacity(0.3)" }}
            >
              💬
            </div>
            <div className="cs-empty-title" style={{ fontSize: 24 }}>
              Welcome to PingSpace!
            </div>
            <div className="cs-empty-sub" style={{ fontSize: 16 }}>
              Select a server and a channel from the left sidebar to start
              chatting.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
