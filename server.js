import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(process.cwd(), "..", "Frontend")));

// Ensure logs file exists
const LOG_FILE = path.join(process.cwd(), "logs", "logs.txt");

if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, "");
}

// Multer for file uploads
const upload = multer({ dest: "uploads/" });

// ---------------------- UPLOAD LOG FILE ------------------------
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const raw = fs.readFileSync(req.file.path, "utf8");

  // Append logs to central logs file
  fs.appendFileSync(LOG_FILE, raw + "\n");

  // Count number of lines in uploaded file
  const count = raw.split("\n").filter(line => line.trim() !== "").length;

  // Delete temporary upload
  fs.unlinkSync(req.file.path);

  return res.json({ message: "Uploaded", count });
});

// ---------------------- GET LATEST LOGS ------------------------
app.get("/latest", (req, res) => {
  const n = parseInt(req.query.n || "50");

  const raw = fs.readFileSync(LOG_FILE, "utf8").trim();
  const lines = raw.split("\n");

  const latest = lines.slice(-n);
  res.json(latest);
});

// ---------------------- STATS (HTTP status code counts) ------------------------
app.get("/stats", (req, res) => {
  const raw = fs.readFileSync(LOG_FILE, "utf8").trim();
  const lines = raw.split("\n");

  const stats = {};

  for (const line of lines) {
    const match = line.match(/\b(\d{3})\b/); // find 3-digit status code
    if (match) {
      const code = match[1];
      stats[code] = (stats[code] || 0) + 1;
    }
  }

  res.json(stats);
});

// ---------------------- OPENAI CLIENT ------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------------------- AI ANALYSIS ------------------------
app.post("/analyze", async (req, res) => {
  try {
    const logs = req.body.logs || "No logs provided";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a cybersecurity log analyzer." },
        { role: "user", content: logs }
      ]
    });

    return res.json({
      analysis: response.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------- START SERVER ------------------------
app.listen(5000, () =>
  console.log("🔥 Backend running on http://localhost:5000")
);
