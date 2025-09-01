 // Frontend JavaScript Code
        document.addEventListener('DOMContentLoaded', function() {
            // Check if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                showApp();
                loadDashboard();
            } else {
                showAuth();
            }

            // Authentication handlers
            document.getElementById('login-form').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                // Simulate login (in a real app, this would call your backend API)
                if (email && password) {
                    const user = {
                        id: 1,
                        name: 'John Doe',
                        email: email
                    };
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    showApp();
                    loadDashboard();
                }
            });

            document.getElementById('register-form').addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                
                if (password !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                }
                
                // Simulate registration (in a real app, this would call your backend API)
                if (name && email && password) {
                    const user = {
                        id: 1,
                        name: name,
                        email: email
                    };
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    showApp();
                    loadDashboard();
                    alert('Registration successful!');
                }
            });

            // Navigation handlers
            document.querySelectorAll('.nav-link[data-section]').forEach(link => {
                link.addEventListener('click', function() {
                    const section = this.getAttribute('data-section');
                    showSection(section);
                });
            });

            // Logout handler
            document.getElementById('logout-btn').addEventListener('click', function() {
                localStorage.removeItem('currentUser');
                showAuth();
            });

            // Create task handler
            document.getElementById('create-task-btn').addEventListener('click', function() {
                const title = document.getElementById('task-title').value;
                const description = document.getElementById('task-description').value;
                const category = document.getElementById('task-category').value;
                const priority = document.getElementById('task-priority').value;
                const dueDate = document.getElementById('task-due-date').value;
                
                if (title && category && priority) {
                    // In a real app, this would call your backend API
                    const task = {
                        id: Date.now(),
                        title,
                        description,
                        category,
                        priority,
                        dueDate,
                        status: 'todo',
                        createdAt: new Date().toISOString(),
                        userId: JSON.parse(localStorage.getItem('currentUser')).id
                    };
                    
                    // Save to local storage (simulating database)
                    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                    tasks.push(task);
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    
                    // Close modal and refresh
                    bootstrap.Modal.getInstance(document.getElementById('createTaskModal')).hide();
                    loadDashboard();
                    alert('Task created successfully!');
                } else {
                    alert('Please fill in all required fields');
                }
            });

            // Send invitation handler
            document.getElementById('send-invite-btn').addEventListener('click', function() {
                const email = document.getElementById('invite-email').value;
                
                if (email) {
                    // In a real app, this would call your backend API
                    bootstrap.Modal.getInstance(document.getElementById('inviteModal')).hide();
                    alert(`Invitation sent to ${email}`);
                } else {
                    alert('Please enter an email address');
                }
            });

            // Function to show authentication section
            function showAuth() {
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('app-section').style.display = 'none';
            }

            // Function to show application section
            function showApp() {
                document.getElementById('auth-section').style.display = 'none';
                document.getElementById('app-section').style.display = 'flex';
            }

            // Function to show specific section
            function showSection(section) {
                document.querySelectorAll('.content-section').forEach(sec => {
                    sec.style.display = 'none';
                });
                document.getElementById(`${section}-section`).style.display = 'block';
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                document.querySelector(`.nav-link[data-section="${section}"]`).classList.add('active');
                
                // Load section-specific data
                if (section === 'dashboard') loadDashboard();
                if (section === 'tasks') loadTasks();
                if (section === 'team') loadTeam();
                if (section === 'progress') loadProgress();
            }

            // Function to load dashboard data
            function loadDashboard() {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const userTasks = tasks.filter(task => task.userId === currentUser.id);
                
                // Update stats
                document.getElementById('total-tasks').textContent = userTasks.length;
                document.getElementById('completed-tasks').textContent = userTasks.filter(task => task.status === 'completed').length;
                document.getElementById('inprogress-tasks').textContent = userTasks.filter(task => task.status === 'inprogress').length;
                
                // Load recent tasks
                const recentTasksHtml = userTasks.slice(0, 5).map(task => `
                    <div class="task-card p-3 mb-2 priority-${task.priority}">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${task.title}</h6>
                            <span class="badge bg-${getStatusBadgeColor(task.status)}">${getStatusText(task.status)}</span>
                        </div>
                        <p class="text-muted mb-1 small">${task.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="category-badge bg-light text-dark">${task.category}</span>
                            <small class="text-muted">Due: ${task.dueDate || 'No due date'}</small>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('recent-tasks').innerHTML = recentTasksHtml || '<p class="text-muted">No tasks found</p>';
                
                // Load categories
                const categories = [...new Set(userTasks.map(task => task.category))];
                const categoriesHtml = categories.map(category => {
                    const count = userTasks.filter(task => task.category === category).length;
                    return `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>${category}</span>
                            <span class="badge bg-primary">${count}</span>
                        </div>
                    `;
                }).join('');
                
                document.getElementById('task-categories').innerHTML = categoriesHtml || '<p class="text-muted">No categories found</p>';
            }

            // Function to load tasks
            function loadTasks() {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const userTasks = tasks.filter(task => task.userId === currentUser.id);
                
                // Populate category filter
                const categories = [...new Set(userTasks.map(task => task.category))];
                const categoryFilter = document.getElementById('filter-category');
                categoryFilter.innerHTML = '<option value="all">All Categories</option>';
                categories.forEach(category => {
                    categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
                });
                
                // Apply filters
                const statusFilter = document.getElementById('filter-status').value;
                const categoryFilterValue = document.getElementById('filter-category').value;
                
                let filteredTasks = userTasks;
                if (statusFilter !== 'all') {
                    filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
                }
                if (categoryFilterValue !== 'all') {
                    filteredTasks = filteredTasks.filter(task => task.category === categoryFilterValue);
                }
                
                // Render tasks
                const tasksHtml = filteredTasks.map(task => `
                    <div class="task-card p-3 mb-3 priority-${task.priority}">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5>${task.title}</h5>
                            <div>
                                <button class="btn btn-sm btn-outline-primary edit-task" data-id="${task.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-task" data-id="${task.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <p class="text-muted">${task.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="category-badge bg-light text-dark">${task.category}</span>
                            <span class="badge bg-${getPriorityBadgeColor(task.priority)}">${task.priority}</span>
                        </div>
                        <div class="mt-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small>Progress</small>
                                <small>${getProgressPercentage(task.status)}%</small>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: ${getProgressPercentage(task.status)}%;"></div>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <small class="text-muted">Due: ${task.dueDate || 'No due date'}</small>
                            <select class="form-select form-select-sm status-select" data-id="${task.id}" style="width: auto;">
                                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                                <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('tasks-list').innerHTML = tasksHtml || '<p class="text-muted">No tasks found</p>';
                
                // Add event listeners for dynamic elements
                document.querySelectorAll('.status-select').forEach(select => {
                    select.addEventListener('change', function() {
                        const taskId = this.getAttribute('data-id');
                        const newStatus = this.value;
                        updateTaskStatus(taskId, newStatus);
                    });
                });
                
                document.querySelectorAll('.delete-task').forEach(button => {
                    button.addEventListener('click', function() {
                        const taskId = this.getAttribute('data-id');
                        deleteTask(taskId);
                    });
                });
            }

            // Function to load team section
            function loadTeam() {
                // Simulate team members
                const teamMembers = [
                    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Member' },
                    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Member' }
                ];
                
                document.getElementById('team-members').textContent = teamMembers.length;
                
                // Render team members
                const teamHtml = teamMembers.map(member => `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            <div class="card-body text-center">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random" 
                                     class="rounded-circle mb-2" width="80" height="80">
                                <h5>${member.name}</h5>
                                <p class="text-muted">${member.email}</p>
                                <span class="badge ${member.role === 'Admin' ? 'bg-primary' : 'bg-secondary'}">${member.role}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('team-members-list').innerHTML = teamHtml;
                
                // Load team tasks
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const teamTasks = tasks.filter(task => task.assignee); // Tasks with assignee
                
                const teamTasksHtml = teamTasks.map(task => `
                    <div class="task-card p-3 mb-2 priority-${task.priority}">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${task.title}</h6>
                            <span class="badge bg-${getStatusBadgeColor(task.status)}">${getStatusText(task.status)}</span>
                        </div>
                        <p class="text-muted mb-1 small">${task.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="category-badge bg-light text-dark">${task.category}</span>
                            <small class="text-muted">Assigned to: ${task.assignee || 'Unassigned'}</small>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('team-tasks').innerHTML = teamTasksHtml || '<p class="text-muted">No team tasks found</p>';
            }

            // Function to load progress section
            function loadProgress() {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const userTasks = tasks.filter(task => task.userId === currentUser.id);
                
                // Calculate completion rate
                const totalTasks = userTasks.length;
                const completedTasks = userTasks.filter(task => task.status === 'completed').length;
                const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                
                document.getElementById('completion-progress-bar').style.width = `${completionRate}%`;
                document.getElementById('completion-progress-bar').textContent = `${completionRate}%`;
                document.getElementById('completion-stats').textContent = 
                    `${completedTasks} out of ${totalTasks} tasks completed (${completionRate}%)`;
                
                // Calculate progress by category
                const categories = [...new Set(userTasks.map(task => task.category))];
                const categoryProgressHtml = categories.map(category => {
                    const categoryTasks = userTasks.filter(task => task.category === category);
                    const completedCategoryTasks = categoryTasks.filter(task => task.status === 'completed').length;
                    const categoryCompletionRate = categoryTasks.length > 0 ? 
                        Math.round((completedCategoryTasks / categoryTasks.length) * 100) : 0;
                    
                    return `
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span>${category}</span>
                                <small>${categoryCompletionRate}%</small>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: ${categoryCompletionRate}%;"></div>
                            </div>
                            <small class="text-muted">${completedCategoryTasks} of ${categoryTasks.length} tasks completed</small>
                        </div>
                    `;
                }).join('');
                
                document.getElementById('category-progress').innerHTML = categoryProgressHtml || '<p class="text-muted">No data available</p>';
            }

            // Helper functions
            function getStatusBadgeColor(status) {
                switch(status) {
                    case 'todo': return 'secondary';
                    case 'inprogress': return 'warning';
                    case 'completed': return 'success';
                    default: return 'secondary';
                }
            }
            
            function getStatusText(status) {
                switch(status) {
                    case 'todo': return 'To Do';
                    case 'inprogress': return 'In Progress';
                    case 'completed': return 'Completed';
                    default: return status;
                }
            }
            
            function getPriorityBadgeColor(priority) {
                switch(priority) {
                    case 'low': return 'success';
                    case 'medium': return 'warning';
                    case 'high': return 'danger';
                    default: return 'secondary';
                }
            }
            
            function getProgressPercentage(status) {
                switch(status) {
                    case 'todo': return 0;
                    case 'inprogress': return 50;
                    case 'completed': return 100;
                    default: return 0;
                }
            }
            
            function updateTaskStatus(taskId, newStatus) {
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const taskIndex = tasks.findIndex(task => task.id == taskId);
                
                if (taskIndex !== -1) {
                    tasks[taskIndex].status = newStatus;
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    loadTasks();
                }
            }
            
            function deleteTask(taskId) {
                if (confirm('Are you sure you want to delete this task?')) {
                    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                    tasks = tasks.filter(task => task.id != taskId);
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    loadTasks();
                }
            }
        });
        // ---------- CONFIG ----------
const API_BASE = "http://localhost:5000/api"; // change to your deployed URL in production

// helper for API calls with token
async function apiFetch(path, opts = {}) {
    const token = localStorage.getItem('token');
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = 'application/json';
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (res.status === 401) {
        // token invalid or expired -> logout
        logout();
        throw new Error('Unauthorized');
    }
    return res.json();
}

// store user/token
function saveAuth(user, token) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('token', token);
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    showAuth();
}

