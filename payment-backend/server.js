const nodemailer = require('nodemailer');
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "payments.json");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// SMTP Configuration
const smtpUser = process.env.SMTP_USER || 'm.r.moharana789@gmail.com';
const smtpPass = process.env.SMTP_PASS || 'hukc cmfy dqqb ustd';
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : false;

let transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  logger: true,
  debug: true,
});

// Verify SMTP connection and fallback to Ethereal if verification fails
transporter.verify(async (err, success) => {
  if (err) {
    console.error('SMTP verify failed:', err && (err.message || err));
    console.warn('Falling back to Ethereal test SMTP account for local testing');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Ethereal account created. Preview emails at the URLs logged after send.');
    } catch (createErr) {
      console.error('Failed to create Ethereal test account:', createErr && (createErr.message || createErr));
    }
  } else {
    console.log('SMTP transporter ready');
  }
});

// Multer: file upload settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB
});

// Express app init
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));

// Load stored payments
let payments = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    payments = JSON.parse(fs.readFileSync(DATA_FILE)) || [];
  }
} catch (err) {
  console.error("Error loading payments.json:", err);
  payments = [];
}

// Save payments to file
function savePayments() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(payments, null, 2));
}

// ==========================
// SAVE PAYMENT API (UPDATED)
// ==========================
app.post("/api/payments", upload.single("screenshot"), (req, res) => {
  try {
    const { name, email, address, plan, paymentMethod, upiId, upiRef } = req.body;
    const file = req.file;

    // Validation logic
    if (!name || !email || !address || !plan || !paymentMethod) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    if (paymentMethod === "paypal" && !file) {
      return res.status(400).json({ ok: false, message: "PayPal screenshot required" });
    }

    if (paymentMethod === "upi" && (!upiId || !upiRef)) {
      return res.status(400).json({ ok: false, message: "UPI ID and Reference required" });
    }

    const record = {
      id: Date.now().toString(),
      name,
      email,
      address,
      plan,
      paymentMethod,
      upiId: upiId || null,
      upiRef: upiRef || null,
      screenshotFilename: file ? file.filename : null,
      screenshotUrl: file ? `/uploads/${file.filename}` : null,
      createdAt: new Date().toISOString(),
      confirmed: false
    };

    payments.unshift(record);
    savePayments();

    res.json({ ok: true, payment: record });
  } catch (err) {
    console.error("Payment upload error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ==========================
// GET ALL PAYMENTS
// ==========================
app.get("/api/payments", (req, res) => {
  res.json({ ok: true, payments });
});

// ==========================
// GET SINGLE PAYMENT
// ==========================
app.get("/api/payments/:id", (req, res) => {
  const rec = payments.find(p => p.id === req.params.id);
  if (!rec) {
    return res.status(404).json({ ok: false, message: "Not found" });
  }
  res.json({ ok: true, payment: rec });
});

// ==========================
// GET USER INFO BY EMAIL & PLAN
// ==========================
app.get("/api/user-info", (req, res) => {
  const { email, plan } = req.query;
  if (!email || !plan) {
    return res.status(400).json({ ok: false, message: "Email and plan required" });
  }
  const rec = payments.find(
    (p) => p.email.trim().toLowerCase() === email.trim().toLowerCase() && p.plan === plan
  );
  if (!rec) {
    return res.status(404).json({ ok: false, message: "No info found" });
  }
  res.json({ ok: true, payment: rec });
});

// ==========================
// SEND CONFIRMATION EMAIL & UPDATE PAYMENT
// ==========================
app.post('/api/send-confirmation', upload.single("screenshot"), async (req, res) => {
  const email = req.body.email;
  const name = req.body.name;
  const plan = req.body.plan;
  const paymentId = req.body.paymentId;
  const file = req.file;

  if (!email || !name || !plan) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  try {
    // Find the payment by id OR fallback by (email, name, plan)
    let idx = -1;
    if (paymentId) {
      idx = payments.findIndex(p => p.id === paymentId);
    }
    if (idx === -1) {
      idx = payments.findIndex(p =>
        p.email === email && p.name === name && p.plan === plan
      );
    }
    if (idx === -1) {
      return res.status(404).json({ ok: false, error: "Payment not found" });
    }

    // Update screenshot if attached by admin
    if (file) {
      payments[idx].screenshotFilename = file.filename;
      payments[idx].screenshotUrl = `/uploads/${file.filename}`;
    }
    payments[idx].confirmed = true;
    savePayments();

    // Send confirmation email
    const info = await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject: 'Payment Received & Confirmed',
      text: `Dear ${name}, your payment for the ${plan} plan has been verified and activated. Thank you!`
    });

    // Preview (Ethereal) URL (for dev/testing)
    try {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log('Ethereal preview URL:', preview);
      else console.log('Email sent, sendMail response:', info);
    } catch (ex) {
      console.log('Email sent, sendMail response (no preview):', info);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Email failed:', err.message || err);
    const debug = err && (err.response || err.message || err);
    res.status(500).json({ ok: false, error: 'Failed to send email', debug });
  }
});

// ==========================
// VERIFY PAYMENT BY ID
// ==========================
app.post("/api/payments/:id/verify", (req, res) => {
  const paymentId = req.params.id;
  const idx = payments.findIndex(p => p.id === paymentId);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Payment not found" });
  }
  payments[idx].confirmed = true;
  savePayments();
  res.json({ ok: true, payment: payments[idx] });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Payment backend running on http://localhost:${PORT}`));
