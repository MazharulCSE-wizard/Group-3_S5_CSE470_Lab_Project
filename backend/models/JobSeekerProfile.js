const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  duration: { type: String, required: true },
  description: { type: String },
});

const educationSchema = new mongoose.Schema({
  school: { type: String, required: true },
  degree: { type: String, required: true },
  year: { type: String, required: true },
});

const jobSeekerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    headline: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: [{ type: String }],
    experience: [experienceSchema],
    education: [educationSchema],
    resumeUrl: { type: String, default: "" },
    profileViews: { type: Number, default: 0 },
    profilePicture: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("JobSeekerProfile", jobSeekerProfileSchema);
