import { useEffect, useRef, useState } from "react";

type ChatMessage = { id?: string; sender: string; content: string; created_at?: string };

type ChatScreenProps = {
  username: string | undefined;
  messages: ChatMessage[];
  isAdmin?: boolean;
  onDeleteMessage?: (id: string) => void;
};

function formatTime(ts?: string) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatScreen({ username, messages, isAdmin, onDeleteMessage }: ChatScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeMenuId]);

  if (messages.length === 0) {
    return (
      <section className="cs-body" ref={containerRef}>
        <div className="cs-empty">
          <div className="cs-empty-icon" style={{ filter: "grayscale(1) opacity(0.3)" }}>💬</div>
          <div className="cs-empty-title">No messages yet</div>
          <div className="cs-empty-sub">Be the first to say something!</div>
        </div>
      </section>
    );
  }

  // Group consecutive messages from the same sender
  const grouped: Array<{ sender: string; items: ChatMessage[] }> = [];
  for (const m of messages) {
    const last = grouped[grouped.length - 1];
    if (last && last.sender === m.sender) {
      last.items.push(m);
    } else {
      grouped.push({ sender: m.sender, items: [m] });
    }
  }

  const getSenderColor = (name: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "#E57373", "#F06292", "#BA68C8", "#9575CD", "#7986CB",
      "#64B5F6", "#4FC3F7", "#4DD0E1", "#4DB6AC", "#81C784",
      "#AED581", "#FF8A65", "#A1887F", "#90A4AE"
    ];
    return colors[hash % colors.length];
  };

  return (
    <section className="cs-body" ref={containerRef}>
      {grouped.map((group, gi) => {
        const isOwn = username === group.sender;
        return (
          <div key={gi} className={`cs-group ${isOwn ? "cs-own" : "cs-other"}`}>
            <div className="cs-bubbles">
              {group.items.map((m, mi) => (
                <div key={mi} className="cs-bubble-wrap">
                  <div className="cs-bubble" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    {/* Render sender name for the first message of someone else */}
                    {mi === 0 && !isOwn && (
                      <div className="cs-sender-name" style={{ color: getSenderColor(group.sender), fontSize: '13px', fontWeight: 600, lineHeight: 1.2 }}>
                        {group.sender}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <span className="cs-text">{m.content}</span>
                      <span className="cs-time-container">
                        {m.created_at && (
                          <span className="cs-time" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '-2px' }}>{formatTime(m.created_at)}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Chevron Trigger */}
                  {m.id && (isOwn || isAdmin) && (
                    <div className="cs-menu-container">
                      <button
                        className={`cs-msg-menu-btn ${activeMenuId === m.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === m.id ? null : m.id!);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path></svg>
                      </button>

                      {activeMenuId === m.id && (
                        <div className="cs-msg-dropdown">
                          <button
                            className="cs-msg-dropdown-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteMessage?.(m.id!);
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