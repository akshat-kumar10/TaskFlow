// ==================== STATE MANAGEMENT ====================
// Using in-memory state (localStorage not available in sandbox)
let state = {
  tasks: [],
  columns: {
    todo: { id: 'todo', title: 'To Do', color: '#3498db', isDefault: true },
    inProgress: { id: 'inProgress', title: 'In Progress', color: '#f39c12', isDefault: true },
    done: { id: 'done', title: 'Done', color: '#27ae60', isDefault: true }
  },
  currentTheme: 'default',
  currentUser: { name: 'Alice Johnson', email: 'alice@taskflow.com' },
  users: [
    { name: 'Alice Johnson', email: 'alice@taskflow.com' },
    { name: 'Bob Smith', email: 'bob@taskflow.com' },
    { name: 'Carol Davis', email: 'carol@taskflow.com' }
  ],
  activityLog: [],
  filters: {
    search: '',
    priority: 'all',
    date: 'all',
    assignee: 'all'
  },
  currentTaskId: null,
  deleteTaskId: null,
  editingTask: null,
  calendarDate: new Date(),
  selectedCalendarDate: null,
  deleteListId: null,
  draggedTaskId: null,
  sourceColumnId: null
};



// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Create some demo tasks
  createDemoTasks();
  
  // Initialize drag and drop (will be setup after first render)
  initializeDragAndDrop();
  
  // Render board
  renderBoard();
  
  // Update stats
  updateStats();
  
  // Populate assignee filters
  populateAssigneeFilters();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Render user list
  renderUserList();
  
  // Set default due date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('task-duedate').value = today;
}

function createDemoTasks() {
  const demoTasks = [
    {
      id: generateId(),
      title: 'Design Landing Page',
      description: 'Create mockups for the new product landing page with focus on conversion',
      priority: 'High',
      dueDate: '2025-11-05',
      assignee: 'Alice Johnson',
      status: 'todo',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      title: 'Implement Authentication',
      description: 'Add user login and signup functionality with JWT tokens',
      priority: 'Critical',
      dueDate: '2025-11-03',
      assignee: 'Bob Smith',
      status: 'inProgress',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      title: 'Write API Documentation',
      description: 'Document all API endpoints with examples and response formats',
      priority: 'Medium',
      dueDate: '2025-11-10',
      assignee: 'Carol Davis',
      status: 'inProgress',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      title: 'Setup CI/CD Pipeline',
      description: 'Configure automated testing and deployment workflow',
      priority: 'Low',
      dueDate: '2025-11-15',
      assignee: 'Alice Johnson',
      status: 'done',
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      title: 'Database Optimization',
      description: 'Optimize slow queries and add proper indexes',
      priority: 'High',
      dueDate: '2025-10-30',
      assignee: 'Bob Smith',
      status: 'todo',
      createdAt: new Date().toISOString()
    }
  ];
  
  state.tasks = demoTasks;
}

// ==================== DRAG AND DROP (HTML5 API) ====================
function initializeDragAndDrop() {
  // Setup will happen after render
}

function setupDragHandlers() {
  // Setup drag listeners on all task cards
  const tasks = document.querySelectorAll('.task-card');
  tasks.forEach(task => {
    task.setAttribute('draggable', 'true');
    task.addEventListener('dragstart', handleDragStart);
    task.addEventListener('dragend', handleDragEnd);
    
    // Still allow clicking to edit
    task.addEventListener('click', (e) => {
      if (!e.target.closest('.task-action-btn')) {
        const taskId = task.dataset.taskId;
        if (taskId) {
          openEditTaskModal(taskId);
        }
      }
    });
  });

  // Setup drop zones on all columns
  const columns = document.querySelectorAll('.column[data-column-id]');
  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
}

