const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hello@consx.io",  // Your Gmail address
    pass: "nnlb qqum zmjk zyna",  // Use the App Password you generated
  },
});

const mailOptions = {
  from: "hello@consx.io",
  to: "sobimpeeniola@gmail.com",  // Recipient email
  subject: "Test Email",
  text: "This is a test email.",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Error sending email:", error);
  } else {
    console.log("Email sent:", info.response);
  }
});
