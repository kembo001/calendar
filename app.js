// Daily Planner Application
// Handles calendar display, routines, assignments, and projects

// ============================================
// DATA STORAGE & STATE
// ============================================

const STORAGE_KEYS = {
    TASKS: 'planner_tasks',
    ROUTINES: 'planner_routines',
    SETTINGS: 'planner_settings',
    STUDY_BLOCKS: 'planner_study_blocks',
    COMPLETED: 'planner_completed'
};

// Default routines configuration
const DEFAULT_ROUTINES = {
    wakeTime: '07:00',
    workout: {
        enabled: true,
        days: ['monday', 'wednesday', 'friday'],
        time: '08:00'
    },
    tennis: {
        enabled: true,
        day: 'thursday',
        time: '18:00'
    },
    notifications: {
        enabled: false,
        reminderMinutes: 1440 // 1 day
    }
};

// Application state
let currentDate = new Date();
let tasks = [];
let routines = { ...DEFAULT_ROUTINES };
let studyBlocks = [];
let completedTasks = {}; // { 'taskId_dateStr': true }
let pendingAssignments = [];
let currentView = 'day'; // 'day' or 'week'

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initializeEventListeners();
    renderAll();
    checkReminders();
    // Check reminders every minute
    setInterval(checkReminders, 60000);
});

function loadFromStorage() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
        const savedRoutines = localStorage.getItem(STORAGE_KEYS.ROUTINES);
        const savedStudyBlocks = localStorage.getItem(STORAGE_KEYS.STUDY_BLOCKS);
        const savedCompleted = localStorage.getItem(STORAGE_KEYS.COMPLETED);

        if (savedTasks) tasks = JSON.parse(savedTasks);
        if (savedRoutines) routines = { ...DEFAULT_ROUTINES, ...JSON.parse(savedRoutines) };
        if (savedStudyBlocks) studyBlocks = JSON.parse(savedStudyBlocks);
        if (savedCompleted) completedTasks = JSON.parse(savedCompleted);
    } catch (e) {
        console.error('Error loading from storage:', e);
        tasks = [];
        routines = { ...DEFAULT_ROUTINES };
        studyBlocks = [];
        completedTasks = {};
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
        localStorage.setItem(STORAGE_KEYS.STUDY_BLOCKS, JSON.stringify(studyBlocks));
        localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(completedTasks));
    } catch (e) {
        console.error('Error saving to storage:', e);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    // Navigation
    document.getElementById('prev-day').addEventListener('click', () => navigateDay(-1));
    document.getElementById('next-day').addEventListener('click', () => navigateDay(1));
    document.getElementById('today-btn').addEventListener('click', goToToday);

    // View toggle
    document.getElementById('day-view-btn').addEventListener('click', () => switchView('day'));
    document.getElementById('week-view-btn').addEventListener('click', () => switchView('week'));

    // Briefing
    document.getElementById('briefing-btn').addEventListener('click', showBriefing);
    document.getElementById('close-briefing').addEventListener('click', () => closeBriefingModal());

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Routines
    document.getElementById('save-wake-time').addEventListener('click', saveWakeTime);
    document.getElementById('save-workout').addEventListener('click', saveWorkout);
    document.getElementById('save-tennis').addEventListener('click', saveTennis);
    document.getElementById('save-notifications').addEventListener('click', saveNotifications);
    document.getElementById('test-notification').addEventListener('click', testNotification);

    // Study blocks
    document.getElementById('add-study-block').addEventListener('click', addStudyBlock);

    // Syllabus
    document.getElementById('parse-syllabus').addEventListener('click', parseSyllabus);
    document.getElementById('confirm-assignments').addEventListener('click', confirmAssignments);
    document.getElementById('load-mat302').addEventListener('click', () => loadCourseSchedule('MAT302'));
    document.getElementById('load-dst234').addEventListener('click', () => loadCourseSchedule('DST234'));
    document.getElementById('load-mat146').addEventListener('click', () => loadCourseSchedule('MAT146'));

    // Projects
    document.getElementById('add-project').addEventListener('click', addProject);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderUpcoming(btn.dataset.filter);
        });
    });

    // Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) document.getElementById(modalId).classList.add('hidden');
        });
    });
    document.getElementById('quick-add-save').addEventListener('click', quickAddTask);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') navigateDay(-1);
        if (e.key === 'ArrowRight') navigateDay(1);
        if (e.key === 'Escape') closeAllModals();
    });
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function switchView(view) {
    currentView = view;
    document.getElementById('day-view-btn').classList.toggle('active', view === 'day');
    document.getElementById('week-view-btn').classList.toggle('active', view === 'week');
    document.getElementById('day-view').classList.toggle('hidden', view !== 'day');
    document.getElementById('week-view').classList.toggle('hidden', view !== 'week');

    if (view === 'week') {
        renderWeekView();
    } else {
        renderCurrentDay();
    }
}

// ============================================
// DATE NAVIGATION
// ============================================

