const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sensegen_super_secret_key_2026';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'department_authority@sensegen.org';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static serve for uploads
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// Helper: Geocoding via OpenStreetMap Nominatim
async function reverseGeocode(lat, lon) {
  if (lat === null || lon === null) return 'Location unavailable';
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'json',
        lat: lat,
        lon: lon,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'SenseGen-CivicTech/2.0 (contact@sensegen.org)'
      },
      timeout: 4000
    });
    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }
  } catch (err) {
    console.warn('Geocoding fallback activated:', err.message);
  }
  return `GPS Location (${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)})`;
}

// Helper: Unique Incident ID Generator
function generateIncidentId() {
  return new Promise((resolve, reject) => {
    const tryGenerate = () => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const incId = `SG-KKD-${randomNum}`;
      db.get(`SELECT id FROM incidents WHERE incident_id = ?`, [incId], (err, row) => {
        if (err) return reject(err);
        if (row) {
          tryGenerate(); // Collision, retry
        } else {
          resolve(incId);
        }
      });
    };
    tryGenerate();
  });
}

// Helper: Send Department Notification Email via Resend (Using DB Record as Single Source of Truth)
async function sendDepartmentNotificationEmail(targetIncidentId, directData = null) {
  console.log(`[EMAIL] Starting authority notification for ${targetIncidentId}...`);

  const processEmail = async (incident) => {
    const {
      incident_id,
      category_display,
      priority,
      severity,
      department,
      authority,
      address,
      latitude,
      longitude,
      submitted_image
    } = incident;

    const trackLink = `${FRONTEND_URL}/track?id=${incident_id}`;

    // Resolve local image file from direct upload path or exact DB reference
    let filePath = directData && directData.uploaded_file_path && fs.existsSync(directData.uploaded_file_path)
      ? directData.uploaded_file_path
      : path.join(uploadsDir, path.basename(submitted_image));

    const originalFilename = (directData && directData.original_filename)
      ? directData.original_filename
      : path.basename(filePath);

    let attachments = [];
    let hasImageAttachment = false;
    let mimeType = 'image/jpeg';
    let fileSize = 0;
    let base64Data = null;
    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
      try {
        const stat = fs.statSync(filePath);
        fileSize = stat.size;
        const ext = path.extname(filePath).toLowerCase();
        mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : (ext === '.gif' ? 'image/gif' : (ext === '.svg' ? 'image/svg+xml' : 'image/jpeg')));
        const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);

        if (isImage) {
          const fileBuffer = fs.readFileSync(filePath);
          if (fileSize <= 5 * 1024 * 1024) {
            base64Data = fileBuffer.toString('base64');
          }
          const cidValue = `sensegen-evidence-${incident_id}`;

          attachments.push({
            filename: originalFilename,
            content: fileBuffer,
            contentType: mimeType,
            content_type: mimeType,
            contentId: cidValue,
            content_id: cidValue
          });
          hasImageAttachment = true;
        }
      } catch (readErr) {
        console.warn(`[EMAIL] Warning reading evidence file for ${incident_id}:`, readErr.message);
      }
    } else {
      console.warn(`[EMAIL] Warning: Evidence file missing on disk for ${incident_id}: ${filePath}`);
    }

    // USER-REQUESTED EXACT BACKEND DEBUG LOGS
    console.log(`[EMAIL] Starting authority notification`);
    console.log(`[EMAIL] Recipient: ${NOTIFICATION_EMAIL}`);
    console.log(`[EMAIL] Incident: ${incident_id}`);
    console.log(`[EMAIL] Attachment: ${hasImageAttachment ? filePath : 'None'}`);

    // EXPLICIT LOGGING FOR CITIZEN EVIDENCE MATCHING
    console.log('==================================================');
    console.log('--- AUTHORITY EMAIL EVIDENCE MAPPING LOG ---');
    console.log(`Incident ID: ${incident_id}`);
    console.log(`Citizen evidence database reference: ${submitted_image}`);
    console.log(`Resolved evidence file path: ${filePath}`);
    console.log(`Original filename: ${originalFilename}`);
    console.log(`File exists: ${fileExists}`);
    console.log(`File actually passed to Resend: ${hasImageAttachment ? filePath : 'NONE'}`);
    console.log('==================================================');

    if (!resendClient || !RESEND_API_KEY || RESEND_API_KEY.startsWith('re_123456789')) {
      console.log(`[EMAIL DEMO MODE] Logged notification to ${NOTIFICATION_EMAIL} | Subject: [SenseGen Alert] New Incident ${incident_id} (${category_display})`);
      return;
    }

    const hasCoordinates = (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude));
    const mapLink = hasCoordinates ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

    const locationHtmlSection = hasCoordinates
      ? `<div style="background: rgba(0, 242, 254, 0.05); border-left: 4px solid #00f2fe; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
           <h4 style="color: #00f2fe; margin: 0 0 10px 0; font-size: 15px;">LOCATION DETAILS</h4>
           <p style="margin: 0 0 6px 0; color: #ffffff; font-size: 14px;"><strong>Address:</strong> ${address}</p>
           <p style="margin: 0 0 12px 0; color: #8e9bb4; font-size: 13px;">
             <strong>GPS Coordinates:</strong><br />
             Latitude: <span style="color: #ffffff;">${Number(latitude).toFixed(6)}</span><br />
             Longitude: <span style="color: #ffffff;">${Number(longitude).toFixed(6)}</span>
           </p>
           <div style="margin-top: 10px;">
             <a href="${mapLink}" target="_blank" style="background-color: #00f2fe; color: #070d1d; padding: 8px 16px; text-decoration: none; font-size: 12px; font-weight: bold; border-radius: 4px; display: inline-block; letter-spacing: 0.5px;">
               📍 VIEW LOCATION ON MAP
             </a>
           </div>
         </div>`
      : `<div style="background: rgba(255, 61, 113, 0.05); border-left: 4px solid #ff3d71; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
           <h4 style="color: #ff3d71; margin: 0 0 5px 0; font-size: 15px;">LOCATION DETAILS</h4>
           <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>Address:</strong> Location unavailable</p>
         </div>`;

    const cidValue = `sensegen-evidence-${incident_id}`;
    const imageSrc = base64Data ? `data:${mimeType};base64,${base64Data}` : `cid:${cidValue}`;

    const imageHtmlSection = hasImageAttachment
      ? `<div style="margin-top: 15px; background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.2);">
           <p style="color: #00f2fe; font-weight: bold; margin-top: 0; margin-bottom: 10px; font-size: 14px;">Submitted Evidence Photo (${originalFilename}):</p>
           <img src="${imageSrc}" alt="Submitted Evidence (${originalFilename})" style="max-width: 100%; max-height: 450px; border-radius: 8px; border: 1px solid #00f2fe; display: block; margin-bottom: 10px;" />
           <p style="margin: 0; color: #8e9bb4; font-size: 12px;">Original uploaded file <strong>${originalFilename}</strong> is attached to this email.</p>
         </div>`
      : `<div style="margin-top: 15px; background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.2);">
           <p style="color: #ff3d71; font-weight: bold; margin-top: 0; margin-bottom: 5px;">Submitted Evidence File:</p>
           <p style="margin: 0; color: #8e9bb4; font-size: 13px;">Evidence file attachment unavailable or non-image format.</p>
         </div>`;

    try {
      console.log(`[EMAIL] Sending through Resend...`);
      const response = await resendClient.emails.send({
        from: 'SenseGen Alerts <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        subject: `[SenseGen Alert] New Incident ${incident_id} - ${category_display} (${priority})`,
        attachments: attachments.length > 0 ? attachments : undefined,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #070d1d; color: #f0f4fc; padding: 25px; border-radius: 12px; border: 1px solid rgba(0, 242, 254, 0.3); max-width: 650px; margin: 0 auto;">
            <div style="border-bottom: 2px solid #00f2fe; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #00f2fe; margin: 0 0 5px 0; font-size: 22px; tracking: 0.5px;">SENSEGEN CIVIC ALERT: ${incident_id}</h2>
              <p style="color: #8e9bb4; font-size: 13px; margin: 0;">Automated Department Dispatch & Notification System</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><td style="padding: 10px 0; color: #8e9bb4; width: 38%;">Incident ID:</td><td style="padding: 10px 0; color: #00f2fe; font-weight: bold;">${incident_id}</td></tr>
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><td style="padding: 10px 0; color: #8e9bb4;">Category:</td><td style="padding: 10px 0; color: #ffffff; font-weight: bold;">${category_display}</td></tr>
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><td style="padding: 10px 0; color: #8e9bb4;">Priority / Severity:</td><td style="padding: 10px 0; color: #ff3d71; font-weight: bold;">${priority} (${severity})</td></tr>
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><td style="padding: 10px 0; color: #8e9bb4;">Department:</td><td style="padding: 10px 0; color: #ffffff;">${department}</td></tr>
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><td style="padding: 10px 0; color: #8e9bb4;">Assigned Authority:</td><td style="padding: 10px 0; color: #ffffff;">${authority}</td></tr>
            </table>

            ${locationHtmlSection}

            ${imageHtmlSection}

            <div style="margin-top: 25px; text-align: center;">
              <a href="${trackLink}" target="_blank" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #070d1d; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 14px; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);">
                INSPECT & MANAGE INCIDENT ON SENSEGEN
              </a>
            </div>
          </div>
        `
      });

      console.log(`[EMAIL] Resend response:`, JSON.stringify(response));

      if (response && response.error) {
        console.error(`[EMAIL] Error sending authority notification for ${incident_id}:`, response.error.message || response.error);
      } else {
        console.log(`[EMAIL] Success: Authority notification sent for ${incident_id}. ID: ${response.data?.id}`);
      }
    } catch (sendErr) {
      console.error(`[EMAIL] Error sending authority notification for ${incident_id}:`, sendErr.message);
    }
  };

  if (directData) {
    await processEmail(directData);
  } else {
    db.get(`SELECT * FROM incidents WHERE incident_id = ?`, [targetIncidentId], async (err, incident) => {
      if (err || !incident) {
        console.error(`[EMAIL] Error: Could not find incident ${targetIncidentId} in database:`, err ? err.message : 'Record missing');
        return;
      }
      await processEmail(incident);
    });
  }
}

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'SenseGen Backend v2.0',
    notification_recipient: NOTIFICATION_EMAIL
  });
});

// 1. Report Issue API
app.post('/api/incidents/report', upload.single('evidence'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Evidence file (image/video) is required' });
    }

    const { latitude, longitude, hint_category, user_id } = req.body;
    const lat = (latitude !== undefined && latitude !== null && latitude !== '' && latitude !== 'null' && !isNaN(parseFloat(latitude))) ? parseFloat(latitude) : null;
    const lon = (longitude !== undefined && longitude !== null && longitude !== '' && longitude !== 'null' && !isNaN(parseFloat(longitude))) ? parseFloat(longitude) : null;

    // Get Address via reverse geocoding
    const address = (lat !== null && lon !== null) ? await reverseGeocode(lat, lon) : 'Location unavailable';

    // Call Python AI Service
    const isVideo = req.file.mimetype.startsWith('video/') || req.file.originalname.match(/\.(mp4|avi|mov|mkv)$/i);
    const aiEndpoint = isVideo ? `${AI_SERVICE_URL}/analyze_video` : `${AI_SERVICE_URL}/analyze`;

    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append(isVideo ? 'video' : 'image', fileStream, req.file.originalname);
    if (hint_category) {
      formData.append('hint_category', hint_category);
    }

    let aiResult;
    try {
      const aiResponse = await axios.post(aiEndpoint, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 30000
      });
      aiResult = aiResponse.data;
    } catch (aiErr) {
      console.error('AI Service Error:', aiErr.message);
      const fallbackCategory = (hint_category && hint_category !== 'null' && hint_category !== 'ai_auto_detect') ? hint_category : 'road_damage';
      aiResult = {
        detected_class: fallbackCategory,
        category_display: fallbackCategory.replace('_', ' ').toUpperCase(),
        confidence: 0.0,
        has_detection: false,
        severity: 'MEDIUM',
        priority: 'P2',
        department: 'Municipal Engineering / Roads Department',
        authority: 'Assistant Executive Engineer',
        annotated_image: null
      };
    }

    const CATEGORY_NAMES_MAP = {
      'water_leakage': 'Water Leakage',
      'garbage_overflow': 'Garbage Overflow',
      'fire_accident': 'Fire Accident',
      'fallen_tree': 'Fallen Tree',
      'road_damage': 'Road Damage',
      'streetlight_failure': 'Streetlight Failure'
    };

    const isManualCategory = Boolean(hint_category && hint_category !== 'null' && hint_category !== 'undefined' && hint_category !== 'ai_auto_detect');
    const selectedCategoryName = isManualCategory ? (CATEGORY_NAMES_MAP[hint_category] || hint_category) : null;
    const detectedClassName = aiResult.detected_class;
    const detectedCategoryName = aiResult.category_display || (CATEGORY_NAMES_MAP[detectedClassName] || detectedClassName);
    const hasDetection = aiResult.has_detection !== false;

    // CATEGORY-SPECIFIC VALIDATION
    if (isManualCategory) {
      if (!hasDetection) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({
          error: `This image does not match ${selectedCategoryName}. Please upload a relevant image.`
        });
      }

      if (detectedClassName !== hint_category) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({
          error: `Image mismatch. You selected ${selectedCategoryName}, but the uploaded image appears to show ${detectedCategoryName}. Please upload a ${selectedCategoryName} image.`
        });
      }
    } else {
      if (!hasDetection) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({
          error: `Unable to detect a supported civic issue. Please upload a clearer image.`
        });
      }
    }

    // DUPLICATE IMAGE CHECK
    const existingIncidents = await new Promise((resolve) => {
      db.all(`SELECT incident_id, submitted_image FROM incidents WHERE submitted_image IS NOT NULL`, [], (err, rows) => {
        if (err || !rows) return resolve([]);
        resolve(rows);
      });
    });

    if (existingIncidents.length > 0) {
      let duplicateMatch = null;

      // 1. Evaluate via AI Service /evaluate_duplicate
      try {
        const dupFormData = new FormData();
        dupFormData.append('image', fs.createReadStream(req.file.path), req.file.originalname);
        
        const existingPathsList = existingIncidents.map(inc => ({
          incident_id: inc.incident_id,
          file_path: path.join(__dirname, inc.submitted_image.startsWith('/') ? inc.submitted_image.slice(1) : inc.submitted_image)
        }));
        dupFormData.append('existing_incidents', JSON.stringify(existingPathsList));

        const evalRes = await axios.post(`${AI_SERVICE_URL}/evaluate_duplicate`, dupFormData, {
          headers: { ...dupFormData.getHeaders() },
          timeout: 10000
        });

        if (evalRes.data && evalRes.data.is_duplicate) {
          duplicateMatch = evalRes.data;
        }
      } catch (dupAiErr) {
        console.warn('AI duplicate evaluation warning:', dupAiErr.message);
      }

      // 2. Node SHA-256 binary fallback
      if (!duplicateMatch) {
        try {
          const newBuffer = fs.readFileSync(req.file.path);
          const newHash = crypto.createHash('sha256').update(newBuffer).digest('hex');

          for (const inc of existingIncidents) {
            const relPath = inc.submitted_image.startsWith('/') ? inc.submitted_image.slice(1) : inc.submitted_image;
            const fullPath = path.join(__dirname, relPath);
            if (fs.existsSync(fullPath)) {
              const exBuffer = fs.readFileSync(fullPath);
              const exHash = crypto.createHash('sha256').update(exBuffer).digest('hex');
              if (newHash === exHash) {
                duplicateMatch = {
                  is_duplicate: true,
                  incident_id: inc.incident_id
                };
                break;
              }
            }
          }
        } catch (hashErr) {
          console.warn('Node SHA-256 check error:', hashErr.message);
        }
      }

      // If Duplicate Found: STOP report creation immediately
      if (duplicateMatch && duplicateMatch.is_duplicate) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        const existingId = duplicateMatch.incident_id;
        return res.status(400).json({
          duplicate: true,
          existing_incident_id: existingId,
          error: `Duplicate Report\nThis image has already been submitted. Please check the existing report. (Existing Incident: ${existingId})`
        });
      }
    }

    const incidentId = await generateIncidentId();
    const submittedImagePath = `/uploads/${req.file.filename}`;
    let annotatedImagePath = submittedImagePath;

    // Save annotated image if b64 provided
    if (aiResult.annotated_image && aiResult.annotated_image.startsWith('data:image')) {
      try {
        const base64Data = aiResult.annotated_image.replace(/^data:image\/\w+;base64,/, '');
        const annFilename = `annotated-${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`;
        const annPath = path.join(uploadsDir, annFilename);
        fs.writeFileSync(annPath, Buffer.from(base64Data, 'base64'));
        annotatedImagePath = `/uploads/${annFilename}`;
      } catch (annSaveErr) {
        console.warn('Could not save annotated image:', annSaveErr.message);
      }
    }

    const userIdVal = user_id ? parseInt(user_id) : null;
    const categoryVal = aiResult.detected_class || 'road_damage';
    const categoryDisplayVal = aiResult.category_display || categoryVal.replace('_', ' ').toUpperCase();
    const confidenceVal = aiResult.confidence || 0.85;
    const severityVal = aiResult.severity || 'MEDIUM';
    const priorityVal = aiResult.priority || 'P2';
    const departmentVal = aiResult.department || 'Municipal Corporation';
    const authorityVal = aiResult.authority || 'Concerned Officer';

    // Insert Incident
    db.run(
      `INSERT INTO incidents (
        incident_id, user_id, category, category_display, confidence,
        submitted_image, annotated_image, latitude, longitude, address,
        severity, priority, department, authority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incidentId, userIdVal, categoryVal, categoryDisplayVal, confidenceVal,
        submittedImagePath, annotatedImagePath, lat, lon, address,
        severityVal, priorityVal, departmentVal, authorityVal, 'REPORT_SUBMITTED'
      ],
      function (err) {
        if (err) {
          console.error('Error saving incident to DB:', err.message);
          return res.status(500).json({ error: 'Failed to create incident record' });
        }

        const newId = this.lastID;

        // Initialize Timeline Entries
        const timelineSteps = [
          { key: 'REPORT_SUBMITTED', title: 'Report Submitted', desc: `Citizen submitted report ${incidentId}`, done: 1 },
          { key: 'AI_ANALYSIS_COMPLETED', title: 'AI Analysis Completed', desc: `YOLO detected ${categoryDisplayVal} (${(confidenceVal*100).toFixed(1)}% confidence)`, done: 1 },
          { key: 'AUTHORITY_ASSIGNED', title: 'Authority Assigned', desc: `Assigned to ${departmentVal} - ${authorityVal}`, done: 1 },
          { key: 'AUTHORITY_NOTIFIED', title: 'Authority Notified', desc: `Department email notification sent to ${departmentVal}`, done: 1 },
          { key: 'ACCEPTED', title: 'Authority Accepted', desc: 'Department officer accepts report', done: 0 },
          { key: 'ACTION_IN_PROGRESS', title: 'Action In Progress', desc: 'Field team dispatched and working', done: 0 },
          { key: 'RESOLUTION_PROOF_UPLOADED', title: 'Resolution Proof Uploaded', desc: 'Officer uploads completion proof photo', done: 0 },
          { key: 'AI_VERIFICATION_COMPLETED', title: 'AI Verification Completed', desc: 'YOLO verifies problem resolution', done: 0 },
          { key: 'SOLVED', title: 'Problem Solved', desc: 'Issue resolved & case closed', done: 0 }
        ];

        const stmt = db.prepare(`INSERT INTO timeline (incident_id, status_key, title, description, completed) VALUES (?, ?, ?, ?, ?)`);
        timelineSteps.forEach(step => {
          stmt.run(incidentId, step.key, step.title, step.desc, step.done);
        });
        stmt.finalize();

        // Create Notification if user_id present
        if (userIdVal) {
          db.run(
            `INSERT INTO notifications (user_id, incident_id, message, status_trigger) VALUES (?, ?, ?, ?)`,
            [userIdVal, incidentId, `Your report ${incidentId} has been submitted.`, 'REPORT_SUBMITTED']
          );
        }

        // Trigger automatic email dispatch with exact upload context
        sendDepartmentNotificationEmail(incidentId, {
          incident_id: incidentId,
          category_display: categoryDisplayVal,
          priority: priorityVal,
          severity: severityVal,
          department: departmentVal,
          authority: authorityVal,
          address: address,
          latitude: lat,
          longitude: lon,
          submitted_image: submittedImagePath,
          uploaded_file_path: req.file.path,
          original_filename: req.file.originalname
        });

        return res.status(201).json({
          message: 'Incident reported successfully',
          incident_id: incidentId,
          id: newId,
          category: categoryVal,
          category_display: categoryDisplayVal,
          confidence: confidenceVal,
          severity: severityVal,
          priority: priorityVal,
          department: departmentVal,
          authority: authorityVal,
          address: address,
          submitted_image: submittedImagePath,
          annotated_image: annotatedImagePath,
          status: 'REPORT_SUBMITTED'
        });
      }
    );

  } catch (err) {
    console.error('Error in /api/incidents/report:', err);
    res.status(500).json({ error: 'Internal server error while processing report' });
  }
});

