import "./AppLoader.css";

export default function AppLoader() {
  return (
    <div className="loader-root">
      <div className="grid-bg" />

      <div className="loader-center">
        {/* Spinning ring + logo */}
        <div className="logo-ring">
          <svg viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="33"
              stroke="#6366f1" strokeWidth="1.5"
              strokeDasharray="6 4" />
            <circle cx="36" cy="3" r="3.5" fill="#6366f1" />
          </svg>
          <div className="logo-inner">
            <svg className="logo-icon" viewBox="0 0 28 28" fill="none">
              <path d="M4 8C4 6.34 5.34 5 7 5H21C22.66 5 24 6.34 24 8V17C24 18.66 22.66 20 21 20H15L10 24V20H7C5.34 20 4 18.66 4 17V8Z"
                fill="white" fillOpacity="0.95"/>
              <circle cx="10" cy="13" r="1.5" fill="#6366f1"/>
              <circle cx="14" cy="13" r="1.5" fill="#6366f1"/>
              <circle cx="18" cy="13" r="1.5" fill="#6366f1"/>
            </svg>
          </div>
        </div>

        {/* Animated chat bubbles */}
        <div className="chat-bubbles">
          <div className="bubble left"  style={{ width: "70%" }} />
          <div className="bubble right" style={{ width: "50%" }} />
          <div className="bubble left2" />
          <div className="bubble right2" />
        </div>

        {/* App name + status */}
        <div className="text-group">
          <span className="app-name">PingSpace</span>
          <span className="status-text">
            connecting
            <span className="dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}