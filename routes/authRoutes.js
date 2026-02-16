const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // تحقق بسيط للمدخلات
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // نتأكد ما فيه حساب بنفس الإيميل
    const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    // نسوي hash لكلمة المرور
    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = await User.create({
      username: String(username).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
    });

    // نفتح سيشن للمستخدم بعد التسجيل
    req.session.userId = user._id.toString();
    req.session.username = user.username;

    return res.status(201).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    // نثبت السيشن
    req.session.userId = user._id.toString();
    req.session.username = user.username;

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
