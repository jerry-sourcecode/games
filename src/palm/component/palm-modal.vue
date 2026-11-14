<script setup lang="ts">
withDefaults(
	defineProps<{
		title: string;
		subtitle?: string;
		/** 面板最大宽度 */
		maxWidth?: string;
	}>(),
	{ maxWidth: "1280px" },
);

const show = defineModel<boolean>("show", { default: false });
</script>

<template>
	<Teleport to="body">
		<Transition name="palm-modal">
			<div
				v-if="show"
				class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 px-3 py-6 backdrop-blur-sm"
				role="dialog"
				aria-modal="true"
				@click.self="show = false">
				<div
					class="w-[min(96vw,var(--palm-modal-max))] rounded-3xl border border-white/10 bg-[#0b1220] p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]"
					:style="{ '--palm-modal-max': maxWidth }">
					<header class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h2 class="text-[15px] font-semibold text-white">
								{{ title }}
							</h2>
							<p
								v-if="subtitle"
								class="mt-1 text-[11.5px] leading-5 text-white/40">
								{{ subtitle }}
							</p>
						</div>
						<button
							type="button"
							class="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
							@click="show = false">
							关闭
						</button>
					</header>

					<div class="mt-4">
						<slot />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.palm-modal-enter-active,
.palm-modal-leave-active {
	transition:
		opacity 200ms ease,
		transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.palm-modal-enter-from,
.palm-modal-leave-to {
	opacity: 0;
	transform: translateY(12px) scale(0.98);
}
</style>
