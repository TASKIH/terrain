define(["require", "exports", "./terrain-interfaces", "./terrain-generator", "./water-erosion-executor"], function (require, exports, terrain_interfaces_1, terrain_generator_1, water_erosion_executor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
    exports.pangeaRaiseSeed = [
        { riseHeight: 0.01, riseCount: 5, radius: 0.1 },
        { riseHeight: 0.015, riseCount: 20, radius: 0.05 },
        { riseHeight: -0.01, riseCount: 10, radius: 0.04 },
        { riseHeight: 0.2, riseCount: 1, radius: 0.2 },
    ];
    exports.continentRaiseSeed = [
        { riseHeight: 0.01, riseCount: 2, radius: 0.15 },
        { riseHeight: 0.005, riseCount: 15, radius: 0.05 },
        { riseHeight: -0.01, riseCount: 15, radius: 0.02 },
        { riseHeight: 0.15, riseCount: 2, radius: 0.1 },
    ];
    exports.defaultWaterFlowSeed = {
        rainAmount: 0.2,
        maxFlowAmount: 0.5,
    };
    exports.pangeaTerrainSeed = {
        layerCount: 5,
        riseSeed: exports.pangeaRaiseSeed,
        waterFlowSeed: exports.defaultWaterFlowSeed,
        waterErodeEffect: 0.005,
        eachLayerErodeCount: 1,
        mergedLayerErodeCount: 2,
        relaxCount: 8,
        cleanCoastCount: 1,
    };
    exports.continentTerrainSeed = {
        layerCount: 5,
        riseSeed: exports.continentRaiseSeed,
        waterFlowSeed: exports.defaultWaterFlowSeed,
        waterErodeEffect: 0.008,
        eachLayerErodeCount: 1,
        mergedLayerErodeCount: 3,
        relaxCount: 8,
        cleanCoastCount: 10,
    };
    class ContinentGenerator {
        static erodeByWater(mapMesh, mapHeight, rainAmount, erodeEffect, erodeCount) {
            //let currentWaterResult = WaterErosionExecutor.calcWaterFlow(mapMesh, mapHeight,                   rainAmount, maxFlowAmount);
            let currentWaterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(mapMesh, mapHeight, rainAmount);
            for (let i = 0; i < erodeCount; i++) {
                if (i == 5) {
                    currentWaterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(mapMesh, mapHeight, rainAmount);
                }
                mapHeight = water_erosion_executor_1.WaterErosionExecutor.erodeByWaterRate(mapMesh, mapHeight, currentWaterResult, erodeEffect);
            }
            return mapHeight;
        }
        static generate(mapMesh, seed) {
            let wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(mapMesh);
            let continentCount = seed.layerCount;
            for (let i = 0; i < continentCount; i++) {
                let currentHeight = terrain_generator_1.TerrainGenerator.generateZeroHeights(mapMesh);
                seed.riseSeed.forEach(s => {
                    currentHeight = terrain_generator_1.TerrainGenerator.mergeHeights(mapMesh, terrain_interfaces_1.MergeMethod.Add, currentHeight, terrain_generator_1.TerrainGenerator.generateContinent(mapMesh, s.riseHeight, s.riseCount, s.radius));
                });
                currentHeight = ContinentGenerator.erodeByWater(mapMesh, currentHeight, seed.waterFlowSeed.rainAmount, seed.waterErodeEffect, seed.eachLayerErodeCount);
                currentHeight = terrain_generator_1.TerrainGenerator.cleanCoast(mapMesh, currentHeight, seed.cleanCoastCount);
                wholeMapHeights = terrain_generator_1.TerrainGenerator.mergeHeights(mapMesh, terrain_interfaces_1.MergeMethod.Add, wholeMapHeights, currentHeight);
            }
            wholeMapHeights = ContinentGenerator.erodeByWater(mapMesh, wholeMapHeights, seed.waterFlowSeed.rainAmount, seed.waterErodeEffect, seed.mergedLayerErodeCount);
            for (let i = 0; i < seed.relaxCount; i++) {
                wholeMapHeights = terrain_generator_1.TerrainGenerator.relax(mapMesh, wholeMapHeights);
            }
            wholeMapHeights = ContinentGenerator.erodeByWater(mapMesh, wholeMapHeights, seed.waterFlowSeed.rainAmount, seed.waterErodeEffect, seed.mergedLayerErodeCount);
            for (let i = 0; i < seed.relaxCount; i++) {
                wholeMapHeights = terrain_generator_1.TerrainGenerator.relax(mapMesh, wholeMapHeights);
            }
            for (let i = 0; i < seed.cleanCoastCount; i++) {
                wholeMapHeights = terrain_generator_1.TerrainGenerator.cleanCoast(mapMesh, wholeMapHeights, seed.cleanCoastCount);
                wholeMapHeights = terrain_generator_1.TerrainGenerator.sinkUnnaturalCoastSideMesh(mapMesh, wholeMapHeights);
            }
            return wholeMapHeights;
        }
    }
    exports.ContinentGenerator = ContinentGenerator;
});
