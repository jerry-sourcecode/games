import { shuffle } from "@/utils/utils";
import {
	COMBO_SUM_LIMIT,
	ENEMY_TIER,
	RANKS,
	RANK_VALUES,
	SUITS,
	type Rank,
	type RoyalRank,
	type Suit,
} from "../data/rules";
import type { Card, Enemy } from "./types";

export function makeCard(suit: Suit, rank: Rank): Card {
	return { id: `${suit}_${rank}`, suit, rank, value: RANK_VALUES[rank] };
}

/** 玩家牌堆只有 A~10，J/Q/K 都是皇室成员 */
const DECK_RANKS = RANKS.filter(
	(rank) => rank !== "J" && rank !== "Q" && rank !== "K",
);

/** 40 张牌：四门花色各 A~10 */
export function buildDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) {
		for (const rank of DECK_RANKS) deck.push(makeCard(suit, rank));
	}
	return shuffle(deck);
}

/**
 * 12 名皇室成员：侍从 → 王后 → 国王，每档内部洗牌。
 * 官方顺序没有硬性要求，洗好后整摞翻开即可。
 */
export function buildEnemyQueue(): Card[] {
	const of = (rank: RoyalRank) =>
		shuffle(SUITS.map((suit) => makeCard(suit, rank)));
	return [...of("J"), ...of("Q"), ...of("K")];
}

export function toEnemy(card: Card): Enemy {
	const royal = card.rank as RoyalRank;
	const tier = ENEMY_TIER[royal];
	return {
		card,
		royal,
		hp: tier.hp,
		maxHp: tier.hp,
		attack: tier.attack,
		suit: card.suit,
	};
}

export interface PlayCheck {
	legal: boolean;
	reason?: string;
}

/**
 * 出牌限制：
 * - 单张牌；
 * - 动物伙伴 A 可以单独出，也可以与另一张牌配对（A + A 也行）；
 * - 一组同点数的牌（A 除外）。
 */
export function validatePlay(cards: Card[]): PlayCheck {
	if (cards.length === 0) return { legal: false, reason: "请先选牌" };
	if (cards.length === 1) return { legal: true };

	const aces = cards.filter((card) => card.rank === "A");
	if (cards.length === 2 && aces.length >= 1) return { legal: true };
	if (aces.length > 0) {
		return { legal: false, reason: "动物伙伴只能单独出，或与另一张牌配对" };
	}

	const rank = cards[0]!.rank;
	const total = cards.reduce((sum, card) => sum + card.value, 0);
	if (
		cards.length <= 4 &&
		cards.every((card) => card.rank === rank) &&
		(COMBO_SUM_LIMIT === null || total <= COMBO_SUM_LIMIT)
	) {
		return { legal: true };
	}

	return {
		legal: false,
		reason: "只能出一张牌、一张 A 配一张牌，或一组同点数的牌",
	};
}

export interface PlayAnalysis {
	cards: Card[];
	/** 攻击值：所选牌点数之和 */
	total: number;
	/** 对皇室成员的伤害（梅花翻倍） */
	damage: number;
	doubled: boolean;
	/** 生效的花色 */
	active: Suit[];
	/** 被皇室成员花色压制的花色 */
	blocked: Suit[];
	draw: number;
	recycle: number;
	shield: number;
	legal: boolean;
	reason?: string;
}

/**
 * 花色效果按「本次攻击值」结算：
 * ♥ 回收 / ♦ 抽牌 / ♠ 削弱 的数值都等于攻击值，♣ 让伤害翻倍。
 * 与皇室成员同花色的效果会被压制（伤害照常结算）。
 */
export function analysePlay(cards: Card[], enemy: Enemy | null): PlayAnalysis {
	const total = cards.reduce((sum, card) => sum + card.value, 0);
	const suits = [...new Set(cards.map((card) => card.suit))];
	const blocked = enemy ? suits.filter((suit) => suit === enemy.suit) : [];
	const active = suits.filter((suit) => !blocked.includes(suit));
	const doubled = active.includes("club");
	const { legal, reason } = validatePlay(cards);

	return {
		cards,
		total,
		damage: doubled ? total * 2 : total,
		doubled,
		active,
		blocked,
		draw: active.includes("diamond") ? total : 0,
		recycle: active.includes("heart") ? total : 0,
		shield: active.includes("spade") ? total : 0,
		legal,
		reason,
	};
}

export function handValue(cards: Card[]): number {
	return cards.reduce((sum, card) => sum + card.value, 0);
}
