// DOM элементы
const taskInput = document.querySelector('.task-input');
const dueDateInput = document.querySelector('.due-date-input');
const dueTimeInput = document.querySelector('.due-time-input');
const addBtn = document.querySelector('.add-btn');
const tasksContainer = document.getElementById('tasks-container');
const filterBtns = document.querySelectorAll('.filter-btn');
const filterDateInput = document.querySelector('.filter-date-input');
const applyFilterBtn = document.querySelector('.apply-filter-btn');

// Состояние приложения
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let filterDate = null;

// Установка текущей даты по умолчанию
const now = new Date();
dueDateInput.valueAsDate = now;
filterDateInput.valueAsDate = now;

// Установка времени по умолчанию (текущее время + 1 час)
const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
dueTimeInput.value = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;

/**
 * Отрисовка всех задач с учетом фильтров
 */
function renderTasks() {
    tasksContainer.innerHTML = '';
    const now = new Date();
    
    // Фильтрация задач
    const filteredTasks = tasks.filter(task => {
        const taskDue = task.dueDateTime ? new Date(task.dueDateTime) : null;
        const isOverdue = !task.completed && taskDue && taskDue < now;
        const isOnSelectedDate = filterDate && taskDue ? isSameDay(taskDue, new Date(filterDate)) : false;
        
        // Применение фильтров
        switch(currentFilter) {
            case 'all': 
                return !filterDate || isOnSelectedDate;
            case 'active': 
                return !task.completed && (!filterDate || isOnSelectedDate);
            case 'completed': 
                return task.completed && (!filterDate || isOnSelectedDate);
            case 'overdue': 
                return isOverdue && (!filterDate || isOnSelectedDate);
            default:
                return true;
        }
    });
    
    // Группировка задач по датам
    const groupedTasks = groupTasksByDate(filteredTasks);
    
    // Отображение сообщения, если задач нет
    if (groupedTasks.length === 0) {
        tasksContainer.innerHTML = '<div class="no-tasks">Задачи не найдены</div>';
        return;
    }
    
    // Отрисовка групп задач
    groupedTasks.forEach(group => {
        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';
        
        const isOverdue = group.isOverdue;
        
        // Заголовок группы
        const dayHeader = document.createElement('div');
        dayHeader.className = `day-header ${isOverdue ? 'overdue-header' : ''}`;
        
        let headerText;
        if (isOverdue) {
            headerText = 'Просроченные задачи';
        } else {
            headerText = group.date.toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        dayHeader.innerHTML = `
            <span>${headerText}</span>
            <span class="task-count">${group.tasks.length}</span>
        `;
        
        // Список задач в группе
        const taskList = document.createElement('ul');
        taskList.className = 'task-list';
        
        // Отрисовка каждой задачи
        group.tasks.forEach(task => {
            const taskDue = task.dueDateTime ? new Date(task.dueDateTime) : null;
            const isTaskOverdue = !task.completed && taskDue && taskDue < now;
            
            const li = document.createElement('li');
            li.className = 'task-item';
            if (task.completed) li.classList.add('completed');
            
            li.innerHTML = `
                <div class="task-info">
                    <span class="task-text">${task.text}</span>
                    ${task.dueDateTime ? `
                        <span class="task-due-date ${isTaskOverdue ? 'overdue' : ''}">
                            Выполнить до: ${formatDateTime(taskDue)}
                            ${isTaskOverdue ? '(Просрочено!)' : ''}
                        </span>` : ''}
                </div>
                <div class="task-actions">
                    <input type="checkbox" class="complete-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                    <input type="checkbox" class="delete-checkbox" data-id="${task.id}">
                </div>
            `;
            
            taskList.appendChild(li);
        });
        
        dayGroup.appendChild(dayHeader);
        dayGroup.appendChild(taskList);
        tasksContainer.appendChild(dayGroup);
    });
    
    // Назначение обработчиков событий
    setupEventListeners();
}

/**
 * Группирует задачи по датам
 */
function groupTasksByDate(tasks) {
    const now = new Date();
    const groups = [];
    
    // Отделение просроченных задач
    const overdueTasks = tasks.filter(task => {
        const taskDue = task.dueDateTime ? new Date(task.dueDateTime) : null;
        return !task.completed && taskDue && taskDue < now;
    });
    
    if (overdueTasks.length > 0) {
        groups.push({
            date: now,
            tasks: overdueTasks,
            isOverdue: true
        });
    }
    
    // Группировка остальных задач по датам
    const remainingTasks = tasks.filter(task => {
        const taskDue = task.dueDateTime ? new Date(task.dueDateTime) : null;
        return !(!task.completed && taskDue && taskDue < now);
    });
    
    const dateMap = {};
    
    remainingTasks.forEach(task => {
        const dateKey = task.dueDateTime ? 
            new Date(task.dueDateTime).toDateString() : 'no-date';
        
        if (!dateMap[dateKey]) {
            dateMap[dateKey] = {
                date: task.dueDateTime ? new Date(task.dueDateTime) : null,
                tasks: []
            };
        }
        dateMap[dateKey].tasks.push(task);
    });
    
    // Сортировка групп по дате
    Object.keys(dateMap)
        .sort((a, b) => {
            if (a === 'no-date') return 1;
            if (b === 'no-date') return -1;
            return new Date(a) - new Date(b);
        })
        .forEach(dateKey => {
            const group = dateMap[dateKey];
            // Сортировка задач внутри группы по времени
            group.tasks.sort((a, b) => {
                if (!a.dueDateTime) return 1;
                if (!b.dueDateTime) return -1;
                return new Date(a.dueDateTime) - new Date(b.dueDateTime);
            });
            groups.push(group);
        });
    
    return groups;
}

/**
 * Проверяет, совпадают ли даты (без времени)
 */
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Форматирует дату для отображения
 */
function formatDateTime(date) {
    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Добавляет новую задачу
 */
function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    
    const dueDateTime = dueDateInput.value && dueTimeInput.value ?
        new Date(`${dueDateInput.value}T${dueTimeInput.value}`).toISOString() : null;
    
    tasks.push({
        id: Date.now().toString(),
        text,
        completed: false,
        dueDateTime
    });
    
    saveTasks();
    resetInputFields();
    renderTasks();
}

/**
 * Переключает статус выполнения задачи
 */
function toggleTask(e) {
    const task = tasks.find(t => t.id === e.target.dataset.id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

/**
 * Удаляет задачу
 */
function deleteTask(e) {
    const taskItem = e.target.closest('.task-item');
    taskItem.classList.add('deleting');
    
    setTimeout(() => {
        tasks = tasks.filter(t => t.id !== e.target.dataset.id);
        saveTasks();
        renderTasks();
    }, 300);
}

/**
 * Устанавливает фильтр
 */
function setFilter(e) {
    currentFilter = e.target.dataset.filter;
    filterDate = null;
    filterDateInput.valueAsDate = now;
    
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    renderTasks();
}

/**
 * Применяет фильтр по дате
 */
function applyDateFilter() {
    currentFilter = 'all';
    filterDate = filterDateInput.value;
    
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');
    
    renderTasks();
}

/**
 * Сохраняет задачи в localStorage
 */
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

/**
 * Сбрасывает поля ввода
 */
function resetInputFields() {
    taskInput.value = '';
    dueDateInput.valueAsDate = now;
    dueTimeInput.value = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
    taskInput.focus();
}

/**
 * Назначает обработчики событий
 */
function setupEventListeners() {
    // Обработчик для чекбоксов выполнения
    document.querySelectorAll('.complete-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', toggleTask);
    });
    
    // Обработчик для чекбоксов удаления
    document.querySelectorAll('.delete-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            if (e.target.checked) {
                deleteTask(e);
            }
        });
    });
}

// Инициализация обработчиков событий
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', e => e.key === 'Enter' && addTask());
filterBtns.forEach(btn => btn.addEventListener('click', setFilter));
applyFilterBtn.addEventListener('click', applyDateFilter);

// Первоначальная отрисовка
renderTasks();