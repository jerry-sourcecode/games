<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import BackHome from "@/components/BackHome.vue";
import GameIntro from "@/components/GameIntro.vue";
import PalmCardArea from "@/palm/component/palm-card-area.vue";
import PalmModal from "@/palm/component/palm-modal.vue";
import PalmResources from "@/palm/component/palm-resources.vue";
import { palmGame } from "@/palm/data/palmGame";
import PalmIndex from "@/palm/palm-index.vue";
import {
	usePalmRecord,
	type PalmGrade,
	type PalmRecord,
	type PalmReplayStep,
} from "@/palm/data/palmRecord";
import { usePalmSave } from "@/palm/data/palmSave";
import { useCloudSave } from "@/cloud/store";
import { NDataTable } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { formatDateTime } from "@/utils/utils";

const started = ref(false);
const palmRecord = usePalmRecord();
const palmSave = usePalmSave();
const cloud = useCloudSave();

onMounted(async () => {
	// 先等云存档同步完成，再决定「继续游戏」按钮的状态
	await cloud.ready();
	palmSave.load();
});

/** 有未完成的存档时，按钮改成「继续游戏」 */
const introGame = computed(() =>
	palmSave.snapshot
		? { ...palmGame, cta: { label: "继续游戏" } }
		: palmGame,
);

/** 最新一局排在最前 */
const rows = computed(() => [...palmRecord.records].reverse());

/* ---------- 复盘 ---------- */

const replayRecord = ref<PalmRecord | null>(null);
/** 展开的那一步 */
const replayOpen = ref<number | null>(null);

const replaySteps = computed<PalmReplayStep[]>(
	() => replayRecord.value?.replay ?? [],
);

function openReplay(record: PalmRecord) {
	if (!record.replay?.length) return;
	replayOpen.value = null;
	replayRecord.value = record;
}

function toggleStep(index: number) {
	replayOpen.value = replayOpen.value === index ? null : index;
}

const GRADE_TONE: Record<
	PalmGrade,
	{ color: string; bg: string; border: string }
> = {
	S: {
		color: "#fbbf24",
		bg: "rgba(251,191,36,0.12)",
		border: "rgba(251,191,36,0.35)",
	},
	A: {
		color: "#a78bfa",
		bg: "rgba(167,139,250,0.12)",
		border: "rgba(167,139,250,0.35)",
	},
	B: {
		color: "#38bdf8",
		bg: "rgba(56,189,248,0.12)",
		border: "rgba(56,189,248,0.35)",
	},
	C: {
		color: "#94a3b8",
		bg: "rgba(148,163,184,0.12)",
		border: "rgba(148,163,184,0.32)",
	},
	D: {
		color: "#64748b",
		bg: "transparent",
		border: "rgba(100,116,139,0.3)",
	},
	"—": {
		color: "#64748b",
		bg: "transparent",
		border: "rgba(100,116,139,0.3)",
	},
};

const columns: DataTableColumns<PalmRecord> = [
	{
		title: "时间",
		key: "time",
		render: (row) => h("p", null, formatDateTime(row.time)),
	},
	{
		title: "得分",
		key: "score",
		render: (row) =>
			h(
				"span",
				{ style: { fontWeight: 600, color: "#e2e8f0" } },
				String(row.score),
			),
	},
	{
		title: "升级次数",
		key: "upgrades",
		render: (row) => h("span", null, String(row.upgrades)),
	},
	{
		title: "评价",
		key: "grade",
		render: (row) => {
			const tone = GRADE_TONE[row.grade] ?? GRADE_TONE["—"];
			return h(
				"div",
				{
					style: {
						display: "inline-flex",
						alignItems: "center",
						padding: "2px 12px",
						borderRadius: "6px",
						fontSize: "13px",
						fontWeight: 600,
						color: tone.color,
						backgroundColor: tone.bg,
						border: `1px solid ${tone.border}`,
					},
				},
				row.grade,
			);
		},
	},
	{
		title: "复盘",
		key: "replay",
		render: (row) => {
			const enabled = Boolean(row.replay?.length);
			return h(
				"button",
				{
					type: "button",
					disabled: !enabled,
					title: enabled ? "查看这一局的复盘" : "这局没有留下复盘",
					onClick: () => openReplay(row),
					style: {
						padding: "2px 10px",
						borderRadius: "6px",
						fontSize: "12px",
						cursor: enabled ? "pointer" : "not-allowed",
						opacity: enabled ? 1 : 0.35,
						color: enabled ? "#bae6fd" : "#94a3b8",
						backgroundColor: enabled
							? "rgba(56,189,248,0.12)"
							: "transparent",
						border: `1px solid ${
							enabled
								? "rgba(56,189,248,0.35)"
								: "rgba(148,163,184,0.25)"
						}`,
					},
				},
				enabled ? `复盘 · ${row.replay!.length} 步` : "无",
			);
		},
	},
];
</script>

