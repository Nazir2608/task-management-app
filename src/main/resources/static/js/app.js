/* ================================================================
   TaskFlow — Main Application JavaScript
   Single-file SPA with JWT auth, REST API calls, Kanban + CRUD
   ================================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const State = {
  token: localStorage.getItem('tf_token'),
  user: JSON.parse(localStorage.getItem('tf_user') || 'null'),
  projects: [],
  currentPage: 'dashboard',
  currentProject: null,
  editingTaskId: null,
  viewingTaskId: null,
  searchTimer: null,
};

// ── API ────────────────────────────────────────────────────────────────────
const API = {
  async req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (State.token) opts.headers['Authorization'] = 'Bearer ' + State.token;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch('/api' + path, opts);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      if (!path.includes('/auth/')) {
        logout(); return null;
      }
    }
    if (!res.ok) {
      const msg = data.message || data.error || 'Request failed';
      throw new Error(msg);
    }
    return data.data !== undefined ? data.data : data;
  },
  get:    (p)    => API.req('GET',    p),
  post:   (p, b) => API.req('POST',   p, b),
  put:    (p, b) => API.req('PUT',    p, b),
  patch:  (p, b) => API.req('PATCH',  p, b),
  delete: (p)    => API.req('DELETE', p),
};

// ── Auth ───────────────────────────────────────────────────────────────────
async function doLogin() {
  const u = v('login-username'), p = v('login-password');
  if (!u || !p) return showError('login-error', 'Please fill all fields');
  setLoading('login-btn-text', 'login-spinner', true);
  try {
    const data = await API.post('/auth/login', { usernameOrEmail: u, password: p });
    saveSession(data); initApp();
  } catch(e) { showError('login-error', e.message); }
  finally { setLoading('login-btn-text', 'login-spinner', false); }
}

async function doRegister() {
  const username   = v('reg-username');
  const email      = v('reg-email');
  const password   = v('reg-password');
  const firstName  = v('reg-firstName');
  const lastName   = v('reg-lastName');
  if (!username || !email || !password) return showError('register-error', 'Please fill required fields');
  setLoading('register-btn-text', 'register-spinner', true);
  try {
    const data = await API.post('/auth/register', { username, email, password, firstName, lastName });
    saveSession(data); initApp();
  } catch(e) { showError('register-error', e.message); }
  finally { setLoading('register-btn-text', 'register-spinner', false); }
}

function saveSession(data) {
  State.token = data.accessToken;
  State.user  = data.user;
  localStorage.setItem('tf_token', data.accessToken);
  localStorage.setItem('tf_user', JSON.stringify(data.user));
}

function doLogout() { logout(); }
function logout() {
  State.token = null; State.user = null;
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  show('auth-page'); hide('app');
  showLogin();
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  feather.replace();
  if (State.token && State.user) {
    initApp();
  } else {
    show('auth-page'); hide('app');
  }
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.add('hidden'); });
  });
});

async function initApp() {
  hide('auth-page'); show('app');
  updateSidebarUser();
  await loadProjects();
  navigateTo('dashboard');
  feather.replace();
}

// ── Navigation ─────────────────────────────────────────────────────────────
function navigateTo(page, params) {
  State.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const item = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (item) item.classList.add('active');

  const mc = document.getElementById('main-content');
  mc.innerHTML = '';

  if (page === 'dashboard')    renderDashboard();
  else if (page === 'my-tasks') renderMyTasks();
  else if (page === 'projects') renderProjects();
  else if (page === 'board')   renderBoard(params);
  else if (page === 'profile') renderProfile();
  else if (page.startsWith('project-'))  renderProjectDetail(page.replace('project-',''));

  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  setTimeout(() => feather.replace(), 50);
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function updateSidebarUser() {
  if (!State.user) return;
  const initials = State.user.initials || '?';
  el('sidebar-avatar').textContent  = initials;
  el('topbar-avatar').textContent   = initials;
  el('sidebar-username').textContent = State.user.fullName || State.user.username;
  const roleMap = { ROLE_ADMIN: 'Admin', ROLE_MANAGER: 'Manager', ROLE_USER: 'Member' };
  el('sidebar-role').textContent = roleMap[State.user.role] || '';
}

async function loadProjects() {
  try {
    State.projects = await API.get('/projects') || [];
    renderSidebarProjects();
    populateProjectDropdown();
    // update my-tasks badge
    const myTasks = await API.get('/tasks/my?size=100');
    const active = myTasks?.content?.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED') || [];
    const badge = el('my-tasks-badge');
    if (active.length) { badge.textContent = active.length; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  } catch(e) { console.error(e); }
}

function renderSidebarProjects() {
  const container = el('sidebar-projects');
  if (!State.projects.length) {
    container.innerHTML = '<div style="padding:8px 10px;font-size:12px;color:var(--text-3)">No projects yet</div>';
    return;
  }
  container.innerHTML = State.projects.map(p => `
    <div class="sidebar-project-item ${State.currentProject === p.id ? 'active' : ''}"
         onclick="navigateTo('board', ${p.id})">
      <div class="project-key-badge">${esc(p.key)}</div>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
    </div>`).join('');
}

function populateProjectDropdown() {
  const sel = el('t-project');
  if (!sel) return;
  const opts = State.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  sel.innerHTML = '<option value="">— Select project —</option>' + opts;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
async function renderDashboard() {
  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">👋 Welcome, ${esc(State.user?.firstName || State.user?.username || 'there')}!</h1>
          <p class="page-subtitle">Here's what's happening across your projects</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openCreateTaskModal()">
            <i data-feather="plus"></i> New Task
          </button>
        </div>
      </div>
      <div id="dash-content"><div class="loading-line" style="height:200px;border-radius:10px"></div></div>
    </div>`;
  feather.replace();

  try {
    const dash = await API.get('/tasks/dashboard');
    if (!dash) return;

    const statusColors = {
      BACKLOG:'var(--text-3)',TODO:'var(--text-2)',IN_PROGRESS:'var(--accent)',
      IN_REVIEW:'var(--purple)',DONE:'var(--green)',CANCELLED:'var(--text-3)'
    };
    const total = Object.values(dash.tasksByStatus || {}).reduce((a,b)=>a+b,0) || 1;

    el('dash-content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon"><i data-feather="check-square"></i></div>
          <div class="stat-label">My Active Tasks</div>
          <div class="stat-value">${dash.myTasks || 0}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon"><i data-feather="check-circle"></i></div>
          <div class="stat-label">Completed</div>
          <div class="stat-value">${dash.completedTasks || 0}</div>
        </div>
        <div class="stat-card yellow">
          <div class="stat-icon"><i data-feather="clock"></i></div>
          <div class="stat-label">In Progress</div>
          <div class="stat-value">${dash.inProgressTasks || 0}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon"><i data-feather="alert-circle"></i></div>
          <div class="stat-label">Overdue</div>
          <div class="stat-value">${dash.overdueTasks || 0}</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon"><i data-feather="layers"></i></div>
          <div class="stat-label">Projects</div>
          <div class="stat-value">${State.projects.length}</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dash-section">
          <div class="dash-section-title">Task Status Distribution</div>
          <div class="status-distribution">
            ${Object.entries(dash.tasksByStatus || {}).map(([st,cnt]) => `
              <div class="status-bar-row">
                <span class="status-bar-label">${statusLabel(st)}</span>
                <div class="status-bar-track">
                  <div class="status-bar-fill" style="width:${Math.round((cnt/total)*100)}%;background:${statusColors[st]||'var(--accent)'}"></div>
                </div>
                <span class="status-bar-count">${cnt}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="dash-section">
          <div class="dash-section-title">Upcoming Due (7 days)</div>
          ${(dash.upcomingDueTasks||[]).length ? `
            <div>${(dash.upcomingDueTasks||[]).slice(0,5).map(t => taskItemHtml(t)).join('')}</div>
          ` : '<div class="empty-state"><div class="empty-state-icon">🎉</div><p>No tasks due in 7 days!</p></div>'}
        </div>
        <div class="dash-section" style="grid-column:1/-1">
          <div class="dash-section-title">Recently Updated
            <a href="#" onclick="navigateTo('my-tasks')" style="font-size:11px;font-weight:500">View all →</a>
          </div>
          ${(dash.recentTasks||[]).length ? `
            <div>${(dash.recentTasks||[]).slice(0,5).map(t => taskItemHtml(t)).join('')}</div>
          ` : '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No recent tasks</p></div>'}
        </div>
      </div>
    `;
    feather.replace();
  } catch(e) { toast('Failed to load dashboard', 'error'); }
}

// ── My Tasks ────────────────────────────────────────────────────────────────
async function renderMyTasks() {
  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Tasks</h1>
          <p class="page-subtitle">All tasks assigned to you</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateTaskModal()">
          <i data-feather="plus"></i> New Task
        </button>
      </div>
      <div class="card">
        <div id="my-tasks-list">
          <div class="loading-line" style="height:60px;border-radius:0;border:none"></div>
        </div>
      </div>
    </div>`;
  feather.replace();

  try {
    const data = await API.get('/tasks/my?size=50&page=0');
    const tasks = data?.content || [];
    el('my-tasks-list').innerHTML = tasks.length
      ? tasks.map(t => taskItemHtml(t, true)).join('')
      : '<div class="empty-state"><div class="empty-state-icon">✅</div><h3>All clear!</h3><p>You have no tasks assigned.</p></div>';
    feather.replace();
  } catch(e) { toast('Failed to load tasks', 'error'); }
}

function taskItemHtml(t, showProject = false) {
  const due = t.dueDate ? `<span class="${t.overdue ? 'overdue' : ''}" style="font-size:11px;display:flex;align-items:center;gap:3px"><i data-feather="calendar" style="width:11px;height:11px"></i>${fmtDate(t.dueDate)}</span>` : '';
  return `
    <div class="task-item" onclick="openTaskDetail(${t.id})">
      <div style="flex:1;min-width:0">
        <div class="task-item-title">${esc(t.title)}</div>
        <div class="task-item-meta">
          <span class="task-number">${esc(t.taskNumber)}</span>
          ${showProject ? `<span class="tag">${esc(t.projectName)}</span>` : ''}
          ${due}
        </div>
      </div>
      <div class="task-item-right">
        <span class="badge ${priorityClass(t.priority)}">${priIcon(t.priority)}</span>
        <span class="badge ${statusClass(t.status)}">${statusLabel(t.status)}</span>
        ${t.assignee ? `<div class="avatar sm" title="${esc(t.assignee.fullName||t.assignee.username)}">${esc(t.assignee.initials||'?')}</div>` : ''}
      </div>
    </div>`;
}

// ── Projects Page ──────────────────────────────────────────────────────────
function renderProjects() {
  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Projects</h1>
          <p class="page-subtitle">${State.projects.length} project${State.projects.length !== 1 ? 's' : ''} you are part of</p>
        </div>
        <button class="btn btn-primary" onclick="showProjectModal()">
          <i data-feather="plus"></i> New Project
        </button>
      </div>
      ${State.projects.length ? `
        <div class="projects-grid">
          ${State.projects.map(p => projectCardHtml(p)).join('')}
        </div>` : `
        <div class="empty-state" style="margin-top:60px">
          <div class="empty-state-icon">🗂</div>
          <h3>No projects yet</h3>
          <p>Create your first project to start managing tasks with your team.</p>
          <button class="btn btn-primary" onclick="showProjectModal()">Create First Project</button>
        </div>`}
    </div>`;
  feather.replace();
}

function projectCardHtml(p) {
  const membersHtml = (p.members || []).slice(0,4).map(m =>
    `<div class="avatar" style="width:22px;height:22px;font-size:9px" title="${esc(m.fullName||m.username)}">${esc(m.initials||'?')}</div>`
  ).join('');
  const statusColor = { ACTIVE:'var(--green)', ON_HOLD:'var(--yellow)', COMPLETED:'var(--accent)', ARCHIVED:'var(--text-3)' };
  return `
    <div class="project-card" onclick="navigateTo('board',${p.id})">
      <div class="project-card-header">
        <span class="project-key">${esc(p.key)}</span>
        <span style="font-size:10px;color:${statusColor[p.status]||'var(--text-3)'};font-weight:600">${p.status}</span>
      </div>
      <div class="project-name">${esc(p.name)}</div>
      ${p.description ? `<div class="project-desc">${esc(p.description.substring(0,90))}${p.description.length>90?'…':''}</div>` : ''}
      <div class="project-footer">
        <div class="project-meta">
          <span style="display:flex;align-items:center;gap:3px"><i data-feather="check-square"></i>${p.taskCount} tasks</span>
          <span style="display:flex;align-items:center;gap:3px"><i data-feather="users"></i>${p.memberCount} members</span>
        </div>
        <div class="project-members">${membersHtml}</div>
      </div>
    </div>`;
}

// ── Kanban Board ────────────────────────────────────────────────────────────
async function renderBoard(projectId) {
  if (!projectId && State.projects.length) projectId = State.projects[0].id;
  State.currentProject = projectId;
  renderSidebarProjects();

  const project = State.projects.find(p => p.id == projectId);

  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">${esc(project?.name || 'Board')}</h1>
          <p class="page-subtitle" style="font-family:monospace">${esc(project?.key || '')}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('project-${projectId}')">
            <i data-feather="settings"></i> Settings
          </button>
          <button class="btn btn-primary btn-sm" onclick="openCreateTaskModal(${projectId})">
            <i data-feather="plus"></i> Add Task
          </button>
        </div>
      </div>
      <div class="board-toolbar">
        <input type="text" id="board-search" placeholder="Filter tasks…" oninput="filterBoard(this.value)" style="max-width:200px" />
        <select id="board-priority-filter" onchange="filterBoard()">
          <option value="">All Priorities</option>
          <option value="CRITICAL">🔴 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🔵 Medium</option>
          <option value="LOW">🟢 Low</option>
        </select>
        <select id="board-type-filter" onchange="filterBoard()">
          <option value="">All Types</option>
          <option value="TASK">📋 Task</option>
          <option value="BUG">🐛 Bug</option>
          <option value="FEATURE">✨ Feature</option>
          <option value="STORY">📖 Story</option>
          <option value="EPIC">🏔 Epic</option>
        </select>
      </div>
      <div id="board-wrap">
        <div class="kanban-board" id="kanban-board">
          ${COLUMNS.map(col => `
            <div class="kanban-col col-${col.cls}" id="col-${col.status}" data-status="${col.status}">
              <div class="kanban-col-header">
                <span class="kanban-col-title">
                  <span>${col.emoji}</span> ${col.label}
                  <span class="col-count" id="count-${col.status}">0</span>
                </span>
                <button class="btn-icon" style="width:24px;height:24px" onclick="openCreateTaskModal(${projectId},'${col.status}')" title="Add task">
                  <i data-feather="plus"></i>
                </button>
              </div>
              <div class="kanban-col-body" id="cards-${col.status}"
                   ondragover="dragOver(event,this)" ondrop="dropTask(event,'${col.status}')" ondragleave="dragLeave(this)">
                <div class="loading-line" style="height:60px;border-radius:6px;border:none"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  feather.replace();

  await loadBoardTasks(projectId);
}

const COLUMNS = [
  { status: 'BACKLOG',     label: 'Backlog',     emoji: '🗄',  cls: 'backlog'   },
  { status: 'TODO',        label: 'To Do',       emoji: '📋',  cls: 'todo'      },
  { status: 'IN_PROGRESS', label: 'In Progress', emoji: '🚀',  cls: 'progress'  },
  { status: 'IN_REVIEW',   label: 'In Review',   emoji: '👁',  cls: 'review'    },
  { status: 'DONE',        label: 'Done',        emoji: '✅',  cls: 'done'      },
  { status: 'CANCELLED',   label: 'Cancelled',   emoji: '🚫',  cls: 'cancelled' },
];

let boardTasks = [];

async function loadBoardTasks(projectId) {
  try {
    boardTasks = await API.get(`/projects/${projectId}/tasks/board`) || [];
    renderBoardCards();
  } catch(e) { toast('Failed to load board', 'error'); }
}

function renderBoardCards(tasks) {
  const list = tasks || boardTasks;
  COLUMNS.forEach(col => {
    const colTasks = list.filter(t => t.status === col.status);
    const container = el('cards-' + col.status);
    if (!container) return;
    el('count-' + col.status).textContent = colTasks.length;
    container.innerHTML = colTasks.map(t => kanbanCardHtml(t)).join('') ||
      `<div class="kanban-drop-zone" ondragover="dragOver(event,this)" ondrop="dropTask(event,'${col.status}')" ondragleave="dragLeave(this)">
        Drop here
      </div>`;
  });
  feather.replace();
}

function kanbanCardHtml(t) {
  return `
    <div class="kanban-card" draggable="true"
         id="kcard-${t.id}"
         ondragstart="dragStart(event,${t.id})"
         onclick="openTaskDetail(${t.id})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px">
        <span style="font-size:10px;font-family:monospace;color:var(--text-3)">${esc(t.taskNumber)}</span>
        <span style="font-size:12px">${typeIcon(t.type)}</span>
      </div>
      <div class="kanban-card-title">${esc(t.title)}</div>
      <div class="kanban-card-footer">
        <div class="kanban-card-left">
          <span class="badge ${priorityClass(t.priority)}" style="padding:1px 6px;font-size:10px">${priIcon(t.priority)}</span>
          ${t.overdue ? '<div class="overdue-dot" title="Overdue"></div>' : ''}
          ${t.dueDate ? `<span style="font-size:10px;color:${t.overdue?'var(--red)':'var(--text-3)'}">${fmtDate(t.dueDate)}</span>` : ''}
        </div>
        ${t.assignee ? `<div class="avatar sm" title="${esc(t.assignee.fullName||t.assignee.username)}">${esc(t.assignee.initials||'?')}</div>` : '<div style="width:28px"></div>'}
      </div>
    </div>`;
}

function filterBoard() {
  const search   = (el('board-search')?.value || '').toLowerCase();
  const priority = el('board-priority-filter')?.value || '';
  const type     = el('board-type-filter')?.value || '';
  const filtered = boardTasks.filter(t =>
    (!search   || t.title.toLowerCase().includes(search) || t.taskNumber.toLowerCase().includes(search)) &&
    (!priority || t.priority === priority) &&
    (!type     || t.type === type)
  );
  renderBoardCards(filtered);
}

// ── Drag-and-Drop ──────────────────────────────────────────────────────────
let draggedTaskId = null;

function dragStart(e, id) {
  draggedTaskId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => { const c = el('kcard-'+id); if (c) c.style.opacity = '0.5'; }, 0);
}

function dragOver(e, colBody) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  colBody.classList.add('drag-over');
}

function dragLeave(colBody) { colBody.classList.remove('drag-over'); }

async function dropTask(e, newStatus) {
  e.preventDefault();
  const colBody = document.querySelector(`#cards-${newStatus}`);
  if (colBody) colBody.classList.remove('drag-over');

  if (!draggedTaskId) return;
  const task = boardTasks.find(t => t.id === draggedTaskId);
  if (!task || task.status === newStatus) { draggedTaskId = null; return; }

  const oldStatus = task.status;
  task.status = newStatus;
  renderBoardCards();

  try {
    await API.patch(`/tasks/${draggedTaskId}/status`, { status: newStatus });
    toast(`Moved to ${statusLabel(newStatus)}`, 'success');
  } catch(err) {
    task.status = oldStatus;
    renderBoardCards();
    toast('Failed to update status', 'error');
  }
  draggedTaskId = null;
}

// ── Task Detail Modal ──────────────────────────────────────────────────────
async function openTaskDetail(taskId) {
  State.viewingTaskId = taskId;
  show('task-detail-modal');

  try {
    const [task, comments, activities] = await Promise.all([
      API.get(`/tasks/${taskId}`),
      API.get(`/tasks/${taskId}/comments`),
      API.get(`/tasks/${taskId}/activities`),
    ]);
    if (!task) return;

    el('td-number').textContent = task.taskNumber;
    el('td-title').textContent  = task.title;
    el('td-description').textContent = task.description || 'No description provided.';
    el('td-priority').className = `badge ${priorityClass(task.priority)}`;
    el('td-priority').textContent = `${priIcon(task.priority)} ${task.priority}`;
    el('td-type').textContent   = `${typeIcon(task.type)} ${task.type}`;
    el('td-due').textContent    = task.dueDate ? fmtDate(task.dueDate) : '—';
    el('td-due').className      = task.overdue ? 'overdue meta-value' : 'meta-value';
    el('td-project').textContent = `${task.projectName} (${task.projectKey})`;
    el('td-created').textContent = fmtDateTime(task.createdAt);

    const pct = task.estimatedHours ? Math.min(100, Math.round((task.loggedHours/task.estimatedHours)*100)) : 0;
    el('td-progress').style.width = pct + '%';
    el('td-hours-text').textContent = `${task.loggedHours||0}h / ${task.estimatedHours||'?'}h`;

    const statusSel = el('td-status-select');
    statusSel.innerHTML = COLUMNS.map(c => `<option value="${c.status}" ${task.status===c.status?'selected':''}>${c.emoji} ${c.label}</option>`).join('');

    el('td-assignee').innerHTML = task.assignee
      ? `<div class="avatar sm">${esc(task.assignee.initials||'?')}</div><span>${esc(task.assignee.fullName||task.assignee.username)}</span>`
      : '<span style="color:var(--text-3)">Unassigned</span>';
    el('td-reporter').innerHTML = task.reporter
      ? `<div class="avatar sm">${esc(task.reporter.initials||'?')}</div><span>${esc(task.reporter.fullName||task.reporter.username)}</span>`
      : '<span style="color:var(--text-3)">—</span>';

    el('td-comment-avatar').textContent = State.user?.initials || '?';

    el('td-comments').innerHTML = comments?.length
      ? comments.map(c => `
          <div class="comment-card">
            <div class="avatar sm">${esc(c.author?.initials||'?')}</div>
            <div class="comment-body">
              <div class="comment-meta">
                <span class="comment-author">${esc(c.author?.fullName||c.author?.username||'?')}</span>
                <span class="comment-time">${fmtDateTime(c.createdAt)}</span>
              </div>
              <div class="comment-text">${esc(c.content)}</div>
            </div>
          </div>`).join('')
      : '<p style="color:var(--text-3);font-size:12px">No comments yet. Be the first!</p>';

    el('td-activities').innerHTML = activities?.length
      ? activities.map(a => `
          <div class="activity-item">
            <div class="activity-dot"></div>
            <div class="activity-text">
              <strong>${esc(a.user?.username||'?')}</strong>
              ${activityText(a)}
            </div>
            <span class="activity-time">${fmtDateTime(a.createdAt)}</span>
          </div>`).join('')
      : '<p style="color:var(--text-3);font-size:12px">No activity yet.</p>';

    feather.replace();
  } catch(e) { toast('Failed to load task', 'error'); }
}

function activityText(a) {
  if (a.action === 'CREATED') return ' created this task';
  if (a.action === 'STATUS_CHANGED') return ` changed status from <strong>${statusLabel(a.oldValue)}</strong> to <strong>${statusLabel(a.newValue)}</strong>`;
  if (a.action === 'ASSIGNEE_CHANGED') return ` changed assignee from <strong>${a.oldValue}</strong> to <strong>${a.newValue}</strong>`;
  if (a.action === 'PRIORITY_CHANGED') return ` changed priority from <strong>${a.oldValue}</strong> to <strong>${a.newValue}</strong>`;
  return ` updated ${a.fieldName||'task'}`;
}

async function quickUpdateStatus(status) {
  if (!State.viewingTaskId) return;
  try {
    const updated = await API.patch(`/tasks/${State.viewingTaskId}/status`, { status });
    if (updated) {
      toast('Status updated', 'success');
      if (boardTasks.length) {
        const t = boardTasks.find(t => t.id === State.viewingTaskId);
        if (t) { t.status = status; renderBoardCards(); }
      }
    }
  } catch(e) { toast('Failed to update status', 'error'); }
}

async function submitComment() {
  const content = el('td-comment-input')?.value?.trim();
  if (!content || !State.viewingTaskId) return;
  try {
    await API.post(`/tasks/${State.viewingTaskId}/comments`, { content });
    el('td-comment-input').value = '';
    openTaskDetail(State.viewingTaskId);
    toast('Comment added', 'success');
  } catch(e) { toast('Failed to add comment', 'error'); }
}

function openEditTaskFromDetail() {
  closeModal('task-detail-modal');
  openEditTaskModal(State.viewingTaskId);
}

async function deleteCurrentTask() {
  if (!State.viewingTaskId) return;
  if (!confirm('Delete this task? This action cannot be undone.')) return;
  try {
    await API.delete(`/tasks/${State.viewingTaskId}`);
    closeModal('task-detail-modal');
    boardTasks = boardTasks.filter(t => t.id !== State.viewingTaskId);
    renderBoardCards();
    toast('Task deleted', 'success');
    State.viewingTaskId = null;
    if (State.currentPage === 'my-tasks') renderMyTasks();
  } catch(e) { toast('Failed to delete task', 'error'); }
}

// ── Create / Edit Task Modal ──────────────────────────────────────────────
function openCreateTaskModal(projectId, status) {
  State.editingTaskId = null;
  el('task-modal-title').textContent = 'Create Task';
  el('task-save-text').textContent   = 'Create Task';
  el('t-title').value       = '';
  el('t-description').value = '';
  el('t-type').value        = 'TASK';
  el('t-status').value      = status || 'TODO';
  el('t-priority').value    = 'MEDIUM';
  el('t-dueDate').value     = '';
  el('t-estimatedHours').value = '';
  el('t-loggedHours').value = '';
  hideError('task-modal-error');
  populateProjectDropdown();
  if (projectId) el('t-project').value = projectId;
  if (projectId) loadAssigneesForProject(projectId);
  show('task-modal');
  feather.replace();
}

async function openEditTaskModal(taskId) {
  State.editingTaskId = taskId;
  el('task-modal-title').textContent = 'Edit Task';
  el('task-save-text').textContent   = 'Save Changes';
  try {
    const task = await API.get(`/tasks/${taskId}`);
    if (!task) return;
    populateProjectDropdown();
    el('t-project').value = task.projectId;
    await loadAssigneesForProject(task.projectId);
    el('t-title').value          = task.title;
    el('t-description').value    = task.description || '';
    el('t-type').value           = task.type;
    el('t-status').value         = task.status;
    el('t-priority').value       = task.priority;
    el('t-dueDate').value        = task.dueDate || '';
    el('t-estimatedHours').value = task.estimatedHours || '';
    el('t-loggedHours').value    = task.loggedHours || '';
    if (task.assignee) el('t-assignee').value = task.assignee.id;
    show('task-modal');
    feather.replace();
  } catch(e) { toast('Failed to load task', 'error'); }
}

async function loadAssigneesForProject(projectId) {
  if (!projectId) return;
  try {
    const project = await API.get(`/projects/${projectId}`);
    const sel = el('t-assignee');
    sel.innerHTML = '<option value="">— Unassigned —</option>' +
      (project?.members || []).map(m =>
        `<option value="${m.id}">${esc(m.fullName||m.username)}</option>`).join('');
  } catch(e) {}
}

async function saveTask() {
  const title    = v('t-title');
  const projectId = v('t-project');
  if (!title) return showError('task-modal-error', 'Title is required');
  if (!State.editingTaskId && !projectId) return showError('task-modal-error', 'Project is required');

  const payload = {
    title,
    description:    v('t-description') || null,
    type:           v('t-type'),
    status:         v('t-status'),
    priority:       v('t-priority'),
    dueDate:        v('t-dueDate') || null,
    estimatedHours: v('t-estimatedHours') ? parseInt(v('t-estimatedHours')) : null,
    loggedHours:    v('t-loggedHours') ? parseInt(v('t-loggedHours')) : null,
    assigneeId:     v('t-assignee') ? parseInt(v('t-assignee')) : null,
  };

  setLoading('task-save-text', 'task-save-spinner', true);
  try {
    if (State.editingTaskId) {
      const updated = await API.put(`/tasks/${State.editingTaskId}`, payload);
      toast('Task updated', 'success');
      const idx = boardTasks.findIndex(t => t.id === updated.id);
      if (idx >= 0) boardTasks[idx] = updated;
      renderBoardCards();
    } else {
      const created = await API.post(`/projects/${projectId}/tasks`, payload);
      toast('Task created', 'success');
      boardTasks.push(created);
      renderBoardCards();
      await loadProjects();
    }
    closeModal('task-modal');
    if (State.currentPage === 'my-tasks') renderMyTasks();
    if (State.currentPage === 'dashboard') renderDashboard();
  } catch(e) { showError('task-modal-error', e.message); }
  finally { setLoading('task-save-text', 'task-save-spinner', false); }
}

// ── Create Project Modal ────────────────────────────────────────────────────
function showProjectModal() {
  el('p-name').value        = '';
  el('p-key').value         = '';
  el('p-description').value = '';
  hideError('project-modal-error');
  show('project-modal');
  feather.replace();
}

async function saveProject() {
  const name = v('p-name');
  if (!name) return showError('project-modal-error', 'Project name is required');
  try {
    const project = await API.post('/projects', {
      name, key: v('p-key') || null, description: v('p-description') || null,
    });
    toast(`Project "${project.name}" created!`, 'success');
    closeModal('project-modal');
    await loadProjects();
    navigateTo('board', project.id);
  } catch(e) { showError('project-modal-error', e.message); }
}

// ── Project Detail / Settings ──────────────────────────────────────────────
async function renderProjectDetail(projectId) {
  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <div><h1 class="page-title">Project Settings</h1></div>
        <button class="btn btn-ghost" onclick="navigateTo('board',${projectId})">
          <i data-feather="arrow-left"></i> Back to Board
        </button>
      </div>
      <div id="proj-detail-content"><div class="loading-line" style="height:200px;border-radius:10px"></div></div>
    </div>`;
  feather.replace();

  try {
    const project = await API.get(`/projects/${projectId}`);
    const allUsers = await API.get('/users/search?query=');

    el('proj-detail-content').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card" style="padding:20px">
          <h3 style="margin-bottom:16px;font-size:15px">Project Info</h3>
          <div class="form-group"><label>Name</label>
            <input id="ps-name" type="text" value="${esc(project.name)}" />
          </div>
          <div class="form-group"><label>Description</label>
            <textarea id="ps-description" rows="3">${esc(project.description||'')}</textarea>
          </div>
          <div class="form-group"><label>Status</label>
            <select id="ps-status">
              ${['ACTIVE','ON_HOLD','COMPLETED','ARCHIVED'].map(s =>
                `<option value="${s}" ${project.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="updateProject(${projectId})">Save Changes</button>
        </div>
        <div class="card" style="padding:20px">
          <h3 style="margin-bottom:16px;font-size:15px">Members (${project.memberCount})</h3>
          <div style="margin-bottom:14px">
            ${(project.members||[]).map(m => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div class="avatar sm">${esc(m.initials||'?')}</div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${esc(m.fullName||m.username)}</div>
                  <div style="font-size:11px;color:var(--text-3)">${esc(m.email)}</div>
                </div>
                ${project.owner?.id !== m.id ? `
                <button class="btn btn-danger btn-sm" onclick="removeMember(${projectId},${m.id})">Remove</button>` : '<span class="tag">Owner</span>'}
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <select id="add-member-sel" style="flex:1">
              <option value="">— Add member —</option>
              ${(allUsers||[]).filter(u => !(project.members||[]).find(m=>m.id===u.id)).map(u =>
                `<option value="${u.id}">${esc(u.fullName||u.username)} (${esc(u.email)})</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" onclick="addMember(${projectId})">Add</button>
          </div>
        </div>
      </div>
      <div style="margin-top:20px;padding:16px;background:var(--red-dim);border:1px solid var(--red);border-radius:var(--radius)">
        <h4 style="color:var(--red);margin-bottom:8px">Danger Zone</h4>
        <p style="font-size:12px;color:var(--text-2);margin-bottom:12px">Deleting this project will permanently remove all tasks, comments, and data.</p>
        <button class="btn btn-danger btn-sm" onclick="deleteProject(${projectId})">
          <i data-feather="trash-2"></i> Delete Project
        </button>
      </div>`;
    feather.replace();
  } catch(e) { toast('Failed to load project', 'error'); }
}

async function updateProject(projectId) {
  try {
    await API.put(`/projects/${projectId}`, {
      name: v('ps-name'), description: v('ps-description'), status: v('ps-status'),
    });
    await loadProjects();
    toast('Project updated', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function addMember(projectId) {
  const userId = v('add-member-sel');
  if (!userId) return toast('Select a user to add', 'info');
  try {
    await API.post(`/projects/${projectId}/members/${userId}`, {});
    toast('Member added', 'success');
    renderProjectDetail(projectId);
  } catch(e) { toast(e.message, 'error'); }
}

async function removeMember(projectId, userId) {
  if (!confirm('Remove this member from the project?')) return;
  try {
    await API.delete(`/projects/${projectId}/members/${userId}`);
    toast('Member removed', 'success');
    renderProjectDetail(projectId);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteProject(projectId) {
  if (!confirm('Permanently delete this project and ALL its tasks? This cannot be undone!')) return;
  try {
    await API.delete(`/projects/${projectId}`);
    toast('Project deleted', 'success');
    await loadProjects();
    navigateTo('projects');
  } catch(e) { toast(e.message, 'error'); }
}

// ── Profile Page ────────────────────────────────────────────────────────────
async function renderProfile() {
  const u = State.user;
  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">My Profile</h1>
      </div>
      <div class="profile-grid">
        <div class="profile-card">
          <div class="avatar xl">${esc(u?.initials||'?')}</div>
          <div class="profile-name">${esc(u?.fullName||u?.username||'')}</div>
          <div class="profile-username">@${esc(u?.username||'')}</div>
          <div class="profile-username">${esc(u?.email||'')}</div>
          <div class="profile-role-badge">${u?.role?.replace('ROLE_','')||''}</div>
        </div>
        <div>
          <div class="profile-form" style="margin-bottom:16px">
            <h3>Edit Profile</h3>
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <input id="pf-firstName" type="text" value="${esc(u?.firstName||'')}" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input id="pf-lastName" type="text" value="${esc(u?.lastName||'')}" />
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveProfile()">Save Profile</button>
          </div>
          <div class="profile-form">
            <h3>Change Password</h3>
            <div class="form-group">
              <label>Current Password</label>
              <input id="pf-currentPw" type="password" placeholder="••••••••" />
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input id="pf-newPw" type="password" placeholder="Min 8 chars, A-Z, a-z, 0-9" />
            </div>
            <div id="pw-error" class="form-error hidden"></div>
            <button class="btn btn-secondary btn-sm" onclick="changePassword()">Update Password</button>
          </div>
        </div>
      </div>
    </div>`;
  feather.replace();
}

async function saveProfile() {
  try {
    const updated = await API.put('/users/profile', {
      firstName: v('pf-firstName'), lastName: v('pf-lastName'),
    });
    State.user = { ...State.user, ...updated };
    localStorage.setItem('tf_user', JSON.stringify(State.user));
    updateSidebarUser();
    toast('Profile updated', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function changePassword() {
  const currentPassword = v('pf-currentPw');
  const newPassword     = v('pf-newPw');
  if (!currentPassword || !newPassword) return showError('pw-error', 'Both fields are required');
  try {
    await API.post('/users/change-password', { currentPassword, newPassword });
    el('pf-currentPw').value = ''; el('pf-newPw').value = '';
    hideError('pw-error');
    toast('Password changed successfully', 'success');
  } catch(e) { showError('pw-error', e.message); }
}

// ── Global Search ──────────────────────────────────────────────────────────
function debounceSearch(query) {
  clearTimeout(State.searchTimer);
  if (!query.trim()) { hide('search-results'); return; }
  State.searchTimer = setTimeout(() => performSearch(query), 350);
}

async function performSearch(query) {
  try {
    const tasks = await API.get(`/tasks/search?q=${encodeURIComponent(query)}`);
    const results = el('search-results');
    if (!tasks?.length) {
      results.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:12px">No results found</div>';
    } else {
      results.innerHTML = tasks.slice(0,8).map(t => `
        <div class="search-result-item" onclick="openTaskDetail(${t.id});closeSearch()">
          <span class="task-number">${esc(t.taskNumber)}</span>
          <span style="flex:1;font-size:13px">${esc(t.title)}</span>
          <span class="badge ${statusClass(t.status)}" style="font-size:10px">${statusLabel(t.status)}</span>
        </div>`).join('');
    }
    show('search-results');
    feather.replace();
  } catch(e) {}
}

function closeSearch() {
  hide('search-results');
  el('global-search').value = '';
}

document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-search')) closeSearch();
});

// ── Helpers ────────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);
const v  = id => { const e = el(id); return e ? e.value.trim() : ''; };
function show(id) { el(id)?.classList.remove('hidden'); }
function hide(id) { el(id)?.classList.add('hidden'); }
function closeModal(id) { el(id)?.classList.add('hidden'); }
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function showError(id, msg) { const e = el(id); if (e) { e.textContent = msg; e.classList.remove('hidden'); } }
function hideError(id) { el(id)?.classList.add('hidden'); }
function setLoading(textId, spinnerId, loading) {
  const t = el(textId), s = el(spinnerId);
  if (t) t.textContent = loading ? '' : (textId.includes('login') ? 'Sign In' : textId.includes('register') ? 'Create Account' : t.dataset.orig || 'Save');
  if (s) loading ? s.classList.remove('hidden') : s.classList.add('hidden');
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(s) {
  return { BACKLOG:'Backlog', TODO:'To Do', IN_PROGRESS:'In Progress', IN_REVIEW:'In Review', DONE:'Done', CANCELLED:'Cancelled' }[s] || s;
}
function statusClass(s) {
  return { BACKLOG:'badge-backlog', TODO:'badge-todo', IN_PROGRESS:'badge-progress', IN_REVIEW:'badge-review', DONE:'badge-done', CANCELLED:'badge-cancelled' }[s] || 'badge-todo';
}
function priorityClass(p) {
  return { LOW:'badge-low', MEDIUM:'badge-medium', HIGH:'badge-high', CRITICAL:'badge-critical' }[p] || 'badge-medium';
}
function priIcon(p) {
  return { LOW:'🟢', MEDIUM:'🔵', HIGH:'🟠', CRITICAL:'🔴' }[p] || '🔵';
}
function typeIcon(t) {
  return { TASK:'📋', BUG:'🐛', FEATURE:'✨', STORY:'📖', EPIC:'🏔' }[t] || '📋';
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `
    <i data-feather="${icons[type]||'info'}" class="toast-icon"></i>
    <span class="toast-msg">${esc(msg)}</span>
    <i data-feather="x" class="toast-close" onclick="this.closest('.toast').remove()"></i>`;
  el('toast-container').appendChild(div);
  feather.replace();
  setTimeout(() => div.remove(), 4000);
}

// ── Auth form helpers ──────────────────────────────────────────────────────
function showLogin() {
  show('login-form'); hide('register-form');
  hideError('login-error'); hideError('register-error');
}
function showRegister() {
  hide('login-form'); show('register-form');
  hideError('login-error'); hideError('register-error');
}
function fillCreds(u, p) {
  el('login-username').value = u;
  el('login-password').value = p;
}
function togglePassword(inputId, btn) {
  const inp = el(inputId);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.innerHTML = `<i data-feather="${isText ? 'eye' : 'eye-off'}"></i>`;
  feather.replace();
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    closeSearch();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    el('global-search')?.focus();
  }
  if (e.key === 'Enter' && document.activeElement?.id === 'login-password') doLogin();
  if (e.key === 'Enter' && document.activeElement?.id === 'login-username') el('login-password')?.focus();
});

/* ================================================================
   Phase 2 — Notifications, Sprints, Attachments, Time Tracking
   ================================================================ */

