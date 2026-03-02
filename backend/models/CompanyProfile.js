const mongoose = require("mongoose");

const companyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: { type: String, default: "" },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    location: { type: String, default: "" },
    description: { type: String, default: "" },
    industry: { type: String, default: "" },
    size: { type: String, default: "" },
    founded: { type: String, default: "" },
    logo: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CompanyProfile", companyProfileSchema);
