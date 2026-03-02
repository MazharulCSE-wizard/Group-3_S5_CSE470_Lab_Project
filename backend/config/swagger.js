const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OSEEK API Documentation",
      version: "1.0.0",
      description: `
# OSEEK - Job Seeking Platform API

OSEEK is a modern job seeking platform that connects job seekers with companies. This API provides all the backend functionality needed to power the platform.

## Features

### Authentication
- User registration with role-based accounts (Job Seeker or Company)
- JWT-based authentication
- Secure password hashing

### Job Seeker Features
- Profile management with personal information
- Skills management (add/remove skills)
- Work experience management
- Education history management
- Job applications
- CV/Resume support

### Company Features
- Company profile management
- Job posting (create, update, delete)
- Application management
- Applicant review and status updates

### Job Features
- Browse and search jobs
- Filter by type, location
- Pagination support
- Real-time application counts

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Error Responses

All endpoints follow a consistent error response format:

\`\`\`json
{
  "message": "Error description"
}
\`\`\`
      `,
      contact: {
        name: "OSEEK Support",
        email: "support@oseek.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication endpoints (signup, login)",
      },
      {
        name: "Job Seeker Profile",
        description: "Manage job seeker profiles, skills, experience, and education",
      },
      {
        name: "Company Profile",
        description: "Manage company profiles",
      },
      {
        name: "Jobs",
        description: "Browse, create, and manage job postings",
      },
      {
        name: "Applications",
        description: "Apply to jobs and manage applications",
      },
      {
        name: "Dashboard",
        description: "Dashboard statistics and activity",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
