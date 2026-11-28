/** 弑君者（Regicide）规则常量 —— 依据官方规则（单人对局） */

export const SUITS = ["spade", "heart", "diamond", "club"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
] as const;
export type Rank = (typeof RANKS)[number];
/** 皇室成员的点数 */
export type RoyalRank = "J" | "Q" | "K";

export const RANK_VALUES: Record<Rank, number> = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 10,
    Q: 15,
    K: 20,
};

/** 单人局：手牌上限 8，起手 7 张 */
export const HAND_LIMIT = 8;
export const START_HAND = 8;
/** 单人局把小丑放在一边，整局可以翻 2 次 */
export const JESTER_FLIPS = 2;
export const ENEMY_TOTAL = 12;

export interface SuitMeta {
    suit: Suit;
    label: string;
    symbol: string;
    color: string;
    power: string;
    powerText: string;
}

export const SUIT_META: Record<Suit, SuitMeta> = {
    spade: {
        suit: "spade",
        label: "黑桃",
        symbol: "♠",
        color: "#a78bfa",
        power: "防御型",
        powerText: "减少敌人等量攻击",
    },
    heart: {
        suit: "heart",
        label: "红桃",
        symbol: "♥",
        color: "#fb7185",
        power: "治疗型",
        powerText: "把弃牌堆的牌洗回摸牌堆底部",
    },
    diamond: {
        suit: "diamond",
        label: "方块",
        symbol: "♦",
        color: "#fbbf24",
        power: "抽牌型",
        powerText: "从牌组上方抽牌，手牌满则跳过",
    },
    club: {
        suit: "club",
        label: "攻击",
        symbol: "♣",
        color: "#34d399",
        power: "暴击型",
        powerText: "本次对皇室成员造成的伤害翻倍",
    },
};

export const ENEMY_TIER: Record<
    RoyalRank,
    { title: string; hp: number; attack: number }
> = {
    J: { title: "侍从", hp: 20, attack: 10 },
    Q: { title: "王后", hp: 30, attack: 15 },
    K: { title: "国王", hp: 40, attack: 20 },
};

export const CARD_BACK = "/regicide/back.png";
export const JESTER_ART = ["/regicide/joker_big.png", "/regicide/joker_small.png"];

/**
 * 组合的「总点数 ≤ 10」限制。
 * 官方规则有此限制，这里按你的规则说明忽略它（设为数字即可重新启用）。
 */
export const COMBO_SUM_LIMIT: number | null = 10;
/** 精确击溃时，打出的牌是否也回到摸牌堆顶部 */
export const EXACT_KILL_RECYCLES_PLAYED = false;

/** 一张牌的原画路径 */
export function cardImage(suit: Suit, rank: Rank): string {
    return `/regicide/${suit}_${rank}.png`;
}

/** 牌的展示名，如「黑桃 K」 */
export function cardLabel(suit: Suit, rank: Rank): string {
    return `${SUIT_META[suit].label} ${rank}`;
}

/** 敌人的展示名，如「黑桃国王」 */
export function enemyName(suit: Suit, royal: RoyalRank): string {
    return `${SUIT_META[suit].label}${ENEMY_TIER[royal].title}`;
}

/** 牌堆的紧凑描述，如「♣5 ♣6」 */
export function describeCard(suit: Suit, rank: Rank): string {
    return `${SUIT_META[suit].symbol}${rank}`;
}
