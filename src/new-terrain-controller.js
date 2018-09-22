var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./mesh-generator", "./util", "./terrain-drawer", "./terrain-generator", "./water-erosion-executor", "./water-recorder", "./continent-generator", "./feature-generator/river-generator"], function (require, exports, d3, mesh_generator_1, util_1, terrain_drawer_1, terrain_generator_1, water_erosion_executor_1, water_recorder_1, continent_generator_1, river_generator_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    function drawTerrainControll() {
        function mouseMove() {
            // console.log(d3.mouse(this));
        }
        function addSVG(div) {
            return div.insert("svg", ":first-child")
                .attr("height", 400)
                .attr("width", 400)
                .attr("viewBox", "-500 -500 1000 1000")
                .on('mousemove', mouseMove);
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
            var myRender = {
                mesh: wholeMapMesh,
                h: wholeMapHeights
            };
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, -1, 1, 'prim-info', false);
            terrain_drawer_1.TerrainDrawer.visualizeSlopes(primSVG, myRender);
            myRender.coasts = terrain_drawer_1.TerrainDrawer.generateContour(wholeMapMesh, wholeMapHeights, 0);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);
            const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(wholeMapMesh, wholeMapHeights, 0.1);
            drawWaterFlow(wholeMapMesh, wholeMapHeights, waterFlowRate);
        }
        primDraw();
        primDiv.append("button")
            .text("Reset to flat")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
            primDraw();
        });
        primDiv.append("button")
            .text("パンゲアの生成")
            .on("click", function () {
            wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096);
            wholeMapHeights = continent_generator_1.ContinentGenerator.generate(wholeMapMesh, continent_generator_1.pangeaTerrainSeed);
            primDraw();
        });
        primDiv.append("button")
            .text("大陸の生成")
            .on("click", function () {
            wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(16038);
            wholeMapHeights = continent_generator_1.ContinentGenerator.generate(wholeMapMesh, continent_generator_1.continentTerrainSeed);
            primDraw();
        });
        function drawWaterFlow(mesh, h, waterFlowRate) {
            const watersArray = [];
            for (let key1 in waterFlowRate) {
                let curRecord = waterFlowRate[key1];
                if (h[key1] <= 0) {
                    continue;
                }
                watersArray.push(curRecord.rate);
            }
            if (watersArray.length === 0) {
                return;
            }
            const mean = util_1.TerrainCalcUtil.mean(watersArray);
            const sd = util_1.TerrainCalcUtil.standardDeviation(watersArray, mean);
            const newWaterFlowRate = {};
            for (let key1 in waterFlowRate) {
                const waterFlow = waterFlowRate[key1];
                let deviationVal = (waterFlow.rate - mean) / sd;
                if (deviationVal > 1.2) {
                    newWaterFlowRate[key1] = waterFlow;
                }
            }
            const flowPoints = [];
            const waterConnections = river_generator_1.RiverGenerator.generateRivers(wholeMapMesh, wholeMapHeights, 100, 10);
            waterConnections.forEach(conn => {
                let curFromPt = conn.root;
                conn.route.forEach(rt => {
                    if (curFromPt.id === rt.id) {
                        return;
                    }
                    let newData = [];
                    let fromPt = [curFromPt.x, curFromPt.y];
                    let toPt = [rt.x, rt.y];
                    // 海に合流する場合は海への境界まで線を延ばす
                    if (h[curFromPt.id] <= 0) {
                        toPt = [(curFromPt.x + rt.x) / 2, (curFromPt.y + rt.y) / 2];
                    }
                    newData.push(fromPt);
                    newData.push(toPt);
                    flowPoints.push(newData);
                    curFromPt = rt;
                });
            });
            const rivers = util_1.TerrainCalcUtil.mergeSegments(flowPoints).map(terrain_generator_1.TerrainGenerator.relaxPath);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'river', rivers);
        }
        primDiv.append("button")
            .text("地形の高さを見る")
            .on("click", function () {
            primDraw();
        });
        primDiv.append("button")
            .text("単純な浸食を実行")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.erodeSimply(wholeMapMesh, wholeMapHeights, 0.2);
            primDraw();
        });
        primDiv.append("button")
            .text("海岸線の整理")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 1);
            primDraw();
        });
        primDiv.append("button")
            .text("不自然なメッシュを沈める")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.sinkUnnaturalCoastSideMesh(wholeMapMesh, wholeMapHeights);
            primDraw();
        });
        primDiv.append("button")
            .text("Relax")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.relax(wholeMapMesh, wholeMapHeights);
            primDraw();
        });
        primDiv.append("button")
            .text("水による浸食")
            .on("click", function () {
            for (let i = 0; i < 5; i++) {
            }
            const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(wholeMapMesh, wholeMapHeights, 0.1);
            drawWaterFlow(wholeMapMesh, wholeMapHeights, waterFlowRate);
            wholeMapHeights = water_erosion_executor_1.WaterErosionExecutor.erodeByWaterRate(wholeMapMesh, wholeMapHeights, waterFlowRate, 0.01);
            primDraw();
        });
    }
    exports.drawTerrainControll = drawTerrainControll;
});
