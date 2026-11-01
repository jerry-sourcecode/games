<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Dice from "@/components/Dice.vue";
import { useHabits } from "../data/habitData";

const habits = useHabits();

/** 太公兵法 II / III 级时选中的骰子下标 */
const picked = ref<number[]>([]);
/** 计谋：当前操作模式；b 模式下还需选点数 */
const tacticsMode = ref<"a" | "b" | null>(null);
const tacticsDie = ref<number | null>(null);

const tacticsLevel = computed(() => habits.skillLevel("tactics"));

/** 骄兵必败：可选士气变化 */
const moraleOptions = computed(() => {
	const level = habits.skillLevel("morale");
	if (level >= 3) return [0, 1, -1, 2, -2];
	return [1, -1];
});

const moraleLabel = (delta: number) => {
	if (delta === 0) return "不执行";
	return `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`;
};

const maxPayX = computed(() => {
	const index = tacticsDie.value;
	if (index == null) return 0;
	return Math.min(habits.strategyPoints, 6 - (habits.dicesLeft[index] ?? 0));
});

const gainOf = (index: number) => {
	const x = habits.dicesLeft[index] ?? 0;
	const k = tacticsLevel.value === 1 ? 2 : tacticsLevel.value === 2 ? 1 : 0;
	return Math.max(0, x - k);
};

/** 骰子点击：优先响应计谋，其次太公兵法选骰 */
function onDieClick(index: number) {
	if (tacticsMode.value === "a") {
		if (habits.useTacticsA(index)) {
			tacticsMode.value = null;
			tacticsDie.value = null;
		}
		return;
	}
	if (tacticsMode.value === "b") {
		const max = Math.min(
			habits.strategyPoints,
			6 - (habits.dicesLeft[index] ?? 0),
		);
		if (max < 1) return;
		tacticsDie.value = index;
		return;
	}
	togglePick(index);
}

function startTactics(mode: "a" | "b") {
	if (tacticsMode.value === mode) {
		tacticsMode.value = null;
		tacticsDie.value = null;
		return;
	}
	tacticsMode.value = mode;
	tacticsDie.value = null;
}

function payTacticsB(x: number) {
	const index = tacticsDie.value;
	if (index == null) return;
	if (habits.useTacticsB(index, x)) {
		tacticsMode.value = null;
		tacticsDie.value = null;
	}
}

const diceClickable = computed(
	() => canPick.value || tacticsMode.value !== null,
);

const rerollLevel = computed(() => habits.skillLevel("reroll"));

/** I 级重掷全部，无需选择 */
const needsPick = computed(() => rerollLevel.value >= 2);

const canPick = computed(() => needsPick.value && habits.rerollAvailable);

const isPicked = (index: number) => picked.value.includes(index);

function togglePick(index: number) {
	if (!canPick.value) return;
	picked.value = isPicked(index)
		? picked.value.filter((item) => item !== index)
		: [...picked.value, index].slice(-2);
}

const canReroll = computed(() => {
	if (!habits.rerollAvailable) return false;
	return needsPick.value ? picked.value.length > 0 : true;
});

function onReroll() {
	if (!needsPick.value) {
		habits.rerollDice();
		return;
	}
	if (!habits.rerollDice([...picked.value])) return;
	picked.value = [];
}

// 换回合后清空选择
watch(
	() => habits.step,
	() => {
		picked.value = [];
	},
);
</script>

