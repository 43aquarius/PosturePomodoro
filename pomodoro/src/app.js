/**
 * app.js - 主入口
 * 姿态识别番茄钟
 */
import { bus } from './core/EventBus.js';
import { PomodoroTimer } from './core/PomodoroTimer.js';
import { PresenceChecker } from './detection/PresenceChecker.js';
import { PostureAnalyzer } from './detection/PostureAnalyzer.js';
import { GestureRecognizer } from './detection/GestureRecognizer.js';
import { RemindScheduler } from './health/RemindScheduler.js';
import { RestValidator } from './health/RestValidator.js';
import { TimerDisplay } from './ui/TimerDisplay.js';
import { PosturePanel } from './ui/PosturePanel.js';
import { SkeletonCanvas } from './ui/SkeletonCanvas.js';
import { RestGuide } from './ui/RestGuide.js';
import { toast } from './ui/ToastNotifier.js';
import { audio } from './utils/AudioPlayer.js';
import { db } from './storage/Database.js';
import { StatsPersister } from './storage/StatsPersister.js';

class App {
    constructor() {
        this.timer = null;
        this.presence = null;
        this.posture = null;
        this.gesture = null;
        this.skeleton = null;
        this.stats = null;

        this._video = null;
        this._poseLandmarker = null;
        this._handLandmarker = null;
        this._cameraActive = false;
        this._settings = {
            workDuration: 25 * 60,
            restDuration: 5 * 60,
            pauseOnAbsent: true,
            soundEnabled: true,
            gestureEnabled: true
        };
    }

    async init() {
        try { await db.init(); } catch(e) {}

        this.timer = new PomodoroTimer(this._settings);
        this.presence = new PresenceChecker();
        this.posture = new PostureAnalyzer();
        this.gesture = new GestureRecognizer();
        this.stats = new StatsPersister();
        this.stats.start();

        new TimerDisplay();
        new PosturePanel();
        new RestGuide();
        new RemindScheduler();
        new RestValidator();

        const canvas = document.getElementById('skeleton-canvas');
        if (canvas) this.skeleton = new SkeletonCanvas(canvas);

        this._bindButtons();
        this._bindAudio();
        this._bindToasts();
        this._loadSettings();

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this._loadTodayStats();
        this._initCharts();

        // 每次打开：摄像头未开启，占位层显示，骨架隐藏
        this._cameraActive = false;
        document.getElementById('camera-wait')?.classList.remove('hidden');
        document.getElementById('skeleton-canvas')?.classList.add('hidden');

        console.log('[App] 初始化完成');
    }

