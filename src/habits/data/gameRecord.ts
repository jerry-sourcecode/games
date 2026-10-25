import { defineStore } from "pinia";
import { ref } from "vue";
import { HabitsResultRecord } from "../modal/habitModal";

export const useHabitsRecord = defineStore('habitsRecord', () => {
    const result = ref<HabitsResultRecord[]>([])

    return {
        result
    }
}, {
    persist: true
})