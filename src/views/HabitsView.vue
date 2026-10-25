<script setup lang="ts">
import { ref } from "vue";
import GameIntro from "@/components/GameIntro.vue";
import { habitGame } from "@/habits/data/habitData";
import HabitsIndex from "@/habits/habits-index.vue";
import { useHabitsRecord } from "@/habits/data/gameRecord";
import { NDataTable } from "naive-ui";
import { h } from "vue";
import { formatDateTime } from "@/utils/utils";
import type { HabitsResultRecord } from "@/habits/modal/habitModal";

const started = ref(false);
const habitsRecord = useHabitsRecord();
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
					@start="started = true">
					<NDataTable
						:columns="[
							{
								title: '时间',
								key: 'time',
								render(rowData: HabitsResultRecord) {
									return h(
										'p',
										null,
										formatDateTime(rowData.time),
									);
								},
							},
							{
								title: '使用轮次',
								key: 'round',
							},
							{
								title: '结果',
								key: 'result',
								render(rowData: HabitsResultRecord) {
									const isSuccess = rowData.result === 'win';
									return h(
										'div',
										{
											style: {
												display: 'inline-flex',
												alignItems: 'center',
												padding: '3px 12px',
												borderRadius: '6px',
												fontSize: '14px',
												// 绿色 / 红色主题
												color: isSuccess
													? '#16a34a'
													: '#dc2626',
												backgroundColor: isSuccess
													? 'rgba(22, 163, 74, 0.1)'
													: 'rgba(220, 38, 38, 0.1)',
												border: `1px solid ${
													isSuccess
														? 'rgba(22, 163, 74, 0.3)'
														: 'rgba(220, 38, 38, 0.3)'
												}`,
											},
										},
										h('span', isSuccess ? '胜利' : '失败'),
									);
								},
							},
						]"
						:data="habitsRecord.result" />
				</GameIntro>

				<section v-else class="relative">
					<HabitsIndex @exit="started = false" />
				</section>
			</main>
		</div>
	</div>
</template>
