/**
 * PomodoroTimer - 番茄钟核心逻辑
 */
import { bus } from './EventBus.js';
import { StateMachine, STATES } from './StateMachine.js';

export const DEFAULT_SETTINGS = {
    workDuration: 25 * 60,   // 25分钟
    restDuration: 5 * 60,    // 5分钟
    longRestDuration: 15 * 60, // 15分钟
    longRestInterval: 4,      // 每4个番茄后长休息
    autoStartRest: true,
    autoStartWork: false,
    pauseOnAbsent: true
};

export class PomodoroTimer {
    constructor(settings = {}) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.sm = new StateMachine();
        this.elapsed = 0;
        this.totalDuration = 0;
        this.completedCount = 0;
        this.sessionStart = null;
        this._tick = null;
        this._absentSince = null;

        bus.on('presence:absent', () => this._onAbsent());
        bus.on('presence:present', () => this._onPresent());
        bus.on('gesture:action', ({ action }) => this._onGestureAction(action));
    }

    get state() { return this.sm.current; }
    get remaining() { return Math.max(0, this.totalDuration - this.elapsed); }
    get progress() { return this.totalDuration > 0 ? this.elapsed / this.totalDuration : 0; }
    get isRunning() { return this.sm.is(STATES.WORK) || this.sm.is(STATES.REST); }

    start() {
        if (this.sm.is(STATES.IDLE) || this.sm.is(STATES.PAUSE)) {
            if (this.sm.is(STATES.IDLE)) {
                this.elapsed = 0;
                this.totalDuration = this.settings.workDuration;
                this.sessionStart = Date.now();
            }
            this.sm.transition(STATES.WORK);
            this._startTick();
            bus.emit('timer:start', { remaining: this.remaining });
        }
    }

    pause() {
        if (this.sm.is(STATES.WORK)) {
            this.sm.transition(STATES.PAUSE);
            this._stopTick();
            bus.emit('timer:pause', { remaining: this.remaining });
        }
    }

    resume() {
        if (this.sm.is(STATES.PAUSE)) {
            this.sm.transition(STATES.WORK);
            this._startTick();
            bus.emit('timer:resume', { remaining: this.remaining });
        }
    }

    startRest(forced = false) {
        const isLong = (this.completedCount + 1) % this.settings.longRestInterval === 0;
        const duration = isLong ? this.settings.longRestDuration : this.settings.restDuration;
        this.elapsed = 0;
        this.totalDuration = duration;
        this.sm.transition(STATES.REST, { duration, isLong });
        this._startTick();
        bus.emit('timer:rest:start', { duration, isLong });
    }

    reset() {
        this._stopTick();
        this.elapsed = 0;
        this.totalDuration = 0;
        this.sm.transition(STATES.IDLE);
        bus.emit('timer:reset');
    }

    complete() {
        this._stopTick();
        this.completedCount++;
        const postureScore = this._getAvgPostureScore();
        bus.emit('timer:complete', {
            count: this.completedCount,
            duration: this.totalDuration,
            postureScore
        });
        if (this.settings.autoStartRest) {
            setTimeout(() => this.startRest(), 500);
        } else {
            this.sm.transition(STATES.IDLE);
        }
    }

    skipRest() {
        if (this.sm.is(STATES.REST)) {
            this._stopTick();
            this.sm.transition(STATES.IDLE);
            bus.emit('timer:rest:skip');
        }
    }

    _startTick() {
        this._stopTick();
        this._tick = setInterval(() => this._onTick(), 1000);
    }

    _stopTick() {
        if (this._tick) { clearInterval(this._tick); this._tick = null; }
    }

    _onTick() {
        this.elapsed++;
        bus.emit('timer:tick', {
            elapsed: this.elapsed,
            remaining: this.remaining,
            progress: this.progress,
            state: this.state
        });
        if (this.elapsed >= this.totalDuration) {
            if (this.sm.is(STATES.WORK)) this.complete();
            else if (this.sm.is(STATES.REST)) this._onRestComplete();
        }
    }

    _onRestComplete() {
        this._stopTick();
        bus.emit('timer:rest:complete');
        if (this.settings.autoStartWork) {
            setTimeout(() => this.start(), 500);
        } else {
            this.sm.transition(STATES.IDLE);
        }
    }

    _onAbsent() {
        if (this.sm.is(STATES.WORK) && this.settings.pauseOnAbsent) {
            this._absentSince = Date.now();
            this.pause();
            bus.emit('timer:auto:pause', { reason: 'absent' });
        }
    }

    _onPresent() {
        if (this.sm.is(STATES.PAUSE) && this._absentSince) {
            this._absentSince = null;
            this.resume();
            bus.emit('timer:auto:resume', { reason: 'present' });
        }
    }

    _onGestureAction(action) {
        switch (action) {
            case 'start':  if (this.sm.is(STATES.IDLE) || this.sm.is(STATES.PAUSE)) this.start(); break;
            case 'pause':  if (this.sm.is(STATES.WORK)) this.pause(); break;
            case 'complete': if (this.sm.is(STATES.WORK)) this.complete(); break;
            case 'skip_rest': this.skipRest(); break;
        }
    }

    _getAvgPostureScore() {
        // 由 PostureAnalyzer 通过 bus 维护
        return window._postureScoreAvg ?? 85;
    }
}
