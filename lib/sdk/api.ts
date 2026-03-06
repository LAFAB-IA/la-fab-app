import type {
  User,
  LoginResponse,
  Project,
  Invoice,
  Notification,
  Message,
} from "./types";

// ============================================================
// Error class
// ============================================================

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(`API Error ${status}: ${code}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ============================================================
// LA FAB API Client
// ============================================================

export class LaFabApi {
  private baseUrl: string;
  private _token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  get token(): string | null {
    return this._token;
  }

  set token(value: string | null) {
    this._token = value;
  }

  // ----------------------------------------------------------
  // Private HTTP helpers
  // ----------------------------------------------------------

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this._token) h["Authorization"] = `Bearer ${this._token}`;
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok || json.ok === false) {
      throw new ApiError(res.status, json.error || "UNKNOWN_ERROR");
    }

    return json as T;
  }

  private get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  private del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // ----------------------------------------------------------
  // Auth
  // ----------------------------------------------------------

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await this.post<LoginResponse>("/api/auth/login", { email, password });
    this._token = res.session.access_token;
    return res;
  }

  async signup(email: string, password: string, firstName?: string, lastName?: string): Promise<LoginResponse> {
    const res = await this.post<LoginResponse>("/api/auth/signup", {
      email,
      password,
      firstName,
      lastName,
    });
    this._token = res.session.access_token;
    return res;
  }

  async logout(): Promise<void> {
    await this.post("/api/auth/logout");
    this._token = null;
  }

  async getMe(): Promise<User> {
    const res = await this.get<{ ok: boolean; user: User }>("/api/auth/me");
    return res.user;
  }

  // ----------------------------------------------------------
  // Projects
  // ----------------------------------------------------------

  async getProjects(): Promise<Project[]> {
    const res = await this.get<{ ok: boolean; projects: Project[] }>("/api/project");
    return res.projects;
  }

  async getProject(projectId: string): Promise<Project> {
    const res = await this.get<{ ok: boolean; project: Project }>(`/api/project/${projectId}`);
    return res.project;
  }

  async createProject(product_id: string, qty: number, spec?: string): Promise<Project> {
    const res = await this.post<{ ok: boolean; project: Project }>("/api/project/create", {
      product_id,
      qty,
      spec,
    });
    return res.project;
  }

  async updateProjectStatus(projectId: string, status: string): Promise<Project> {
    const res = await this.patch<{ ok: boolean; project: Project }>(`/api/project/${projectId}/status`, { status });
    return res.project;
  }

  async uploadBrief(projectId: string, file: File): Promise<{ brief_analysis: Record<string, any> }> {
    const url = `${this.baseUrl}/api/project/${projectId}/upload-brief`;
    const form = new FormData();
    form.append("file", file);

    const headers: Record<string, string> = {};
    if (this._token) headers["Authorization"] = `Bearer ${this._token}`;

    const res = await fetch(url, { method: "POST", headers, body: form });
    const json = await res.json();

    if (!res.ok || json.ok === false) {
      throw new ApiError(res.status, json.error || "UNKNOWN_ERROR");
    }

    return json;
  }

  async getProjectMessages(projectId: string): Promise<Message[]> {
    const res = await this.get<{ ok: boolean; messages: Message[] }>(`/api/project/${projectId}/messages`);
    return res.messages;
  }

  async sendProjectMessage(projectId: string, content: string): Promise<Message> {
    const res = await this.post<{ ok: boolean; message: Message }>(`/api/project/${projectId}/messages`, { content });
    return res.message;
  }

  // ----------------------------------------------------------
  // Invoices
  // ----------------------------------------------------------

  async getInvoices(): Promise<Invoice[]> {
    const res = await this.get<{ ok: boolean; invoices: Invoice[] }>("/api/invoice/list");
    return res.invoices;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const res = await this.get<{ ok: boolean; invoice: Invoice }>(`/api/invoice/${id}`);
    return res.invoice;
  }

  async refreshPdfUrl(id: string): Promise<{ pdf_url: string }> {
    const res = await this.get<{ ok: boolean; pdf_url: string }>(`/api/invoice/${id}/pdf-url`);
    return { pdf_url: res.pdf_url };
  }

  async createCheckout(invoiceId: string, step?: "deposit" | "balance"): Promise<{ checkout_url: string }> {
    const params = step ? { step } : undefined;
    let url = `/api/stripe/create-checkout/${invoiceId}`;
    if (params) url += `?step=${step}`;
    const res = await this.post<{ ok: boolean; checkout_url: string }>(url);
    return { checkout_url: res.checkout_url };
  }

  async verifyPayment(sessionId: string): Promise<{ invoice: Invoice }> {
    const res = await this.get<{ ok: boolean; invoice: Invoice }>(`/api/stripe/verify/${sessionId}`);
    return { invoice: res.invoice };
  }

  // ----------------------------------------------------------
  // Notifications
  // ----------------------------------------------------------

  async getNotifications(): Promise<Notification[]> {
    const res = await this.get<{ ok: boolean; notifications: Notification[] }>("/api/notifications");
    return res.notifications;
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const res = await this.get<{ ok: boolean; count: number }>("/api/notifications/unread-count");
    return { count: res.count };
  }

  async markAsRead(id: string): Promise<void> {
    await this.patch(`/api/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await this.patch("/api/notifications/read-all");
  }

  // ----------------------------------------------------------
  // AI Search
  // ----------------------------------------------------------

  async searchProducts(query: string): Promise<any[]> {
    const res = await this.post<{ ok: boolean; results: any[] }>("/api/ai/search", { query });
    return res.results;
  }
}
