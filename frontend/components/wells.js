import { UI } from './ui.js';

export class WellManager {
  constructor() {
    this.wells = [];
  }

  async loadWellsList() {
    const html = `
            <div class="component">
                <h2>Скважины</h2>
                <div id="wells-list">
                    ${this.wells.length === 0 ? '<p>Нет созданных скважин</p>' : ''}
                </div>
            </div>
        `;

    UI.renderComponent(html);

    if (this.wells.length > 0) {
      this.renderWellsList();
    }
  }

  renderWellsList() {
    const wellsList = document.getElementById('wells-list');
    wellsList.innerHTML = this.wells.map(well => `
            <div class="well-item" data-well-id="${well.id}">
                <h3>${well.name}</h3>
                <p>Участок: ${well.area} | Сооружение: ${well.structure}</p>
                <p>Проектная глубина: ${well.design_depth} м</p>
            </div>
        `).join('');

    // Добавляем обработчики кликов
    document.querySelectorAll('.well-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const wellId = e.currentTarget.dataset.wellId;
        this.loadWellDetails(wellId);
      });
    });
  }

  loadWellForm() {
    const html = `
            <div class="component">
                <h2>Новая скважина</h2>
                <form id="well-form">
                    <div class="form-group">
                        <label for="well-name">Название скважины:</label>
                        <input type="text" id="well-name" required>
                    </div>
                    <div class="form-group">
                        <label for="well-area">Участок:</label>
                        <input type="text" id="well-area" required>
                    </div>
                    <div class="form-group">
                        <label for="well-structure">Сооружение:</label>
                        <input type="text" id="well-structure" required>
                    </div>
                    <div class="form-group">
                        <label for="well-depth">Проектная глубина (м):</label>
                        <input type="number" id="well-depth" step="0.01" min="0" max="30" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Создать скважину</button>
                </form>
            </div>
        `;

    UI.renderComponent(html);

    document.getElementById('well-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createWell();
    });
  }

  async createWell() {
    const wellData = {
      name: document.getElementById('well-name').value,
      area: document.getElementById('well-area').value,
      structure: document.getElementById('well-structure').value,
      design_depth: document.getElementById('well-depth').value
    };

    // Пока просто добавляем в массив
    wellData.id = Date.now(); // Временный ID
    this.wells.push(wellData);

    UI.showNotification('Скважина создана успешно', 'success');
    this.loadWellsList();
  }

  loadWellDetails(wellId) {
    const well = this.wells.find(w => w.id == wellId);
    if (!well) return;

    const html = `
            <div class="component">
                <h2>${well.name}</h2>
                <p>Участок: ${well.area} | Сооружение: ${well.structure}</p>
                <p>Проектная глубина: ${well.design_depth} м</p>
                
                <div class="layer-management">
                    <h3>Геологические слои</h3>
                    <form id="layer-form">
                        <div class="form-group">
                            <label for="start-depth">Начало слоя (м):</label>
                            <input type="number" id="start-depth" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="end-depth">Конец слоя (м):</label>
                            <input type="number" id="end-depth" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="lithology">Литология:</label>
                            <select id="lithology" required>
                                <option value="">Выберите литологию</option>
                                <option value="PRS">ПРС</option>
                                <option value="PEAT">Торф</option>
                                <option value="LOAM">Суглинок</option>
                                <option value="SANDY_LOAM">Супесь</option>
                                <option value="SAND">Песок</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="layer-description">Описание:</label>
                            <textarea id="layer-description" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn-success">Добавить слой</button>
                    </form>
                    
                    <div class="layer-list" id="current-layers">
                        ${well.layers && well.layers.length > 0 ?
        well.layers.map(layer => `
                                <div class="layer-item">
                                    ${layer.start_depth}-${layer.end_depth} м: ${this.getLithologyName(layer.lithology)} 
                                    (${layer.thickness} м)
                                </div>
                            `).join('') :
        '<p>Слои не добавлены</p>'
      }
                    </div>
                </div>
            </div>
        `;

    UI.renderComponent(html);

    document.getElementById('layer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addLayer(wellId);
    });
  }

  addLayer(wellId) {
    const layerData = {
      start_depth: parseFloat(document.getElementById('start-depth').value),
      end_depth: parseFloat(document.getElementById('end-depth').value),
      lithology: document.getElementById('lithology').value,
      description: document.getElementById('layer-description').value
    };

    // Расчет мощности
    layerData.thickness = (layerData.end_depth - layerData.start_depth).toFixed(2);

    const well = this.wells.find(w => w.id == wellId);
    if (!well.layers) well.layers = [];
    well.layers.push(layerData);

    // Сортируем слои по глубине
    well.layers.sort((a, b) => a.start_depth - b.start_depth);

    UI.showNotification('Слой добавлен успешно', 'success');
    this.loadWellDetails(wellId);
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
}