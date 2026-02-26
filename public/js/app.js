import { ApiClient } from "./api.js";

/*
  هنا الفكرة: نسوي OOP بكلاسات واضحة
  ونستخدم Custom Events عشان الكلاسات تتكلم مع بعض بدون ما تلخبط
*/

class EntryStore {
  constructor() {
    this.entries = [];
  }

  setEntries(entries) {
    this.entries = Array.isArray(entries) ? entries : [];
  }

  getAll() {
    return this.entries.slice();
  }

  upsert(entry) {
    const idx = this.entries.findIndex((e) => e._id === entry._id);
    if (idx >= 0) this.entries[idx] = entry;
    else this.entries.unshift(entry);
  }

  remove(id) {
    this.entries = this.entries.filter((e) => e._id !== id);
  }
}

class ToastView {
  constructor() {
    this.el = document.querySelector("#toast");
    this.body = document.querySelector("#toastBody");
    this.toast = new bootstrap.Toast(this.el, { delay: 2200 });
  }

  show(text) {
    this.body.textContent = text;
    this.toast.show();
  }
}

class HeaderView {
  constructor() {
    this.usernameEl = document.querySelector("#username");
    this.countEl = document.querySelector("#entryCount");
  }

  render({ username, count }) {
    this.usernameEl.textContent = username || "User";
    this.countEl.textContent = String(count ?? 0);
  }
}

class EntryFormView extends EventTarget {
  constructor() {
    super();
    this.form = document.querySelector("#entryForm");
    this.form.addEventListener("submit", (e) => this.onSubmit(e));
  }

  onSubmit(e) {
    e.preventDefault();

    const fd = new FormData(this.form);

    const payload = {
      mediaType: String(fd.get("mediaType") || "book"),
      title: String(fd.get("title") || "").trim(),
      rating: Number(fd.get("rating")),
      review: String(fd.get("review") || "").trim(),
      consumedAt: String(fd.get("consumedAt") || "") || null,
    };

    // إذا العنوان فاضي ما نكمل
    if (!payload.title) return;

    // نرسل الحدث للكنترولر
    this.dispatchEvent(new CustomEvent("entry:create", { detail: payload }));

    this.form.reset();
  }
}

class EntryGalleryView extends EventTarget {
  constructor() {
    super();

    this.list = document.querySelector("#entryList");
    this.empty = document.querySelector("#empty");
    this.search = document.querySelector("#search");
    this.filterType = document.querySelector("#filterType");

    this._last = [];

    // أي تغيير بالبحث أو الفلتر يعيد الرسم
    this.search.addEventListener("input", () => this.render(this._last));
    this.filterType.addEventListener("change", () => this.render(this._last));
  }