function navigateDay(offset) {
    if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (offset * 7));
        renderWeekView();
    } else {
        currentDate.setDate(currentDate.getDate() + offset);
        renderCurrentDay();
    }
    updateHeader();
}

function goToToday() {
    currentDate = new Date();
    if (currentView === 'week') {
        renderWeekView();
    } else {
        renderCurrentDay();
    }
    updateHeader();
}

function updateHeader() {
    document.getElementById('day-name').textContent = getDayName(currentDate);
    document.getElementById('full-date').textContent = formatDate(currentDate);
}

function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function getDateString(date) {
    return date.toISOString().split('T')[0];
}

function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// ============================================
// RENDERING
// ============================================

function renderAll() {
    updateHeader();
    renderCurrentDay();
    renderUpcoming();
    renderDashboard();
    renderStudyBlocks();
    updateRoutineUI();
}

function renderCurrentDay() {
    const dayItems = getDayItems(currentDate);
    document.getElementById('task-count').textContent = `${dayItems.length} items`;
    renderWakeUp();
    renderTimeline(dayItems);
    renderDashboard();
}

function renderWakeUp() {
    const wakeDisplay = document.getElementById('wake-up-display');
    const wakeTimeText = document.getElementById('wake-time-text');

    if (routines.wakeTime) {
        wakeDisplay.classList.remove('hidden');
        const time = formatTime(routines.wakeTime);
        wakeTimeText.textContent = `Wake up at ${time}`;
    } else {
        wakeDisplay.classList.add('hidden');
    }
}

