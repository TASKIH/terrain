import { MapMesh, TerrainHeights, MergeMethod } from "./terrain-interfaces";
import { TerrainGenerator } from "./terrain-generator";
import { WaterErosionExecutor } from "./water-erosion-executor";
import { TerrainCalcUtil } from "./util";

interface RiseSeed {
    riseHeight: number;
    riseCount: number;
    radius: number;
}
interface WaterFlowSeed {
    rainAmount: number;
    maxFlowAmount: number;
}
interface TerrainSeed {
    // 地形を何層作るか
    layerCount: number;
    // 起伏をつけるときの設定
    riseSeed: RiseSeed[];
    // 水の流れを決めるときの設定
    waterFlowSeed: WaterFlowSeed;
    // 水による浸食を決めるときの設定
    waterErodeEffect: number;
    // 各層の浸食回数
    eachLayerErodeCount: number;
    // 結合後層の浸食回数
    mergedLayerErodeCount: number;
    // なだらかにする回数
    relaxCount: number;
    // 海岸線を滑らかにする回数
    cleanCoastCount: number;
};

export const pangeaRaiseSeed: RiseSeed[] = [
    {riseHeight: 0.01, riseCount: 5, radius: 0.1},
    {riseHeight: 0.015, riseCount: 20, radius: 0.05},
    {riseHeight: -0.01, riseCount: 10, radius: 0.04},
    {riseHeight: 0.2, riseCount: 1, radius: 0.2},
];
export const continentRaiseSeed: RiseSeed[] = [
    {riseHeight: 0.01, riseCount: 2, radius: 0.15},
    {riseHeight: 0.005, riseCount: 15, radius: 0.05},
    {riseHeight: -0.01, riseCount: 15, radius: 0.02},
    {riseHeight: 0.15, riseCount: 2, radius: 0.1},
];
export const defaultWaterFlowSeed: WaterFlowSeed = {
    rainAmount: 0.2,
    maxFlowAmount: 0.5,
}
export const pangeaTerrainSeed: TerrainSeed = {
    layerCount: 5,
    riseSeed: pangeaRaiseSeed,
    waterFlowSeed: defaultWaterFlowSeed,
    waterErodeEffect: 0.005,
    eachLayerErodeCount: 1,
    mergedLayerErodeCount: 2,
    relaxCount: 5,
    cleanCoastCount: 1,

} 
export const continentTerrainSeed: TerrainSeed = {
    layerCount: 5,
    riseSeed: continentRaiseSeed,
    waterFlowSeed: defaultWaterFlowSeed,
    waterErodeEffect: 0.005,
    eachLayerErodeCount: 1,
    mergedLayerErodeCount: 3,
    relaxCount: 5,
    cleanCoastCount: 1,

} 

export class ContinentGenerator {
    
    static erodeByWater(mapMesh: MapMesh,
                         mapHeight: TerrainHeights,
                         rainAmount: number,
                         maxFlowAmount: number,
                         erodeEffect: number,
                         erodeCount: number): TerrainHeights {
        let currentWaterResult = WaterErosionExecutor.calcWaterFlow(mapMesh, mapHeight,                   rainAmount, maxFlowAmount);
        for(let i = 0; i < erodeCount; i++) {
            if (i == 5) {
                currentWaterResult = WaterErosionExecutor.calcWaterFlow(mapMesh, mapHeight,           rainAmount, maxFlowAmount);
            }
            mapHeight = WaterErosionExecutor.erodeByWater(mapMesh, mapHeight, currentWaterResult.waters, currentWaterResult.records, erodeEffect);   
        }
        return mapHeight;
    }

    static generate(mapMesh: MapMesh, seed: TerrainSeed): TerrainHeights {
        let wholeMapHeights = TerrainGenerator.generateZeroHeights(mapMesh);

        let continentCount = seed.layerCount;
        for(let i = 0; i < continentCount; i++) {
            let currentHeight = TerrainGenerator.generateZeroHeights(mapMesh);
            seed.riseSeed.forEach(s => {
                currentHeight = TerrainGenerator.mergeHeights(mapMesh, MergeMethod.Add, currentHeight, TerrainGenerator.continent(mapMesh, s.riseHeight, s.riseCount, s.radius));
            });

            currentHeight = ContinentGenerator.erodeByWater(
                mapMesh, currentHeight, seed.waterFlowSeed.rainAmount, seed.waterFlowSeed.maxFlowAmount, seed.waterErodeEffect,
                seed.eachLayerErodeCount);
            
            currentHeight = TerrainGenerator.doErosion(mapMesh, currentHeight, TerrainCalcUtil.runif(0, 0.1), 20);
            currentHeight = TerrainGenerator.cleanCoast(mapMesh, currentHeight, seed.cleanCoastCount);  
            wholeMapHeights = TerrainGenerator.mergeHeights(mapMesh, MergeMethod.Add, 
                wholeMapHeights, currentHeight);
        }

        wholeMapHeights = ContinentGenerator.erodeByWater(
            mapMesh, wholeMapHeights, seed.waterFlowSeed.rainAmount, seed.waterFlowSeed.maxFlowAmount, seed.waterErodeEffect,
            seed.mergedLayerErodeCount);

        for(let i = 0; i < seed.relaxCount; i++) {
            wholeMapHeights = TerrainGenerator.relax(mapMesh, wholeMapHeights);
        }
        wholeMapHeights = ContinentGenerator.erodeByWater(
            mapMesh, wholeMapHeights, seed.waterFlowSeed.rainAmount, seed.waterFlowSeed.maxFlowAmount, seed.waterErodeEffect,
            seed.mergedLayerErodeCount);
        for(let i = 0; i < seed.relaxCount; i++) {
            wholeMapHeights = TerrainGenerator.relax(mapMesh, wholeMapHeights);
        }

        return TerrainGenerator.cleanCoast(mapMesh, wholeMapHeights, seed.cleanCoastCount);  
    }
}