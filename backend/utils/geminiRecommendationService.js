const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const { Job, JobSeekerProfile, Application, Wishlist, CompanyProfile } = require("../models");


const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const MIN_MATCH_SCORE = 0.25; // Lowered to be more inclusive
const MAX_JOBS_PER_REQUEST = 50; 

const isGeminiAvailable = () => {
  return process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "";
};

// Track if Gemini has failed - to avoid repeated failed calls
let geminiFailedRecently = false;
let geminiFailedAt = null;
const GEMINI_RETRY_AFTER_MS = 5 * 60 * 1000; // Retry after 5 minutes

const shouldSkipGemini = () => {
  if (!geminiFailedRecently) return false;
  if (Date.now() - geminiFailedAt > GEMINI_RETRY_AFTER_MS) {
    geminiFailedRecently = false;
    return false;
  }
  return true;
};

const markGeminiFailed = () => {
  geminiFailedRecently = true;
  geminiFailedAt = Date.now();
};


const initializeGemini = () => {
  if (!isGeminiAvailable()) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};


const formatUserProfile = (profile) => {
  const userProfile = {
    skills: profile.skills || [],
    location: profile.location || "Not specified",
    experience: profile.experience?.map(exp => ({
      title: exp.title,
      company: exp.company,
      duration: exp.duration,
      description: exp.description || "",
    })) || [],
    education: profile.education?.map(edu => ({
      school: edu.school,
      degree: edu.degree,
      year: edu.year,
    })) || [],
    headline: profile.headline || "",
    bio: profile.bio || "",
  };
  return userProfile;
};

const formatJobs = (jobs) => {
  return jobs.map(job => ({
    id: job._id.toString(),
    title: job.title,
    description: job.description?.substring(0, 500) || "", // Limit description length
    location: job.location,
    type: job.type,
    skills: job.skills || [],
    experience: job.experience || "",
    companyName: job.companyName || "",
  }));
};

/**
 * Check if user profile has enough information for recommendations
 */
const isProfileComplete = (profile) => {
  if (!profile) return false;
  
  // Check if profile has at least some basic information
  const hasSkills = profile.skills && profile.skills.length > 0;
  const hasLocation = profile.location && profile.location.trim() !== "";
  const hasExperience = profile.experience && profile.experience.length > 0;
  const hasEducation = profile.education && profile.education.length > 0;
  const hasHeadline = profile.headline && profile.headline.trim() !== "";
  const hasBio = profile.bio && profile.bio.trim() !== "";
  
  // Profile is considered complete if it has at least one of these fields
  const filledFields = [hasSkills, hasLocation, hasExperience, hasEducation, hasHeadline, hasBio].filter(Boolean).length;
  return filledFields >= 1; // At least one field should be filled
};