function renderTimeline(items) {
    const timeline = document.getElementById('timeline');
    const emptyState = document.getElementById('empty-state');

    if (items.length === 0) {
        timeline.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    const dateStr = getDateString(currentDate);

    // Sort: incomplete first by time, then completed at bottom
    items.sort((a, b) => {
        const aCompleted = isTaskCompleted(a, dateStr);
        const bCompleted = isTaskCompleted(b, dateStr);
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
        const timeA = a.time || '23:59';
        const timeB = b.time || '23:59';
        return timeA.localeCompare(timeB);
    });

    timeline.innerHTML = items.map((item, index) => {
        const itemId = item.id || `routine_${item.name}_${index}`;
        const completed = isTaskCompleted(item, dateStr);
        const canComplete = item.type !== 'class-session';

        return `
        <div class="timeline-item ${item.type} ${item.priority === 'high' ? 'priority-high' : ''} ${completed ? 'completed' : ''}" data-id="${itemId}">
            ${canComplete ? `
                <div class="task-checkbox ${completed ? 'checked' : ''}" onclick="toggleTaskComplete('${itemId}', '${dateStr}')"></div>
            ` : ''}
            <div class="timeline-time">${item.time ? formatTime(item.time) : 'All day'}</div>
            <div class="timeline-content">
                <h4>${item.name}</h4>
                <p>${item.description || item.course || ''}</p>
            </div>
            <span class="timeline-badge ${item.type}">${item.type.replace('-', ' ')}</span>
            ${item.id && item.type !== 'routine' && item.type !== 'class-session' ? `<button class="delete-btn" onclick="deleteTask('${item.id}')" title="Delete">&#10005;</button>` : ''}
        </div>
    `}).join('');
}

function isTaskCompleted(item, dateStr) {
    const key = (item.id || `routine_${item.name}`) + '_' + dateStr;
    return completedTasks[key] === true;
}

function toggleTaskComplete(itemId, dateStr) {
    const key = itemId + '_' + dateStr;
    completedTasks[key] = !completedTasks[key];
    saveToStorage();
    renderCurrentDay();
    if (currentView === 'week') renderWeekView();
}

window.toggleTaskComplete = toggleTaskComplete;

function getDayItems(date) {
    const dateStr = getDateString(date);
    const dayName = getDayName(date).toLowerCase();
    const items = [];

    // Add routines for this day
    if (routines.workout.enabled && routines.workout.days.includes(dayName)) {
        items.push({
            id: 'routine_workout',
            name: 'Workout',
            type: 'routine',
            time: routines.workout.time,
            description: 'Daily workout session'
        });
    }

    if (routines.tennis.enabled && dayName === 'thursday') {
        items.push({
            id: 'routine_tennis',
            name: 'Tennis',
            type: 'routine',
            time: routines.tennis.time,
            description: 'Weekly tennis session'
        });
    }

    // Add study blocks for this day
    const dayStudyBlocks = getStudyBlocksForDay(date);
    items.push(...dayStudyBlocks);

    // Add class sessions for this day
    const classSchedule = getClassScheduleForDay(date);
    items.push(...classSchedule);

    // Add tasks due on this date
    const dayTasks = tasks.filter(task => task.dueDate === dateStr);
    items.push(...dayTasks);

    return items;
}

function getStudyBlocksForDay(date) {
    const dayName = getDayName(date).toLowerCase();
    const blocks = [];

    studyBlocks.forEach((block, index) => {
        if (block.days.includes(dayName)) {
            blocks.push({
                id: `study_${index}`,
                name: `${block.course} Study`,
                type: 'study-block',
                time: block.startTime,
                description: `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`
            });
        }
    });

    return blocks;
}

function getClassScheduleForDay(date) {
    const dayName = getDayName(date).toLowerCase();
    const classes = [];

    const semesterStart = new Date(2026, 0, 21);
    const semesterEnd = new Date(2026, 4, 6);
    const springBreakStart = new Date(2026, 2, 16);
    const springBreakEnd = new Date(2026, 2, 20);

    if (date < semesterStart || date > semesterEnd) return classes;
    if (date >= springBreakStart && date <= springBreakEnd) return classes;

    if (['monday', 'wednesday', 'friday'].includes(dayName)) {
        classes.push({
            name: 'MAT 302 - Discrete Math',
            type: 'class-session',
            time: '10:50',
            description: 'Hagfors 152'
        });
        classes.push({
            name: 'MAT 146 - Calculus II',
            type: 'class-session',
            time: '13:10',
            description: 'Hagfors 151'
        });
    }

    if (['tuesday', 'thursday'].includes(dayName)) {
        classes.push({
            name: 'DST 234 - Intro to Data Science',
            type: 'class-session',
            time: '14:00',
            description: 'Hagfors 152'
        });
    }

    if (dayName === 'thursday') {
        classes.push({
            name: 'MAT 146 Lab',
            type: 'class-session',
            time: '12:20',
            description: 'Hagfors 151'
        });
    }

    return classes;
}

// ============================================
// WEEK VIEW
// ============================================

function renderWeekView() {
    const weekGrid = document.getElementById('week-grid');
    const weekStart = getWeekStart(currentDate);

    // Update week title
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    document.getElementById('week-title').textContent =
        `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = getDateString(date);
        const isToday = date.getTime() === today.getTime();
        const dayItems = getDayItems(date);

        // Calculate workload
        const taskCount = dayItems.filter(item =>
            item.type === 'assignment' || item.type === 'project' || item.type === 'quiz'
        ).length;
        let workloadClass = '';
        let workloadText = `${taskCount} tasks`;
        if (taskCount >= 5) {
            workloadClass = 'heavy';
            workloadText = `${taskCount} tasks - Heavy!`;
        } else if (taskCount <= 1) {
            workloadClass = 'light';
            workloadText = taskCount === 0 ? 'Light day' : '1 task';
        }

        html += `
            <div class="week-day ${isToday ? 'today' : ''}">
                <div class="week-day-header">
                    <div class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="day-num">${date.getDate()}</div>
                </div>
                <div class="week-day-items">
                    ${dayItems.slice(0, 6).map(item => {
                        const completed = isTaskCompleted(item, dateStr);
                        return `<div class="week-item ${item.type} ${completed ? 'completed' : ''}" title="${item.name}">${item.name}</div>`;
                    }).join('')}
                    ${dayItems.length > 6 ? `<div class="week-item" style="background:#f1f5f9;color:#64748b;">+${dayItems.length - 6} more</div>` : ''}
                </div>
                <div class="week-workload ${workloadClass}">${workloadText}</div>
            </div>
        `;
    }

    weekGrid.innerHTML = html;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getDateString(today);

    // Today's items
    const todayItems = getDayItems(today);
    const completableItems = todayItems.filter(item => item.type !== 'class-session');
    const completedCount = completableItems.filter(item => isTaskCompleted(item, todayStr)).length;
    const totalCompletable = completableItems.length;

    // Progress ring
    const percentage = totalCompletable > 0 ? Math.round((completedCount / totalCompletable) * 100) : 0;
    const circumference = 157; // 2 * PI * 25
    const offset = circumference - (percentage / 100) * circumference;

    document.getElementById('progress-circle').style.strokeDashoffset = offset;
    document.getElementById('progress-text').textContent = `${percentage}%`;
    document.getElementById('completion-stats').textContent = `${completedCount}/${totalCompletable} completed`;

    // Deadline counts
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let dueToday = 0, dueWeek = 0, overdue = 0;
    tasks.forEach(task => {
        const taskDate = parseDate(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        if (taskDate.getTime() === today.getTime()) dueToday++;
        if (taskDate >= today && taskDate <= weekEnd) dueWeek++;
        if (taskDate < today && !isTaskCompleted(task, task.dueDate)) overdue++;
    });

    document.getElementById('due-today').textContent = dueToday;
    document.getElementById('due-week').textContent = dueWeek;
    document.getElementById('overdue-count').textContent = overdue;

    // Course counts
    const courseCounts = {};
    tasks.forEach(task => {
        if (task.course) {
            const courseKey = task.course.split(' ')[0] + ' ' + task.course.split(' ')[1];
            if (!courseCounts[courseKey]) courseCounts[courseKey] = 0;
            const taskDate = parseDate(task.dueDate);
            if (taskDate >= today && taskDate <= weekEnd) {
                courseCounts[courseKey]++;
            }
        }
    });

    document.getElementById('course-counts').innerHTML = Object.entries(courseCounts)
        .map(([course, count]) => `<div class="course-count-item"><span>${course}</span><strong>${count}</strong></div>`)
        .join('') || '<span style="color:#94a3b8">No upcoming</span>';

    // Suggested focus
    const focusItem = getSuggestedFocus();
    document.getElementById('focus-item').innerHTML = focusItem
        ? `<strong>${focusItem.name}</strong><br><span style="opacity:0.8;font-size:12px">${focusItem.course || focusItem.type} - ${formatDateShort(focusItem.dueDate)}</span>`
        : 'All caught up!';
}

function getSuggestedFocus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the nearest incomplete high-priority or quiz item
    const upcoming = tasks
        .filter(task => {
            const taskDate = parseDate(task.dueDate);
            return taskDate >= today && !isTaskCompleted(task, task.dueDate);
        })
        .sort((a, b) => {
            // Prioritize quizzes and high priority
            const aScore = (a.type === 'quiz' ? 0 : 1) + (a.priority === 'high' ? 0 : 2);
            const bScore = (b.type === 'quiz' ? 0 : 1) + (b.priority === 'high' ? 0 : 2);
            if (aScore !== bScore) return aScore - bScore;
            return a.dueDate.localeCompare(b.dueDate);
        });

    return upcoming[0] || null;
}

// ============================================
// MORNING BRIEFING
// ============================================

function showBriefing() {
    const today = new Date();
    const todayStr = getDateString(today);
    const todayItems = getDayItems(today);

    document.getElementById('briefing-date').textContent = formatDate(today);

    // Today's schedule
    const scheduleHtml = todayItems.slice(0, 8).map(item => `
        <div class="briefing-item ${item.type}">
            <strong>${item.time ? formatTime(item.time) : 'All day'} - ${item.name}</strong>
            <span>${item.description || item.course || ''}</span>
        </div>
    `).join('') || '<p style="color:#94a3b8">No items scheduled</p>';
    document.getElementById('briefing-schedule').innerHTML = scheduleHtml;

    // Priority focus
    const focus = getSuggestedFocus();
    document.getElementById('briefing-focus').innerHTML = focus
        ? `<div class="briefing-item ${focus.type}"><strong>${focus.name}</strong><span>Due ${formatDateShort(focus.dueDate)} - ${focus.course || focus.type}</span></div>`
        : '<p style="color:#10b981">All caught up! Great job!</p>';

    // Upcoming this week
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekItems = tasks.filter(task => {
        const taskDate = parseDate(task.dueDate);
        return taskDate > today && taskDate <= weekEnd;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);

    document.getElementById('briefing-week').innerHTML = weekItems.map(item => `
        <div class="briefing-item ${item.type}">
            <strong>${item.name}</strong>
            <span>${formatDateShort(item.dueDate)} - ${item.course || item.type}</span>
        </div>
    `).join('') || '<p style="color:#94a3b8">Nothing else this week</p>';

    document.getElementById('briefing-modal').classList.remove('hidden');
}

function closeBriefingModal() {
    document.getElementById('briefing-modal').classList.add('hidden');
}

// ============================================
// NOTIFICATIONS
// ============================================

function checkReminders() {
    if (!routines.notifications?.enabled) return;
    if (!('Notification' in window)) return;

    const now = new Date();
    const reminderMs = (routines.notifications.reminderMinutes || 1440) * 60 * 1000;

    tasks.forEach(task => {
        const taskDate = parseDate(task.dueDate);
        if (task.time) {
            const [hours, minutes] = task.time.split(':').map(Number);
            taskDate.setHours(hours, minutes, 0, 0);
        } else {
            taskDate.setHours(23, 59, 0, 0);
        }

        const timeDiff = taskDate.getTime() - now.getTime();

        // Check if within reminder window (within 1 minute of reminder time)
        if (timeDiff > 0 && timeDiff <= reminderMs && timeDiff > reminderMs - 60000) {
            const notifKey = `notified_${task.id}_${task.dueDate}`;
            if (!localStorage.getItem(notifKey)) {
                showNotification(task);
                localStorage.setItem(notifKey, 'true');
            }
        }
    });
}

function showNotification(task) {
    if (Notification.permission === 'granted') {
        new Notification('Upcoming Deadline', {
            body: `${task.name} is due ${formatDateShort(task.dueDate)}`,
            icon: '📅'
        });
    }
}

function testNotification() {
    if (!('Notification' in window)) {
        showToast('Notifications not supported', 'error');
        return;
    }

    if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
            body: 'Notifications are working!'
        });
        showToast('Notification sent!', 'success');
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Notifications Enabled', {
                    body: 'You will now receive reminders!'
                });
                showToast('Notifications enabled!', 'success');
            }
        });
    } else {
        showToast('Notifications blocked. Enable in browser settings.', 'error');
    }
}

