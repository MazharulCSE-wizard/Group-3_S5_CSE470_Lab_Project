const express = require("express");
const router = express.Router();
const { Application, Job, JobSeekerProfile, Wishlist, ActivityLog, ProfileView } = require("../models");
const { auth } = require("../middleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         profileViews:
 *           type: number
 *         connections:
 *           type: number
 *         applications:
 *           type: number
 *         recentActivity:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     CompanyDashboardStats:
 *       type: object
 *       properties:
 *         totalJobs:
 *           type: number
 *         activeJobs:
 *           type: number
 *         totalApplications:
 *           type: number
 *         recentApplications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Application'
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics for the logged-in user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/DashboardStats'
 *                 - $ref: '#/components/schemas/CompanyDashboardStats'
 */
router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role === "seeker") {
      const { Connection } = require("../models");
      const profile = await JobSeekerProfile.findOne({ user: req.user._id });
      const applications = await Application.find({ applicant: req.user._id })
        .populate("job", "title")
        .sort({ createdAt: -1 })
        .limit(5);

      const applicationCount = await Application.countDocuments({ applicant: req.user._id });

      // Count accepted connections
      const connectionCount = await Connection.countDocuments({
        $or: [{ requester: req.user._id }, { recipient: req.user._id }],
        status: "accepted",
      });

      const recentActivity = applications.map((app) => ({
        type: "application",
        title: `Applied to ${app.job?.title || "Unknown Job"}`,
        status: app.status,
        timestamp: app.createdAt,
      }));

      // Get actual profile view count from ProfileView collection
      const profileViewCount = await ProfileView.countDocuments({ profile: req.user._id });

      res.json({
        profileViews: profileViewCount,
        connections: connectionCount, 
        applications: applicationCount,
        recentActivity,
      });
    } else {
      const jobs = await Job.find({ company: req.user._id });
      const jobIds = jobs.map((job) => job._id);

      const totalApplications = await Application.countDocuments({ job: { $in: jobIds } });
      const recentApplications = await Application.find({ job: { $in: jobIds } })
        .populate("job", "title")
        .populate("applicant", "name email")
        .sort({ createdAt: -1 })
        .limit(5);

      const activeJobs = jobs.filter((job) => job.status === "open").length;

      // Calculate analytics
      const totalViews = jobs.reduce((sum, job) => sum + (job.viewsCount || 0), 0);
      const totalWishlists = jobs.reduce((sum, job) => sum + (job.wishlistCount || 0), 0);
      const shortlistedCount = await Application.countDocuments({ 
        job: { $in: jobIds },
        status: "shortlisted"
      });

      // Get job-wise analytics
      const jobAnalytics = jobs.map((job) => ({
        jobId: job._id,
        title: job.title,
        views: job.viewsCount || 0,
        applications: job.applicationsCount || 0,
        wishlists: job.wishlistCount || 0,
        status: job.status,
      }));

      res.json({
        totalJobs: jobs.length,
        activeJobs,
        totalApplications,
        totalViews,
        totalWishlists,
        shortlistedCount,
        recentApplications,
        jobAnalytics,
      });
    }
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     summary: Get recent activity for the logged-in user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Recent activity list
 */
router.get("/activity", auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    
    // Get activity logs from the ActivityLog collection
    const activityLogs = await ActivityLog.find({ user: req.user._id })
      .populate("relatedJob", "title")
      .populate("relatedApplication")
      .sort({ createdAt: -1 })
      .limit(limit);

    const activities = activityLogs.map((log) => ({
      _id: log._id,
      type: log.type,
      description: log.description,
      relatedJob: log.relatedJob ? { title: log.relatedJob.title, _id: log.relatedJob._id } : null,
      createdAt: log.createdAt,
      metadata: log.metadata,
    }));

    // Fallback to old method if no activity logs found - generate from actual data
    if (activities.length === 0) {
      if (req.user.role === "seeker") {
        const applications = await Application.find({ applicant: req.user._id })
          .populate("job", "title")
          .sort({ updatedAt: -1 })
          .limit(limit);

        applications.forEach((app) => {
          activities.push({
            _id: app._id,
            type: app.status === "pending" ? "application_submitted" : "application_updated",
            description: app.status === "pending" 
              ? `Applied to ${app.job?.title || "Unknown Job"}`
              : `Application ${app.status} for ${app.job?.title || "Unknown Job"}`,
            relatedJob: app.job ? { title: app.job.title, _id: app.job._id } : null,
            createdAt: app.updatedAt,
            metadata: { status: app.status },
          });
        });
      } else if (req.user.role === "company") {
        const jobs = await Job.find({ company: req.user._id }).sort({ createdAt: -1 });
        const jobIds = jobs.map((job) => job._id);

        // Get recent applications to company's jobs
        const applications = await Application.find({ job: { $in: jobIds } })
          .populate("job", "title")
          .populate("applicant", "name")
          .sort({ createdAt: -1 })
          .limit(Math.floor(limit / 2));

        applications.forEach((app) => {
          const description = app.status === "pending"
            ? `${app.applicant?.name || "Someone"} applied to ${app.job?.title || "your job"}`
            : `${app.applicant?.name || "Applicant"} ${app.status} for ${app.job?.title || "your job"}`;
          
          activities.push({
            _id: app._id,
            type: app.status === "pending" ? "application_received" : "application_updated",
            description,
            relatedJob: app.job ? { title: app.job.title, _id: app.job._id } : null,
            createdAt: app.createdAt,
            metadata: { 
              status: app.status,
              applicantName: app.applicant?.name,
            },
          });
        });

        // Add job posting activities
        jobs.slice(0, Math.floor(limit / 2)).forEach((job) => {
          const description = job.status === "open"
            ? `Posted job: ${job.title}`
            : `Updated job status to ${job.status}: ${job.title}`;
          
          activities.push({
            _id: job._id,
            type: job.status === "open" ? "job_posted" : "job_updated",
            description,
            relatedJob: { title: job.title, _id: job._id },
            createdAt: job.createdAt,
            metadata: { 
              status: job.status,
              applicationsCount: job.applicationsCount || 0,
            },
          });
        });
      }

      activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ activities: activities.slice(0, limit) });
  } catch (error) {
    console.error("Get activity error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
