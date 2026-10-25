<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import ChromaGrid from "@/components/ChromaGrid.vue";
import { habitGame } from "@/habits/data/habitData";

interface GameItem {
	image: string;
	title: string;
	subtitle: string;
	tags?: string[];
	status?: string;
	cta?: string;
	borderColor?: string;
	gradient?: string;
	/** Internal route path. Items without a path are shown as unavailable. */
	url?: string;
}

const router = useRouter();

const games: GameItem[] = [
	{
		image: habitGame.cover,
		title: habitGame.name,
		subtitle: habitGame.tagline,
		tags: habitGame.tags,
		status: habitGame.status,
		cta: "开始游戏",
		borderColor: habitGame.accent,
		gradient: habitGame.gradient,
		url: "/habit",
	},
];

const playableCount = computed(
	() => games.filter((game) => game.url?.startsWith("/")).length,
);

const openGame = (item: GameItem) => {
	if (item.url?.startsWith("/")) router.push(item.url);
};
</script>

<template>
	<div class="relative min-h-dvh overflow-hidden">
		<div class="relative flex min-h-dvh flex-col">
			<header
				class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
				<div class="flex items-center gap-3">
					<div
						class="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg shadow-[0_0_24px_-6px_rgba(52,211,153,0.8)]">
						🎮
					</div>
					<div>
						<h1
							class="text-base font-semibold tracking-tight text-white">
							游戏广场
						</h1>
					</div>
				</div>

				<div
					class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 backdrop-blur">
					<span
						class="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.55)]" />
					{{ playableCount }} 个游戏可玩
				</div>
			</header>

			<main
				class="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-10">
				<section class="mt-6 mb-8 text-center sm:mt-10">
					<h2
						class="text-3xl font-semibold tracking-tight text-balance text-white sm:text-[2.6rem] sm:leading-[1.1]">
						挑一个游戏，
						<span
							class="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
							立刻欢度美妙时光。
						</span>
					</h2>
					<p
						class="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">
						点击卡片进入游戏。
					</p>
				</section>

				<div class="relative mx-auto w-full max-w-5xl">
					<ChromaGrid
						:items="games"
						:radius="320"
						:damping="0.45"
						:fade-out="0.6"
						ease="power3.out"
						@select="openGame" />
				</div>
			</main>

			<footer
				class="mx-auto w-full max-w-6xl px-6 pb-6 text-center text-[11px] text-white/25">
				更多游戏正在开发中
			</footer>
		</div>
	</div>
</template>
