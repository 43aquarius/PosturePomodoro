/**
 * TimerDisplay - 计时器 UI 控制
 */
import { bus } from '../core/EventBus.js';
import { STATES } from '../core/StateMachine.js';

const COMPLETION_MESSAGES = [
    '干得漂亮', '又干掉一个', '效率可以', '保持节奏', '状态不错',
    '牛，继续', '一鼓作气', '这波稳了'
];

const ENCOURAGEMENTS = [
    '加油，你可以的', '今天状态真好', '继续保持专注',
    '离目标又近一步', '你就是最棒的', '坚持就是胜利', '别放弃，快到了'
];

export class TimerDisplay {
    constructor() {
        this._el = {
            minutes: document.getElementById('timer-minutes'),
            seconds: document.getElementById('timer-seconds'),
            progress: document.getElementById('timer-progress-fill'),
            progressRing: document.getElementById('timer-ring'),
            eyebrow: document.getElementById('timer-eyebrow'),
            statePill: document.getElementById('state-pill'),
            count: document.getElementById('pomodoro-count'),
            countToday: document.getElementById('count-today')
        };
        this._lastDigits = { m0: -1, m1: -1, s0: -1, s1: -1 };
        this._count = 0;
        this._setupListeners();
    }

    _setupListeners() {
        bus.on('timer:tick', ({ remaining, progress, state }) => {
            this._updateTime(remaining);
            this._updateProgress(progress, state);
        });

        bus.on('state:change', ({ curr }) => this._updateState(curr));

        bus.on('timer:complete', ({ count }) => {
            this._count = count;
            this._updateCount(count);
            const msg = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
            this._showCelebration(msg);
        });

        bus.on('gesture:action', ({ action }) => {
            if (action === 'encourage') {
                const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
                this._showEncouragement(msg);
            }
        });

        bus.on('timer:reset', () => {
            this._updateTime(25 * 60);
            this._updateProgress(0, STATES.IDLE);
        });
    }

    _updateTime(remaining) {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        const digits = {
            m0: Math.floor(m / 10), m1: m % 10,
            s0: Math.floor(s / 10), s1: s % 10
        };
        const mStr = String(m).padStart(2, '0');
        const sStr = String(s).padStart(2, '0');
        if (this._el.minutes) this._el.minutes.textContent = mStr;
        if (this._el.seconds) this._el.seconds.textContent = sStr;
        this._lastDigits = digits;
    }

    _updateProgress(progress, state) {
        const pct = Math.round(progress * 100);
        if (this._el.progress) this._el.progress.style.width = `${pct}%`;
        if (this._el.progressRing) {
            const circumference = 2 * Math.PI * 33;
            const offset = circumference * (1 - progress);
            this._el.progressRing.style.strokeDashoffset = offset;
        }
    }

    _updateState(state) {
        const cfg = {
            [STATES.IDLE]:  { label: '准备好了吗', tag: '待机', cls: 'state-idle' },
            [STATES.WORK]:  { label: '还能撑多久', tag: '专注中', cls: 'state-work' },
            [STATES.REST]:  { label: '好好歇歇', tag: '休息中', cls: 'state-rest' },
            [STATES.PAUSE]: { label: '暂时停一下', tag: '已暂停', cls: 'state-pause' },
        };
        const c = cfg[state] || cfg[STATES.IDLE];
        if (this._el.eyebrow) this._el.eyebrow.textContent = c.label;
        if (this._el.statePill) {
            this._el.statePill.innerHTML = `<span></span>${c.tag}`;
            this._el.statePill.className = `state-pill ${c.cls}`;
        }
        document.body.dataset.state = state;
    }

    _updateCount(count) {
        if (this._el.count) this._el.count.textContent = '🍅'.repeat(Math.min(count % 4 || 4, 4));
        if (this._el.countToday) this._el.countToday.textContent = `今日 ${count} 个`;
    }

    _showCelebration(msg) {
        const el = document.getElementById('celebration');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('off');
        el.classList.add('on');
        setTimeout(() => {
            el.classList.remove('on');
            el.classList.add('off');
        }, 2500);
    }

    _showEncouragement(msg) {
        const el = document.getElementById('encouragement');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('off');
        el.classList.add('on');
        setTimeout(() => {
            el.classList.remove('on');
            el.classList.add('off');
        }, 3000);
    }
}
