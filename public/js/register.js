import { ApiClient } from "./api.js";

class RegisterPage {
  constructor() {
    this.api = new ApiClient();
    this.form = document.querySelector("#registerForm");
    this.msg = document.querySelector("#msg");

    this.form.addEventListener("submit", (e) => this.onSubmit(e));
  }

  showError(text) {
    this.msg.textContent = text;
    this.msg.classList.remove("d-none");
  }

  async onSubmit(e) {
    e.preventDefault();
    this.msg.classList.add("d-none");

    const fd = new FormData(this.form);
    const username = String(fd.get("username") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    try {
      await this.api.register({ username, email, password });
      window.location.href = "/app";
    } catch (err) {
      this.showError(err.message);
    }
  }
}

new RegisterPage();
