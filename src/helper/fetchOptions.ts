import { isTokenExpired } from "../store/authStore";

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export const options = (
  method: HTTPMethod,
  token: string | null = null,
  data: any | null = null,
  includeCredentials: boolean = false
): RequestInit => {
  if (token && isTokenExpired(token)) {
    localStorage.removeItem("token");
    window.location.href = "/";
    throw new Error("Session expired. Please login again.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const opt: RequestInit = {
    method: method,
    headers,
  };

  if (includeCredentials) {
    opt.credentials = "include";
  }

  if (data && method !== "GET") {
    opt.body = JSON.stringify(data);
  }

  return opt;
};
