/**
 * RestGuide - 休息引导 + 拉伸动作
 */
import { bus } from '../core/EventBus.js';

const STRETCH_POSES = [
    {
        id: 'neck_roll', name: '颈部绕圈', duration: 30, emoji: '🔄',
        desc: '头部缓缓向左转，再向右，各做5次',
        tip: '动作要慢，不要用力甩头'
    },
    {
        id: 'shoulder_roll', name: '肩部环绕', duration: 30, emoji: '🌀',
        desc: '双肩向前转10圈，再向后转10圈',
        tip: '感受肩胛骨的活动'
    },
    {
        id: 'back_stretch', name: '背部伸展', duration: 45, emoji: '🧘',
        desc: '双手交叉向前推，弓背，保持10秒',
        tip: '充分感受背部的拉伸'
    },
    {
        id: 'eye_rest', name: '眼睛放松', duration: 20, emoji: '👁️',
        desc: '闭上眼睛，顺时针转5圈，逆时针转5圈',
        tip: '放松眼部肌肉，缓解疲劳'
    },
    {
        id: 'wrist_stretch', name: '手腕拉伸', duration: 30, emoji: '🤲',
        desc: '一只手向下弯，另一只手轻压，保持15秒后换手',
        tip: '键盘手必做！'
    }
];

export class RestGuide {
    constructor() {
        this._overlay = document.getElementById('rest-screen');
        this._currentPoseIdx = 0;
        this._poseTimer = null;
        this._poseElapsed = 0;

        bus.on('timer:rest:start', ({ duration }) => this._show(duration));
        bus.on('timer:rest:complete', () => this._hide());
        bus.on('timer:rest:skip', () => this._hide());
        bus.on('rest:warning', ({ message, level }) => this._showWarning(message, level));
    }

    _show(duration) {
        if (!this._overlay) return;
        this._overlay.classList.remove('off');
        this._overlay.classList.add('on');
        this._currentPoseIdx = 0;
        this._renderPose();
        this._startPoseTimer();
    }

    _hide() {
        if (!this._overlay) return;
        this._overlay.classList.remove('on');
        this._overlay.classList.add('off');
        clearInterval(this._poseTimer);
    }

    _renderPose() {
        const pose = STRETCH_POSES[this._currentPoseIdx % STRETCH_POSES.length];
        const container = document.getElementById('stretch-card');
        if (!container) return;
        container.innerHTML = `
            <div class="stretch-emoji">${pose.emoji}</div>
            <div class="stretch-name">${pose.name}</div>
            <div class="stretch-desc">${pose.desc}</div>
            <div class="stretch-tip">${pose.tip}</div>
            <div class="stretch-bar"><div class="stretch-bar-fill" id="pose-fill"></div></div>
        `;
        this._poseElapsed = 0;
    }

    _startPoseTimer() {
        clearInterval(this._poseTimer);
        this._poseTimer = setInterval(() => {
            const pose = STRETCH_POSES[this._currentPoseIdx % STRETCH_POSES.length];
            this._poseElapsed++;
            const fill = document.getElementById('pose-fill');
            if (fill) fill.style.width = `${(this._poseElapsed / pose.duration) * 100}%`;
            if (this._poseElapsed >= pose.duration) {
                this._currentPoseIdx++;
                this._renderPose();
            }
        }, 1000);
    }

    _showWarning(message, level) {
        const el = document.getElementById('rest-warn');
        if (!el) return;
        el.textContent = message;
        el.className = `rest-warn on l${level}`;
        setTimeout(() => el.classList.remove('on'), 3000);
    }
}