// ---------- AUTH ----------
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({email, password})
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Login failed'); return; }
        saveAuth(data.user, data.token);
        showApp();
        await loadDashboard();
    } catch(err) { console.error(err); alert('Network error'); }
});

document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    if (password !== confirmPassword) { alert('Passwords do not match'); return; }
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({name, email, password})
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Register failed'); return; }
        saveAuth(data.user, data.token);
        showApp();
        await loadDashboard();
    } catch(err) { console.error(err); alert('Network error'); }
});

// ---------- TASKS ----------
async function loadDashboard() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    try {
        const data = await apiFetch('/tasks', { method: 'GET' });
        const tasks = data.tasks || [];

        // calculate user-only tasks (owned by userId)
        const userTasks = tasks.filter(t => t.userId === currentUser.id);
        document.getElementById('total-tasks').textContent = userTasks.length;
        document.getElementById('completed-tasks').textContent = userTasks.filter(t => t.status === 'completed').length;
        document.getElementById('inprogress-tasks').textContent = userTasks.filter(t => t.status === 'inprogress').length;

        // recent
        const recentTasksHtml = userTasks.slice(0,5).map(task => `
            <div class="task-card p-3 mb-2 priority-${task.priority}">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">${task.title}</h6>
                    <span class="badge bg-${getStatusBadgeColor(task.status)}">${getStatusText(task.status)}</span>
                </div>
                <p class="text-muted mb-1 small">${task.description || 'No description'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="category-badge bg-light text-dark">${task.category}</span>
                    <small class="text-muted">Due: ${task.dueDate || 'No due date'}</small>
                </div>
            </div>
        `).join('');
        document.getElementById('recent-tasks').innerHTML = recentTasksHtml || '<p class="text-muted">No tasks found</p>';

        // categories summary
        const categories = [...new Set(userTasks.map(t=>t.category).filter(Boolean))];
        const categoriesHtml = categories.map(cat => {
            const count = userTasks.filter(t => t.category === cat).length;
            return `<div class="d-flex justify-content-between align-items-center mb-2"><span>${cat}</span><span class="badge bg-primary">${count}</span></div>`;
        }).join('');
        document.getElementById('task-categories').innerHTML = categoriesHtml || '<p class="text-muted">No categories found</p>';
    } catch(err) {
        console.error(err);
        alert('Failed to load dashboard');
    }
}

