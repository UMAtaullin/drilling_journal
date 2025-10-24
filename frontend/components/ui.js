export class UI {
  static renderComponent(html) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = html;
  }

  static showNotification(message, type = 'info') {
    // Простая система уведомлений
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}