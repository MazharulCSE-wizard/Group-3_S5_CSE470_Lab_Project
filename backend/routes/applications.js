const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const he = require("he");
const { Application, Job, JobSeekerProfile, ActivityLog, User, CompanyProfile, Notification } = require("../models");
const { auth, authorize } = require("../middleware");
const { sendInterviewInvitation, sendEmail } = require("../utils/emailService");
const { analyzeCandidate, isGeminiAvailable } = require("../utils/geminiRecommendationService");

/**
 * @swagger
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         job:
 *           type: string
 *         applicant:
 *           type: string
 *         coverLetter:
 *           type: string
 *         resumeUrl:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, reviewing, shortlisted, interview, rejected, hired, accepted]
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ApplicationCreateRequest:
 *       type: object
 *       required:
 *         - jobId
 *       properties:
 *         jobId:
 *           type: string
 *         coverLetter:
 *           type: string
 *         resumeUrl:
 *           type: string
 */

/**
 * @swagger
 * /api/applications:
 *   post:
 *     summary: Apply to a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplicationCreateRequest'
 *     responses:
 *       201:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         description: Already applied or job closed
 *       404:
 *         description: Job not found
 */
router.post("/", auth, authorize("seeker"), async (req, res) => {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.status !== "open") {
      return res.status(400).json({ message: "This job is no longer accepting applications" });
    }

    
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({ message: "You have already applied for this job" });
    }

    
    let resumeUrlToSave = resumeUrl;
    if (!resumeUrlToSave) {
      const profile = await JobSeekerProfile.findOne({ user: req.user._id });
      resumeUrlToSave = profile?.resumeUrl || "";
    }

    const application = new Application({
      job: jobId,
      applicant: req.user._id,
      coverLetter: coverLetter || "",
      resumeUrl: resumeUrlToSave,
    });

    await application.save();

    
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      type: "application_submitted",
      description: `Applied to ${job.title}`,
      relatedJob: jobId,
      relatedApplication: application._id,
    });

    // Create notification for company
    try {
      const applicantProfile = await JobSeekerProfile.findOne({ user: req.user._id });
      const applicantName = applicantProfile?.fullName || req.user.name || "A candidate";
      
      await Notification.create({
        user: job.company,
        type: "new_application",
        title: "New Job Application",
        message: `${applicantName} has applied for your job posting: ${job.title}`,
        relatedJob: jobId,
        metadata: {
          applicationId: application._id,
          applicantId: req.user._id,
          applicantName: applicantName,
        },
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the request if notification fails
    }

    res.status(201).json(application);
  } catch (error) {
    console.error("Apply error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/my-applications:
 *   get:
 *     summary: Get all applications by the logged-in job seeker
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Application'
 */
router.get("/my-applications", auth, authorize("seeker"), async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate({
        path: "job",
        populate: {
          path: "company",
          select: "name",
        },
      })
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error("Get my applications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/job/{jobId}:
 *   get:
 *     summary: Get all applications for a specific job (company only)
 *     tags: [Applications]
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
 *         description: List of applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Application'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Job not found
 */
router.get("/job/:jobId", auth, authorize("company"), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view these applications" });
    }

    // Use aggregation with $lookup to avoid N+1 query problem
    const applicationsWithProfiles = await Application.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(req.params.jobId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "applicant",
          foreignField: "_id",
          as: "applicantUser"
        }
      },
      {
        $lookup: {
          from: "jobseekerprofiles",
          localField: "applicant",
          foreignField: "user",
          as: "applicantProfile"
        }
      }
    ]);

    // Flatten the arrays and format the response
    const formattedApplications = applicationsWithProfiles.map(app => {
      const applicantUser = app.applicantUser && app.applicantUser[0];
      const applicantProfile = app.applicantProfile && app.applicantProfile[0];
      // Remove the lookup arrays from the response
      const { applicantUser: _, applicantProfile: __, ...appData } = app;
      return {
        ...appData,
        applicant: {
          _id: applicantUser?._id,
          name: applicantUser?.name,
          email: applicantUser?.email
        },
        applicantProfile: applicantProfile || null,
      };
    });

    res.json(formattedApplications);
  } catch (error) {
    console.error("Get job applications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/{id}/status:
 *   put:
 *     summary: Update application status (company only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewing, shortlisted, interview, rejected, hired, accepted]
 *     responses:
 *       200:
 *         description: Application status updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Application not found
 */
router.put("/:id/status", auth, authorize("company"), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "reviewing", "shortlisted", "interview", "rejected", "hired", "accepted"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const application = await Application.findById(req.params.id).populate("job");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this application" });
    }

    application.status = status;
    await application.save();

    // Log activity
    await ActivityLog.create({
      user: application.applicant,
      type: "application_updated",
      description: `Application status updated to ${status} for ${application.job.title}`,
      relatedJob: application.job._id,
      relatedApplication: application._id,
    });

    // Create notification for applicant
    try {
      const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
      const companyName = companyProfile?.companyName || "A company";
      
      // Create more user-friendly status messages
      const statusMessages = {
        pending: "Your application is now pending review",
        reviewing: "Your application is being reviewed",
        shortlisted: "Congratulations! You've been shortlisted",
        interview: "You've been invited for an interview",
        rejected: "Your application status has been updated",
        hired: "Congratulations! You've been hired",
        accepted: "Your acceptance has been confirmed"
      };

      await Notification.create({
        user: application.applicant,
        type: "application_status_update",
        title: "Application Status Updated",
        message: `${companyName} has updated your application for "${application.job.title}": ${statusMessages[status] || `Status changed to ${status}`}`,
        relatedJob: application.job._id,
        metadata: {
          applicationId: application._id,
          jobTitle: application.job.title,
          newStatus: status,
          companyName: companyName,
        },
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the request if notification fails
    }

    res.json(application);
  } catch (error) {
    console.error("Update application status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/{id}:
 *   delete:
 *     summary: Withdraw an application (seeker only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application withdrawn
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Application not found
 */
router.delete("/:id", auth, authorize("seeker"), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to withdraw this application" });
    }

    const jobId = application.job;

    await Application.findByIdAndDelete(req.params.id);

    await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: -1 } });

    res.json({ message: "Application withdrawn successfully" });
  } catch (error) {
    console.error("Withdraw application error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/{id}/call-for-interview:
 *   post:
 *     summary: Call an applicant for interview (company only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interview invitation sent
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Application not found
 */
router.post("/:id/call-for-interview", auth, authorize("company"), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const application = await Application.findById(req.params.id)
      .populate("job")
      .populate("applicant", "name email");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get company profile
    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const companyName = companyProfile?.companyName || req.user.name;

    // Send interview invitation email
    await sendInterviewInvitation(
      application.applicant.email,
      application.job.title,
      companyName,
      message
    );

    // Update application status to interview
    application.status = "interview";
    await application.save();

    // Log activity
    await ActivityLog.create({
      user: application.applicant._id,
      type: "interview_scheduled",
      description: `Interview scheduled for ${application.job.title}`,
      relatedJob: application.job._id,
      relatedApplication: application._id,
      metadata: { companyName },
    });

    res.json({ message: "Interview invitation sent successfully", application });
  } catch (error) {
    console.error("Call for interview error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/{id}/send-email:
 *   post:
 *     summary: Send a direct email to an applicant (company only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Application not found
 */
router.post("/:id/send-email", auth, authorize("company"), async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    const application = await Application.findById(req.params.id)
      .populate("job")
      .populate("applicant", "name email");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get company profile
    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const companyName = companyProfile?.companyName || req.user.name;

    // Send email
    const emailResult = await sendEmail({
      to: application.applicant.email,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${he.escape(companyName)}</h2>
          <p>Regarding your application for: <strong>${he.escape(application.job.title)}</strong></p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="white-space: pre-wrap;">${he.escape(message)}</p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>${he.escape(companyName)}</p>
        </div>
      `,
    });

    if (!emailResult.success) {
      return res.status(500).json({ message: "Failed to send email" });
    }

    // Create notification for applicant
    try {
      await Notification.create({
        user: application.applicant._id,
        type: "application_update",
        title: `Message from ${companyName}`,
        message: `You received a message regarding your application for "${application.job.title}"`,
        relatedJob: application.job._id,
        metadata: {
          applicationId: application._id,
          companyName: companyName,
          emailSubject: subject,
        },
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    res.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Send email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/job/{jobId}/bulk-email:
 *   post:
 *     summary: Send bulk email to applicants for a specific job (company only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               status:
 *                 type: string
 *                 description: Optional - filter by application status
 *     responses:
 *       200:
 *         description: Bulk email sent
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Job not found
 */
router.post("/job/:jobId/bulk-email", auth, authorize("company"), async (req, res) => {
  try {
    const { subject, message, status } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find applications
    const query = { job: req.params.jobId };
    if (status) {
      query.status = status;
    }

    const applications = await Application.find(query).populate("applicant", "name email");

    if (applications.length === 0) {
      return res.status(404).json({ message: "No applicants found" });
    }

    // Get company profile
    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const companyName = companyProfile?.companyName || req.user.name;

    // Prepare emails
    const emailRecipients = applications.map((app) => ({
      to: app.applicant.email,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${he.escape(companyName)}</h2>
          <p>Regarding your application for: <strong>${he.escape(job.title)}</strong></p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="white-space: pre-wrap;">${he.escape(message)}</p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>${he.escape(companyName)}</p>
        </div>
      `,
    }));

    // Send bulk emails
    const { sendBulkEmail } = require("../utils/emailService");
    const results = await sendBulkEmail(emailRecipients);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      message: "Bulk email sent",
      total: applications.length,
      success: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error("Bulk email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/applications/{id}/ai-analyze:
 *   get:
 *     summary: Get AI-powered analysis of how well a candidate matches the job
 *     description: Uses AI to analyze candidate-job fit and provide hiring recommendations
 *     tags: [Applications, AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: AI analysis of candidate-job match
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Application not found
 *       503:
 *         description: AI service not available
 */
router.get("/:id/ai-analyze", auth, authorize("company"), async (req, res) => {
  try {
    // Check if AI is available
    if (!isGeminiAvailable()) {
      return res.status(503).json({
        message: "AI analysis is not available. Please configure the Gemini API key.",
        available: false,
      });
    }

    const application = await Application.findById(req.params.id)
      .populate("job")
      .populate("applicant", "name email");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to analyze this application" });
    }

    // Get the applicant's profile
    const applicantProfile = await JobSeekerProfile.findOne({ user: application.applicant._id });

    if (!applicantProfile) {
      return res.status(404).json({ message: "Applicant profile not found" });
    }

    // Perform AI analysis
    const analysis = await analyzeCandidate(applicantProfile, application.job);

    res.json({
      analysis,
      aiEnabled: true,
      applicant: {
        name: applicantProfile.fullName || application.applicant.name,
        email: application.applicant.email,
      },
      job: {
        title: application.job.title,
        _id: application.job._id,
      },
      message: "AI analysis completed successfully",
    });
  } catch (error) {
    console.error("Candidate analysis error:", error);
    res.status(500).json({ message: "Error analyzing candidate" });
  }
});

module.exports = router;
