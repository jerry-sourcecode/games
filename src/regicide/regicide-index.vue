<script setup lang="ts">
import { computed, ref } from "vue";
import BackHome from "@/components/BackHome.vue";
import {
	ENEMY_TOTAL,
	HAND_LIMIT,
	JESTER_ART,
	SUIT_META,
} from "./data/rules";
import BattleLog from "./component/BattleLog.vue";
import EnemyPanel from "./component/EnemyPanel.vue";
import GameModal from "./component/GameModal.vue";
import HandArea from "./component/HandArea.vue";
import RegicideCard from "./component/RegicideCard.vue";
import { useRegicideGame } from "./game/regicideStore";

const emit = defineEmits<{ exit: [] }>();

const game = useRegicideGame();

const discardShow = ref(false);
const logShow = ref(false);
const restartShow = ref(false);

const resultShow = computed(() => game.phase === "won" || game.phase === "lost");
const isDefend = computed(() => game.phase === "defend");

const handSelected = computed(() =>
	isDefend.value ? game.defenseSelected : game.selected,
);
const handTone = computed(() => (isDefend.value ? "defend" : "attack"));
const handInteractive = computed(
	() => game.phase === "play" || isDefend.value,
);

function onPick(id: string) {
	if (game.phase === "play") game.toggleCard(id);
	else if (isDefend.value) game.toggleDefenseCard(id);
}

/* ---------- 预览 ---------- */

const blockedText = computed(() =>
	game.preview.blocked
		.map((suit) => `${SUIT_META[suit].symbol}${SUIT_META[suit].power}`)
		.join("、"),
);

const hint = computed(() => {
	const preview = game.preview;
	if (!preview.cards.length) {
		return "出一张牌、一张 A 配另一张牌，或一组点数相同的牌（A 除外）；花色效果按攻击值结算";
	}
	if (!preview.legal) return preview.reason ?? "";
	const parts: string[] = [];
	if (preview.doubled) parts.push(`♣ 伤害翻倍至 ${preview.damage}`);
	if (preview.draw > 0) parts.push(`♦ 抽 ${preview.draw} 张`);
	if (preview.recycle > 0) parts.push(`♥ 回收 ${preview.recycle} 张`);
	if (preview.shield > 0) parts.push(`♠ 削弱 ${preview.shield} 点攻击`);
	if (preview.blocked.length > 0) parts.push(`${blockedText.value} 效果被压制`);
	return parts.length > 0 ? parts.join(" · ") : "这手牌不会触发任何花色效果";
});

const killKind = computed(() => {
	const hp = game.enemy?.hp ?? 0;
	const damage = game.preview.damage;
	if (damage <= 0) return null;
	if (damage === hp) return "convert";
	if (damage > hp) return "kill";
	return null;
});

/* ---------- 弃牌堆 ---------- */

const SUIT_ORDER = ["spade", "heart", "diamond", "club"];

const sortedDiscard = computed(() =>
	[...game.discard].sort(
		(a, b) =>
			SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) ||
			b.value - a.value,
	),
);

/* ---------- 操作 ---------- */

function restart() {
	restartShow.value = false;
	game.newGame();
}

const GRADE_META = {
	gold: { label: "金牌胜利", color: "#fbbf24", text: "整局未翻小丑" },
	silver: { label: "银牌胜利", color: "#cbd5e1", text: "翻过 1 张小丑" },
	bronze: { label: "铜牌胜利", color: "#d97706", text: "两张小丑都用掉了" },
} as const;
</script>

