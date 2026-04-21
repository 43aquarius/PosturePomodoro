/**
 * Geometry - 几何计算工具
 */
export function angle(a, b, c) {
    const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let deg = Math.abs(r * 180 / Math.PI);
    if (deg > 180) deg = 360 - deg;
    return deg;
}

export function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalize(v) {
    const len = Math.sqrt(v.x ** 2 + v.y ** 2);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}
