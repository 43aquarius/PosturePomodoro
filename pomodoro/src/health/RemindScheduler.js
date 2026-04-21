/**
 * RemindScheduler - 提醒调度器 (渐进式)
 */
import { bus } from '../core/EventBus.js';
import { audio } from '../utils/AudioPlayer.js';

const POSTURE_REMINDERS = {
    hunching: ['腰挺直，别弓着', '背挺起来！', '驼背会变矮的', '坐直了，帅/美一点'],
    neck_forward: ['脖子往回收收', '别伸着脖子', '颈椎要抗议了', '头往后靠靠'],
    shoulder_imbalance: ['两肩要平齐', '别歪着肩膀', '保持肩部平衡'],
    shoulder_shrug: ['肩膀放松点', '别耸肩，不紧张', '肩膀沉下来', '深呼吸，放松'],
    drowsy: ['别睡了，起来活动活动 😴', '快醒醒，加把劲！'],
    tense: ['肩膀放松', '深呼吸', '别太紧绷'],
    stiff: ['动一动，别当雕塑 🗿', '活动活动筋骨', '起来走走？']
};

export class RemindScheduler {
    constructor() {
        this._issueTimers = new Map();
        this._lastRemindTime = new Map();
        this._cooldown = 60000; // 同类提醒最少间隔60秒

        bus.on('posture:score', ({ issues }) => this._onPostureScore(issues));
        bus.on('posture:fatigue', ({ alerts }) => this._onFatigue(alerts));
        bus.on('timer:rest:start', () => this._onRestStart());
        bus.on('rest:warning', (data) => this._onRestWarning(data));
    }

    _onPostureScore(issues) {
        if (!issues || !issues.length) return;

        issues.forEach(issue => {
            const key = issue.type;
            if (!this._issueTimers.has(key)) {
                // 开始计时
                this._issueTimers.set(key, { start: Date.now(), severity: issue.severity });
            } else {
                const timer = this._issueTimers.get(key);
                const duration = Date.now() - timer.start;

                // 持续超过30秒才提醒
                if (duration > 30000) {
                    this._remind(key, issue.severity > 30 ? 'medium' : 'low');
                }
            }
        });

        // 清除已修正的问题
        for (const key of this._issueTimers.keys()) {
            if (!issues.find(i => i.type === key)) {
                this._issueTimers.delete(key);
            }
        }
    }

    _onFatigue(alerts) {
        alerts.forEach(alert => {
            this._remind(alert.type, alert.severity);
        });
    }

    _remind(type, level = 'low') {
        const now = Date.now();
        const lastTime = this._lastRemindTime.get(type) || 0;
        if (now - lastTime < this._cooldown) return;

        this._lastRemindTime.set(type, now);

        const messages = POSTURE_REMINDERS[type] || ['注意坐姿'];
        const message = messages[Math.floor(Math.random() * messages.length)];

        bus.emit('remind:posture', { type, message, level });

        // 渐进式: low→视觉, medium→视觉+声音, high→视觉+声音+通知
        if (level === 'medium' || level === 'high') {
            audio.reminder();
        }
        if (level === 'high') {
            this._notify('姿态提醒', message);
        }
    }

    _onRestStart() {
        this._issueTimers.clear();
    }

    _onRestWarning({ level, message }) {
        if (level >= 2) audio.warning();
    }

    _notify(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/assets/icon.png', silent: true });
        }
    }
}
