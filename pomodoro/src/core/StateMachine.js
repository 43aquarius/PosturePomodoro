/**
 * StateMachine - 番茄钟状态机
 * 状态: idle -> work -> rest -> idle
 *       work -> pause -> work
 */
import { bus } from './EventBus.js';

export const STATES = {
    IDLE: 'idle',
    WORK: 'work',
    REST: 'rest',
    PAUSE: 'pause',
    FORCED_REST: 'forced_rest'
};

const TRANSITIONS = {
    [STATES.IDLE]: [STATES.WORK],
    [STATES.WORK]: [STATES.REST, STATES.PAUSE, STATES.IDLE],
    [STATES.REST]: [STATES.IDLE, STATES.WORK],
    [STATES.PAUSE]: [STATES.WORK, STATES.IDLE],
    [STATES.FORCED_REST]: [STATES.IDLE]
};

export class StateMachine {
    constructor() {
        this.state = STATES.IDLE;
        this.history = [];
        this.stateData = {};
    }

    can(nextState) {
        return TRANSITIONS[this.state]?.includes(nextState) ?? false;
    }

    transition(nextState, data = {}) {
        if (!this.can(nextState)) {
            console.warn(`[StateMachine] ${this.state} -> ${nextState} not allowed`);
            return false;
        }
        const prev = this.state;
        this.history.push({ from: prev, to: nextState, at: Date.now(), data });
        this.state = nextState;
        this.stateData = data;
        bus.emit('state:change', { prev, curr: nextState, data });
        bus.emit(`state:${nextState}`, { prev, data });
        return true;
    }

    is(state) { return this.state === state; }
    get current() { return this.state; }
}
