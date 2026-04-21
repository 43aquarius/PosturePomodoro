/**
 * PresenceChecker - 在场检测
 */
import { bus } from '../core/EventBus.js';

export class PresenceChecker {
    constructor() {
        this.checkInterval = 3000;
        this.confirmThreshold = 2;
        this.absentCount = 0;
        this.presentCount = 0;
        this.currentStatus = 'unknown';
        this._lastEmit = null;
    }

    check(poseLandmarks) {
        if (!poseLandmarks || !poseLandmarks.length) {
            return this._updateStatus(false);
        }

        // 策略1: 关键点置信度 (鼻子+双肩)
        const keyPoints = [0, 11, 12];
        const validPoints = keyPoints.filter(idx =>
            poseLandmarks[idx] && poseLandmarks[idx].visibility > 0.5
        );

        // 策略2: 人体高度占比
        const nose = poseLandmarks[0];
        const leftHip = poseLandmarks[23];
        const bodyHeight = nose && leftHip ? Math.abs(nose.y - leftHip.y) : 0;
        const isBodyVisible = bodyHeight > 0.25;

        const isPresent = validPoints.length >= 2 && isBodyVisible;
        return this._updateStatus(isPresent);
    }

    _updateStatus(isPresent) {
        if (isPresent) {
            this.presentCount = Math.min(this.presentCount + 1, this.confirmThreshold + 2);
            this.absentCount = 0;
            if (this.presentCount >= this.confirmThreshold) {
                this._emit('present');
            }
        } else {
            this.absentCount = Math.min(this.absentCount + 1, this.confirmThreshold + 2);
            this.presentCount = 0;
            if (this.absentCount >= this.confirmThreshold) {
                this._emit('absent');
            }
        }
        return { status: this.currentStatus, isPresent };
    }

    _emit(status) {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            bus.emit(`presence:${status}`, { status });
            bus.emit('presence:change', { status });
        }
    }

    reset() {
        this.absentCount = 0;
        this.presentCount = 0;
        this.currentStatus = 'unknown';
    }
}
