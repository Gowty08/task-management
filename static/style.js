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
  const makeTask = (t, st, pr, pg) => ({ 
    id: uid(), 
    projectId: p, 
    title: t, 
    description: t + ' details', 
    category: cats[Math.floor(Math.random() * cats.length)], 
    priority: pr, 
    status: st, 
    dueDate: new Date(Date.now() + 86400000 * (2 + Math.random() * 10)).toISOString().slice(0, 10), 
    progress: pg, 
    assignees: [userId], 
    createdBy: userId, 
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  });
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
      id: uid(),
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
  addMember(projectId, userId) { 
    const db = this._read(); 
    const p = db.projects.find(p => p.id === projectId); 
    if (!p) throw new Error('Project not found'); 
    if (!p.members.includes(userId)) p.members.push(userId); 
    p.updatedAt = Date.now(); 
    this._write(db); 
    return p; 
  },

  tasks({ projectId, status, category, q }) { 
    const db = this._read(); 
    let t = db.tasks.filter(t => t.projectId === projectId); 
    if (status) t = t.filter(x => x.status === status); 
    if (category) t = t.filter(x => x.category === category); 
    if (q) { 
      const r = new RegExp(q, 'i'); 
      t = t.filter(x => r.test(x.title) || r.test(x.description)); 
    } 
    return t.sort((a, b) => b.updatedAt - a.updatedAt); 
  },
  
  createTask(data, userId) { 
    const db = this._read(); 
    const task = { 
      id: uid(),
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
      progress: data.progress,
      assignees: data.assignees || [userId],
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.tasks.push(task);
    
    // Update project's updatedAt timestamp
    const project = db.projects.find(p => p.id === task.projectId);
    if (project) {
      project.updatedAt = Date.now();
    }
    
    this._write(db);
    return task;
  },
  
  updateTask(id, patch) { 
    const db = this._read(); 
    const task = db.tasks.find(t => t.id === id); 
    if (!task) throw new Error('Task not found'); 
    Object.assign(task, patch, { updatedAt: Date.now() });
    
    // Update project's updatedAt timestamp
    const project = db.projects.find(p => p.id === task.projectId);
    if (project) {
      project.updatedAt = Date.now();
    }
    
    this._write(db); 
    return task; 
  },
  
  deleteTask(id) { 
    const db = this._read(); 
    db.tasks = db.tasks.filter(t => t.id !== id); 
    this._write(db); 
    return { ok: true } 
  },
  
  deleteProject(id) {
    const db = this._read();
    db.projects = db.projects.filter(p => p.id !== id);
    db.tasks = db.tasks.filter(t => t.projectId !== id);
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
const Navbar = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="nav">
      <div className="nav-inner">
        <div className="flex">
          <span className="brand">TaskFlow</span>
          <div className="nav-links">
            <button 
              className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
              onClick={() => onNavigate('home')}
            >
              Home
            </button>
            <button 
              className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-link ${currentView === 'projects' ? 'active' : ''}`}
              onClick={() => onNavigate('projects')}
            >
              Projects
            </button>
            <button 
              className={`nav-link ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => onNavigate('profile')}
            >
              Profile
            </button>
          </div>
        </div>
        <div className="flex">
          <span className="muted">{user.name}</span>
          <button className="btn" onClick={logout}>Logout</button>
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

/******************** Home Component ********************/
const Home = ({ onNavigate }) => {
  const { user } = useAuth();
  
  return (
    <div className="container">
      <div className="hero">
        <h1>Welcome to TaskFlow</h1>
        <p className="hero-subtitle">Streamline your project management and task tracking</p>
        
        {user ? (
          <div className="grid cols-3" style={{ marginTop: '2rem' }}>
            <div className="card feature-card">
              <h3>📊 Dashboard</h3>
              <p>Get an overview of all your projects and tasks</p>
              <button className="btn primary" onClick={() => onNavigate('dashboard')}>
                View Dashboard
              </button>
            </div>
            <div className="card feature-card">
              <h3>📂 Projects</h3>
              <p>Manage your projects and collaborate with your team</p>
              <button className="btn primary" onClick={() => onNavigate('projects')}>
                Manage Projects
              </button>
            </div>
            <div className="card feature-card">
              <h3>👤 Profile</h3>
              <p>Update your account information and preferences</p>
              <button className="btn primary" onClick={() => onNavigate('profile')}>
                View Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
            <h3>Get Started</h3>
            <p>Please log in or create an account to start managing your tasks.</p>
            <div className="flex" style={{ gap: '12px', marginTop: '1rem' }}>
              <button className="btn primary" onClick={() => onNavigate('auth')}>
                Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/******************** Dashboard Component ********************/
const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [stats, setStats] = useState({ totalProjects: 0, totalTasks: 0, completedTasks: 0, inProgressTasks: 0 });

  useEffect(() => {
    if (user) {
      const userProjects = api.projectsForUser(user.id);
      setProjects(userProjects);
      
      // Get all tasks across all projects
      const tasks = userProjects.flatMap(project => 
        api.tasks({ projectId: project.id })
      );
      setAllTasks(tasks);
      
      // Calculate stats
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
      
      setStats({
        totalProjects: userProjects.length,
        totalTasks,
        completedTasks,
        inProgressTasks
      });
    }
  }, [user]);

  const recentTasks = allTasks
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="container">
      <h2>Dashboard</h2>
      
      {/* Stats Overview */}
      <div className="grid cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card">
          <h3>{stats.totalProjects}</h3>
          <p className="muted">Total Projects</p>
        </div>
        <div className="card stat-card">
          <h3>{stats.totalTasks}</h3>
          <p className="muted">Total Tasks</p>
        </div>
        <div className="card stat-card">
          <h3>{stats.inProgressTasks}</h3>
          <p className="muted">In Progress</p>
        </div>
        <div className="card stat-card">
          <h3>{stats.completedTasks}</h3>
          <p className="muted">Completed</p>
        </div>
      </div>

      <div className="grid cols-2">
        {/* Recent Projects */}
        <div className="card">
          <h3>Recent Projects</h3>
          {projects.length === 0 ? (
            <p className="muted">No projects yet</p>
          ) : (
            <div className="list">
              {projects.slice(0, 5).map(project => (
                <div key={project.id} className="list-item">
                  <div>
                    <strong>{project.name}</strong>
                    <p className="muted">{project.description || 'No description'}</p>
                  </div>
                  <span className="badge">
                    {allTasks.filter(t => t.projectId === project.id).length} tasks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="card">
          <h3>Recent Tasks</h3>
          {recentTasks.length === 0 ? (
            <p className="muted">No tasks yet</p>
          ) : (
            <div className="list">
              {recentTasks.map(task => (
                <div key={task.id} className="list-item">
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted">{task.category} • {task.priority}</p>
                  </div>
                  <span className={`pill ${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/******************** Profile Component ********************/
const Profile = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');

  const handleSave = () => {
    // In a real app, you would update the user profile via API
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!user) return null;

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px' }}>
        <h2>Profile Settings</h2>
        
        {message && (
          <div style={{ 
            background: '#d4edda', 
            color: '#155724', 
            padding: '12px', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {message}
          </div>
        )}

        <div className="grid cols-2">
          <div>
            <label>Name</label>
            <input 
              className="input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div>
            <label>Email</label>
            <input 
              className="input" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Member Since</label>
          <p className="muted">
            {new Date(user.createdAt || Date.now()).toLocaleDateString()}
          </p>
        </div>

        <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

/******************** Project Components ********************/
const ProjectList = ({ onOpenProject }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState(() => api.projectsForUser(user.id));
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const createProject = () => {
    if (!name.trim()) return;
    const p = api.createProject({ name, description: desc }, user.id);
    setProjects(api.projectsForUser(user.id));
    setName(''); setDesc(''); setShowNew(false);
    onOpenProject(p.id);
  };

  const deleteProject = (id, name) => {
    if (confirm(`Delete project "${name}"?`)) {
      api.deleteProject(id);
      setProjects(api.projectsForUser(user.id));
    }
  };

  return (
    <div className="container">
      <div className="flex space-between" style={{ margin: '12px 0' }}>
        <h2>Projects</h2>
        <div className="flex">
          <button className="btn primary" onClick={() => setShowNew(true)}>
            New Project
          </button>
        </div>
      </div>
      
      {projects.length === 0 && (
        <div className="card">
          <p className="muted">No projects yet. Create your first one to get started.</p>
        </div>
      )}
      
      <div className="grid cols-3">
        {projects.map(p => (
          <div key={p.id} className="card">
            <div className="flex space-between">
              <h3>{p.name}</h3>
              <button 
                className="icon-btn" 
                title="Delete Project" 
                onClick={() => deleteProject(p.id, p.name)}
              >
                🗑️
              </button>
            </div>
            <p className="muted">{p.description || '—'}</p>
            <div className="flex space-between">
              <span className="badge">Members: {p.members.length}</span>
              <span className="badge">
                Updated: {new Date(p.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <button 
                className="btn primary" 
                onClick={() => onOpenProject(p.id)}
              >
                Open Project
              </button>
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
                <label>Name *</label>
                <input 
                  className="input" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label>Description</label>
                <input 
                  className="input" 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Project description"
                />
              </div>
            </div>
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={() => setShowNew(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={createProject}>
                Create
              </button>
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
  useEffect(() => { 
    const t = setTimeout(() => { setRes(api.listUsers(q)); }, 300); 
    return () => clearTimeout(t); 
  }, [q]);
  
  return (
    <div>
      <input 
        className="input" 
        placeholder="Search users…" 
        value={q} 
        onChange={e => setQ(e.target.value)} 
      />
      <div className="grid" style={{ marginTop: 8 }}>
        {res.map(u => (
          <button 
            key={u.id} 
            className="btn ghost" 
            onClick={() => onPick(u)}
          >
            {u.name} <span className="muted">({u.email})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const TaskForm = ({ initial = {}, onSubmit, onCancel, projectId }) => {
  const [v, setV] = useState({ 
    title: '', 
    description: '', 
    category: 'General', 
    priority: 'medium', 
    status: 'backlog', 
    dueDate: '', 
    progress: 0, 
    assignees: [], 
    ...initial 
  });
  
  // Reset form when initial task changes
  useEffect(() => {
    if (initial.id) {
      setV(prev => ({ ...prev, ...initial }));
    }
  }, [initial.id]);

  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  const handleSubmit = () => {
    if (!v.title.trim()) {
      alert('Task title is required');
      return;
    }
    
    // Ensure projectId is included for new tasks
    const taskData = initial.id ? v : { ...v, projectId };
    onSubmit(taskData);
  };

  return (
    <div className="card">
      <h3>{initial.id ? 'Edit Task' : 'New Task'}</h3>
      <div className="grid cols-2">
        <div>
          <label>Title *</label>
          <input 
            className="input" 
            value={v.title} 
            onChange={set('title')} 
            placeholder="Enter task title" 
          />
        </div>
        <div>
          <label>Category</label>
          <input 
            className="input" 
            value={v.category} 
            onChange={set('category')} 
            placeholder="e.g. Frontend" 
          />
        </div>
        <div>
          <label>Priority</label>
          <select className="select" value={v.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label>Status</label>
          <select className="select" value={v.status} onChange={set('status')}>
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label>Due Date</label>
          <input 
            type="date" 
            className="input" 
            value={v.dueDate || ''} 
            onChange={set('dueDate')} 
          />
        </div>
        <div>
          <label>Progress (%)</label>
          <input 
            type="number" 
            min="0" 
            max="100" 
            className="input" 
            value={v.progress} 
            onChange={set('progress')} 
          />
        </div>
        <div style={{ gridColumn: '1/3' }}>
          <label>Description</label>
          <textarea 
            rows="3" 
            className="input" 
            value={v.description} 
            onChange={set('description')} 
            placeholder="Task description..." 
          />
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit}>
          {initial.id ? 'Save' : 'Create'}
        </button>
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
    <div className="progress" style={{ marginTop: 8 }}>
      <span style={{ width: Math.max(0, Math.min(100, task.progress)) + '%' }} />
    </div>
    <div className="flex" style={{ justifyContent: 'space-between', marginTop: 8 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        Assignees: {task.assignees.length}
      </div>
      <div className="flex">
        <button className="btn small" onClick={() => onEdit(task)}>Edit</button>
        <button className="btn small" onClick={() => onMove(task, 'left')}>◀</button>
        <button className="btn small" onClick={() => onMove(task, 'right')}>▶</button>
        <button 
          className="btn small" 
          onClick={() => onDelete(task.id)}
          style={{ borderColor: 'transparent', background: '#2b1121', color: '#fca5a5' }}
        >
          Delete
        </button>
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
        <h4>
          {col.title} 
          <span className="badge">{tasks.filter(t => t.status === col.key).length}</span>
        </h4>
        {tasks.filter(t => t.status === col.key).map(t => (
          <TaskCard 
            key={t.id} 
            task={t} 
            onEdit={onEdit} 
            onDelete={onDelete} 
            onMove={onMove} 
          />
        ))}
      </div>
    ))}
  </div>
);

const ProjectPage = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const [project, setProject] = useState(() => 
    api.projectsForUser(user.id).find(p => p.id === projectId)
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  // Load tasks when component mounts or filters change
  useEffect(() => {
    refreshTasks();
  }, [query, filter.status, filter.category]);

  const refreshTasks = () => {
    const filteredTasks = api.tasks({ 
      projectId, 
      q: query, 
      status: filter.status, 
      category: filter.category 
    });
    setTasks(filteredTasks);
  };

  const createTask = (payload) => { 
    try {
      // Ensure projectId is included
      const taskData = { ...payload, projectId };
      api.createTask(taskData, user.id);
      setShowForm(false);
      refreshTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    }
  };

  const saveTask = (payload) => { 
    try {
      api.updateTask(editing.id, payload);
      setEditing(null);
      setShowForm(false);
      refreshTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task: ' + error.message);
    }
  };

  const deleteTask = (id) => { 
    if (confirm('Are you sure you want to delete this task?')) {
      api.deleteTask(id);
      refreshTasks();
    }
  };

  const moveTask = (task, direction) => {
    const currentIndex = columns.findIndex(c => c.key === task.status);
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    if (nextIndex < 0 || nextIndex >= columns.length) return;
    
    api.updateTask(task.id, { status: columns[nextIndex].key });
    refreshTasks();
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const byStatus = columns.reduce((acc, c) => {
      acc[c.key] = tasks.filter(t => t.status === c.key).length;
      return acc;
    }, {});
    const avg = total ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total) : 0;
    return { total, byStatus, avg };
  }, [tasks]);

  return (
    <div className="container">
      <button className="btn" onClick={onBack}>← Back to Projects</button>
      
      <div className="flex space-between" style={{ marginTop: 12, marginBottom: 8 }}>
        <div>
          <h2>{project?.name}</h2>
          <p className="muted">{project?.description || 'No description'}</p>
        </div>
        <div className="flex">
          <button className="btn" onClick={() => setShowMembers(true)}>
            Team ({project?.members.length})
          </button>
          <button 
            className="btn primary" 
            onClick={() => { 
              setEditing(null); 
              setShowForm(true); 
            }}
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid cols-3">
          <div>
            <label>Search Tasks</label>
            <input 
              className="input" 
              placeholder="Search by title or description..." 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
            />
          </div>
          <div>
            <label>Status Filter</label>
            <select 
              className="select" 
              value={filter.status} 
              onChange={e => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              {columns.map(c => (
                <option key={c.key} value={c.key}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Category Filter</label>
            <input 
              className="input" 
              value={filter.category} 
              onChange={e => setFilter({ ...filter, category: e.target.value })} 
              placeholder="Filter by category..." 
            />
          </div>
        </div>
        <div className="flex" style={{ gap: 24, marginTop: 12 }}>
          <span className="badge">Total Tasks: {stats.total}</span>
          <span className="badge">Average Progress: {stats.avg}%</span>
          {columns.map(c => (
            <span key={c.key} className="badge">
              {c.title}: {stats.byStatus[c.key] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <Kanban 
        tasks={tasks} 
        onEdit={(task) => { 
          setEditing(task); 
          setShowForm(true); 
        }} 
        onDelete={deleteTask} 
        onMove={moveTask} 
      />

      {/* Task Form Modal */}
      {showForm && (
        <div className="modal" onClick={() => setShowForm(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <TaskForm 
              initial={editing || {}} 
              onSubmit={editing ? saveTask : createTask}
              onCancel={() => setShowForm(false)}
              projectId={projectId}
            />
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {showMembers && (
        <div className="modal" onClick={() => setShowMembers(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>Team Members</h3>
            <p className="muted">Add existing users by searching below:</p>
            <MemberPicker 
              onPick={(user) => { 
                api.addMember(projectId, user.id); 
                setProject(api.projectsForUser(user.id).find(p => p.id === projectId)); 
                setShowMembers(false); 
              }} 
            />
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {project?.members.map(memberId => {
                  const user = api.listUsers('').find(u => u.id === memberId);
                  return user ? (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td className="muted">{user.email}</td>
                    </tr>
                  ) : null;
                })}
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

/******************** Main App Component ********************/
const App = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Redirect to auth if not logged in
  useEffect(() => { 
    if (!user) { 
      setCurrentView('auth'); 
    } else if (currentView === 'auth') {
      setCurrentView('home');
    }
  }, [user]);

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const handleOpenProject = (projectId) => {
    setCurrentProjectId(projectId);
    setCurrentView('project');
  };

  return (
    <>
      {user && (
        <Navbar 
          currentView={currentView} 
          onNavigate={handleNavigate} 
        />
      )}
      
      {currentView === 'auth' && <Login onDone={() => setCurrentView('home')} />}
      {currentView === 'home' && <Home onNavigate={handleNavigate} />}
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'profile' && <Profile />}
      {currentView === 'projects' && (
        <ProjectList onOpenProject={handleOpenProject} />
      )}
      {currentView === 'project' && (
        <ProjectPage 
          projectId={currentProjectId} 
          onBack={() => setCurrentView('projects')} 
        />
      )}
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);