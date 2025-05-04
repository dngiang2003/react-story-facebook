class NotificationSystem {
  constructor() {
    this.container = null;
    this.queue = [];
    this.isProcessing = false;
    this.maxVisible = 5; // Số lượng thông báo tối đa hiển thị cùng lúc

    this.init();
  }

  init() {
    // Thêm styles vào document
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
          @import url(https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&amp;display=swap);

          .notification-container {
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 1000;
              display: flex;
              flex-direction: column;
              align-items: center;
              pointer-events: none;
          }

          .notification {
              padding: 10px 18px;
              border-radius: 4px;
              margin-bottom: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              display: flex;
              align-items: center;
              background-color: white;
              min-width: 200px;
              position: relative;
              pointer-events: all;
              
              opacity: 0;
              transform: scale(0.8);
              transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .notification.show {
              opacity: 1;
              transform: scale(1);
          }

          // .notification.success { border-left: 4px solid #18a058; }
          // .notification.warning { border-left: 4px solid #f0a020; }
          // .notification.error { border-left: 4px solid #e11d48; }
          // .notification.info { border-left: 4px solid #2080f0; }

          .notification-icon {
              margin-right: 12px;
              display: flex;
              align-items: center;
          }

          .notification-icon svg {
              width: 24px;
              height: 24px;
          }

          .notification-message {
            flex-grow: 1;
            font-family: 'Be Vietnam Pro', sans-serif !important;
            font-weight: 500;
            font-size: 15px;
            color: #272727;
          }

          .notification.fade-out {
              opacity: 0;
              transform: scale(0.8);
              margin-top: -${this.getNotificationHeight()}px;
          }
      `;
    document.head.appendChild(styleSheet);

    // Tạo container
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  getNotificationHeight() {
    return 74; // 16px padding top/bottom + 32px content height + 10px margin
  }

  // SVG icons
  static ICONS = {
    success: `<svg viewBox="-0.24 -0.24 24.48 24.48" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_iconCarrier"><path d="M12 2C6.4898 2 2 6.4898 2 12C2 17.5102 6.4898 22 12 22C17.5102 22 22 17.5102 22 12C22 6.4898 17.5102 2 12 2ZM15.5714 10.4694L11.4898 14.551C11.2857 14.6531 11.1837 14.7551 10.9796 14.7551C10.7755 14.7551 10.5714 14.6531 10.4694 14.551L8.42857 12.5102C8.12245 12.2041 8.12245 11.6939 8.42857 11.3878C8.73469 11.0816 9.2449 11.0816 9.55102 11.3878L11.0816 12.9184L14.6531 9.34694C14.9592 9.04082 15.4694 9.04082 15.7755 9.34694C15.8776 9.7551 15.8776 10.1633 15.5714 10.4694Z" fill="#28c37a"></path></g></svg>`,
    warning: `<svg viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="add" fill="#f3a359" transform="translate(32.000000, 42.666667)"><path d="M246.312928,5.62892705 C252.927596,9.40873724 258.409564,14.8907053 262.189374,21.5053731 L444.667042,340.84129 C456.358134,361.300701 449.250007,387.363834 428.790595,399.054926 C422.34376,402.738832 415.04715,404.676552 407.622001,404.676552 L42.6666667,404.676552 C19.1025173,404.676552 7.10542736e-15,385.574034 7.10542736e-15,362.009885 C7.10542736e-15,354.584736 1.93772021,347.288125 5.62162594,340.84129 L188.099293,21.5053731 C199.790385,1.04596203 225.853517,-6.06216498 246.312928,5.62892705 Z M224,272 C208.761905,272 197.333333,283.264 197.333333,298.282667 C197.333333,313.984 208.415584,325.248 224,325.248 C239.238095,325.248 250.666667,313.984 250.666667,298.624 C250.666667,283.264 239.238095,272 224,272 Z M245.333333,106.666667 L202.666667,106.666667 L202.666667,234.666667 L245.333333,234.666667 L245.333333,106.666667 Z"></path></g></g></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="#e11d48"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 17C11.45 17 11 16.55 11 16V12C11 11.45 11.45 11 12 11C12.55 11 13 11.45 13 12V16C13 16.55 12.55 17 12 17ZM13 9H11V7H13V9Z" fill="#2080f0"/></svg>`,
  };

  createNotificationElement(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
          <span class="notification-icon">${NotificationSystem.ICONS[type]}</span>
          <span class="notification-message">${message}</span>
      `;
    return notification;
  }

  addToQueue(type, message) {
    this.queue.push({ type, message });
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (
      this.queue.length > 0 &&
      this.container.children.length < this.maxVisible
    ) {
      const { type, message } = this.queue.shift();
      this.showNotification(type, message);
    }

    this.isProcessing = false;
  }

  async showNotification(type, message) {
    return new Promise((resolve) => {
      const notification = this.createNotificationElement(type, message);
      this.container.appendChild(notification);

      // Trigger reflow
      notification.offsetHeight;

      // Show animation
      requestAnimationFrame(() => {
        notification.classList.add('show');
      });

      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          if (this.container.contains(notification)) {
            this.container.removeChild(notification);
          }
          resolve();
          this.processQueue();
        }, 500);
      }, 2500);
    });
  }
}

// Khởi tạo và export instance
const notificationSystem = new NotificationSystem();

// Các hàm helper
function showSuccess(message) {
  notificationSystem.addToQueue('success', message);
}

function showWarning(message) {
  notificationSystem.addToQueue('warning', message);
}

function showError(message) {
  notificationSystem.addToQueue('error', message);
}

function showInfo(message) {
  notificationSystem.addToQueue('info', message);
}

// Đảm bảo các hàm có thể truy cập từ phạm vi toàn cục
window.showSuccess = showSuccess;
window.showWarning = showWarning;
window.showError = showError;
window.showInfo = showInfo;
