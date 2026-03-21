import { useState, useEffect } from "react";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";
import { useAuthStore } from "../store/authStore";

type Props = {
  isOpen: boolean;
  userId: string;
  currentUsername: string;
  onClose: () => void;
};

export default function UserSettingsModal({
  isOpen,
  userId,
  currentUsername,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = getToken() || "";
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

  const handleUpdate = async () => {
    const isUpdatingUsername = newUsername.trim() !== currentUsername;
    const isUpdatingPassword = newPassword.trim().length > 0;

    if (!isUpdatingUsername && !isUpdatingPassword) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: { username?: string; password?: string } = {};
    if (isUpdatingUsername) payload.username = newUsername.trim();
    if (isUpdatingPassword) payload.password = newPassword.trim();

    try {
      const res = await fetch(`${baseUrl}/users/${userId}`, options("PUT", token, payload));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update profile");
      }
      
      setSuccess("Profile updated successfully!");
      setNewPassword(""); // Clear password field for security
      
      // If they changed username/password, their token might technically be stale (especially if backend encodes username). 
      // A full app like Discord might issue a new token or force re-login. We'll show a message.
      if (isUpdatingUsername || isUpdatingPassword) {
        setTimeout(() => {
          alert("Your credentials have changed. Please log in again.");
          logout();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you ABSOLUTELY sure you want to delete your account? This will permanently delete all your data and servers you own.")) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/users/${userId}`, options("DELETE", token));
      if (!res.ok) throw new Error("Failed to delete account");
      alert("Account deleted. We are sorry to see you go!");
      logout();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex", zIndex: 100 }}>
      <div className="modal" style={{ width: 600, height: 450, display: "flex", padding: 0, overflow: "hidden" }}>
        
        {/* Settings Sidebar */}
        <div style={{ width: 180, background: "var(--bg)", borderRight: "1px solid var(--border)", padding: "20px 10px" }}>
          <div style={{ padding: "0 10px", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>
            USER SETTINGS
          </div>
          <button 
             className={`channel-item ${activeTab === "profile" ? "active" : ""}`}
             style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", marginBottom: 2 }}
             onClick={() => setActiveTab("profile")}
          >
            My Account
          </button>
          <button 
             className={`channel-item ${activeTab === "security" ? "active" : ""}`}
             style={{ width: "100%", textAlign: "left", background: "transparent", border: "none" }}
             onClick={() => setActiveTab("security")}
          >
            Security & Data
          </button>
        </div>

        {/* Settings Content */}
        <div style={{ flex: 1, padding: 30, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>{activeTab === "profile" ? "My Account" : "Security Actions"}</h2>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div style={{ marginBottom: 16, padding: "10px", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", borderRadius: 6, border: "1px solid rgba(34, 197, 94, 0.2)" }}>{success}</div>}

          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 15, padding: "15px", background: "var(--bg)", borderRadius: 8 }}>
                 <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>{currentUsername.charAt(0).toUpperCase()}</div>
                 <div>
                   <h3 style={{ margin: 0, fontSize: 18 }}>{currentUsername}</h3>
                   <div style={{ fontSize: 13, color: "var(--muted)" }}>Click below to change identity.</div>
                 </div>
              </div>
              
              <div>
                <label className="label">Username</label>
                <input 
                  type="text" 
                  className="input" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="label">New Password (Optional)</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="Enter a new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                <button className="button" onClick={handleUpdate} disabled={loading || (newUsername === currentUsername && newPassword.length === 0)}>
                   Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
              <div style={{ padding: "20px", border: "1px solid rgba(255, 0, 0, 0.2)", background: "rgba(255, 0, 0, 0.05)", borderRadius: 8 }}>
                <h3 style={{ margin: "0 0 10px 0", color: "#ef4444", fontSize: 16 }}>Danger Zone</h3>
                <p style={{ fontSize: 14, color: "var(--text)", opacity: 0.9, marginBottom: 15 }}>
                  Deleting your account will permanently remove all your messages and any servers that you created. This action cannot be reversed.
                </p>
                <button className="button" style={{ background: "#ef4444", color: "white" }} onClick={handleDeleteAccount} disabled={loading}>
                   Delete Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
