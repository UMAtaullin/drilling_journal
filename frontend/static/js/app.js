class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.statusElement = document.getElementById('connection-status');
    this.init();
  }

  init() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    this.updateUI();
  }

  handleOnline() {
    this.isOnline = true;
    this.updateUI();
    console.log('Перешли в онлайн режим');
  }

  handleOffline() {
    this.isOnline = false;
    this.updateUI();
    console.log('Перешли в оффлайн режим');
  }

  updateUI() {
    if (this.isOnline) {
      this.statusElement.className = 'status-online';
      this.statusElement.querySelector('.status-text').textContent = 'ОНЛАЙН';
    } else {
      this.statusElement.className = 'status-offline';
      this.statusElement.querySelector('.status-text').textContent = 'ОФФЛАЙН';
    }
  }
}

class WellManager {
  constructor() {
    this.currentView = 'list'; // 'list' или 'create'
    this.wells = [];
  }

  init() {
    this.showWellsList();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Обработчики будут добавляться динамически
  }

  showWellsList() {
    const html = `
            <div class="component">
                <h2>Список скважин</h2>
                <div class="wells-list">
                    ${this.wells.length === 0 ?
        '<p class="no-wells">Нет созданных скважин</p>' :
        this.wells.map(well => `
                            <div class="well-item">
                                <h3>${well.name}</h3>
                                <p>Участок: ${well.area}</p>
                                <p>Сооружение: ${well.structure}</p>
                                <p>Проектная глубина: ${well.design_depth} м</p>
                            </div>
                        `).join('')
      }
                </div>
                <button id="create-well-btn" class="btn btn-primary">Создать новую скважину</button>
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    document.getElementById('create-well-btn').addEventListener('click', () => {
      this.showCreateWellForm();
    });

    this.currentView = 'list';
  }

  showCreateWellForm() {
    const html = `
            <div class="component">
                <h2>Создание новой скважины</h2>
                <form id="well-form" class="well-form">
                    <div class="form-group">
                        <label for="well-name">Название скважины *</label>
                        <input type="text" id="well-name" required placeholder="Например: СКВ-001">
                    </div>
                    
                    <div class="form-group">
                        <label for="well-area">Участок *</label>
                        <input type="text" id="well-area" required placeholder="Например: Северный участок">
                    </div>
                    
                    <div class="form-group">
                        <label for="well-structure">Сооружение *</label>
                        <input type="text" id="well-structure" required placeholder="Например: Фундамент здания">
                    </div>
                    
                    <div class="form-group">
                        <label for="well-depth">Проектная глубина (м) *</label>
                        <input type="number" id="well-depth" step="0.1" 
                        placeholder="0.0">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="cancel-btn" class="btn btn-secondary">Отмена</button>
                        <button type="submit" class="btn btn-primary">Создать скважину</button>
                    </div>
                </form>
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    document.getElementById('well-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createWell();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      this.showWellsList();
    });

    this.currentView = 'create';
  }

  createWell() {
    const formData = {
      name: document.getElementById('well-name').value,
      area: document.getElementById('well-area').value,
      structure: document.getElementById('well-structure').value,
      design_depth: parseFloat(document.getElementById('well-depth').value)
    };

    // Простая валидация
    if (!formData.name || !formData.area || !formData.structure || !formData.design_depth) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    // if (formData.design_depth <= 0 || formData.design_depth > 30) {
    //   alert('Проектная глубина должна быть от 0.01 до 30 метров');
    //   return;
    // }

    // Пока сохраняем только в памяти
    formData.id = Date.now(); // Временный ID
    this.wells.push(formData);

    alert(`Скважина "${formData.name}" создана успешно!`);
    this.showWellsList();
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
  const connection = new ConnectionManager();
  const wellManager = new WellManager();
  wellManager.init();

  console.log('Буровой журнал инициализирован');
});