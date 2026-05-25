/**
 * Thin client for a LibreChat backend.
 *
 * Auth model: LibreChat issues an httpOnly refresh cookie + a short-lived
 * access JWT returned in the login response body. We mirror the cookie in
 * Helix and proxy through /api/librechat/* so the browser never speaks to
 * LibreChat directly (avoids CORS + lets us inject the access token).
 */

export interface LibreChatLoginResponse {
  user: LibreChatUser;
  token: string;
}

export interface LibreChatUser {
  id: string;
  name?: string;
  username?: string;
  email: string;
  avatar?: string;
  role?: string;
  provider?: string;
}

export interface LibreChatConvo {
  conversationId: string;
  title: string;
  endpoint?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibreChatMessage {
  messageId: string;
  conversationId: string;
  parentMessageId?: string | null;
  sender: string; // 'User' | 'GPT' | model name
  text: string;
  isCreatedByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LibreChatEndpoint {
  type: string;
  enabled: boolean;
  models?: { default?: string[]; supported?: string[] };
}

export class LibreChatError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "LibreChatError";
  }
}

interface ClientOpts {
  baseUrl: string;
  token?: string;
  signal?: AbortSignal;
}

async function request<T>(path: string, init: RequestInit, opts: ClientOpts): Promise<T> {
  const url = `${opts.baseUrl.replace(/\/+$/, "")}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  const res = await fetch(url, {
    ...init,
    headers,
    signal: opts.signal,
    credentials: "include",
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw new LibreChatError(
      res.status,
      `LibreChat ${init.method ?? "GET"} ${path} → HTTP ${res.status}`,
      detail,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const LibreChat = {
  async login(
    baseUrl: string,
    email: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<LibreChatLoginResponse> {
    return request<LibreChatLoginResponse>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      { baseUrl, signal },
    );
  },

  async refresh(baseUrl: string, signal?: AbortSignal): Promise<{ token: string }> {
    return request<{ token: string }>(
      "/api/auth/refresh",
      { method: "POST" },
      { baseUrl, signal },
    );
  },

  async logout(baseUrl: string, token: string, signal?: AbortSignal): Promise<void> {
    await request<void>(
      "/api/auth/logout",
      { method: "POST" },
      { baseUrl, token, signal },
    );
  },

  async me(baseUrl: string, token: string, signal?: AbortSignal): Promise<LibreChatUser> {
    return request<LibreChatUser>("/api/user", { method: "GET" }, { baseUrl, token, signal });
  },

  async listConversations(
    baseUrl: string,
    token: string,
    limit = 25,
    signal?: AbortSignal,
  ): Promise<{ conversations: LibreChatConvo[]; nextCursor?: string }> {
    const data = await request<{
      conversations?: LibreChatConvo[];
      nextCursor?: string;
    }>(`/api/convos?limit=${limit}`, { method: "GET" }, { baseUrl, token, signal });
    return { conversations: data.conversations ?? [], nextCursor: data.nextCursor };
  },

  async getMessages(
    baseUrl: string,
    token: string,
    conversationId: string,
    signal?: AbortSignal,
  ): Promise<LibreChatMessage[]> {
    return request<LibreChatMessage[]>(
      `/api/messages/${encodeURIComponent(conversationId)}`,
      { method: "GET" },
      { baseUrl, token, signal },
    );
  },

  async listModels(
    baseUrl: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(
      "/api/models",
      { method: "GET" },
      { baseUrl, token, signal },
    );
  },

  async listEndpoints(
    baseUrl: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<Record<string, LibreChatEndpoint>> {
    return request<Record<string, LibreChatEndpoint>>(
      "/api/endpoints",
      { method: "GET" },
      { baseUrl, token, signal },
    );
  },

  /**
   * Send a chat message. Returns the upstream Response so the caller can
   * stream it — LibreChat returns chunked text (SSE-ish) for the agents
   * endpoint and the caller may want to forward bytes verbatim.
   */
  async chat(
    baseUrl: string,
    token: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = `${baseUrl.replace(/\/+$/, "")}/api/agents/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
      credentials: "include",
    });
    if (!res.ok) {
      let detail: unknown;
      try {
        detail = await res.json();
      } catch {
        detail = await res.text();
      }
      throw new LibreChatError(res.status, `LibreChat chat → HTTP ${res.status}`, detail);
    }
    return res;
  },
};
