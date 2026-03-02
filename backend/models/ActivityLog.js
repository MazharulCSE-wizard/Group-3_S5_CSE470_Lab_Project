const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "application_submitted",
        "application_updated",
        "job_saved",
        "job_unsaved",
        "interview_scheduled",
        "job_posted",
        "job_updated",
        "job_closed",
        "profile_updated",
        "application_received",
        "applicant_shortlisted",
        "applicant_rejected",
        "applicant_hired",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
activityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
