const mongoose = require("mongoose");
const { Job, JobSeekerProfile, Application, Wishlist } = require("../models");
const { getGeminiRecommendations, isGeminiAvailable, shouldSkipGemini, markGeminiFailed } = require("./geminiRecommendationService");

/**
 * Common skill synonyms and related terms for better matching
 */
const SKILL_SYNONYMS = {
  // JavaScript ecosystem
  "javascript": ["js", "ecmascript", "es6", "es2015", "vanilla js"],
  "typescript": ["ts"],
  "react": ["reactjs", "react.js", "react js"],
  "vue": ["vuejs", "vue.js", "vue js"],
  "angular": ["angularjs", "angular.js"],
  "node": ["nodejs", "node.js", "node js"],
  "express": ["expressjs", "express.js"],
  "nextjs": ["next.js", "next js", "next"],
  
  // Python ecosystem
  "python": ["py", "python3"],
  "django": ["django rest framework", "drf"],
  "flask": ["flask api"],
  "fastapi": ["fast api"],
  
  // Database
  "mongodb": ["mongo", "mongoose"],
  "postgresql": ["postgres", "psql", "pg"],
  "mysql": ["my sql"],
  "sql": ["structured query language", "database"],
  "redis": ["redis cache"],
  
  // Cloud & DevOps
  "aws": ["amazon web services", "amazon aws"],
  "azure": ["microsoft azure", "ms azure"],
  "gcp": ["google cloud", "google cloud platform"],
  "docker": ["containerization", "containers"],
  "kubernetes": ["k8s", "kube"],
  "ci/cd": ["cicd", "continuous integration", "continuous deployment"],
  
  // Mobile
  "react native": ["react-native", "rn"],
  "flutter": ["dart flutter"],
  "ios": ["swift", "objective-c", "apple"],
  "android": ["kotlin", "java android"],
  
  // Data Science / ML
  "machine learning": ["ml", "deep learning", "ai", "artificial intelligence"],
  "data science": ["data analysis", "data analytics"],
  "tensorflow": ["tf"],
  "pytorch": ["torch"],
  
  // Frontend
  "css": ["cascading style sheets", "stylesheet"],
  "html": ["html5", "hypertext markup language"],
  "sass": ["scss"],
  "tailwind": ["tailwindcss", "tailwind css"],
  "bootstrap": ["bootstrap css"],
  
  // General
  "api": ["rest api", "restful", "graphql"],
  "git": ["github", "gitlab", "version control"],
  "agile": ["scrum", "kanban"],
  "full stack": ["fullstack", "full-stack"],
  "frontend": ["front-end", "front end", "ui developer"],
  "backend": ["back-end", "back end", "server-side"],
};

/**
 * Get all synonyms for a skill
 */
const getSkillSynonyms = (skill) => {
  const normalizedSkill = skill.toLowerCase().trim();
  const synonyms = new Set([normalizedSkill]);
  
  // Check if this skill is a key
  if (SKILL_SYNONYMS[normalizedSkill]) {
    SKILL_SYNONYMS[normalizedSkill].forEach(syn => synonyms.add(syn));
  }
  
  // Check if this skill is a synonym of another skill
  for (const [key, values] of Object.entries(SKILL_SYNONYMS)) {
    if (values.includes(normalizedSkill)) {
      synonyms.add(key);
      values.forEach(syn => synonyms.add(syn));
    }
  }
  
  return Array.from(synonyms);
};

/**
 * Calculate similarity score between user skills and job requirements
 * Uses enhanced matching with synonyms
 */
