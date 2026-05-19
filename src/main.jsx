import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Building2,
  CalendarClock,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Filter,
  Globe2,
  LogOut,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import './styles.css';

const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  lost: 'Lost'
};

const emptyLead = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'Website contact form',
  value: '',
  message: ''
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function apiClient(token, onLogout) {
  async function request(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (response.status === 401 && onLogout) {
      onLogout();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Request failed');
    }

    if (response.status === 204) return null;
    return response.json();
  }

  return { request };
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function shortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function PublicLeadCapture({ onBack }) {
  const [lead, setLead] = useState(emptyLead);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setLead((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('/api/leads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, value: Number(lead.value || 0) })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Could not submit lead');
      setLead(emptyLead);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel lead-capture-panel" onSubmit={submit}>
        <div className="panel-switch">
          <button className="switch-button" type="button" onClick={onBack}>
            Admin login
          </button>
          <span>Website form</span>
        </div>
        <div className="brand-mark capture">
          <Globe2 size={32} />
        </div>
        <h1>Request a Callback</h1>
        <p>New website enquiry</p>

        <div className="form-grid compact">
          <label>
            Name
            <input required value={lead.name} onChange={(event) => update('name', event.target.value)} />
          </label>
          <label>
            Email
            <input required type="email" value={lead.email} onChange={(event) => update('email', event.target.value)} />
          </label>
          <label>
            Phone
            <input value={lead.phone} onChange={(event) => update('phone', event.target.value)} />
          </label>
          <label>
            Company
            <input value={lead.company} onChange={(event) => update('company', event.target.value)} />
          </label>
        </div>
        <label>
          Project details
          <textarea required value={lead.message} onChange={(event) => update('message', event.target.value)} />
        </label>

        {sent ? <div className="success-text">Lead submitted to CRM.</div> : null}
        {error ? <div className="error-text">{error}</div> : null}

        <button className="primary-action" type="submit" disabled={loading}>
          <Send size={18} />
          {loading ? 'Submitting' : 'Submit enquiry'}
        </button>
      </form>
    </main>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@crm.local');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('admin');

  if (view === 'capture') {
    return <PublicLeadCapture onBack={() => setView('admin')} />;
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Login failed');
      onLogin(body.token, body.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
        <div className="panel-switch">
          <span>Admin login</span>
          <button className="switch-button" type="button" onClick={() => setView('capture')}>
            Website form
          </button>
        </div>
        <div className="brand-mark">
          <ShieldCheck size={32} />
        </div>
        <h1>Client Lead CRM</h1>
        <p>Admin access</p>

        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>

        {error ? <div className="error-text">{error}</div> : null}

        <button className="primary-action" type="submit" disabled={loading}>
          <ShieldCheck size={18} />
          {loading ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat-tile">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PipelineStrip({ stats, activeStatus, onChange }) {
  return (
    <div className="pipeline-strip">
      <button className={activeStatus === 'all' ? 'selected' : ''} type="button" onClick={() => onChange('status', 'all')}>
        <span>All</span>
        <strong>{stats?.total ?? 0}</strong>
      </button>
      {Object.entries(statusLabels).map(([status, label]) => (
        <button
          className={activeStatus === status ? 'selected' : ''}
          key={status}
          type="button"
          onClick={() => onChange('status', status)}
        >
          <span>{label}</span>
          <strong>{stats?.byStatus?.[status] ?? 0}</strong>
        </button>
      ))}
    </div>
  );
}

function LeadForm({ onCreate, disabled }) {
  const [lead, setLead] = useState(emptyLead);

  function update(field, value) {
    setLead((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onCreate({ ...lead, value: Number(lead.value || 0) });
    setLead(emptyLead);
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="section-title">
        <Plus size={18} />
        <h2>Add lead</h2>
      </div>
      <div className="form-grid">
        <label>
          Name
          <input required value={lead.name} onChange={(event) => update('name', event.target.value)} />
        </label>
        <label>
          Email
          <input required type="email" value={lead.email} onChange={(event) => update('email', event.target.value)} />
        </label>
        <label>
          Phone
          <input value={lead.phone} onChange={(event) => update('phone', event.target.value)} />
        </label>
        <label>
          Company
          <input value={lead.company} onChange={(event) => update('company', event.target.value)} />
        </label>
        <label>
          Source
          <select value={lead.source} onChange={(event) => update('source', event.target.value)}>
            <option>Website contact form</option>
            <option>Landing page</option>
            <option>Referral</option>
            <option>LinkedIn</option>
            <option>Event</option>
          </select>
        </label>
        <label>
          Value
          <input type="number" min="0" value={lead.value} onChange={(event) => update('value', event.target.value)} />
        </label>
      </div>
      <label>
        Message
        <textarea value={lead.message} onChange={(event) => update('message', event.target.value)} />
      </label>
      <button className="primary-action" type="submit" disabled={disabled}>
        <Plus size={17} />
        Create lead
      </button>
    </form>
  );
}

function LeadList({ leads, selectedId, onSelect, onDelete }) {
  return (
    <div className="lead-list">
      <div className="lead-table-head">
        <span>Lead</span>
        <span>Status</span>
        <span>Source</span>
        <span>Value</span>
      </div>
      {leads.map((lead) => (
        <div
          className={`lead-row ${lead.id === selectedId ? 'active' : ''}`}
          key={lead.id}
        >
          <button className="lead-select" type="button" onClick={() => onSelect(lead.id)}>
            <span className={`status-dot ${lead.status}`} />
            <span className="lead-main">
              <strong>{lead.name}</strong>
              <small>{lead.company || lead.email}</small>
            </span>
          </button>
          <span className={`status-pill ${lead.status}`}>{statusLabels[lead.status]}</span>
          <span className="source-chip">{lead.source}</span>
          <span className="lead-value">{currency(lead.value)}</span>
          <button
            className="delete-icon"
            type="button"
            title="Delete lead"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(lead.id);
            }}
          >
            <Trash2 size={18} />
          </button>
          <small className="lead-date">
            <Clock3 size={14} />
            {shortDate(lead.createdAt)}
          </small>
        </div>
      ))}
      {leads.length === 0 ? <div className="empty-state">No leads match the current filters.</div> : null}
    </div>
  );
}

function LeadDetail({ lead, onStatus, onAddNote, onToggleNote }) {
  const [note, setNote] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');

  useEffect(() => {
    setNote('');
    setFollowUpAt('');
  }, [lead?.id]);

  if (!lead) {
    return (
      <aside className="detail-panel">
        <div className="empty-state">Select a lead to view details.</div>
      </aside>
    );
  }

  async function submitNote(event) {
    event.preventDefault();
    await onAddNote(lead.id, { text: note, followUpAt });
    setNote('');
    setFollowUpAt('');
  }

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <h2>{lead.name}</h2>
          <p>{lead.company || 'Individual lead'}</p>
        </div>
      </div>

      <div className="status-segment" aria-label="Lead status">
        {Object.entries(statusLabels).map(([value, label]) => (
          <button
            className={lead.status === value ? 'active' : ''}
            key={value}
            type="button"
            onClick={() => onStatus(lead.id, value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="contact-block">
        <span>
          <Mail size={16} />
          {lead.email}
        </span>
        <span>
          <Phone size={16} />
          {lead.phone || 'No phone'}
        </span>
        <span>
          <Building2 size={16} />
          {lead.company || 'No company'}
        </span>
        <span>
          <CircleDollarSign size={16} />
          {currency(lead.value)}
        </span>
      </div>

      <div className="message-block">
        <strong>{lead.source}</strong>
        <p>{lead.message || 'No message captured.'}</p>
      </div>

      <form className="note-form" onSubmit={submitNote}>
        <div className="section-title">
          <MessageSquarePlus size={18} />
          <h3>Notes and follow-ups</h3>
        </div>
        <textarea
          required
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a note"
        />
        <div className="note-actions">
          <input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
          <button className="secondary-action" type="submit">
            <Plus size={16} />
            Add
          </button>
        </div>
      </form>

      <div className="notes-list">
        {lead.notes.map((item) => (
          <div className="note-item" key={item.id}>
            <button
              className={`check-button ${item.completed ? 'done' : ''}`}
              type="button"
              onClick={() => onToggleNote(lead.id, item.id, !item.completed)}
              title={item.completed ? 'Mark open' : 'Mark complete'}
            >
              <Check size={14} />
            </button>
            <div>
              <p>{item.text}</p>
              <small>{item.followUpAt ? `Follow-up ${shortDate(item.followUpAt)}` : `Added ${shortDate(item.createdAt)}`}</small>
            </div>
          </div>
        ))}
        {lead.notes.length === 0 ? <div className="empty-state">No notes yet.</div> : null}
      </div>
    </aside>
  );
}

function Dashboard({ token, user, onLogout }) {
  const { request } = useMemo(() => apiClient(token, onLogout), [token, onLogout]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState({ search: '', status: 'all', source: 'all', sort: 'newest' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedLead = leads.find((lead) => lead.id === selectedId) || leads[0];

  async function loadData(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(nextFilters).toString();
      const [leadData, statData] = await Promise.all([request(`/api/leads?${params}`), request('/api/stats')]);
      setLeads(leadData);
      setStats(statData);
      setSelectedId((current) => (leadData.some((lead) => lead.id === current) ? current : leadData[0]?.id || ''));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function applyFilter(field, value) {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    loadData(nextFilters);
  }

  async function createNewLead(payload) {
    setError('');
    try {
      await request('/api/leads', { method: 'POST', body: JSON.stringify(payload) });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(id, status) {
    setError('');
    try {
      await request(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addLeadNote(id, payload) {
    setError('');
    try {
      await request(`/api/leads/${id}/notes`, { method: 'POST', body: JSON.stringify(payload) });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleNote(id, noteId, completed) {
    setError('');
    try {
      await request(`/api/leads/${id}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeLead(id) {
    setError('');
    try {
      await request(`/api/leads/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Mini CRM</span>
          <h1>Client Lead Management</h1>
          <p className="topbar-subtitle">Lead intake, follow-ups, and status tracking</p>
        </div>
        <div className="admin-chip">
          <ShieldCheck size={17} />
          {user?.email || 'Admin'}
          <button type="button" onClick={onLogout} title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <Stat icon={ClipboardList} label="Leads" value={stats?.total ?? 0} />
        <Stat icon={RefreshCw} label="Active" value={(stats?.byStatus?.new ?? 0) + (stats?.byStatus?.contacted ?? 0)} />
        <Stat icon={Check} label="Converted" value={stats?.byStatus?.converted ?? 0} />
        <Stat icon={CalendarClock} label="Follow-ups" value={stats?.openFollowUps ?? 0} />
        <Stat icon={CircleDollarSign} label="Pipeline" value={currency(stats?.pipelineValue ?? 0)} />
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="workspace">
        <div className="main-column">
          <LeadForm onCreate={createNewLead} disabled={loading} />

          <PipelineStrip stats={stats} activeStatus={filters.status} onChange={applyFilter} />

          <div className="filters">
            <label className="search-box">
              <Search size={17} />
              <input
                value={filters.search}
                onChange={(event) => applyFilter('search', event.target.value)}
                placeholder="Search leads"
              />
            </label>
            <div className="filter-label">
              <Filter size={17} />
              Filters
            </div>
            <select value={filters.status} onChange={(event) => applyFilter('status', event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select value={filters.source} onChange={(event) => applyFilter('source', event.target.value)}>
              <option value="all">All sources</option>
              {(stats?.sources || []).map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
            <select value={filters.sort} onChange={(event) => applyFilter('sort', event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="value">Highest value</option>
              <option value="name">Name</option>
            </select>
          </div>

          <LeadList leads={leads} selectedId={selectedLead?.id} onSelect={setSelectedId} onDelete={removeLead} />
        </div>

        <LeadDetail lead={selectedLead} onStatus={changeStatus} onAddNote={addLeadNote} onToggleNote={toggleNote} />
      </section>
    </main>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('crm_token') || '');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('crm_user');
    return stored ? JSON.parse(stored) : null;
  });

  function login(nextToken, nextUser) {
    localStorage.setItem('crm_token', nextToken);
    localStorage.setItem('crm_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setToken('');
    setUser(null);
  }

  return token ? <Dashboard token={token} user={user} onLogout={logout} /> : <Login onLogin={login} />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
