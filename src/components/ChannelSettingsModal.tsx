import { useState, useEffect } from "react";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";

type Room = { name: string; id: string | number; description?: string };

type Props = {
  isOpen: boolean;
  room: Room;
  isAdmin: boolean;
  onClose: () => void;
  onRoomUpdated: () => void;
  onRoomDeleted: () => void;
};

export default function ChannelSettingsModal({
  isOpen,
  room,
  isAdmin,
  onClose,
  onRoomUpdated,
  onRoomDeleted,
}: Props) {
  const [channelName, setChannelName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getToken() || "";

  useEffect(() => {
    if (isOpen) {
      setChannelName(room.name);
      setDescription(room.description || "");
      setError(null);
    }
  }, [isOpen, room]);

  const handleUpdate = async () => {
    if (!channelName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { 
        name: channelName, 
        description: description 
      };
      const res = await fetch(`${baseUrl}/rooms/${room.id}`, options("PUT", token, payload));
      if (!res.ok) throw new Error("Failed to update channel");
      onRoomUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to completely delete this channel? All messages will be lost.")) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/rooms/${room.id}`, options("DELETE", token));
      if (!res.ok) throw new Error("Failed to delete channel");
      onRoomDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex", zIndex: 100 }}>
      <div className="modal" style={{ width: 450, padding: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Channel Settings</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className="label">Channel Name</label>
            <input 
              type="text" 
              className="input" 
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="label">Channel Topic</label>
            <input 
              type="text" 
              className="input" 
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          {isAdmin ? (
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: "1px solid var(--border)", marginTop: 10 }}>
              <button className="button" style={{ background: "red", color: "white" }} onClick={handleDelete} disabled={loading}>
                 Delete Channel
              </button>
              <button className="button" onClick={handleUpdate} disabled={loading || (channelName === room.name && description === (room.description || ""))}>
                 Save Changes
              </button>
            </div>
          ) : (
            <div style={{ paddingTop: 20, marginTop: 10, borderTop: "1px solid var(--border)" }}>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 0 }}>Only server admins can modify channels.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
