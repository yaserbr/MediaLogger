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
    origin: true, // يسمح من Expo والجوال
    credentials: true,
  })
);


/* =========================
   SESSION CONFIG
========================= */

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      collectionName: "sessions",
    }),


    cookie: {
      httpOnly: true,

      sameSite: "none",   // مهم جدًا
      secure: true,       // مهم جدًا (عشان https)

      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

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

// الصفحة الرئيسية
app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  res.redirect("/login");
});

// Login
app.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/app");

  res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

// Register
app.get("/register", (req, res) => {
  if (req.session.userId) return res.redirect("/app");

  res.sendFile(path.join(__dirname, "public/pages/register.html"));
});

// App
app.get("/app", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/app.html"));
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

/* =========================
   GOOGLE AUTH
========================= */

// Start Google Login
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google Callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    // حفظ بيانات المستخدم في السيشن
    req.session.userId = req.user._id;
    req.session.username = req.user.username;

    res.redirect("/app");
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
   DATABASE
========================= */

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });
