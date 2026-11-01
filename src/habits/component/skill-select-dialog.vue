<script setup lang="ts">
import { computed, ref } from "vue";
import {
	NButton,
	NConfigProvider,
	NModal,
	darkTheme,
	type GlobalThemeOverrides,
} from "naive-ui";
import { getSkill, type SkillKey } from "../data/skills";
import type { SkillLoadout } from "../modal/habitModal";
import { useHabits } from "../data/habitData";

const habits = useHabits();

const show = defineModel<boolean>("show", { default: false });

const emit = defineEmits<{ done: [] }>();

const themeOverrides: GlobalThemeOverrides = {
	common: {
		primaryColor: "#34D399",
		primaryColorHover: "#6EE7B7",
		primaryColorPressed: "#10B981",
		primaryColorSuppl: "#34D399",
	},
};

type Stage = 1 | 2 | 3;

const stage = ref<Stage>(1);
/** undefined = 尚未选择；null = 明确选择「不带技能」 */
const mainPick = ref<SkillKey | null | undefined>(undefined);
const subPick = ref<SkillKey | null | undefined>(undefined);

const mainList = computed(() => habits.mainCandidates.map(getSkill));
const subList = computed(() => habits.subCandidates.map(getSkill));

/** 副技能与主技能同名时可选合并，以 III 级生效 */
const isMergeCandidate = (key: SkillKey) => mainPick.value === key;

const preview = computed<SkillLoadout | null>(() => {
	const main = mainPick.value;
	const sub = subPick.value;
	if (main === undefined || sub === undefined) return null;
	if (main !== null && main === sub) return { kind: "merged", skill: main };
	return { kind: "separate", main, sub };
});

const stageMeta = computed(() => {
	if (stage.value === 1) {
		return {
			title: "选择主技能",
			detail: "以下 3 个技能随机抽取，选定后以 II 级生效；也可以选择不带主技能。",
		};
	}
	if (stage.value === 2) {
		return {
			title: "选择副技能",
			detail: "选定后以 I 级生效；若与主技能同名，可合并为 III 级；也可以选择不带副技能。",
		};
	}
	return {
		title: "确认本局技能",
		detail: "确认后即可开始对局，本局内不可更改。",
	};
});

const levelLabel = (level: 1 | 2 | 3) =>
	level === 1 ? "I" : level === 2 ? "II" : "III";

const pickMain = (key: SkillKey) => {
	mainPick.value = key;
	subPick.value = undefined;
	stage.value = 2;
};

const skipMain = () => {
	mainPick.value = null;
	subPick.value = undefined;
	stage.value = 2;
};

const pickSub = (key: SkillKey) => {
	subPick.value = key;
	stage.value = 3;
};

const skipSub = () => {
	subPick.value = null;
	stage.value = 3;
};

const back = () => {
	if (stage.value === 3) {
		subPick.value = undefined;
		stage.value = 2;
	} else if (stage.value === 2) {
		mainPick.value = undefined;
		stage.value = 1;
	}
};

const confirm = () => {
	if (!preview.value) return;
	habits.setLoadout(preview.value);
	show.value = false;
	emit("done");
};

type SummaryRow =
	| {
			kind: "skill";
			key: SkillKey;
			name: string;
			level: 1 | 2 | 3;
			role: string;
			effect: string;
			merged: boolean;
	  }
	| { kind: "none"; role: string };

/** 确认页的技能条目 */
const summary = computed<SummaryRow[]>(() => {
	const loadout = preview.value;
	if (!loadout) return [];

	if (loadout.kind === "merged") {
		const skill = getSkill(loadout.skill);
		return [
			{
				kind: "skill",
				key: skill.key,
				name: skill.name,
				level: 3,
				role: "融合",
				effect: skill.levels[2],
				merged: true,
			},
		];
	}

	const rows: SummaryRow[] = [];
	if (loadout.main) {
		const skill = getSkill(loadout.main);
		rows.push({
			kind: "skill",
			key: skill.key,
			name: skill.name,
			level: 2,
			role: "主技能",
			effect: skill.levels[1],
			merged: false,
		});
	} else {
		rows.push({ kind: "none", role: "主技能" });
	}
	if (loadout.sub) {
		const skill = getSkill(loadout.sub);
		rows.push({
			kind: "skill",
			key: skill.key,
			name: skill.name,
			level: 1,
			role: "副技能",
			effect: skill.levels[0],
			merged: false,
		});
	} else {
		rows.push({ kind: "none", role: "副技能" });
	}
	return rows;
});
</script>

