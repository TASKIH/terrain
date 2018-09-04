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
