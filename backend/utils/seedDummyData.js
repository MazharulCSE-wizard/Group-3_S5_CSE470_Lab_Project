const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User, JobSeekerProfile, CompanyProfile, Job, Application, ActivityLog, ProfileView, Notification } = require("../models");

/**
 * WARNING: This is a development-only seeding script for testing purposes.
 * DO NOT use this in production environments.
 * It creates test users with hardcoded passwords and should only be used in development/staging.
 */
const seedDummyData = async () => {
  try {
    console.log("🌱 Starting database seeding with dummy data...");
    console.log("⚠️  WARNING: This is for development/testing only!");

    // Create test seeker with specific email
    // Note: Using hardcoded password for testing - NOT for production use
    const seekerPassword = await bcrypt.hash("testpass123", 10);
    let testSeeker = await User.findOne({ email: "muztahiddurjoy99@gmail.com" });
    
    if (!testSeeker) {
      testSeeker = await User.create({
        name: "Muztahid Durjoy",
        email: "muztahiddurjoy99@gmail.com",
        password: seekerPassword,
        role: "seeker",
      });
      console.log("✅ Created test seeker user");
    } else {
      console.log("✅ Test seeker user already exists");
    }

    // Create or update seeker profile with comprehensive data
    let seekerProfile = await JobSeekerProfile.findOne({ user: testSeeker._id });
    
    if (!seekerProfile) {
      seekerProfile = await JobSeekerProfile.create({
        user: testSeeker._id,
        fullName: "Muztahid Durjoy",
        headline: "Full Stack Developer | React, Node.js, MongoDB Expert",
        bio: "Experienced full-stack developer with 5+ years of experience building scalable web applications. Passionate about modern JavaScript frameworks and creating excellent user experiences. Specializing in MERN stack development with expertise in React, Node.js, Express, and MongoDB.",
        location: "Dhaka, Bangladesh",
        phone: "+8801712345678",
        skills: ["JavaScript", "React", "Node.js", "MongoDB", "Express", "TypeScript", "Python", "Django", "PostgreSQL", "AWS", "Docker", "Git", "REST APIs", "GraphQL"],
        experience: [
          {
            title: "Senior Full Stack Developer",
            company: "Tech Solutions Ltd",
            duration: "Jan 2021 - Present",
            description: "Leading development of enterprise web applications using MERN stack. Mentoring junior developers and conducting code reviews.",
          },
          {
            title: "Full Stack Developer",
            company: "StartupXYZ",
            duration: "Jun 2019 - Dec 2020",
            description: "Developed and maintained multiple client projects using React and Node.js. Implemented RESTful APIs and database solutions.",
          },
          {
            title: "Junior Web Developer",
            company: "WebDev Agency",
            duration: "Jan 2018 - May 2019",
            description: "Built responsive websites and learned full-stack development fundamentals.",
          },
        ],
        education: [
          {
            degree: "BSc in Computer Science",
            institution: "University of Dhaka",
            year: "2017",
            description: "Graduated with honors. Specialized in software engineering and database systems.",
          },
        ],
        resumeUrl: "https://example.com/resume.pdf",
      });
      console.log("✅ Created seeker profile");
    } else {
      // Update existing profile
      seekerProfile.fullName = "Muztahid Durjoy";
      seekerProfile.headline = "Full Stack Developer | React, Node.js, MongoDB Expert";
      seekerProfile.bio = "Experienced full-stack developer with 5+ years of experience building scalable web applications. Passionate about modern JavaScript frameworks and creating excellent user experiences. Specializing in MERN stack development with expertise in React, Node.js, Express, and MongoDB.";
      seekerProfile.location = "Dhaka, Bangladesh";
      seekerProfile.skills = ["JavaScript", "React", "Node.js", "MongoDB", "Express", "TypeScript", "Python", "Django", "PostgreSQL", "AWS", "Docker", "Git", "REST APIs", "GraphQL"];
      if (!seekerProfile.experience || seekerProfile.experience.length === 0) {
        seekerProfile.experience = [
          {
            title: "Senior Full Stack Developer",
            company: "Tech Solutions Ltd",
            duration: "Jan 2021 - Present",
            description: "Leading development of enterprise web applications using MERN stack.",
          },
        ];
      }
      await seekerProfile.save();
      console.log("✅ Updated seeker profile");
    }

    // Create dummy companies
    const companyPassword = await bcrypt.hash("company123", 10);
    const companyData = [
      {
        name: "TechCorp Solutions",
        email: "hr@techcorp.com",
        companyName: "TechCorp Solutions",
        website: "https://techcorp.com",
        description: "Leading technology solutions provider specializing in enterprise software development and cloud services.",
        industry: "Technology",
        size: "100-500 employees",
      },
      {
        name: "Digital Innovations Inc",
        email: "careers@digitalinnovations.com",
        companyName: "Digital Innovations Inc",
        website: "https://digitalinnovations.com",
        description: "Cutting-edge digital transformation company helping businesses modernize their operations.",
        industry: "Technology",
        size: "50-100 employees",
      },
      {
        name: "CloudTech Systems",
        email: "jobs@cloudtech.com",
        companyName: "CloudTech Systems",
        website: "https://cloudtech.com",
        description: "Cloud infrastructure and DevOps solutions provider for modern businesses.",
        industry: "Cloud Services",
        size: "200-500 employees",
      },
    ];

    const companies = [];
    for (const compData of companyData) {
      let company = await User.findOne({ email: compData.email });
      if (!company) {
        company = await User.create({
          name: compData.name,
          email: compData.email,
          password: companyPassword,
          role: "company",
        });
        console.log(`✅ Created company user: ${compData.name}`);
      }

      let companyProfile = await CompanyProfile.findOne({ user: company._id });
      if (!companyProfile) {
        companyProfile = await CompanyProfile.create({
          user: company._id,
          companyName: compData.companyName,
          website: compData.website,
          description: compData.description,
          industry: compData.industry,
          size: compData.size,
          location: "Dhaka, Bangladesh",
        });
        console.log(`✅ Created company profile: ${compData.companyName}`);
      }

      companies.push(company);
    }

    // Create diverse job postings
    const jobsData = [
      {
        company: companies[0]._id,
        title: "Senior Full Stack Developer",
        description: "We are looking for an experienced Full Stack Developer to join our team. You will work on building scalable web applications using modern technologies. Requirements: 5+ years of experience with React, Node.js, MongoDB, and Express. Strong understanding of RESTful APIs, microservices architecture, and cloud platforms like AWS. Experience with TypeScript and Docker is a plus.",
        location: "Dhaka, Bangladesh",
        type: "full-time",
        salary: { min: 80000, max: 120000, currency: "USD" },
        skills: ["React", "Node.js", "MongoDB", "Express", "TypeScript", "AWS", "Docker"],
        experience: "5+ years",
        status: "open",
      },
      {
        company: companies[1]._id,
        title: "React Frontend Developer",
        description: "Join our dynamic team as a React Frontend Developer. You will be responsible for creating beautiful, responsive user interfaces. Requirements: 3+ years of experience with React, JavaScript, and modern CSS frameworks. Experience with state management (Redux, Context API), TypeScript, and testing libraries (Jest, React Testing Library).",
        location: "Remote",
        type: "remote",
        salary: { min: 60000, max: 90000, currency: "USD" },
        skills: ["React", "JavaScript", "TypeScript", "Redux", "CSS", "HTML", "Jest"],
        experience: "3-5 years",
        status: "open",
      },
      {
        company: companies[2]._id,
        title: "DevOps Engineer",
        description: "We're seeking a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. Requirements: 4+ years of experience with AWS/Azure, Docker, Kubernetes, and CI/CD tools. Strong knowledge of Infrastructure as Code (Terraform, CloudFormation), monitoring tools (Prometheus, Grafana), and scripting languages (Python, Bash).",
        location: "Dhaka, Bangladesh",
        type: "full-time",
        salary: { min: 70000, max: 110000, currency: "USD" },
        skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Python", "Jenkins", "Git"],
        experience: "4+ years",
        status: "open",
      },
      {
        company: companies[0]._id,
        title: "Backend Node.js Developer",
        description: "Looking for a Backend Developer specializing in Node.js to build robust APIs and microservices. Requirements: 3+ years of experience with Node.js, Express, MongoDB/PostgreSQL. Experience with message queues (RabbitMQ, Kafka), caching (Redis), and building RESTful/GraphQL APIs. Knowledge of design patterns and clean code principles.",
        location: "Dhaka, Bangladesh",
        type: "full-time",
        salary: { min: 65000, max: 95000, currency: "USD" },
        skills: ["Node.js", "Express", "MongoDB", "PostgreSQL", "Redis", "GraphQL", "Microservices"],
        experience: "3-5 years",
        status: "open",
      },
      {
        company: companies[1]._id,
        title: "Python Django Developer",
        description: "Seeking an experienced Python Django Developer to build web applications and APIs. Requirements: 4+ years of experience with Python, Django, PostgreSQL. Experience with Django REST Framework, Celery, and building scalable applications. Knowledge of front-end technologies is a plus.",
        location: "Remote",
        type: "remote",
        salary: { min: 70000, max: 100000, currency: "USD" },
        skills: ["Python", "Django", "PostgreSQL", "REST APIs", "Celery", "Docker"],
        experience: "4+ years",
        status: "open",
      },
      {
        company: companies[2]._id,
        title: "Full Stack JavaScript Developer",
        description: "Join us as a Full Stack JavaScript Developer working with modern JavaScript technologies. Requirements: 3+ years with JavaScript/TypeScript, React, Node.js. Experience with Next.js, Express, MongoDB, and building end-to-end applications. Familiarity with Agile methodologies.",
        location: "Dhaka, Bangladesh",
        type: "full-time",
        salary: { min: 75000, max: 105000, currency: "USD" },
        skills: ["JavaScript", "TypeScript", "React", "Node.js", "MongoDB", "Next.js", "Express"],
        experience: "3-5 years",
        status: "open",
      },
      {
        company: companies[0]._id,
        title: "Cloud Solutions Architect",
        description: "We need a Cloud Solutions Architect to design and implement cloud infrastructure. Requirements: 5+ years in cloud architecture, AWS/Azure expertise, strong understanding of cloud design patterns, security best practices, and cost optimization strategies.",
        location: "Dhaka, Bangladesh",
        type: "full-time",
        salary: { min: 100000, max: 150000, currency: "USD" },
        skills: ["AWS", "Azure", "Cloud Architecture", "Terraform", "Kubernetes", "Microservices"],
        experience: "5+ years",
        status: "open",
      },
      {
        company: companies[1]._id,
        title: "Mobile App Developer (React Native)",
        description: "Looking for a Mobile App Developer experienced in React Native. Requirements: 3+ years with React Native, JavaScript/TypeScript, mobile app development for iOS and Android. Experience with native modules, app deployment, and performance optimization.",
        location: "Remote",
        type: "remote",
        salary: { min: 65000, max: 95000, currency: "USD" },
        skills: ["React Native", "JavaScript", "TypeScript", "iOS", "Android", "Redux", "Mobile Development"],
        experience: "3-5 years",
        status: "open",
      },
    ];

    const createdJobs = [];
    for (const jobData of jobsData) {
      const existingJob = await Job.findOne({ company: jobData.company, title: jobData.title });
      if (!existingJob) {
        const job = await Job.create(jobData);
        createdJobs.push(job);
        console.log(`✅ Created job: ${jobData.title}`);
      } else {
        createdJobs.push(existingJob);
        console.log(`✅ Job already exists: ${jobData.title}`);
      }
    }

    // Create some applications from test seeker
    const applicationsToCreate = createdJobs.slice(0, 3); // Apply to first 3 jobs
    for (const job of applicationsToCreate) {
      const existingApp = await Application.findOne({ job: job._id, applicant: testSeeker._id });
      if (!existingApp) {
        const application = await Application.create({
          job: job._id,
          applicant: testSeeker._id,
          coverLetter: "I am very interested in this position and believe my skills align perfectly with your requirements.",
          resumeUrl: seekerProfile.resumeUrl,
          status: "pending",
        });

        // Update job application count
        await Job.findByIdAndUpdate(job._id, { $inc: { applicationsCount: 1 } });

        // Create activity log
        await ActivityLog.create({
          user: testSeeker._id,
          type: "application_submitted",
          description: `Applied to ${job.title}`,
          relatedJob: job._id,
          relatedApplication: application._id,
        });

        console.log(`✅ Created application for job: ${job.title}`);
      }
    }

    // Create profile views
    for (const company of companies.slice(0, 2)) {
      const existingView = await ProfileView.findOne({ profile: testSeeker._id, viewer: company._id });
      if (!existingView) {
        await ProfileView.create({
          profile: testSeeker._id,
          viewer: company._id,
          viewerRole: "company",
        });
        console.log(`✅ Created profile view from ${company.name}`);
      }
    }

    // Create some notifications for the test seeker
    const notifications = [
      {
        user: testSeeker._id,
        type: "application_status_update",
        title: "Application Status Updated",
        message: "Your application for Senior Full Stack Developer has been reviewed",
        relatedJob: createdJobs[0]._id,
        isRead: false,
      },
      {
        user: testSeeker._id,
        type: "profile_view",
        title: "Profile Viewed",
        message: "TechCorp Solutions viewed your profile",
        isRead: false,
      },
    ];

    for (const notifData of notifications) {
      const existingNotif = await Notification.findOne({ 
        user: notifData.user, 
        message: notifData.message 
      });
      if (!existingNotif) {
        await Notification.create(notifData);
        console.log(`✅ Created notification: ${notifData.title}`);
      }
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📝 Test Account Details:");
    console.log("Email: muztahiddurjoy99@gmail.com");
    console.log("Password: testpass123");
    console.log("\n📊 Seeded Data Summary:");
    console.log(`- Test Seeker: 1`);
    console.log(`- Companies: ${companies.length}`);
    console.log(`- Jobs: ${createdJobs.length}`);
    console.log(`- Applications: ${applicationsToCreate.length}`);
    console.log(`- Profile Views: 2`);
    console.log(`- Notifications: ${notifications.length}`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
};

module.exports = seedDummyData;
