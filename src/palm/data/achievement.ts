import { Palm } from "../modal/modal";
import type { PalmArea } from "../game/palmStore";
import type { PalmRich } from "../component/palm-chips";

/**
 * 四朝向功绩卡 a 面的上下分界（占卡面高度的比例）。
 * a 面并不是五五分：上半印「功绩」小旗 + 标题 + 解锁条件，比下半窄。
 */
export const ACHIEVEMENT_QUAD_SPLIT: Record<number, number> = {
	4: 0.3144,
	5: 0.3465,
	6: 0.3465,
};

/**
 * 功绩卡（ach-1 ~ ach-9）。
 *
 * 每张卡的第一面（a 面）印的是解锁条件，本作不需要解锁流程，因此直接跳过：
 * - `single`：整张卡只有正反两个朝向，a 面是条件面，游戏只用 b 面（朝向 2）。
 * - `quad`：只有「正面正向」（朝向 1）不参与玩法；卡从正面 180°（朝向 2）起手，
 *   付 🔵 标注的代价翻面到朝向 4，再旋转到朝向 3。
 */
export type AchievementLayout = "single" | "quad";

export const ACHIEVEMENT_LAYOUT: Record<number, AchievementLayout> = {
    1: "single",
    2: "single",
    3: "single",
    4: "quad",
    5: "quad",
    6: "quad",
    7: "single",
    8: "single",
    9: "single",
};

export const AchievementCards: Record<string, Palm.PartialCard> = {
    1: {
        2: {
            name: "兽牙",
            note: "游戏开始时，一个船屋升级 1⬆",
        },
    },
    2: {
        2: {
            name: "神圣的纪念碑",
            // 每场比赛只能生产一次，用掉后这张牌就退出取牌循环
            produce: {
                gain: { Log: 1, Fish: 1, Rock: 1 },
                cons: [],
                once: true,
            },
            note: "每场比赛使用一次",
        },
    },
    3: {
        2: {
            name: "心之山",
            produce: { gain: { Rock: 1 }, cons: [] },
        },
    },
    4: {
        2: {
            name: "信任雕像",
            flip: { cons: [{ Log: 1, Fish: 1 }] },
        },
        3: {
            name: "信任雕像",
            repu: 2,
            produce: { gain: { Log: 1, Fish: 1, Rock: 1 }, cons: [] },
        },
        4: {
            name: "信任雕像",
            repu: 1,
            produce: { gain: { Log: 1, Fish: 1, Rock: 1 }, cons: [] },
            rotate: { cons: [{ Log: 1, Fish: 1, Rock: 1 }] },
        },
    },
    5: {
        2: {
            name: "精神之力",
            flip: { cons: [] },
            require: { housesUpgraded: 2 },
            note: "需要 2 张房屋升级到 3⬆ 或更高才能翻面",
        },
        3: { name: "精神之力", repu: 5 },
        4: {
            name: "精神之力",
            repu: 1,
            rotate: { cons: [{ Log: 3, Fish: 3, Rock: 3 }] },
        },
    },
    6: {
        2: {
            name: "荣誉之角",
            flip: { cons: [{ Log: 1, Fish: 1 }] },
        },
        3: {
            name: "荣誉之角",
            repu: 1,
            produce: { gain: { Rock: 4 }, cons: [{ Log: 2, Fish: 1 }] },
            rotate: { cons: [] },
        },
        4: {
            name: "荣誉之角",
            repu: 1,
            produce: { gain: { Log: 2, Fish: 2 }, cons: [{ Rock: 3 }] },
            rotate: { cons: [] },
        },
    },
    7: {
        2: {
            name: "幻象石头",
            note: "游戏开始时，将任意一张牌移到牌组的前面",
        },
    },
    8: {
        2: {
            name: "平衡标志",
            produce: { gain: { Log: 1, Fish: 1 }, cons: [] },
        },
    },
    9: {
        2: {
            name: "伟大的斧",
            note: "游戏开始时，一个樵夫升级 1⬆",
        },
    },
};

/** 功绩卡的名字；不看朝向（四朝向卡的解锁条件面不带名字） */
export function achievementName(cardNo: number): string | undefined {
    const card = AchievementCards[String(cardNo)];
    if (!card) return undefined;
    for (const area of [2, 3, 4, 1] as PalmArea[]) {
        const name = card[area]?.name;
        if (name) return name;
    }
    return undefined;
}

/** 功绩卡编号 */
export const achievementNos = Object.keys(AchievementCards)
    .map(Number)
    .sort((a, b) => a - b);

/** 这张功绩卡在游戏里可用的朝向；第一个是进入牌库时的朝向 */
export function achievementAreas(cardNo: number): PalmArea[] {
    // 四朝向卡从正面 180（朝向 2）起手，翻面到 4，再旋转到 ★ 更高的 3
    return ACHIEVEMENT_LAYOUT[cardNo] === "quad" ? [2, 4, 3] : [2];
}

/** 设置界面用的简短说明；资源部分会渲染成图标 */
export const ACHIEVEMENT_HINT: Record<number, PalmRich> = {
    1: "游戏开始时，一个船屋升级 1⬆",
    2: ["免费生产，产出", { Log: 1, Fish: 1, Rock: 1 }, "（每场一次）"],
    3: ["免费生产，产出", { Rock: 1 }],
    4: [
        "付",
        { Log: 1, Fish: 1 },
        " 翻面 → ★1（免费产",
        { Log: 1, Fish: 1, Rock: 1 },
        "），再付",
        { Log: 1, Fish: 1, Rock: 1 },
        " 旋转到 ★2",
    ],
    5: [
        "2 张房屋升到 3⬆ 更高后翻面 → ★1，再付",
        { Log: 3, Fish: 3, Rock: 3 },
        " 旋转到 ★5",
    ],
    6: [
        "付",
        { Log: 1, Fish: 1 },
        " 翻面 → ★1（",
        { Rock: 3 },
        " → ",
        { Log: 2, Fish: 2 },
        "），旋转免费，收益变为",
        { Rock: 4 },
    ],
    7: "游戏开始时，将任意一张牌移到牌组前面",
    8: ["免费生产，产出", { Log: 1, Fish: 1 }],
    9: "游戏开始时，一个樵夫升级 1⬆",
};