function saveNotifications() {
    routines.notifications = {
        enabled: document.getElementById('notif-enabled').checked,
        reminderMinutes: parseInt(document.getElementById('reminder-time').value)
    };
    saveToStorage();

    if (routines.notifications.enabled && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    showToast('Notification settings saved', 'success');
}

// ============================================
// STUDY BLOCKS
// ============================================

function addStudyBlock() {
    const course = document.getElementById('study-course').value;
    const days = [];
    if (document.getElementById('study-mon').checked) days.push('monday');
    if (document.getElementById('study-tue').checked) days.push('tuesday');
    if (document.getElementById('study-wed').checked) days.push('wednesday');
    if (document.getElementById('study-thu').checked) days.push('thursday');
    if (document.getElementById('study-fri').checked) days.push('friday');
    if (document.getElementById('study-sat').checked) days.push('saturday');
    if (document.getElementById('study-sun').checked) days.push('sunday');

    const startTime = document.getElementById('study-start').value;
    const endTime = document.getElementById('study-end').value;

    if (days.length === 0) {
        showToast('Please select at least one day', 'error');
        return;
    }

    if (!startTime || !endTime) {
        showToast('Please set start and end times', 'error');
        return;
    }

    studyBlocks.push({ course, days, startTime, endTime });
    saveToStorage();
    renderStudyBlocks();
    renderCurrentDay();
    if (currentView === 'week') renderWeekView();

    // Clear checkboxes
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
        document.getElementById(`study-${day}`).checked = false;
    });

    showToast('Study block added!', 'success');
}