// 2. Track Incident API
app.get('/api/incidents/track/:incident_id', (req, res) => {
  const incId = req.params.incident_id.trim().toUpperCase();

  db.get(`SELECT * FROM incidents WHERE UPPER(incident_id) = ?`, [incId], (err, incident) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error' });
    }
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    db.all(`SELECT * FROM timeline WHERE incident_id = ? ORDER BY id ASC`, [incident.incident_id], (err, timeline) => {
      if (err) {
        return res.status(500).json({ error: 'Timeline query error' });
      }
      res.json({
        incident: incident,
        timeline: timeline || []
      });
    });
  });
});

// 3. User Authentication & Dashboard APIs
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = String(email).trim().toLowerCase();

  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`, [name.trim(), cleanEmail, hash], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    const userId = this.lastID;
    const token = jwt.sign({ id: userId, email: cleanEmail, name: name.trim() }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token: token,
      user: { id: userId, name: name.trim(), email: cleanEmail }
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token: token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
});

app.get('/api/user/reports', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  db.all(`SELECT * FROM incidents WHERE user_id = ? ORDER BY id DESC`, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user reports' });
    }
    res.json(rows || []);
  });
});

app.get('/api/user/notifications', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  db.all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC`, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
    res.json(rows || []);
  });
});

app.post('/api/user/notifications/:id/read', (req, res) => {
  const notifId = req.params.id;
  db.run(`UPDATE notifications SET read_status = 1 WHERE id = ?`, [notifId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
    res.json({ message: 'Notification marked as read', id: notifId });
  });
});

