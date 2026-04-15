import "./TypingIndicator.css";

interface TypingIndicatorProps {
  typingUsers: string[];
  currentUsername: string | undefined;
}

export default function TypingIndicator({
  typingUsers,
  currentUsername,
}: TypingIndicatorProps) {
  // Filter out current user
  const otherUsers = typingUsers.filter((u) => u !== currentUsername);

  if (otherUsers.length === 0) return null;

  const displayText = otherUsers.length === 1
    ? `${otherUsers[0]} is typing`
    : "Someone is typing";

  return (
    <div className="typing-indicator">
      <span className="typing-text">{displayText}</span>
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
