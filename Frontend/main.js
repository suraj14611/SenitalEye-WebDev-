// main.js
const API_BASE = "http://127.0.0.1:5000";

let statusChart = null;

// ---------------------- UPLOAD LOG FILE ------------------------
async function uploadLogs() {
  const fileInput = document.getElementById("logFile");
  const statusEl = document.getElementById("uploadStatus");
  const uploadBtn = document.getElementById("uploadBtn");

  if (!fileInput.files.length) {
    statusEl.textContent = "Please select a log file first.";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    uploadBtn.disabled = true;
    statusEl.textContent = "Uploading...";

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    statusEl.textContent = `Uploaded successfully. Total lines: ${data.count}`;
  } catch (err) {
    statusEl.textContent = "Upload failed.";
    console.error(err);
  } finally {
    uploadBtn.disabled = false;
  }
}

// ---------------------- LOAD RECENT LOGS ------------------------
async function loadLatestLogs() {
  try {
    const res = await fetch(`${API_BASE}/latest?n=50`);
    const data = await res.json();

    const viewer = document.getElementById("logViewer");
    viewer.textContent = Array.isArray(data) ? data.join("\n") : "";
    viewer.scrollTop = viewer.scrollHeight; // auto-scroll to bottom
  } catch (err) {
    console.error("Error loading logs:", err);
  }
}

// ---------------------- LOAD STATISTICS ------------------------
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();

    const ctx = document.getElementById("statusChart").getContext("2d");
    const labels = Object.keys(stats);
    const values = Object.values(stats);

    if (statusChart) {
      statusChart.destroy();
    }

    statusChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              "#22c55e", // green
              "#f97316", // orange
              "#ef4444", // red
              "#3b82f6", // blue
              "#6b7280", // gray
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: true, text: "HTTP Status Code Distribution" },
        },
      },
    });
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// ---------------------- RUN GPT AI ANALYSIS ------------------------
async function runAnalysis() {
  const output = document.getElementById("threatOutput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  output.textContent = "";
  analyzeBtn.disabled = true;
  output.textContent = "Running AI analysis...";

  try {
    // fetch latest logs
    const resLogs = await fetch(`${API_BASE}/latest?n=200`);
    const logs = await resLogs.json();

    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: logs.join("\n") }),
    });

    const data = await res.json();
    output.textContent = data.analysis || "No output from AI.";
  } catch (err) {
    output.textContent = "Analysis failed.";
    console.error(err);
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ---------------------- SETUP ------------------------
function setupEventHandlers() {
  document.getElementById("uploadBtn").addEventListener("click", uploadLogs);
  document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);

  // Auto-refresh every 2 seconds
  setInterval(() => {
    loadLatestLogs();
    loadStats();
  }, 2000);

  // Initial load
  loadLatestLogs();
  loadStats();
}

window.addEventListener("DOMContentLoaded", setupEventHandlers);
