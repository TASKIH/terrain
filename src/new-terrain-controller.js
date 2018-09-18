var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./mesh-generator", "./util", "./terrain-drawer", "./terrain-generator", "./water-erosion-executor", "./water-recorder", "./continent-generator"], function (require, exports, d3, mesh_generator_1, util_1, terrain_drawer_1, terrain_generator_1, water_erosion_executor_1, water_recorder_1, continent_generator_1) {
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
                params: terrain_generator_1.TerrainGenerator.defaultParams,
                mesh: wholeMapMesh,
                h: wholeMapHeights
            };
            //myRenderer.rivers = TerrainFeatureGenerator.getRivers(wholeMapMesh, wholeMapHeights, 0.005);
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, -1, 1, 'prim-info');
            terrain_drawer_1.TerrainDrawer.visualizeSlopes(primSVG, myRender);
            myRender.coasts = terrain_drawer_1.TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0);
            //TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);
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
            var myRender = {
                params: terrain_generator_1.TerrainGenerator.defaultParams,
                mesh: wholeMapMesh,
                h: wholeMapHeights
            };
            //myRenderer.rivers = TerrainFeatureGenerator.getRivers(wholeMapMesh, wholeMapHeights, 0.005);
            myRender.coasts = terrain_drawer_1.TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0);
            //TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);
            terrain_drawer_1.TerrainDrawer.visualizeSlopes(primSVG, myRender);
            primDraw();
        });
        primDiv.append("button")
            .text("大陸の生成")
            .on("click", function () {
            wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(2048);
            wholeMapHeights = continent_generator_1.ContinentGenerator.generate(wholeMapMesh, continent_generator_1.continentTerrainSeed);
            primDraw();
        });
        /**
         * 補助的な機能
         */
        let waterResult;
        function getTerminalPoint(mesh, waterRecord) {
            const fromPoints = {};
            for (let key1 in waterRecord.records) {
                let record = waterRecord.records[key1];
                for (let key2 in record) {
                    const flow = record[key2];
                    if (!fromPoints[flow.from.id]) {
                        fromPoints[flow.from.id] = true;
                    }
                    fromPoints[flow.to.id] = false;
                }
            }
            const result = [];
            for (let key in fromPoints) {
                if (fromPoints[key]) {
                    result.push(parseInt(key));
                }
            }
            return result;
        }
        function addRiverIfTerminal(records, fromPoint, currentRiver, rivers) {
            if (!currentRiver) {
                currentRiver = {
                    root: fromPoint,
                    route: []
                };
            }
            let curRecord = records[fromPoint.id];
            if (!curRecord) {
                currentRiver.dest = currentRiver.route[currentRiver.route.length - 1].to;
                rivers.push(currentRiver);
            }
            else {
                let isFirstLoop = true;
                for (let key2 in curRecord) {
                    let currentFlow = curRecord[key2];
                    if (isFirstLoop) {
                        currentRiver.route.push(currentFlow);
                        addRiverIfTerminal(records, currentFlow.to, currentRiver, rivers);
                        isFirstLoop = false;
                    }
                    else {
                        let newRiver = JSON.parse(JSON.stringify(currentRiver));
                        newRiver.route.push(currentFlow);
                        addRiverIfTerminal(records, currentFlow.to, newRiver, rivers);
                    }
                }
            }
        }
        function getTargetWaterFlowRecord(waterRecord, isTargetJudgeFunc) {
            let result = {};
            for (let key1 in waterRecord.records) {
                for (let key2 in waterRecord.records[key1]) {
                    let flow = waterRecord.records[key1][key2];
                    if (isTargetJudgeFunc(flow.amount)) {
                        if (!result[flow.from.id]) {
                            result[flow.from.id] = {};
                        }
                        result[flow.from.id][flow.to.id] = flow;
                    }
                }
            }
            return result;
        }
        function generateWaterConnection(mesh, waterRecord) {
            const rivers = [];
            const terminalPoints = getTerminalPoint(mesh, waterRecord);
            terminalPoints.forEach(pt => {
                addRiverIfTerminal(waterRecord.records, mesh.pointDict[pt].point, undefined, rivers);
            });
            return rivers;
        }
        function drawWaterFlow(mesh, h, waterRecord) {
            const watersArray = [];
            let records = waterRecord.records;
            for (let key1 in records) {
                let curRecord = records[key1];
                for (let key2 in curRecord) {
                    watersArray.push(curRecord[key2].amount);
                }
            }
            const mean = util_1.TerrainCalcUtil.mean(watersArray);
            const sd = util_1.TerrainCalcUtil.standardDeviation(watersArray, mean);
            const newTargetWaterRecord = new water_recorder_1.WaterRecorder();
            newTargetWaterRecord.records = getTargetWaterFlowRecord(waterRecord, (amount) => {
                let deviationVal = (amount - mean) / sd;
                return deviationVal > 1.2;
            });
            const flowPoints = [];
            const waterConnections = generateWaterConnection(mesh, newTargetWaterRecord);
            waterConnections.forEach(conn => {
                if (!conn.dest) {
                    return;
                }
                // 終着点が海ではない場合は川として扱わない
                if (h[conn.dest.id] > 0) {
                    return;
                }
                conn.route.forEach(rt => {
                    let newData = [];
                    // 既に川が海に合流している場合は描画しない
                    if (h[rt.from.id] < 0) {
                        return;
                    }
                    let fromPt = [rt.from.x, rt.from.y];
                    let toPt = [rt.to.x, rt.to.y];
                    // 海に合流する場合は海への境界まで線を延ばす
                    if (h[rt.to.id] <= 0) {
                        toPt = [(rt.from.x + rt.to.x) / 2, (rt.from.y + rt.to.y) / 2];
                    }
                    newData.push(fromPt);
                    newData.push(toPt);
                    flowPoints.push(newData);
                });
            });
            const rivers = util_1.TerrainCalcUtil.mergeSegments(flowPoints).map(terrain_generator_1.TerrainGenerator.relaxPath);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'river', rivers);
        }
        function primDrawWater(waterRecord) {
            let waters = {};
            let summaries = waterRecord.getSummaryWater();
            const watersArray = [];
            for (let key in summaries) {
                let summary = summaries[key];
                watersArray.push(summary);
            }
            const mean = util_1.TerrainCalcUtil.mean(watersArray);
            const sd = util_1.TerrainCalcUtil.standardDeviation(watersArray, mean);
            for (let key in summaries) {
                let summary = summaries[key];
                waters[key] = {
                    amount: (summary - mean) / sd,
                    deadEnd: false,
                    isRevived: false,
                };
            }
            terrain_drawer_1.TerrainDrawer.visualizeWater(primSVG, wholeMapMesh, waters);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', terrain_drawer_1.TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0));
        }
        primDiv.append("button")
            .text("水の流れの計算")
            .on("click", function () {
            waterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(wholeMapMesh, wholeMapHeights, 0.2, 0.5);
            drawWaterFlow(wholeMapMesh, wholeMapHeights, waterResult.records);
        });
        primDiv.append("button")
            .text("水の流れを見る")
            .on("click", function () {
            drawWaterFlow(wholeMapMesh, wholeMapHeights, waterResult.records);
        });
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
            .text("普通の浸食を実行")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.doErosion(wholeMapMesh, wholeMapHeights, 0.2);
            primDraw();
        });
        primDiv.append("button")
            .text("海岸線の整理")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 1);
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
            wholeMapHeights = water_erosion_executor_1.WaterErosionExecutor.erodeByWater(wholeMapMesh, wholeMapHeights, waterResult.waters, waterResult.records, 0.01);
            primDraw();
        });
    }
    exports.drawTerrainControll = drawTerrainControll;
});
