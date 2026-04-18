const express = require("express");
const router = express.Router();
const { Wishlist, Job, ActivityLog } = require("../models");
const { auth, authorize } = require("../middleware");

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get all wishlist items for the logged-in job seeker
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of wishlist items
 */
router.get("/", auth, authorize("seeker"), async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ user: req.user._id })
      .populate("job")
      .sort({ createdAt: -1 });

    // Manually populate company information
    const { CompanyProfile } = require("../models");
    const itemsWithCompany = await Promise.all(
      wishlistItems.map(async (item) => {
        if (item.job) {
          const companyProfile = await CompanyProfile.findOne({ user: item.job.company });
          return {
            ...item.toObject(),
            job: {
              ...item.job.toObject(),
              company: {
                companyName: companyProfile?.companyName || "Unknown Company",
              },
            },
          };
        }
        return item.toObject();
      })
    );

    res.json(itemsWithCompany);
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add a job to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *             properties:
 *               jobId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job added to wishlist
 *       400:
 *         description: Job already in wishlist
 *       404:
 *         description: Job not found
 */
router.post("/", auth, authorize("seeker"), async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Check if already in wishlist
    const existingWishlist = await Wishlist.findOne({
      user: req.user._id,
      job: jobId,
    });

    if (existingWishlist) {
      return res.status(400).json({ message: "Job already in wishlist" });
    }

    // Add to wishlist
    const wishlistItem = new Wishlist({
      user: req.user._id,
      job: jobId,
    });

    await wishlistItem.save();

    // Increment wishlist count
    await Job.findByIdAndUpdate(jobId, { $inc: { wishlistCount: 1 } });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      type: "job_saved",
      description: `Saved job: ${job.title}`,
      relatedJob: jobId,
    });

    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/wishlist/{jobId}:
 *   delete:
 *     summary: Remove a job from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job removed from wishlist
 *       404:
 *         description: Job not found in wishlist
 */
router.delete("/:jobId", auth, authorize("seeker"), async (req, res) => {
  try {
    const wishlistItem = await Wishlist.findOne({
      user: req.user._id,
      job: req.params.jobId,
    });

    if (!wishlistItem) {
      return res.status(404).json({ message: "Job not found in wishlist" });
    }

    await Wishlist.deleteOne({ _id: wishlistItem._id });

    // Decrement wishlist count
    await Job.findByIdAndUpdate(req.params.jobId, { $inc: { wishlistCount: -1 } });

    // Log activity
    const job = await Job.findById(req.params.jobId);
    if (job) {
      await ActivityLog.create({
        user: req.user._id,
        type: "job_unsaved",
        description: `Removed job from wishlist: ${job.title}`,
        relatedJob: req.params.jobId,
      });
    }

    res.json({ message: "Job removed from wishlist" });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/wishlist/check/{jobId}:
 *   get:
 *     summary: Check if a job is in wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Wishlist status
 */
router.get("/check/:jobId", auth, authorize("seeker"), async (req, res) => {
  try {
    const wishlistItem = await Wishlist.findOne({
      user: req.user._id,
      job: req.params.jobId,
    });

    res.json({ inWishlist: !!wishlistItem });
  } catch (error) {
    console.error("Check wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
