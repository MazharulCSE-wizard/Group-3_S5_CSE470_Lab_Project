const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { JobSeekerProfile, Application, Job, ProfileView, ActivityLog } = require("../models");
const { auth, authorize } = require("../middleware");

/**
 * Helper function to generate CV PDF content
 * @param {PDFDocument} doc - The PDFKit document object
 * @param {Object} profile - The job seeker profile data
 */
function generateCVContent(doc, profile) {
  const bgDark = '#0f0f1e';
  const bgCard = '#16213e';
  const primaryColor = '#0066ff';
  const accentColor = '#00d9ff';
  const textLight = '#e0e0ff';
  const textMuted = '#a0a0c0';
  
  const pageWidth = doc.page.width;
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  
  // Dark background
  doc.rect(0, 0, pageWidth, doc.page.height).fill(bgDark);
  
  let y = 30;
  
  // Header card
  const headerHeight = profile.profilePicture ? 160 : 100;
  doc.roundedRect(margin, y, contentWidth, headerHeight, 10).fill(bgCard);
  
  // Profile picture
  if (profile.profilePicture) {
    try {
      let imageData = profile.profilePicture;
      if (imageData.startsWith('data:')) {
        imageData = imageData.split(',')[1];
      }
      const imageBuffer = Buffer.from(imageData, 'base64');
      const imageSize = 70;
      const imageX = (pageWidth - imageSize) / 2;
      
      doc.circle(imageX + imageSize/2, y + 50, imageSize/2 + 3).fill(primaryColor);
      doc.save();
      doc.circle(imageX + imageSize/2, y + 50, imageSize/2).clip();
      doc.image(imageBuffer, imageX, y + 15, { width: imageSize, height: imageSize });
      doc.restore();
      
      y += 95;
    } catch (e) {
      y += 20;
    }
  } else {
    y += 20;
  }

  // Name
  doc.fontSize(24).fillColor(textLight).font("Helvetica-Bold")
     .text(profile.fullName || "Job Seeker", margin, y, { align: "center", width: contentWidth });
  y += 30;

  // Headline
  if (profile.headline) {
    doc.fontSize(12).fillColor(accentColor).font("Helvetica")
       .text(profile.headline, margin, y, { align: "center", width: contentWidth });
    y += 20;
  }
  
  y = profile.profilePicture ? 200 : 140;

  // Contact bar
  doc.roundedRect(margin, y, contentWidth, 30, 6).fill(bgCard);
  const contactParts = [];
  if (profile.email) contactParts.push(profile.email);
  if (profile.phone) contactParts.push(profile.phone);
  if (profile.location) contactParts.push(profile.location);
  
  doc.fontSize(9).fillColor(textMuted).font("Helvetica")
     .text(contactParts.join("  •  "), margin, y + 10, { align: "center", width: contentWidth });
  
  y += 45;

  // Bio section
  if (profile.bio) {
    doc.rect(margin, y, 3, 18).fill(accentColor);
    doc.fontSize(14).fillColor(textLight).font("Helvetica-Bold")
       .text("ABOUT ME", margin + 12, y + 2);
    y += 28;
    
    doc.roundedRect(margin, y, contentWidth, 50, 6).fill(bgCard);
    doc.fontSize(9).fillColor(textMuted).font("Helvetica")
       .text(profile.bio, margin + 12, y + 10, { width: contentWidth - 24 });
    y += 60;
  }

  // Skills section
  if (profile.skills && profile.skills.length > 0) {
    doc.rect(margin, y, 3, 18).fill(accentColor);
    doc.fontSize(14).fillColor(textLight).font("Helvetica-Bold")
       .text("SKILLS", margin + 12, y + 2);
    y += 28;
    
    let skillX = margin;
    let skillRowStart = y;
    
    profile.skills.forEach((skill) => {
      const skillWidth = doc.widthOfString(skill, { fontSize: 9 }) + 16;
      
      if (skillX + skillWidth > pageWidth - margin) {
        skillX = margin;
        y += 26;
      }
      
      doc.roundedRect(skillX, y, skillWidth, 20, 10).fill(primaryColor);
      doc.fontSize(9).fillColor('#ffffff').font("Helvetica-Bold")
         .text(skill, skillX + 8, y + 6);
      
      skillX += skillWidth + 6;
    });
    
    y += 35;
  }

  // Experience section
  if (profile.experience && profile.experience.length > 0) {
    doc.rect(margin, y, 3, 18).fill(accentColor);
    doc.fontSize(14).fillColor(textLight).font("Helvetica-Bold")
       .text("EXPERIENCE", margin + 12, y + 2);
    y += 28;

    profile.experience.forEach((exp) => {
      doc.roundedRect(margin, y, contentWidth, 55, 6).fill(bgCard);
      
      doc.fontSize(12).fillColor(textLight).font("Helvetica-Bold")
         .text(exp.title || "", margin + 12, y + 10);
      
      doc.fontSize(10).fillColor(accentColor).font("Helvetica")
         .text(`${exp.company || ""}  •  ${exp.duration || ""}`, margin + 12, y + 26);
      
      if (exp.description) {
        doc.fontSize(9).fillColor(textMuted).font("Helvetica")
           .text(exp.description, margin + 12, y + 40, { width: contentWidth - 24, lineBreak: false, ellipsis: true });
      }
      
      y += 62;
    });
  }

  // Education section
  if (profile.education && profile.education.length > 0) {
    doc.rect(margin, y, 3, 18).fill(accentColor);
    doc.fontSize(14).fillColor(textLight).font("Helvetica-Bold")
       .text("EDUCATION", margin + 12, y + 2);
    y += 28;

    profile.education.forEach((edu) => {
      doc.roundedRect(margin, y, contentWidth, 45, 6).fill(bgCard);
      
      doc.fontSize(12).fillColor(textLight).font("Helvetica-Bold")
         .text(edu.degree || "", margin + 12, y + 10);
      
      doc.fontSize(10).fillColor(accentColor).font("Helvetica")
         .text(`${edu.school || ""}  •  ${edu.year || ""}`, margin + 12, y + 26);
      
      y += 52;
    });
  }

  // Footer line
  y = Math.max(y + 10, doc.page.height - 50);
  if (y < doc.page.height - 30) {
    doc.rect(margin, y, contentWidth, 1).fill(primaryColor);
    doc.fontSize(8).fillColor(textMuted).font("Helvetica")
       .text("Generated from OSEEK Job Portal", margin, y + 8, { align: "center", width: contentWidth });
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Experience:
 *       type: object
 *       required:
 *         - title
 *         - company
 *         - duration
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         company:
 *           type: string
 *         duration:
 *           type: string
 *         description:
 *           type: string
 *     Education:
 *       type: object
 *       required:
 *         - school
 *         - degree
 *         - year
 *       properties:
 *         _id:
 *           type: string
 *         school:
 *           type: string
 *         degree:
 *           type: string
 *         year:
 *           type: string
 *     JobSeekerProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         fullName:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         location:
 *           type: string
 *         headline:
 *           type: string
 *         bio:
 *           type: string
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *         experience:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Experience'
 *         education:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Education'
 *         resumeUrl:
 *           type: string
 *         profileViews:
 *           type: number
 */

/**
 * @swagger
 * /api/profile/seeker:
 *   get:
 *     summary: Get current job seeker's profile
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job seeker profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeekerProfile'
 *       404:
 *         description: Profile not found
 */
router.get("/", auth, authorize("seeker"), async (req, res) => {
  try {
    let profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      profile = await JobSeekerProfile.create({
        user: req.user._id,
        fullName: req.user.name,
        email: req.user.email,
      });
    }

    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker:
 *   put:
 *     summary: Update job seeker's profile
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               location:
 *                 type: string
 *               headline:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeekerProfile'
 */
router.put("/", auth, authorize("seeker"), async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ["fullName", "phone", "location", "headline", "bio", "resumeUrl", "profilePicture"];
    const filteredUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: filteredUpdates },
      { new: true, upsert: true }
    );

    // Log activity for profile update
    try {
      await ActivityLog.create({
        user: req.user._id,
        type: "profile_updated",
        description: "Updated profile information",
        metadata: { updatedFields: Object.keys(filteredUpdates) },
      });
    } catch (activityError) {
      console.error("Error logging profile update activity:", activityError);
      // Don't fail the request if activity logging fails
    }

    res.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/skills:
 *   post:
 *     summary: Add a skill to profile
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - skill
 *             properties:
 *               skill:
 *                 type: string
 *     responses:
 *       200:
 *         description: Skill added
 */
router.post("/skills", auth, authorize("seeker"), async (req, res) => {
  try {
    const { skill } = req.body;

    if (!skill || typeof skill !== "string") {
      return res.status(400).json({ message: "Skill is required" });
    }

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { skills: skill.trim() } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Add skill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/skills/{skill}:
 *   delete:
 *     summary: Remove a skill from profile
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skill
 *         required: true
 *         schema:
 *           type: string
 *         description: Skill to remove
 *     responses:
 *       200:
 *         description: Skill removed
 */
router.delete("/skills/:skill", auth, authorize("seeker"), async (req, res) => {
  try {
    const { skill } = req.params;

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { skills: skill } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Remove skill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/experience:
 *   post:
 *     summary: Add work experience
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Experience'
 *     responses:
 *       200:
 *         description: Experience added
 */
router.post("/experience", auth, authorize("seeker"), async (req, res) => {
  try {
    const { title, company, duration, description } = req.body;

    if (!title || !company || !duration) {
      return res.status(400).json({ message: "Title, company, and duration are required" });
    }

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          experience: { title, company, duration, description },
        },
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Add experience error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/experience/{id}:
 *   put:
 *     summary: Update work experience
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Experience ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Experience'
 *     responses:
 *       200:
 *         description: Experience updated
 */
router.put("/experience/:id", auth, authorize("seeker"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, company, duration, description } = req.body;

    // Build update object with only provided fields
    const updateFields = {};
    if (title !== undefined) updateFields["experience.$.title"] = title;
    if (company !== undefined) updateFields["experience.$.company"] = company;
    if (duration !== undefined) updateFields["experience.$.duration"] = duration;
    if (description !== undefined) updateFields["experience.$.description"] = description;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id, "experience._id": id },
      { $set: updateFields },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Experience not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Update experience error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/experience/{id}:
 *   delete:
 *     summary: Delete work experience
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Experience ID
 *     responses:
 *       200:
 *         description: Experience deleted
 */
router.delete("/experience/:id", auth, authorize("seeker"), async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { experience: { _id: id } } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Delete experience error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/education:
 *   post:
 *     summary: Add education
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Education'
 *     responses:
 *       200:
 *         description: Education added
 */
router.post("/education", auth, authorize("seeker"), async (req, res) => {
  try {
    const { school, degree, year } = req.body;

    if (!school || !degree || !year) {
      return res.status(400).json({ message: "School, degree, and year are required" });
    }

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          education: { school, degree, year },
        },
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Add education error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/education/{id}:
 *   put:
 *     summary: Update education
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Education ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Education'
 *     responses:
 *       200:
 *         description: Education updated
 */
router.put("/education/:id", auth, authorize("seeker"), async (req, res) => {
  try {
    const { id } = req.params;
    const { school, degree, year } = req.body;

    // Build update object with only provided fields
    const updateFields = {};
    if (school !== undefined) updateFields["education.$.school"] = school;
    if (degree !== undefined) updateFields["education.$.degree"] = degree;
    if (year !== undefined) updateFields["education.$.year"] = year;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id, "education._id": id },
      { $set: updateFields },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Education not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Update education error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/education/{id}:
 *   delete:
 *     summary: Delete education
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Education ID
 *     responses:
 *       200:
 *         description: Education deleted
 */
router.delete("/education/:id", auth, authorize("seeker"), async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { education: { _id: id } } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Delete education error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/seeker-profile/download-cv:
 *   get:
 *     summary: Download profile as CV (PDF)
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CV PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/download-cv", auth, authorize("seeker"), async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Create PDF document with custom page size and margins
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });

    // Sanitize filename to prevent header injection
    const sanitizedName = (profile.fullName || "CV")
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .substring(0, 50);
    
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedName}_Resume.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Generate CV content using helper function
    generateCVContent(doc, profile);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Download CV error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/{userId}/download-cv:
 *   get:
 *     summary: Download job seeker's CV as PDF (for companies who received applications)
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job seeker user ID
 *     responses:
 *       200:
 *         description: CV PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Not authorized - user has not applied to your jobs
 *       404:
 *         description: Profile not found
 */
router.get("/:userId/download-cv", auth, authorize("company"), async (req, res) => {
  try {
    // First, get all jobs owned by this company
    const companyJobs = await Job.find({ company: req.user._id }).select('_id');
    const companyJobIds = companyJobs.map(job => job._id);
    
    // Verify that this seeker has applied to at least one job from this company
    const hasAppliedToCompany = await Application.findOne({
      applicant: req.params.userId,
      job: { $in: companyJobIds }
    });
    
    if (!hasAppliedToCompany) {
      return res.status(403).json({ message: "Not authorized to download this CV. This applicant has not applied to your jobs." });
    }

    const profile = await JobSeekerProfile.findOne({ user: req.params.userId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Increment profile views when CV is downloaded
    await JobSeekerProfile.findByIdAndUpdate(profile._id, { $inc: { profileViews: 1 } });

    // Create PDF document with custom page size and margins
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });

    // Sanitize filename to prevent header injection
    const sanitizedName = (profile.fullName || "CV")
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .substring(0, 50);
    
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedName}_Resume.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Generate CV content using helper function
    generateCVContent(doc, profile);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Download applicant CV error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/{id}/download-profile-pdf:
 *   get:
 *     summary: Download job seeker profile as PDF (web view format)
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job seeker profile ID or user ID
 *     responses:
 *       200:
 *         description: Profile PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Profile not found
 */
router.get("/:id/download-profile-pdf", auth, async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findById(req.params.id)
      .populate('user', 'name');
    
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Create PDF document
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });

    // Sanitize filename - consistent with frontend
    const sanitizedName = (profile.fullName || "Profile")
      .replace(/[/\\:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
    
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedName}_Profile.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Generate profile content (similar to CV but formatted as web view)
    generateCVContent(doc, profile);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Download profile PDF error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/{id}:
 *   get:
 *     summary: Get public job seeker profile by ID
 *     tags: [Job Seeker Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job seeker profile ID or user ID
 *     responses:
 *       200:
 *         description: Job seeker profile
 *       404:
 *         description: Profile not found
 */
router.get("/:id", auth, async (req, res) => {
  try {
    // Determine if company should see full profile (when viewing an applicant)
    const isCompanyViewer = req.user?.role === 'company';
    
    // For companies viewing applicants, include contact info
    // For other viewers (seekers, public), exclude sensitive fields
    let profileQuery = JobSeekerProfile.findById(req.params.id)
      .populate('user', 'name email');
    
    // Only exclude sensitive fields if viewer is not a company
    if (!isCompanyViewer) {
      profileQuery = profileQuery.select('-email -phone');
    }
    
    const profile = await profileQuery;
    
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Track profile view if viewer is not the profile owner
    if (req.user && profile.user._id.toString() !== req.user._id.toString()) {
      try {
        // Check if this user already viewed this profile today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingView = await ProfileView.findOne({
          profile: profile.user._id,
          viewer: req.user._id,
          viewedAt: { $gte: today }
        });

        // Only create a new view record if they haven't viewed today
        if (!existingView) {
          await ProfileView.create({
            profile: profile.user._id,
            viewer: req.user._id,
            viewerRole: req.user.role,
          });
        }
      } catch (viewError) {
        console.error("Error tracking profile view:", viewError);
        // Don't fail the request if view tracking fails
      }
    }

    res.json(profile);
  } catch (error) {
    console.error("Get seeker profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/views/list:
 *   get:
 *     summary: Get list of profile views for logged-in seeker
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of profile views
 *       403:
 *         description: Not authorized
 */
router.get("/views/list", auth, authorize("seeker"), async (req, res) => {
  try {
    const { CompanyProfile: CompanyProfileModel } = require("../models");
    
    const views = await ProfileView.find({ profile: req.user._id })
      .populate({
        path: 'viewer',
        select: 'name email role'
      })
      .sort({ viewedAt: -1 })
      .limit(100);

    // Enhance with profile information based on viewer role
    const enhancedViews = await Promise.all(
      views.map(async (view) => {
        const viewObj = view.toObject();
        
        if (view.viewerRole === 'company') {
          const companyProfile = await CompanyProfileModel.findOne({ 
            user: view.viewer._id 
          }).select('companyName location industry profilePicture');
          
          viewObj.viewerProfile = companyProfile;
        } else if (view.viewerRole === 'seeker') {
          const seekerProfile = await JobSeekerProfile.findOne({ 
            user: view.viewer._id 
          }).select('fullName headline location skills profilePicture');
          
          viewObj.viewerProfile = seekerProfile;
        }
        
        return viewObj;
      })
    );

    res.json(enhancedViews);
  } catch (error) {
    console.error("Get profile views error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/seeker/views/count:
 *   get:
 *     summary: Get total profile view count for logged-in seeker
 *     tags: [Job Seeker Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile view count
 *       403:
 *         description: Not authorized
 */
router.get("/views/count", auth, authorize("seeker"), async (req, res) => {
  try {
    const count = await ProfileView.countDocuments({ profile: req.user._id });
    res.json({ count });
  } catch (error) {
    console.error("Get profile view count error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
