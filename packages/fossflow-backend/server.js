import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.BACKEND_PORT || 3001;
const HOST = process.env.BACKEND_HOST || '0.0.0.0';
const DATA_DIR = process.env.STORAGE_PATH ? path.dirname(process.env.STORAGE_PATH) : '/data';
const DB_PATH = path.join(DATA_DIR, 'fossflow.db');
const KEY_PATH = path.join(DATA_DIR, '.encryption_key');
const DEFAULT_QUOTA = 20;

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

function getEncryptionKey() {
  if (!fs.existsSync(KEY_PATH)) {
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(KEY_PATH, key, { mode: 0o600 });
    return key;
  }
  return fs.readFileSync(KEY_PATH, 'utf8').trim();
}

const ENC_KEY = getEncryptionKey();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENC_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENC_KEY, 'hex'), iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    quota INTEGER NOT NULL DEFAULT ${DEFAULT_QUOTA},
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS diagrams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    thumbnail TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    manual_saved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Migrate existing DB: add manual_saved_at if missing
try {
  db.prepare('ALTER TABLE diagrams ADD COLUMN manual_saved_at TEXT').run();
} catch {}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

function getJwtSecret() {
  let secret = getSetting('jwt_secret');
  if (!secret) {
    secret = crypto.randomBytes(64).toString('hex');
    setSetting('jwt_secret', secret);
  }
  return secret;
}

// ---------------------------------------------------------------------------
// First-run: create admin account
// ---------------------------------------------------------------------------

function firstRunSetup() {
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    const adminPassword = crypto.randomBytes(16).toString('base64url');
    const hash = bcrypt.hashSync(adminPassword, 12);
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, quota, active, created_at)
      VALUES (?, 'admin', 'admin@fossflow.local', ?, 'admin', 999, 1, ?)
    `).run(id, hash, new Date().toISOString());

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║           FOSSFLOW ADMIN CREDENTIALS              ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Username : admin                                 ║`);
    console.log(`║  Password : ${adminPassword.padEnd(36)} ║`);
    console.log('║                                                   ║');
    console.log('║  Change this password in the Admin Panel!         ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  }
}

firstRunSetup();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
const readLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = db.prepare('SELECT id, username, email, role, quota, active FROM users WHERE id = ?').get(payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.get('/api/storage/status', (req, res) => {
  res.json({ enabled: true, version: '2.0.0', authRequired: true });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user || !user.active) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role, quota: user.quota }
  });
});

