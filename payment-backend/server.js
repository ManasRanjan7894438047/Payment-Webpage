// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "payments.json");

// ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// simple storage for multer (file names kept unique)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

const app = express();
app.use(cors());                 // allow cross origin from front-end
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve uploaded files statically
app.use("/uploads", express.static(UPLOAD_DIR));

// load existing payments file or init
let payments = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE);
    payments = JSON.parse(raw) || [];
  }
} catch (err) {
  console.error("Failed reading payments.json", err);
  payments = [];
}

// Helper to persist payments array
function savePayments() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(payments, null, 2));
}

// POST endpoint to receive payment form + screenshot
// Field names we expect: name, email, address, plan (string), optional other fields. 
// Screenshot file field -> "screenshot"
app.post("/api/payments", upload.single("screenshot"), (req, res) => {
  try {
    const { name, email, address, plan } = req.body;
    const file = req.file;

    // Basic validation
    if (!name || !email || !address || !plan) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    const record = {
      id: Date.now().toString(),
      name,
      email,
      address,
      plan,
      screenshotFilename: file ? file.filename : null,
      screenshotUrl: file ? `/uploads/${file.filename}` : null,
      createdAt: new Date().toISOString()
    };

    payments.unshift(record); // recent first
    savePayments();

    return res.json({ ok: true, payment: record });
  } catch (err) {
    console.error("upload error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET endpoint to list all payments
app.get("/api/payments", (req, res) => {
  return res.json({ ok: true, payments });
});

// GET single payment by id
app.get("/api/payments/:id", (req, res) => {
  const rec = payments.find(p => p.id === req.params.id);
  if (!rec) return res.status(404).json({ ok: false, message: "Not found" });
  res.json({ ok: true, payment: rec });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Payment backend running on http://localhost:${PORT}`));
