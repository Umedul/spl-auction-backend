const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "data", "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to SQLite database.");
  }
});

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

app.get("/", (req, res) => {
  res.send("SPL Auction Backend is running!");
});

app.get("/api/teams", (req, res) => {
  db.all("SELECT * FROM teams", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/teams", (req, res) => {
  const { name, logo } = req.body;
  db.run("INSERT INTO teams (name, logo) VALUES (?, ?)", [name, logo], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const newTeam = { id: this.lastID, name, logo };
    io.emit("new-team", newTeam);
    res.json(newTeam);
  });
});

app.get("/api/players", (req, res) => {
  db.all("SELECT * FROM players", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/players", (req, res) => {
  const { name, role, isCaptain, team_id } = req.body;
  db.run(
    "INSERT INTO players (name, role, isCaptain, team_id) VALUES (?, ?, ?, ?)",
    [name, role, isCaptain ? 1 : 0, team_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const newPlayerId = this.lastID;
      db.get(
        "SELECT players.*, teams.name AS teamName FROM players JOIN teams ON players.team_id = teams.id WHERE players.id = ?",
        [newPlayerId],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          io.emit("new-player", row);
          res.json(row);
        }
      );
    }
  );
});

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
});

server.listen(PORT, () => {
  console.log(`Server running with Socket.IO on port ${PORT}`);
});
