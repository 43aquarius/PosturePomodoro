/**
 * Throttle - 防抖/节流
 */
export function throttle(fn, delay) {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last >= delay) { last = now; return fn(...args); }
    };
}

export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
