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
        
        // 计算最佳坐姿和需要改进的时间（每个日志条目代表1分钟）
        let bestPostureTime = 0;
        let needsImprovementTime = 0;
        
        postureLogs.forEach(log => {
            if (log.score >= 80) {
                bestPostureTime += 1;
            } else {
                needsImprovementTime += 1;
            }
        });
        
        return {
            pomodoroCount: pomodoros.length,
            totalWorkTime: pomodoros.length * 25,
            avgPostureScore: avgPosture,
            bestPostureTime,
            needsImprovementTime,
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
        
        // 生成最近7天的日期数组
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toLocaleDateString('zh-CN');
            const day = date.getDate(); // 只获取日期中的"日"部分
            last7Days.push({
                date: day.toString(),
                pomodoroCount: byDay[dateKey] || 0
            });
        }
        
        return last7Days;
    }
}