<template>
	<div class="relative min-h-dvh overflow-hidden">
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-sky-500/12 blur-[130px]" />
			<div class="absolute inset-0 bg-grid-fade" />
		</div>

		<div
			class="relative mx-auto flex min-h-dvh w-full flex-col px-4 py-3 sm:px-5"
			:class="started ? 'max-w-[1560px]' : 'max-w-5xl'">
			<div class="mb-2 flex items-center">
				<BackHome />
			</div>
			<main class="flex-1">
				<GameIntro
					v-if="!started"
					:game="introGame"
					@start="started = true">
					<div
						class="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
						<NDataTable
							:columns="columns"
							:data="rows"
							size="small">
							<template #empty>
								<p
									class="py-6 text-center text-[12px] text-white/35">
									暂无对局记录，完成一局后会出现在这里。
								</p>
							</template>
						</NDataTable>
					</div>
				</GameIntro>

				<section v-else class="relative">
					<PalmIndex @exit="started = false" />
				</section>
			</main>
		</div>

		<!-- 复盘 -->
		<PalmModal
			:show="replayRecord !== null"
			title="对局复盘"
			:subtitle="
				replayRecord
					? `${formatDateTime(replayRecord.time)} · ${replayRecord.score} 分 · 评价 ${replayRecord.grade} · 升级 ${replayRecord.upgrades} 次 · 共 ${replayRecord.turns} 回合`
					: ''
			"
			max-width="760px"
			@update:show="replayRecord = null">
			<div class="max-h-[62vh] overflow-y-auto pr-1">
				<ol class="flex flex-col gap-1">
					<li
						v-for="(step, index) in replaySteps"
						:key="index"
						class="rounded-xl border border-white/[0.07] bg-white/[0.02]">
						<button
							type="button"
							class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:outline-none"
							@click="toggleStep(index)">
							<span
								class="w-9 shrink-0 text-[10px] text-white/25 tabular-nums">
								{{ index === 0 ? "开局" : index }}
							</span>
							<span
								class="min-w-0 flex-1 truncate text-[11.5px] text-white/70">
								{{ step.label }}
							</span>
							<span
								class="shrink-0 text-[10.5px] text-white/35 tabular-nums">
								{{ step.round }} 轮 {{ step.turn }} 回合
							</span>
							<span
								class="shrink-0 text-[10.5px] text-sky-300/70 tabular-nums">
								{{ step.score }} 分
							</span>
						</button>

						<div
							v-if="replayOpen === index"
							class="border-t border-white/[0.07] px-2.5 py-2">
							<p class="text-[10px] tracking-[0.12em] text-white/25">
								这一步之后
							</p>
							<div class="mt-1.5 flex flex-wrap items-start gap-2">
								<figure
									v-for="(card, i) in step.top"
									:key="`${i}-${card.cardNo}-${card.area}`"
									class="flex flex-col items-center gap-1">
									<PalmCardArea
										class="border border-white/10"
										:card-no="card.cardNo"
										:source="card.source"
										:area="card.area"
										:width="92" />
									<figcaption class="text-[9.5px] text-white/30">
										{{ i === 0 ? "牌库顶" : `第 ${i + 1} 张` }}
									</figcaption>
								</figure>

								<div class="flex min-w-0 flex-1 flex-col gap-1.5">
									<div class="flex items-center gap-1.5">
										<span class="text-[10px] text-white/30">
											已储存
										</span>
										<span
											v-if="!step.stored.length"
											class="text-[10.5px] text-white/25">
											无
										</span>
									</div>
									<div
										v-for="item in step.stored"
										:key="item.name"
										class="flex items-center gap-1.5">
										<span class="text-[10.5px] text-white/45">
											{{ item.name }}
										</span>
										<PalmResources
											:items="item.gain"
											:wild="item.wild"
											size="xs" />
									</div>
									<div
										class="mt-0.5 flex items-center gap-2 text-[10px] text-white/25 tabular-nums">
										<span>升级 {{ step.upgrades }} 次</span>
									</div>
								</div>
							</div>
						</div>
					</li>
				</ol>
			</div>

			<p class="mt-2 text-[10.5px] leading-4 text-white/25">
				点击任意一步可以看到那一步之后的牌库顶与已储存资源。
			</p>
		</PalmModal>
	</div>
</template>
