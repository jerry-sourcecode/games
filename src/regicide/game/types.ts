import type { Rank, RoyalRank, Suit } from "../data/rules";

export interface Card {
	id: string;
	suit: Suit;
	rank: Rank;
	value: number;
}

export interface Enemy {
	card: Card;
	royal: RoyalRank;
	hp: number;
	maxHp: number;
	attack: number;
	/** 皇室成员的花色会压制同花色的效果 */
	suit: Suit;
}

/** play = 出牌阶段，defend = 被迫弃牌抵挡，won / lost = 结束 */
export type Phase = "play" | "defend" | "won" | "lost";

export type LogTone = "info" | "good" | "bad" | "hurt";

export interface LogEntry {
	id: number;
	turn: number;
	tone: LogTone;
	text: string;
}

/** 结算评价：整局未翻小丑为金牌 */
export type Grade = "gold" | "silver" | "bronze";
