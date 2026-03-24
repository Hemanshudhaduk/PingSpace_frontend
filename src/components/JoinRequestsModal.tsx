import { useEffect, useState } from "react";
import { baseUrl } from "../helper/constant";
import { options } from "../helper/fetchOptions";
import { getToken } from "../store/authStore";

type JoinRequest = {
  id: string;
  user_id: string;
  server_id: string;
  status: string;
};

type JoinRequestWithUser = JoinRequest & { username: string };

type Props = {
  serverId: string;
  onClose: () => void;
};

export default function JoinRequestsModal({ serverId, onClose }: Props) {
  const [requests, setRequests] = useState<JoinRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken() || "";

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${baseUrl}/join_requests/${serverId}`, options("GET", token));
        if (!res.ok) throw new Error("Failed to fetch requests");
        const data: JoinRequest[] = await res.json();

        // Fetch usernames for each request
        const requestsWithUsers = await Promise.all(
          data.map(async (req) => {
            let username = "Unknown User";
            try {
              const userRes = await fetch(`${baseUrl}/users/${req.user_id}`, options("GET", token));
              if (userRes.ok) {
                const userData = await userRes.json();
                username = userData.username;
              }
            } catch (e) { 
              console.log(e)
            }
            return { ...req, username };
          })
        );

        setRequests(requestsWithUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (serverId) fetchRequests();
  }, [serverId, token]);

  const handleAction = async (requestId: string, status: "accepted" | "declined") => {
    try {
      const res = await fetch(`${baseUrl}/join_requests/${requestId}`, options("PUT", token, { status }));
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (requests.length === 1) { // If it was the last one
          onClose();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null; // Only show if there are actual requests

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          zIndex: 1000, background: "rgba(15, 15, 23, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)",
          maxWidth: 500, padding: 24, borderRadius: 16, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" 
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Join Requests</h2>
          <button
            onClick={onClose}
            className="invite-button"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 14, marginBottom: 20 }}>
          The following users have requested to join this server.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto" }}>
          {requests.map((req) => (
            <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255, 255, 255, 0.05)", padding: "12px 16px", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #3ECFCF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold", color: "#fff" }}>
                  {req.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>{req.username}</div>
                  <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.4)" }}>Wants to join the server</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleAction(req.id, "declined")}
                  style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)")}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAction(req.id, "accepted")}
                  style={{ background: "linear-gradient(135deg, #6C63FF, #3ECFCF)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(108, 99, 255, 0.3)" }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