function renderStudyBlocks() {
    const container = document.getElementById('study-blocks');

    if (studyBlocks.length === 0) {
        container.innerHTML = '<p class="help-text">No study blocks scheduled</p>';
        return;
    }

    container.innerHTML = studyBlocks.map((block, index) => `
        <div class="study-block-item">
            <div class="study-block-info">
                <strong>${block.course}</strong>
                <span>${block.days.map(d => d.substring(0, 3)).join(', ')} ${formatTime(block.startTime)}-${formatTime(block.endTime)}</span>
            </div>
            <button class="study-block-delete" onclick="deleteStudyBlock(${index})">&#10005;</button>
        </div>
    `).join('');
}

function deleteStudyBlock(index) {
    studyBlocks.splice(index, 1);
    saveToStorage();
    renderStudyBlocks();
    renderCurrentDay();
    if (currentView === 'week') renderWeekView();
    showToast('Study block removed');
}

window.deleteStudyBlock = deleteStudyBlock;

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// ============================================
// ROUTINES MANAGEMENT
// ============================================

function updateRoutineUI() {
    document.getElementById('wake-time').value = routines.wakeTime || '07:00';
    document.getElementById('workout-mon').checked = routines.workout.days.includes('monday');
    document.getElementById('workout-wed').checked = routines.workout.days.includes('wednesday');
    document.getElementById('workout-fri').checked = routines.workout.days.includes('friday');
    document.getElementById('workout-time').value = routines.workout.time || '08:00';
    document.getElementById('tennis-time').value = routines.tennis.time || '18:00';
    document.getElementById('notif-enabled').checked = routines.notifications?.enabled || false;
    document.getElementById('reminder-time').value = routines.notifications?.reminderMinutes || 1440;
}

function saveWakeTime() {
    routines.wakeTime = document.getElementById('wake-time').value;
    saveToStorage();
    renderCurrentDay();
    showStatus('routine-status', 'Wake time saved!');
    showToast('Wake time updated');
}

function saveWorkout() {
    const days = [];
    if (document.getElementById('workout-mon').checked) days.push('monday');
    if (document.getElementById('workout-wed').checked) days.push('wednesday');
    if (document.getElementById('workout-fri').checked) days.push('friday');

    routines.workout = {
        enabled: days.length > 0,
        days: days,
        time: document.getElementById('workout-time').value
    };

    saveToStorage();
    renderCurrentDay();
    if (currentView === 'week') renderWeekView();
    showStatus('routine-status', 'Workout schedule saved!');
    showToast('Workout schedule updated');
}

function saveTennis() {
    routines.tennis = {
        enabled: true,
        day: 'thursday',
        time: document.getElementById('tennis-time').value
    };

    saveToStorage();
    renderCurrentDay();
    if (currentView === 'week') renderWeekView();
    showStatus('routine-status', 'Tennis time saved!');
    showToast('Tennis schedule updated');
}

function showStatus(elementId, message) {
    const status = document.getElementById(elementId);
    status.textContent = message;
    status.classList.add('success');
    setTimeout(() => {
        status.textContent = '';
        status.classList.remove('success');
    }, 3000);
}

// ============================================
// UPCOMING LIST
// ============================================

