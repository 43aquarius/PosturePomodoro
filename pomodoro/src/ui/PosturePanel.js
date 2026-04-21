/**
 * PosturePanel - 姿态面板 UI
 */
import { bus } from '../core/EventBus.js';

export class PosturePanel {
    constructor() {
        this._el = {
            score: document.getElementById('posture-score'),
            level: document.getElementById('posture-level'),
            ring: document.getElementById('posture-ring'),
            issues: document.getElementById('score-issues'),
            presenceText: document.getElementById('presence-text'),
            hudDot: document.getElementById('hud-dot'),
            gestureHint: document.getElementById('gesture-hint'),
            toast: document.getElementById('posture-toast')
        };
        this._currentScore = 100;
        this._setupListeners();
    }

    _setupListeners() {
        bus.on('posture:score', (data) => this._updateScore(data));
        bus.on('presence:change', ({ status }) => this._updatePresence(status));
        bus.on('gesture:detected', (data) => this._updateGesture(data));
        bus.on('remind:posture', ({ message, level }) => this._showToast(message, level));
        bus.on('remind:rest', ({ message }) => this._showToast(message, 'rest'));
    }

    _updateScore({ score, issues, level }) {
        this._currentScore = score;
        if (this._el.score) this._animateNumber(this._el.score, score);
        if (this._el.level) {
            this._el.level.textContent = level.text;
            this._el.level.style.color = level.color;
        }
        if (this._el.ring) {
            const circumference = 2 * Math.PI * 35;
            const offset = circumference * (1 - score / 100);
            this._el.ring.style.strokeDashoffset = offset;
            this._el.ring.style.stroke = level.color;
        }
        if (this._el.issues) {
            if (issues.length === 0) {
                this._el.issues.innerHTML = '<div class="issue-tag ok">坐姿完美</div>';
            } else {
                this._el.issues.innerHTML = issues.map(issue =>
                    `<div class="issue-tag">${this._issueIcon(issue.type)} ${issue.text}</div>`
                ).join('');
            }
        }
    }

    _updatePresence(status) {
        const dot = this._el.hudDot;
        const text = this._el.presenceText;
        if (!dot || !text) return;
        dot.classList.remove('on', 'warn');
        if (status === 'present') {
            dot.classList.add('on');
            text.textContent = '检测到你';
        } else if (status === 'absent') {
            dot.classList.add('warn');
            text.textContent = '你离开了';
        } else {
            text.textContent = '检测中...';
        }
    }

    _updateGesture(data) {
        const el = this._el.gestureHint;
        if (!el) return;
        el.textContent = data.label;
        el.classList.remove('hidden');
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
    }

    _showToast(message, level) {
        const el = this._el.toast;
        if (!el) return;
        el.textContent = message;
        el.className = 'posture-toast show' + (level === 'high' || level === 'medium' ? ' warn' : level === 'rest' ? ' rest' : '');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
    }

    _animateNumber(el, target) {
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;
        const step = target > current ? 1 : -1;
        const delay = Math.abs(target - current) > 5 ? 20 : 50;
        let n = current;
        const animate = () => {
            n += step;
            el.textContent = n;
            if (n !== target) setTimeout(animate, delay);
        };
        setTimeout(animate, delay);
    }

    _issueIcon(type) {
        const icons = {
            hunching: '🪑', neck_forward: '↩️',
            shoulder_imbalance: '⚖️', shoulder_shrug: '🤷',
            drowsy: '😴', tense: '😬', stiff: '🗿'
        };
        return icons[type] || '⚠️';
    }
}