function handleDragStart(e) {
  // Don't allow drag if clicking action buttons
  if (e.target.closest('.task-action-btn')) {
    e.preventDefault();
    return;
  }
  
  e.dataTransfer.effectAllowed = 'move';
  const taskId = this.dataset.taskId;
  const column = this.closest('[data-column-id]');
  const columnId = column ? column.dataset.columnId : '';
  
  e.dataTransfer.setData('taskId', taskId);
  e.dataTransfer.setData('sourceColumnId', columnId);
  
  // Store in state for reference
  state.draggedTaskId = taskId;
  state.sourceColumnId = columnId;
  
  // Add dragging class for visual feedback
  this.classList.add('dragging');
  
  // Set drag image
  const dragImage = this.cloneNode(true);
  dragImage.style.opacity = '1';
  dragImage.style.position = 'absolute';
  dragImage.style.top = '-9999px';
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  setTimeout(() => dragImage.remove(), 0);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // Add visual feedback to column
  const column = e.currentTarget;
  if (!column.classList.contains('drag-over')) {
    column.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  // Only remove highlight if leaving the column itself, not child elements
  const column = e.currentTarget;
  const rect = column.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  
  if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
    column.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const taskId = e.dataTransfer.getData('taskId');
  const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
  const targetColumn = e.currentTarget;
  const targetColumnId = targetColumn.dataset.columnId;
  
  // Remove highlight
  targetColumn.classList.remove('drag-over');
  
  // Move task if different column
  if (taskId && targetColumnId && sourceColumnId !== targetColumnId) {
    moveTask(taskId, sourceColumnId, targetColumnId);
  }
}

function handleDragEnd(e) {
  // Remove dragging class
  this.classList.remove('dragging');
  
  // Remove all drag-over highlights
  const columns = document.querySelectorAll('.column');
  columns.forEach(col => col.classList.remove('drag-over'));
  
  // Clear state
  state.draggedTaskId = null;
  state.sourceColumnId = null;
}

function moveTask(taskId, sourceColumnId, targetColumnId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    const oldStatus = task.status;
    task.status = targetColumnId;
    
    const oldTitle = getColumnTitle(oldStatus);
    const newTitle = getColumnTitle(targetColumnId);
    
    logActivity(`Moved "${task.title}" from ${oldTitle} to ${newTitle}`);
    
    // Re-render and update
    renderBoard();
    updateStats();
    showToast(`Task moved to ${newTitle}`, 'success');
  }
}

function updateDragAndDrop() {
  // Re-setup drag handlers after render
  setTimeout(() => {
    setupDragHandlers();
  }, 0);
}





function getColumnTitle(columnId) {
  if (state.columns[columnId]) {
    return state.columns[columnId].title;
  }
  return columnId;
}

// ==================== RENDERING ====================
function renderBoard() {
  const boardContainer = document.getElementById('board-container');
  const addListColumn = boardContainer.querySelector('.add-list-column');
  
  // Remove all columns except the add list button
  const existingColumns = boardContainer.querySelectorAll('.column:not(.add-list-column)');
  existingColumns.forEach(col => col.remove());
  
  // Render all columns
  const columnIds = Object.keys(state.columns);
  columnIds.forEach(columnId => {
    const column = state.columns[columnId];
    renderColumn(column, addListColumn);
  });
  
  // Re-initialize drag and drop
  updateDragAndDrop();
}

