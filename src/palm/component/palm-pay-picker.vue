<script setup lang="ts">
import { computed } from "vue";
import PalmCost from "./palm-cost.vue";
import PalmResources from "./palm-resources.vue";
import { gainOf, labelOf, usePalm, wildOf } from "../game/palmStore";
import type { PalmCondition, PalmItem } from "./palm-chips";

/** 支付选择器：费用、已选合计、可点的资源牌，行动与订单共用 */
const props = defineProps<{
	cost: PalmCondition[];
	picked: string[];
}>();

const emit = defineEmits<{ "update:picked": [string[]] }>();

const palm = usePalm();

const pickedSum = computed<PalmCondition>(() => {
	const total: PalmCondition = {};
	for (const uid of props.picked) {
		const card = palm.storedCards.find((item) => item.uid === uid);
		if (!card) continue;
		for (const [item, amount] of Object.entries(gainOf(card))) {
			const key = item as PalmItem;
			total[key] = (total[key] ?? 0) + (amount ?? 0);
		}
	}
	return total;
});

const pickedWild = computed(() =>
	props.picked.reduce((sum, uid) => {
		const card = palm.storedCards.find((item) => item.uid === uid);
		return sum + (card ? wildOf(card) : 0);
	}, 0),
);

const wastedHint = computed(() => {
	if (!props.picked.length) return null;
	// 万能资源几乎总会有富余，只有纯普通资源时才提示作废
	if (pickedWild.value) return null;
	const hasExtra = props.cost.every((option) =>
		Object.entries(pickedSum.value).some(
			([item, amount]) => (amount ?? 0) > (option[item as PalmItem] ?? 0),
		),
	);
	return hasExtra ? "整张资源牌会被一次性消耗，多出的资源作废。" : null;
});

function toggle(uid: string) {
	emit(
		"update:picked",
		props.picked.includes(uid)
			? props.picked.filter((item) => item !== uid)
			: [...props.picked, uid],
	);
}
</script>

<template>
	<div class="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-1.5">
				<span class="text-[11px] text-white/35">费用</span>
				<PalmCost :cost="cost" size="xs" />
			</div>
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="text-[11px] text-white/35">已选合计</span>
				<PalmResources :items="pickedSum" :wild="pickedWild" size="xs" />
				<template v-if="palm.hasBonus">
					<span class="text-[10px] text-white/25">+</span>
					<PalmResources :items="palm.bonus" size="xs" />
					<span class="text-[10px] text-sky-200/50">
						开局补给优先扣除
					</span>
				</template>
			</div>
		</div>

		<div v-if="cost.length" class="mt-2.5 flex flex-wrap gap-1.5">
			<button
				v-for="card in palm.storedCards"
				:key="card.uid"
				type="button"
				class="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
				:class="
					picked.includes(card.uid)
						? 'border-sky-400/60 bg-sky-400/15'
						: 'border-white/10 bg-white/[0.03] hover:border-white/25'
				"
				@click="toggle(card.uid)">
				<span class="text-[10.5px] text-white/45">
					{{ labelOf(card) }}
				</span>
				<PalmResources
					:items="gainOf(card)"
					:wild="wildOf(card)"
					size="xs" />
			</button>
		</div>
		<p v-else class="mt-2 text-[10.5px] text-emerald-200/60">
			这个行动不需要支付资源。
		</p>

		<p v-if="wastedHint" class="mt-2 text-[10.5px] leading-4 text-amber-200/70">
			{{ wastedHint }}
		</p>
	</div>
</template>
