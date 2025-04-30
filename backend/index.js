const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// SQLite DB stored in backend/data/database.db (persistent)
const dbPath = path.join(__dirname, "data", "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    isCaptain INTEGER DEFAULT 0,
    team_id INTEGER,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )`);
});

// Routes
app.get("/", (req, res) => {
  res.send("SPL Auction Backend is running!");
});

// Get all teams
app.get("/api/teams", (req, res) => {
  db.all("SELECT * FROM teams", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a team
app.post("/api/teams", (req, res) => {
  const { name, logo } = req.body;
  db.run("INSERT INTO teams (name, logo) VALUES (?, ?)", [name, logo], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, logo });
  });
});

// Get all players
app.get("/api/players", (req, res) => {
  db.all("SELECT * FROM players", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a player
app.post("/api/players", (req, res) => {
  const { name, role, isCaptain, team_id } = req.body;
  db.run(
    "INSERT INTO players (name, role, isCaptain, team_id) VALUES (?, ?, ?, ?)",
    [name, role, isCaptain ? 1 : 0, team_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, role, isCaptain, team_id });
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
