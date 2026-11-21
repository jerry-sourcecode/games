import type { Palm } from "../modal/modal";

export type PalmCondition = Palm.Condition;
export type PalmItem = Palm.Item;

export const ITEM_LABEL: Record<PalmItem, string> = {
	Rock: "石",
	Fish: "鱼",
	Log: "木",
};

export const ITEM_NAME: Record<PalmItem, string> = {
	Rock: "石料",
	Fish: "鱼",
	Log: "木料",
};

/** 资源图标的素材，放在 public/PalmIsland 下 */
export const ITEM_IMG: Record<PalmItem, string> = {
	Rock: "/PalmIsland/rock.png",
	Fish: "/PalmIsland/fish.png",
	Log: "/PalmIsland/log.png",
};

export const ITEM_TONE: Record<PalmItem, string> = {
	Rock: "border-slate-300/35 bg-slate-400/15 text-slate-100",
	Fish: "border-rose-300/35 bg-rose-400/15 text-rose-100",
	Log: "border-amber-300/35 bg-amber-500/15 text-amber-100",
};

/** 把一组「且」关系的资源拆成可渲染的数组 */
export function toChips(condition: PalmCondition) {
	return Object.entries(condition)
		.filter(([, amount]) => (amount ?? 0) > 0)
		.map(([item, amount]) => {
			const key = item as PalmItem;
			return {
				item: key,
				amount: amount ?? 0,
				label: ITEM_LABEL[key],
				tone: ITEM_TONE[key],
			};
		});
}

/** 一段可以混排文字与资源图标的富文本 */
export type PalmRich = Palm.Rich;
