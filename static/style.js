const { useState, useEffect, useMemo, useRef, createContext, useContext } = React;

/******************** Utilities & Local Storage ********************/
const uid = () => Math.random().toString(36).slice(2, 10);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// Seed demo data once
const seedIfEmpty = () => {
  const seeded = localStorage.getItem('tms_seeded');
  if (seeded) return;
  const userId = uid();
  const demo = {
    users: [{ id: userId, name: 'Demo User', email: 'demo@task.app', password: 'demo' }],
    session: { token: uid(), userId },
    projects: [
      { id: uid(), name: 'Website Revamp', description: 'New marketing site', owner: userId, members: [userId], createdAt: Date.now(), updatedAt: Date.now() },
    ],
    tasks: []
  };
  const p = demo.projects[0].id;
  const cats = ['Frontend', 'Backend', 'Design'];
  const makeTask = (t, st, pr, pg) => ({ id: uid(), projectId: p, title: t, description: t + ' details', category: cats[Math.floor(Math.random() * cats.length)], priority: pr, status: st, dueDate: new Date(Date.now() + 86400000 * (2 + Math.random() * 10)).toISOString().slice(0, 10), progress: pg, assignees: [userId], createdBy: userId, createdAt: Date.now(), updatedAt: Date.now() });
  demo.tasks.push(
    makeTask('Landing hero', 'backlog', 'medium', 10),
    makeTask('Auth API', 'in_progress', 'high', 40),
    makeTask('Style guide', 'review', 'low', 80),
    makeTask('Deploy to host', 'done', 'medium', 100)
  );
  save('tms_data', demo);
  localStorage.setItem('tms_seeded', '1');
};
seedIfEmpty();

/******************** Fake API over localStorage ********************/
const api = {
  _read() { return load('tms_data', { users: [], session: null, projects: [], tasks: [] }); },
  _write(data) { save('tms_data', data); },
  register({ name, email, password }) {
    const db = this._read();
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Email already registered');
    const user = { id: uid(), name, email, password }; db.users.push(user);
    db.session = { token: uid(), userId: user.id }; this._write(db); return { token: db.session.token, user };
  },
  login({ email, password }) {
    const db = this._read();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid credentials');
    db.session = { token: uid(), userId: user.id }; this._write(db); return { token: db.session.token, user };
  },
  logout() { const db = this._read(); db.session = null; this._write(db); },
  me() { const db = this._read(); if (!db.session) return null; return db.users.find(u => u.id === db.session.userId) || null; },
  listUsers(q) { const db = this._read(); if (!q) return db.users; const r = new RegExp(q, 'i'); return db.users.filter(u => r.test(u.name) || r.test(u.email)); },

  projectsForUser(uid) { const db = this._read(); return db.projects.filter(p => p.owner === uid || p.members.includes(uid)).sort((a, b) => b.updatedAt - a.updatedAt); },
  createProject({ name, description }, userId) {
    const db = this._read();
    const p = {
      id: uid(), // ✅ use global uid function directly
      name,
      description,
      owner: userId,
      members: [userId],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.projects.push(p);
    this._write(db);
    return p;
  },
  addMember(projectId, userId) { const db = this._read(); const p = db.projects.find(p => p.id === projectId); if (!p) throw new Error('Project not found'); if (!p.members.includes(userId)) p.members.push(userId); p.updatedAt = Date.now(); this._write(db); return p; },

  tasks({ projectId, status, category, q }) { const db = this._read(); let t = db.tasks.filter(t => t.projectId === projectId); if (status) t = t.filter(x => x.status === status); if (category) t = t.filter(x => x.category === category); if (q) { const r = new RegExp(q, 'i'); t = t.filter(x => r.test(x.title) || r.test(x.description)); } return t.sort((a, b) => b.updatedAt - a.updatedAt); },
  createTask(data, uid) { const db = this._read(); const t = { id: uid_(), createdBy: uid, createdAt: Date.now(), updatedAt: Date.now(), ...data }; function uid_() { return uid() } db.tasks.push(t); const p = db.projects.find(p => p.id === t.projectId); if (p) { p.updatedAt = Date.now() } this._write(db); return t; },
  updateTask(id, patch) { const db = this._read(); const t = db.tasks.find(t => t.id === id); if (!t) throw new Error('Task not found'); Object.assign(t, patch, { updatedAt: Date.now() }); this._write(db); return t; },
  deleteTask(id) { const db = this._read(); db.tasks = db.tasks.filter(t => t.id !== id); this._write(db); return { ok: true } },
  deleteProject(id) {
  const db = this._read();
  db.projects = db.projects.filter(p => p.id !== id);    // remove the project
  db.tasks = db.tasks.filter(t => t.projectId !== id);   // also remove tasks in that project
  this._write(db);
  return { ok: true };
},

};

/******************** Auth Context ********************/
const AuthCtx = createContext();
const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.me());
  const login = (payload) => { const { user } = api.login(payload); setUser(user); };
  const register = (payload) => { const { user } = api.register(payload); setUser(user); };
  const logout = () => { api.logout(); setUser(null); };
  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}

