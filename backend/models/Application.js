const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: {
      type: String,
      default: "",
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewing", "shortlisted", "interview", "rejected", "hired", "accepted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one application per job per user
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