function renderColumn(column, beforeElement) {
  const boardContainer = document.getElementById('board-container');
  const tasks = getFilteredTasks(column.id);
  
  // Determine icon
  let icon = '📋';
  if (column.id === 'todo') icon = '📝';
  else if (column.id === 'inProgress') icon = '⚡';
  else if (column.id === 'done') icon = '✅';
  
  const columnEl = document.createElement('div');
  columnEl.className = 'column';
  columnEl.setAttribute('data-column', column.id);
  columnEl.setAttribute('data-column-id', column.id);
  
  columnEl.innerHTML = `
    <div class="column-header" style="background: ${column.color};">
      ${!column.isDefault ? `<button class="btn-delete-list" onclick="openDeleteListModal('${column.id}')" title="Delete List">×</button>` : ''}
      <div class="column-title">
        <span class="column-icon">${icon}</span>
        <h2>${escapeHtml(column.title)}</h2>
        <span class="task-count" id="count-${column.id}">${tasks.length}</span>
      </div>
      <button class="btn-add-task" onclick="openTaskModal('${column.id}')" title="Add Task">+</button>
    </div>
    <div class="tasks-container" id="tasks-${column.id}">
      ${tasks.length === 0 ? '<div class="empty-column">No tasks</div>' : 
        tasks.map(task => `
          <div class="task-card" data-task-id="${task.id}">
            <div class="task-header">
              <div class="task-priority priority-${task.priority.toLowerCase()}"></div>
              <div class="task-actions" onclick="event.stopPropagation()">
                <button class="task-action-btn" onclick="openEditTaskModal('${task.id}')" title="Edit">✏️</button>
                <button class="task-action-btn" onclick="openDeleteModal('${task.id}')" title="Delete">🗑️</button>
              </div>
            </div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
              <div class="task-meta-row">
                <div class="task-assignee">👤 ${escapeHtml(task.assignee)}</div>
              </div>
              ${task.dueDate ? `
                <div class="task-meta-row">
                  <div class="task-duedate ${getDueDateClass(task.dueDate)}">
                    📅 ${formatDueDate(task.dueDate)}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
  
  boardContainer.insertBefore(columnEl, beforeElement);
}

function getFilteredTasks(columnId) {
  let tasks = state.tasks.filter(t => t.status === columnId);
  
  // Apply search filter
  if (state.filters.search) {
    const search = state.filters.search.toLowerCase();
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(search) ||
      (t.description && t.description.toLowerCase().includes(search))
    );
  }
  
  // Apply priority filter
  if (state.filters.priority !== 'all') {
    tasks = tasks.filter(t => t.priority === state.filters.priority);
  }
  
  // Apply date filter
  if (state.filters.date !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      switch (state.filters.date) {
        case 'overdue':
          return dueDate < today;
        case 'today':
          return dueDate.getTime() === today.getTime();
        case 'week':
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return dueDate >= today && dueDate <= weekFromNow;
        default:
          return true;
      }
    });
  }
  
  // Apply assignee filter
  if (state.filters.assignee !== 'all') {
    tasks = tasks.filter(t => t.assignee === state.filters.assignee);
  }
  
  return tasks;
}

function getDueDateClass(dueDate) {
  if (!dueDate) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return '';
}

function formatDueDate(dueDate) {
  if (!dueDate) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  } else if (diffDays === 0) {
    return 'Due Today';
  } else if (diffDays === 1) {
    return 'Due Tomorrow';
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// ==================== TASK MODAL ====================
function openTaskModal(columnId) {
  state.editingTask = null;
  state.currentTaskId = null;
  
  document.getElementById('modal-title').textContent = 'Create Task';
  document.getElementById('save-task-btn').textContent = 'Create Task';
  document.getElementById('task-form').reset();
  
  // Set default values
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('task-duedate').value = today;
  document.getElementById('task-priority').value = 'Medium';
  document.getElementById('task-assignee').value = state.currentUser.name;
  
  // Reset priority selector
  document.querySelectorAll('.priority-option').forEach(opt => {
    opt.classList.remove('priority-selected');
    if (opt.dataset.priority === 'Medium') {
      opt.classList.add('priority-selected');
    }
  });
  
  // Reset character counts
  document.getElementById('title-count').textContent = '0';
  document.getElementById('description-count').textContent = '0';
  
  // Update priority accent
  updatePriorityAccent('Medium');
  
  // Store the column for creation
  document.getElementById('task-form').dataset.column = columnId;
  
  // Update preview
  updateTaskPreview();
  
  document.getElementById('task-modal').style.display = 'flex';
}

function openEditTaskModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  state.editingTask = task;
  state.currentTaskId = taskId;
  
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('save-task-btn').textContent = 'Save Changes';
  
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-duedate').value = task.dueDate || '';
  document.getElementById('task-assignee').value = task.assignee;
  
  // Update priority selector
  document.querySelectorAll('.priority-option').forEach(opt => {
    opt.classList.remove('priority-selected');
    if (opt.dataset.priority === task.priority) {
      opt.classList.add('priority-selected');
    }
  });
  
  // Update character counts
  updateCharCount('title');
  updateCharCount('description');
  
  // Update priority accent
  updatePriorityAccent(task.priority);
  
  // Update preview
  updateTaskPreview();
  
  document.getElementById('task-modal').style.display = 'flex';
}

function closeTaskModal() {
  document.getElementById('task-modal').style.display = 'none';
  state.editingTask = null;
  state.currentTaskId = null;
}

function saveTask(event) {
  event.preventDefault();
  
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-description').value;
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-duedate').value;
  const assignee = document.getElementById('task-assignee').value;
  
  if (state.editingTask) {
    // Update existing task
    state.editingTask.title = title;
    state.editingTask.description = description;
    state.editingTask.priority = priority;
    state.editingTask.dueDate = dueDate;
    state.editingTask.assignee = assignee;
    
    logActivity(`Updated task "${title}"`);
    showToast('Task updated successfully', 'success');
  } else {
    // Create new task
    const column = document.getElementById('task-form').dataset.column || 'todo';
    const newTask = {
      id: generateId(),
      title,
      description,
      priority,
      dueDate,
      assignee,
      status: column,
      createdAt: new Date().toISOString()
    };
    
    state.tasks.push(newTask);
    logActivity(`Created task "${title}"`);
    showToast('Task created successfully', 'success');
  }
  
  renderBoard();
  updateStats();
  closeTaskModal();
}

// ==================== DELETE MODAL ====================
function openDeleteModal(taskId) {
  state.deleteTaskId = taskId;
  document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  state.deleteTaskId = null;
}

function confirmDelete() {
  if (!state.deleteTaskId) return;
  
  const task = state.tasks.find(t => t.id === state.deleteTaskId);
  if (task) {
    state.tasks = state.tasks.filter(t => t.id !== state.deleteTaskId);
    logActivity(`Deleted task "${task.title}"`);
    showToast('Task deleted successfully', 'info');
  }
  
  renderBoard();
  updateStats();
  closeDeleteModal();
}

// ==================== FILTERS ====================
function toggleFilters() {
  const section = document.getElementById('filters-section');
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function searchTasks() {
  state.filters.search = document.getElementById('search-input').value;
  renderBoard();
}

function applyFilters() {
  state.filters.priority = document.getElementById('priority-filter').value;
  state.filters.date = document.getElementById('date-filter').value;
  state.filters.assignee = document.getElementById('assignee-filter').value;
  renderBoard();
}

function clearFilters() {
  state.filters = {
    search: '',
    priority: 'all',
    date: 'all',
    assignee: 'all'
  };
  
  document.getElementById('search-input').value = '';
  document.getElementById('priority-filter').value = 'all';
  document.getElementById('date-filter').value = 'all';
  document.getElementById('assignee-filter').value = 'all';
  
  renderBoard();
  showToast('Filters cleared', 'info');
}

function populateAssigneeFilters() {
  const select = document.getElementById('assignee-filter');
  const assignees = [...new Set(state.users.map(u => u.name))];
  
  select.innerHTML = '<option value="all">All Assignees</option>' +
    assignees.map(a => `<option value="${a}">${a}</option>`).join('');
}

// ==================== THEME ====================
function changeTheme() {
  const theme = document.getElementById('theme-selector').value;
  state.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  showToast(`Theme changed to ${theme}`, 'info');
}

// ==================== STATISTICS ====================
function toggleStats() {
  const panel = document.getElementById('stats-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') {
    updateStats();
  }
}

function updateStats() {
  const total = state.tasks.length;
  const todo = state.tasks.filter(t => t.status === 'todo').length;
  const inProgress = state.tasks.filter(t => t.status === 'inProgress').length;
  const done = state.tasks.filter(t => t.status === 'done').length;
  
  // Update counts for custom columns too
  Object.keys(state.columns).forEach(columnId => {
    const countEl = document.getElementById(`count-${columnId}`);
    if (countEl) {
      const count = state.tasks.filter(t => t.status === columnId).length;
      countEl.textContent = count;
    }
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = state.tasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && t.status !== 'done';
  }).length;
  
  if (document.getElementById('stat-total')) {
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-todo').textContent = todo;
    document.getElementById('stat-progress').textContent = inProgress;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-overdue').textContent = overdue;
  }
  
  // Update progress bar
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  if (progressFill) progressFill.style.width = progress + '%';
  if (progressText) progressText.textContent = progress + '% Complete';
}

// ==================== CALENDAR ====================
function toggleCalendar() {
  const panel = document.getElementById('calendar-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') {
    renderCalendar();
  }
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  
  document.getElementById('calendar-month').textContent = 
    state.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const monthLength = lastDay.getDate();
  
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  
  // Day headers
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });
  
  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day other-month';
    grid.appendChild(empty);
  }
  
  // Days of the month
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let day = 1; day <= monthLength; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;
    
    if (date.getTime() === today.getTime()) {
      dayEl.classList.add('today');
    }
    
    // Check if there are tasks for this date
    const dateStr = date.toISOString().split('T')[0];
    const hasTasks = state.tasks.some(t => t.dueDate === dateStr);
    if (hasTasks) {
      dayEl.classList.add('has-tasks');
    }
    
    dayEl.onclick = () => selectCalendarDate(dateStr);
    grid.appendChild(dayEl);
  }
}

function changeCalendarMonth(delta) {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
  renderCalendar();
}

function selectCalendarDate(dateStr) {
  state.selectedCalendarDate = dateStr;
  
  // Update selected styling
  document.querySelectorAll('.calendar-day').forEach(el => {
    el.classList.remove('selected');
  });
  event.target.classList.add('selected');
  
  // Show tasks for this date
  const tasks = state.tasks.filter(t => t.dueDate === dateStr);
  const container = document.getElementById('selected-date-tasks');
  
  if (tasks.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">No tasks for this date</p>';
  } else {
    container.innerHTML = tasks.map(task => `
      <div class="calendar-task-item">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <div class="task-priority priority-${task.priority.toLowerCase()}" style="width: 3px; height: 16px;"></div>
          <strong>${escapeHtml(task.title)}</strong>
        </div>
        <div style="color: var(--color-text-secondary); font-size: var(--font-size-xs);">
          ${getColumnTitle(task.status)} • ${task.assignee}
        </div>
      </div>
    `).join('');
  }
}

// ==================== USER MENU ====================
function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  if (menu.style.display === 'block') {
    renderUserList();
    renderActivityLog();
  }
}

function renderUserList() {
  document.getElementById('current-user-name').textContent = state.currentUser.name;
  document.getElementById('current-user-email').textContent = state.currentUser.email;
  
  const userList = document.getElementById('user-list');
  userList.innerHTML = state.users.map(user => `
    <div class="user-item ${user.name === state.currentUser.name ? 'active' : ''}" onclick="switchUser('${user.name}')">
      <div style="font-weight: var(--font-weight-medium);">${escapeHtml(user.name)}</div>
    </div>
  `).join('');
}

function switchUser(userName) {
  const user = state.users.find(u => u.name === userName);
  if (user) {
    state.currentUser = user;
    showToast(`Switched to ${user.name}`, 'info');
    renderUserList();
    logActivity(`${user.name} started viewing the board`);
  }
}

function renderActivityLog() {
  const list = document.getElementById('activity-list');
  const recentActivities = state.activityLog.slice(-10).reverse();
  
  if (recentActivities.length === 0) {
    list.innerHTML = '<div style="color: var(--color-text-secondary); font-size: var(--font-size-xs);">No recent activity</div>';
  } else {
    list.innerHTML = recentActivities.map(activity => `
      <div class="activity-item">
        <div>${escapeHtml(activity.message)}</div>
        <div style="color: var(--color-text-secondary); margin-top: 2px;">${formatActivityTime(activity.timestamp)}</div>
      </div>
    `).join('');
  }
}

function logActivity(message) {
  state.activityLog.push({
    message: `${state.currentUser.name}: ${message}`,
    timestamp: new Date().toISOString(),
    user: state.currentUser.name
  });
  
  // Keep only last 50 activities
  if (state.activityLog.length > 50) {
    state.activityLog = state.activityLog.slice(-50);
  }
}

function formatActivityTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

// ==================== EXPORT/IMPORT ====================
function exportBoard() {
  const data = {
    tasks: state.tasks,
    theme: state.currentTheme,
    exportDate: new Date().toISOString()
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskflow-board-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Board exported successfully', 'success');
}

function importBoard(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.tasks && Array.isArray(data.tasks)) {
        state.tasks = data.tasks;
        if (data.theme) {
          state.currentTheme = data.theme;
          document.getElementById('theme-selector').value = data.theme;
          document.documentElement.setAttribute('data-theme', data.theme);
        }
        
        renderBoard();
        updateStats();
        showToast('Board imported successfully', 'success');
        logActivity('Imported board from file');
      } else {
        showToast('Invalid board file format', 'error');
      }
    } catch (error) {
      showToast('Error reading board file', 'error');
      console.error('Import error:', error);
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

// ==================== KEYBOARD SHORTCUTS ====================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: New task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openTaskModal('todo');
    }
    
    // Ctrl/Cmd + F: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
      closeTaskModal();
      closeDeleteModal();
      closeListModal();
      closeDeleteListModal();
      
      const statsPanel = document.getElementById('stats-panel');
      if (statsPanel.style.display === 'block') {
        toggleStats();
      }
      
      const calendarPanel = document.getElementById('calendar-panel');
      if (calendarPanel.style.display === 'block') {
        toggleCalendar();
      }
      
      const userMenu = document.getElementById('user-menu');
      if (userMenu.style.display === 'block') {
        toggleUserMenu();
      }
    }
  });
}

// ==================== MODAL ENHANCEMENTS ====================
function selectPriority(priority) {
  document.getElementById('task-priority').value = priority;
  
  document.querySelectorAll('.priority-option').forEach(opt => {
    opt.classList.remove('priority-selected');
    if (opt.dataset.priority === priority) {
      opt.classList.add('priority-selected');
    }
  });
  
  updatePriorityAccent(priority);
  updateTaskPreview();
}

function updatePriorityAccent(priority) {
  const accent = document.getElementById('modal-priority-accent');
  if (!accent) return;
  
  const colors = {
    'Low': '#3498db',
    'Medium': '#f39c12',
    'High': '#e67e22',
    'Critical': '#e74c3c'
  };
  
  accent.style.background = colors[priority] || colors['Medium'];
}

function updateCharCount(field) {
  const input = document.getElementById(`task-${field}`);
  const counter = document.getElementById(`${field}-count`);
  if (input && counter) {
    counter.textContent = input.value.length;
  }
}

function updateTaskPreview() {
  const title = document.getElementById('task-title').value || 'Task Title';
  const description = document.getElementById('task-description').value || 'Task description will appear here';
  const priority = document.getElementById('task-priority').value || 'Medium';
  const dueDate = document.getElementById('task-duedate').value;
  const assignee = document.getElementById('task-assignee').value || 'Alice Johnson';
  
  document.getElementById('preview-title').textContent = title;
  document.getElementById('preview-description').textContent = description;
  document.getElementById('preview-assignee').textContent = '👤 ' + assignee;
  
  const priorityEl = document.getElementById('preview-priority');
  priorityEl.className = 'task-priority priority-' + priority.toLowerCase();
  
  const dueDateEl = document.getElementById('preview-duedate');
  if (dueDate) {
    dueDateEl.textContent = '📅 ' + formatDueDate(dueDate);
    dueDateEl.style.display = 'flex';
  } else {
    dueDateEl.style.display = 'none';
  }
}

// ==================== UTILITY FUNCTIONS ====================
function generateId() {
  return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <span style="font-size: var(--font-size-xl);">${icons[type] || icons.info}</span>
    <span style="flex: 1;">${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== LIST MANAGEMENT ====================
function openListModal() {
  document.getElementById('list-form').reset();
  document.getElementById('list-color').value = '#1abc9c';
  
  // Reset color selector
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.remove('color-selected');
    if (opt.dataset.color === '#1abc9c') {
      opt.classList.add('color-selected');
    }
  });
  
  // Add click handlers to color options
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.onclick = () => selectListColor(opt.dataset.color);
  });
  
  document.getElementById('list-modal').style.display = 'flex';
}

function closeListModal() {
  document.getElementById('list-modal').style.display = 'none';
}

function selectListColor(color) {
  document.getElementById('list-color').value = color;
  
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.remove('color-selected');
    if (opt.dataset.color === color) {
      opt.classList.add('color-selected');
    }
  });
}

function saveList(event) {
  event.preventDefault();
  
  const name = document.getElementById('list-name').value.trim();
  const color = document.getElementById('list-color').value;
  
  if (!name) {
    showToast('Please enter a list name', 'error');
    return;
  }
  
  // Check for duplicate name
  const exists = Object.values(state.columns).some(col => 
    col.title.toLowerCase() === name.toLowerCase()
  );
  
  if (exists) {
    showToast('A list with this name already exists', 'error');
    return;
  }
  
  // Generate unique ID
  const id = 'custom-' + Date.now();
  
  // Add new column
  state.columns[id] = {
    id: id,
    title: name,
    color: color,
    isDefault: false
  };
  
  logActivity(`Created new list "${name}"`);
  showToast(`List "${name}" created successfully`, 'success');
  
  renderBoard();
  closeListModal();
}

function openDeleteListModal(listId) {
  state.deleteListId = listId;
  document.getElementById('delete-list-modal').style.display = 'flex';
}

function closeDeleteListModal() {
  document.getElementById('delete-list-modal').style.display = 'none';
  state.deleteListId = null;
}

function confirmDeleteList() {
  if (!state.deleteListId) return;
  
  const column = state.columns[state.deleteListId];
  if (!column) return;
  
  if (column.isDefault) {
    showToast('Cannot delete default lists', 'error');
    closeDeleteListModal();
    return;
  }
  
  // Delete all tasks in this list
  const tasksInList = state.tasks.filter(t => t.status === state.deleteListId);
  state.tasks = state.tasks.filter(t => t.status !== state.deleteListId);
  
  // Delete the column
  delete state.columns[state.deleteListId];
  
  logActivity(`Deleted list "${column.title}" with ${tasksInList.length} task(s)`);
  showToast(`List "${column.title}" deleted`, 'info');
  
  renderBoard();
  updateStats();
  closeDeleteListModal();
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  const userMenu = document.getElementById('user-menu');
  const userBtn = document.getElementById('user-btn');
  
  if (userMenu && userMenu.style.display === 'block' && !userMenu.contains(e.target) && !userBtn.contains(e.target)) {
    userMenu.style.display = 'none';
  }
});