/******************** Components ********************/
const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <div className="nav">
      <div className="nav-inner">
        <div className="flex"><span className="brand">TaskFlow</span></div>
        <div className="flex">
          {user ? (<>
            <span className="muted">{user.name}</span>
            <button className="btn" onClick={logout}>Logout</button>
          </>) : null}
        </div>
      </div>
    </div>
  );
};

const Login = ({ onDone }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@task.app');
  const [password, setPassword] = useState('demo');
  const [err, setErr] = useState('');
  const submit = (e) => { e.preventDefault(); try { login({ email, password }); onDone(); } catch (ex) { setErr(ex.message) } };
  return (
    <div className="auth">
      <div className="card">
        <h2>Welcome back</h2>
        <p className="muted">Use the demo credentials or create a new account.</p>
        {err && <p style={{ color: 'salmon' }}>{err}</p>}
        <form onSubmit={submit} className="grid">
          <div>
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label>Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn primary" type="submit">Login</button>
        </form>
      </div>
      <RegisterInline onDone={onDone} />
    </div>
  );
};

const RegisterInline = ({ onDone }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => { e.preventDefault(); try { register({ name, email, password }); onDone(); } catch (ex) { setErr(ex.message) } };
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Create a new account</h3>
      {err && <p style={{ color: 'salmon' }}>{err}</p>}
      <form onSubmit={submit} className="grid cols-2">
        <div>
          <label>Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label>Email</label>
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button className="btn primary" type="submit">Register</button>
        </div>
      </form>
    </div>
  );
};