// ── Token management (refresh token support) ────────────────────
const TokenMgr = {
  getAccess()   { return localStorage.getItem('tf_token'); },
  getRefresh()  { return localStorage.getItem('tf_refresh'); },
  save(data) {
    localStorage.setItem('tf_token',   data.accessToken);
    localStorage.setItem('tf_refresh', data.refreshToken);
    localStorage.setItem('tf_user',    JSON.stringify(data.user));
    State.token = data.accessToken;
    State.user  = data.user;
  },
  clear() {
    ['tf_token','tf_refresh','tf_user'].forEach(k => localStorage.removeItem(k));
  }
};

// Override API.req to auto-refresh on 401
const _origReq = API.req.bind(API);
API.req = async function(method, path, body) {
  try {
    return await _origReq(method, path, body);
  } catch(e) {
    if (e.message && e.message.includes('401') && !path.includes('/auth/')) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return await _origReq(method, path, body);
    }
    throw e;
  }
};

async function tryRefreshToken() {
  const rt = TokenMgr.getRefresh();
  if (!rt) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt })
    });
    if (!res.ok) { logout(); return false; }
    const data = await res.json();
    TokenMgr.save(data.data || data);
    return true;
  } catch(e) {
    logout();
    return false;
  }
}

// Patch doLogin / doRegister to store refresh token
const _origLogin = doLogin;
doLogin = async function() {
  const u = v('login-username'), p = v('login-password');
  if (!u || !p) return showError('login-error', 'Please fill all fields');
  setLoading('login-btn-text', 'login-spinner', true);
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: u, password: p })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    TokenMgr.save(data.data || data);
    initApp();
  } catch(e) { showError('login-error', e.message); }
  finally { setLoading('login-btn-text', 'login-spinner', false); }
};