<template>
	<div class="relative flex min-h-dvh flex-col overflow-hidden">
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/12 blur-[130px]" />
			<div class="absolute inset-0 bg-grid-fade" />
		</div>

		<div
			class="relative mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-2.5 px-3 py-3 sm:px-5 sm:py-4">
			<header class="flex items-center justify-between gap-2">
				<BackHome />

				<div class="flex items-center gap-1.5">
					<span
						class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/45 tabular-nums"
						title="摸牌堆是唯一的手牌来源，只能靠方块抽牌">
						摸牌 {{ game.drawPile.length }}
					</span>
					<button
						type="button"
						class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/45 transition-colors tabular-nums hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
						@click="discardShow = true">
						弃牌 {{ game.discard.length }}
					</button>
					<button
						type="button"
						class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/45 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none lg:hidden"
						@click="logShow = true">
						战报
					</button>
					<button
						type="button"
						class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/45 transition-colors hover:border-rose-400/40 hover:text-rose-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
						@click="restartShow = true">
						重开
					</button>
				</div>
			</header>

			<div
				class="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
				<section class="flex min-h-0 flex-col gap-2.5">
					<EnemyPanel
						v-if="game.enemy"
						:enemy="game.enemy"
						:shield="game.shield"
						:defeated="game.defeated.length" />

					<!-- 小丑 -->
					<div
						class="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.025] px-2.5 py-2">
						<div class="flex shrink-0 gap-1.5">
							<div
								v-for="(art, index) in JESTER_ART"
								:key="art"
								class="jester relative w-[34px] overflow-hidden rounded-[6px] border transition-all duration-300 sm:w-[40px]"
								:class="
									index < game.flips
										? 'border-amber-300/40 opacity-100'
										: 'rotate-180 border-white/10 opacity-25 grayscale'
								"
								:title="
									index < game.flips ? '可用的小丑' : '已翻出的小丑'
								">
								<img
									:src="art"
									alt="小丑"
									class="block aspect-[410/574] w-full object-cover"
									draggable="false" />
							</div>
						</div>

						<p class="min-w-0 flex-1 text-[10.5px] leading-4 text-white/35">
							<b class="font-medium text-amber-200/80">弃掉手牌重抽 {{ HAND_LIMIT }} 张</b>
							· 出牌前或受伤前可用 · 不解除花色压制 · 剩余 {{ game.flips }}/2
						</p>

						<button
							type="button"
							class="shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
							:class="
								game.canFlip
									? 'bg-amber-300 text-[#14060f] hover:-translate-y-0.5'
									: 'cursor-not-allowed bg-white/10 text-white/30'
							"
							:disabled="!game.canFlip"
							:title="
								game.flips > 0
									? '翻出小丑，弃掉手牌重抽'
									: '两张小丑都已使用'
							"
							@click="game.flipJester()">
							翻小丑
						</button>
					</div>

					<div class="mt-auto flex flex-col gap-2">
						<!-- 出牌 / 抵挡操作栏 -->
						<div
							class="rounded-2xl border px-3 py-2.5 transition-colors"
							:class="
								isDefend
									? 'border-rose-400/30 bg-rose-500/[0.07]'
									: 'border-white/10 bg-white/[0.025]'
							">
							<div v-if="!isDefend" class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-1.5">
										<span
											class="rounded-md bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold text-white/85 tabular-nums">
											攻击 {{ game.preview.total }}
										</span>
										<span
											v-if="game.preview.cards.length"
											class="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums"
											:class="
												game.preview.doubled
													? 'text-emerald-300'
													: 'text-white/70'
											">
											伤害 {{ game.preview.damage }}
										</span>
										<span
											v-if="game.preview.draw > 0"
											class="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200/85 tabular-nums">
											♦ 抽 {{ game.preview.draw }}
										</span>
										<span
											v-if="game.preview.recycle > 0"
											class="rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200/85 tabular-nums">
											♥ 回收 {{ game.preview.recycle }}
										</span>
										<span
											v-if="game.preview.shield > 0"
											class="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200/85 tabular-nums">
											♠ 削弱 {{ game.preview.shield }}
										</span>
										<span
											v-if="killKind === 'convert'"
											class="rounded-md border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
											刚好击溃 · 感化
										</span>
										<span
											v-else-if="killKind === 'kill'"
											class="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
											可击破
										</span>
									</div>
									<p class="mt-1.5 text-[11px] leading-5 text-white/35">
										{{ hint }}
									</p>
								</div>

								<div class="flex shrink-0 items-center gap-1.5">
									<button
										v-if="game.selected.length"
										type="button"
										class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/50 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
										@click="game.clearSelection()">
										清空
									</button>
									<button
										type="button"
										class="rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-[#14060f] transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
										:class="
											game.preview.legal
												? 'bg-amber-300 hover:-translate-y-0.5'
												: 'cursor-not-allowed bg-white/15 text-white/40'
										"
										:disabled="!game.preview.legal"
										@click="game.confirmPlay()">
										出牌
									</button>
								</div>
							</div>

							<div v-else class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p class="text-[12px] font-medium text-rose-200/90">
										{{ game.bossName }} 反击 {{ game.required }} 点
									</p>
									<p class="mt-1 text-[11px] text-white/40 tabular-nums">
										已选 {{ game.defenseValue }} 点<template
											v-if="game.defenseShort > 0">
											· 还需 {{ game.defenseShort }} 点</template
										><template v-else>· 可以抵挡</template>
									</p>
									<p
										v-if="game.handTotal < game.required"
										class="mt-0.5 text-[11px] text-rose-300/85">
										手牌总值 {{ game.handTotal }}，不足抵挡 —— 只能翻小丑重抽
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-1.5">
									<button
										v-if="game.defenseSelected.length"
										type="button"
										class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/50 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
										@click="game.clearDefense()">
										清空
									</button>
									<button
										type="button"
										class="rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
										:class="
											game.defenseReady
												? 'bg-rose-400 text-[#1c0509] hover:-translate-y-0.5'
												: 'cursor-not-allowed bg-white/15 text-white/40'
										"
										:disabled="!game.defenseReady"
										@click="game.confirmDefense()">
										抵挡
									</button>
								</div>
							</div>
						</div>

						<HandArea
							:cards="game.hand"
							:selected="handSelected"
							:tone="handTone"
							:interactive="handInteractive"
							:empty-text="
								game.mustFlip ? '手牌已空，翻一张小丑重抽' : '手牌已空'
							"
							@pick="onPick" />
					</div>
				</section>

				<BattleLog class="hidden lg:flex" :entries="game.log" />
			</div>
		</div>

		<!-- 弃牌堆 -->
		<GameModal
			v-model:show="discardShow"
			title="弃牌堆"
			:subtitle="`共 ${game.discard.length} 张 · 红桃可以把这里的牌洗回摸牌堆底部`"
			max-width="640px">
			<div class="max-h-[60vh] overflow-y-auto pr-1">
				<div
					v-if="!sortedDiscard.length"
					class="py-6 text-center text-[12px] text-white/30">
					弃牌堆是空的
				</div>
				<div v-else class="flex flex-wrap gap-1.5">
					<div v-for="card in sortedDiscard" :key="card.id" class="w-[52px]">
						<RegicideCard :card="card" :interactive="false" />
					</div>
				</div>
			</div>
		</GameModal>

		<!-- 战报（移动端） -->
		<GameModal v-model:show="logShow" title="战报" max-width="560px">
			<BattleLog class="max-h-[64vh]" :entries="game.log" />
		</GameModal>

		<!-- 结算 -->
		<GameModal
			:show="resultShow"
			:closable="false"
			:title="game.phase === 'won' ? '弑君成功' : '义军覆灭'"
			:subtitle="
				game.phase === 'won'
					? '十二名皇室成员全部倒下，你成为了真正的弑君者。'
					: '手牌不足以抵挡反击，这支孤军倒在了王座之前。'
			"
			max-width="460px">
			<div
				v-if="game.phase === 'won'"
				class="mb-3 flex items-center gap-2.5 rounded-2xl border px-3 py-2.5"
				:style="{
					borderColor: `${GRADE_META[game.grade].color}55`,
					background: `${GRADE_META[game.grade].color}14`,
				}">
				<span
					class="grid h-9 w-9 place-items-center rounded-full text-base"
					:style="{
						background: `${GRADE_META[game.grade].color}22`,
						color: GRADE_META[game.grade].color,
					}">
					★
				</span>
				<div>
					<p
						class="text-[13px] font-semibold"
						:style="{ color: GRADE_META[game.grade].color }">
						{{ GRADE_META[game.grade].label }}
					</p>
					<p class="text-[11px] text-white/40">
						{{ GRADE_META[game.grade].text }}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2">
				<div
					class="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
					<p class="text-[10px] tracking-[0.16em] text-white/30">回合</p>
					<p class="mt-1 text-lg font-semibold text-white tabular-nums">
						{{ game.turn }}
					</p>
				</div>
				<div
					class="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
					<p class="text-[10px] tracking-[0.16em] text-white/30">击败</p>
					<p class="mt-1 text-lg font-semibold text-white tabular-nums">
						{{ game.defeated.length - game.converted }}/{{ ENEMY_TOTAL }}
					</p>
				</div>
				<div
					class="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
					<p class="text-[10px] tracking-[0.16em] text-white/30">感化</p>
					<p class="mt-1 text-lg font-semibold text-white tabular-nums">
						{{ game.converted }}
					</p>
				</div>
			</div>

			<div class="mt-4 flex flex-wrap items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] text-white/55 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
					@click="emit('exit')">
					返回介绍
				</button>
				<button
					type="button"
					class="rounded-full bg-amber-300 px-4 py-1.5 text-[12.5px] font-semibold text-[#14060f] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
					@click="restart">
					再来一局
				</button>
			</div>
		</GameModal>

		<!-- 重开确认 -->
		<GameModal
			v-model:show="restartShow"
			title="重新开始"
			subtitle="当前进度会被丢弃，皇室成员的顺序重新洗牌。"
			max-width="400px">
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] text-white/55 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
					@click="restartShow = false">
					取消
				</button>
				<button
					type="button"
					class="rounded-full bg-rose-400 px-4 py-1.5 text-[12.5px] font-semibold text-[#1c0509] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
					@click="restart">
					重新开始
				</button>
			</div>
		</GameModal>
	</div>
</template>
