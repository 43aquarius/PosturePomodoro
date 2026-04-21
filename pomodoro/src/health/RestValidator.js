/**
 * RestValidator - 休息有效性验证
 */
import { bus } from '../core/EventBus.js';

export class RestValidator {
    constructor() {
        this.presentDuration = 0;
        this.absentDuration = 0;
        this._interval = null;
        this._restStart = null;
        this._totalRestTime = 300;

        bus.on('timer:rest:start', ({ duration }) => this._start(duration));
        bus.on('timer:rest:complete', () => this._stop());
        bus.on('timer:rest:skip', () => this._stop());
        bus.on('presence:change', ({ status }) => this._onPresence(status));
    }

    _start(duration) {
        this.presentDuration = 0;
        this.absentDuration = 0;
        this._restStart = Date.now();
        this._totalRestTime = duration;
        this._interval = setInterval(() => this._check(), 3000);
    }

    _stop() {
        clearInterval(this._interval);
        const score = this.getRestScore();
        bus.emit('rest:score', { score, absentDuration: this.absentDuration });
    }

    _onPresence(status) {
        if (status === 'present') {
            this.presentDuration += 3;
            this.absentDuration = Math.max(0, this.absentDuration);
        } else {
            this.absentDuration += 3;
            this.presentDuration = 0;
        }
    }

    _check() {
        const elapsed = (Date.now() - this._restStart) / 1000;
        const remaining = this._totalRestTime - elapsed;

        if (this.presentDuration > 0) {
            let level = 0, message = '';

            if (remaining < this._totalRestTime * 0.5 && this.presentDuration > 30) {
                level = 1;
                message = this._pickMessage(1);
            }
            if (this.presentDuration > 90) {
                level = 2;
                message = this._pickMessage(2);
            }

            if (level > 0) {
                bus.emit('rest:warning', { level, message, remaining });
                bus.emit('remind:rest', { message, level });
            }
        }
    }

    _pickMessage(level) {
        const msgs = level === 1
            ? ['请离开座位休息', '还坐着干啥？', '说了要离开！']
            : ['休息无效！必须离开', '别赖着不走', '快走，别磨蹭'];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    getRestScore() {
        const pct = Math.min(1, this.absentDuration / this._totalRestTime);
        return Math.round(pct * 100);
    }
}
