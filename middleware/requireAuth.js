module.exports = function requireAuth(req, res, next) {
  // هنا نتاكد ان المستخدم عنده سيشن، إذا ما عنده يعني مب مسجل دخول
  if (!req.session || !req.session.userId) {
    // إذا API نرجع JSON عشان الفرونت يفهم
    if (req.path.startsWith("/api") || req.originalUrl.startsWith("/api")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // إذا صفحة HTML نحوله لـ login
    return res.redirect("/login");
  }

  next();
};