// ── Topbar: add notification bell ─────────────────────────────────
const _origInitApp = initApp;
initApp = async function() {
  hide('auth-page'); show('app');
  updateSidebarUser();
  injectNotifBell();
  await loadProjects();
  await refreshNotifCount();
  navigateTo('dashboard');
  feather.replace();
};

function injectNotifBell() {
  const right = document.querySelector('.topbar-right');
  if (!right || document.getElementById('notif-btn')) return;
  const btn = document.createElement('div');
  btn.style.cssText = 'position:relative';
  btn.innerHTML = `
    <button class="btn-icon notif-btn" id="notif-btn" onclick="toggleNotifPanel()" title="Notifications">
      <i data-feather="bell"></i>
      <span class="notif-count hidden" id="notif-count">0</span>
    </button>
    <div class="notif-panel hidden" id="notif-panel">
      <div class="notif-panel-header">
        <span>Notifications</span>
        <button class="btn-ghost btn-sm" onclick="markAllNotifRead()">Mark all read</button>
      </div>
      <div class="notif-list" id="notif-list">
        <div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px">Loading…</div>
      </div>
    </div>`;
  right.insertBefore(btn, right.firstChild);
  feather.replace();
}

async function refreshNotifCount() {
  try {
    const data = await API.get('/notifications/unread-count');
    const count = data?.count || 0;
    const badge = el('notif-count');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  } catch(e) {}
}

