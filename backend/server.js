const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigin = process.env.CORS_ORIGIN || "*";
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");

app.set("trust proxy", 1);

app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(morgan(isProduction ? "combined" : "dev"));

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later."
  }
});

const alerts = [];
const failedAttemptsByIp = new Map();
const bruteForceAlertedByIp = new Map();
let mongoClient = null;
let alertsCollection = null;

const VALID_USERNAME = "admin";
const VALID_PASSWORD = "password123";

async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    return;
  }

  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB || "mini_soc");
    alertsCollection = db.collection("alerts");
    console.log("MongoDB connected. Alerts will be persisted.");
  } catch (error) {
    alertsCollection = null;
    mongoClient = null;
    console.error("MongoDB connection failed. Falling back to in-memory storage.");
  }
}

async function persistAlert(alert) {
  if (!alertsCollection) {
    return;
  }

  try {
    await alertsCollection.insertOne(alert);
  } catch (error) {
    console.error("Unable to persist alert to MongoDB.");
  }
}

async function loadAlerts() {
  if (alertsCollection) {
    try {
      return await alertsCollection
        .find({}, { projection: { _id: 0 } })
        .sort({ timestamp: -1 })
        .limit(200)
        .toArray();
    } catch (error) {
      console.error("Unable to read alerts from MongoDB. Returning in-memory alerts.");
    }
  }

  return alerts;
}

async function clearAlertsStore() {
  alerts.length = 0;

  if (alertsCollection) {
    try {
      await alertsCollection.deleteMany({});
    } catch (error) {
      console.error("Unable to clear MongoDB alerts.");
    }
  }
}

function createAlert({ type, severity, suggestedAction }) {
  const alert = {
    id: Date.now(),
    type,
    severity,
    timestamp: new Date().toISOString(),
    suggestedAction
  };

  alerts.unshift(alert);
  persistAlert(alert);
  return alert;
}

function containsXssPayload(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>|<\s*script\b[^>]*>/i.test(value);
}

function sanitizeInput(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 200);
}

app.post("/api/login", authLimiter, (req, res) => {
  const { username = "", password = "", ip = "unknown" } = req.body || {};
  const safeUsername = sanitizeInput(username);
  const safePassword = sanitizeInput(password);
  const safeIp = sanitizeInput(ip) || "unknown";

  const xssFound = [safeUsername, safePassword, safeIp].some(containsXssPayload);
  const generatedAlerts = [];

  if (xssFound) {
    generatedAlerts.push(
      createAlert({
        type: "XSS",
        severity: "Medium",
        suggestedAction: "Sanitize input and reject suspicious payloads."
      })
    );
  }

  const loginSuccess = safeUsername === VALID_USERNAME && safePassword === VALID_PASSWORD;

  if (!loginSuccess) {
    const previousAttempts = failedAttemptsByIp.get(safeIp) || 0;
    const newAttempts = previousAttempts + 1;
    failedAttemptsByIp.set(safeIp, newAttempts);

    if (newAttempts >= 5 && !bruteForceAlertedByIp.get(safeIp)) {
      bruteForceAlertedByIp.set(safeIp, true);
      generatedAlerts.push(
        createAlert({
          type: "Brute Force",
          severity: "High",
          suggestedAction: `Block IP ${safeIp} and enforce rate limiting.`
        })
      );
    }

    return res.status(401).json({
      success: false,
      message: "Invalid credentials.",
      failedAttemptsForIp: newAttempts,
      alerts: generatedAlerts
    });
  }

  failedAttemptsByIp.set(safeIp, 0);
  bruteForceAlertedByIp.set(safeIp, false);

  return res.json({
    success: true,
    message: "Login successful.",
    alerts: generatedAlerts
  });
});

app.post("/api/xss-test", (req, res) => {
  const { input = "" } = req.body || {};

  if (containsXssPayload(input)) {
    const alert = createAlert({
      type: "XSS",
      severity: "Medium",
      suggestedAction: "Sanitize input and enable output encoding."
    });

    return res.status(400).json({
      detected: true,
      message: "Potential XSS payload detected.",
      alert
    });
  }

  return res.json({
    detected: false,
    message: "No XSS payload detected."
  });
});

app.get("/api/alerts", async (req, res) => {
  const storedAlerts = await loadAlerts();
  res.json({ alerts: storedAlerts });
});

app.delete("/api/alerts", async (req, res) => {
  await clearAlertsStore();
  res.json({ success: true, message: "Alerts cleared." });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    persistence: alertsCollection ? "mongodb" : "memory",
    uptimeSeconds: Math.round(process.uptime())
  });
});

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

async function startServer() {
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`Mini SOC backend running on http://localhost:${PORT}`);
  });
}

startServer();