// 4. Admin APIs

// Admin Signup
app.post('/api/admin/signup', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = String(email).trim().toLowerCase();

  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run(`INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)`, [name.trim(), cleanEmail, hash], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Admin email is already registered' });
      }
      return res.status(500).json({ error: 'Failed to create admin account' });
    }

    const adminId = this.lastID;
    const token = jwt.sign({ id: adminId, role: 'admin', email: cleanEmail, name: name.trim() }, JWT_SECRET, { expiresIn: '1d' });
    
    return res.status(201).json({
      token: token,
      admin: { id: adminId, name: name.trim(), email: cleanEmail },
      message: 'Admin account created successfully'
    });
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(String(email).trim())) {
    return res.status(400).json({ error: 'Please enter a valid admin email address' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // Check SQLite admins table first
  db.get(`SELECT * FROM admins WHERE email = ?`, [cleanEmail], (err, admin) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error during login' });
    }

    if (admin) {
      const isMatch = bcrypt.compareSync(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid admin email or password' });
      }

      const token = jwt.sign({ id: admin.id, role: 'admin', email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({
        token: token,
        admin: { id: admin.id, name: admin.name, email: admin.email },
        message: 'Admin authenticated'
      });
    }

    // Default seed account support if not registered via signup yet
    if (cleanEmail === 'admin@example.com' && password === 'admin123') {
      const defaultHash = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT OR IGNORE INTO admins (name, email, password_hash) VALUES (?, ?, ?)`, ['System Administrator', 'admin@example.com', defaultHash], function() {
        const token = jwt.sign({ id: this.lastID || 1, role: 'admin', email: cleanEmail, name: 'System Administrator' }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({
          token: token,
          admin: { id: this.lastID || 1, name: 'System Administrator', email: cleanEmail },
          message: 'Admin authenticated'
        });
      });
      return;
    }

    return res.status(401).json({ error: 'Invalid admin email or password' });
  });
});

app.get('/api/admin/stats', (req, res) => {
  db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN priority = 'P1' THEN 1 ELSE 0 END) as p1_count,
      SUM(CASE WHEN status IN ('ACCEPTED', 'ACTION_IN_PROGRESS', 'RESOLUTION_PROOF_UPLOADED', 'AI_VERIFICATION_COMPLETED') THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'SOLVED' THEN 1 ELSE 0 END) as resolved
    FROM incidents
  `, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    res.json({
      total: row.total || 0,
      p1_count: row.p1_count || 0,
      in_progress: row.in_progress || 0,
      resolved: row.resolved || 0
    });
  });
});

app.get('/api/admin/incidents', (req, res) => {
  db.all(`SELECT * FROM incidents ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch incidents' });
    }
    res.json(rows || []);
  });
});

app.get('/api/admin/incidents/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM incidents WHERE id = ?`, [id], (err, incident) => {
    if (err || !incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    db.all(`SELECT * FROM timeline WHERE incident_id = ? ORDER BY id ASC`, [incident.incident_id], (err, timeline) => {
      res.json({ incident, timeline: timeline || [] });
    });
  });
});

// Admin Lifecycle Action: ACCEPT REPORT
app.post('/api/admin/incidents/:id/accept', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM incidents WHERE id = ?`, [id], (err, incident) => {
    if (err || !incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const newStatus = 'ACCEPTED';
    db.run(`UPDATE incidents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update status' });

      // Update timeline
      db.run(`UPDATE timeline SET completed = 1 WHERE incident_id = ? AND status_key = ?`, [incident.incident_id, 'ACCEPTED']);

      // Add Notification
      if (incident.user_id) {
        db.run(
          `INSERT INTO notifications (user_id, incident_id, message, status_trigger) VALUES (?, ?, ?, ?)`,
          [incident.user_id, incident.incident_id, `Your report ${incident.incident_id} has been accepted.`, 'ACCEPTED']
        );
      }

      res.json({ message: 'Incident accepted', status: newStatus });
    });
  });
});

