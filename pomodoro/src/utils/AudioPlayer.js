/**
 * AudioPlayer - Web Audio API 音效播放
 */
export class AudioPlayer {
    constructor() {
        this._ctx = null;
        this._muted = false;
    }

    _getCtx() {
        if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        return this._ctx;
    }

    setMuted(v) { this._muted = v; }

    // 生成一个简单的音调
    _beep(freq, duration, type = 'sine', vol = 0.3) {
        if (this._muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch(e) {}
    }

    workStart()    { this._beep(880, 0.15); setTimeout(() => this._beep(1100, 0.2), 150); }
    workEnd()      { [880,660,440].forEach((f,i) => setTimeout(() => this._beep(f,0.3), i*120)); }
    restStart()    { this._beep(528, 0.4, 'sine', 0.2); }
    restEnd()      { this._beep(660, 0.2); setTimeout(() => this._beep(880, 0.3), 200); }
    reminder()     { this._beep(440, 0.1); setTimeout(() => this._beep(440, 0.1), 200); }
    warning()      { this._beep(330, 0.5, 'square', 0.15); }
    achievement()  { [523,659,784,1047].forEach((f,i) => setTimeout(() => this._beep(f, 0.2), i*100)); }
    gesture()      { this._beep(660, 0.08); }
}

export const audio = new AudioPlayer();
