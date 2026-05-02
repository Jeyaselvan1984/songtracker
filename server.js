const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static('public'));


const dbPath = process.env.DB_PATH ||
  path.join(__dirname, 'data', 'songs.db');

const db = new sqlite3.Database(dbPath)


db.run(`
  CREATE TABLE IF NOT EXISTS songs (
    song_name TEXT PRIMARY KEY,
    youtube_url TEXT NOT NULL,
    start_seconds INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/songs', (req, res) => {
  const { song_name, youtube_url, start_seconds } = req.body;

  const sql = `
    INSERT INTO songs (song_name, youtube_url, start_seconds)
    VALUES (?, ?, ?)
    ON CONFLICT(song_name)
    DO UPDATE SET
      youtube_url = excluded.youtube_url,
      start_seconds = excluded.start_seconds
  `;

  db.run(sql, [song_name, youtube_url, start_seconds], err => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Saved successfully' });
  });
});

app.get('/songs', (req, res) => {
  db.all(`SELECT * FROM songs ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