const getGeminiRecommendations = async (userId, limit = 10) => {
  try {
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

    const applications = await Application.find({ applicant: userId }).select("job");
    const appliedJobIds = applications.map(app => app.job.toString());

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

    const jobsToProcess = jobs.slice(0, MAX_JOBS_PER_REQUEST);
    if (jobs.length > MAX_JOBS_PER_REQUEST) {
      console.log(`Processing ${MAX_JOBS_PER_REQUEST} out of ${jobs.length} available jobs to stay within API limits`);
    }

    const userProfile = formatUserProfile(profile);
    const formattedJobs = formatJobs(jobsToProcess);

    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are an expert AI job recommendation system. Your task is to match a job seeker with suitable job postings based on their profile.

## USER PROFILE:
- Skills: ${userProfile.skills.length > 0 ? userProfile.skills.join(", ") : "Not specified"}
- Location: ${userProfile.location}
- Headline: ${userProfile.headline || "Not specified"}
- Bio: ${userProfile.bio || "Not specified"}
- Work Experience: ${userProfile.experience.length > 0 ? JSON.stringify(userProfile.experience) : "No experience listed"}
- Education: ${userProfile.education.length > 0 ? JSON.stringify(userProfile.education) : "No education listed"}

## AVAILABLE JOBS:
${JSON.stringify(formattedJobs, null, 2)}

## MATCHING CRITERIA:
Analyze each job and determine suitability based on:

1. **Skills Match** (Most Important): 
   - Direct skill matches
   - SYNONYMS and related technologies (e.g., "React" matches "ReactJS", "React.js", "Frontend Development")
   - Related skill clusters (e.g., "Python" relates to "Django", "Flask", "Data Science")
   - Transferable skills

2. **Experience Alignment**:
   - Job titles that are similar or represent career progression
   - Industry experience relevance
   - Years of experience compatibility

3. **Location Compatibility**:
   - Same city/region
   - Remote jobs are universally compatible
   - Willingness to relocate (assume moderate flexibility)

4. **Career Trajectory**:
   - Does this job align with the user's career goals (based on headline/bio)?
   - Is it a logical next step in their career?

## IMPORTANT MATCHING RULES:
- Consider synonyms and related terms (JavaScript === JS, Machine Learning === ML === AI)
- Consider skill hierarchy (knowing "React" implies knowledge of "JavaScript", "HTML", "CSS")
- A "Frontend Developer" can match "React Developer", "UI Developer", "Web Developer" roles
- Be inclusive - if there's reasonable relevance, include the job with appropriate score
- Even partial matches are valuable - a 40% match might still be a good opportunity

## OUTPUT FORMAT:
Return ONLY a valid JSON array (no markdown, no explanation, just the JSON):
[
  {
    "jobId": "exact_job_id_from_list",
    "matchScore": 0.75,
    "skillMatch": 0.80,
    "locationMatch": 0.90,
    "experienceMatch": 0.70,
    "reasoning": "Brief 1-2 sentence explanation"
  }
]

## RULES:
- Return up to ${limit} best matching jobs
- matchScore: 0.0 to 1.0 (weighted average of all factors, skills weighted highest)
- Include jobs with matchScore >= ${MIN_MATCH_SCORE}
- Sort by matchScore descending
- If NO jobs match at all, return empty array []
- ONLY return the JSON array, nothing else`;

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the response
    let recommendations;
    try {
      // Remove any markdown code blocks if present
      let cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Also try to extract JSON array if there's extra text
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      recommendations = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response");
      console.error("Parse error:", parseError.message);
      console.error("Response excerpt (first 300 chars):", text.substring(0, 300));
      // Fallback to empty array if parsing fails
      recommendations = [];
    }

    // Validate and format recommendations
    if (!Array.isArray(recommendations)) {
      console.error("Gemini response is not an array:", recommendations);
      return { recommendations: [], message: "NO_SUITABLE_JOBS" };
    }

    // Match recommendations with full job data
    const recommendedJobs = recommendations
      .filter(rec => rec.jobId && rec.matchScore >= MIN_MATCH_SCORE)
      .map(rec => {
        const job = jobs.find(j => j._id.toString() === rec.jobId);
        if (!job) return null;

        return {
          job,
          score: rec.matchScore,
          reasoning: rec.reasoning || "AI-powered match based on your profile",
          breakdown: {
            skillMatch: rec.skillMatch ? (rec.skillMatch * 100).toFixed(1) : (rec.matchScore * 100).toFixed(1),
            locationMatch: rec.locationMatch ? (rec.locationMatch * 100).toFixed(1) : "N/A",
            experienceMatch: rec.experienceMatch ? (rec.experienceMatch * 100).toFixed(1) : "N/A",
            typeMatch: "N/A", // Will be calculated on frontend if needed
          },
        };
      })
      .filter(rec => rec !== null)
      .slice(0, limit);

    if (recommendedJobs.length === 0) {
      return { recommendations: [], message: "NO_SUITABLE_JOBS" };
    }

    return { recommendations: recommendedJobs, message: "SUCCESS" };
  } catch (error) {
    console.error("Gemini recommendation error:", error);
    // Re-throw with error code for proper handling
    throw error;
  }
};

/**
 * AI-powered job description analysis and improvement suggestions
 */
const analyzeJobPosting = async (jobData) => {
  if (!isGeminiAvailable()) {
    throw new Error("Gemini API is not configured");
  }

  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a job posting optimization expert. Analyze the following job posting and provide improvement suggestions.

Job Posting:
- Title: ${jobData.title}
- Description: ${jobData.description || "Not provided"}
- Location: ${jobData.location || "Not specified"}
- Type: ${jobData.type || "Not specified"}
- Skills Required: ${(jobData.skills || []).join(", ") || "None listed"}
- Experience: ${jobData.experience || "Not specified"}
- Salary Range: ${jobData.salary ? `${jobData.salary.min}-${jobData.salary.max} ${jobData.salary.currency}` : "Not specified"}

Provide your analysis in the following JSON format:
{
  "overallScore": <number 1-100>,
  "strengths": [<list of 2-3 positive aspects>],
  "improvements": [
    {
      "area": "<area to improve>",
      "suggestion": "<specific improvement suggestion>",
      "priority": "<high/medium/low>"
    }
  ],
  "suggestedKeywords": [<list of 3-5 keywords to add>],
  "competitiveness": "<rating: excellent/good/average/needs work>",
  "summary": "<2-3 sentence summary>"
}

Return ONLY the JSON object, no markdown or additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse and validate response
    let analysis;
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini analysis response:", parseError);
      // Return a default analysis structure
      return {
        overallScore: 0,
        strengths: ["Unable to analyze at this time"],
        improvements: [],
        suggestedKeywords: [],
        competitiveness: "needs review",
        summary: "AI analysis temporarily unavailable. Please try again later.",
        error: true,
      };
    }

    return analysis;
  } catch (error) {
    console.error("Gemini job analysis error:", error);
    throw error;
  }
};

/**
 * AI-powered candidate-job matching analysis
 */
const analyzeCandidate = async (candidateProfile, jobData) => {
  if (!isGeminiAvailable()) {
    throw new Error("Gemini API is not configured");
  }

  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are an expert recruiter. Analyze how well this candidate matches the job requirements.

Candidate Profile:
- Name: ${candidateProfile.fullName || "Anonymous"}
- Headline: ${candidateProfile.headline || "Not provided"}
- Skills: ${(candidateProfile.skills || []).join(", ") || "None listed"}
- Location: ${candidateProfile.location || "Not specified"}
- Bio: ${candidateProfile.bio || "Not provided"}
- Experience: ${candidateProfile.experience?.map(e => `${e.title} at ${e.company} (${e.duration})`).join("; ") || "No experience listed"}
- Education: ${candidateProfile.education?.map(e => `${e.degree} from ${e.school} (${e.year})`).join("; ") || "No education listed"}

Job Requirements:
- Title: ${jobData.title}
- Description: ${jobData.description || "Not provided"}
- Required Skills: ${(jobData.skills || []).join(", ") || "None specified"}
- Experience Required: ${jobData.experience || "Not specified"}
- Location: ${jobData.location || "Not specified"}

Provide your analysis in the following JSON format:
{
  "matchScore": <number 0-100>,
  "skillsMatch": {
    "matched": [<list of matching skills>],
    "missing": [<list of missing but required skills>],
    "bonus": [<additional relevant skills the candidate has>]
  },
  "experienceMatch": "<assessment of experience fit>",
  "locationFit": "<assessment of location compatibility>",
  "strengths": [<list of 2-3 candidate strengths for this role>],
  "concerns": [<list of any concerns or gaps>],
  "recommendation": "<hire/consider/not recommended>",
  "summary": "<2-3 sentence overall assessment>"
}

Return ONLY the JSON object, no markdown or additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini candidate analysis:", parseError);
      return {
        matchScore: 0,
        skillsMatch: { matched: [], missing: [], bonus: [] },
        experienceMatch: "Unable to analyze",
        locationFit: "Unable to analyze",
        strengths: [],
        concerns: [],
        recommendation: "review manually",
        summary: "AI analysis temporarily unavailable.",
        error: true,
      };
    }

    return analysis;
  } catch (error) {
    console.error("Gemini candidate analysis error:", error);
    throw error;
  }
};

module.exports = {
  getGeminiRecommendations,
  isGeminiAvailable,
  shouldSkipGemini,
  markGeminiFailed,
  analyzeJobPosting,
  analyzeCandidate,
};
