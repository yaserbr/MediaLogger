if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const cors = require("cors");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");

require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const entryRoutes = require("./routes/entryRoutes");
const requireAuth = require("./middleware/requireAuth");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* =========================
   SESSION CONFIG
========================= */

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    collectionName: "sessions",
  }),
  cookie: {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  maxAge: 1000 * 60 * 60 * 24 * 7,
},
});

app.use(sessionMiddleware);

/* =========================
   PASSPORT
========================= */

app.use(passport.initialize());
app.use(passport.session());

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

app.get("/register", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  res.sendFile(path.join(__dirname, "public/pages/register.html"));
});

app.get("/app", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/app.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

/* =========================
   GOOGLE AUTH
========================= */

app.get("/auth/google", (req, res, next) => {
  const isMobile = req.query.mobile === "1";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: isMobile ? "mobile" : "web",
  })(req, res, next);
});

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  (req, res) => {
    try {
      const token = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const isMobile = req.query.state === "mobile";

      if (isMobile) {
        return res.redirect(
          `medialoggermobile://success?token=${token}`
        );
      }

      req.session.userId = req.user._id;
      req.session.username = req.user.username;

      return res.redirect("/app");
    } catch (err) {
      console.error("Google Callback Error:", err);
      return res.redirect("/login");
    }
  }
);

/* =========================
   API ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    userId: req.session.userId,
    username: req.session.username,
  });
});

/* =========================
   SOCKET.IO
========================= */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// ربط session بالـ socket
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// دعم JWT + Session
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  // لو جا من الجوال (JWT)
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  }

  // لو جا من الموقع (Session)
  const sessionUserId = socket.request.session?.userId;

  if (sessionUserId) {
    socket.userId = sessionUserId;
    return next();
  }

  return next(new Error("Unauthorized"));
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Socket connected");

  if (socket.userId) {
    socket.join(String(socket.userId));
  }

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });
});

/* =========================
   DATABASE
========================= */

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });