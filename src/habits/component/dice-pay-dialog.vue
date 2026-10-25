<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import {
	NButton,
	NConfigProvider,
	NModal,
	darkTheme,
	type GlobalThemeOverrides,
} from "naive-ui";
import Dice from "@/components/Dice.vue";

type PayMode = "use" | "swap";

const props = withDefaults(
	defineProps<{
		mode: PayMode;
		/** 骰子面值 */
		faces: number[];
		/** 骰子剩余可用点数 */
		left: number[];
		/** 使用行动：目标牌所在行（1–3） */
		row?: number;
		/** 使用行动：目标牌所在列（1–3） */
		col?: number;
	}>(),
	{ row: 0, col: 0 },
);

const show = defineModel<boolean>("show", { default: false });

const emit = defineEmits<{ confirm: [pays: [number, number]] }>();

/** 交换行动两颗骰子的合计点数 */
const SWAP_COST = 6;

const themeOverrides: GlobalThemeOverrides = {
	common: {
		primaryColor: "#34D399",
		primaryColorHover: "#6EE7B7",
		primaryColorPressed: "#10B981",
		primaryColorSuppl: "#34D399",
	},
};

const pays = reactive<[number, number]>([0, 0]);

const isUse = computed(() => props.mode === "use");

const leftOf = (i: number) => props.left[i] ?? 0;
const faceOf = (i: number) => props.faces[i] ?? 1;

const diceRows = computed(() => [0, 1]);

const title = computed(() => (isUse.value ? "使用好习惯" : "交换习惯"));

const subtitle = computed(() =>
	isUse.value
		? `目标位于第 ${props.row} 行第 ${props.col} 列，需要一颗骰子支付 ${props.row} 点，另一颗支付 ${props.col} 点。`
		: `两颗骰子合计支付 ${SWAP_COST} 点。`,
);

const total = computed(() => (pays[0] ?? 0) + (pays[1] ?? 0));

const overpaid = computed(() => {
	const index = [0, 1].find((i) => (pays[i] ?? 0) > leftOf(i));
	return index === undefined ? null : index;
});

const valid = computed(() => {
	if (overpaid.value !== null) return false;
	if (isUse.value) {
		const need = [props.row, props.col];
		return (
			(pays[0] === need[0] && pays[1] === need[1]) ||
			(pays[0] === need[1] && pays[1] === need[0])
		);
	}
	return total.value === SWAP_COST;
});

const hint = computed(() => {
	if (overpaid.value !== null) {
		const i = overpaid.value;
		return `骰子 ${i + 1} 只剩 ${leftOf(i)} 点，无法支付 ${pays[i] ?? 0} 点。`;
	}
	if (valid.value) return "点数已满足要求。";
	if (isUse.value) {
		return `需要一颗骰子支付 ${props.row} 点、另一颗支付 ${props.col} 点。当前为 ${pays[0] ?? 0} + ${pays[1] ?? 0}。`;
	}
	return `合计需要 ${SWAP_COST} 点，当前为 ${pays[0] ?? 0} + ${pays[1] ?? 0} = ${total.value} 点。`;
});

/** 按需求自动填一组合法分配，找不到则清零 */
const autoFill = (): [number, number] => {
	const a = leftOf(0);
	const b = leftOf(1);

	if (isUse.value) {
		if (a >= props.row && b >= props.col) return [props.row, props.col];
		if (a >= props.col && b >= props.row) return [props.col, props.row];
		return [0, 0];
	}

	for (let p = Math.min(SWAP_COST, a); p >= 0; p--) {
		const q = SWAP_COST - p;
		if (q <= b) return [p, q];
	}
	return [0, 0];
};

watch(show, (open) => {
	if (!open) return;
	const [a, b] = autoFill();
	pays[0] = a;
	pays[1] = b;
});

const cancel = () => {
	show.value = false;
};

const confirm = () => {
	if (!valid.value) return;
	emit("confirm", [pays[0], pays[1]]);
	show.value = false;
};
</script>

<template>
	<n-modal
		v-model:show="show"
		:mask-closable="false"
		:auto-focus="false"
		transform-origin="center">
		<n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
			<div
				class="w-[min(92vw,460px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)]">
				<header class="border-b border-white/10 px-5 py-4">
					<h3 class="mt-1 text-base font-semibold text-white">
						{{ title }}
					</h3>
					<p class="mt-1.5 text-[11.5px] leading-5 text-white/40">
						{{ subtitle }}
					</p>
				</header>

				<div class="flex flex-wrap gap-2 px-5 pt-4">
					<span
						v-if="isUse"
						class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200/90">
						第 {{ row }} 行，需 {{ row }} 点
					</span>
					<span
						v-if="isUse"
						class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200/90">
						第 {{ col }} 列，需 {{ col }} 点
					</span>
					<span
						v-else
						class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200/90">
						两颗骰子合计 · 需 {{ SWAP_COST }} 点
					</span>
				</div>

				<div class="grid gap-3 px-5 pt-4 sm:grid-cols-2">
					<div
						v-for="i in diceRows"
						:key="i"
						class="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
						<div class="flex items-center gap-2.5">
							<div class="shrink-0 leading-none">
								<Dice :num="faceOf(i)" />
							</div>
							<div class="min-w-0">
								<p class="text-[10.5px] text-white/35">
									骰子 {{ i + 1 }}
								</p>
								<p
									class="text-[12.5px] font-medium text-white/85 tabular-nums">
									剩 {{ leftOf(i) }} 点
								</p>
								<p
									class="mt-0.5 text-[11px] text-emerald-300/80 tabular-nums">
									支付 {{ pays[i] }} 点
								</p>
							</div>
						</div>

						<div class="mt-3 grid grid-cols-7 gap-1">
							<n-button
								v-for="p in leftOf(i) + 1"
								:key="p"
								size="tiny"
								block
								:type="
									pays[i] === p - 1 ? 'primary' : 'default'
								"
								@click="pays[i] = p - 1">
								{{ p - 1 }}
							</n-button>
						</div>
					</div>
				</div>

				<div
					class="mx-5 mt-4 rounded-xl border px-3 py-2.5"
					:class="
						valid
							? 'border-emerald-400/25 bg-emerald-400/[0.08]'
							: 'border-white/10 bg-white/[0.03]'
					">
					<div class="flex items-center justify-between gap-3">
						<p
							class="min-w-0 text-[11.5px] leading-5"
							:class="
								valid ? 'text-emerald-100/70' : 'text-white/45'
							">
							{{ hint }}
						</p>
						<span
							class="shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10.5px] text-white/50 tabular-nums">
							合计 {{ total }} /
							{{ isUse ? row + col : SWAP_COST }}
						</span>
					</div>
				</div>

				<footer
					class="mt-4 flex items-center justify-end gap-2 border-t border-white/10 bg-black/20 px-5 py-3.5">
					<n-button size="small" quaternary @click="cancel">
						取消
					</n-button>
					<n-button
						size="small"
						type="primary"
						strong
						:disabled="!valid"
						@click="confirm">
						确认支付
					</n-button>
				</footer>
			</div>
		</n-config-provider>
	</n-modal>
</template>
