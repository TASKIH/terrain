var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./terrain-interfaces", "./mesh-generator", "./util", "./terrain-drawer", "./terrain-generator", "./water-erosion-executor", "./water-recorder", "./continent-generator", "./feature-generator/river-generator", "./icon-displayer", "./event-handler", "./status-store"], function (require, exports, d3, terrain_interfaces_1, mesh_generator_1, util_1, terrain_drawer_1, terrain_generator_1, water_erosion_executor_1, water_recorder_1, continent_generator_1, river_generator_1, icon_displayer_1, event_handler_1, status_store_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    const mapExtent = {
        width: 1000,
        height: 500,
        margin: 50,
    };
    status_store_1.CurrentStatus.onControlStatusChangeListeners.push(e => {
        onModeChange();
    });
    var wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096, mapExtent);
    var wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
    var primCtrlDiv = d3.select("div#prim-ctrl");
    var primDiv = d3.select("div#prim");
    var primSVG = addSVG(primDiv);
    const render = {
        mesh: wholeMapMesh,
        h: wholeMapHeights
    };
    status_store_1.CurrentStatus.render = render;
    const eventListeners = [
        {
            call: (kind) => {
                switch (kind) {
                    case terrain_interfaces_1.EventKind.IconChanged:
                        terrain_drawer_1.TerrainDrawer.visualizeIcons(primSVG, render, mapEventHandler);
                        terrain_drawer_1.TerrainDrawer.drawLabels(primSVG, render);
                        break;
                    case terrain_interfaces_1.EventKind.LabelChanged:
                        terrain_drawer_1.TerrainDrawer.drawLabels(primSVG, render);
                        break;
                }
            }
        },
    ];
    const mapEventHandler = new event_handler_1.MapEventHandler(render, eventListeners);
    function onModeChange() {
        mapEventHandler.onModeChange();
    }
    exports.onModeChange = onModeChange;
    function onReleaseModeClick() {
        mapEventHandler.onReleaseModeClick();
    }
    exports.onReleaseModeClick = onReleaseModeClick;
    function onNameChangeClick() {
        mapEventHandler.onNameChangeClick();
    }
    exports.onNameChangeClick = onNameChangeClick;
    function addSVG(div) {
        return div.insert("svg", ":first-child")
            .attr("height", mapExtent.height)
            .attr("width", mapExtent.width)
            .attr("viewBox", getViewBoxString())
            .attr("class", "select-mode")
            .on('mousemove', mouseMove);
    }
    function getViewBoxString() {
        const x = mapExtent.width / 2 * (-1);
        const y = mapExtent.height / 2 * (-1);
        return x + ' ' + y + ' ' + mapExtent.width + ' ' + mapExtent.height;
    }
    function mouseMove() {
        // console.log(d3.mouse(this));
    }
    function drawTerrainControll() {
        icon_displayer_1.displayIcon();
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
            render.mesh = wholeMapMesh;
            render.h = wholeMapHeights;
            terrain_generator_1.TerrainGenerator.setShadows(render.mesh, render.h);
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, mapEventHandler, -1, 1, 'prim-info', true);
            // TerrainDrawer.visualizeSlopes(primSVG, myRender);
            render.coasts = terrain_drawer_1.TerrainDrawer.generateContour(wholeMapMesh, wholeMapHeights, 0);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', render.coasts);
            const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(wholeMapMesh, wholeMapHeights, 0.1);
            drawWaterFlow(wholeMapMesh, wholeMapHeights, waterFlowRate);
        }
        primDraw();
        primCtrlDiv.append("button")
            .text("Reset to flat")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.generateZeroHeights(wholeMapMesh);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("パンゲアの生成")
            .on("click", function () {
            wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(100, mapExtent);
            wholeMapHeights = continent_generator_1.ContinentGenerator.generate(wholeMapMesh, continent_generator_1.pangeaTerrainSeed);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("大陸の生成")
            .on("click", function () {
            wholeMapMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(16038, mapExtent);
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
        primCtrlDiv.append("button")
            .text("地形の高さを見る")
            .on("click", function () {
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("単純な浸食を実行")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.erodeSimply(wholeMapMesh, wholeMapHeights, 0.2);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("海岸線の整理")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 1);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("不自然なメッシュを沈める")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.sinkUnnaturalCoastSideMesh(wholeMapMesh, wholeMapHeights);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("Relax")
            .on("click", function () {
            wholeMapHeights = terrain_generator_1.TerrainGenerator.relax(wholeMapMesh, wholeMapHeights);
            primDraw();
        });
        primCtrlDiv.append("button")
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
