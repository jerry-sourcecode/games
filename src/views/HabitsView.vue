<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import GameIntro from "@/components/GameIntro.vue";
import { habitGame } from "@/habits/data/habitData";
import HabitsIndex from "@/habits/habits-index.vue";

const started = ref(false);
</script>

<template>
	<div class="relative min-h-dvh overflow-hidden">
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[130px]" />
			<div class="absolute inset-0 bg-grid-fade" />
		</div>

		<div
			class="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-3 sm:px-6">
			<main class="flex-1">
				<GameIntro
					v-if="!started"
					:game="habitGame"
					@start="started = true" />

				<section v-else class="relative">
					<HabitsIndex @exit="started = false" />
				</section>
			</main>
		</div>
	</div>
</template>