  render(entries) {
    this._last = Array.isArray(entries) ? entries : [];

    const q = this.search.value.trim().toLowerCase();
    const type = this.filterType.value;

    const filtered = this._last.filter((e) => {
      const okType = type === "all" ? true : e.mediaType === type;
      if (!okType) return false;

      if (!q) return true;

      const title = String(e.title || "").toLowerCase();
      const review = String(e.review || "").toLowerCase();
      return title.includes(q) || review.includes(q);
    });

    this.list.innerHTML = "";
    this.empty.classList.toggle("d-none", filtered.length !== 0);

    for (const e of filtered) {
      const card = document.createElement("div");
      card.className = "entry-card d-flex justify-content-between align-items-start gap-3";

      const labelType = e.mediaType === "movie" ? "Movie" : "Book";
      const dateText = this._formatDate(e.consumedAt);
      const ratingText = `${Number(e.rating)}/5`;

      card.innerHTML = `
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <h3 class="entry-title h6 m-0">${this._escape(e.title)}</h3>
            <span class="badge-soft">${labelType}</span>
            <span class="badge-soft">Rating: ${ratingText}</span>
          </div>

          <div class="entry-meta mt-1">
            <span>Consumed: ${dateText}</span>
            ${e.review ? ` • <span>${this._escape(e.review)}</span>` : ""}
          </div>
        </div>

        <div class="d-flex gap-1">
          <button class="action-btn btn btn-sm btn-outline-secondary" data-action="edit" type="button">Edit</button>
          <button class="action-btn btn btn-sm btn-outline-danger" data-action="delete" type="button">Delete</button>
        </div>
      `;

      // ربط أزرار كل كرت
      card.addEventListener("click", (ev) => {
        const btn = ev.target?.closest("button[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;

        if (action === "delete") {
          this.dispatchEvent(new CustomEvent("entry:delete", { detail: e._id }));
        } else if (action === "edit") {
          this.dispatchEvent(new CustomEvent("entry:edit", { detail: e }));
        }
      });

      this.list.appendChild(card);
    }
  }

  _formatDate(d) {
    if (!d) return "Not set";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "Not set";
    return dt.toLocaleDateString("en-US");
  }

  _escape(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

class AppController {
  constructor() {
    this.api = new ApiClient();
    this.store = new EntryStore();

    this.toast = new ToastView();
    this.header = new HeaderView();
    this.form = new EntryFormView();
    this.gallery = new EntryGalleryView();

    // هنا نربط الأحداث عشان يصير التواصل مرتب
    this.form.addEventListener("entry:create", (e) => this.createEntry(e.detail));
    this.gallery.addEventListener("entry:delete", (e) => this.deleteEntry(e.detail));
    this.gallery.addEventListener("entry:edit", (e) => this.editEntryPrompt(e.detail));
  }

  async init() {
    const me = await this.api.me();

    const entries = await this.api.getEntries();
    this.store.setEntries(entries);

    this.header.render({ username: me.username, count: this.store.getAll().length });
    this.gallery.render(this.store.getAll());
  }

  _refreshHeader(username) {
    // وظيفة بسيطة عشان لا نكرر نفس السطر
    this.header.render({ username, count: this.store.getAll().length });
  }

  async createEntry(payload) {
    try {
      const created = await this.api.createEntry(payload);
      this.store.upsert(created);

      const me = await this.api.me();
      this._refreshHeader(me.username);

      this.gallery.render(this.store.getAll());
      this.toast.show("Entry added.");
    } catch (err) {
      this.toast.show(err.message);
    }
  }

  async deleteEntry(id) {
    try {
      await this.api.deleteEntry(id);
      this.store.remove(id);

      const me = await this.api.me();
      this._refreshHeader(me.username);

      this.gallery.render(this.store.getAll());
      this.toast.show("Entry deleted.");
    } catch (err) {
      this.toast.show(err.message);
    }
  }

  async editEntryPrompt(entry) {
    // تعديل سريع بـ prompt عشان يسهل على الطالب وما ندخل بمودالات
    const newTitle = prompt("Title:", entry.title);
    if (newTitle === null) return;

    const newType = prompt("Type (book/movie):", entry.mediaType);
    if (newType === null) return;

    const newRating = prompt("Rating (1-5):", String(entry.rating));
    if (newRating === null) return;

    const newReview = prompt("Private review:", entry.review || "");
    if (newReview === null) return;

    let mt = String(newType).trim().toLowerCase();
    if (mt !== "book" && mt !== "movie") {
      this.toast.show("Type must be book or movie.");
      return;
    }

    const r = Number(newRating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      this.toast.show("Rating must be between 1 and 5.");
      return;
    }

    try {
      const updated = await this.api.updateEntry(entry._id, {
        title: String(newTitle).trim(),
        mediaType: mt,
        rating: r,
        review: String(newReview).trim(),
      });

      this.store.upsert(updated);

      const me = await this.api.me();
      this._refreshHeader(me.username);

      this.gallery.render(this.store.getAll());
      this.toast.show("Entry updated.");
    } catch (err) {
      this.toast.show(err.message);
    }
  }
}

const app = new AppController();
app.init().catch(() => {
  // إذا مو مسجل دخول أو فيه مشكلة، نرجعه للّوقن
  window.location.href = "/login";
});
