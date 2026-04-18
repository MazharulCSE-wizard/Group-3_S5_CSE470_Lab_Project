const nodemailer = require("nodemailer");
const he = require("he");


const createTransporter = () => {

  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
 
    console.log("Email service not configured. Using test transporter.");
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@oseek.com",
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    

    if (!process.env.EMAIL_SERVICE) {
      console.log("Test email:", {
        to,
        subject,
        message: info.message ? info.message.toString() : text,
      });
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

const sendBulkEmail = async (recipients) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendEmail(recipient);
    results.push({
      to: recipient.to,
      success: result.success,
      error: result.error || null,
    });
    

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  return results;
};

const sendWishlistNotification = async (userEmail, jobTitle, jobId) => {
  const subject = `Job Alert: ${jobTitle} is now available!`;
  const text = `Good news! A job you saved in your wishlist is now open for applications.

Job Title: ${jobTitle}

Apply now before it's too late!

View Job: ${process.env.FRONTEND_URL || "http://localhost:3000"}/jobs/${jobId}

Best regards,
OSEEK Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Job Alert!</h2>
      <p>Good news! A job you saved in your wishlist is now open for applications.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">${he.escape(jobTitle)}</h3>
      </div>
      <p>Apply now before it's too late!</p>
      <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/jobs/${jobId}" 
         style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
        View Job
      </a>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>OSEEK Team</p>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
};

const sendInterviewInvitation = async (applicantEmail, jobTitle, companyName, message) => {
  const subject = `Interview Invitation: ${jobTitle} at ${companyName}`;
  const text = `Congratulations! You've been invited for an interview.

Job Title: ${jobTitle}
Company: ${companyName}

Message from the company:
${message}

Best regards,
OSEEK Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Interview Invitation!</h2>
      <p>Congratulations! You've been invited for an interview.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Job Title:</strong> ${he.escape(jobTitle)}</p>
        <p><strong>Company:</strong> ${he.escape(companyName)}</p>
      </div>
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Message from the company:</strong></p>
        <p style="margin: 10px 0 0 0;">${he.escape(message).replace(/\n/g, "<br/>")}</p>
      </div>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>OSEEK Team</p>
    </div>
  `;

  return sendEmail({ to: applicantEmail, subject, text, html });
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  sendWishlistNotification,
  sendInterviewInvitation,
};
