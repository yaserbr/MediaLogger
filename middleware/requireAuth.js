const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

  // Web (Session)
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }

  // Mobile (JWT)
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};