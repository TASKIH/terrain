var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./mesh-generator", "./util", "./terrain-drawer", "./terrain-generator", "./terrain-feature-generator", "./water-erosion-executor", "./water-recorder"], function (require, exports, d3, mesh_generator_1, util_1, terrain_drawer_1, terrain_generator_1, terrain_feature_generator_1, water_erosion_executor_1, water_recorder_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    function drawTerrainControll() {
        function addSVG(div) {
            return div.insert("svg", ":first-child")
                .attr("height", 400)
                .attr("width", 400)
                .attr("viewBox", "-500 -500 1000 1000");
        }
        var primDiv = d3.select("div#prim");
        var primSVG = addSVG(primDiv);
        var wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096);
        var wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
        class ContinentData {
            constructor() {
                this.continent = [];
                this.waters = {};
                this.waterResult = {
                    waters: {},
                    records: new water_recorder_1.WaterRecorder(),
                    result: {
                        hasDeadend: false,
                        isFinished: false,
                    }
                };
            }
        }
        var continents = [];
        function primDraw() {
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, -1, 1);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', terrain_drawer_1.TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0));
        }
        primDraw();
        primDiv.append("button")
            .text("Reset to flat")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
            primDraw();
        });
        primDiv.append("button")
            .text("大陸の生成")
            .on("click", function () {
            wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(2048);
            wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
            let continentCount = 5;
            for (let i = 0; i < continentCount; i++) {
                let currentHeight = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
                currentHeight = terrain_generator_1.TerrainGenerator.mergeHeights(wholeMapMesh, currentHeight, terrain_generator_1.TerrainGenerator.continent(wholeMapMesh, 0.05, 5, 0.1));
                currentHeight = terrain_generator_1.TerrainGenerator.mergeHeights(wholeMapMesh, currentHeight, terrain_generator_1.TerrainGenerator.continent(wholeMapMesh, 0.05, 20, 0.05));
                currentHeight = terrain_generator_1.TerrainGenerator.mergeHeights(wholeMapMesh, currentHeight, terrain_generator_1.TerrainGenerator.continent(wholeMapMesh, -0.05, 10, 0.04));
                let currentWaterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(wholeMapMesh, currentHeight, 0.02, 0.5);
                for (let i = 0; i < 7; i++) {
                    if (i == 5) {
                        currentWaterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(wholeMapMesh, currentHeight, 0.02, 0.5);
                    }
                    currentHeight = water_erosion_executor_1.WaterErosionExecutor.erodeByWater(wholeMapMesh, currentHeight, currentWaterResult.waters, currentWaterResult.records, 0.005);
                    currentHeight = terrain_generator_1.TerrainGenerator.doErosion(wholeMapMesh, currentHeight, util_1.TerrainCalcUtil.runif(0, 0.1), 5);
                    currentHeight = terrain_generator_1.TerrainGenerator.cleanCoast(wholeMapMesh, currentHeight, 2);
                }
                wholeMapHeights = terrain_generator_1.TerrainGenerator.mergeHeights(wholeMapMesh, wholeMapHeights, currentHeight);
            }
            let currentWaterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(wholeMapMesh, wholeMapHeights, 0.02, 0.5);
            for (let i = 0; i < 7; i++) {
                if (i == 5) {
                    currentWaterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(wholeMapMesh, wholeMapHeights, 0.02, 0.5);
                }
                wholeMapHeights = water_erosion_executor_1.WaterErosionExecutor.erodeByWater(wholeMapMesh, wholeMapHeights, currentWaterResult.waters, currentWaterResult.records, 0.005);
                wholeMapHeights = terrain_generator_1.TerrainGenerator.doErosion(wholeMapMesh, wholeMapHeights, util_1.TerrainCalcUtil.runif(0, 0.1), 30);
                wholeMapHeights = terrain_generator_1.TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 2);
            }
            var myRenderer = {
                params: terrain_generator_1.TerrainGenerator.defaultParams,
                mesh: wholeMapMesh,
                h: wholeMapHeights
            };
            myRenderer.rivers = terrain_feature_generator_1.TerrainFeatureGenerator.getRivers(wholeMapMesh, myRenderer.h, 0.01);
            myRenderer.coasts = terrain_drawer_1.TerrainDrawer.contour(wholeMapMesh, myRenderer.h, 0);
            console.log(myRenderer.rivers);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', myRenderer.coasts);
            terrain_drawer_1.TerrainDrawer.visualizeSlopes(primSVG, myRenderer);
            primDraw();
        });
    }
    exports.drawTerrainControll = drawTerrainControll;
});
