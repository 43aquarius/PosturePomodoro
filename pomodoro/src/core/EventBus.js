/**
 * EventBus - 全局事件总线
 * 用于各模块之间的解耦通信
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        const handlers = this._listeners.get(event);
        if (handlers) handlers.delete(handler);
    }

    emit(event, data) {
        const handlers = this._listeners.get(event);
        if (handlers) {
            handlers.forEach(h => {
                try { h(data); } catch(e) { console.error(`[EventBus] ${event}`, e); }
            });
        }
    }

    once(event, handler) {
        const wrapper = (data) => {
            handler(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

export const bus = new EventBus();
