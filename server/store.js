import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    source: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'lost'],
      default: 'new'
    },
    value: { type: Number, default: 0 },
    message: { type: String, default: '' },
    notes: [
      {
        id: { type: String, default: uuid },
        text: { type: String, required: true },
        followUpAt: { type: Date },
        completed: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const LeadModel = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

const seedLeads = [
  {
    id: uuid(),
    name: 'Riya Sharma',
    email: 'riya@brightstudio.in',
    phone: '+91 98765 43210',
    company: 'Bright Studio',
    source: 'Website contact form',
    status: 'new',
    value: 45000,
    message: 'Interested in a website redesign and monthly support.',
    notes: [
      {
        id: uuid(),
        text: 'Send service packages and ask for preferred call time.',
        followUpAt: new Date(Date.now() + 86400000).toISOString(),
        completed: false,
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuid(),
    name: 'Aman Verma',
    email: 'aman@northpeak.com',
    phone: '+91 91234 56789',
    company: 'Northpeak Logistics',
    source: 'Landing page',
    status: 'contacted',
    value: 85000,
    message: 'Needs CRM setup for sales team.',
    notes: [
      {
        id: uuid(),
        text: 'Discovery call completed. Prepare implementation estimate.',
        followUpAt: new Date(Date.now() + 172800000).toISOString(),
        completed: false,
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuid(),
    name: 'Neha Iyer',
    email: 'neha@edumark.co',
    phone: '+91 99887 77665',
    company: 'EduMark',
    source: 'Referral',
    status: 'converted',
    value: 120000,
    message: 'Wants automation for admission inquiries.',
    notes: [
      {
        id: uuid(),
        text: 'Converted to onboarding. Share kickoff checklist.',
        completed: true,
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let mode = 'file';

function serializeMongoLead(lead) {
  const item = lead.toObject ? lead.toObject() : lead;
  return {
    ...item,
    id: item._id?.toString() || item.id,
    _id: undefined
  };
}

async function readFileLeads() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(seedLeads, null, 2));
    return seedLeads;
  }
}

async function writeFileLeads(leads) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(leads, null, 2));
}

export async function connectStore() {
  if (!process.env.MONGODB_URI) {
    await readFileLeads();
    return { mode };
  }

  await mongoose.connect(process.env.MONGODB_URI);
  mode = 'mongo';
  const count = await LeadModel.countDocuments();
  if (count === 0) {
    await LeadModel.insertMany(seedLeads.map(({ id, ...lead }) => lead));
  }
  return { mode };
}

export function getStoreMode() {
  return mode;
}

export async function listLeads({ search = '', status = 'all', source = 'all', sort = 'newest' } = {}) {
  if (mode === 'mongo') {
    const query = {};
    if (status !== 'all') query.status = status;
    if (source !== 'all') query.source = source;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') }
      ];
    }
    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      value: { value: -1 },
      name: { name: 1 }
    };
    const leads = await LeadModel.find(query).sort(sortMap[sort] || sortMap.newest);
    return leads.map(serializeMongoLead);
  }

  let leads = await readFileLeads();
  if (status !== 'all') leads = leads.filter((lead) => lead.status === status);
  if (source !== 'all') leads = leads.filter((lead) => lead.source === source);
  if (search) {
    const needle = search.toLowerCase();
    leads = leads.filter((lead) =>
      [lead.name, lead.email, lead.company].some((field) => field?.toLowerCase().includes(needle))
    );
  }

  return leads.sort((a, b) => {
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'value') return b.value - a.value;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export async function getLead(id) {
  if (mode === 'mongo') {
    const lead = await LeadModel.findById(id);
    return lead ? serializeMongoLead(lead) : null;
  }

  const leads = await readFileLeads();
  return leads.find((lead) => lead.id === id) || null;
}

export async function createLead(payload) {
  const now = new Date().toISOString();
  const lead = {
    id: uuid(),
    status: 'new',
    notes: [],
    value: 0,
    phone: '',
    company: '',
    message: '',
    ...payload,
    createdAt: now,
    updatedAt: now
  };

  if (mode === 'mongo') {
    const created = await LeadModel.create(lead);
    return serializeMongoLead(created);
  }

  const leads = await readFileLeads();
  leads.unshift(lead);
  await writeFileLeads(leads);
  return lead;
}

export async function updateLead(id, payload) {
  if (mode === 'mongo') {
    const updated = await LeadModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    return updated ? serializeMongoLead(updated) : null;
  }

  const leads = await readFileLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return null;
  leads[index] = { ...leads[index], ...payload, updatedAt: new Date().toISOString() };
  await writeFileLeads(leads);
  return leads[index];
}

export async function deleteLead(id) {
  if (mode === 'mongo') {
    const deleted = await LeadModel.findByIdAndDelete(id);
    return Boolean(deleted);
  }

  const leads = await readFileLeads();
  const nextLeads = leads.filter((lead) => lead.id !== id);
  if (nextLeads.length === leads.length) return false;
  await writeFileLeads(nextLeads);
  return true;
}

export async function addNote(id, payload) {
  const note = {
    id: uuid(),
    text: payload.text,
    followUpAt: payload.followUpAt || undefined,
    completed: Boolean(payload.completed),
    createdAt: new Date().toISOString()
  };

  if (mode === 'mongo') {
    const lead = await LeadModel.findById(id);
    if (!lead) return null;
    lead.notes.unshift(note);
    await lead.save();
    return serializeMongoLead(lead);
  }

  const leads = await readFileLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return null;
  leads[index].notes.unshift(note);
  leads[index].updatedAt = new Date().toISOString();
  await writeFileLeads(leads);
  return leads[index];
}

export async function updateNote(id, noteId, payload) {
  if (mode === 'mongo') {
    const lead = await LeadModel.findById(id);
    if (!lead) return null;
    const note = lead.notes.find((item) => item.id === noteId);
    if (!note) return null;
    Object.assign(note, payload);
    await lead.save();
    return serializeMongoLead(lead);
  }

  const leads = await readFileLeads();
  const lead = leads.find((item) => item.id === id);
  if (!lead) return null;
  const note = lead.notes.find((item) => item.id === noteId);
  if (!note) return null;
  Object.assign(note, payload);
  lead.updatedAt = new Date().toISOString();
  await writeFileLeads(leads);
  return lead;
}

export async function getLeadStats() {
  const leads = await listLeads();
  const byStatus = leads.reduce(
    (acc, lead) => ({ ...acc, [lead.status]: (acc[lead.status] || 0) + 1 }),
    { new: 0, contacted: 0, converted: 0, lost: 0 }
  );
  const pipelineValue = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const sources = [...new Set(leads.map((lead) => lead.source))].sort();
  const openFollowUps = leads.reduce(
    (sum, lead) => sum + lead.notes.filter((note) => note.followUpAt && !note.completed).length,
    0
  );

  return {
    total: leads.length,
    byStatus,
    pipelineValue,
    sources,
    openFollowUps
  };
}