const ProjectList = ({ onOpen, onCreate }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState(() => api.projectsForUser(user.id));
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const create = () => {
    if (!name.trim()) return;
    const p = api.createProject({ name, description: desc }, user.id);
    setProjects(api.projectsForUser(user.id));
    setName(''); setDesc(''); setShowNew(false);
    onOpen(p.id);
  };

  const del = (id, name) => {
    if (confirm(`Delete project "${name}"?`)) {
      api.deleteProject(id);
      setProjects(api.projectsForUser(user.id));
    }
  };

  return (
    <div className="container">
      <div className="flex space-between" style={{ margin: '12px 0' }}>
        <h2>Projects</h2>
        <div className="flex"><button className="btn primary" onClick={() => setShowNew(true)}>New Project</button></div>
      </div>
      {projects.length === 0 && <p className="muted">No projects yet. Create your first one.</p>}
      <div className="grid cols-3">
        {projects.map(p => (
          <div key={p.id} className="card">
            <div className="flex space-between">
              <h3>{p.name}</h3>
              <button className="icon-btn" title="Delete Project" onClick={() => del(p.id, p.name)}>🗑️</button>
            </div>
            <p className="muted">{p.description || '—'}</p>
            <div className="flex space-between">
              <span className="badge">Members: {p.members.length}</span>
              <span className="badge">Updated: {new Date(p.updatedAt).toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => onOpen(p.id)}>Open</button>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="modal" onClick={() => setShowNew(false)}>
          <div className="card" onClick={e => e.stopPropagation()}>
            <h3>New Project</h3>
            <div className="grid cols-2">
              <div>
                <label>Name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label>Description</label>
                <input className="input" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
            </div>
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn primary" onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const MemberPicker = ({ onPick }) => {
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  useEffect(() => { const t = setTimeout(() => { setRes(api.listUsers(q)); }, 300); return () => clearTimeout(t); }, [q]);
  return (
    <div>
      <input className="input" placeholder="Search users…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="grid" style={{ marginTop: 8 }}>
        {res.map(u => (
          <button key={u.id} className="btn ghost" onClick={() => onPick(u)}>{u.name} <span className="muted">({u.email})</span></button>
        ))}
      </div>
    </div>
  );
};

const TaskForm = ({ initial = {}, onSubmit, onCancel }) => {
  const [v, setV] = useState({ title: '', description: '', category: 'General', priority: 'medium', status: 'backlog', dueDate: '', progress: 0, assignees: [], ...initial });
  useEffect(() => setV(prev => ({ ...prev, ...initial })), [initial.id]);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  return (
    <div className="card">
      <h3>{initial.id ? 'Edit Task' : 'New Task'}</h3>
      <div className="grid cols-2">
        <div><label>Title</label><input className="input" value={v.title} onChange={set('title')} /></div>
        <div><label>Category</label><input className="input" value={v.category} onChange={set('category')} /></div>
        <div><label>Priority</label>
          <select className="select" value={v.priority} onChange={set('priority')}>
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
        </div>
        <div><label>Status</label>
          <select className="select" value={v.status} onChange={set('status')}>
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div><label>Due Date</label><input type="date" className="input" value={v.dueDate || ''} onChange={set('dueDate')} /></div>
        <div><label>Progress (%)</label><input type="number" min="0" max="100" className="input" value={v.progress} onChange={set('progress')} /></div>
        <div style={{ gridColumn: '1/3' }}><label>Description</label><textarea rows="3" className="input" value={v.description} onChange={set('description')} /></div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={() => onSubmit(v)}>{initial.id ? 'Save' : 'Create'}</button>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onEdit, onDelete, onMove }) => (
  <div className="task">
    <div className="flex space-between">
      <strong>{task.title}</strong>
      <span className={`pill ${task.priority}`}>{task.priority}</span>
    </div>
    <div className="muted" style={{ marginTop: 4 }}>{task.category}</div>
    {task.dueDate && <div className="muted">Due: {task.dueDate}</div>}
    <div className="progress" style={{ marginTop: 8 }}><span style={{ width: Math.max(0, Math.min(100, task.progress)) + '%' }} /></div>
    <div className="flex" style={{ justifyContent: 'space-between', marginTop: 8 }}>
      <div className="muted" style={{ fontSize: 12 }}>Assignees: {task.assignees.length}</div>
      <div className="flex">
        <button className="btn small" onClick={() => onEdit(task)}>Edit</button>
        <button className="btn small" onClick={() => onMove(task, 'left')}>◀</button>
        <button className="btn small" onClick={() => onMove(task, 'right')}>▶</button>
        <button className="btn small" onClick={() => onDelete(task.id)} style={{ borderColor: 'transparent', background: '#2b1121', color: '#fca5a5' }}>Delete</button>
      </div>
    </div>
  </div>
);

const columns = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

const Kanban = ({ tasks, onEdit, onDelete, onMove }) => (
  <div className="kanban">
    {columns.map(col => (
      <div key={col.key} className="column">
        <h4>{col.title} <span className="badge">{tasks.filter(t => t.status === col.key).length}</span></h4>
        {tasks.filter(t => t.status === col.key).map(t => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
        ))}
      </div>
    ))}
  </div>
);

const ProjectPage = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const [project, setProject] = useState(() => api.projectsForUser(user.id).find(p => p.id === projectId));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [tasks, setTasks] = useState(() => api.tasks({ projectId }));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  const refresh = () => setTasks(api.tasks({ projectId, q: query, status: filter.status, category: filter.category }));
  useEffect(() => { refresh() }, [query, filter.status, filter.category]);

  const create = (payload) => { api.createTask({ ...payload, projectId, assignees: payload.assignees || [user.id] }, user.id); setShowForm(false); refresh(); };
  const save = (payload) => { api.updateTask(editing.id, payload); setEditing(null); setShowForm(false); refresh(); };
  const del = (id) => { api.deleteTask(id); refresh(); };
  const move = (task, dir) => {
    const idx = columns.findIndex(c => c.key === task.status);
    const next = dir === 'left' ? idx - 1 : idx + 1; if (next < 0 || next >= columns.length) return; api.updateTask(task.id, { status: columns[next].key }); refresh();
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const byStatus = columns.reduce((acc, c) => (acc[c.key] = tasks.filter(t => t.status === c.key).length, acc), {});
    const avg = total ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;
    return { total, byStatus, avg };
  }, [tasks]);

  return (
    <div className="container">
      <button className="btn" onClick={onBack}>← Back</button>
      <div className="flex space-between" style={{ marginTop: 12, marginBottom: 8 }}>
        <div>
          <h2>{project?.name}</h2>
          <p className="muted">{project?.description || '—'}</p>
        </div>
        <div className="flex">
          <button className="btn" onClick={() => setShowMembers(true)}>Team ({project?.members.length})</button>
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>New Task</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid cols-3">
          <div><label>Search</label><input className="input" placeholder="Title/description" value={query} onChange={e => setQuery(e.target.value)} /></div>
          <div><label>Status</label>
            <select className="select" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value="">All</option>{columns.map(c => <option key={c.key} value={c.key}>{c.title}</option>)}
            </select>
          </div>
          <div><label>Category</label><input className="input" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} placeholder="e.g. Frontend" /></div>
        </div>
        <div className="flex" style={{ gap: 24, marginTop: 12 }}>
          <span className="badge">Total: {stats.total}</span>
          <span className="badge">Avg Progress: {stats.avg}%</span>
          {columns.map(c => <span key={c.key} className="badge">{c.title}: {stats.byStatus[c.key] || 0}</span>)}
        </div>
      </div>

      <Kanban tasks={tasks} onEdit={(t) => { setEditing(t); setShowForm(true); }} onDelete={del} onMove={move} />

      {showForm && (
        <div className="modal" onClick={() => setShowForm(false)}>
          <div className="card" onClick={e => e.stopPropagation()}>
            <TaskForm initial={editing || {}} onSubmit={(data) => editing ? save(data) : create(data)} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {showMembers && (
        <div className="modal" onClick={() => setShowMembers(false)}>
          <div className="card" onClick={e => e.stopPropagation()}>
            <h3>Team Members</h3>
            <p className="muted">Add existing users by search (users are stored locally for demo).</p>
            <MemberPicker onPick={(u) => { api.addMember(projectId, u.id); setProject(api.projectsForUser(user.id).find(p => p.id === projectId)); setShowMembers(false); }} />
            <table className="table" style={{ marginTop: 12 }}>
              <thead><tr><th>Name</th><th>Email</th></tr></thead>
              <tbody>
                {project?.members.map(uid_ => api.listUsers('').find(u => u.id === uid_)).map(u => (
                  <tr key={u.id}><td>{u.name}</td><td className="muted">{u.email}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={() => setShowMembers(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const { user } = useAuth();
  const [view, setView] = useState('list');
  const [pid, setPid] = useState(null);
  useEffect(() => { if (!user) { setView('auth'); } else { setView('list'); } }, [user?.id]);
  return (
    <>
      <Navbar />
      {view === 'auth' && <Login onDone={() => setView('list')} />}
      {view === 'list' && user && <ProjectList onOpen={(id) => { setPid(id); setView('project') }} />}
      {view === 'project' && user && <ProjectPage projectId={pid} onBack={() => setView('list')} />}
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AuthProvider><App /></AuthProvider>);