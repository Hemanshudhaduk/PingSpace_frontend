import { useState, useEffect } from "react";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken, useAuthStore } from "../store/authStore";
import "./UserSettingsModal.css";

type Props = {
  isOpen: boolean;
  userId: string;
  currentUsername: string;
  onClose: () => void;
};

type Tab = "profile" | "security";

type UpdatePayload = {
  username?: string;
  password?: string;
};

export default function UserSettingsModal({
  isOpen,
  userId,
  currentUsername,
  onClose,
}: Props) {
  const [activeTab,    setActiveTab]    = useState<Tab>("profile");
  const [newUsername,  setNewUsername]  = useState(currentUsername);
  const [newPassword,  setNewPassword]  = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  const token  = getToken() ?? "";
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (isOpen) {
      setNewUsername(currentUsername);
      setNewPassword("");
      setError(null);
      setSuccess(null);
      setActiveTab("profile");
    }
  }, [isOpen, currentUsername]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleUpdate = async () => {
    const isUpdatingUsername = newUsername.trim() !== currentUsername;
    const isUpdatingPassword = newPassword.trim().length > 0;
    if (!isUpdatingUsername && !isUpdatingPassword) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: UpdatePayload = {};
    if (isUpdatingUsername) payload.username = newUsername.trim();
    if (isUpdatingPassword) payload.password = newPassword.trim();

    try {
      const res = await fetch(
        `${baseUrl}/users/${userId}`,
        options("PUT", token, payload)
      );

      if (!res.ok) {
        const data: { detail?: string } = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to update profile");
      }

      setSuccess("Profile updated successfully!");
      setNewPassword("");

      if (isUpdatingUsername || isUpdatingPassword) {
        setTimeout(() => {
          alert("Your credentials changed. Please log in again.");
          logout();
        }, 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you ABSOLUTELY sure? This permanently deletes all your data and servers."
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${baseUrl}/users/${userId}`,
        options("DELETE", token)
      );
      if (!res.ok) throw new Error("Failed to delete account");
      alert("Account deleted. Sorry to see you go!");
      logout();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const isSaveDisabled =
    loading ||
    (newUsername.trim() === currentUsername && newPassword.length === 0);

  if (!isOpen) return null;

  return (
    <div
      className="usm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="usm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usm-accent" />

        {/* ── Sidebar ── */}
        <aside className="usm-sidebar">
          <span className="usm-sidebar-label">User Settings</span>

          <button
            className={`usm-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <PersonIcon />
            My Account
          </button>

          <button
            className={`usm-tab ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <ShieldIcon />
            Security
          </button>

          <div className="usm-sidebar-divider" />

          <button className="usm-logout-btn" onClick={logout}>
            <LogoutIcon />
            Log Out
          </button>
        </aside>

        {/* ── Content ── */}
        <div className="usm-content">
          <div className="usm-content-header">
            <span className="usm-content-title">
              {activeTab === "profile" ? "My Account" : "Security"}
            </span>
            <button className="usm-close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="usm-body">
            {error   && <div className="usm-alert error">{error}</div>}
            {success && <div className="usm-alert success">{success}</div>}

            {/* Profile tab */}
            {activeTab === "profile" && (
              <>
                <div className="usm-avatar-card">
                  <div className="usm-avatar-wrap">
                    <div className="usm-avatar">
                      {currentUsername.charAt(0).toUpperCase()}
                    </div>
                    <span className="usm-status-dot" />
                  </div>
                  <div>
                    <div className="usm-avatar-name">{currentUsername}</div>
                    <div className="usm-avatar-sub">PingSpace member</div>
                  </div>
                </div>

                <div className="usm-field">
                  <label className="usm-label">Username</label>
                  <input
                    className="usm-input"
                    type="text"
                    value={newUsername}
                    maxLength={32}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>

                <div className="usm-field">
                  <label className="usm-label">
                    New Password
                    <span className="usm-label-hint">(optional)</span>
                  </label>
                  <input
                    className="usm-input"
                    type="password"
                    placeholder="Enter a new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Security tab */}
            {activeTab === "security" && (
              <div className="usm-danger-card">
                <div className="usm-danger-title">Delete Account</div>
                <p className="usm-danger-text">
                  Permanently removes all your messages and any servers you own.
                  This action cannot be undone and your data cannot be recovered.
                </p>
                <button
                  className="usm-btn danger"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  <TrashIcon />
                  Delete my account
                </button>
              </div>
            )}
          </div>

          {/* Footer — only on profile tab */}
          {activeTab === "profile" && (
            <div className="usm-footer">
              <button className="usm-btn ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                className="usm-btn primary"
                onClick={handleUpdate}
                disabled={isSaveDisabled}
              >
                {loading ? <><Spinner /> Saving...</> : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */
const PersonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L3 4v4c0 3 2.5 5.5 5 6 2.5-.5 5-3 5-6V4L8 2z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M10 2H13a1 1 0 011 1v10a1 1 0 01-1 1H10M7 11l3-3-3-3M10 8H2"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Spinner = () => <span className="usm-spinner" />;