const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

  const authHeader = req.headers.authorization;

  // 🔥 افحص JWT أولاً
  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // ثم افحص session
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }

  return res.status(401).json({ error: "Not authorized" });
};