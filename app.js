// 1. Загрузка данных и настроек
let entries = JSON.parse(localStorage.getItem('wh_entries')) || [];
let settings = JSON.parse(localStorage.getItem('wh_settings')) || {
  employees: ['Иван', 'Анна'],
  models: ['Футболка', 'Худи'],
  colors: ['Черный', 'Белый', 'Красный'],
  sizes: ['42', '44', '46', 'S', 'M', 'L']
};

// --- ФУНКЦИЯ УВЕДОМЛЕНИЯ (Исправлено: исчезает) ---
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
  }, 2500);
}

// --- НАВИГАЦИЯ (Переключение вкладок) ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    const target = btn.dataset.target;
    document.getElementById(target).classList.add('active');
    
    // Обновляем данные при открытии вкладки
    if(target === 'tab-history') renderHistory();
    if(target === 'tab-stats') renderStats();
    if(target === 'tab-settings') renderSettings();
  });
});

// --- ДОБАВЛЕНИЕ ЗАПИСИ ---
function updateFormOptions() {
  const empSelect = document.getElementById('input-employee');
  const modSelect = document.getElementById('input-model');
  const colorBox = document.getElementById('quick-colors');
  const sizeBox = document.getElementById('quick-sizes');

  if (empSelect) empSelect.innerHTML = settings.employees.map(e => `<option>${e}</option>`).join('');
  if (modSelect) modSelect.innerHTML = settings.models.map(m => `<option>${m}</option>`).join('');
  
  if (colorBox) colorBox.innerHTML = settings.colors.map(c => 
    `<button type="button" class="q-btn" onclick="document.getElementById('input-color').value='${c}'">${c}</button>`
  ).join('');
  
  if (sizeBox) sizeBox.innerHTML = settings.sizes.map(s => 
    `<button type="button" class="q-btn" onclick="document.getElementById('input-size').value='${s}'">${s}</button>`
  ).join('');
}

const addForm = document.getElementById('add-form');
if (addForm) {
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      employee: document.getElementById('input-employee').value,
      model: document.getElementById('input-model').value,
      color: document.getElementById('input-color').value,
      size: document.getElementById('input-size').value,
      quantity: parseInt(document.getElementById('input-qty').value),
      note: document.getElementById('input-note').value
    };
    entries.push(newEntry);
    localStorage.setItem('wh_entries', JSON.stringify(entries));
    showToast('Запись сохранена!');
    e.target.reset();
    updateFormOptions();
  });
}

// --- ИСТОРИЯ (ПОИСК И ФИЛЬТР) ---
function renderHistory() {
  const list = document.getElementById('history-list');
  const searchInput = document.getElementById('filter-search');
  const empFilter = document.getElementById('filter-employee');
  
  if (!list) return;

  const search = searchInput ? searchInput.value.toLowerCase() : "";
  const fEmp = empFilter ? empFilter.value : "";

  // Настройка фильтра сотрудников
  if (empFilter && empFilter.options.length <= 1) {
    empFilter.innerHTML = '<option value="">Все сотрудники</option>' + 
      settings.employees.map(e => `<option value="${e}">${e}</option>`).join('');
  }

  const filtered = entries.filter(e => {
    const textStr = `${e.model} ${e.color} ${e.size}`.toLowerCase();
    const matchSearch = textStr.includes(search);
    const matchEmp = !fEmp || e.employee === fEmp;
    return matchSearch && matchEmp;
  }).sort((a,b) => b.id - a.id);

  list.innerHTML = filtered.map(e => `
    <div class="entry-card">
      <div class="entry-info">
        <strong>${e.model}</strong>
        <small>${e.color}, разм. ${e.size}<br>${e.employee} | ${new Date(e.createdAt).toLocaleDateString()}</small>
      </div>
      <div class="entry-qty-box">
        <div class="entry-qty">${e.quantity} шт</div>
        <button class="btn-danger" onclick="deleteEntry(${e.id})">Удалить</button>
      </div>
    </div>
  `).join('') || '<p style="text-align:center; padding:20px; color:gray">Ничего не найдено</p>';
}

// Активация поиска при вводе текста
const searchInputEl = document.getElementById('filter-search');
if (searchInputEl) {
  searchInputEl.addEventListener('input', renderHistory);
}
const empFilterEl = document.getElementById('filter-employee');
if (empFilterEl) {
  empFilterEl.addEventListener('change', renderHistory);
}

window.deleteEntry = (id) => {
  if(confirm('Удалить эту запись?')) {
    entries = entries.filter(e => e.id !== id);
    localStorage.setItem('wh_entries', JSON.stringify(entries));
    renderHistory();
    showToast('Удалено');
  }
};

// --- СТАТИСТИКА И ГРАФИК ---
function renderStats() {
  const statsGeneral = document.getElementById('stats-general');
  const statsModels = document.getElementById('stats-top-models');
  if (!statsGeneral) return;

  const totalQty = entries.reduce((s, e) => s + e.quantity, 0);
  statsGeneral.innerHTML = `
    <div class="stat-card"><span>${totalQty}</span>Всего шт</div>
    <div class="stat-card"><span>${entries.length}</span>Записей</div>
  `;
  
  const modelsMap = entries.reduce((acc, e) => {
    acc[e.model] = (acc[e.model] || 0) + e.quantity;
    return acc;
  }, {});
  
  const sortedModels = Object.entries(modelsMap).sort((a,b) => b[1]-a[1]);
  if (statsModels) {
    statsModels.innerHTML = sortedModels.map(m => `
      <div class="top-item"><span>${m[0]}</span><strong>${m[1]} шт</strong></div>
    `).join('') || '<p style="color:gray">Нет данных</p>';
  }
  renderChart();
}

function renderChart() {
  const container = document.getElementById('chart-container');
  if (!container) return;

  const days = [];
  for(let i=13; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-CA'));
  }
  const sums = entries.reduce((acc, item) => {
    const date = item.createdAt.split('T')[0];
    acc[date] = (acc[date] || 0) + item.quantity;
    return acc;
  }, {});
  const max = Math.max(...Object.values(sums), 5);
  container.innerHTML = days.map(d => {
    const val = sums[d] || 0;
    return `<div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${(val/max)*100}%"></div>
      <div class="chart-label">${d.split('-')[2]}</div>
    </div>`;
  }).join('');
}

// --- НАСТРОЙКИ ---
function renderSettings() {
  const setEmp = document.getElementById('set-employees');
  const setMod = document.getElementById('set-models');
  const setCol = document.getElementById('set-colors');
  const setSiz = document.getElementById('set-sizes');

  if (setEmp) setEmp.value = settings.employees.join(', ');
  if (setMod) setMod.value = settings.models.join(', ');
  if (setCol) setCol.value = settings.colors.join(', ');
  if (setSiz) setSiz.value = settings.sizes.join(', ');
}

const saveBtn = document.getElementById('btn-save-settings');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    const getVal = id => {
      const el = document.getElementById(id);
      return el ? el.value.split(',').map(x => x.trim()).filter(x => x) : [];
    };
    settings.employees = getVal('set-employees');
    settings.models = getVal('set-models');
    settings.colors = getVal('set-colors');
    settings.sizes = getVal('set-sizes');
    localStorage.setItem('wh_settings', JSON.stringify(settings));
    updateFormOptions();
    showToast('Настройки сохранены');
  });
}

// Инициализация
updateFormOptions();
