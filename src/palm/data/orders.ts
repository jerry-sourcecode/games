import type { PalmCondition, PalmItem } from "../component/palm-chips";

/**
 * 订单扩展：4 张随机订单，在指定的轮次公布 / 开放提交。
 * 提交只花已储存的资源，不占用行动时机；收益是直接加分的声望。
 */
export interface PalmOrderSpec {
	/** 1–4 */
	no: number;
	/** 随机需求的资源个数 */
	count: number;
	/** 第一次公布需求内容的轮次 */
	reveal: number;
	/** 开放提交的轮次区间（含两端） */
	from: number;
	to: number;
	/** 提交后获得的声望 */
	reward: number;
}

export const ORDER_SPECS: PalmOrderSpec[] = [
	{ no: 1, count: 2, reveal: 3, from: 3, to: 3, reward: 1 },
	{ no: 2, count: 3, reveal: 4, from: 5, to: 5, reward: 2 },
	{ no: 3, count: 4, reveal: 6, from: 7, to: 8, reward: 4 },
	{ no: 4, count: 5, reveal: 6, from: 7, to: 8, reward: 6 },
];

/** 订单在某一轮的状态 */
export type PalmOrderStatus =
	| "hidden"
	| "waiting"
	| "open"
	| "done"
	| "expired";

/** 一局里的一张订单 */
export interface PalmOrder {
	no: number;
	/** 随机生成的需求；未公布时不在界面上展示内容 */
	need: PalmCondition;
	done: boolean;
}

export function orderSpec(no: number): PalmOrderSpec | undefined {
	return ORDER_SPECS.find((spec) => spec.no === no);
}

const POOL: PalmItem[] = ["Log", "Fish", "Rock"];

/** 随机 N 个资源标记，同种资源可以重复 */
export function randomOrderNeed(count: number): PalmCondition {
	const need: PalmCondition = {};
	for (let i = 0; i < count; i += 1) {
		const item = POOL[Math.floor(Math.random() * POOL.length)] as PalmItem;
		need[item] = (need[item] ?? 0) + 1;
	}
	return need;
}

/** 开局为所有订单生成需求 */
export function makeOrders(): PalmOrder[] {
	return ORDER_SPECS.map((spec) => ({
		no: spec.no,
		need: randomOrderNeed(spec.count),
		done: false,
	}));
}

/** 完成 2 / 3 / 4 张订单在结算时额外获得的声望 */
export function orderBonusOf(doneCount: number): number {
	if (doneCount >= 4) return 4;
	if (doneCount === 3) return 2;
	if (doneCount === 2) return 1;
	return 0;
}
