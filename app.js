// ── State ──────────────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('taskflow-tasks')) || [];
let currentFilter = 'all';

// ── Selectors ──────────────────────────────────────────
const taskInput    = document.getElementById('task-input');
const dueInput     = document.getElementById('due-input');
const priorityInput= document.getElementById('priority-input');
const addBtn       = document.getElementById('add-btn');
const taskList     = document.getElementById('task-list');
const emptyState   = document.getElementById('empty-state');
const filterTabs   = document.querySelectorAll('.filter-tab');
const clearBtn     = document.getElementById('clear-completed');
const statTotal    = document.getElementById('stat-total');
const statDone     = document.getElementById('stat-done');
const statOverdue  = document.getElementById('stat-overdue');

// ── Helpers ────────────────────────────────────────────
function save() {
  localStorage.setItem('taskflow-tasks', JSON.stringify(tasks));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < today();
}

function isToday(dateStr) {
  return dateStr === today();
}

function isSoon(dateStr) {
  if (!dateStr) return false;
  const diff = (new Date(dateStr) - new Date(today())) / 86400000;
  return diff > 0 && diff <= 2;
}

// ── Render ─────────────────────────────────────────────
function render() {
  const filtered = tasks.filter(t => {
    if (currentFilter === 'active')    return !t.completed;
    if (currentFilter === 'completed') return t.completed;
    if (currentFilter === 'overdue')   return isOverdue(t.due) && !t.completed;
    return true;
  });

  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    filtered.forEach(t => taskList.appendChild(createItem(t)));
  }

  updateStats();
}

function createItem(task) {
  const li = document.createElement('li');
  li.className = 'task-item' +
    (task.completed ? ' completed' : '') +
    (isOverdue(task.due) && !task.completed ? ' overdue-item' : '');
  li.dataset.id = task.id;

  // Due badge
  let badgeHTML = '';
  if (task.due) {
    let cls = 'due-badge';
    let label = formatDate(task.due);
    if (isOverdue(task.due) && !task.completed) { cls += ' overdue-badge'; label = 'Overdue · ' + label; }
    else if (isToday(task.due)) { cls += ' today-badge'; label = 'Today'; }
    else if (isSoon(task.due)) { cls += ' soon-badge'; label = 'Soon · ' + label; }
    badgeHTML = `<span class="${cls}">${label}</span>`;
  }

  li.innerHTML = `
    <div class="priority-dot ${task.priority}"></div>
    <button class="check-btn ${task.completed ? 'checked' : ''}" aria-label="Mark complete" data-action="toggle"></button>
    <div class="task-body">
      <div class="task-text">${escapeHTML(task.text)}</div>
      <div class="task-meta">
        ${badgeHTML}
        <span class="priority-label">${task.priority}</span>
      </div>
    </div>
    <button class="delete-btn" aria-label="Delete task" data-action="delete">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M6 4V3h4v1M5 4v8h6V4H5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  return li;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => isOverdue(t.due) && !t.completed).length;

  statTotal.textContent   = `${total} task${total !== 1 ? 's' : ''}`;
  statDone.textContent    = `${done} done`;
  statOverdue.textContent = `${overdue} overdue`;
}

// ── Toast ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── Actions ────────────────────────────────────────────
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    taskInput.style.borderColor = '#EF4444';
    setTimeout(() => taskInput.style.borderColor = '', 1000);
    return;
  }

  const task = {
    id: genId(),
    text,
    due: dueInput.value || null,
    priority: priorityInput.value,
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(task);
  save();
  render();

  taskInput.value = '';
  dueInput.value = '';
  priorityInput.value = 'medium';
  taskInput.focus();
  showToast('Task added');
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; save(); render(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
  showToast('Task deleted');
}

function clearCompleted() {
  const count = tasks.filter(t => t.completed).length;
  if (!count) return;
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
  showToast(`${count} completed task${count !== 1 ? 's' : ''} cleared`);
}

// ── Events ─────────────────────────────────────────────
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

taskList.addEventListener('click', e => {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'toggle') toggleTask(id);
  if (action === 'delete') deleteTask(id);
});

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });
});

clearBtn.addEventListener('click', clearCompleted);

// Set min date on due input to today
dueInput.min = today();

// ── Init ───────────────────────────────────────────────
render();