app.post('/api/auth/register', authLimiter, (req, res) => {
  const { username, email, password, inviteToken } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const signupMode = getSetting('signup_mode', 'open');

  if (signupMode === 'invite') {
    if (!inviteToken) return res.status(403).json({ error: 'Invitation required' });
    const invite = db.prepare('SELECT * FROM invites WHERE token = ? AND used = 0 AND expires_at > ?').get(inviteToken, new Date().toISOString());
    if (!invite) return res.status(403).json({ error: 'Invalid or expired invitation' });
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Invitation was issued to a different email address' });
    }
    db.prepare('UPDATE invites SET used = 1 WHERE token = ?').run(inviteToken);
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(409).json({ error: 'Username or email already taken' });

  const hash = bcrypt.hashSync(password, 12);
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, quota, active, created_at)
    VALUES (?, ?, ?, ?, 'user', ?, 1, ?)
  `).run(id, username, email, hash, DEFAULT_QUOTA, new Date().toISOString());

  const token = jwt.sign({ id, role: 'user' }, getJwtSecret(), { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: { id, username, email, role: 'user', quota: DEFAULT_QUOTA }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Signup mode / invite check
// ---------------------------------------------------------------------------

app.get('/api/auth/signup-info', (req, res) => {
  const mode = getSetting('signup_mode', 'open');
  res.json({ mode });
});

app.get('/api/auth/invite-check', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  const invite = db.prepare('SELECT email FROM invites WHERE token = ? AND used = 0 AND expires_at > ?').get(token, new Date().toISOString());
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invitation' });
  res.json({ valid: true, email: invite.email });
});

// ---------------------------------------------------------------------------
// User diagram routes
// ---------------------------------------------------------------------------

app.get('/api/diagrams', authenticate, readLimiter, (req, res) => {
  const diagrams = db.prepare(`
    SELECT id, name, thumbnail, created_at, updated_at, manual_saved_at FROM diagrams
    WHERE user_id = ? ORDER BY updated_at DESC
  `).all(req.user.id);
  res.json(diagrams);
});

app.get('/api/diagrams/:id', authenticate, readLimiter, (req, res) => {
  const diagram = db.prepare('SELECT * FROM diagrams WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!diagram) return res.status(404).json({ error: 'Diagram not found' });
  try {
    const data = JSON.parse(diagram.data);
    res.json({ ...data, id: diagram.id, name: diagram.name, thumbnail: diagram.thumbnail, created_at: diagram.created_at, updated_at: diagram.updated_at });
  } catch {
    res.status(500).json({ error: 'Failed to parse diagram' });
  }
});

app.post('/api/diagrams', authenticate, writeLimiter, (req, res) => {
  const user = req.user;
  const count = db.prepare('SELECT COUNT(*) as c FROM diagrams WHERE user_id = ?').get(user.id).c;
  if (count >= user.quota) {
    return res.status(429).json({ error: `Diagram quota reached (${user.quota}). Delete some diagrams to save more.` });
  }

  const { name, thumbnail, ...diagramData } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO diagrams (id, user_id, name, data, thumbnail, created_at, updated_at, manual_saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user.id, name, JSON.stringify(diagramData), thumbnail || null, now, now, now);

  res.status(201).json({ id, name, created_at: now, updated_at: now, manual_saved_at: now });
});

app.put('/api/diagrams/:id', authenticate, writeLimiter, (req, res) => {
  const existing = db.prepare('SELECT id FROM diagrams WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Diagram not found' });

  const { name, thumbnail, isManualSave, ...diagramData } = req.body;
  const now = new Date().toISOString();
  if (isManualSave) {
    db.prepare(`
      UPDATE diagrams SET name = ?, data = ?, thumbnail = ?, updated_at = ?, manual_saved_at = ? WHERE id = ? AND user_id = ?
    `).run(name || 'Untitled', JSON.stringify(diagramData), thumbnail || null, now, now, req.params.id, req.user.id);
  } else {
    db.prepare(`
      UPDATE diagrams SET name = ?, data = ?, thumbnail = ?, updated_at = ? WHERE id = ? AND user_id = ?
    `).run(name || 'Untitled', JSON.stringify(diagramData), thumbnail || null, now, req.params.id, req.user.id);
  }

  res.json({ id: req.params.id, updated_at: now, manual_saved_at: isManualSave ? now : undefined });
});

app.patch('/api/diagrams/:id/thumbnail', authenticate, writeLimiter, (req, res) => {
  const existing = db.prepare('SELECT id FROM diagrams WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Diagram not found' });
  const { thumbnail } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE diagrams SET thumbnail = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(thumbnail || null, now, req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/diagrams/:id', authenticate, writeLimiter, (req, res) => {
  const result = db.prepare('DELETE FROM diagrams WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Diagram not found' });
  res.json({ success: true });
});

// Quota info
app.get('/api/user/quota', authenticate, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM diagrams WHERE user_id = ?').get(req.user.id).c;
  res.json({ used: count, total: req.user.quota });
});

// ---------------------------------------------------------------------------
// Public readonly diagram route (no auth required)
// ---------------------------------------------------------------------------

app.get('/api/public/diagrams/:id', readLimiter, (req, res) => {
  const diagram = db.prepare('SELECT * FROM diagrams WHERE id = ?').get(req.params.id);
  if (!diagram) return res.status(404).json({ error: 'Diagram not found' });
  try {
    const data = JSON.parse(diagram.data);
    res.json({ ...data, id: diagram.id, name: diagram.name });
  } catch {
    res.status(500).json({ error: 'Failed to parse diagram' });
  }
});

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, quota, active, created_at, last_login,
      (SELECT COUNT(*) FROM diagrams WHERE user_id = users.id) as diagram_count
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

app.put('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const { quota, active, role, password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (quota !== undefined) db.prepare('UPDATE users SET quota = ? WHERE id = ?').run(Number(quota), req.params.id);
  if (active !== undefined) db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  if (role !== undefined && ['user', 'admin'].includes(role)) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  }
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  }

  res.json({ success: true });
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

// Admin settings
app.get('/api/admin/settings', authenticate, requireAdmin, (req, res) => {
  const mode = getSetting('signup_mode', 'open');
  res.json({ signup_mode: mode });
});

app.put('/api/admin/settings', authenticate, requireAdmin, (req, res) => {
  const { signup_mode } = req.body;
  if (signup_mode && ['open', 'invite'].includes(signup_mode)) {
    setSetting('signup_mode', signup_mode);
  }
  res.json({ success: true });
});

// SMTP settings (stored encrypted)
app.get('/api/admin/smtp', authenticate, requireAdmin, (req, res) => {
  const smtpRaw = getSetting('smtp_config');
  if (!smtpRaw) return res.json({ configured: false });
  try {
    const cfg = JSON.parse(decrypt(smtpRaw));
    res.json({
      configured: true,
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      user: cfg.user,
      from: cfg.from,
      password: '••••••••'
    });
  } catch {
    res.json({ configured: false });
  }
});

app.put('/api/admin/smtp', authenticate, requireAdmin, (req, res) => {
  const { host, port, secure, user, password, from } = req.body;
  if (!host || !port || !user || !from) return res.status(400).json({ error: 'host, port, user, and from are required' });

  const existing = getSetting('smtp_config');
  let existingPassword = '';
  if (existing) {
    try { existingPassword = JSON.parse(decrypt(existing)).password || ''; } catch {}
  }

  const cfg = {
    host,
    port: Number(port),
    secure: Boolean(secure),
    user,
    password: password || existingPassword,
    from
  };

  setSetting('smtp_config', encrypt(JSON.stringify(cfg)));
  res.json({ success: true });
});

app.post('/api/admin/smtp/test', authenticate, requireAdmin, async (req, res) => {
  const smtpRaw = getSetting('smtp_config');
  if (!smtpRaw) return res.status(400).json({ error: 'SMTP not configured' });
  try {
    const cfg = JSON.parse(decrypt(smtpRaw));
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.password }
    });
    await transporter.sendMail({
      from: cfg.from,
      to: req.user.email,
      subject: 'FossFLOW SMTP Test',
      text: 'SMTP configuration is working correctly.'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invites
app.get('/api/admin/invites', authenticate, requireAdmin, (req, res) => {
  const invites = db.prepare(`
    SELECT i.*, u.username as created_by_name
    FROM invites i LEFT JOIN users u ON u.id = i.created_by
    ORDER BY i.created_at DESC
  `).all();
  res.json(invites);
});

app.post('/api/admin/invites', authenticate, requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO invites (id, email, token, used, created_by, created_at, expires_at)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `).run(crypto.randomUUID(), email, token, req.user.id, now.toISOString(), expires.toISOString());

  // Try to send invite email
  const smtpRaw = getSetting('smtp_config');
  if (smtpRaw) {
    try {
      const cfg = JSON.parse(decrypt(smtpRaw));
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.password }
      });
      const baseUrl = req.headers.origin || `http://${req.headers.host}`;
      await transporter.sendMail({
        from: cfg.from,
        to: email,
        subject: 'You have been invited to FossFLOW',
        html: `
          <h2>You have been invited to FossFLOW</h2>
          <p>Click the link below to create your account. This invitation expires in 7 days.</p>
          <p><a href="${baseUrl}/register?token=${token}">Accept Invitation</a></p>
          <p>Or copy this link: ${baseUrl}/register?token=${token}</p>
        `
      });
      res.status(201).json({ success: true, emailSent: true, token });
    } catch (err) {
      res.status(201).json({ success: true, emailSent: false, token, emailError: err.message });
    }
  } else {
    res.status(201).json({ success: true, emailSent: false, token, emailError: 'SMTP not configured' });
  }
});

app.delete('/api/admin/invites/:id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM invites WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, HOST, () => {
  console.log(`FossFLOW Backend v2 running on ${HOST}:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
