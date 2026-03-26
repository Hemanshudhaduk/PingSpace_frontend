import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id?: string;
  sender: string;
  content: string;
  timestamp?: string;
};

type ChatScreenProps = {
  username: string | undefined;
  messages: ChatMessage[];
  isAdmin?: boolean;
  onDeleteMessage?: (id: string) => void;
};

function formatTime(ts?: string) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ""; // ✅ guard against invalid date strings
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

// Returns "Today", "Yesterday", or "March 24, 2026" etc.
function getDateLabel(ts?: string): string {
  if (!ts) return "";
  const msgDate = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(msgDate, today)) return "Today";
  if (isSameDay(msgDate, yesterday)) return "Yesterday";
  return msgDate.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateKey(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const getSenderColor = (name: string) => {
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "#E57373",
    "#F06292",
    "#BA68C8",
    "#9575CD",
    "#7986CB",
    "#64B5F6",
    "#4FC3F7",
    "#4DD0E1",
    "#4DB6AC",
    "#81C784",
    "#AED581",
    "#FF8A65",
    "#A1887F",
    "#90A4AE",
  ];
  return colors[hash % colors.length];
};

export default function ChatScreen({
  username,
  messages,
  isAdmin,
  onDeleteMessage,
}: ChatScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeMenuId]);

  if (messages.length === 0) {
    return (
      <section className="cs-body" ref={containerRef}>
        <div className="cs-empty">
          <div
            className="cs-empty-icon"
            style={{ filter: "grayscale(1) opacity(0.3)" }}
          >
            💬
          </div>
          <div className="cs-empty-title">No messages yet</div>
          <div className="cs-empty-sub">Be the first to say something!</div>
        </div>
      </section>
    );
  }

  // Build render list: inject date separator when date changes
  type RenderItem =
    | { type: "separator"; label: string; key: string }
    | { type: "group"; sender: string; items: ChatMessage[] };

  const renderList: RenderItem[] = [];
  let lastDateKey = "";
  let currentGroup: ChatMessage[] | null = null;
  let currentSender = "";

  for (const m of messages) {
    const dateKey = getDateKey(m.timestamp);

    // Insert date separator when date changes
    if (dateKey && dateKey !== lastDateKey) {
      // Push previous group if exists
      if (currentGroup && currentGroup.length > 0) {
        renderList.push({
          type: "group",
          sender: currentSender,
          items: currentGroup,
        });
        currentGroup = null;
      }
      renderList.push({
        type: "separator",
        label: getDateLabel(m.timestamp),
        key: dateKey,
      });
      lastDateKey = dateKey;
    }

    // Group consecutive messages from same sender
    if (currentGroup && currentSender === m.sender) {
      currentGroup.push(m);
    } else {
      if (currentGroup && currentGroup.length > 0) {
        renderList.push({
          type: "group",
          sender: currentSender,
          items: currentGroup,
        });
      }
      currentSender = m.sender;
      currentGroup = [m];
    }
  }
  // Push final group
  if (currentGroup && currentGroup.length > 0) {
    renderList.push({
      type: "group",
      sender: currentSender,
      items: currentGroup,
    });
  }

  return (
    <section className="cs-body" ref={containerRef}>
      {renderList.map((item, idx) => {
        if (item.type === "separator") {
          return (
            <div key={item.key} className="cs-date-separator">
              <span className="cs-date-label">{item.label}</span>
            </div>
          );
        }

        const isOwn = username === item.sender;
        return (
          <div
            key={idx}
            className={`cs-group ${isOwn ? "cs-own" : "cs-other"}`}
          >
            <div className="cs-bubbles">
              {item.items.map((m, mi) => (
                <div key={mi} className="cs-bubble-wrap">
                  <div
                    className="cs-bubble"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "2px",
                    }}
                  >
                    {mi === 0 && !isOwn && (
                      <div
                        className="cs-sender-name"
                        style={{
                          color: getSenderColor(item.sender),
                          fontSize: "13px",
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.sender}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "6px",
                      }}
                    >
                      <span className="cs-text">{m.content}</span>
                      {/* ✅ Always show time — timestamp now always present */}
                      <span
                        className="cs-time"
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                          marginBottom: "-2px",
                        }}
                      >
                        {formatTime(m.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* ✅ Delete button shows for own messages OR admin — id now always present */}
                  {(isOwn || isAdmin) && (
                    <div className="cs-menu-container">
                      <button
                        className={`cs-msg-menu-btn ${activeMenuId === (m.id ?? mi.toString()) ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const key = m.id ?? mi.toString();
                          setActiveMenuId(activeMenuId === key ? null : key);
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="currentColor"
                        >
                          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                        </svg>
                      </button>
                      {activeMenuId === (m.id ?? mi.toString()) && (
                        <div className="cs-msg-dropdown">
                          <button
                            className="cs-msg-dropdown-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (m.id) onDeleteMessage?.(m.id);
                              setActiveMenuId(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
