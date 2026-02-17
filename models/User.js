const mongoose = require("mongoose");

// موديل المستخدم (يدعم عادي + Google)
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // كلمة المرور مطلوبة فقط إذا ما كان Google User
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },

    // خاص بتسجيل الدخول عبر Google
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