<template>
	<aside
		v-if="habits.step === 2 || habits.step === 3"
		class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-[13px] font-semibold tracking-wide text-white">
				投掷结果
			</h2>
			<span v-if="canPick" class="text-[10px] text-white/30">
				点击骰子选择
			</span>
		</div>

		<div
			class="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
			<button
				v-for="(pt, i) in habits.dices"
				:key="i"
				type="button"
				class="flex flex-col items-center gap-0.5 rounded-lg px-1 pt-1 transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:outline-none"
				:class="[
					diceClickable ? 'cursor-pointer' : 'cursor-default',
					isPicked(i)
						? 'ring-2 ring-sky-400/90 shadow-[0_0_20px_-6px_rgba(56,189,248,0.95)]'
						: '',
					tacticsMode === 'b' && tacticsDie === i
						? 'ring-2 ring-cyan-300/90 shadow-[0_0_20px_-6px_rgba(34,211,238,0.95)]'
						: '',
				]"
				:disabled="!diceClickable"
				@click="onDieClick(i)">
				<Dice :num="pt" />
				<span
					class="rounded-full bg-black/30 px-1.5 text-[10px] text-white/55 tabular-nums">
					剩 {{ habits.dicesLeft[i] ?? 0 }}
				</span>
			</button>
		</div>

		<div
			v-if="habits.feintResult"
			class="mt-2 rounded-lg border border-violet-400/25 bg-violet-400/[0.08] px-2.5 py-1.5 text-[10.5px] leading-4 text-violet-100/70">
			{{ habits.feintResult }}
		</div>

		<div
			v-if="habits.skillLevel('morale') > 0"
			class="mt-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/[0.07] px-3 py-2.5">
			<div class="flex items-center justify-between gap-2">
				<p class="text-[10px] tracking-[0.16em] text-fuchsia-300/70">
					骄兵必败
				</p>
				<span class="text-[10px] text-white/45 tabular-nums">
					士气 {{ habits.morale }} · 区间 [{{
						habits.moraleWindow[0]
					}}, {{ habits.moraleWindow[1] }}]
				</span>
			</div>

			<template v-if="habits.moraleWaiting">
				<p class="mt-1.5 text-[10.5px] leading-4 text-white/45">
					投掷阶段结束：请选择士气变化。
				</p>
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					<button
						v-for="delta in moraleOptions"
						:key="delta"
						type="button"
						class="min-w-11 flex-1 rounded-lg border border-fuchsia-300/35 bg-fuchsia-400/12 px-1.5 py-1 text-[11px] font-medium text-fuchsia-100/90 transition-colors hover:bg-fuchsia-400/22 focus-visible:ring-2 focus-visible:ring-fuchsia-300/60 focus-visible:outline-none"
						@click="habits.applyMoraleChoice(delta)">
						{{ moraleLabel(delta) }}
					</button>
				</div>
			</template>

			<p
				v-else-if="habits.moraleNotice"
				class="mt-1.5 text-[10.5px] leading-4 text-fuchsia-100/70">
				{{ habits.moraleNotice }}
			</p>

			<p v-else class="mt-1.5 text-[10.5px] leading-4 text-white/30">
				投掷阶段结束后需选择士气变化。
			</p>
		</div>

		<div
			v-if="tacticsLevel > 0"
			class="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-2.5">
			<div class="flex items-center justify-between gap-2">
				<p class="text-[10px] tracking-[0.16em] text-cyan-300/70">
					计谋
				</p>
				<span class="text-[10px] text-white/45 tabular-nums">
					谋略点 {{ habits.strategyPoints }}/{{ habits.strategyCap }}
				</span>
			</div>

			<div class="mt-1.5 grid grid-cols-2 gap-1.5">
				<button
					type="button"
					class="rounded-lg border px-1.5 py-1 text-[11px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:outline-none"
					:class="
						tacticsMode === 'a'
							? 'border-cyan-300/60 bg-cyan-400/25 text-cyan-100'
							: habits.tacticsAAllowed
								? 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100/90 hover:bg-cyan-400/20'
								: 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/25'
					"
					:disabled="!habits.tacticsAAllowed"
					@click="startTactics('a')">
					蓄力
				</button>
				<button
					type="button"
					class="rounded-lg border px-1.5 py-1 text-[11px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:outline-none"
					:class="
						tacticsMode === 'b'
							? 'border-cyan-300/60 bg-cyan-400/25 text-cyan-100'
							: habits.tacticsBAllowed
								? 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100/90 hover:bg-cyan-400/20'
								: 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/25'
					"
					:disabled="!habits.tacticsBAllowed"
					@click="startTactics('b')">
					释放
				</button>
			</div>

			<!-- 蓄谋：点一颗骰子立即结算 -->
			<div v-if="tacticsMode === 'a'" class="mt-1.5 flex flex-col gap-1">
				<button
					v-for="(pt, i) in habits.dices"
					:key="i"
					type="button"
					class="w-full rounded-md border border-cyan-300/30 bg-cyan-400/10 px-1 py-1 text-[10.5px] text-cyan-100/85 transition-colors hover:bg-cyan-400/20 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:outline-none"
					@click="(habits.useTacticsA(i), (tacticsMode = null))">
					骰子 {{ i + 1 }} 视为 1，谋略点 +{{ gainOf(i) }}
				</button>
			</div>

			<!-- 用谋：选骰子后选点数 -->
			<div v-else-if="tacticsMode === 'b'" class="mt-1.5">
				<p
					v-if="tacticsDie == null"
					class="text-[10.5px] leading-4 text-white/40">
					点击上方一颗骰子作为目标。
				</p>
				<div v-else class="flex flex-wrap gap-1">
					<button
						v-for="x in maxPayX"
						:key="x"
						type="button"
						class="min-w-6 rounded-md border border-cyan-300/35 bg-cyan-400/15 px-1.5 py-0.5 text-[10.5px] text-cyan-100 transition-colors hover:bg-cyan-400/25 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:outline-none"
						@click="payTacticsB(x)">
						+{{ x }}
					</button>
					<p
						v-if="maxPayX < 1"
						class="text-[10.5px] leading-4 text-white/35">
						该骰子已无法提高。
					</p>
				</div>
			</div>

			<p
				v-else-if="!habits.tacticsAAllowed && !habits.tacticsBAllowed"
				class="mt-1.5 text-[10.5px] leading-4 text-white/30">
				<template v-if="!habits.tacticsPhaseOpen">
					需在投掷后、行动前使用。
				</template>
				<template v-else>本次投掷已用过。</template>
			</p>
		</div>

		<div
			v-if="rerollLevel > 0"
			class="mt-3 rounded-xl border border-sky-400/25 bg-sky-400/[0.07] px-3 py-2.5">
			<div class="flex items-center justify-between gap-2">
				<p class="text-[10px] tracking-[0.16em] text-sky-300/70">
					太公兵法
				</p>
				<span class="text-[10px] text-white/40 tabular-nums">
					剩 {{ habits.rerollLeft }} 次
				</span>
			</div>
			<button
				type="button"
				class="mt-1.5 w-full rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:outline-none"
				:class="
					canReroll
						? 'border-sky-300/45 bg-sky-400/20 text-sky-100 hover:bg-sky-400/30'
						: 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30'
				"
				:disabled="!canReroll"
				@click="onReroll">
				{{ needsPick ? "重掷所选" : "重掷全部" }}
			</button>
			<p
				v-if="habits.rerollLeft === 0"
				class="mt-1.5 text-[10.5px] leading-4 text-white/30">
				本局次数已用完。
			</p>
			<p
				v-else-if="!habits.rerollAvailable"
				class="mt-1.5 text-[10.5px] leading-4 text-white/30">
				需在行动前重掷。
			</p>
			<p
				v-else-if="needsPick && !picked.length"
				class="mt-1.5 text-[10.5px] leading-4 text-white/30">
				选择至多 2 枚骰子后重掷。
			</p>
		</div>

		<div
			v-if="habits.step === 3 && habits.skillLevel('allIn') > 0"
			class="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5">
			<p class="text-[10px] tracking-[0.16em] text-amber-300/70">
				孤注一掷
			</p>
			<button
				type="button"
				class="mt-1.5 w-full rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:outline-none"
				:class="
					habits.allInAvailable
						? 'border-amber-300/45 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
						: 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30'
				"
				:disabled="!habits.allInAvailable"
				@click="habits.rollAllIn()">
				{{ habits.allInUsed ? "本回合已发动" : "发动孤注一掷" }}
			</button>
			<p
				v-if="habits.allInResult"
				class="mt-1.5 text-[10.5px] leading-4 text-amber-100/70">
				{{ habits.allInResult }}
			</p>
			<p
				v-else-if="!habits.allInAvailable && !habits.allInUsed"
				class="mt-1.5 text-[10.5px] leading-4 text-white/30">
				需在行动前发动，每回合限一次。
			</p>
		</div>
	</aside>
</template>
