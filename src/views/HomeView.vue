<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import ChromaGrid from "@/components/ChromaGrid.vue";
import CloudPanel from "@/cloud/cloud-panel.vue";
import { useCloudSave } from "@/cloud/store";
import { habitGame } from "@/habits/data/habitData";
import { palmGame } from "@/palm/data/palmGame";
import { regicideGame } from "@/regicide/data/regicideGame";

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
	{
		image: palmGame.cover,
		title: palmGame.name,
		subtitle: palmGame.tagline,
		tags: palmGame.tags,
		status: palmGame.status,
		cta: "开始游戏",
		borderColor: palmGame.accent,
		gradient: palmGame.gradient,
		url: "/palm",
	},
	{
		image: regicideGame.cover,
		title: regicideGame.name,
		subtitle: regicideGame.tagline,
		tags: regicideGame.tags,
		status: regicideGame.status,
		cta: "开始游戏",
		borderColor: regicideGame.accent,
		gradient: regicideGame.gradient,
		url: "/regicide",
	},
];

const playableCount = computed(
	() => games.filter((game) => game.url?.startsWith("/")).length,
);

const openGame = (item: GameItem) => {
	if (item.url?.startsWith("/")) router.push(item.url);
};

/* ---------- 云存档 / 账号 ---------- */

const cloud = useCloudSave();
const cloudShow = ref(false);

// 进首页就先拉一次云端，登录状态与存档在进入游戏前就已同步好
onMounted(() => void cloud.ready());

const cloudDotClass = computed(() => {
	if (!cloud.loggedIn) return "bg-white/30";
	if (cloud.status === "error") return "bg-rose-400";
	if (cloud.status === "syncing") return "bg-amber-300";
	if (cloud.dirty) return "bg-amber-300";
	return "bg-emerald-400";
});
</script>

<template>
	<div class="relative min-h-dvh overflow-hidden">
		<div class="relative flex min-h-dvh flex-col">
			<header
				class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
				<div class="flex items-center gap-3">
					<div>
						<h1
							class="text-base font-semibold tracking-tight text-white">
							游戏广场
						</h1>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
						:class="
							cloud.loggedIn
								? 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100/85 hover:border-emerald-400/55'
								: 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white'
						"
						:title="
							cloud.loggedIn
								? `云存档：${cloud.username}${cloud.status === 'error' ? '（同步失败）' : cloud.dirty ? '（待上传）' : ''}`
								: '登录后把存档、游戏记录与设置同步到云端'
						"
						@click="cloudShow = true">
						<span
							aria-hidden="true"
							class="h-1.5 w-1.5 rounded-full"
							:class="cloudDotClass" />
						<span class="max-w-[9rem] truncate">
							{{
								cloud.loggedIn
									? `您好，${cloud.username}`
									: "登录"
							}}
						</span>
					</button>
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
		</div>

		<CloudPanel v-model:show="cloudShow" />
	</div>
</template>
