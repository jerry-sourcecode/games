<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import BackHome from "@/components/BackHome.vue";
import GameIntro from "@/components/GameIntro.vue";
import { regicideGame } from "@/regicide/data/regicideGame";
import RegicideIndex from "@/regicide/regicide-index.vue";
import { useRegicideGame } from "@/regicide/game/regicideStore";

const started = ref(false);
const resumable = ref(false);

const game = useRegicideGame();

onMounted(() => {
	resumable.value = game.hasSave();
});

/** 有未完成的对局时，按钮改成「继续游戏」 */
const introGame = computed(() =>
	resumable.value
		? { ...regicideGame, cta: { label: "继续游戏" } }
		: regicideGame,
);

function start() {
	if (!(resumable.value && game.load())) game.newGame();
	started.value = true;
}

function exit() {
	started.value = false;
	resumable.value = game.hasSave();
}
</script>

<template>
	<div class="relative min-h-dvh overflow-hidden">
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-violet-500/12 blur-[130px]" />
			<div class="absolute inset-0 bg-grid-fade" />
		</div>

		<div
			class="relative mx-auto flex min-h-dvh w-full flex-col"
			:class="
				started ? 'max-w-[1180px]' : 'max-w-5xl px-4 py-3 sm:px-5'
			">
			<div v-if="!started" class="mb-2 flex items-center">
				<BackHome />
			</div>

			<main class="flex-1">
				<GameIntro
					v-if="!started"
					:game="introGame"
					@start="start">
					<div
						class="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
						<p class="text-[12px] leading-6 text-white/40">
							本作暂时不记录历史对局。进行中的进度会自动保存在本机，
							下次从介绍页点「继续游戏」即可回到当前的皇室成员面前。
						</p>
					</div>
				</GameIntro>

				<section v-else class="relative">
					<RegicideIndex @exit="exit" />
				</section>
			</main>
		</div>
	</div>
</template>