const calculateSkillSimilarity = (userSkills, jobSkills) => {
  if (!userSkills || !jobSkills || userSkills.length === 0 || jobSkills.length === 0) {
    return 0;
  }

  // Expand user skills with synonyms
  const expandedUserSkills = new Set();
  userSkills.forEach(skill => {
    getSkillSynonyms(skill).forEach(syn => expandedUserSkills.add(syn));
  });

  // Expand job skills with synonyms
  const expandedJobSkills = new Set();
  jobSkills.forEach(skill => {
    getSkillSynonyms(skill).forEach(syn => expandedJobSkills.add(syn));
  });

  // Calculate intersection
  const intersection = [...expandedUserSkills].filter(skill =>
    expandedJobSkills.has(skill)
  ).length;

  // Use job skills as the denominator (what percentage of job requirements are met)
  const matchPercentage = intersection / jobSkills.length;
  
  return Math.min(matchPercentage, 1.0);
};

/**
 * Calculate experience match score
 * Extracts years from experience string and compares
 */
const calculateExperienceScore = (userExperience, jobExperience) => {
  if (!jobExperience || !userExperience || userExperience.length === 0) {
    return 0.5; // Neutral score if no experience data
  }

  // Extract years from job requirement (e.g., "2-3 years" -> 2)
  const jobYearsMatch = jobExperience.match(/(\d+)/);
  const jobYears = jobYearsMatch ? parseInt(jobYearsMatch[1]) : 0;

  // Calculate total years from user experience
  let totalUserYears = 0;
  userExperience.forEach(exp => {
    // Try to extract years from duration (e.g., "2 years", "Jan 2020 - Dec 2022")
    const yearsMatch = exp.duration.match(/(\d+)\s*(year|yr)/i);
    if (yearsMatch) {
      totalUserYears += parseInt(yearsMatch[1]);
    } else {
      // Estimate from date range if present
      const dateMatch = exp.duration.match(/\d{4}/g);
      if (dateMatch && dateMatch.length >= 2) {
        const years = parseInt(dateMatch[dateMatch.length - 1]) - parseInt(dateMatch[0]);
        totalUserYears += Math.max(0, years);
      }
    }
  });

  // Score based on experience match
  if (totalUserYears === 0) return 0.3;
  if (totalUserYears >= jobYears) return 1.0;
  // Proportional score if less experience
  return Math.min(totalUserYears / jobYears, 1.0);
};

/**
 * Calculate location match score
 * Handles remote jobs and location matching
 */
const calculateLocationScore = (userLocation, jobLocation, jobType) => {
  if (!userLocation || !jobLocation) return 0.5;

  // Remote jobs get bonus score
  if (jobType === "remote" || jobLocation.toLowerCase().includes("remote")) {
    return 1.0;
  }

  // Normalize locations
  const normalizedUserLoc = userLocation.toLowerCase().trim();
  const normalizedJobLoc = jobLocation.toLowerCase().trim();

  // Exact match
  if (normalizedUserLoc === normalizedJobLoc) return 1.0;

  // Partial match (e.g., same city or state)
  if (normalizedUserLoc.includes(normalizedJobLoc) || normalizedJobLoc.includes(normalizedUserLoc)) {
    return 0.7;
  }

  return 0.3; // Different locations
};

/**
 * Extract keywords from user profile (bio, headline, skills, experience, education)
 */
const extractUserKeywords = (profile) => {
  const keywords = new Set();

  // Add skills
  if (profile.skills) {
    profile.skills.forEach(skill => keywords.add(skill.toLowerCase().trim()));
  }

  // Extract keywords from headline (simple word extraction)
  if (profile.headline) {
    const headlineWords = profile.headline.toLowerCase().match(/\b\w{3,}\b/g) || [];
    headlineWords.forEach(word => keywords.add(word));
  }

  // Extract keywords from bio
  if (profile.bio) {
    const bioWords = profile.bio.toLowerCase().match(/\b\w{3,}\b/g) || [];
    bioWords.forEach(word => keywords.add(word));
  }

  // Add job titles from experience
  if (profile.experience) {
    profile.experience.forEach(exp => {
      const titleWords = exp.title.toLowerCase().match(/\b\w{3,}\b/g) || [];
      titleWords.forEach(word => keywords.add(word));
      // Also add company name keywords
      if (exp.company) {
        const companyWords = exp.company.toLowerCase().match(/\b\w{3,}\b/g) || [];
        companyWords.forEach(word => keywords.add(word));
      }
    });
  }

  // Add education keywords (degree, school, field of study)
  if (profile.education) {
    profile.education.forEach(edu => {
      // Add degree keywords (e.g., "Bachelor", "Computer Science", "Engineering")
      if (edu.degree) {
        const degreeWords = edu.degree.toLowerCase().match(/\b\w{3,}\b/g) || [];
        degreeWords.forEach(word => keywords.add(word));
      }
      // Add school name keywords
      if (edu.school) {
        const schoolWords = edu.school.toLowerCase().match(/\b\w{3,}\b/g) || [];
        schoolWords.forEach(word => keywords.add(word));
      }
    });
  }

  return Array.from(keywords);
};

