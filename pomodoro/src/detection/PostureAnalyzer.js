/**
 * PostureAnalyzer - 姿态分析 (评分 + 疲劳)
 */
import { bus } from '../core/EventBus.js';
import { angle, distance } from '../utils/Geometry.js';

export class PostureAnalyzer {
    constructor() {
        this._scoreHistory = [];
        this._fatigue = new FatigueDetector();
    }

    analyze(landmarks) {
        if (!landmarks || landmarks.length < 25) return null;

        const scoreResult = this._score(landmarks);
        const fatigueAlerts = this._fatigue.detect(landmarks);

        // 维护平均分
        this._scoreHistory.push(scoreResult.score);
        if (this._scoreHistory.length > 60) this._scoreHistory.shift();
        window._postureScoreAvg = Math.round(
            this._scoreHistory.reduce((s, x) => s + x, 0) / this._scoreHistory.length
        );

        bus.emit('posture:score', scoreResult);
        if (fatigueAlerts.length > 0) {
            bus.emit('posture:fatigue', { alerts: fatigueAlerts });
        }
        return { score: scoreResult, fatigue: fatigueAlerts };
    }

    _score(lm) {
        let total = 100;
        const issues = [];

        // 1. 驼背检测
        const hunch = this._checkHunching(lm);
        if (hunch < 80) {
            total -= (80 - hunch) * 0.5;
            issues.push({ type: 'hunching', severity: 80 - hunch, text: '背部前弓' });
        }

        // 2. 颈部前倾
        const neck = this._checkNeck(lm);
        if (neck < 80) {
            total -= (80 - neck) * 0.4;
            issues.push({ type: 'neck_forward', severity: 80 - neck, text: '颈部前倾' });
        }

        // 3. 肩膀高度
        const shoulder = this._checkShoulders(lm);
        if (shoulder < 90) {
            total -= (90 - shoulder) * 0.3;
            issues.push({ type: 'shoulder_imbalance', severity: 90 - shoulder, text: '肩膀不平' });
        }

        // 4. 肩膀耸起
        const shrug = this._checkShoulderShrug(lm);
        if (shrug < 80) {
            total -= (80 - shrug) * 0.3;
            issues.push({ type: 'shoulder_shrug', severity: 80 - shrug, text: '肩膀耸起' });
        }

        const score = Math.max(0, Math.round(total));
        return { score, issues, level: this._level(score) };
    }

    _checkHunching(lm) {
        const nose = lm[0], ls = lm[11], lh = lm[23];
        if (!nose || !ls || !lh) return 100;
        const a = angle(nose, ls, lh);
        return Math.max(0, 100 - Math.abs(a - 170) * 2);
    }

    _checkNeck(lm) {
        const ear = lm[7] || lm[8], shoulder = lm[11];
        if (!ear || !shoulder) return 100;
        const offset = Math.abs(ear.x - shoulder.x);
        if (offset < 0.05) return 100;
        if (offset < 0.10) return 80;
        if (offset < 0.15) return 60;
        return 40;
    }

    _checkShoulders(lm) {
        const ls = lm[11], rs = lm[12];
        if (!ls || !rs) return 100;
        const diff = Math.abs(ls.y - rs.y);
        if (diff < 0.02) return 100;
        if (diff < 0.05) return 90;
        return 70;
    }

    _checkShoulderShrug(lm) {
        const ls = lm[11], rs = lm[12], lh = lm[23], rh = lm[24];
        if (!ls || !rs || !lh || !rh) return 100;
        const shoulderY = (ls.y + rs.y) / 2;
        const hipY = (lh.y + rh.y) / 2;
        const ratio = (hipY - shoulderY); // 正常情况差值较大
        if (ratio > 0.35) return 100;
        if (ratio > 0.28) return 80;
        return 60;
    }

    _level(score) {
        if (score >= 90) return { text: '优秀', color: '#10b981', emoji: '🏆' };
        if (score >= 75) return { text: '良好', color: '#3b82f6', emoji: '👍' };
        if (score >= 60) return { text: '一般', color: '#f59e0b', emoji: '😐' };
        return { text: '较差', color: '#ef4444', emoji: '😬' };
    }
}

class FatigueDetector {
    constructor() {
        this.headDropCount = 0;
        this.shoulderTenseTime = 0;
        this.stillnessTime = 0;
        this.lastNoseY = null;
    }

    detect(lm) {
        const alerts = [];
        const nose = lm[0];
        if (!nose) return alerts;

        // 头部下垂 (打瞌睡)
        if (nose.y > 0.65) {
            this.headDropCount++;
            if (this.headDropCount > 4) {
                alerts.push({ type: 'drowsy', message: '别睡了，起来活动活动 😴', severity: 'high' });
            }
        } else {
            this.headDropCount = Math.max(0, this.headDropCount - 1);
        }

        // 肩膀耸起 (紧张)
        const sY = lm[11] && lm[12] ? (lm[11].y + lm[12].y) / 2 : null;
        if (sY !== null && sY < 0.3) {
            this.shoulderTenseTime++;
            if (this.shoulderTenseTime > 5) {
                alerts.push({ type: 'tense', message: '肩膀放松点，别紧张 💆', severity: 'medium' });
            }
        } else {
            this.shoulderTenseTime = Math.max(0, this.shoulderTenseTime - 1);
        }

        // 姿势僵硬
        if (this.lastNoseY !== null) {
            const mov = Math.abs(nose.y - this.lastNoseY);
            if (mov < 0.008) {
                this.stillnessTime++;
                if (this.stillnessTime > 25) {
                    alerts.push({ type: 'stiff', message: '动一动，别当雕塑 🗿', severity: 'low' });
                }
            } else {
                this.stillnessTime = Math.max(0, this.stillnessTime - 2);
            }
        }
        this.lastNoseY = nose.y;

        return alerts;
    }
}
