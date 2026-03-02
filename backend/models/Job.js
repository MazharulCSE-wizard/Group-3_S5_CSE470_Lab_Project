const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    type: {
      type: String,
      enum: ["full-time", "part-time", "contract", "remote", "internship"],
      default: "full-time",
    },
    salary: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: "USD" },
    },
    skills: [{ type: String }],
    experience: {
      type: String,
      default: "0-1 years",
    },
    status: {
      type: String,
      enum: ["open", "closed", "paused"],
      default: "open",
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    wishlistCount: {
      type: Number,
      default: 0,
    },
    openings: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
jobSchema.index({ title: "text", description: "text", location: "text" });

module.exports = mongoose.model("Job", jobSchema);
