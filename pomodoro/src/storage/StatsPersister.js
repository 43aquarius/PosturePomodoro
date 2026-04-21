/**
 * StatsPersister - 数据统计持久化
 */
import { db } from './Database.js';
import { bus } from '../core/EventBus.js';

export class StatsPersister {
    constructor() {
        this._postureBuffer = [];
        this._postureFlushInterval = null;

        bus.on('timer:complete', (data) => this._savePomodoro(data));
        bus.on('posture:score', (data) => this._bufferPosture(data));
    }

    start() {
        // 每分钟写入一次姿态日志
        this._postureFlushInterval = setInterval(() => this._flushPosture(), 60000);
    }

    stop() {
        clearInterval(this._postureFlushInterval);
        this._flushPosture();
    }

    async _savePomodoro(data) {
        try {
            await db.add('pomodoros', {
                date: new Date().toISOString(),
                dateKey: new Date().toLocaleDateString('zh-CN'),
                duration: data.duration,
                completed: true,
                postureScore: data.postureScore ?? 80,
                count: data.count
            });
        } catch(e) { console.warn('[Stats] save pomodoro failed', e); }
    }

    _bufferPosture(data) {
        this._postureBuffer.push({ ...data, t: Date.now() });
    }

    async _flushPosture() {
        if (!this._postureBuffer.length) return;
        const avg = this._postureBuffer.reduce((s, x) => s + x.score, 0) / this._postureBuffer.length;
        const issues = {};
        this._postureBuffer.forEach(p => {
            p.issues?.forEach(i => { issues[i.type] = (issues[i.type] || 0) + 1; });
        });
        this._postureBuffer = [];
        try {
            await db.add('posture_logs', {
                timestamp: Date.now(),
                dateKey: new Date().toLocaleDateString('zh-CN'),
                score: Math.round(avg),
                issues
            });
        } catch(e) {}
    }

    async getTodayStats() {
        const dateKey = new Date().toLocaleDateString('zh-CN');
        const pomodoros = (await db.getAll('pomodoros')).filter(p => p.dateKey === dateKey);
        const postureLogs = (await db.getAll('posture_logs')).filter(p => p.dateKey === dateKey);
        const avgPosture = postureLogs.length
            ? Math.round(postureLogs.reduce((s, x) => s + x.score, 0) / postureLogs.length)
            : 0;
        return {
            pomodoroCount: pomodoros.length,
            totalWorkTime: pomodoros.length * 25,
            avgPostureScore: avgPosture,
            postureLogs
        };
    }

    async getWeekStats() {
        const all = await db.getAll('pomodoros');
        const now = Date.now();
        const week = all.filter(p => now - new Date(p.date).getTime() < 7 * 86400000);
        const byDay = {};
        week.forEach(p => {
            const d = new Date(p.date).toLocaleDateString('zh-CN');
            byDay[d] = (byDay[d] || 0) + 1;
        });
        return byDay;
    }
}
