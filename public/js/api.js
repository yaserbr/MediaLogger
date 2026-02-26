export class ApiClient {
  constructor(baseUrl = "") {
    // نخلي baseUrl فاضي لأننا شغالين على نفس السيرفر
    this.baseUrl = baseUrl;
  }

  async _json(path, { method = "GET", body } = {}) {
    // credentials include مهمة عشان السيشن ينرسل
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    // نحاول نقرا JSON، ولو ما ضبط نرجع كائن فاضي
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error || `Request failed: ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  register(payload) { return this._json("/api/auth/register", { method: "POST", body: payload }); }
  login(payload) { return this._json("/api/auth/login", { method: "POST", body: payload }); }
  logout() { return this._json("/api/auth/logout", { method: "POST" }); }

  me() { return this._json("/api/me"); }

  getEntries() { return this._json("/api/entries"); }
  createEntry(payload) { return this._json("/api/entries", { method: "POST", body: payload }); }
  updateEntry(id, payload) { return this._json(`/api/entries/${id}`, { method: "PUT", body: payload }); }
  deleteEntry(id) { return this._json(`/api/entries/${id}`, { method: "DELETE" }); }
}
