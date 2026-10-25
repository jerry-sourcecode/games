export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i]!;
        arr[i] = arr[j]!;
        arr[j] = tmp;
    }
    return arr;
}

export function randint(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function wait(ms: number): Promise<void>;
export function wait(func: () => boolean): Promise<void>;
export function wait(arg: number | (() => boolean)): Promise<void> {
    if (typeof arg === 'number') {
        // 等待指定毫秒数
        return new Promise<void>(resolve => {
            setTimeout(resolve, arg);
        });
    }

    // 轮询等待条件函数返回 true
    return new Promise<void>(resolve => {
        const check = () => {
            if (arg()) {
                resolve();
            } else {
                setTimeout(check, 30);
            }
        };
        check(); // 立即检查一次
    });
}

export function formatDateTime(ts: number = Date.now()): string {
    console.log(ts);

    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');

    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1); // 月份从 0 开始，记得 +1
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// 1) 类型声明：给 Number 加方法
declare global {
    interface Number {
        nxt(mod: number): number;
    }
}

// 2) 用 defineProperty，避免污染 for...in / Object.keys
Object.defineProperty(Number.prototype, "nxt", {
    value: function (this: number, mod: number): number {
        const value = Number(this);

        if (!Number.isFinite(mod) || mod <= 0) {
            throw new RangeError(`mod 必须为正数，收到 ${mod}`);
        }
        if (!Number.isFinite(value)) return value; // NaN / ±Infinity 原样返回

        const next = value + 1;
        return next >= mod ? (value % mod) + 1 : next;
    },
    writable: true,
    configurable: true,
    enumerable: false,
});

export { };