let entries = JSON.parse(localStorage.getItem('wh_entries')) || [];
let settings = JSON.parse(localStorage.getItem('wh_settings')) || {
  employees: ['Иван', 'Анна'],
  models: ['Футболка', 'Худи'],
  colors: ['Черный', 'Белый', 'Красный'],
  sizes: ['42', '44', '46', 'S', 'M', 'L']
};

// --- УВЕДОМЛЕНИЕ ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// --- НАВИГАЦИЯ ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    
    if(btn.dataset.target === 'tab-history') renderHistory();
    if(btn.dataset.target === 'tab-stats') renderStats();
    if(btn.dataset.target === 'tab-settings') renderSettings();
  });
});

// --- ФОРМА ДОБАВЛЕНИЯ ---
function updateFormOptions() {
  document.getElementById('input-employee').innerHTML = settings.employees.map(e => `<option>${e}</option>`).join('');
  document.getElementById('input-model').innerHTML = settings.models.map(m => `<option>${m}</option>`).join('');
  document.getElementById('quick-colors').innerHTML = settings.colors.map(c => `<button type="button" class="q-btn" onclick="document.getElementById('input-color').value='${c}'">${c}</button>`).join('');
  document.getElementById('quick-sizes').innerHTML = settings.sizes.map(s => `<button type="button" class="q-btn" onclick="document.getElementById('input-size').value='${s}'">${s}</button>`).join('');
}

document.getElementById('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  entries.push({
    id: Date.now(),
    createdAt: new Date().toISOString(),
    employee: document.getElementById('input-employee').value,
    model: document.getElementById('input-model').value,
    color: document.getElementById('input-color').value,
    size: document.getElementById('input-size').value,
    quantity: parseInt(document.getElementById('input-qty').value),
    note: document.getElementById('input-note').value
  });
  localStorage.setItem('wh_entries', JSON.stringify(entries));
  showToast('Запись сохранена!');
  e.target.reset();
  updateFormOptions();
});

// --- ИСТОРИЯ (С ПОИСКОМ И ФИЛЬТРОМ) ---
function renderHistory() {
  const search = document.getElementById('filter-search').value.toLowerCase();
  const fEmp = document.getElementById('filter-employee').value;
  
  // Обновляем список сотрудников в фильтре, если он пуст
  const fEmpEl = document.getElementById('filter-employee');
  if(fEmpEl.options.length <= 1) {
    fEmpEl.innerHTML = '<option value="">Все сотрудники</option>' + settings.employees.map(e => `<option>${e}</option>`).join('');
  }

  const filtered = entries.filter(e => {
    const textStr = `${e.model} ${e.color} ${e.size}`.toLowerCase();
    const matchSearch = textStr.includes(search);
    const matchEmp = !fEmp || e.employee === fEmp;
    return matchSearch && matchEmp;
  }).sort((a,b) => b.id - a.id);

  document.getElementById('history-list').innerHTML = filtered.map(e => `
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

// Слушатели для поиска
document.getElementById('filter-search').addEventListener('input', renderHistory);
document.getElementById('filter-employee').addEventListener('change', renderHistory);

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
  const totalQty = entries.reduce((s, e) => s + e.quantity, 0);
  document.getElementById('stats-general').innerHTML = `
    <div class="stat-card"><span>${totalQty}</span>Всего шт</div>
    <div class="stat-card"><span>${entries.length}</span>Записей</div>
  `;
  
  const modelsMap = entries.reduce((acc, e) => {
    acc[e.model] = (acc[e.model] || 0) + e.quantity;
    return acc;
  }, {});
  
  const sortedModels = Object.entries(modelsMap).sort((a,b) => b[1]-a[1]);
  document.getElementById('stats-top-models').innerHTML = sortedModels.map(m => `
    <div class="top-item"><span>${m[0]}</span><strong>${m[1]} шт</strong></div>
  `).join('');
  
  renderChart();
}

function renderChart() {
  const container = document.getElementById('chart-container');
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

// --- НАСТРОЙКИ (С ЦВЕТАМИ И РАЗМЕРАМИ) ---
function renderSettings() {
  document.getElementById('set-employees').value = settings.employees.join(', ');
  document.getElementById('set-models').value = settings.models.join(', ');
  document.getElementById('set-colors').value = settings.colors.join(', ');
  document.getElementById('set-sizes').value = settings.sizes.join(', ');
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const getVal = id => document.getElementById(id).value.split(',').map(x => x.trim()).filter(x => x);
  
  settings.employees = getVal('set-employees');
  settings.models = getVal('set-models');
  settings.colors = getVal('set-colors');
  settings.sizes = getVal('set-sizes');
  
  localStorage.setItem('wh_settings', JSON.stringify(settings));
  updateFormOptions();
  showToast('Настройки сохранены');
});

updateFormOptions();
