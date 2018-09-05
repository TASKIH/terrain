define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
    class WaterRecorder {
        constructor() {
            /**
             * Fromのpoint.idをキーにしたWaterFlowRecords
             * @type {any[]}
             */
            this.records = {};
        }
        /**
         * 水量のサマリーを返す
         */
        getSummaryWater() {
            let result = {};
            for (let key in this.records) {
                const rec = this.records[key];
                for (let key2 in rec) {
                    result[key] = (result[key] || 0) + rec[key2].amount;
                    result[key2] = (result[key2] || 0) + rec[key2].amount;
                }
            }
            return result;
        }
        /**
         * from/toを逆にした記録が既に存在しているかどうか
         * @param from
         * @param to
         */
        hasOppositeFlowRecord(from, to) {
            const currentToWaters = this.records[to.id];
            if (!currentToWaters) {
                return false;
            }
            return !!currentToWaters[from.id];
        }
        addWaterFlow(from, to, amount) {
            let currentFromWaters = this.records[from.id];
            let targetRecord = undefined;
            if (currentFromWaters) {
                targetRecord = currentFromWaters[to.id];
            }
            else {
                this.records[from.id] = {};
                currentFromWaters = this.records[from.id];
            }
            if (!targetRecord) {
                targetRecord = {
                    from: from,
                    to: to,
                    amount: 0,
                };
                currentFromWaters[to.id] = targetRecord;
            }
            targetRecord.amount += amount;
            return targetRecord;
        }
    }
    exports.WaterRecorder = WaterRecorder;
});
