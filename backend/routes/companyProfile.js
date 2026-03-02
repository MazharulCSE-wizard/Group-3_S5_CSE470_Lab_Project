const express = require("express");
const router = express.Router();
const { CompanyProfile, ActivityLog } = require("../models");
const { auth, authorize } = require("../middleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     CompanyProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         companyName:
 *           type: string
 *         email:
 *           type: string
 *         website:
 *           type: string
 *         location:
 *           type: string
 *         description:
 *           type: string
 *         industry:
 *           type: string
 *         size:
 *           type: string
 *           example: "100-500"
 *         founded:
 *           type: string
 *           example: "2015"
 *         logo:
 *           type: string
 */

/**
 * @swagger
 * /api/profile/company:
 *   get:
 *     summary: Get current company's profile
 *     tags: [Company Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 *       404:
 *         description: Profile not found
 */
router.get("/", auth, authorize("company"), async (req, res) => {
  try {
    let profile = await CompanyProfile.findOne({ user: req.user._id });

    if (!profile) {
      profile = await CompanyProfile.create({
        user: req.user._id,
        companyName: req.user.name,
        email: req.user.email,
      });
    }

    res.json(profile);
  } catch (error) {
    console.error("Get company profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/company:
 *   put:
 *     summary: Update company's profile
 *     tags: [Company Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               website:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               industry:
 *                 type: string
 *               size:
 *                 type: string
 *               founded:
 *                 type: string
 *               logo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 */
router.put("/", auth, authorize("company"), async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      "companyName",
      "website",
      "location",
      "description",
      "industry",
      "size",
      "founded",
      "logo",
      "profilePicture",
    ];
    const filteredUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const profile = await CompanyProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: filteredUpdates },
      { new: true, upsert: true }
    );

    // Log activity for profile update
    try {
      await ActivityLog.create({
        user: req.user._id,
        type: "profile_updated",
        description: "Updated company profile",
        metadata: { updatedFields: Object.keys(filteredUpdates) },
      });
    } catch (activityError) {
      console.error("Error logging profile update activity:", activityError);
      // Don't fail the request if activity logging fails
    }

    res.json(profile);
  } catch (error) {
    console.error("Update company profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/profile/company/{id}:
 *   get:
 *     summary: Get a company's public profile
 *     tags: [Company Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company user ID
 *     responses:
 *       200:
 *         description: Company public profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 *       404:
 *         description: Company not found
 */
router.get("/:id", async (req, res) => {
  try {
    const profile = await CompanyProfile.findOne({ user: req.params.id });

    if (!profile) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Get company public profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
