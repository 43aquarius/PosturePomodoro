/**
 * ToastNotifier - 吐司通知
 */
export class ToastNotifier {
    constructor() {
        this._container = document.getElementById('toast-stack');
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = 'toast-stack';
            this._container.className = 'toast-stack';
            document.body.appendChild(this._container);
        }
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-item';
        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', reminder: '💆', rest: '🏃' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
        this._container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('in'));

        setTimeout(() => {
            toast.classList.remove('in');
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    success(msg, d) { this.show(msg, 'success', d); }
    warning(msg, d) { this.show(msg, 'warning', d); }
    reminder(msg, d = 4000) { this.show(msg, 'reminder', d); }
    rest(msg, d = 5000) { this.show(msg, 'rest', d); }
    info(msg, d) { this.show(msg, 'info', d); }
}

export const toast = new ToastNotifier();