    async startCamera() {
        if (this._cameraActive) return;

        const statusEl = document.getElementById('camera-status');
        if (statusEl) statusEl.textContent = '正在请求摄像头权限...';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            this._video = document.getElementById('camera-video');
            if (!this._video) return;

            this._video.srcObject = stream;
            await this._video.play();
            this._cameraActive = true;

            // 隐藏等待层，显示骨架
            document.getElementById('camera-wait')?.classList.add('hidden');
            document.getElementById('skeleton-canvas')?.classList.remove('hidden');

            if (statusEl) statusEl.textContent = '摄像头已就绪';

            const canvas = document.getElementById('skeleton-canvas');
            if (canvas) {
                canvas.width = this._video.videoWidth || 640;
                canvas.height = this._video.videoHeight || 480;
            }

            await this._loadMediaPipe();
            this._startDetection();

            bus.emit('camera:ready');

        } catch(err) {
            console.error('[App] 摄像头启动失败', err);
            if (statusEl) statusEl.textContent = '无法访问摄像头';
            toast.warning('无法访问摄像头，请检查权限设置');
        }
    }

    async _loadMediaPipe() {
        const statusEl = document.getElementById('camera-status');
        if (statusEl) statusEl.textContent = 'AI 模型加载中...';

        try {
            const { PoseLandmarker, HandLandmarker, FilesetResolver } =
                await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
            );

            this._poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numPoses: 1,
                minPoseDetectionConfidence: 0.5,
                minPosePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this._handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            if (statusEl) statusEl.textContent = '识别已就绪';
            toast.success('AI 识别模型加载完成！');
            bus.emit('mediapipe:ready');

        } catch(err) {
            console.error('[App] MediaPipe 加载失败', err);
            if (statusEl) statusEl.textContent = '模型加载失败（演示模式）';
            toast.warning('AI模型加载失败，使用演示模式');
            this._startDemoMode();
        }
    }

    _startDetection() {
        if (!this._poseLandmarker) return;

        let lastPoseTime = 0;
        let lastHandTime = 0;

        const detect = () => {
            if (!this._cameraActive || !this._video) return;
            const now = performance.now();

            if (now - lastPoseTime > 800) {
                lastPoseTime = now;
                try {
                    const result = this._poseLandmarker.detectForVideo(this._video, now);
                    const landmarks = result.landmarks?.[0] || null;
                    window._lastPoseLandmarks = landmarks;
                    this.presence.check(landmarks);
                    if (landmarks) {
                        const postureResult = this.posture.analyze(landmarks);
                        if (postureResult?.score?.issues) {
                            window._lastPostureIssues = postureResult.score.issues;
                        }
                        if (this.skeleton) {
                            this.skeleton.update(landmarks, window._lastHandLandmarks, window._lastPostureIssues || []);
                        }
                    } else if (this.skeleton) {
                        this.skeleton.update(null, window._lastHandLandmarks);
                    }
                } catch(e) {}
            }

            if (this._settings.gestureEnabled && now - lastHandTime > 200) {
                lastHandTime = now;
                try {
                    const result = this._handLandmarker.detectForVideo(this._video, now);
                    const handLandmarks = result.landmarks || [];
                    window._lastHandLandmarks = handLandmarks;
                    if (handLandmarks.length > 0) {
                        this.gesture.recognize(handLandmarks);
                        if (this.skeleton) {
                            this.skeleton.update(window._lastPoseLandmarks, handLandmarks, window._lastPostureIssues || []);
                        }
                    }
                } catch(e) {}
            }

            requestAnimationFrame(detect);
        };

        requestAnimationFrame(detect);
    }

    _startDemoMode() {
        console.log('[App] 演示模式启动');
        bus.emit('presence:present', { status: 'present' });
        let t = 0;
        setInterval(() => {
            t++;
            const score = 75 + Math.round(Math.sin(t * 0.1) * 15);
            const issues = score < 80 ? [{ type: 'neck_forward', severity: 20, text: '颈部前倾' }] : [];
            bus.emit('posture:score', {
                score,
                issues,
                level: score >= 90 ? { text: '优秀', color: '#5a8a6e' }
                    : score >= 75 ? { text: '良好', color: '#6b6db5' }
                    : { text: '一般', color: '#c99a4a' }
            });
        }, 3000);
    }

    _bindButtons() {
        document.getElementById('btn-start')?.addEventListener('click', () => {
            const s = this.timer.state;
            if (s === 'idle') this.timer.start();
            else if (s === 'work') this.timer.pause();
            else if (s === 'pause') this.timer.resume();
        });

        document.getElementById('btn-reset')?.addEventListener('click', () => this.timer.reset());
        document.getElementById('btn-skip-rest')?.addEventListener('click', () => this.timer.skipRest());
        document.getElementById('btn-start-camera')?.addEventListener('click', () => this.startCamera());

        document.getElementById('btn-settings')?.addEventListener('click', () => {
            document.getElementById('settings-panel')?.classList.toggle('off');
        });

        document.getElementById('btn-mute')?.addEventListener('click', (e) => {
            this._settings.soundEnabled = !this._settings.soundEnabled;
            audio.setMuted(!this._settings.soundEnabled);
            e.currentTarget.textContent = this._settings.soundEnabled ? '🔊' : '🔇';
        });

        document.getElementById('toggle-gesture')?.addEventListener('change', (e) => {
            this._settings.gestureEnabled = e.target.checked;
        });

        document.getElementById('toggle-pause-absent')?.addEventListener('change', (e) => {
            this._settings.pauseOnAbsent = e.target.checked;
            this.timer.settings.pauseOnAbsent = e.target.checked;
        });

        document.getElementById('work-duration')?.addEventListener('change', (e) => {
            this._settings.workDuration = parseInt(e.target.value) * 60;
            this.timer.settings.workDuration = this._settings.workDuration;
            this._saveSettings();
        });

        document.getElementById('rest-duration')?.addEventListener('change', (e) => {
            this._settings.restDuration = parseInt(e.target.value) * 60;
            this.timer.settings.restDuration = this._settings.restDuration;
            this._saveSettings();
        });

        document.getElementById('btn-report')?.addEventListener('click', () => {
            document.getElementById('report-panel')?.classList.toggle('off');
            this._loadTodayStats();
        });

        document.querySelectorAll('.panel-close').forEach(el => {
            el.addEventListener('click', () => el.closest('.side-panel')?.classList.add('off'));
        });

        bus.on('state:change', ({ curr }) => {
            const btn = document.getElementById('btn-start');
            if (!btn) return;
            const cfg = {
                idle:  { text: '开始专注', cls: 'btn-start' },
                work:  { text: '暂停一下', cls: 'btn-pause' },
                rest:  { text: '休息中...', cls: 'btn-rest', disabled: true },
                pause: { text: '继续', cls: 'btn-resume' }
            };
            const c = cfg[curr] || cfg.idle;
            btn.textContent = c.text;
            btn.className = `btn-main ${c.cls}`;
            btn.disabled = !!c.disabled;
            document.getElementById('btn-skip-rest')?.classList.toggle('hidden', curr !== 'rest');
        });
    }

    _bindAudio() {
        bus.on('timer:start', () => audio.workStart());
        bus.on('timer:complete', () => audio.workEnd());
        bus.on('timer:rest:start', () => audio.restStart());
        bus.on('timer:rest:complete', () => audio.restEnd());
        bus.on('gesture:detected', () => audio.gesture());
    }

    _bindToasts() {
        bus.on('remind:posture', ({ message }) => toast.reminder(message));
        bus.on('remind:rest', ({ message }) => toast.rest(message));
        bus.on('timer:auto:pause', () => toast.info('检测到你离开了，计时暂停'));
        bus.on('timer:auto:resume', () => toast.success('欢迎回来，继续专注！'));
        bus.on('timer:complete', ({ count }) => toast.success(`第 ${count} 个番茄完成！`));
        bus.on('gesture:detected', ({ label }) => {
            const el = document.getElementById('gesture-hint');
            if (el) {
                el.textContent = label;
                el.classList.remove('hidden');
                el.classList.remove('pop');
                void el.offsetWidth;
                el.classList.add('pop');
            }
        });
    }

    _loadSettings() {
        try {
            const saved = localStorage.getItem('pomodoro-settings');
            if (saved) {
                const s = JSON.parse(saved);
                Object.assign(this._settings, s);
                const w = document.getElementById('work-duration');
                const r = document.getElementById('rest-duration');
                if (w) w.value = s.workDuration / 60;
                if (r) r.value = s.restDuration / 60;
            }
        } catch(e) {}
    }

    _saveSettings() {
        localStorage.setItem('pomodoro-settings', JSON.stringify(this._settings));
    }

    async _loadTodayStats() {
        try {
            const stats = await this.stats.getTodayStats();
            const el = document.getElementById('today-stats');
            if (el) {
                el.innerHTML = `
                    <div class="stat"><div class="stat-value">${stats.pomodoroCount}</div><div class="stat-label">番茄</div></div>
                    <div class="stat"><div class="stat-value">${stats.totalWorkTime}</div><div class="stat-label">分钟</div></div>
                    <div class="stat"><div class="stat-value">${stats.avgPostureScore || '--'}</div><div class="stat-label">坐姿均分</div></div>
                `;
            }
        } catch(e) {}
    }

    _initCharts() {
        const chartCanvas = document.getElementById('week-chart');
        if (!chartCanvas) return;
        const render = async () => {
            const weekData = await this.stats.getWeekStats();
            this._drawWeekChart(chartCanvas, weekData);
        };
        render();
        bus.on('timer:complete', render);
    }

    _drawWeekChart(canvas, data) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const pad = 28;
        ctx.clearRect(0, 0, W, H);

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString('zh-CN'));
        }
        const values = days.map(d => data[d] || 0);
        const max = Math.max(...values, 1);
        const barW = (W - pad * 2) / days.length;

        values.forEach((v, i) => {
            const barH = ((H - pad * 2) * v) / max;
            const x = pad + i * barW + barW * 0.18;
            const y = H - pad - barH;
            const w = barW * 0.64;

            const grad = ctx.createLinearGradient(x, y, x, H - pad);
            grad.addColorStop(0, '#c75b4a');
            grad.addColorStop(1, '#e07a6a');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, w, barH, [3, 3, 0, 0]);
            ctx.fill();

            ctx.fillStyle = '#8a847c';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            const label = days[i].split('/').slice(1).join('/');
            ctx.fillText(label, x + w / 2, H - 10);

            if (v > 0) {
                ctx.fillStyle = '#4a4540';
                ctx.fillText(v, x + w / 2, y - 5);
            }
        });
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
window._app = app;
