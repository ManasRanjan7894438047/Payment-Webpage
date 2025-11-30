const nodemailer = require("nodemailer");
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "payments.json");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// IMPORTANT: use env vars in real project
const smtpUser = process.env.SMTP_USER || "m.r.moharana789@gmail.com";
const smtpPass = process.env.SMTP_PASS || "hukc cmfy dqqb ustd"; // Gmail app password
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : false;

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

// Verify SMTP and optionally fall back to Ethereal
transporter.verify(async (err) => {
  if (err) {
    console.error("SMTP verify failed:", err);
    try {
      console.warn("Using Ethereal test SMTP...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log("Ethereal SMTP ready.");
    } catch (e) {
      console.error("Failed to create Ethereal SMTP:", e);
    }
  } else {
    console.log("SMTP transporter ready");
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Express init
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // Vite default
    methods: ["GET", "POST"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));

// Load payments
let payments = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    payments = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) || [];
  }
} catch (err) {
  console.error("Error loading payments.json:", err);
  payments = [];
}

// Save helper
function savePayments() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(payments, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving payments.json:", err);
  }
}

// SAVE PAYMENT
app.post("/api/payments", upload.single("screenshot"), (req, res) => {
  try {
    const { name, email, address, plan, paymentMethod, upiId, upiRef } =
      req.body;
    const file = req.file;

    if (!name || !email || !address || !plan || !paymentMethod) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing required fields" });
    }

    if (paymentMethod === "paypal" && !file) {
      return res
        .status(400)
        .json({ ok: false, message: "PayPal screenshot required" });
    }

    if (paymentMethod === "upi" && (!upiId || !upiRef)) {
      return res
        .status(400)
        .json({ ok: false, message: "UPI ID and Reference required" });
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
      confirmed: false,
    };

    payments.unshift(record);
    savePayments();

    res.json({ ok: true, payment: record });
  } catch (err) {
    console.error("Payment upload error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET ALL PAYMENTS
app.get("/api/payments", (req, res) => {
  res.json({ ok: true, payments });
});

// GET ONE PAYMENT
app.get("/api/payments/:id", (req, res) => {
  const rec = payments.find((p) => p.id === req.params.id);
  if (!rec)
    return res.status(404).json({ ok: false, message: "Not found" });
  res.json({ ok: true, payment: rec });
});

// GET USER INFO
app.get("/api/user-info", (req, res) => {
  const { email, plan } = req.query;
  if (!email || !plan) {
    return res
      .status(400)
      .json({ ok: false, message: "Email and plan required" });
  }

  const rec = payments.find(
    (p) =>
      p.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      p.plan === plan
  );

  if (!rec)
    return res.status(404).json({ ok: false, message: "No info found" });

  res.json({ ok: true, payment: rec });
});

// SEND CONFIRMATION + EMAIL
app.post(
  "/api/send-confirmation",
  upload.single("screenshot"),
  async (req, res) => {
    const { email, name, plan, paymentId } = req.body;
    const file = req.file;

    if (!email || !name || !plan) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields" });
    }

    try {
      let idx = payments.findIndex((p) => p.id === paymentId);
      if (idx === -1) {
        idx = payments.findIndex(
          (p) => p.email === email && p.name === name && p.plan === plan
        );
      }
      if (idx === -1) {
        return res
          .status(404)
          .json({ ok: false, error: "Payment not found" });
      }

      if (file) {
        payments[idx].screenshotFilename = file.filename;
        payments[idx].screenshotUrl = `/uploads/${file.filename}`;
      }

      payments[idx].confirmed = true;
      savePayments();

      const info = await transporter.sendMail({
        from: smtpUser,
        to: email,
        subject: "Payment Received & Confirmed",
        text: `Dear ${name}, your payment for the ${plan} plan has been verified and activated. Thank you!`,
      });

      try {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log("Ethereal preview URL:", preview);
      } catch (ex) {
        // ignore if not Ethereal
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("Email failed:", err);
      res.status(500).json({ ok: false, error: "Failed to send email" });
    }
  }
);

// VERIFY PAYMENT BY ID
app.post("/api/payments/:id/verify", (req, res) => {
  const paymentId = req.params.id;
  const idx = payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Payment not found" });
  }
  payments[idx].confirmed = true;
  savePayments();
  res.json({ ok: true, payment: payments[idx] });
});

// ROOT HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Payment backend is running ✅");
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Payment backend running on http://localhost:${PORT}`)
);
