/**
 * GestureRecognizer - 手势识别
 */
import { bus } from '../core/EventBus.js';
import { throttle } from '../utils/Throttle.js';

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [3, 6, 10, 14, 18];

export class GestureRecognizer {
    constructor() {
        this._lastGesture = null;
        this._gestureCount = 0;
        this._confirmThreshold = 3; // 需要连续3帧相同手势才触发
        this._waveHistory = [];
        this._emit = throttle((g) => this._fireGesture(g), 1500);
    }

    recognize(handLandmarksList) {
        if (!handLandmarksList || !handLandmarksList.length) {
            this._gestureCount = 0;
            this._lastGesture = null;
            return null;
        }

        const lm = handLandmarksList[0];
        const result = this._detectGesture(lm);

        if (result) {
            if (result.gesture === this._lastGesture) {
                this._gestureCount++;
                if (this._gestureCount === this._confirmThreshold) {
                    this._emit(result);
                }
            } else {
                this._lastGesture = result.gesture;
                this._gestureCount = 1;
            }
        } else {
            this._gestureCount = 0;
            this._lastGesture = null;
        }

        return result;
    }

    _detectGesture(lm) {
        const extended = this._getExtended(lm);
        const wrist = lm[0];
        const thumbTip = lm[4];
        const indexTip = lm[8];

        // ✋ 开掌 (5根全伸) → 暂停
        if (extended.length === 5) {
            return { gesture: 'open_palm', action: 'pause', label: '✋ 暂停', confidence: 0.9 };
        }

        // ✊ 握拳 (全弯) → 开始
        if (extended.length === 0) {
            return { gesture: 'fist', action: 'start', label: '✊ 开始', confidence: 0.9 };
        }

        // 单指大拇指
        if (extended.length === 1 && extended.includes(0)) {
            const thumbUp = thumbTip.y < wrist.y - 0.08;
            const thumbDown = thumbTip.y > wrist.y + 0.08;
            if (thumbUp) return { gesture: 'thumbs_up', action: 'complete', label: '👍 完成', confidence: 0.85 };
            if (thumbDown) return { gesture: 'thumbs_down', action: 'abandon', label: '👎 放弃', confidence: 0.85 };
        }

        // ✌️ 剪刀手 → 跳过休息
        if (extended.length === 2 && extended.includes(1) && extended.includes(2)) {
            return { gesture: 'victory', action: 'skip_rest', label: '✌️ 跳过休息', confidence: 0.8 };
        }

        // 👆 单食指 → 专注模式
        if (extended.length === 1 && extended.includes(1)) {
            return { gesture: 'point_up', action: 'focus_mode', label: '👆 专注', confidence: 0.8 };
        }

        // 🤚 手在上方 → 强制休息
        if (wrist.y < 0.25 && extended.length >= 4) {
            return { gesture: 'raise_hand', action: 'force_rest', label: '🙋 强制休息', confidence: 0.75 };
        }

        // 🤙 小拇指+大拇指 → 鼓励
        if (extended.length === 2 && extended.includes(0) && extended.includes(4)) {
            return { gesture: 'shaka', action: 'encourage', label: '🤙 加油', confidence: 0.75 };
        }

        return null;
    }

    _getExtended(lm) {
        const ext = [];
        // 拇指 (横向比较，镜像摄像头)
        if (lm[4].x < lm[3].x - 0.04 || lm[4].x > lm[3].x + 0.04) {
            const wristX = lm[0].x;
            const midX = (lm[0].x + lm[9].x) / 2;
            if ((wristX < midX && lm[4].x < lm[3].x) || (wristX > midX && lm[4].x > lm[3].x)) {
                ext.push(0);
            }
        }
        // 其他四指
        for (let i = 1; i < 5; i++) {
            if (lm[FINGER_TIPS[i]].y < lm[FINGER_PIPS[i]].y - 0.015) {
                ext.push(i);
            }
        }
        return ext;
    }

    _fireGesture(result) {
        bus.emit('gesture:detected', result);
        bus.emit('gesture:action', { action: result.action, gesture: result });
    }
}