document.getElementById('create-task-btn').addEventListener('click', async function() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const category = document.getElementById('task-category').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    // assignee optional: get id if you have team members endpoint
    try {
        const res = await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify({ title, description, category, priority, dueDate })
        });
        if (res.error) { alert(res.error); return; }
        bootstrap.Modal.getInstance(document.getElementById('createTaskModal')).hide();
        await loadDashboard();
        alert('Task created successfully!');
    } catch(err) { console.error(err); alert('Failed to create task'); }
});

async function loadTasks() {
    try {
        const data = await apiFetch('/tasks', { method: 'GET' });
        const tasks = data.tasks || [];
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const userTasks = tasks.filter(t => t.userId === currentUser.id);

        // populate category filter
        const categoryFilter = document.getElementById('filter-category');
        const categories = [...new Set(userTasks.map(t=>t.category).filter(Boolean))];
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(c => { categoryFilter.innerHTML += `<option value="${c}">${c}</option>`; });

        // apply current selected filters
        const statusFilter = document.getElementById('filter-status').value;
        const categoryFilterValue = categoryFilter.value;
        let filtered = userTasks;
        if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
        if (categoryFilterValue !== 'all') filtered = filtered.filter(t => t.category === categoryFilterValue);

        const tasksHtml = filtered.map(task => `
            <div class="task-card p-3 mb-3 priority-${task.priority}">
                <div class="d-flex justify-content-between align-items-center">
                    <h5>${task.title}</h5>
                    <div>
                        <button class="btn btn-sm btn-outline-primary edit-task" data-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-task" data-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="text-muted">${task.description || 'No description'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="category-badge bg-light text-dark">${task.category}</span>
                    <span class="badge bg-${getPriorityBadgeColor(task.priority)}">${task.priority}</span>
                </div>
                <div class="mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small>Progress</small>
                        <small>${getProgressPercentage(task.status)}%</small>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: ${getProgressPercentage(task.status)}%;"></div>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">Due: ${task.dueDate || 'No due date'}</small>
                    <select class="form-select form-select-sm status-select" data-id="${task.id}" style="width: auto;">
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                        <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
            </div>
        `).join('');
        document.getElementById('tasks-list').innerHTML = tasksHtml || '<p class="text-muted">No tasks found</p>';

        // attach listeners (status change & delete)
        document.querySelectorAll('.status-select').forEach(s => {
            s.addEventListener('change', async function() {
                const taskId = this.getAttribute('data-id');
                const newStatus = this.value;
                try {
                    await apiFetch(`/tasks/${taskId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: newStatus })
                    });
                    await loadTasks();
                } catch(err) { console.error(err); alert('Failed to update status'); }
            });
        });

        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', async function() {
                const taskId = this.getAttribute('data-id');
                if (!confirm('Are you sure?')) return;
                try {
                    const res = await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
                    if (res.error) { alert(res.error); return; }
                    await loadTasks();
                } catch(err) { console.error(err); alert('Delete failed'); }
            });
        });

    } catch(err) {
        console.error(err);
        alert('Failed to load tasks');
    }
}

// Hook navigation to call the server-backed functions
document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        showSection(section);
    });
});

// Ensure initial auth check uses server token
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (token && user) {
        showApp();
        await loadDashboard();
    } else {
        showAuth();
    }
});
