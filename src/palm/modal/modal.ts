export namespace Palm {
    export type Item = "Rock" | "Fish" | "Log";
    export type Condition = Partial<Record<Item, number>>;
    export class ConditionComp {
        cons: Condition[] = [];
    }
    export function FREE() {
        return new ConditionComp;
    }
    /**
     * 常驻能力：只看这张牌当前朝向。升级触发类（upgradeScore）在每次升级时结算，
     * 静态类（storeLimit）实时生效。
     */
    export type Ability =
        | {
              /** 每次升级（旋转 / 翻面）获得 amount 颗星 */
              id: "upgradeScore";
              amount: number;
          }
        | {
              /** 任一资源消耗减少 amount（未实装，仅记录） */
              id: "discount";
              amount: number;
          }
        | {
              /** 已储存资源上限提升到 value */
              id: "storeLimit";
              value: number;
          }
        | {
              /** 免费生产指定资源（未实装，仅记录） */
              id: "freeProduce";
              gain: Condition;
          };
    export class Content {
        name?: string;
        /**
         * gain 是这张牌生产后作为资源提供的内容；
         * wild 表示产出万能资源（支付时可当作任意一种资源）。
         */
        produce?: { gain: Condition, cons?: Condition[], wild?: number, once?: boolean };
        repu?: number = 0;
        rotate?: ConditionComp = new ConditionComp;
        flip?: ConditionComp = new ConditionComp;
        ability?: Ability;
        /**
         * 额外门槛：除了资源之外还需要满足的条件。
         * housesUpgraded = 需要几张「房屋」已经升级到朝向 3 或更高。
         */
        require?: { housesUpgraded?: number };
        /** 未实装能力的牌面说明 */
        note?: string;
    }
    export type Card = Record<1 | 2 | 3 | 4, Content>;
    /** 只用到部分朝向的牌（村民卡只有招募面与村民面） */
    export type PartialCard = Partial<Record<1 | 2 | 3 | 4, Content>>;
}