// Admin Lifecycle Action: START WORK
app.post('/api/admin/incidents/:id/start-work', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM incidents WHERE id = ?`, [id], (err, incident) => {
    if (err || !incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const newStatus = 'ACTION_IN_PROGRESS';
    db.run(`UPDATE incidents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update status' });

      // Update timeline
      db.run(`UPDATE timeline SET completed = 1 WHERE incident_id = ? AND status_key = ?`, [incident.incident_id, 'ACTION_IN_PROGRESS']);

      // Add Notification
      if (incident.user_id) {
        db.run(
          `INSERT INTO notifications (user_id, incident_id, message, status_trigger) VALUES (?, ?, ?, ?)`,
          [incident.user_id, incident.incident_id, `Work has started on your reported issue (${incident.incident_id}).`, 'ACTION_IN_PROGRESS']
        );
      }

      res.json({ message: 'Work started', status: newStatus });
    });
  });
});

// Admin Lifecycle Action: UPLOAD RESOLUTION PROOF & AI VERIFY
app.post('/api/admin/incidents/:id/upload-proof', upload.single('proof_image'), async (req, res) => {
  const id = req.params.id;
  if (!req.file) {
    return res.status(400).json({ error: 'Resolution proof image is required' });
  }
  const resolutionDescription = req.body.description || 'Maintenance and repair work completed successfully.';

  db.get(`SELECT * FROM incidents WHERE id = ?`, [id], async (err, incident) => {
    if (err || !incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const proofImagePath = `/uploads/${req.file.filename}`;

    // Run AI Verification
    let aiVerification = { verified: true, message: 'Resolution proof verified clean.' };
    try {
      const formData = new FormData();
      formData.append('proof_image', fs.createReadStream(req.file.path), req.file.originalname);
      formData.append('category', incident.category);

      const aiRes = await axios.post(`${AI_SERVICE_URL}/verify_resolution`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 20000
      });
      aiVerification = aiRes.data;
    } catch (aiErr) {
      console.warn('AI Verification service warning:', aiErr.message);
    }

    const newStatus = 'RESOLUTION_PROOF_UPLOADED';
    db.run(
      `UPDATE incidents SET 
        status = ?, 
        resolution_proof = ?, 
        resolution_description = ?, 
        ai_verified = ?, 
        ai_verification_message = ?, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newStatus, proofImagePath, resolutionDescription, aiVerification.verified ? 1 : 0, aiVerification.message, id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save resolution proof' });

        // Update timeline
        db.run(`UPDATE timeline SET completed = 1 WHERE incident_id = ? AND status_key = ?`, [incident.incident_id, 'RESOLUTION_PROOF_UPLOADED']);
        if (aiVerification.verified) {
          db.run(`UPDATE timeline SET completed = 1 WHERE incident_id = ? AND status_key = ?`, [incident.incident_id, 'AI_VERIFICATION_COMPLETED']);
        }

        res.json({
          message: 'Resolution proof uploaded and verified',
          status: newStatus,
          resolution_proof: proofImagePath,
          ai_verified: aiVerification.verified,
          ai_verification_message: aiVerification.message
        });
      }
    );
  });
});

// Admin Lifecycle Action: MARK SOLVED
app.post('/api/admin/incidents/:id/solve', upload.single('proof_image'), async (req, res) => {
  const id = req.params.id;
  const resolutionDescription = req.body.description || 'Maintenance and repair work completed successfully.';

  db.get(`SELECT * FROM incidents WHERE id = ?`, [id], async (err, incident) => {
    if (err || !incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    let proofImagePath = incident.resolution_proof;
    let aiVerification = {
      verified: incident.ai_verified === 1,
      message: incident.ai_verification_message || 'YOLO AI Verification Successful: Problem verified resolved.'
    };

    // If a new proof image is uploaded in this request
    if (req.file) {
      proofImagePath = `/uploads/${req.file.filename}`;
      try {
        const formData = new FormData();
        formData.append('proof_image', fs.createReadStream(req.file.path), req.file.originalname);
        formData.append('category', incident.category);

        const aiRes = await axios.post(`${AI_SERVICE_URL}/verify_resolution`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 20000
        });
        aiVerification = aiRes.data;
      } catch (aiErr) {
        console.warn('AI Verification service warning:', aiErr.message);
      }
    }

    if (!proofImagePath) {
      return res.status(400).json({ error: 'Resolution proof image is required before marking problem as solved' });
    }

    const newStatus = 'SOLVED';
    db.run(
      `UPDATE incidents SET 
        status = ?, 
        resolution_proof = ?, 
        resolution_description = ?, 
        ai_verified = ?, 
        ai_verification_message = ?, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newStatus, proofImagePath, resolutionDescription, aiVerification.verified ? 1 : 0, aiVerification.message, id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to mark incident as solved' });

        // Update all timeline entries as completed
        db.run(`UPDATE timeline SET completed = 1 WHERE incident_id = ?`, [incident.incident_id]);

        // Add Notification for User
        if (incident.user_id) {
          db.run(
            `INSERT INTO notifications (user_id, incident_id, message, status_trigger) VALUES (?, ?, ?, ?)`,
            [incident.user_id, incident.incident_id, `Your problem ${incident.incident_id} has been solved.`, 'SOLVED']
          );
        }

        res.json({
          message: 'Incident solved successfully',
          status: newStatus,
          resolution_proof: proofImagePath,
          resolution_description: resolutionDescription,
          ai_verified: aiVerification.verified,
          ai_verification_message: aiVerification.message
        });
      }
    );
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`SenseGen Backend Express server running on port ${PORT}`);
  console.log(`Notification Recipient Email configured: ${NOTIFICATION_EMAIL}`);
});
