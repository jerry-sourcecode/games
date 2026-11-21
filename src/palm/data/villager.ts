import { Palm } from "../modal/modal";

/**
 * 村民扩展（bvi-1 ~ bvi-7）。
 *
 * 村民卡只有 a 面上的两个朝向：
 * - 朝向 1 = 招募面（🟡 付钱旋转即完成招募）
 * - 朝向 2 = 村民面（插画 + ★ + 能力）
 * 哨站画在 b 面上，本期不参与玩法，也不提供任何朝向。
 */
export const VillagerCards: Record<string, Palm.PartialCard> = {
    1: {
        1: { name: "首领", rotate: { cons: [{ Fish: 2, Rock: 2 }] } },
        2: {
            name: "首领",
            repu: 1,
            ability: { id: "upgradeScore", amount: 1 },
            note: "每次⬆房屋获得 1★",
        },
    },
    2: {
        1: { name: "建筑工", rotate: { cons: [{ Log: 2, Rock: 2 }] } },
        2: {
            name: "建筑工",
            ability: { id: "discount", amount: 1 },
            note: "激活：任何类型的资源减少 1 个消耗",
        },
    },
    3: {
        1: { name: "商人", rotate: { cons: [{ Log: 1, Fish: 1, Rock: 1 }] } },
        2: {
            name: "商人",
            ability: { id: "upgradeScore", amount: 1 },
            note: "每次⬆货栈或市场获得 1★",
        },
    },
    4: {
        1: { name: "长老", rotate: { cons: [{ Log: 2, Fish: 2 }] } },
        2: {
            name: "长老",
            repu: 1,
            ability: { id: "storeLimit", value: 5 },
            note: "激活：本回合存储资源上限增加到 5",
        },
    },
    5: {
        1: { name: "牧师", rotate: { cons: [{ Rock: 5 }] } },
        2: { name: "牧师", repu: 5 },
    },
    6: {
        1: { name: "导游", rotate: { cons: [] } },
        2: {
            name: "导游",
            repu: -4,
            // Free 生产，产出 1 个万能资源
            produce: { gain: {}, cons: [], wild: 1 },
            note: "生产时：产出 1 个万能资源",
        },
    },
    7: {
        1: { name: "掠夺者", rotate: { cons: [] } },
        2: {
            name: "掠夺者",
            repu: -6,
            // Free 生产，三种资源各拿 1 个
            produce: { gain: { Log: 1, Fish: 1, Rock: 1 }, cons: [] },
            note: ["生产时：", { Log: 1, Fish: 1, Rock: 1 }, " 各拿 1 个"],
        },
    },
};

/** 村民卡编号 */
export const villagerNos = Object.keys(VillagerCards)
    .map(Number)
    .sort((a, b) => a - b);
