const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const DB_FILE = process.env.SQLITE_FILE || './data.sqlite';
const PORT = process.env.PORT || 8080;

const dbExists = fs.existsSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);

db.serialize(async () => {
  // Create tables if missing
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    body TEXT,
    author TEXT,
    created_at TEXT
  )`);

  // If DB was just created, insert hardcoded users
  if (!dbExists) {
    const insertUser = async (username, password) => {
      const hash = await bcrypt.hash(password, 10);
      db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash]);
      console.log(`Added default user: ${username}`);
    };
    await insertUser('ejemplo', 'ejemplo');
    await insertUser('admin', 'admin');
  }
});

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Helpers
function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
}

function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Malformed Authorization header' });
  jwt.verify(parts[1], JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ message: 'Invalid or expired token' });
    req.user = payload;
    next();
  });
}

// Auth: Register
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'username and password required' });

  const hash = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users (username, password) VALUES (?, ?)`,
    [username, hash],
    function (err) {
      if (err)
        return res.status(400).json({ message: 'username exists or error', error: err.message });
      const token = generateToken({ id: this.lastID, username });
      res.json({ token });
    }
  );
});

// Auth: Login
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'username and password required' });

  db.get(`SELECT id, username, password FROM users WHERE username = ?`, [username], async (err, row) => {
    if (err) return res.status(500).json({ message: 'db error', error: err.message });
    if (!row) return res.status(400).json({ message: 'invalid credentials' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(400).json({ message: 'invalid credentials' });

    const token = generateToken({ id: row.id, username: row.username });
    res.json({ token });
  });
});

// Create Post (protected)
app.post('/posts', authenticateToken, (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'title and body required' });

  const created_at = new Date().toISOString();
  db.run(
    `INSERT INTO posts (title, body, author, created_at) VALUES (?, ?, ?, ?)`,
    [title, body, req.user.username, created_at],
    function (err) {
      if (err) return res.status(500).json({ message: 'db error', error: err.message });
      db.get(`SELECT id, title, body, author, created_at FROM posts WHERE id = ?`, [this.lastID], (err2, row) => {
        if (err2) return res.status(500).json({ message: 'db error', error: err2.message });
        res.status(201).json(row);
      });
    }
  );
});

// Get all posts
app.get('/posts', (req, res) => {
  db.all(`SELECT id, title, body, author, created_at FROM posts ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'db error', error: err.message });
    res.json(rows);
  });
});

// Get one post
app.get('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'invalid id' });

  db.get(`SELECT id, title, body, author, created_at FROM posts WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'db error', error: err.message });
    if (!row) return res.status(404).json({ message: 'post not found' });
    res.json(row);
  });
});

// Health check
app.get('/', (req, res) => res.send('Posts API running with SQLite'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT} (SQLite)`));

process.on('SIGINT', () => {
  db.close();
  process.exit();
});
