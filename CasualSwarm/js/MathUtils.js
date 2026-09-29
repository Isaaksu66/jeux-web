// MathUtils.js
const MathUtils = {
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    },
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }
};
