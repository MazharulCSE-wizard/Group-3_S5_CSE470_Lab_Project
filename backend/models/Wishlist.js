const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    notified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one wishlist entry per job per user
wishlistSchema.index({ user: 1, job: 1 }, { unique: true });

// Compound index for efficient wishlist queries sorted by date
wishlistSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Wishlist", wishlistSchema);