/**
 * Calculate keyword match score between user profile and job
 */
const calculateKeywordScore = (userKeywords, job) => {
  if (!userKeywords || userKeywords.length === 0) return 0.3;

  const jobText = `${job.title} ${job.description}`.toLowerCase();
  let matchCount = 0;

  userKeywords.forEach(keyword => {
    if (jobText.includes(keyword)) {
      matchCount++;
    }
  });

  return Math.min(matchCount / Math.max(userKeywords.length * 0.3, 1), 1.0);
};

/**
 * Calculate recency bonus
 * Newer jobs get slightly higher scores
 */
const calculateRecencyBonus = (jobCreatedAt) => {
  const daysSinceCreated = (Date.now() - new Date(jobCreatedAt)) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated < 7) return 0.1; // Posted in last week
  if (daysSinceCreated < 30) return 0.05; // Posted in last month
  return 0;
};

/**
 * Check if user profile has enough information for recommendations
 */
const isProfileComplete = (profile) => {
  if (!profile) return false;
  
  const hasSkills = profile.skills && profile.skills.length > 0;
  const hasLocation = profile.location && profile.location.trim() !== "";
  const hasExperience = profile.experience && profile.experience.length > 0;
  const hasEducation = profile.education && profile.education.length > 0;
  const hasHeadline = profile.headline && profile.headline.trim() !== "";
  const hasBio = profile.bio && profile.bio.trim() !== "";
  
  // Profile is considered complete if it has at least one meaningful field
  const filledFields = [hasSkills, hasLocation, hasExperience, hasEducation, hasHeadline, hasBio].filter(Boolean).length;
  return filledFields >= 1;
};

/**
 * Main recommendation algorithm
 * Returns recommended jobs for a user with relevance scores
 * Now uses Gemini API for AI-powered filtering
 */
