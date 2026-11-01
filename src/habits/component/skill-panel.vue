<script setup lang="ts">
import { computed, ref } from "vue";
import { useHabits } from "../data/habitData";
import { getSkill, type SkillKey } from "../data/skills";

const habits = useHabits();

/** 已展开完整描述的技能 */
const expanded = ref<SkillKey[]>([]);

const isOpen = (key: SkillKey) => expanded.value.includes(key);

const toggle = (key: SkillKey) => {
	expanded.value = isOpen(key)
		? expanded.value.filter((item) => item !== key)
		: [...expanded.value, key];
};

interface Entry {
	key: SkillKey;
	name: string;
	level: 1 | 2 | 3;
	label: string;
	effect: string;
	merged: boolean;
}

const entries = computed<Entry[]>(() => {
	const loadout = habits.loadout;
	if (!loadout) return [];

	if (loadout.kind === "merged") {
		const skill = getSkill(loadout.skill);
		return [
			{
				key: skill.key,
				name: skill.name,
				level: 3,
				label: "III 级",
				effect: skill.levels[2],
				merged: true,
			},
		];
	}

	const list: Entry[] = [];
	const main = loadout.main ? getSkill(loadout.main) : null;
	const sub = loadout.sub ? getSkill(loadout.sub) : null;
	if (main) {
		list.push({
			key: main.key,
			name: main.name,
			level: 2,
			label: "II 级",
			effect: main.levels[1],
			merged: false,
		});
	}
	if (sub) {
		list.push({
			key: sub.key,
			name: sub.name,
			level: 1,
			label: "I 级",
			effect: sub.levels[0],
			merged: false,
		});
	}
	return list;
});

const levelTone = (level: 1 | 2 | 3) =>
	level === 3
		? "border-violet-300/45 bg-violet-300/15 text-violet-200"
		: level === 2
			? "border-emerald-400/40 bg-emerald-400/12 text-emerald-200"
			: "border-white/15 bg-white/5 text-white/60";
</script>

<template>
	<aside
		v-if="entries.length"
		class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-[13px] font-semibold tracking-wide text-white">
				本局技能
			</h2>
		</div>

		<ul class="mt-3 flex flex-col gap-2">
			<li
				v-for="entry in entries"
				:key="entry.key"
				class="rounded-xl border px-2.5 py-2"
				:class="
					entry.merged
						? 'border-violet-400/30 bg-violet-400/[0.08]'
						: 'border-white/10 bg-white/[0.025]'
				">
				<div class="flex items-center gap-1.5">
					<span class="text-[12px] font-semibold text-white/90">
						{{ entry.name }}
					</span>
					<span
						class="rounded-full border px-1.5 py-px text-[9.5px] leading-3 font-semibold"
						:class="levelTone(entry.level)">
						{{ entry.label }}
					</span>
				</div>
				<p
					class="mt-1 text-[10.5px] leading-[1.6] whitespace-pre-line text-white/40"
					:class="isOpen(entry.key) ? '' : 'line-clamp-3'">
					{{ entry.effect }}
				</p>
				<button
					type="button"
					class="mt-1 text-[10px] text-emerald-300/70 transition-colors hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none"
					@click="toggle(entry.key)">
					{{ isOpen(entry.key) ? "收起" : "展开全文" }}
				</button>
			</li>
		</ul>
	</aside>
</template>
