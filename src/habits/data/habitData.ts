import habitCover from '@/assets/covers/habits.webp'
import habitGameplay from '@/habits/content/habitGameplay.md?raw'
import type { GameDetail } from '@/types/game'
import { HabitStates, type EffectRanges } from '../modal/habitModal'
import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'

/**
 * 目前唯一的游戏。文案为占位稿，直接改这里即可同步主页卡片与详情页介绍。
 */
export const habitGame: GameDetail = {
    name: '习惯',
    tagline: '智商考验，牵一发而动全身。',
    cover: habitCover,
    category: '策略',
    duration: '3~5 分钟',
    players: '1 人',
    age: '8 岁以上',
    version: 'v0.1 预览',
    tags: ['九卡', '谜题', '轻量'],
    status: '开发中',
    accent: '#34D399',
    gradient: 'linear-gradient(150deg, #064e3b 0%, #0b1220 60%, #05060a 100%)',
    gameplay: habitGameplay,
    author: {
        name: 'Chris de Villiers',
        role: '设计师',
        links: [
            { label: 'BGG', value: 'boardgamegeek.com/boardgame/422255/habits', href: 'https://boardgamegeek.com/boardgame/422255/habits' },
        ],
    },
}

export const habitsText = {
    a1: "短暂放松",
    b1: "借酒麻痹",

    a2: "向外探索",
    b2: "停滞不前",

    a3: "腾出时间",
    b3: "寻找借口",

    a4: "早起",
    b4: "熬夜",

    a5: "自己做饭",
    b5: "食用外卖",

    a6: "始终保持联络",
    b6: "一直沉迷网络",

    a7: "尝试一下",
    b7: "轻言放弃",

    a8: "张弛有度",
    b8: "身心透支",

    a9: "线下相聚",
    b9: "沉迷社媒"
};

export interface HabitStep {
    title: string;
    detail: string;
    tip?: string;
}

export const useHabits = defineStore('habits', () => {
    const states = ref(new HabitStates());
    const dices = ref([1, 1]);
    /** 每颗骰子剩余可用点数，与 dices 下标一一对应 */
    const dicesLeft = ref([1, 1]);
    const step = ref(0);
    /** 选中的卡牌下标（1–9），null 表示未选中 */
    const selectedIdx: Ref<number | null> = ref(null);
    /** 交换行动：已完成支付、等待选择第二张牌时记录第一张牌的下标 */
    const swapFrom: Ref<number | null> = ref(null);
    /** 本回合是否已经执行过「使用」或「交换」 */
    const hasActed = ref(false);
    /** 对局结果；null 表示仍在进行 */
    const result: Ref<"win" | "lose" | null> = ref(null);
    /** 已进行的回合数 */
    const round = ref(0);

    /** 扣除骰子点数；剩余点数保留，可用于后续行动 */
    function payDices(pays: number[]) {
        pays.forEach((pay, i) => {
            const left = dicesLeft.value[i];
            if (left === undefined) return;
            dicesLeft.value[i] = Math.max(0, left - pay);
        });
    }

    return {
        states,
        step,
        dices,
        dicesLeft,
        selectedIdx,
        swapFrom,
        hasActed,
        result,
        round,
        payDices
    }
})

export const habitSteps: HabitStep[] = [
    {
        title: "坏习惯移动",
        detail: "坏习惯标记会移动到下一个坏习惯。",
    },
    {
        title: "坏习惯行动",
        detail: "有标记存在的坏习惯会将周围特定位置的好习惯翻面为坏习惯。",
    },
    {
        title: "行动阶段",
        detail: "投掷两颗骰子。",
    },
    {
        title: "行动阶段",
        detail: "以下行动选择三选一：使用好习惯、交换两张好习惯、保护一张好习惯。",
        tip: "点击卡牌来进行行动。",
    },
    {
        title: "结算",
        detail: "检查有没有达成终局条件。",
        tip: "当全场都是好习惯，玩家胜利，全场都是坏习惯，玩家失败。",
    },
];

export const habitsEffectRanges: EffectRanges = {
    a1: [
        [-1, -1],
        [-1, 0],
        [-1, 1]
    ],
    a2: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
    ],
    a3: [
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, 0]
    ],
    a4: [
        [1, 1],
        [1, 0],
        [1, -1]
    ],
    a5: [
        [-1, 1],
        [1, -1]
    ],
    a6: [
        [-1, -1],
        [1, 1]
    ],
    a7: [
        [-1, 0],
        [1, 0]
    ],
    a8: [
        [-1, 0],
        [1, -1],
        [1, 1]
    ],
    a9: [
        [0, -1],
        [0, 1]
    ],
    b1: [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 1]
    ],
    b2: [
        [-1, 0],
        [-1, 1],
        [1, -1],
        [1, 0]
    ],
    b3: [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, 0],
        [1, 1]
    ],
    b4: [
        [-1, -1],
        [-1, 1],
        [0, -1],
        [0, 1]
    ],
    b5: [
        [-1, 0],
        [-1, 1],
        [0, 1],
        [1, -1]
    ],
    b6: [
        [-1, -1],
        [0, 1],
        [1, 0]
    ],
    b7: [
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1]
    ],
    b8: [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [1, 0]
    ],
    b9: [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1]
    ]
}