const getRecommendedJobs = async (userId, limit = 10) => {
  try {
    // Check if Gemini API is available and not recently failed
    if (isGeminiAvailable() && !shouldSkipGemini()) {
      // Use Gemini AI for recommendations
      try {
        const result = await getGeminiRecommendations(userId, limit);
        // Handle the new response format
        if (result && result.recommendations !== undefined) {
          return result; // Return the full result object with recommendations and message
        }
        // Backward compatibility: if result is an array, wrap it
        if (Array.isArray(result)) {
          return { recommendations: result, message: result.length > 0 ? "SUCCESS" : "NO_SUITABLE_JOBS" };
        }
        return result;
      } catch (geminiError) {
        console.error("Gemini API error:", geminiError.message);
        // Re-throw profile-related errors
        if (geminiError.code === "PROFILE_NOT_FOUND" || geminiError.code === "PROFILE_INCOMPLETE") {
          throw geminiError;
        }
        // Mark Gemini as failed to avoid repeated API calls
        markGeminiFailed();
        console.log("Marked Gemini as failed, falling back to traditional algorithm...");
      }
    } else if (shouldSkipGemini()) {
      console.log("Skipping Gemini due to recent failure, using traditional algorithm...");
    }

    // Traditional algorithm (fallback when Gemini is not available or fails)
    // Get user profile
    const profile = await JobSeekerProfile.findOne({ user: userId });
    if (!profile) {
      const error = new Error("User profile not found");
      error.code = "PROFILE_NOT_FOUND";
      throw error;
    }

    // Check if profile has enough information
    if (!isProfileComplete(profile)) {
      const error = new Error("Profile is incomplete");
      error.code = "PROFILE_INCOMPLETE";
      throw error;
    }

    // Get jobs user has already applied to
    const applications = await Application.find({ applicant: userId }).select("job");
    const appliedJobIds = applications.map(app => app.job.toString());

    // Get jobs in user's wishlist
    const wishlistItems = await Wishlist.find({ user: userId }).select("job");
    const wishlistJobIds = wishlistItems.map(item => item.job.toString());

    // Combine excluded job IDs and convert to ObjectIds
    const excludedJobIds = [...appliedJobIds, ...wishlistJobIds];
    const excludedObjectIds = excludedJobIds.length > 0 
      ? excludedJobIds.map(id => new mongoose.Types.ObjectId(id))
      : [];

    // Get all open jobs with company information
    const matchStage = { status: "open" };
    if (excludedObjectIds.length > 0) {
      matchStage._id = { $nin: excludedObjectIds };
    }

    const jobs = await Job.aggregate([
      { $match: matchStage },
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
      },
      {
        $addFields: {
          companyName: {
            $ifNull: [
              { $arrayElemAt: ["$companyProfile.companyName", 0] },
              { $arrayElemAt: ["$companyUser.name", 0] },
              ""
            ]
          }
        }
      },
      {
        $project: {
          companyProfile: 0,
          companyUser: 0
        }
      }
    ]);

    if (jobs.length === 0) {
      return { recommendations: [], message: "NO_JOBS_AVAILABLE" };
    }

    // Extract user keywords
    const userKeywords = extractUserKeywords(profile);

    // Calculate scores for each job
    const jobsWithScores = jobs.map(job => {
      // Skill similarity (40% weight)
      const skillScore = calculateSkillSimilarity(profile.skills, job.skills);

      // Experience match (20% weight)
      const experienceScore = calculateExperienceScore(profile.experience, job.experience);

      // Location match (15% weight)
      const locationScore = calculateLocationScore(profile.location, job.location, job.type);

      // Keyword match (20% weight)
      const keywordScore = calculateKeywordScore(userKeywords, job);

      // Recency bonus (5% weight)
      const recencyBonus = calculateRecencyBonus(job.createdAt);

      // Calculate total weighted score
      const totalScore =
        skillScore * 0.4 +
        experienceScore * 0.2 +
        locationScore * 0.15 +
        keywordScore * 0.2 +
        recencyBonus * 0.05;

      return {
        job,
        score: totalScore,
        reasoning: "Matched based on skills, experience, and location",
        breakdown: {
          skillMatch: (skillScore * 100).toFixed(1),
          experienceMatch: (experienceScore * 100).toFixed(1),
          locationMatch: (locationScore * 100).toFixed(1),
          typeMatch: (keywordScore * 100).toFixed(1),
        },
      };
    });

    // Sort by score (highest first) and return top N
    jobsWithScores.sort((a, b) => b.score - a.score);

    // Filter out jobs with very low scores (< 0.2)
    const relevantJobs = jobsWithScores.filter(item => item.score >= 0.2);
    const recommendations = relevantJobs.slice(0, limit);

    return { 
      recommendations, 
      message: recommendations.length > 0 ? "SUCCESS" : "NO_SUITABLE_JOBS" 
    };
  } catch (error) {
    console.error("Recommendation error:", error);
    throw error;
  }
};

module.exports = {
  getRecommendedJobs,
  calculateSkillSimilarity,
  calculateExperienceScore,
  calculateLocationScore,
  extractUserKeywords,
  isProfileComplete,
};
