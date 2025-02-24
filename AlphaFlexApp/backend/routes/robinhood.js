// robinhood.js

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Store active Python processes
const activeProcesses = new Map();

// Helper function to run Python script and handle MFA prompt
const runPythonScript = (scriptArgs) => {
  return new Promise((resolve, reject) => {
    console.log('Running Python script with args:', scriptArgs);
    
    const pythonScriptPath = path.join(__dirname, '../scripts/robinhood_auth.py');
    const pythonProcess = spawn('python3', [pythonScriptPath, ...scriptArgs]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Python stdout:', output);
      
      // Check for MFA prompt
      if (output.includes('Please type in the MFA code:')) {
        // Store the process for later use
        activeProcesses.set(scriptArgs[1], pythonProcess); // scriptArgs[1] is username
        resolve({ status: 'awaiting_mfa', message: 'MFA code required' });
      } else {
        stdoutData += output;
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.log('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      // Only resolve here if we haven't already resolved with MFA prompt
      if (!activeProcesses.has(scriptArgs[1])) {
        try {
          const result = JSON.parse(stdoutData);
          resolve(result);
        } catch (err) {
          console.error('Failed to parse Python output:', err);
          reject(new Error('Authentication failed'));
        }
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(error);
    });
  });
};

// Login route
router.post('/auth', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const result = await runPythonScript(['login', username, password]);
    res.json(result);

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed. Please try again.'
    });
  }
});

// MFA submission route
router.post('/auth/mfa', async (req, res) => {
  try {
    const { username, mfaCode } = req.body;

    if (!username || !mfaCode) {
      return res.status(400).json({
        success: false,
        error: 'Username and MFA code are required'
      });
    }

    const pythonProcess = activeProcesses.get(username);
    if (!pythonProcess) {
      return res.status(400).json({
        success: false,
        error: 'No active login process found'
      });
    }

    let stdoutData = '';
    let processCompleted = false;

    // Listen for response after sending MFA code
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    // Write MFA code to Python process stdin
    pythonProcess.stdin.write(mfaCode + '\n');

    // Handle process completion
    pythonProcess.on('close', (code) => {
      processCompleted = true;
      try {
        const result = JSON.parse(stdoutData);
        res.json(result);
      } catch (err) {
        res.status(500).json({
          success: false,
          error: 'Failed to process MFA response'
        });
      }
      activeProcesses.delete(username);
    });

    // Set a timeout for the response
    setTimeout(() => {
      if (!processCompleted) {
        pythonProcess.kill();
        activeProcesses.delete(username);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'MFA verification timed out'
          });
        }
      }
    }, 30000); // 30 second timeout

  } catch (error) {
    console.error('MFA submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit MFA code'
    });
  }
});

module.exports = router;