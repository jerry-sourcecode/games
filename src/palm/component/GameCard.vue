<script setup>
import { computed, ref } from "vue";

const props = defineProps({
	cardId: { type: [String, Number], default: "" },
	// 位置（相对父容器左上角）
	x: { type: Number, default: 0 },
	y: { type: Number, default: 0 },
	// 尺寸
	width: { type: Number, default: 120 },
	height: { type: Number, default: 168 },
	// 旋转角度（度）
	rotation: { type: Number, default: 0 },
	// 是否翻到背面
	flipped: { type: Boolean, default: false },
	// 是否可见（false 时播放消失动画）
	visible: { type: Boolean, default: true },
	// 交互
	clickable: { type: Boolean, default: true },
	flipOnClick: { type: Boolean, default: false },
	selected: { type: Boolean, default: false },
	hoverLift: { type: Boolean, default: true },
	// 动画时长
	moveDuration: { type: Number, default: 320 },
	flipDuration: { type: Number, default: 600 },
	rotateDuration: { type: Number, default: 280 },
	// 消失动画类型：'fade' | 'scale' | 'fly'
	leaveAnimation: { type: String, default: "fade" },
	zIndex: { type: Number, default: 1 },
});

const emit = defineEmits([
	"click",
	"flip",
	"contextmenu",
	"dblclick",
	"after-leave",
]);

const hovered = ref(false);

const outerStyle = computed(() => ({
	"--gc-move-duration": `${props.moveDuration}ms`,
	left: `${props.x}px`,
	top: `${props.y}px`,
	width: `${props.width}px`,
	height: `${props.height}px`,
	zIndex: props.zIndex,
}));

// 旋转 + hover 抬起（translateY 在 rotate 之后，沿卡牌自身方向抬升）
const innerStyle = computed(() => ({
	transform: `rotate(${props.rotation}deg) translateY(${
		props.hoverLift && props.clickable && hovered.value ? -6 : 0
	}px)`,
	transitionDuration: `${props.rotateDuration}ms`,
}));

// 翻面
const flipperStyle = computed(() => ({
	transform: `rotateY(${props.flipped ? 180 : 0}deg)`,
	transitionDuration: `${props.flipDuration}ms`,
}));

const leaveDuration = computed(() => {
	const map = { fade: 300, scale: 360, fly: 480 };
	return map[props.leaveAnimation] ?? 300;
});

function handleClick(e) {
	if (!props.clickable) return;
	emit("click", { id: props.cardId, event: e });
	if (props.flipOnClick) {
		emit("flip", { id: props.cardId, flipped: !props.flipped });
	}
}
</script>

<template>
	<Transition
		name="gc"
		:duration="{ enter: 250, leave: leaveDuration }"
		@after-leave="emit('after-leave', { id: cardId })">
		<div
			v-if="visible"
			class="game-card"
			:class="{
				'game-card--clickable': clickable,
				'game-card--selected': selected,
			}"
			:data-leave-anim="leaveAnimation"
			:style="outerStyle"
			@click="handleClick"
			@mouseenter="hovered = true"
			@mouseleave="hovered = false"
			@contextmenu.prevent="
				emit('contextmenu', { id: cardId, event: $event })
			"
			@dblclick="emit('dblclick', { id: cardId, event: $event })">
			<div class="game-card__inner" :style="innerStyle">
				<div class="game-card__flipper" :style="flipperStyle">
					<div class="game-card__face game-card__face--front">
						<slot name="front" />
					</div>
					<div class="game-card__face game-card__face--back">
						<slot name="back" />
					</div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.game-card {
	position: absolute;
	left: 0;
	top: 0;
	perspective: 1200px;
	transition-property: left, top;
	transition-duration: var(--gc-move-duration, 320ms);
	transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
	will-change: left, top;
	--gc-radius: 12px;
	--gc-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.game-card--clickable {
	cursor: pointer;
}

.game-card__inner {
	position: relative;
	width: 100%;
	height: 100%;
	transform-style: preserve-3d;
	transition-property: transform;
	transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
	will-change: transform;
}

.game-card__flipper {
	position: absolute;
	inset: 0;
	transform-style: preserve-3d;
	transition-property: transform;
	transition-timing-function: cubic-bezier(0.3, 0.7, 0.2, 1);
	will-change: transform;
}

.game-card__face {
	position: absolute;
	inset: 0;
	border-radius: var(--gc-radius);
	overflow: hidden;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
	background: linear-gradient(160deg, #2a2d3e 0%, #1a1c2a 100%);
	border: 1px solid rgba(255, 255, 255, 0.1);
	box-shadow: var(--gc-shadow);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #e8eaf6;
	font-size: 32px;
	font-weight: 700;
	user-select: none;
}

.game-card__face--back {
	transform: rotateY(180deg);
}

.game-card--selected .game-card__face {
	border-color: #00e5ff;
	box-shadow:
		0 0 0 3px rgba(0, 229, 255, 0.35),
		var(--gc-shadow);
}

/* ---------- 进入 ---------- */
.gc-enter-from {
	opacity: 0;
	transform: scale(0.85);
}
.gc-enter-active {
	transition:
		opacity 0.25s ease,
		transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.gc-enter-to {
	opacity: 1;
	transform: scale(1);
}

/* ---------- 离开：基础 ---------- */
.gc-leave-active {
	transition:
		opacity 0.3s ease,
		transform 0.3s ease;
}
.gc-leave-to {
	opacity: 0;
}

/* 缩放消失 */
.game-card[data-leave-anim="scale"].gc-leave-active {
	transition:
		opacity 0.36s ease,
		transform 0.36s cubic-bezier(0.4, 0, 0.6, 1);
}
.game-card[data-leave-anim="scale"].gc-leave-to {
	opacity: 0;
	transform: scale(0.25) rotate(-12deg);
}

/* 飞走 */
.game-card[data-leave-anim="fly"].gc-leave-active {
	transition:
		opacity 0.48s ease,
		transform 0.48s cubic-bezier(0.4, 0, 0.6, 1);
}
.game-card[data-leave-anim="fly"].gc-leave-to {
	opacity: 0;
	transform: translateY(-180px) rotate(24deg) scale(0.8);
}
</style>
