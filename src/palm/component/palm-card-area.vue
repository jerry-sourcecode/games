<script setup lang="ts">
import { computed } from "vue";
import type { PalmArea, PalmCardSource } from "../game/palmStore";

/** 卡面扫描图的宽高比（1978 × 2760） */
const IMG_W = 1978;
const IMG_H = 2760;

/** 一个朝向在扫描图上的纵向区间（比例），以及是否需要旋转 180° 摆正 */
interface Crop {
	top: number;
	height: number;
	rotate: boolean;
}

/** 基础牌：a / b 面各平分上下两半 */
const BASIC_CROP: Record<PalmArea, Crop> = {
	1: { top: 0, height: 0.5, rotate: false },
	2: { top: 0.5, height: 0.5, rotate: true },
	3: { top: 0, height: 0.5, rotate: false },
	4: { top: 0.5, height: 0.5, rotate: true },
};

/**
 * 村民卡只有 a 面上的两个朝向，且并不五五分：
 * 上半 30% 是招募面（标题 + 花费），下半 70% 是村民面（插画 + 标题 + 能力）。
 */
const VILLAGER_CROP: Record<PalmArea, Crop> = {
	1: { top: 0, height: 0.3, rotate: false },
	2: { top: 0.3, height: 0.7, rotate: true },
	3: { top: 0, height: 0.3, rotate: false },
	4: { top: 0.3, height: 0.7, rotate: true },
};

const props = withDefaults(
	defineProps<{
		cardNo: number;
		area: PalmArea;
		/** 基础牌是 b{n}-*，村民牌是 bvi-{n}a */
		source?: PalmCardSource;
		width?: number;
	}>(),
	{ source: "basic", width: 240 },
);

const crop = computed(
	() =>
		(props.source === "villager" ? VILLAGER_CROP : BASIC_CROP)[props.area],
);

/** 村民卡两个朝向都在 a 面，哨站面不参与玩法 */
const side = computed(() =>
	props.source === "villager" ? "a" : props.area <= 2 ? "a" : "b",
);

const src = computed(() =>
	props.source === "villager"
		? `/PalmIsland/bvi-${props.cardNo}${side.value}.png`
		: `/PalmIsland/b${props.cardNo}-${side.value}.png`,
);

const boxStyle = computed(() => ({
	width: `${props.width}px`,
	height: `${Math.round((props.width * IMG_H * crop.value.height) / IMG_W)}px`,
}));

/** 把 crop 区域铺满容器：高度放大到 1/height，再用纵向位移抵消顶部偏移 */
const frameStyle = computed(() => ({
	backgroundImage: `url("${src.value}")`,
	backgroundSize: `100% ${(100 / crop.value.height).toFixed(4)}%`,
	backgroundPosition: `0% ${((crop.value.top / (1 - crop.value.height)) * 100).toFixed(4)}%`,
}));

/** 倒置朝向靠外层旋转摆正，避免与过渡动画的 transform 冲突 */
const spinStyle = computed(() => ({
	transform: crop.value.rotate ? "rotate(180deg)" : "none",
}));

const frameKey = computed(
	() => `${props.source}-${props.cardNo}-${props.area}`,
);
</script>

<template>
	<div class="palm-area" :style="boxStyle">
		<div class="palm-area__spin" :style="spinStyle">
			<Transition name="palm-turn">
				<div
					:key="frameKey"
					class="palm-area__frame"
					:style="frameStyle" />
			</Transition>
		</div>
	</div>
</template>

<style scoped>
.palm-area {
	position: relative;
	overflow: hidden;
	border-radius: 12px;
	background: #0b1220;
}

.palm-area__spin {
	position: absolute;
	inset: 0;
}

.palm-area__frame {
	position: absolute;
	inset: 0;
	background-repeat: no-repeat;
	user-select: none;
}

.palm-turn-enter-active,
.palm-turn-leave-active {
	transition:
		opacity 200ms ease,
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.palm-turn-enter-from {
	opacity: 0;
	transform: scale(0.92) rotate(-6deg);
}

.palm-turn-leave-to {
	opacity: 0;
	transform: scale(0.96) rotate(6deg);
}
</style>
