<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { LogEntry, LogTone } from "../game/types";

const props = defineProps<{ entries: LogEntry[] }>();

const box = ref<HTMLElement | null>(null);

watch(
	() => props.entries.length,
	async () => {
		await nextTick();
		const el = box.value;
		if (el) el.scrollTop = el.scrollHeight;
	},
	{ immediate: true },
);

const TONE: Record<LogTone, string> = {
	info: "text-white/45",
	good: "text-emerald-300/85",
	bad: "text-rose-300/85",
	hurt: "text-amber-200/85",
};
</script>

<template>
	<div class="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
		<p class="shrink-0 border-b border-white/[0.07] px-3 py-2 text-[10px] tracking-[0.24em] text-white/30 uppercase">
			战报
		</p>
		<div
			ref="box"
			class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
			<p
				v-if="!entries.length"
				class="py-4 text-center text-[11.5px] text-white/25">
				暂无记录
			</p>
			<ol v-else class="flex flex-col gap-1.5">
				<li
					v-for="entry in entries"
					:key="entry.id"
					class="flex gap-1.5 text-[11.5px] leading-5">
					<span class="w-4 shrink-0 text-right text-white/20 tabular-nums">
						{{ entry.turn }}
					</span>
					<span class="min-w-0 break-words" :class="TONE[entry.tone]">
						{{ entry.text }}
					</span>
				</li>
			</ol>
		</div>
	</div>
</template>
