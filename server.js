const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static('public'));


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS songs (
      song_name TEXT PRIMARY KEY,
      youtube_url TEXT NOT NULL,
      start_seconds INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

initDb().catch(err => {
  console.error('DB init failed:', err);
});

app.post('/songs', async (req, res) => {
  const { song_name, youtube_url, start_seconds } = req.body;

  if (!song_name || !youtube_url || start_seconds == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await pool.query(
      `
      INSERT INTO songs (song_name, youtube_url, start_seconds)
      VALUES ($1, $2, $3)
      ON CONFLICT (song_name)
      DO UPDATE SET
        youtube_url = EXCLUDED.youtube_url,
        start_seconds = EXCLUDED.start_seconds
      `,
      [song_name, youtube_url, start_seconds]
    );

    res.json({ message: 'Saved successfully' });
  } catch (err) {
    console.error('Save failed:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/songs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM songs ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch failed:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
