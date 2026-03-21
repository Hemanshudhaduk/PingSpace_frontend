type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export const options = (
  method: HTTPMethod,
  token: string | null = null,
  data: any | null = null,
  includeCredentials: boolean = false
): RequestInit => {
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
