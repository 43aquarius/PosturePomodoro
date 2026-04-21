/**
 * SkeletonCanvas - 骨架绘制
 */

const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
    [0, 11], [0, 12]
];

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
];

export class SkeletonCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._animFrame = null;
        this._poseLandmarks = null;
        this._handLandmarks = null;
        this._postureIssues = [];
        this._pulsePhase = 0;
        this._loop();
    }

    update(poseLandmarks, handLandmarks, postureIssues = []) {
        this._poseLandmarks = poseLandmarks;
        this._handLandmarks = handLandmarks;
        this._postureIssues = postureIssues;
    }

    _loop() {
        this._animFrame = requestAnimationFrame(() => this._loop());
        this._draw();
        this._pulsePhase = (this._pulsePhase + 0.04) % (Math.PI * 2);
    }

    _draw() {
        const { canvas, ctx } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!this._poseLandmarks) return;

        const W = canvas.width, H = canvas.height;
        const toCanvas = (lm) => ({ x: (1 - lm.x) * W, y: lm.y * H });
        const pulse = 0.6 + 0.4 * Math.sin(this._pulsePhase);

        ctx.lineCap = 'round';
        POSE_CONNECTIONS.forEach(([a, b]) => {
            const pa = this._poseLandmarks[a], pb = this._poseLandmarks[b];
            if (!pa || !pb || pa.visibility < 0.3 || pb.visibility < 0.3) return;
            const ca = toCanvas(pa), cb = toCanvas(pb);
            const alpha = Math.min(pa.visibility, pb.visibility) * pulse;
            const isIssue = this._isIssueBone(a, b);
            ctx.beginPath();
            ctx.moveTo(ca.x, ca.y);
            ctx.lineTo(cb.x, cb.y);
            ctx.strokeStyle = isIssue
                ? `rgba(199, 91, 74, ${alpha})`
                : `rgba(140, 180, 160, ${alpha})`;
            ctx.lineWidth = isIssue ? 3 : 2;
            ctx.stroke();
        });

        this._poseLandmarks.forEach((lm, i) => {
            if (!lm || lm.visibility < 0.3 || i > 28) return;
            const p = toCanvas(lm);
            const isKey = [0, 11, 12, 23, 24].includes(i);
            const radius = isKey ? 5 : 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isKey
                ? `rgba(220, 190, 140, ${lm.visibility * pulse})`
                : `rgba(140, 180, 160, ${lm.visibility * pulse * 0.8})`;
            ctx.fill();
            if (isKey) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(220, 190, 140, ${lm.visibility * pulse * 0.25})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        if (this._handLandmarks) {
            this._drawHands(toCanvas, pulse);
        }
    }

    _drawHands(toCanvas, pulse) {
        this._handLandmarks.forEach(hand => {
            const p = 0.7 + 0.3 * Math.sin(this._pulsePhase * 2);
            HAND_CONNECTIONS.forEach(([a, b]) => {
                const pa = hand[a], pb = hand[b];
                if (!pa || !pb) return;
                const ca = toCanvas(pa), cb = toCanvas(pb);
                this.ctx.beginPath();
                this.ctx.moveTo(ca.x, ca.y);
                this.ctx.lineTo(cb.x, cb.y);
                this.ctx.strokeStyle = `rgba(180, 140, 200, ${0.8 * p})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            });
            hand.forEach((lm, i) => {
                const p = toCanvas(lm);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, i === 0 ? 4 : 2.5, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(200, 170, 220, ${0.9 * p})`;
                this.ctx.fill();
            });
        });
    }

    _isIssueBone(a, b) {
        const issueBones = {
            hunching: [[11, 23], [12, 24]],
            neck_forward: [[0, 11], [0, 12]],
            shoulder_imbalance: [[11, 12]],
            shoulder_shrug: [[11, 12], [11, 13], [12, 14]]
        };
        return this._postureIssues.some(issue =>
            (issueBones[issue.type] || []).some(([ia, ib]) =>
                (ia === a && ib === b) || (ia === b && ib === a)
            )
        );
    }

    destroy() {
        cancelAnimationFrame(this._animFrame);
    }
}
