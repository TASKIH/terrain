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
    // 単純な浸食をする回数
    simpleErodeCount: number;
    // 海岸線を滑らかにする回数
    cleanCoastCount: number;
};

export const pangeaRaiseSeed: RiseSeed[] = [
    {riseHeight: 0.01, riseCount: 5, radius: 50},
    {riseHeight: 0.015, riseCount: 20, radius: 25},
    {riseHeight: -0.01, riseCount: 10, radius: 20},
    {riseHeight: 0.2, riseCount: 1, radius: 100},
];
export const continentRaiseSeed: RiseSeed[] = [
    {riseHeight: 0.01, riseCount: 3, radius: 600.15},
    {riseHeight: 0.005, riseCount: 15, radius: 300},
    {riseHeight: -0.01, riseCount: 15, radius: 50},
    {riseHeight: 0.15, riseCount: 2, radius: 200},
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
    relaxCount: 8,
    simpleErodeCount: 20,
    cleanCoastCount: 1,

} 
export const continentTerrainSeed: TerrainSeed = {
    layerCount: 5,
    riseSeed: continentRaiseSeed,
    waterFlowSeed: defaultWaterFlowSeed,
    waterErodeEffect: 0.008,
    eachLayerErodeCount: 1,
    mergedLayerErodeCount: 3,
    relaxCount: 5,
    simpleErodeCount: 20,
    cleanCoastCount: 10,

} 

export class ContinentGenerator {
    
    static erodeByWater(mapMesh: MapMesh,
                         mapHeight: TerrainHeights,
                         rainAmount: number,
                         erodeEffect: number,
                         erodeCount: number): TerrainHeights {
        //let currentWaterResult = WaterErosionExecutor.calcWaterFlow(mapMesh, mapHeight,                   rainAmount, maxFlowAmount);
        let currentWaterResult = WaterErosionExecutor.calcWaterFlowRate(mapMesh, mapHeight, rainAmount,);
        for(let i = 0; i < erodeCount; i++) {
            if (i == 5) {
                currentWaterResult = WaterErosionExecutor.calcWaterFlowRate(mapMesh, mapHeight, rainAmount);
            }
            mapHeight = WaterErosionExecutor.erodeByWaterRate(mapMesh, mapHeight, currentWaterResult, erodeEffect);   
        }
        return mapHeight;
    }

    static generate(mapMesh: MapMesh, seed: TerrainSeed): TerrainHeights {
        let wholeMapHeights = TerrainGenerator.generateZeroHeights(mapMesh);

        let continentCount = seed.layerCount;
        for(let i = 0; i < continentCount; i++) {
            let currentHeight = TerrainGenerator.generateZeroHeights(mapMesh);
            seed.riseSeed.forEach(s => {
                currentHeight = TerrainGenerator.mergeHeights(mapMesh, MergeMethod.Add, currentHeight, TerrainGenerator.generateContinent(mapMesh, s.riseHeight, s.riseCount, s.radius));
            });

            currentHeight = ContinentGenerator.erodeByWater(
                mapMesh, currentHeight, seed.waterFlowSeed.rainAmount, seed.waterErodeEffect,
                seed.eachLayerErodeCount);
            
            currentHeight = TerrainGenerator.cleanCoast(mapMesh, currentHeight, seed.cleanCoastCount);  
            wholeMapHeights = TerrainGenerator.mergeHeights(mapMesh, MergeMethod.Add, 
            wholeMapHeights, currentHeight);
        }
        wholeMapHeights = ContinentGenerator.erodeByWater(
            mapMesh, wholeMapHeights, seed.waterFlowSeed.rainAmount,  seed.waterErodeEffect,
            seed.mergedLayerErodeCount);

        for(let i = 0; i < seed.relaxCount; i++) {
            wholeMapHeights = TerrainGenerator.relax(mapMesh, wholeMapHeights);
        }
        wholeMapHeights = ContinentGenerator.erodeByWater(
            mapMesh, wholeMapHeights, seed.waterFlowSeed.rainAmount, seed.waterErodeEffect,
            seed.mergedLayerErodeCount);
            
        for(let i = 0; i < seed.cleanCoastCount; i++){
            wholeMapHeights = TerrainGenerator.cleanCoast(mapMesh, wholeMapHeights, seed.cleanCoastCount);
            wholeMapHeights = TerrainGenerator.sinkUnnaturalCoastSideMesh(mapMesh, wholeMapHeights);
        }
        for(let i = 0; i < seed.simpleErodeCount; i++) {
            wholeMapHeights = TerrainGenerator.erodeSimply(mapMesh, wholeMapHeights, 0.1);
        }

        return wholeMapHeights;
    }
}