function renderUpcoming(filter = 'all') {
    const upcomingList = document.getElementById('upcoming-list');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTasks = tasks.filter(task => {
        const taskDate = parseDate(task.dueDate);
        const diffDays = (taskDate - today) / (1000 * 60 * 60 * 24);
        const matchesFilter = filter === 'all' || task.type === filter;
        const isOverdue = taskDate < today;
        return (diffDays >= 0 && diffDays <= 30 || isOverdue) && matchesFilter && !isTaskCompleted(task, task.dueDate);
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (upcomingTasks.length === 0) {
        upcomingList.innerHTML = '<p class="help-text">No upcoming deadlines</p>';
        return;
    }

    upcomingList.innerHTML = upcomingTasks.map(task => {
        const date = parseDate(task.dueDate);
        const isOverdue = date < today;
        const dayNum = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });

        return `
            <div class="upcoming-item ${task.type} ${isOverdue ? 'overdue' : ''}">
                <div class="upcoming-date">
                    <span class="day">${dayNum}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="upcoming-info">
                    <h4>${task.name}</h4>
                    <p>${isOverdue ? 'OVERDUE - ' : ''}${task.course || task.description || task.type}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// SYLLABUS PARSING
// ============================================

function parseSyllabus() {
    const courseName = document.getElementById('course-name').value.trim();
    const syllabusText = document.getElementById('syllabus-text').value.trim();

    if (!courseName) {
        showToast('Please enter a course name', 'error');
        return;
    }

    if (!syllabusText) {
        showToast('Please paste syllabus text', 'error');
        return;
    }

    pendingAssignments = extractAssignments(syllabusText, courseName);

    if (pendingAssignments.length === 0) {
        showToast('No assignments found. Try different format.', 'error');
        return;
    }

    const preview = document.getElementById('assignment-preview');
    preview.innerHTML = pendingAssignments.map(a => `
        <div class="preview-item">
            <span class="name">${a.name}</span>
            <span class="date">${formatDateShort(a.dueDate)}</span>
        </div>
    `).join('');

    document.getElementById('extracted-assignments').classList.remove('hidden');
    showToast(`Found ${pendingAssignments.length} assignments`);
}

function extractAssignments(text, courseName) {
    const assignments = [];
    const lines = text.split('\n');

    const datePatterns = [
        /(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/gi,
        /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/gi,
        /(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?/gi
    ];

    const assignmentKeywords = [
        /homework/i, /hw/i, /assignment/i, /quiz/i, /exam/i, /test/i,
        /project/i, /due/i, /submit/i, /deadline/i, /lab/i, /midterm/i, /final/i
    ];

    for (const line of lines) {
        const hasKeyword = assignmentKeywords.some(kw => kw.test(line));
        if (!hasKeyword) continue;

        let foundDate = null;
        for (const pattern of datePatterns) {
            const match = line.match(pattern);
            if (match) {
                foundDate = parseExtractedDate(match[0]);
                if (foundDate) break;
            }
        }

        if (foundDate) {
            let name = line.replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '')
                          .replace(/\w+\s+\d{1,2}(,?\s*\d{4})?/gi, '')
                          .replace(/due:?/gi, '')
                          .replace(/\s+/g, ' ')
                          .trim();

            if (name.length > 3) {
                const type = determineTaskType(name);
                assignments.push({
                    id: generateId(),
                    name: name.substring(0, 100),
                    course: courseName,
                    dueDate: foundDate,
                    type: type,
                    description: `${courseName} - ${type}`
                });
            }
        }
    }

    return assignments;
}

function parseExtractedDate(dateStr) {
    const months = {
        'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
        'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
        'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
        'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };

    const monthDayMatch = dateStr.match(/(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    if (monthDayMatch) {
        const month = months[monthDayMatch[1].toLowerCase()];
        if (month !== undefined) {
            const day = parseInt(monthDayMatch[2]);
            const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : 2026;
            return getDateString(new Date(year, month, day));
        }
    }

    const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1;
        const day = parseInt(numericMatch[2]);
        let year = numericMatch[3] ? parseInt(numericMatch[3]) : 2026;
        if (year < 100) year += 2000;
        return getDateString(new Date(year, month, day));
    }

    return null;
}

function determineTaskType(name) {
    const lowerName = name.toLowerCase();
    if (/quiz|exam|test|midterm|final/.test(lowerName)) return 'quiz';
    if (/project/.test(lowerName)) return 'project';
    return 'assignment';
}

function confirmAssignments() {
    tasks.push(...pendingAssignments);
    saveToStorage();

    document.getElementById('course-name').value = '';
    document.getElementById('syllabus-text').value = '';
    document.getElementById('extracted-assignments').classList.add('hidden');

    pendingAssignments = [];
    renderAll();
    showToast('Assignments added to calendar!', 'success');
}

// ============================================
// PRE-LOADED COURSE SCHEDULES
// ============================================

function loadCourseSchedule(courseCode) {
    let courseAssignments = [];

    switch (courseCode) {
        case 'MAT302':
            courseAssignments = getMAT302Schedule();
            break;
        case 'DST234':
            courseAssignments = getDST234Schedule();
            break;
        case 'MAT146':
            courseAssignments = getMAT146Schedule();
            break;
    }

    if (courseAssignments.length > 0) {
        tasks = tasks.filter(t => !t.course || !t.course.includes(courseCode.replace(/(\d+)/, ' $1')));
        tasks.push(...courseAssignments);
        saveToStorage();
        renderAll();
        showToast(`Loaded ${courseAssignments.length} items for ${courseCode}`, 'success');
    }
}

function getMAT302Schedule() {
    const assignments = [
        { name: 'Quiz 1 (2.1, 2.2)', dueDate: '2026-01-30', type: 'quiz' },
        { name: 'Quiz 2 (2.3, 2.4)', dueDate: '2026-02-06', type: 'quiz' },
        { name: 'Quiz 3 (3.1, 3.2)', dueDate: '2026-02-13', type: 'quiz' },
        { name: 'Quiz 4 (3.3, 3.4)', dueDate: '2026-02-20', type: 'quiz' },
        { name: 'Quiz 5 (4.1, 4.2, 4.3)', dueDate: '2026-02-27', type: 'quiz' },
        { name: 'Quiz 6 (4.4, 4.5)', dueDate: '2026-03-06', type: 'quiz' },
        { name: 'Double Quiz (5.1-5.4)', dueDate: '2026-03-13', type: 'quiz' },
        { name: 'Quiz 7 (6.1, 6.2)', dueDate: '2026-03-25', type: 'quiz' },
        { name: 'Quiz 8 (6.3, 6.4, 6.5)', dueDate: '2026-04-01', type: 'quiz' },
        { name: 'Quiz 9 (7.1, 7.2, 7.3)', dueDate: '2026-04-10', type: 'quiz' },
        { name: 'Quiz 10 (7.4, 7.5)', dueDate: '2026-04-17', type: 'quiz' },
        { name: 'Double Quiz (8.1-8.5)', dueDate: '2026-04-24', type: 'quiz' },
        { name: 'Final Double Quiz (9.1-9.5)', dueDate: '2026-05-06', type: 'quiz' },
        { name: 'HW 2.1 Organized Listing', dueDate: '2026-01-26', type: 'assignment' },
        { name: 'HW 2.2 Counting with Steps', dueDate: '2026-01-28', type: 'assignment' },
        { name: 'HW 2.3 Counting Subsets', dueDate: '2026-01-30', type: 'assignment' },
        { name: 'HW 2.4 Counting Bit Strings', dueDate: '2026-02-02', type: 'assignment' },
        { name: 'HW 3.1 Modeling with Graphs', dueDate: '2026-02-04', type: 'assignment' },
        { name: 'HW 3.2 Standard Graphs', dueDate: '2026-02-06', type: 'assignment' },
        { name: 'HW 3.3 Coloring Graphs', dueDate: '2026-02-11', type: 'assignment' },
        { name: 'HW 3.4 Classifying Graphs', dueDate: '2026-02-13', type: 'assignment' },
        { name: 'HW 4.1 Integer Division', dueDate: '2026-02-16', type: 'assignment' },
        { name: 'HW 4.2 Division Algorithm', dueDate: '2026-02-18', type: 'assignment' },
        { name: 'HW 4.3 Modular Arithmetic', dueDate: '2026-02-20', type: 'assignment' },
        { name: 'HW 4.4 Primes', dueDate: '2026-02-23', type: 'assignment' },
        { name: 'HW 4.5 GCD', dueDate: '2026-02-25', type: 'assignment' },
        { name: 'HW 5.1 Logical Connectives', dueDate: '2026-03-04', type: 'assignment' },
        { name: 'HW 5.2 Quantifiers', dueDate: '2026-03-06', type: 'assignment' },
    ];

    return assignments.map(a => ({ ...a, id: generateId(), course: 'MAT 302', description: 'MAT 302 Discrete Math' }));
}

function getDST234Schedule() {
    const assignments = [
        { name: 'Quiz 1: Introductory Data Visualization', dueDate: '2026-02-03', type: 'quiz' },
        { name: 'Quiz 2: ggplots', dueDate: '2026-02-19', type: 'quiz' },
        { name: 'Quiz 3: Data Wrangling & Joining', dueDate: '2026-03-10', type: 'quiz' },
        { name: 'Quiz 4: Inference', dueDate: '2026-03-31', type: 'quiz' },
        { name: 'Quiz 5: Maps and Construction', dueDate: '2026-04-21', type: 'quiz' },
        { name: 'Quiz 6: Functional Programming', dueDate: '2026-04-28', type: 'quiz' },
        { name: 'HW Days 1-5 Final Submission', dueDate: '2026-02-14', type: 'assignment' },
        { name: 'HW Days 6-10 Final Submission', dueDate: '2026-03-07', type: 'assignment' },
        { name: 'HW Days 11-14 Final Submission', dueDate: '2026-03-27', type: 'assignment' },
        { name: 'HW Days 15-19 Final Submission', dueDate: '2026-04-18', type: 'assignment' },
        { name: 'HW Days 20-25 Final Submission', dueDate: '2026-05-02', type: 'assignment' },
        { name: 'Ethics: Who Owns Your Data?', dueDate: '2026-02-05', type: 'assignment' },
        { name: 'Ethics: Weapons of Math Destruction', dueDate: '2026-03-12', type: 'assignment' },
        { name: 'Ethics: Mapping Prejudice', dueDate: '2026-04-14', type: 'assignment' },
        { name: 'Ethics: Justice in Data Science', dueDate: '2026-04-30', type: 'assignment' },
        { name: 'Mini-project 1', dueDate: '2026-02-12', type: 'project' },
        { name: 'Mini-project 2', dueDate: '2026-03-05', type: 'project' },
        { name: 'Mini-project 3', dueDate: '2026-04-02', type: 'project' },
        { name: 'Mini-project 4', dueDate: '2026-04-23', type: 'project' },
        { name: 'Mini-project 5', dueDate: '2026-05-07', type: 'project' },
    ];

    return assignments.map(a => ({ ...a, id: generateId(), course: 'DST 234', description: 'DST 234 Data Science' }));
}

function getMAT146Schedule() {
    const assignments = [
        { name: 'Midterm Exam 1', dueDate: '2026-02-13', type: 'quiz' },
        { name: 'Midterm Exam 2', dueDate: '2026-03-13', type: 'quiz' },
        { name: 'Midterm Exam 3', dueDate: '2026-04-17', type: 'quiz' },
        { name: 'Final Exam', dueDate: '2026-05-04', type: 'quiz' },
        { name: 'Lab 1', dueDate: '2026-01-24', type: 'assignment' },
        { name: 'Lab 2', dueDate: '2026-01-31', type: 'assignment' },
        { name: 'Lab 3', dueDate: '2026-02-07', type: 'assignment' },
        { name: 'Lab 4', dueDate: '2026-02-14', type: 'assignment' },
        { name: 'Lab 5', dueDate: '2026-02-21', type: 'assignment' },
        { name: 'Lab 6', dueDate: '2026-02-28', type: 'assignment' },
        { name: 'Lab 7', dueDate: '2026-03-07', type: 'assignment' },
        { name: 'Lab 8', dueDate: '2026-03-14', type: 'assignment' },
        { name: 'Lab 9', dueDate: '2026-03-28', type: 'assignment' },
        { name: 'Lab 10', dueDate: '2026-04-04', type: 'assignment' },
        { name: 'Lab 11', dueDate: '2026-04-11', type: 'assignment' },
        { name: 'Lab 12', dueDate: '2026-04-18', type: 'assignment' },
        { name: 'Lab 13', dueDate: '2026-04-25', type: 'assignment' },
        { name: 'Lab 14', dueDate: '2026-05-02', type: 'assignment' },
    ];

    return assignments.map(a => ({ ...a, id: generateId(), course: 'MAT 146', description: 'MAT 146 Calculus II' }));
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

function addProject() {
    const name = document.getElementById('project-name').value.trim();
    const date = document.getElementById('project-date').value;
    const time = document.getElementById('project-time').value;
    const priority = document.getElementById('project-priority').value;
    const notes = document.getElementById('project-notes').value.trim();

    if (!name) {
        showToast('Please enter a project name', 'error');
        return;
    }

    if (!date) {
        showToast('Please select a due date', 'error');
        return;
    }

    const project = {
        id: generateId(),
        name: name,
        dueDate: date,
        time: time || null,
        type: 'project',
        priority: priority,
        description: notes || 'Work project'
    };

    tasks.push(project);
    saveToStorage();

    document.getElementById('project-name').value = '';
    document.getElementById('project-date').value = '';
    document.getElementById('project-time').value = '';
    document.getElementById('project-notes').value = '';

    renderAll();
    showToast('Project added!', 'success');
}

// ============================================
// TASK MANAGEMENT
// ============================================

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    // Also remove completion status
    Object.keys(completedTasks).forEach(key => {
        if (key.startsWith(taskId + '_')) {
            delete completedTasks[key];
        }
    });
    saveToStorage();
    renderAll();
    showToast('Task deleted');
}

window.deleteTask = deleteTask;

// ============================================
// MODAL FUNCTIONS
// ============================================

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function quickAddTask() {
    const name = document.getElementById('quick-task-name').value.trim();
    const type = document.getElementById('quick-task-type').value;

    if (!name) {
        showToast('Please enter a task name', 'error');
        return;
    }

    const task = {
        id: generateId(),
        name: name,
        dueDate: getDateString(currentDate),
        type: type,
        description: ''
    };

    tasks.push(task);
    saveToStorage();

    closeAllModals();
    document.getElementById('quick-task-name').value = '';

    renderAll();
    showToast('Task added!', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDateShort(dateStr) {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
