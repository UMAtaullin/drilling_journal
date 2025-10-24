class APIService {
  constructor() {
    this.baseURL = '/api';
    this.ensureCSRF();
  }

  async ensureCSRF() {
    try {
      // Запрашиваем CSRF токен при инициализации
      await fetch('/api/get-csrf/', {
        credentials: 'include'
      });
      console.log('CSRF token ensured');
    } catch (error) {
      console.warn('CSRF token request failed:', error);
    }
  }

  // Получаем CSRF токен из cookies
  getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  async getWells() {
    try {
      const response = await fetch(`${this.baseURL}/wells/`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Ошибка API getWells:', error);
      throw error;
    }
  }

  async createWell(wellData) {
    try {
      const response = await fetch(`${this.baseURL}/wells/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'include',
        body: JSON.stringify(wellData)
      });

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // Не удалось распарсить JSON с ошибкой
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка API createWell:', error);
      throw error;
    }
  }

  async updateWell(wellId, wellData) {
    try {
      const response = await fetch(`${this.baseURL}/wells/${wellId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'include',
        body: JSON.stringify(wellData)
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Ошибка API updateWell:', error);
      throw error;
    }
  }

  async deleteWell(wellId) {
    try {
      const response = await fetch(`${this.baseURL}/wells/${wellId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': this.getCSRFToken(),
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return true;
    } catch (error) {
      console.error('Ошибка API deleteWell:', error);
      throw error;
    }
  }
}

class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.statusElement = document.getElementById('connection-status');
    this.wellManager = null;
    this.initEventListeners();
    this.updateUI();
  }

  setWellManager(wellManager) {
    this.wellManager = wellManager;
  }

  initEventListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  async handleOnline() {
    this.isOnline = true;
    this.updateUI();
    console.log('Перешли в онлайн режим');

    // Ждем немного перед синхронизацией чтобы сеть стабилизировалась
    setTimeout(async () => {
      if (this.wellManager) {
        try {
          await this.wellManager.loadWells();
          this.wellManager.showWellsList();
          console.log('Данные автоматически обновлены при переходе в онлайн');
        } catch (error) {
          console.error('Ошибка автоматического обновления:', error);
        }
      }
    }, 2000);
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
    this.currentView = 'list';
    this.wells = [];
    this.api = new APIService();
    this.localStorageKey = 'drilling_wells_offline';
  }

  async init() {
    console.log('WellManager init started');

    try {
      await this.loadWells();
      await this.showWellsList();
      this.setupEventListeners();
      console.log('WellManager init completed');
    } catch (error) {
      console.error('WellManager init error:', error);
      throw error;
    }
  }

  async loadWells() {
    try {
      if (navigator.onLine) {
        console.log('Пытаемся загрузить данные с сервера...');
        const serverWells = await this.api.getWells();
        console.log('Данные с сервера загружены:', serverWells);

        const offlineWells = this.getOfflineWells();
        this.wells = this.mergeWells(serverWells, offlineWells);
        this.saveOfflineWells();
      } else {
        console.log('Оффлайн режим, используем локальные данные');
        this.wells = this.getOfflineWells();
      }
    } catch (error) {
      console.log('Ошибка загрузки, используем локальные данные:', error);
      this.wells = this.getOfflineWells();
    }
  }

  getOfflineWells() {
    const offlineWells = localStorage.getItem(this.localStorageKey);
    return offlineWells ? JSON.parse(offlineWells) : [];
  }

  saveOfflineWells() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.wells));
  }

  mergeWells(serverWells, offlineWells) {
    const merged = [...serverWells];

    offlineWells.forEach(offlineWell => {
      // Если это оффлайн скважина (имеет временный ID)
      if (offlineWell.id && offlineWell.id.toString().startsWith('offline_')) {
        // Проверяем, нет ли такой же скважины на сервере
        const existsOnServer = serverWells.some(serverWell =>
          serverWell.name === offlineWell.name &&
          serverWell.area === offlineWell.area
        );

        if (!existsOnServer) {
          merged.push(offlineWell);
        }
      }
    });

    return merged;
  }

  async saveWellsToLocalStorage() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.wells));
  }

  setupEventListeners() {
    // Обработчики будут добавляться динамически
  }

  async showWellsList() {
    await this.loadWells(); // Всегда актуальные данные

    const html = `
            <div class="component">
                <h2>Список скважин</h2>
                <div class="connection-info">
                    <small>Режим: ${navigator.onLine ? 'ОНЛАЙН' : 'ОФФЛАЙН'}</small>
                </div>
                <div class="wells-list">
                    ${this.wells.length === 0 ?
        '<p class="no-wells">Нет созданных скважин</p>' :
        this.wells.map(well => `
                            <div class="well-item" data-well-id="${well.id}">
                                <h3>${well.name}</h3>
                                <p>Участок: ${well.area}</p>
                                <p>Сооружение: ${well.structure}</p>
                                <p>Проектная глубина: ${well.design_depth} м</p>
                                <small>ID: ${well.id} ${well.isOffline ? '(оффлайн)' : ''}</small>
                            </div>
                        `).join('')
      }
                </div>
                <button id="create-well-btn" class="btn btn-primary">Создать новую скважину</button>
                <button id="sync-btn" class="btn btn-secondary" ${navigator.onLine ? '' : 'disabled'}>
                    Синхронизировать
                </button>
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    document.getElementById('create-well-btn').addEventListener('click', () => {
      this.showCreateWellForm();
    });

    document.getElementById('sync-btn').addEventListener('click', () => {
      this.syncOfflineData();
    });

    // Добавляем обработчики для скважин
    document.querySelectorAll('.well-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const wellId = e.currentTarget.dataset.wellId;
        this.showWellDetails(wellId);
      });
    });

    this.currentView = 'list';
  }

  async showCreateWellForm() {
    const html = `
            <div class="component">
                <h2>Создание новой скважины</h2>
                <div class="connection-info">
                    <small>Режим: ${navigator.onLine ? 'ОНЛАЙН' : 'ОФФЛАЙН'}</small>
                </div>
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
                        <input type="number" id="well-depth" step="0.01" min="0" max="30" required 
                               placeholder="0.00 - 30.00">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="cancel-btn" class="btn btn-secondary">Отмена</button>
                        <button type="submit" class="btn btn-primary">
                            ${navigator.onLine ? 'Создать скважину' : 'Сохранить оффлайн'}
                        </button>
                    </div>
                </form>
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    document.getElementById('well-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createWell();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      this.showWellsList();
    });

    this.currentView = 'create';
  }

  async createWell() {
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

    if (formData.design_depth <= 0 || formData.design_depth > 30) {
      alert('Проектная глубина должна быть от 0.01 до 30 метров');
      return;
    }

    try {
      if (navigator.onLine) {
        // Онлайн: сохраняем через API
        const newWell = await this.api.createWell(formData);
        this.wells.push(newWell);
        alert(`Скважина "${formData.name}" создана успешно!`);
      } else {
        // Оффлайн: сохраняем локально
        formData.id = 'offline_' + Date.now(); // Временный ID для оффлайн
        formData.isOffline = true;
        this.wells.push(formData);
        await this.saveWellsToLocalStorage();
        alert(`Скважина "${formData.name}" сохранена оффлайн!`);
      }

      this.showWellsList();
    } catch (error) {
      alert('Ошибка при создании скважины: ' + error.message);
    }
  }

  async syncOfflineData() {
    if (!navigator.onLine) {
      alert('Нет интернет-соединения для синхронизации');
      return;
    }

    const offlineWells = this.wells.filter(well =>
      well.id && well.id.toString().startsWith('offline_')
    );

    console.log('Найдено оффлайн скважин для синхронизации:', offlineWells);

    if (offlineWells.length === 0) {
      alert('Нет оффлайн данных для синхронизации');
      return;
    }

    // Показываем индикатор загрузки
    const syncBtn = document.getElementById('sync-btn');
    const originalText = syncBtn.textContent;
    syncBtn.textContent = 'Синхронизация...';
    syncBtn.disabled = true;

    try {
      let syncedCount = 0;
      let errors = [];

      for (const offlineWell of offlineWells) {
        try {
          console.log('Синхронизация скважины:', offlineWell);

          const wellData = {
            name: offlineWell.name,
            area: offlineWell.area,
            structure: offlineWell.structure,
            design_depth: parseFloat(offlineWell.design_depth)
          };

          console.log('Отправляемые данные:', wellData);

          const newWell = await this.api.createWell(wellData);
          console.log('Ответ сервера после создания скважины:', newWell);

          // Заменяем оффлайн скважину на серверную версию
          const index = this.wells.findIndex(w => w.id === offlineWell.id);
          if (index !== -1) {
            this.wells[index] = newWell;
            syncedCount++;
            console.log(`Скважина "${offlineWell.name}" успешно синхронизирована. Новый ID: ${newWell.id}`);
          }

        } catch (error) {
          console.error(`Ошибка синхронизации скважины ${offlineWell.name}:`, error);
          errors.push(`${offlineWell.name}: ${error.message}`);
        }
      }

      // Сохраняем обновленный список
      await this.saveOfflineWells();

      let message = `Успешно синхронизировано ${syncedCount} из ${offlineWells.length} скважин`;
      if (errors.length > 0) {
        message += `\n\nОшибки:\n${errors.join('\n')}`;
      }

      alert(message);
      this.showWellsList();

    } catch (error) {
      console.error('Общая ошибка синхронизации:', error);
      alert('Общая ошибка синхронизации: ' + error.message);
    } finally {
      // Восстанавливаем кнопку
      syncBtn.textContent = originalText;
      syncBtn.disabled = false;
    }
  }

  showWellDetails(wellId) {
    const well = this.wells.find(w => w.id == wellId);
    if (!well) return;

    const html = `
            <div class="component">
                <h2>${well.name}</h2>
                <div class="well-details">
                    <p><strong>Участок:</strong> ${well.area}</p>
                    <p><strong>Сооружение:</strong> ${well.structure}</p>
                    <p><strong>Проектная глубина:</strong> ${well.design_depth} м</p>
                    <p><strong>Статус:</strong> ${well.isOffline ? 'Оффлайн' : 'Синхронизировано'}</p>
                </div>
                <div class="form-actions">
                    <button id="back-btn" class="btn btn-secondary">Назад к списку</button>
                </div>
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.showWellsList();
    });
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
  const wellManager = new WellManager();
  const connection = new ConnectionManager();

  // Связываем менеджер скважин с менеджером соединения
  connection.setWellManager(wellManager);

  wellManager.init().catch(error => {
    console.error('Ошибка инициализации WellManager:', error);
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
                <div class="component">
                    <h2>Ошибка загрузки</h2>
                    <p>Не удалось загрузить данные: ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Обновить страницу</button>
                </div>
            `;
    }
  });

  console.log('Буровой журнал инициализирован');
});