<template>
	<n-modal
		v-model:show="show"
		:mask-closable="false"
		:close-on-esc="false"
		:auto-focus="false"
		transform-origin="center">
		<n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
			<div
				class="w-[min(94vw,520px)] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]">
				<header class="border-b border-white/10 px-5 py-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="mt-1 text-base font-semibold text-white">
								{{ stageMeta.title }}
							</h3>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<span
								v-for="s in [1, 2] as const"
								:key="s"
								class="h-1 w-6 rounded-full transition-colors duration-300"
								:class="
									stage > s
										? 'bg-emerald-400/80'
										: stage === s
											? 'bg-emerald-400/45'
											: 'bg-white/10'
								" />
						</div>
					</div>
					<p class="mt-1.5 text-[11.5px] leading-5 text-white/40">
						{{ stageMeta.detail }}
					</p>
				</header>

				<div class="max-h-[min(58vh,420px)] overflow-y-auto px-4 py-4">
					<!-- 主技能候选 -->
					<ul v-if="stage === 1" class="flex flex-col gap-2">
						<li v-for="skill in mainList" :key="skill.key">
							<button
								type="button"
								class="skill-option group w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-colors duration-200 hover:border-emerald-400/40 hover:bg-emerald-400/[0.07] focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none"
								@click="pickMain(skill.key)">
								<div class="flex items-center gap-2">
									<span
										class="text-[13.5px] font-semibold text-white">
										{{ skill.name }}
									</span>
									<span
										class="rounded-full border border-emerald-400/35 bg-emerald-400/12 px-1.5 py-0.5 text-[10px] leading-3 font-semibold text-emerald-200">
										{{ levelLabel(2) }} 级
									</span>
								</div>
								<p
									class="mt-1.5 text-[11.5px] leading-[1.7] whitespace-pre-line text-white/50">
									{{ skill.levels[1] }}
								</p>
							</button>
						</li>

						<!-- 允许不带主技能 -->
						<li>
							<button
								type="button"
								class="w-full rounded-2xl border border-dashed border-white/15 bg-transparent px-3.5 py-3 text-left transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
								@click="skipMain">
								<div class="flex items-center gap-2">
									<span
										class="text-[13.5px] font-semibold text-white/70">
										不带主技能
									</span>
									<span
										class="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] leading-3 font-semibold text-white/45">
										无
									</span>
								</div>
								<p
									class="mt-1.5 text-[11.5px] leading-[1.7] text-white/35">
									本局不携带主技能。
								</p>
							</button>
						</li>
					</ul>
					<ul v-else-if="stage === 2" class="flex flex-col gap-2">
						<li v-for="skill in subList" :key="skill.key">
							<button
								type="button"
								class="skill-option w-full rounded-2xl border px-3.5 py-3 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none"
								:class="
									isMergeCandidate(skill.key)
										? 'border-violet-400/35 bg-violet-400/[0.09] hover:border-violet-300/60 hover:bg-violet-400/[0.14]'
										: 'border-white/10 bg-white/[0.03] hover:border-emerald-400/40 hover:bg-emerald-400/[0.07]'
								"
								@click="pickSub(skill.key)">
								<div class="flex items-center gap-2">
									<span
										class="text-[13.5px] font-semibold text-white">
										{{ skill.name }}
									</span>
									<span
										class="rounded-full border px-1.5 py-0.5 text-[10px] leading-3 font-semibold"
										:class="
											isMergeCandidate(skill.key)
												? 'border-violet-300/50 bg-violet-300/15 text-violet-200'
												: 'border-white/15 bg-white/5 text-white/55'
										">
										{{
											isMergeCandidate(skill.key)
												? `${levelLabel(3)} 级`
												: `${levelLabel(1)} 级`
										}}
									</span>
								</div>
								<p
									class="mt-1.5 text-[11.5px] leading-[1.7] whitespace-pre-line"
									:class="
										isMergeCandidate(skill.key)
											? 'text-violet-100/70'
											: 'text-white/50'
									">
									{{
										isMergeCandidate(skill.key)
											? skill.levels[2]
											: skill.levels[0]
									}}
								</p>
								<p
									v-if="isMergeCandidate(skill.key)"
									class="mt-1.5 text-[10.5px] leading-4 text-violet-200/60">
									与主技能同名：选择此项将合并为 III
									级，不再拥有独立副技能。
								</p>
							</button>
						</li>

						<!-- 允许不带副技能 -->
						<li>
							<button
								type="button"
								class="w-full rounded-2xl border border-dashed border-white/15 bg-transparent px-3.5 py-3 text-left transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
								@click="skipSub">
								<div class="flex items-center gap-2">
									<span
										class="text-[13.5px] font-semibold text-white/70">
										不带副技能
									</span>
									<span
										class="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] leading-3 font-semibold text-white/45">
										无
									</span>
								</div>
								<p
									class="mt-1.5 text-[11.5px] leading-[1.7] text-white/35">
									本局不携带副技能。
								</p>
							</button>
						</li>
					</ul>

					<!-- 确认 -->
					<div v-else class="flex flex-col gap-2">
						<div
							v-for="item in summary"
							:key="item.kind === 'skill' ? item.key : item.role"
							class="rounded-2xl border px-3.5 py-3"
							:class="
								item.kind === 'none'
									? 'border-dashed border-white/12 bg-white/[0.015]'
									: item.merged
										? 'border-violet-400/35 bg-violet-400/[0.09]'
										: 'border-white/10 bg-white/[0.03]'
							">
							<template v-if="item.kind === 'skill'">
								<div class="flex items-center gap-2">
									<span
										class="text-[13.5px] font-semibold text-white">
										{{ item.name }}
									</span>
									<span
										class="rounded-full border px-1.5 py-0.5 text-[10px] leading-3 font-semibold"
										:class="
											item.merged
												? 'border-violet-300/50 bg-violet-300/15 text-violet-200'
												: 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200'
										">
										{{ levelLabel(item.level) }} 级
									</span>
									<span
										class="ml-auto text-[10.5px] text-white/30">
										{{ item.role }}
									</span>
								</div>
								<p
									class="mt-1.5 text-[11.5px] leading-[1.7] whitespace-pre-line text-white/55">
									{{ item.effect }}
								</p>
							</template>
							<div v-else class="flex items-center gap-2">
								<span
									class="text-[13.5px] font-semibold text-white/60">
									不带技能
								</span>
								<span
									class="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] leading-3 font-semibold text-white/45">
									无
								</span>
								<span
									class="ml-auto text-[10.5px] text-white/30">
									{{ item.role }}
								</span>
							</div>
						</div>
					</div>
				</div>

				<footer
					class="flex items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-5 py-3.5">
					<n-button
						v-if="stage !== 1"
						size="small"
						quaternary
						@click="back">
						上一步
					</n-button>

					<n-button
						v-if="stage === 3"
						size="small"
						type="primary"
						strong
						@click="confirm">
						开始对局
					</n-button>
					<span v-else class="text-[10.5px] text-white/25">
						请选择一个技能
					</span>
				</footer>
			</div>
		</n-config-provider>
	</n-modal>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
	.skill-option {
		animation: skill-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
}

@keyframes skill-in {
	from {
		opacity: 0;
		transform: translateY(8px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
