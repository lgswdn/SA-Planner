// renderer.js - Handles all the logic for the main planner window (index.html)

document.addEventListener('DOMContentLoaded', async () => {
    // Get all the elements from the page
    const calendarDaysContainer = document.getElementById('calendar-days');
    const taskList = document.getElementById('task-list');
    const addTaskBtn = document.getElementById('add-task-btn');
    const newTaskInput = document.getElementById('new-task-input');
    const newTaskDdl = document.getElementById('new-task-ddl');
    const bgUpload = document.getElementById('background-upload');
    const quickAddBtn = document.getElementById('quick-add-btn');
    const transparencySlider = document.getElementById('transparency-slider');
    
    // --- NEW: Elements for the clear data feature ---
    const clearDataBtn = document.getElementById('clear-data-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    // --- END NEW ELEMENTS ---

    newTaskDdl.valueAsDate = new Date();
    
    let appData = { events: {}, tasks: [] };
    if (window.electronAPI && typeof window.electronAPI.loadData === 'function') {
        appData = await window.electronAPI.loadData();
    }
    let events = appData.events || {};
    let tasks = appData.tasks || [];

    quickAddBtn.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.openQuickAdd();
    });

    // --- NEW: LOGIC FOR CLEARING DATA ---
    clearDataBtn.addEventListener('click', () => {
        confirmModal.classList.remove('hidden');
    });

    confirmCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    confirmDeleteBtn.addEventListener('click', () => {
        // 1. Clear local storage settings
        localStorage.removeItem('plannerBg');
        localStorage.removeItem('plannerTransparency');

        // 2. Tell the main process to delete the data file
        if(window.electronAPI) window.electronAPI.clearData();

        // 3. Tell the main process to restart the app
        if(window.electronAPI) window.electronAPI.relaunchApp();
    });
    // --- END OF NEW LOGIC ---

    const applyTransparency = (value) => document.documentElement.style.setProperty('--bg-opacity', value);
    const saveAndApplyTransparency = (value) => {
        localStorage.setItem('plannerTransparency', value);
        applyTransparency(value);
    };
    const loadTransparency = () => {
        const savedValue = localStorage.getItem('plannerTransparency') || '0.8';
        transparencySlider.value = savedValue;
        applyTransparency(savedValue);
    };
    transparencySlider.addEventListener('input', (e) => saveAndApplyTransparency(e.target.value));

    const renderCalendar = (daysToShow = 30) => {
        calendarDaysContainer.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < daysToShow; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const day = date.toLocaleString('en-US', { weekday: 'long' });
            const fullDate = date.toISOString().split('T')[0];
            const displayDate = date.toLocaleString('en-US', { month: 'long', day: 'numeric' });

            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column flex-shrink-0 border-r border-slate-200 flex flex-col w-1/5 min-w-[200px]';
            dayColumn.innerHTML = `
                <div class="p-3 bg-opacity-layer-header border-b border-slate-200">
                    <p class="font-bold text-slate-700">${day}</p>
                    <p class="text-sm text-slate-500">${displayDate}</p>
                </div>
                <div class="flex-grow p-2 space-y-2 overflow-y-auto">
                    ${['Morning', 'Afternoon', 'Evening'].map(period => `
                        <div class="h-1/3 border-t border-slate-200 pt-2 first:border-t-0" data-period="${period}">
                            <h4 class="font-semibold text-sm mb-1 text-slate-600">${period}</h4>
                            <div class="event-list space-y-1" data-date="${fullDate}" data-period="${period}"></div>
                        </div>
                    `).join('')}
                </div>`;
            calendarDaysContainer.appendChild(dayColumn);
        }
        renderEvents();
    };

    const renderEvents = () => {
        document.querySelectorAll('.event-list').forEach(list => list.innerHTML = '');
        Object.keys(events).forEach(dateKey => {
            events[dateKey].forEach(event => {
                 addEventToDOM(dateKey, event.period, event.text, event.id, false);
            });
        });
    };

    const addEventToDOM = (date, period, text, id, isRecurring) => {
        const list = document.querySelector(`.event-list[data-date="${date}"][data-period="${period}"]`);
        if (!list) return;
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item relative bg-blue-100 text-blue-800 p-1.5 rounded-md text-sm';
        eventEl.textContent = text;
        eventEl.dataset.id = id;
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn absolute top-1/2 right-2 -translate-y-1/2 text-red-500 hover:text-red-700';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = () => deleteEvent(id);
        eventEl.appendChild(deleteBtn);
        list.appendChild(eventEl);
    };

    const deleteEvent = (eventId) => {
        for (const dateKey in events) {
            events[dateKey] = events[dateKey].filter(e => e.id !== eventId);
            if (events[dateKey].length === 0) delete events[dateKey];
        }
        saveData();
        renderCalendar();
    };
    
    const renderTasks = () => {
        taskList.innerHTML = '';
        tasks.sort((a, b) => {
            if (a.ddl && b.ddl) return new Date(a.ddl) - new Date(b.ddl);
            return a.ddl ? -1 : b.ddl ? 1 : 0;
        });
        tasks.forEach((task, index) => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item relative bg-white p-3 rounded-md shadow-sm mb-2';
            let ddlText;
            if (task.ddl) {
                ddlText = `<span class="text-xs text-slate-500"><span class="font-medium">ddl:</span> ${new Date(task.ddl+'T00:00:00').toLocaleDateString()}</span>`;
            } else {
                ddlText = `<span class="text-xs text-slate-400 italic">No deadline set</span>`;
            }
            taskEl.innerHTML = `<div><p class="font-medium text-slate-800">${task.text}</p>${ddlText}</div>`;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn absolute top-1/2 right-2 -translate-y-1/2 text-red-500 hover:text-red-700 text-lg';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = () => {
                tasks.splice(index, 1);
                saveData();
                renderTasks();
            };
            taskEl.appendChild(deleteBtn);
            taskList.appendChild(taskEl);
        });
    };
    
    const saveData = () => {
        if(window.electronAPI) window.electronAPI.saveData({ events, tasks });
    }

    addTaskBtn.addEventListener('click', () => {
        const text = newTaskInput.value.trim();
        if (text) {
            tasks.push({ text, ddl: newTaskDdl.value || null });
            newTaskInput.value = '';
            newTaskDdl.valueAsDate = new Date();
            saveData();
            renderTasks();
        }
    });

    bgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                document.body.style.backgroundImage = `url('${imageUrl}')`;
                localStorage.setItem('plannerBg', imageUrl);
            };
            reader.readAsDataURL(file);
        }
    });

    const loadBg = () => {
        const savedBg = localStorage.getItem('plannerBg');
        if (savedBg) document.body.style.backgroundImage = `url('${savedBg}')`;
    };
    
    if (window.electronAPI) {
        window.electronAPI.onEventAdded((eventData) => {
            const { date, period, text, recurring } = eventData;
            if (!events[date]) { events[date] = []; }
            events[date].push({ id: Date.now(), text, period, recurring });
            saveData();
            renderCalendar();
        });
    }

    const resizer = document.getElementById('resizer');
    const calendarContainer = document.getElementById('calendar-container');
    const tasksContainer = document.getElementById('tasks-container-wrapper');
    resizer.addEventListener('mousedown', () => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => document.removeEventListener('mousemove', handleMouseMove));
    });
    function handleMouseMove(e) {
        const calendarWidth = e.clientX;
        const tasksWidth = window.innerWidth - calendarWidth;
        if (calendarWidth > 300 && tasksWidth > 250) {
            calendarContainer.style.width = `${calendarWidth}px`;
            tasksContainer.style.width = `${tasksWidth}px`;
        }
    }

    loadBg();
    loadTransparency();
    renderCalendar();
    renderTasks();
});