async function toggleNotifPanel() {
  const panel = el('notif-panel');
  if (!panel) return;
  const open = !panel.classList.contains('hidden');
  panel.classList.toggle('hidden', open);
  if (!open) {
    await loadNotifications();
  }
}

async function loadNotifications() {
  try {
    const data = await API.get('/notifications?size=15');
    const items = data?.content || [];
    el('notif-list').innerHTML = items.length
      ? items.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}"
               onclick="handleNotifClick(${n.entityId},'${n.entityType}',${n.id})">
            <span class="notif-icon">${notifIcon(n.type)}</span>
            <div class="notif-body">
              <div class="notif-title">${esc(n.title)}</div>
              <div class="notif-msg">${esc(n.message||'')}</div>
              <div class="notif-time">${fmtDateTime(n.createdAt)}</div>
            </div>
          </div>`).join('')
      : '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">🔔 All caught up!</div>';
  } catch(e) {}
}

function notifIcon(type) {
  const m = {
    TASK_ASSIGNED:'📋', TASK_STATUS_CHANGED:'🔄',
    TASK_COMMENTED:'💬', TASK_DUE_SOON:'⏰',
    PROJECT_MEMBER_ADDED:'👥', SPRINT_STARTED:'🚀',
    SPRINT_COMPLETED:'✅', MENTION:'@'
  };
  return m[type] || '🔔';
}

async function handleNotifClick(entityId, entityType, notifId) {
  hide('notif-panel');
  await API.patch(`/notifications/${notifId}/read`, {});
  refreshNotifCount();
  if (entityType === 'TASK' && entityId) openTaskDetail(entityId);
  else if (entityType === 'SPRINT' && entityId) navigateTo('dashboard');
}

async function markAllNotifRead() {
  await API.post('/notifications/mark-all-read', {});
  refreshNotifCount();
  loadNotifications();
}

// close notif panel on outside click
document.addEventListener('click', e => {
  const panel = el('notif-panel');
  const btn   = el('notif-btn');
  if (panel && btn && !panel.classList.contains('hidden')
      && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

// ── Periodically refresh notification count ──────────────────────
setInterval(refreshNotifCount, 60000);

// ── Sprint page ──────────────────────────────────────────────────
async function renderSprintBoard(projectId) {
  const project = State.projects.find(p => p.id == projectId);
  el('main-content').innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sprint Board</h1>
          <p class="page-subtitle">${esc(project?.name || '')}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('board',${projectId})">
            <i data-feather="grid"></i> Kanban
          </button>
          <button class="btn btn-ghost btn-sm" onclick="showBacklog(${projectId})">
            <i data-feather="list"></i> Backlog
          </button>
          <button class="btn btn-primary btn-sm" onclick="showCreateSprintModal(${projectId})">
            <i data-feather="plus"></i> New Sprint
          </button>
        </div>
      </div>
      <div id="sprint-content">
        <div class="loading-line" style="height:120px;border-radius:10px"></div>
      </div>
    </div>`;
  feather.replace();

  try {
    const sprints = await API.get(`/projects/${projectId}/sprints`);
    if (!sprints?.length) {
      el('sprint-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏃</div>
          <h3>No sprints yet</h3>
          <p>Create your first sprint to start planning iterations.</p>
          <button class="btn btn-primary" onclick="showCreateSprintModal(${projectId})">Create Sprint</button>
        </div>`;
      return;
    }

    const activeSprint = sprints.find(s => s.status === 'ACTIVE');
    let html = '';

    if (activeSprint) {
      const pct = activeSprint.totalTasks
        ? Math.round((activeSprint.completedTasks / activeSprint.totalTasks) * 100) : 0;
      html += `
        <div class="sprint-header">
          <div class="sprint-info">
            <span style="font-size:20px">🚀</span>
            <div>
              <div class="sprint-name">${esc(activeSprint.name)}</div>
              <div class="sprint-dates">${fmtDate(activeSprint.startDate)} → ${fmtDate(activeSprint.endDate)}</div>
            </div>
            <span class="badge badge-progress">ACTIVE</span>
            ${activeSprint.velocity ? `<span class="velocity-chip">⚡ ${activeSprint.velocity} pts</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="sprint-progress-wrap">
              <span>${activeSprint.completedTasks}/${activeSprint.totalTasks} done</span>
              <div class="sprint-progress-bar">
                <div class="sprint-progress-fill" style="width:${pct}%"></div>
              </div>
              <span>${pct}%</span>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="completeSprint(${activeSprint.id},${projectId})">
              Complete Sprint
            </button>
          </div>
        </div>`;
    }

    // List all sprints
    html += `<div class="table-wrap">
      <table>
        <thead><tr>
          <th>Sprint</th><th>Status</th><th>Period</th>
          <th>Tasks</th><th>Velocity</th><th>Actions</th>
        </tr></thead>
        <tbody>
        ${sprints.map(s => `
          <tr>
            <td><div style="font-weight:600">${esc(s.name)}</div>
                ${s.goal ? `<div style="font-size:11px;color:var(--text-3)">${esc(s.goal)}</div>` : ''}</td>
            <td><span class="badge ${sprintStatusClass(s.status)}">${s.status}</span></td>
            <td style="font-size:12px;color:var(--text-2)">
              ${s.startDate ? fmtDate(s.startDate) : '—'} → ${s.endDate ? fmtDate(s.endDate) : '—'}
            </td>
            <td><span class="badge badge-todo">${s.completedTasks}/${s.totalTasks}</span></td>
            <td>${s.velocity ? `<span class="sp-badge">⚡ ${s.velocity}</span>` : '—'}</td>
            <td>
              ${s.status === 'PLANNED' ? `<button class="btn btn-primary btn-sm" onclick="startSprint(${s.id},${projectId})">Start</button>` : ''}
              ${s.status === 'ACTIVE'  ? `<button class="btn btn-secondary btn-sm" onclick="completeSprint(${s.id},${projectId})">Complete</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    el('sprint-content').innerHTML = html;
    feather.replace();
  } catch(e) { toast('Failed to load sprints', 'error'); }
}

function sprintStatusClass(s) {
  return { PLANNED:'badge-todo', ACTIVE:'badge-progress', COMPLETED:'badge-done' }[s] || 'badge-todo';
}

async function startSprint(sprintId, projectId) {
  if (!confirm('Start this sprint? Only one sprint can be active at a time.')) return;
  try {
    await API.post(`/projects/${projectId}/sprints/${sprintId}/start`, {});
    toast('Sprint started! 🚀', 'success');
    renderSprintBoard(projectId);
  } catch(e) { toast(e.message, 'error'); }
}

async function completeSprint(sprintId, projectId) {
  if (!confirm('Complete this sprint? Incomplete tasks will be moved to backlog.')) return;
  try {
    await API.post(`/projects/${projectId}/sprints/${sprintId}/complete`, {});
    toast('Sprint completed! ✅', 'success');
    renderSprintBoard(projectId);
  } catch(e) { toast(e.message, 'error'); }
}

function showCreateSprintModal(projectId) {
  // Simple inline prompt — real UI would use a modal
  const name = prompt('Sprint name:');
  if (!name) return;
  const goal  = prompt('Sprint goal (optional):') || '';
  const start = prompt('Start date (YYYY-MM-DD, optional):') || null;
  const end   = prompt('End date   (YYYY-MM-DD, optional):') || null;
  API.post(`/projects/${projectId}/sprints`, { name, goal, startDate: start, endDate: end })
    .then(() => { toast('Sprint created', 'success'); renderSprintBoard(projectId); })
    .catch(e  => toast(e.message, 'error'));
}

// ── Extend Task Detail Modal — Phase 2 tabs ─────────────────────
const _origOpenDetail = openTaskDetail;
openTaskDetail = async function(taskId) {
  await _origOpenDetail(taskId);
  injectDetailTabs(taskId);
};

function injectDetailTabs(taskId) {
  const main = document.querySelector('.task-detail-main');
  if (!main) return;

  const sections = main.querySelectorAll('.detail-section');
  if (!sections.length) return;

  const descSection     = sections[0];
  const commentsSection = sections[1];
  const activitySection = sections[2];

  // Wrap in tabs
  const tabWrap = document.createElement('div');
  tabWrap.innerHTML = `
    <div class="tab-nav">
      <button class="tab-btn active" onclick="switchTab('tab-desc',this)">Description</button>
      <button class="tab-btn" onclick="switchTab('tab-comments',this)">Comments</button>
      <button class="tab-btn" onclick="switchTab('tab-activity',this)">Activity</button>
      <button class="tab-btn" onclick="switchTab('tab-attachments',this)">Files</button>
      <button class="tab-btn" onclick="switchTab('tab-time',this)">Time</button>
    </div>
    <div id="tab-desc" class="tab-pane active"></div>
    <div id="tab-comments" class="tab-pane"></div>
    <div id="tab-activity" class="tab-pane"></div>
    <div id="tab-attachments" class="tab-pane">
      <div class="detail-section">
        <h4 class="detail-section-title">Attachments</h4>
        <div id="td-attachments-list"></div>
        <label class="upload-zone" for="td-file-input">
          <i data-feather="upload-cloud" style="width:24px;height:24px;margin-bottom:6px"></i>
          <div>Drop a file here or <strong>click to upload</strong></div>
          <div style="font-size:11px;margin-top:4px">Max 10 MB</div>
          <input type="file" id="td-file-input" onchange="uploadAttachment(${taskId}, this)"/>
        </label>
      </div>
    </div>
    <div id="tab-time" class="tab-pane">
      <div class="detail-section">
        <h4 class="detail-section-title">Time Entries</h4>
        <div id="td-time-list" style="margin-bottom:12px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Minutes</label>
            <input id="td-time-minutes" type="number" min="1" max="1440"
                   placeholder="e.g. 90" style="width:90px;height:32px;font-size:12px"/>
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Date</label>
            <input id="td-time-date" type="date" style="width:130px;height:32px;font-size:12px"/>
          </div>
          <div class="form-group" style="margin:0;flex:1;min-width:120px">
            <label style="font-size:11px">Note (optional)</label>
            <input id="td-time-desc" type="text" placeholder="What did you work on?"
                   style="height:32px;font-size:12px"/>
          </div>
          <button class="btn btn-primary btn-sm" onclick="logTime(${taskId})">
            <i data-feather="clock"></i> Log
          </button>
        </div>
      </div>
    </div>`;

  // Move existing sections into tabs
  tabWrap.querySelector('#tab-desc').appendChild(descSection.cloneNode(true));
  tabWrap.querySelector('#tab-comments').appendChild(commentsSection.cloneNode(true));
  tabWrap.querySelector('#tab-activity').appendChild(activitySection.cloneNode(true));

  // Replace main content
  main.innerHTML = '';
  main.appendChild(tabWrap);

  // Set today's date
  const dateInput = el('td-time-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  loadAttachments(taskId);
  loadTimeEntries(taskId);
  feather.replace();
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el(tabId)?.classList.add('active');
  btn.classList.add('active');
}

// ── Attachments in Task Detail ───────────────────────────────────
async function loadAttachments(taskId) {
  try {
    const list = await API.get(`/tasks/${taskId}/attachments`);
    const container = el('td-attachments-list');
    if (!container) return;
    container.innerHTML = list?.length
      ? list.map(a => `
          <div class="attachment-item">
            <span class="attachment-icon">${fileIcon(a.contentType)}</span>
            <div class="attachment-meta">
              <div class="attachment-name">${esc(a.originalName)}</div>
              <div class="attachment-size">${esc(a.fileSizeFormatted)} · ${esc(a.uploadedBy?.username||'?')} · ${fmtDateTime(a.createdAt)}</div>
            </div>
            <a href="${a.downloadUrl}" class="btn btn-ghost btn-sm" download="${esc(a.originalName)}">
              <i data-feather="download"></i>
            </a>
            <button class="btn btn-danger btn-sm" onclick="deleteAttachment(${a.id},${taskId})">
              <i data-feather="trash-2"></i>
            </button>
          </div>`).join('')
      : '<p style="color:var(--text-3);font-size:12px">No files attached yet.</p>';
    feather.replace();
  } catch(e) {}
}

function fileIcon(ct) {
  if (!ct) return '📄';
  if (ct.startsWith('image/'))       return '🖼';
  if (ct === 'application/pdf')      return '📕';
  if (ct.includes('spreadsheet') || ct.includes('excel')) return '📊';
  if (ct.includes('word'))           return '📝';
  if (ct.includes('zip') || ct.includes('compressed')) return '🗜';
  return '📄';
}

async function uploadAttachment(taskId, input) {
  const file = input.files?.[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + State.token },
      body: form
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    toast('File uploaded', 'success');
    loadAttachments(taskId);
    input.value = '';
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAttachment(attachId, taskId) {
  if (!confirm('Delete this attachment?')) return;
  try {
    await API.delete(`/attachments/${attachId}`);
    toast('Attachment deleted', 'success');
    loadAttachments(taskId);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Time Entries in Task Detail ──────────────────────────────────
async function loadTimeEntries(taskId) {
  try {
    const entries = await API.get(`/tasks/${taskId}/time`);
    const container = el('td-time-list');
    if (!container) return;
    const total = entries?.reduce((s, e) => s + e.minutes, 0) || 0;
    const h = Math.floor(total / 60), m = total % 60;
    container.innerHTML = entries?.length ? `
      <div style="margin-bottom:8px;font-size:12px;color:var(--text-2)">
        Total logged: <span class="time-badge">${h}h ${m > 0 ? m + 'm' : ''}</span>
      </div>
      ${entries.slice(0,8).map(e => `
        <div class="time-entry-item">
          <span class="time-badge">${esc(e.hoursFormatted)}</span>
          <div class="avatar sm">${esc(e.user?.initials||'?')}</div>
          <span style="flex:1;color:var(--text-2)">${esc(e.description||'No description')}</span>
          <span style="color:var(--text-3);font-size:11px">${fmtDate(e.logDate)}</span>
          <button class="btn-icon" onclick="deleteTimeEntry(${e.id},${taskId})" title="Delete">
            <i data-feather="x" style="width:12px;height:12px"></i>
          </button>
        </div>`).join('')}` : '<p style="color:var(--text-3);font-size:12px">No time logged yet.</p>';
    feather.replace();
  } catch(e) {}
}

async function logTime(taskId) {
  const minutes = parseInt(v('td-time-minutes'));
  const logDate = v('td-time-date');
  const description = v('td-time-desc');
  if (!minutes || minutes < 1) return toast('Enter minutes to log', 'info');
  try {
    await API.post(`/tasks/${taskId}/time`, {
      minutes, logDate: logDate || new Date().toISOString().split('T')[0], description
    });
    el('td-time-minutes').value = '';
    el('td-time-desc').value    = '';
    toast(`${minutes} minutes logged ⏱`, 'success');
    loadTimeEntries(taskId);
    // refresh task detail sidebar hours
    openTaskDetail(taskId);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteTimeEntry(entryId, taskId) {
  if (!confirm('Delete this time entry?')) return;
  try {
    await API.delete(`/time/${entryId}`);
    toast('Time entry deleted', 'success');
    loadTimeEntries(taskId);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Label chips in Kanban cards ──────────────────────────────────
const _origKanbanCard = kanbanCardHtml;
kanbanCardHtml = function(t) {
  let base = _origKanbanCard(t);
  if (t.labels?.length) {
    const chips = t.labels.map(l =>
      `<span class="label-chip" style="background:${l.color}22;color:${l.color};border-color:${l.color}44">${esc(l.name)}</span>`
    ).join('');
    base = base.replace('class="kanban-card-title"',
      `class="kanban-card-title" data-labels="${esc(JSON.stringify(t.labels))}"`)
      .replace('</div>\n    </div>', `<div class="labels-wrap" style="margin-bottom:6px">${chips}</div>\n    </div>`);
  }
  return base;
};

// ── Sidebar sprint link for active project ───────────────────────
const _origRenderSidebarProjects = renderSidebarProjects;
renderSidebarProjects = function() {
  _origRenderSidebarProjects();
  // Append sprint link below each project
  document.querySelectorAll('.sidebar-project-item').forEach(item => {
    const pid = item.getAttribute('onclick')?.match(/\d+/)?.[0];
    if (!pid) return;
    const sprintBtn = document.createElement('div');
    sprintBtn.className = 'sidebar-project-item';
    sprintBtn.style.cssText = 'padding-left:44px;font-size:11px;color:var(--text-3)';
    sprintBtn.innerHTML = '<i data-feather="zap" style="width:11px;height:11px"></i> Sprints';
    sprintBtn.onclick = () => renderSprintBoard(pid);
    item.after(sprintBtn);
  });
  feather.replace();
};

