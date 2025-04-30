const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = new sqlite3.Database('./database.db');

// Set up uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logoUrl TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teamId INTEGER,
    isCaptain BOOLEAN,
    FOREIGN KEY (teamId) REFERENCES teams(id)
  )`);
});

// Routes
app.post('/api/teams', upload.single('logo'), (req, res) => {
  const name = req.body.name;
  const logoUrl = req.file ? '/uploads/' + req.file.filename : '';
  db.run("INSERT INTO teams (name, logoUrl) VALUES (?, ?)", [name, logoUrl], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, logoUrl });
  });
});

app.get('/api/teams', (req, res) => {
  db.all("SELECT * FROM teams", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/players', (req, res) => {
  const { name, teamId, isCaptain } = req.body;
  db.run("INSERT INTO players (name, teamId, isCaptain) VALUES (?, ?, ?)", [name, teamId, isCaptain === 'true'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, teamId, isCaptain });
  });
});

app.get('/api/players', (req, res) => {
  db.all(`SELECT players.*, teams.name AS teamName 
          FROM players 
          LEFT JOIN teams ON players.teamId = teams.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
