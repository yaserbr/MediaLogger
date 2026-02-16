const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const Entry = require("../models/Entry");

const router = express.Router();

// أي endpoint هنا يحتاج تسجيل دخول
router.use(requireAuth);

// GET /api/entries
router.get("/", async (req, res) => {
  // نجيب إدخالات المستخدم الحالي فقط
  const entries = await Entry.find({ userId: req.session.userId }).sort({ createdAt: -1 });
  res.json(entries);
});

// POST /api/entries
router.post("/", async (req, res) => {
  try {
    const { mediaType, title, rating, review, consumedAt } = req.body;

    // تأكد أن المستخدم مسجل دخول
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // تحقق بسيط
    if (!mediaType || !title || rating === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (!["book", "movie"].includes(String(mediaType))) {
      return res.status(400).json({ error: "mediaType must be book or movie" });
    }

    const entry = await Entry.create({
      userId: req.session.userId, // من السيشن ✅
      mediaType: String(mediaType),
      title: String(title).trim(),
      rating: r,
      review: review ? String(review).trim() : "",
      consumedAt: consumedAt ? new Date(consumedAt) : null,
    });

    res.status(201).json(entry);

  } catch (err) {
    console.error("CREATE ENTRY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/entries/:id
router.put("/:id", async (req, res) => {
  const { mediaType, title, rating, review, consumedAt } = req.body;

  // نجهز الpatch اللي بنحدثه
  const patch = {};

  if (mediaType !== undefined) {
    const mt = String(mediaType);
    if (!["book", "movie"].includes(mt)) return res.status(400).json({ error: "mediaType must be book or movie" });
    patch.mediaType = mt;
  }

  if (title !== undefined) {
    const t = String(title).trim();
    if (!t) return res.status(400).json({ error: "Title is required" });
    patch.title = t;
  }

  if (rating !== undefined) {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }
    patch.rating = r;
  }

  if (review !== undefined) {
    patch.review = String(review).trim();
  }

  if (consumedAt !== undefined) {
    patch.consumedAt = consumedAt ? new Date(consumedAt) : null;
  }

  const updated = await Entry.findOneAndUpdate(
    { _id: req.params.id, userId: req.session.userId },
    patch,
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "Entry not found" });
  res.json(updated);
});

// DELETE /api/entries/:id
router.delete("/:id", async (req, res) => {
  const deleted = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
  if (!deleted) return res.status(404).json({ error: "Entry not found" });

  res.json({ ok: true });
});

module.exports = router;
