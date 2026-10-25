<script setup lang="ts">
import { RouterView } from "vue-router";
import {
	NConfigProvider,
	darkTheme,
	type GlobalThemeOverrides,
} from "naive-ui";

const themeOverrides: GlobalThemeOverrides = {
	common: {
		primaryColor: "#34D399",
		primaryColorHover: "#6EE7B7",
		primaryColorPressed: "#10B981",
		primaryColorSuppl: "#34D399",
	},
};
</script>

<template>
	<n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
		<RouterView v-slot="{ Component }">
			<Transition name="fade" mode="out-in">
				<component :is="Component" />
			</Transition>
		</RouterView>
	</n-config-provider>
</template>
