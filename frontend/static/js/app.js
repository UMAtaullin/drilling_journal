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
    this.wells = [];
    this.localStorageKey = 'drilling_wells_offline';
    this.api = new APIService();
    this.init();
    // this.currentView = 'list';
  }

  async init() {
    await this.loadWells();
    this.showWellsList();
  }

  async loadWells() {
    try {
      if (navigator.onLine) {
        console.log('Пытаемся загрузить данные с сервера...');
        const serverWells = await this.api.getWells();
        console.log('Данные с сервера загружены:', serverWells);

        const offlineWells = this.getOfflineWells();
        this.wells = this.mergeWells(serverWells, offlineWells);
        this.saveWells();
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

  async saveWells() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.wells));
    console.log('Сохранено скважин:', this.wells.length);
  }

  mergeWells(serverWells, offlineWells) {
    const merged = [...serverWells];

    offlineWells.forEach(offlineWell => {
      if (offlineWell.id && offlineWell.id.toString().startsWith('offline_')) {
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

  saveOfflineWells() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.wells));
  }

  getLithologyName(code) {
    const lithologies = {
      'PRS': 'ПРС',
      'PEAT': 'Торф',
      'LOAM': 'Суглинок',
      'SANDY_LOAM': 'Супесь',
      'SAND': 'Песок'
    };
    return lithologies[code] || code;
  }

  async saveWellsToLocalStorage() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.wells));
  }

  setupEventListeners() {
    // Обработчики будут добавляться динамически
  }

  showWellsList() {
    // Сортируем скважины: сначала новые (по ID в обратном порядке)
    const sortedWells = [...this.wells].sort((a, b) => b.id - a.id);

    const html = `
        <div class="component">
            <div class="list-header">
                <h2>Список скважин</h2>
                <button id="create-well-btn" class="btn btn-primary btn-large">
                    ➕ Создать скважину
                </button>
            </div>
            
            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-number">${this.wells.length}</span>
                    <span class="stat-label">Всего скважин</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${this.wells.reduce((total, well) => total + (well.layers ? well.layers.length : 0), 0)}</span>
                    <span class="stat-label">Всего слоев</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${this.wells.filter(w => w.id && w.id.toString().startsWith('offline_')).length}</span>
                    <span class="stat-label">Оффлайн</span>
                </div>
            </div>
            
            <div class="wells-list">
                ${sortedWells.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>Нет созданных скважин</h3>
                        <p>Создайте первую скважину чтобы начать работу</p>
                        <button id="create-first-well" class="btn btn-primary">Создать первую скважину</button>
                    </div>
                ` : sortedWells.map(well => `
                    <div class="well-card ${well.id && well.id.toString().startsWith('offline_') ? 'offline' : ''}" data-well-id="${well.id}">
                        <div class="well-card-header">
                            <h3 class="well-name">${well.name}</h3>
                            <span class="well-status ${well.id && well.id.toString().startsWith('offline_') ? 'status-offline' : 'status-online'}">
                                ${well.id && well.id.toString().startsWith('offline_') ? 'ОФФЛАЙН' : 'ОНЛАЙН'}
                            </span>
                        </div>
                        
                        <div class="well-info-grid">
                            <div class="info-item">
                                <span class="label">Участок:</span>
                                <span class="value">${well.area}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Сооружение:</span>
                                <span class="value">${well.structure}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Глубина:</span>
                                <span class="value">${well.design_depth} м</span>
                            </div>
                        </div>
                        
                        ${well.layers && well.layers.length > 0 ? `
                            <div class="layers-summary">
                                <div class="summary-header">
                                    <span class="layers-count">${well.layers.length} слоев</span>
                                    <span class="total-thickness">Общая мощность: ${well.layers.reduce((sum, layer) => sum + parseFloat(layer.thickness), 0).toFixed(2)} м</span>
                                </div>
                                <div class="layers-preview">
                                    ${well.layers.slice(0, 2).map(layer => `
                                        <div class="layer-preview-item">
                                            <span class="depth-range">${layer.start_depth}–${layer.end_depth} м</span>
                                            <span class="lithology ${layer.lithology}">${this.getLithologyName(layer.lithology)}</span>
                                            <span class="thickness">${layer.thickness} м</span>
                                        </div>
                                    `).join('')}
                                    ${well.layers.length > 2 ? `
                                        <div class="more-layers">+${well.layers.length - 2} еще</div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : `
                            <div class="no-layers-notice">
                                <span class="icon">🔄</span>
                                <span>Нет добавленных слоев</span>
                            </div>
                        `}
                        
                        <div class="well-card-actions">
                            <button class="btn-action btn-view" data-well-id="${well.id}">
                                👁️ Просмотр
                            </button>
                            <button class="btn-action btn-add-layer" data-well-id="${well.id}">
                                ➕ Слои
                            </button>
                            ${navigator.onLine && well.id && well.id.toString().startsWith('offline_') ? `
                                <button class="btn-action btn-sync" data-well-id="${well.id}">
                                    🔄 Синхр.
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${this.wells.filter(w => w.id && w.id.toString().startsWith('offline_')).length > 0 && navigator.onLine ? `
                <div class="sync-section">
                    <button id="sync-all-btn" class="btn btn-success btn-large">
                        🔄 Синхронизировать все оффлайн скважины (${this.wells.filter(w => w.id && w.id.toString().startsWith('offline_')).length})
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('main-content').innerHTML = html;

    // Обработчики для основных кнопок
    document.getElementById('create-well-btn').addEventListener('click', () => {
      this.showCreateWellForm();
    });

    const createFirstBtn = document.getElementById('create-first-well');
    if (createFirstBtn) {
      createFirstBtn.addEventListener('click', () => {
        this.showCreateWellForm();
      });
    }

    // Обработчики для кнопок на карточках скважин
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wellId = btn.dataset.wellId;
        this.showWellDetails(wellId);
      });
    });

    document.querySelectorAll('.btn-add-layer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wellId = btn.dataset.wellId;
        this.showAddLayerForm(wellId);
      });
    });

    document.querySelectorAll('.btn-sync').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wellId = btn.dataset.wellId;
        this.syncSingleWell(wellId);
      });
    });

    // Обработчик для синхронизации всех
    const syncAllBtn = document.getElementById('sync-all-btn');
    if (syncAllBtn) {
      syncAllBtn.addEventListener('click', () => {
        this.syncOfflineData();
      });
    }

    // Клик по карточке - открывает просмотр
    document.querySelectorAll('.well-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-action')) {
          const wellId = card.dataset.wellId;
          this.showWellDetails(wellId);
        }
      });
    });
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
  // Добавляем этот метод в класс WellManager (после метода deleteLayer)
  async syncSingleWell(wellId) {
    if (!navigator.onLine) {
      alert('Нет интернет-соединения для синхронизации');
      return;
    }

    const well = this.wells.find(w => w.id === wellId);
    if (!well) {
      alert('Скважина не найдена');
      return;
    }

    try {
      const wellData = {
        name: well.name,
        area: well.area,
        structure: well.structure,
        design_depth: parseFloat(well.design_depth)
      };

      console.log('Синхронизация одной скважины:', wellData);
      const newWell = await this.api.createWell(wellData);
      console.log('Сервер ответил:', newWell);

      // Заменяем оффлайн скважину на серверную версию
      const index = this.wells.findIndex(w => w.id === wellId);
      if (index !== -1) {
        this.wells[index] = newWell;
        await this.saveWells();
        alert(`Скважина "${well.name}" успешно синхронизирована!`);
        this.showWellsList();
      }
    } catch (error) {
      console.error('Ошибка синхронизации скважины:', error);
      alert('Ошибка синхронизации: ' + error.message);
    }
  }

  // Обновляем метод syncOfflineData (исправляем ошибку с textContent)
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

    // Показываем индикатор загрузки более безопасным способом
    const syncAllBtn = document.getElementById('sync-all-btn');
    if (syncAllBtn) {
      const originalText = syncAllBtn.textContent;
      syncAllBtn.textContent = '🔄 Синхронизация...';
      syncAllBtn.disabled = true;
    }

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

          const newWell = await this.api.createWell(wellData);
          console.log('Сервер ответил:', newWell);

          // Заменяем оффлайн скважину на серверную версию
          const index = this.wells.findIndex(w => w.id === offlineWell.id);
          if (index !== -1) {
            this.wells[index] = newWell;
            syncedCount++;
          }

        } catch (error) {
          console.error(`Ошибка синхронизации скважины ${offlineWell.name}:`, error);
          errors.push(`${offlineWell.name}: ${error.message}`);
        }
      }

      // Сохраняем обновленный список
      await this.saveWells();

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
      // Восстанавливаем кнопку безопасным способом
      const syncAllBtn = document.getElementById('sync-all-btn');
      if (syncAllBtn) {
        syncAllBtn.textContent = `🔄 Синхронизировать все оффлайн скважины (${this.wells.filter(w => w.id && w.id.toString().startsWith('offline_')).length})`;
        syncAllBtn.disabled = false;
      }
    }
  }

  // Добавляем метод для быстрого добавления слоев (после syncSingleWell)
  showAddLayerForm(wellId) {
    const well = this.wells.find(w => w.id === wellId);
    if (!well) return;

    // Определяем следующую доступную глубину
    let nextStartDepth = 0;
    if (well.layers && well.layers.length > 0) {
      const lastLayer = well.layers[well.layers.length - 1];
      nextStartDepth = parseFloat(lastLayer.end_depth);
    }

    const html = `
            <div class="component">
                <div class="form-header">
                    <h2>Добавить слой к скважине: ${well.name}</h2>
                    <button id="back-to-well" class="btn btn-secondary">← Назад к скважине</button>
                </div>
                
                <form id="quick-layer-form" class="quick-layer-form">
                    <div class="depth-inputs">
                        <div class="form-group">
                            <label for="quick-start-depth">Начало слоя (м)</label>
                            <input type="number" id="quick-start-depth" step="0.01" min="0" 
                                   value="${nextStartDepth}" readonly>
                            <small>Автоматически рассчитывается</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="quick-end-depth">Конец слоя (м) *</label>
                            <input type="number" id="quick-end-depth" step="0.01" min="${nextStartDepth + 0.01}" 
                                   max="${well.design_depth}" required 
                                   placeholder="Введите глубину...">
                            <small>Макс: ${well.design_depth} м</small>
                        </div>
                    </div>
                    
                    <div class="lithology-buttons">
                        <label>Литология *</label>
                        <div class="button-group">
                            <button type="button" class="litho-btn active" data-lithology="PRS">ПРС</button>
                            <button type="button" class="litho-btn" data-lithology="PEAT">Торф</button>
                            <button type="button" class="litho-btn" data-lithology="LOAM">Суглинок</button>
                            <button type="button" class="litho-btn" data-lithology="SANDY_LOAM">Супесь</button>
                            <button type="button" class="litho-btn" data-lithology="SAND">Песок</button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="quick-description">Описание (необязательно)</label>
                        <textarea id="quick-description" rows="2" placeholder="Дополнительное описание слоя"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-success btn-large">✅ Добавить слой</button>
                    </div>
                </form>
                
                ${well.layers && well.layers.length > 0 ? `
                    <div class="existing-layers">
                        <h3>Существующие слои</h3>
                        <div class="layers-list">
                            ${well.layers.map(layer => `
                                <div class="layer-item">
                                    <div class="layer-info">
                                        <strong>${layer.start_depth} - ${layer.end_depth} м</strong>
                                        <span class="lithology-badge ${layer.lithology}">${this.getLithologyName(layer.lithology)}</span>
                                        <span class="thickness">${layer.thickness} м</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    // Обработчик для кнопки назад
    document.getElementById('back-to-well').addEventListener('click', () => {
      this.showWellDetails(wellId);
    });

    // Обработчики для кнопок литологии
    let selectedLithology = 'PRS';
    document.querySelectorAll('.litho-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.litho-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLithology = btn.dataset.lithology;
      });
    });

    // Обработчик формы
    document.getElementById('quick-layer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addLayerQuick(wellId, selectedLithology);
    });

    // Автофокус на поле конечной глубины
    document.getElementById('quick-end-depth').focus();
  }

  // Метод для быстрого добавления слоя
  addLayerQuick(wellId, lithology) {
    const well = this.wells.find(w => w.id === wellId);
    if (!well) return;

    const startDepth = parseFloat(document.getElementById('quick-start-depth').value);
    const endDepth = parseFloat(document.getElementById('quick-end-depth').value);
    const description = document.getElementById('quick-description').value.trim();

    // Валидация
    if (!endDepth) {
      alert('Пожалуйста, укажите конечную глубину');
      return;
    }

    if (endDepth <= startDepth) {
      alert('Конечная глубина должна быть больше начальной');
      return;
    }

    if (endDepth > well.design_depth) {
      alert('Конечная глубина не может превышать проектную глубину скважины');
      return;
    }

    // Проверка перекрытия слоев
    if (well.layers) {
      const isOverlapping = well.layers.some(layer =>
        (startDepth < layer.end_depth && endDepth > layer.start_depth)
      );

      if (isOverlapping) {
        alert('Слой перекрывается с существующими слоями');
        return;
      }
    }

    const layer = {
      id: Date.now().toString(),
      start_depth: startDepth,
      end_depth: endDepth,
      lithology: lithology,
      description: description,
      thickness: (endDepth - startDepth).toFixed(2)
    };

    if (!well.layers) well.layers = [];
    well.layers.push(layer);

    // Сортируем слои по глубине
    well.layers.sort((a, b) => a.start_depth - b.start_depth);

    this.saveWells();
    alert(`Слой ${startDepth}-${endDepth} м добавлен успешно!`);

    // Если осталось место, предлагаем добавить следующий слой
    const remainingDepth = well.design_depth - endDepth;
    if (remainingDepth > 0.1) {
      if (confirm(`Добавить следующий слой? Осталось ${remainingDepth.toFixed(2)} м`)) {
        this.showAddLayerForm(wellId);
      } else {
        this.showWellDetails(wellId);
      }
    } else {
      alert('Достигнута проектная глубина скважины!');
      this.showWellDetails(wellId);
    }
  }
  // Добавляем метод showWellDetails если его нет
  showWellDetails(wellId) {
    const well = this.wells.find(w => w.id === wellId);
    if (!well) return;

    // Простая версия для тестирования
    const html = `
            <div class="component">
                <div class="well-details-header">
                    <h2>${well.name}</h2>
                    <button id="back-btn" class="btn btn-secondary">← Назад к списку</button>
                </div>
                
                <div class="well-info">
                    <p><strong>Участок:</strong> ${well.area}</p>
                    <p><strong>Сооружение:</strong> ${well.structure}</p>
                    <p><strong>Проектная глубина:</strong> ${well.design_depth} м</p>
                    <p><strong>Статус:</strong> ${well.id && well.id.toString().startsWith('offline_') ? 'Оффлайн' : 'Синхронизировано'}</p>
                </div>
                
                <div class="action-buttons">
                    <button id="add-layers-btn" class="btn btn-success">➕ Добавить слои</button>
                    <button id="back-to-list" class="btn btn-secondary">Назад к списку</button>
                </div>
            </div>
        `;

    document.getElementById('main-content').innerHTML = html;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.showWellsList();
    });

    document.getElementById('back-to-list').addEventListener('click', () => {
      this.showWellsList();
    });

    document.getElementById('add-layers-btn').addEventListener('click', () => {
      this.showAddLayerForm(wellId);
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