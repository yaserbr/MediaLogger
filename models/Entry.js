const mongoose = require("mongoose");

// هذا موديل الإدخالات (كتاب/فلم) مربوط باليوزر عن طريق userId
const EntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // mediaType يا Book يا Movie
    mediaType: { type: String, enum: ["book", "movie"], required: true },

    title: { type: String, required: true, trim: true, maxlength: 120 },

    // التقييم من 1 إلى 5
    rating: { type: Number, required: true, min: 1, max: 5 },

    // مراجعة خاصة، ما راح يطلع عليها غير صاحب الحساب
    review: { type: String, trim: true, maxlength: 600, default: "" },

    // تاريخ الاستهلاك: مثلاً يوم تابعت الفلم أو خلصت الكتاب
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Entry", EntrySchema);
