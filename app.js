const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const cors = require('cors');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./gec-wave-firebase-adminsdk-c7j6e-72c6cca4ee.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://gec-wave-default-rtdb.firebaseio.com"
});

// Get database reference AFTER initialization
const db = admin.database();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static('public'));
app.use(cookieParser());

// Set up EJS as the view engine with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const authStatusRef = admin.database().ref('accessControl/settings/authEnabled');
    const snapshot = await authStatusRef.get();
    const isAuthEnabled = snapshot.val() ?? true; // Default to enabled if not set

    // If auth is disabled or the access key is 'direct_access', allow access
    if (!isAuthEnabled || req.cookies.accessKey === 'direct_access') {
      return next();
    }
    
    // Otherwise, check for normal access key
    const accessKey = req.cookies.accessKey;
    if (!accessKey) {
      return res.redirect('/');
    }

    // Set the access key in the request for use in routes
    req.accessKey = accessKey;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.redirect('/');
  }
};

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
    const isAdmin = req.cookies.isAdmin === 'true';
    if (!isAdmin) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

// Function to parse CSV data
function parseCSV(filename) {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(__dirname, 'data', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`CSV file not found: ${filename}`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(csv(['filename', 'url']))
      .on('data', (data) => {
        if (data.filename && data.filename.trim()) {
          results.push(data);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// Function to categorize materials
function categorizeMaterials(materials, includeThumbnails = false) {
  console.log(`Categorizing ${materials.length} materials`);
  
  return materials.map(material => {
    if (!material.filename) {
      console.warn('Found material with missing filename:', material);
      return null;
    }
    
    const parts = material.filename.split('-');
    const result = {
      id: material.filename,
      filename: material.filename,
      url: material.url,
      thumbnailUrl: includeThumbnails ? generateThumbnailUrl(material.url) : null,
      standard: 'Unknown',
      subject: 'Unknown',
      materialType: 'Unknown',
      year: 'Unknown',
      language: 'Unknown'
    };

    // Extract standard (12th, 11th, etc.)
    const standardRegex = /^(\d+th)/;
    const standardMatch = material.filename.match(standardRegex);
    if (standardMatch) {
      result.standard = standardMatch[1];
      // Remove the standard from parts
      if (parts[0] === result.standard) {
        parts.shift();
      }
    }

    // Extract subject (typically after standard)
    if (parts.length > 0) {
      // Special case for "science-chemistry" pattern
      if (parts[0] === 'science' && parts.length > 1) {
        result.subject = parts[1];
        parts.shift(); // Remove 'science'
      } else {
        result.subject = parts[0];
      }
      parts.shift();
    }

    // Extract material type (publisher/brand)
    if (parts.length > 0) {
      result.materialType = parts[0];
      parts.shift();
    }

    // Look for year pattern (20XX)
    const yearPattern = /20\d{2}/;
    for (let i = 0; i < parts.length; i++) {
      if (yearPattern.test(parts[i])) {
        result.year = parts[i];
        parts.splice(i, 1);
        break;
      }
    }

    // Check for language indicators
    const remainingParts = parts.join('-');
    if (remainingParts.includes('em') || remainingParts.includes('eng')) {
      result.language = 'English';
    } else if (remainingParts.includes('gm') || remainingParts.includes('guj')) {
      result.language = 'Gujarati';
    }

    // Capitalize the subject and material type
    result.subject = capitalizeFirstLetter(result.subject);
    result.materialType = capitalizeFirstLetter(result.materialType);

    return result;
  }).filter(Boolean); // Remove any null entries
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  if (string && string !== 'Unknown') {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  return string;
}

// Function to generate thumbnail URL from Google Drive URL
function generateThumbnailUrl(driveUrl) {
  // Extract file ID from Google Drive URL
  const fileIdMatch = driveUrl.match(/id=([^&]+)/);
  
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    // Use the preview URL instead of thumbnail
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  return null;
}

// Routes
// Home route
app.get('/', async (req, res) => {
    try {
        const authRef = db.ref('accessControl/settings/authEnabled');
        const authSnapshot = await authRef.once('value');
        const authEnabled = authSnapshot.val() ?? true; // Default to enabled if not set

        // Check if user has access key or direct access
        const hasAccessKey = req.cookies.accessKey;
        const hasDirectAccess = req.cookies.direct_access === 'true';

        // If auth is disabled, set direct access and redirect to materials
        if (!authEnabled) {
            res.cookie('direct_access', 'true', { maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
            return res.redirect('/materials');
        }

        // If auth is enabled and user has no access, redirect to key generation
        if (authEnabled && !hasAccessKey && !hasDirectAccess) {
            return res.redirect('/generateKey');
        }

        // If user has access, show materials
        res.render('index', {
            title: 'Educational Materials Portal',
            materials: [],
            papers: [],
            isAuthEnabled: authEnabled,
            accessKey: hasAccessKey || null
        });
    } catch (error) {
        console.error('Error checking auth status:', error);
        res.render('index', {
            title: 'Educational Materials Portal',
            materials: [],
            papers: [],
            isAuthEnabled: true,
            accessKey: req.cookies.accessKey || null
        });
    }
});

// Generate key route
app.get('/generateKey', async (req, res) => {
    try {
        const authRef = db.ref('accessControl/settings/authEnabled');
        const authSnapshot = await authRef.once('value');
        const authEnabled = authSnapshot.val();

        if (!authEnabled) {
            res.cookie('direct_access', 'true', { maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
            return res.redirect('/materials');
        }

        res.render('generateKey');
    } catch (error) {
        console.error('Error checking auth status:', error);
        res.render('generateKey');
    }
});

// Materials route
app.get('/materials', async (req, res) => {
    try {
        const authRef = db.ref('accessControl/settings/authEnabled');
        const authSnapshot = await authRef.once('value');
        const authEnabled = authSnapshot.val() ?? true; // Default to enabled if not set

        // Check access conditions
        const hasAccessKey = req.cookies.accessKey;
        const hasDirectAccess = req.cookies.direct_access === 'true';

        // If auth is disabled, set direct access
        if (!authEnabled) {
            res.cookie('direct_access', 'true', { maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
        }
        // If auth is enabled and no access, redirect to key generation
        else if (!hasAccessKey && !hasDirectAccess) {
            return res.redirect('/generateKey');
        }

        // Load both materials and papers
        const materials = await parseCSV('materials.csv');
        const papers = await parseCSV('papers.csv');
        
        // Categorize the materials
        const categorizedMaterials = categorizeMaterials(materials);
        const categorizedPapers = categorizeMaterials(papers);
        
        res.render('index', { 
            title: 'Educational Materials Portal',
            materials: categorizedMaterials,
            papers: categorizedPapers,
            isAuthEnabled: authEnabled,
            accessKey: hasAccessKey || null
        });
    } catch (error) {
        console.error('Error loading materials:', error);
        res.status(500).send('Error loading materials');
    }
});

// Preview route
app.get('/preview/:filename', async (req, res) => {
    try {
        const authRef = db.ref('accessControl/settings/authEnabled');
        const authSnapshot = await authRef.once('value');
        const authEnabled = authSnapshot.val();

        // If auth is disabled, set direct access cookie and continue
        if (!authEnabled) {
            res.cookie('direct_access', 'true', { maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
        }

        // Check access conditions
        const hasDirectAccess = req.cookies.direct_access === 'true';
        const hasAccessKey = req.cookies.accessKey;

        // Redirect only if ALL conditions are true:
        // 1. Auth is enabled
        // 2. No direct access
        // 3. No access key
        if (authEnabled === true && !hasDirectAccess && !hasAccessKey) {
            return res.redirect('/generateKey');
        }

        const filename = req.params.filename;
        const materials = await parseCSV('materials.csv');
        const papers = await parseCSV('papers.csv');
        const allMaterials = [...materials, ...papers];
        
        // Find and categorize the specific material
        const rawMaterial = allMaterials.find(m => m.filename === filename);
        
        if (!rawMaterial) {
            return res.status(404).send('Material not found');
        }

        // Categorize the single material to get all properties
        const [categorizedMaterial] = categorizeMaterials([rawMaterial]);
        
        if (!categorizedMaterial) {
            return res.status(404).send('Failed to process material');
        }
        
        // Pass authEnabled status to the preview template
        res.render('preview', { 
            material: categorizedMaterial, 
            title: `${categorizedMaterial.subject} ${categorizedMaterial.materialType || 'Material'}`,
            accessKey: req.cookies.accessKey || null,
            isAuthEnabled: authEnabled
        });
    } catch (error) {
        console.error('Error loading preview:', error);
        res.status(500).send('Error loading preview');
    }
});

// API endpoint to get categorized materials (protected)
app.get('/api/materials', requireAuth, async (req, res) => {
  try {
    const rawMaterials = await parseCSV('materials.csv');
    const categorizedMaterials = categorizeMaterials(rawMaterials);
    res.json(categorizedMaterials);
  } catch (err) {
    console.error('Error processing materials API:', err);
    res.status(500).json({ error: 'Failed to process materials' });
  }
});

// Generated key page - shows the specific key
app.get('/generatedKey/:key', (req, res) => {
  const key = req.params.key;
  res.render('generatedKey', {
    title: 'Your Access Key',
    key: key
  });
});

// Generated keys listing page (for future admin use)
app.get('/generatedKeys', (req, res) => {
  res.render('generatedKeys', {
    title: 'Generated Access Keys'
  });
});

// Logout - clear the cookie
app.get('/logout', (req, res) => {
  res.clearCookie('accessKey');
  res.redirect('/');
});

// Short URL redirect handler - simplified to just redirect to the actual URL
app.get('/k/:shortCode', (req, res) => {
  const shortCode = req.params.shortCode;
  
  // Instead of looking up in Firebase, we'll temporarily hardcode the redirect
  // In a production app, you would look this up in a database
  
  // For now, redirect to the generatedKey endpoint with a placeholder key
  // The client-side JavaScript in generateKey.ejs still generates and stores real keys
  res.redirect(`/generatedKey/${shortCode}`);
});

// Admin panel route
app.get('/admin', (req, res) => {
    const isAdmin = req.cookies.isAdmin === 'true';
    res.render('admin', { 
        isAdmin,
        title: 'Admin Panel - Materials Portal'
    });
});

// Admin login endpoint with rate limiting
let loginAttempts = {};
app.post('/admin/login', (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    
    // Check for too many attempts
    if (loginAttempts[ip]) {
        const attempts = loginAttempts[ip].filter(time => now - time < 15 * 60 * 1000); // 15 minutes
        if (attempts.length >= 5) {
            return res.status(429).json({ 
                success: false, 
                message: 'Too many login attempts. Please try again later.' 
            });
        }
        loginAttempts[ip] = attempts;
    }

    const { password } = req.body;
    if (password === 'MrGadhvii') {
        // Add attempt even on success
        loginAttempts[ip] = [...(loginAttempts[ip] || []), now];
        res.cookie('isAdmin', 'true', { 
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.json({ success: true });
    } else {
        // Add failed attempt
        loginAttempts[ip] = [...(loginAttempts[ip] || []), now];
        res.status(401).json({ success: false });
    }
});

// Admin logout endpoint
app.post('/admin/logout', requireAdmin, (req, res) => {
    res.clearCookie('isAdmin');
    res.json({ success: true });
});

// Admin endpoints
app.post('/admin/auth-status', requireAdmin, async (req, res) => {
    const { isEnabled } = req.body;
    
    try {
        await admin.database().ref('accessControl/settings/authEnabled').set(isEnabled);
        
        // Log the action
        await admin.database().ref('adminLogs').push({
            timestamp: admin.database.ServerValue.TIMESTAMP,
            action: 'Auth Status Changed',
            details: `Key generation ${isEnabled ? 'enabled' : 'disabled'}`,
            adminIp: req.ip
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update auth status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/admin/auth-status', requireAdmin, async (req, res) => {
    try {
        const snapshot = await admin.database().ref('accessControl/settings/authEnabled').get();
        res.json({ success: true, isEnabled: snapshot.val() ?? true });
    } catch (error) {
        console.error('Failed to get auth status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin stats endpoint
app.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const [keysSnapshot, logsSnapshot] = await Promise.all([
            admin.database().ref('accessKeys').get(),
            admin.database().ref('adminLogs').orderByChild('timestamp').limitToLast(50).get()
        ]);
        
        const keys = keysSnapshot.val() || {};
        const logs = logsSnapshot.val() || {};
        
        const stats = {
            totalKeys: Object.keys(keys).length,
            activeKeys: Object.values(keys).filter(key => 
                new Date(key.expiresAt) > new Date() && key.isActivated
            ).length,
            recentLogs: Object.values(logs).sort((a, b) => b.timestamp - a.timestamp)
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Failed to get admin stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create data directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Export the app
module.exports = app; 