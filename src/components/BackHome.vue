<script setup lang="ts">
import { useRouter } from "vue-router";

const props = withDefaults(
	defineProps<{
		/** 按钮文案，默认「游戏广场」 */
		label?: string;
	}>(),
	{ label: "游戏广场" },
);

const router = useRouter();

function backHome() {
	void router.push("/");
}
</script>

<template>
	<button
		type="button"
		class="flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/55 backdrop-blur transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
		:title="`回到${props.label}`"
		@click="backHome">
		<span aria-hidden="true" class="text-[13px] leading-none">←</span>
		{{ props.label }}
	</button>
</template>
