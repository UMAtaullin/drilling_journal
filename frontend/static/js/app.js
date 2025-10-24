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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
  const connection = new ConnectionManager();

  document.getElementById('test-btn').addEventListener('click', function () {
    alert('Приложение работает! Статус: ' + (connection.isOnline ? 'ОНЛАЙН' : 'ОФФЛАЙН'));
  });

  console.log('Буровой журнал инициализирован');
});