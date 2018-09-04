import { TerrainPointContainer } from './terrain-interfaces';

export interface WaterFlow {
    from: TerrainPointContainer;
    to: TerrainPointContainer;
    amount: number;
}
export class WaterRecorder {
    /**
     * Fromのpoint.idをキーにしたWaterFlowRecords
     * @type {any[]}
     */
    records: {[key: number]: WaterFlow[]} = {};
    

}