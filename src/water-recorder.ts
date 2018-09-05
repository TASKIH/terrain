import { TerrainPointContainer, TerrainPoint } from './terrain-interfaces';

export interface Water {
    amount: number;
    deadEnd: boolean;
}
export interface FlowResult {
    isFinished: boolean,
    hasDeadend?: boolean,
};
export interface WaterFlowResult {
    waters: {[key: number]: Water};
    records: WaterRecorder;
    result: FlowResult
}
export interface WaterFlow {
    from: TerrainPoint;
    to: TerrainPoint;
    amount: number;
}
export class WaterRecorder {
    /**
     * Fromのpoint.idをキーにしたWaterFlowRecords
     * @type {any[]}
     */
    public records: {[key: number]: {[key: number]: WaterFlow}} = {};

    /**
     * 水量のサマリーを返す
     */
    public getSummaryWater(): {[key: number]: number} {
        let result: {[key: number]: number} = {};

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
    public hasOppositeFlowRecord(from: TerrainPoint, to: TerrainPoint): boolean {
        const currentToWaters = this.records[to.id];
        if (!currentToWaters) {
            return false;
        }
        
        return !!currentToWaters[from.id];
    }

    public addWaterFlow(from: TerrainPoint, to: TerrainPoint, amount: number): WaterFlow {
        let currentFromWaters = this.records[from.id];
        let targetRecord: WaterFlow | undefined = undefined;

        if (currentFromWaters) {
            targetRecord = currentFromWaters[to.id];
        } else {
            this.records[from.id] = {};
            currentFromWaters = this.records[from.id];
        }
        if (!targetRecord) {
            targetRecord = {
                from: from,
                to: to,
                amount: 0,
            }
            currentFromWaters[to.id] = targetRecord;
        }

        targetRecord.amount += amount;

        return targetRecord;
    }
}