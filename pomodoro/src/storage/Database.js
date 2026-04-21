/**
 * Database - IndexedDB 封装
 */
export class Database {
    constructor() {
        this.db = null;
        this.version = 1;
        this.name = 'PomodoroDB';
    }

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.name, this.version);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => { this.db = req.result; resolve(this); };
            req.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains('pomodoros')) {
                    const s = db.createObjectStore('pomodoros', { keyPath: 'id', autoIncrement: true });
                    s.createIndex('date', 'date');
                    s.createIndex('completed', 'completed');
                }

                if (!db.objectStoreNames.contains('posture_logs')) {
                    const s = db.createObjectStore('posture_logs', { keyPath: 'id', autoIncrement: true });
                    s.createIndex('timestamp', 'timestamp');
                }

                if (!db.objectStoreNames.contains('achievements')) {
                    db.createObjectStore('achievements', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async put(store, data) {
        return this._tx(store, 'readwrite', s => s.put(data));
    }

    async add(store, data) {
        return this._tx(store, 'readwrite', s => s.add(data));
    }

    async get(store, key) {
        return this._tx(store, 'readonly', s => s.get(key));
    }

    async getAll(store) {
        return this._tx(store, 'readonly', s => s.getAll());
    }

    async getByIndex(store, indexName, value) {
        return this._tx(store, 'readonly', s => s.index(indexName).getAll(value));
    }

    async getRange(store, indexName, lower, upper) {
        const range = IDBKeyRange.bound(lower, upper);
        return this._tx(store, 'readonly', s => s.index(indexName).getAll(range));
    }

    async count(store) {
        return this._tx(store, 'readonly', s => s.count());
    }

    async delete(store, key) {
        return this._tx(store, 'readwrite', s => s.delete(key));
    }

    _tx(store, mode, fn) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], mode);
            const req = fn(tx.objectStore(store));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}

export const db = new Database();
