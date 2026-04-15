import React from "react";
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

  const userList =
    otherUsers.length === 1
      ? otherUsers[0]
      : otherUsers.length === 2
        ? `${otherUsers[0]} and ${otherUsers[1]}`
        : `${otherUsers.slice(0, -1).join(", ")}, and ${otherUsers[otherUsers.length - 1]}`;

  return (
    <div className="typing-indicator">
      <span className="typing-text">{userList} is typing</span>
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
