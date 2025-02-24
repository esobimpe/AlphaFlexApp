const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const { body, validationResult } = require("express-validator");
const { exec } = require("child_process");
const path = require("path");
const session = require('express-session');
const storageManager = require('./storage-manager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware setup
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000
  }
}));

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Temporary email code storage
let emailCodes = {};
const generateCode = () => Math.floor(10000 + Math.random() * 90000).toString();

// Route to send verification email
app.post(
  "/send-code",
  [body("email").isEmail().withMessage("Invalid email format")],
  async (req, res) => {
    console.log("Received request to send verification code");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation failed:", errors.array());
      return res.status(400).json({ error: "Invalid email address" });
    }

    const { email } = req.body;
    const code = generateCode();
    emailCodes[email] = code;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${code}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Verification code sent to ${email}: ${code}`);
      return res.json({ message: "Verification code sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: "Failed to send email" });
    }
  }
);

// Route to verify code and initialize user data
app.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;
  console.log("Received verification request for:", email);

  if (emailCodes[email] && emailCodes[email] === code) {
    try {
      // Initialize or fetch user data from storage
      let userData = await storageManager.getUserData(email);
      
      if (!userData) {
        // Initialize new user data
        userData = {
          isInvested: false,
          isSoldOut: false,
          totalInvested: 0,
          holdings: [],
          availableBalance: 2000.53,
          createdAt: new Date().toISOString()
        };
        await storageManager.updateUserData(email, userData);
      }

      delete emailCodes[email];
      return res.json({ message: "Verification successful" });
    } catch (error) {
      console.error("Error handling verification:", error);
      return res.status(500).json({ error: "Failed to process verification" });
    }
  } else {
    return res.status(400).json({ error: "Invalid code" });
  }
});

// Route to get portfolio data
app.get("/portfolio", async (req, res) => {
  try {
    // Check cached portfolio data first
    const portfolioData = await storageManager.getPortfolio();
    const now = new Date();
    
    if (!portfolioData || !portfolioData.lastUpdated || 
        (now - new Date(portfolioData.lastUpdated)) > 24 * 60 * 60 * 1000) {
      
      // Fetch new data from Python script
      const scriptPath = path.join(__dirname, 'scripts', 'server.py');
      const { stdout, stderr } = await exec(`python3 ${scriptPath}`);

      if (stderr) {
        console.error("Python debug output:", stderr);
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No valid JSON found in Python output");
      }

      const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
      const newPortfolioData = JSON.parse(jsonStr);
      
      // Cache the new data
      await storageManager.updatePortfolio(newPortfolioData);
      return res.json(newPortfolioData);
    }
    
    return res.json(portfolioData);
  } catch (error) {
    console.error("Error in portfolio route:", error);
    return res.status(500).json({ error: "Failed to fetch portfolio data" });
  }
});

// Route to get performance data
app.get("/performance", async (req, res) => {
  try {
    // Check cached performance data first
    const performanceData = await storageManager.getPerformance();
    const now = new Date();
    
    if (!performanceData || !performanceData.lastUpdated || 
        (now - new Date(performanceData.lastUpdated)) > 24 * 60 * 60 * 1000) {
      
      // Fetch new data from Python script
      const scriptPath = path.join(__dirname, 'scripts', 'performance.py');
      const { stdout, stderr } = await exec(`python3 ${scriptPath}`);

      if (stderr) {
        console.error("Python debug output:", stderr);
      }

      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No valid JSON found in Python output");
      }

      const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
      const newPerformanceData = JSON.parse(jsonStr);
      
      // Cache the new data
      await storageManager.updatePerformance(newPerformanceData);
      return res.json(newPerformanceData);
    }
    
    return res.json(performanceData);
  } catch (error) {
    console.error("Error in performance route:", error);
    return res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// Route to update user data
app.post("/api/user/update", async (req, res) => {
  try {
    const { email, userData } = req.body;
    
    if (!email || !userData) {
      return res.status(400).json({ error: "Email and userData are required" });
    }

    const updatedUser = await storageManager.updateUserData(email, userData);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ error: "Failed to update user data" });
  }
});

// Route to get user data
app.get("/api/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const userData = await storageManager.getUserData(email);
    
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// Import and use Robinhood routes
const robinhoodRoutes = require('./routes/robinhood');
app.use('/api/robinhood', robinhoodRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});