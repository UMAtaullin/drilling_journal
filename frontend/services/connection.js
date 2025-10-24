export class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.statusElement = document.getElementById('connection-status');
    this.initEventListeners();
    this.updateUI();
  }

  initEventListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    this.isOnline = true;
    this.updateUI();
    // Здесь позже добавим синхронизацию
  }

  handleOffline() {
    this.isOnline = false;
    this.updateUI();
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

  async init() {
    // Инициализация базы данных и других сервисов
    console.log('Connection manager initialized');
  }
}