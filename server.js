require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const entryRoutes = require("./routes/entryRoutes");
const requireAuth = require("./middleware/requireAuth");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// هنا احتياط بسيط للهيدر والأمان، وCSP مطفي عشان Bootstrap CDN ما يزعجنا
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));

// هنا نخلي السيرفر يفهم JSON و form-urlencoded

// السيشن نخزنها في MongoDB عشان ما تضيع إذا طفى السيرفر
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // أسبوع
    },
  })
);

// ملفات الواجهة (CSS/JS)
app.use(express.static(path.join(__dirname, "public")));


// روت رئيسي: إذا مسجل دخوله وده للـ app، غير كذا للـ login
app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  return res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

app.get("/register", (req, res) => {
  if (req.session.userId) return res.redirect("/app");
  return res.sendFile(path.join(__dirname, "public/pages/register.html"));
});

app.get("/app", requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, "public/pages/app.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);

// endpoint بسيط عشان الواجهة تعرف مين المستخدم
app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    userId: req.session.userId,
    username: req.session.username,
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
