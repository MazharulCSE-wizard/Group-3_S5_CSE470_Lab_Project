const express = require("express");
const router = express.Router();
const { Job, Application, CompanyProfile, Wishlist, User, Notification } = require("../models");
const { auth, authorize } = require("../middleware");
const { sendWishlistNotification } = require("../utils/emailService");
const { getRecommendedJobs } = require("../utils/recommendationService");
const { analyzeJobPosting, isGeminiAvailable } = require("../utils/geminiRecommendationService");


const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         company:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         type:
 *           type: string
 *           enum: [full-time, part-time, contract, remote, internship]
 *         salary:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *             currency:
 *               type: string
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *         experience:
 *           type: string
 *         status:
 *           type: string
 *           enum: [open, closed, paused]
 *         applicationsCount:
 *           type: number
 *         openings:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *     JobCreateRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - location
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         type:
 *           type: string
 *           enum: [full-time, part-time, contract, remote, internship]
 *         salary:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *             currency:
 *               type: string
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *         experience:
 *           type: string
 *         openings:
 *           type: number
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all jobs with optional filtering
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for title, description, or location
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, contract, remote, internship]
 *         description: Job type filter
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     pages:
 *                       type: number
 */
router.get("/", async (req, res) => {
  try {
    const { q, type, location, salaryMin, salaryMax, experience } = req.query;
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const query = { status: "open" };

    
    if (q) {
      const escapedQ = escapeRegex(q);
      query.$or = [
        { title: { $regex: escapedQ, $options: "i" } },
        { description: { $regex: escapedQ, $options: "i" } },
        { location: { $regex: escapedQ, $options: "i" } },
      ];
    }

    
    if (type) {
      query.type = type;
    }


    if (location) {
      const escapedLocation = escapeRegex(location);
      query.location = { $regex: escapedLocation, $options: "i" };
    }

    // Filter by salary range - validate inputs to prevent injection
    if (salaryMin || salaryMax) {
      query["salary.max"] = query["salary.max"] || {};
      if (salaryMin) {
        const parsedMin = parseInt(salaryMin, 10);
        if (!isNaN(parsedMin) && parsedMin >= 0) {
          query["salary.max"].$gte = parsedMin;
        }
      }
      if (salaryMax) {
        const parsedMax = parseInt(salaryMax, 10);
        if (!isNaN(parsedMax) && parsedMax >= 0) {
          query["salary.max"].$lte = parsedMax;
        }
      }
    }

    // Filter by experience level
    if (experience) {
      const escapedExp = escapeRegex(experience);
      query.experience = { $regex: escapedExp, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const total = await Job.countDocuments(query);

   
    const jobsWithCompanyInfo = await Job.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "companyprofiles",
          localField: "company",
          foreignField: "user",
          as: "companyProfile"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "company",
          foreignField: "_id",
          as: "companyUser"
        }
      }
    ]);

    
    const jobsWithCompanyInfoMapped = jobsWithCompanyInfo.map(job => {
      const companyProfile = job.companyProfile && job.companyProfile[0];
      const companyUser = job.companyUser && job.companyUser[0];
      const { companyProfile: _, companyUser: __, ...jobData } = job;
      return {
        ...jobData,
        companyName: companyProfile?.companyName || companyUser?.name || "",
        companyLogo: companyProfile?.logo || "",
      };
    });

    res.json({
      jobs: jobsWithCompanyInfoMapped,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/jobs/company/my-jobs:
 *   get:
 *     summary: Get all jobs posted by the logged-in company
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of company's jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 */
router.get("/company/my-jobs", auth, authorize("company"), async (req, res) => {
  try {
    const jobs = await Job.find({ company: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error("Get company jobs error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/jobs/recommendations:
 *   get:
 *     summary: Get AI-powered job recommendations for the current user
 *     description: Returns personalized job recommendations based on user's skills, experience, location, and interests using ML-based matching algorithm
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of recommendations to return
 *     responses:
 *       200:
 *         description: List of recommended jobs with relevance scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       job:
 *                         $ref: '#/components/schemas/Job'
 *                       score:
 *                         type: number
 *                         description: Overall relevance score (0-1)
 *                       breakdown:
 *                         type: object
 *                         properties:
 *                           skillMatch:
 *                             type: string
 *                             description: Skill match percentage
 *                           experienceMatch:
 *                             type: string
 *                             description: Experience match percentage
 *                           locationMatch:
 *                             type: string
 *                             description: Location match percentage
 *                           keywordMatch:
 *                             type: string
 *                             description: Keyword match percentage
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only job seekers can get recommendations
 *       404:
 *         description: User profile not found
 */
router.get("/recommendations", auth, authorize("seeker"), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await getRecommendedJobs(req.user._id, limit);

    // Handle the new response format
    const recommendations = result.recommendations || result;
    const messageCode = result.message || "SUCCESS";

    let message;
    switch (messageCode) {
      case "NO_JOBS_AVAILABLE":
        message = "You've already applied to or saved all available jobs! Check back later for new opportunities.";
        break;
      case "NO_SUITABLE_JOBS":
        message = "No suitable jobs found matching your profile. Try updating your skills or check all available jobs.";
        break;
      case "SUCCESS":
        message = `Found ${recommendations.length} job recommendations based on your profile`;
        break;
      default:
        message = recommendations.length === 0
          ? "No suitable jobs found matching your profile."
          : `Found ${recommendations.length} job recommendations based on your profile`;
    }

    res.json({
      recommendations,
      count: recommendations.length,
      message,
      messageCode,
    });
  } catch (error) {
    console.error("Get recommendations error:", error.message, error.stack);
    if (error.code === "PROFILE_NOT_FOUND" || error.message === "User profile not found") {
      return res.status(200).json({ 
        message: "Please complete your profile to get job recommendations",
        messageCode: "PROFILE_NOT_FOUND",
        recommendations: [],
        count: 0,
      });
    }
    if (error.code === "PROFILE_INCOMPLETE" || error.message === "Profile is incomplete") {
      return res.status(200).json({ 
        message: "Please add skills, experience, or location to your profile to get personalized recommendations",
        messageCode: "PROFILE_INCOMPLETE",
        recommendations: [],
        count: 0,
      });
    }
    // For any other error, return a user-friendly message with empty recommendations
    res.status(200).json({ 
      message: "Unable to load recommendations at the moment. Please try again.",
      messageCode: "ERROR",
      recommendations: [], 
      count: 0 
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a specific job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 */
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("company", "name");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Increment view count (feature 4)
    await Job.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });

    const companyProfile = await CompanyProfile.findOne({ user: job.company._id });

    res.json({
      ...job.toObject(),
      companyName: companyProfile?.companyName || job.company.name,
      companyLogo: companyProfile?.logo || "",
      companyDescription: companyProfile?.description || "",
    });
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobCreateRequest'
 *     responses:
 *       201:
 *         description: Job created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       403:
 *         description: Only companies can post jobs
 */
router.post("/", auth, authorize("company"), async (req, res) => {
  try {
    const { title, description, location, type, salary, skills, experience, openings } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ message: "Title, description, and location are required" });
    }

    const job = new Job({
      company: req.user._id,
      title,
      description,
      location,
      type: type || "full-time",
      salary,
      skills: skills || [],
      experience: experience || "0-1 years",
      openings: openings && openings > 0 ? openings : 1,
    });

    await job.save();

    // Send notifications to users who have similar jobs in wishlist (feature 5)
    // Find users who might be interested based on title or skills
    try {
      const firstWord = title.trim().split(" ")[0];
      const query = { _id: { $ne: job._id } };
      
      // Only add title regex if firstWord is not empty
      if (firstWord && firstWord.length > 0) {
        const escapedFirstWord = escapeRegex(firstWord);
        query.$or = [
          { title: { $regex: escapedFirstWord, $options: "i" } },
          { skills: { $in: skills || [] } },
        ];
      } else if (skills && skills.length > 0) {
        query.skills = { $in: skills };
      } else {
        // Skip notification if no valid search criteria
        throw new Error("No valid criteria for similar jobs");
      }
      
      const similarJobs = await Job.find(query).limit(10);

      const similarJobIds = similarJobs.map((j) => j._id);
      
      const wishlists = await Wishlist.find({
        job: { $in: similarJobIds },
        notified: false,
      }).populate("user");

      // Send notifications to interested users
      for (const wishlist of wishlists) {
        if (wishlist.user && wishlist.user.email) {
          await sendWishlistNotification(
            wishlist.user.email,
            job.title,
            job._id
          );
          wishlist.notified = true;
          await wishlist.save();
        }
      }
    } catch (notificationError) {
      console.error("Error sending wishlist notifications:", notificationError);
      // Don't fail the job creation if notification fails
    }

    res.status(201).json(job);
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update a job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobCreateRequest'
 *     responses:
 *       200:
 *         description: Job updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Job not found
 */
router.put("/:id", auth, authorize("company"), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this job" });
    }

    const updates = req.body;
    const allowedUpdates = ["title", "description", "location", "type", "salary", "skills", "experience", "status", "openings"];
    
    // Check if status is changing to 'open' (job reactivation)
    const wasNotOpen = job.status !== "open";
    const willBeOpen = updates.status === "open";
    const isReactivating = wasNotOpen && willBeOpen;

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        job[key] = updates[key];
      }
    });

    await job.save();

    // Send notifications to users who have this job in their wishlist when it's reactivated
    if (isReactivating) {
      try {
        // Find all users who have this exact job in their wishlist
        const wishlists = await Wishlist.find({
          job: job._id,
        }).populate("user", "email name");

        // Get company name for notifications
        const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
        const companyName = companyProfile?.companyName || "A company";

        // Send notifications and emails to interested users
        for (const wishlist of wishlists) {
          if (wishlist.user && wishlist.user.email) {
            // Send email notification
            await sendWishlistNotification(
              wishlist.user.email,
              job.title,
              job._id
            );

            // Create in-app notification
            try {
              await Notification.create({
                user: wishlist.user._id,
                type: "wishlist_alert",
                title: "Job Now Open!",
                message: `Great news! "${job.title}" at ${companyName} is now open for applications!`,
                relatedJob: job._id,
                metadata: {
                  jobTitle: job.title,
                  companyName: companyName,
                },
              });
            } catch (notifError) {
              console.error("Error creating wishlist notification:", notifError);
            }
          }
        }
      } catch (notificationError) {
        console.error("Error sending wishlist notifications:", notificationError);
        // Don't fail the update if notifications fail
      }
    }
    
    res.json(job);
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Job not found
 */
router.delete("/:id", auth, authorize("company"), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this job" });
    }

    await Application.deleteMany({ job: req.params.id });
    await Job.findByIdAndDelete(req.params.id);

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/jobs/analyze:
 *   post:
 *     summary: Get AI-powered analysis and improvement suggestions for a job posting
 *     description: Uses AI to analyze job posting quality and provide actionable suggestions
 *     tags: [Jobs, AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               experience:
 *                 type: string
 *               salary:
 *                 type: object
 *     responses:
 *       200:
 *         description: AI analysis of job posting
 *       503:
 *         description: AI service not available
 */
router.post("/analyze", auth, authorize("company"), async (req, res) => {
  try {
    // Check if AI is available
    if (!isGeminiAvailable()) {
      return res.status(503).json({
        message: "AI analysis is not available. Please configure the Gemini API key.",
        available: false,
      });
    }

    const { title, description, location, type, skills, experience, salary } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required for analysis" });
    }

    const analysis = await analyzeJobPosting({
      title,
      description,
      location,
      type,
      skills,
      experience,
      salary,
    });

    res.json({
      analysis,
      aiEnabled: true,
      message: "AI analysis completed successfully",
    });
  } catch (error) {
    console.error("Job analysis error:", error);
    res.status(500).json({ message: "Error analyzing job posting" });
  }
});

/**
 * @swagger
 * /api/jobs/ai-status:
 *   get:
 *     summary: Check if AI features are available
 *     tags: [Jobs, AI]
 *     responses:
 *       200:
 *         description: AI availability status
 */
router.get("/ai-status", (req, res) => {
  res.json({
    available: isGeminiAvailable(),
    features: {
      jobRecommendations: true,
      jobAnalysis: isGeminiAvailable(),
      candidateAnalysis: isGeminiAvailable(),
    },
    message: isGeminiAvailable()
      ? "AI features are fully available"
      : "AI features are limited. Configure Gemini API key for full functionality.",
  });
});

module.exports = router;
