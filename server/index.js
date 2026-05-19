import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  addNote,
  connectStore,
  createLead,
  deleteLead,
  getLead,
  getLeadStats,
  getStoreMode,
  listLeads,
  updateLead,
  updateNote
} from './store.js';

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@crm.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';
const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

const leadSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().default(''),
  company: z.string().trim().optional().default(''),
  source: z.string().trim().min(2),
  status: z.enum(['new', 'contacted', 'converted', 'lost']).optional(),
  value: z.coerce.number().min(0).optional().default(0),
  message: z.string().trim().optional().default('')
});

const noteSchema = z.object({
  text: z.string().trim().min(2),
  followUpAt: z.string().optional().or(z.literal('')),
  completed: z.boolean().optional().default(false)
});

app.use(cors());
app.use(express.json());

function createToken() {
  return jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Admin login required' });
  }
}

function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid request data', errors: result.error.flatten().fieldErrors });
    return null;
  }
  return result.data;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, store: getStoreMode() });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const emailMatches = String(email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const passwordMatches = await bcrypt.compare(String(password || ''), passwordHash);

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  res.json({
    token: createToken(),
    user: { email: ADMIN_EMAIL, role: 'admin' }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/stats', authenticate, async (_req, res, next) => {
  try {
    res.json(await getLeadStats());
  } catch (error) {
    next(error);
  }
});

app.get('/api/leads', authenticate, async (req, res, next) => {
  try {
    res.json(await listLeads(req.query));
  } catch (error) {
    next(error);
  }
});

app.post('/api/leads', async (req, res, next) => {
  try {
    const payload = parseBody(leadSchema, req, res);
    if (!payload) return;
    const lead = await createLead(payload);
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

app.get('/api/leads/:id', authenticate, async (req, res, next) => {
  try {
    const lead = await getLead(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/leads/:id', authenticate, async (req, res, next) => {
  try {
    const payload = parseBody(leadSchema.partial(), req, res);
    if (!payload) return;
    const lead = await updateLead(req.params.id, payload);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/leads/:id', authenticate, async (req, res, next) => {
  try {
    const deleted = await deleteLead(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Lead not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/leads/:id/notes', authenticate, async (req, res, next) => {
  try {
    const payload = parseBody(noteSchema, req, res);
    if (!payload) return;
    const lead = await addNote(req.params.id, payload);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/leads/:id/notes/:noteId', authenticate, async (req, res, next) => {
  try {
    const payload = parseBody(noteSchema.partial(), req, res);
    if (!payload) return;
    const lead = await updateNote(req.params.id, req.params.noteId, payload);
    if (!lead) return res.status(404).json({ message: 'Lead or note not found' });
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
});

connectStore()
  .then(({ mode }) => {
    app.listen(PORT, HOST, (error) => {
      if (error) {
        console.error('Failed to bind API server', error);
        process.exit(1);
      }
      console.log(`Mini CRM API running on http://${HOST}:${PORT} using ${mode} storage`);
    });
  })
  .catch((error) => {
    console.error('Failed to start API', error);
    process.exit(1);
  });
