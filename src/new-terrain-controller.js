var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./terrain-interfaces", "./mesh-generator", "./util", "./terrain-drawer", "./terrain-generator", "./water-erosion-executor", "./continent-generator", "./feature-generator/river-generator", "./icons/icon-displayer", "./event-handler", "./status-store", "./loading-handler"], function (require, exports, d3, terrain_interfaces_1, mesh_generator_1, util_1, terrain_drawer_1, terrain_generator_1, water_erosion_executor_1, continent_generator_1, river_generator_1, icon_displayer_1, event_handler_1, status_store_1, loading_handler_1) {
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
    var primCtrlDiv = d3.select("div#prim-ctrl");
    var primDiv = d3.select("div#prim");
    var primSVG = addSVG(primDiv);
    var tmpMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096, mapExtent);
    const render = {
        mesh: tmpMesh,
        h: terrain_generator_1.TerrainGenerator.generateZeroHeights(tmpMesh)
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
                    case terrain_interfaces_1.EventKind.WholeMapChanged:
                        terrain_generator_1.TerrainGenerator.setShadows(status_store_1.CurrentStatus.render.mesh, status_store_1.CurrentStatus.render.h);
                        terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, status_store_1.CurrentStatus.render.mesh, status_store_1.CurrentStatus.render.h, mapEventHandler, -1, 1, 'prim-info', true);
                        status_store_1.CurrentStatus.render.coasts = terrain_drawer_1.TerrainDrawer.generateContour(status_store_1.CurrentStatus.render.mesh, status_store_1.CurrentStatus.render.h, 0);
                        terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'river', status_store_1.CurrentStatus.render.rivers);
                        terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', status_store_1.CurrentStatus.render.coasts);
                        terrain_drawer_1.TerrainDrawer.visualizeIcons(primSVG, status_store_1.CurrentStatus.render, mapEventHandler);
                        terrain_drawer_1.TerrainDrawer.drawLabels(primSVG, status_store_1.CurrentStatus.render);
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
    function onSelectSymbolClick() {
        mapEventHandler.onSelectSymbolClick();
    }
    exports.onSelectSymbolClick = onSelectSymbolClick;
    function onSymbolChangeClick() {
        mapEventHandler.onSymbolChangeClick();
    }
    exports.onSymbolChangeClick = onSymbolChangeClick;
    function onSymbolDeleteClick() {
        mapEventHandler.onSymbolDeleteClick();
    }
    exports.onSymbolDeleteClick = onSymbolDeleteClick;
    function onMapSaveClick() {
        loading_handler_1.LoadingHandler.setLoadingVisibility(true, 'セーブ中...');
        setTimeout(function () {
            mapEventHandler.onMapSaveClick();
            loading_handler_1.LoadingHandler.setLoadingVisibility(false);
        }, 50);
    }
    exports.onMapSaveClick = onMapSaveClick;
    function onMapLoadClick(evt) {
        loading_handler_1.LoadingHandler.setLoadingVisibility(true, 'ロード中...');
        setTimeout(function () {
            mapEventHandler.onMapLoadClick(evt);
        }, 50);
    }
    exports.onMapLoadClick = onMapLoadClick;
    function onDownloadClick() {
        loading_handler_1.LoadingHandler.setLoadingVisibility(true, '画像ファイルを生成中...');
        setTimeout(function () {
            mapEventHandler.onMapExport('map-svg');
        }, 50);
    }
    exports.onDownloadClick = onDownloadClick;
    function onSelModeShadowClick() {
        mapEventHandler.onSelModeShadowClick();
    }
    exports.onSelModeShadowClick = onSelModeShadowClick;
    function addSVG(div) {
        return div.insert("svg", ":first-child")
            .attr("height", mapExtent.height)
            .attr("width", mapExtent.width)
            .attr("viewBox", getViewBoxString())
            .attr("class", "select-mode")
            .attr("id", "map-svg")
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
        icon_displayer_1.displayIcon(mapEventHandler);
        function primDraw() {
            const myRender = status_store_1.CurrentStatus.render;
            terrain_generator_1.TerrainGenerator.setShadows(myRender.mesh, myRender.h);
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, myRender.mesh, myRender.h, mapEventHandler, -1, 1, 'prim-info', true);
            // TerrainDrawer.visualizeSlopes(primSVG, myRender);
            if (myRender.rivers) {
                terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'river', myRender.rivers);
            }
            if (myRender.coasts) {
                terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);
            }
        }
        primDraw();
        primCtrlDiv.append("button")
            .text("Reset to flat")
            .on("click", function () {
            const myRender = status_store_1.CurrentStatus.render;
            myRender.h = terrain_generator_1.TerrainGenerator.generateZeroHeights(myRender.mesh);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("パンゲアの生成")
            .on("click", function () {
            loading_handler_1.LoadingHandler.setLoadingVisibility(true, 'パンゲアを生成中...');
            setTimeout(function () {
                const myRender = status_store_1.CurrentStatus.render;
                myRender.mesh = mesh_generator_1.MeshGenerator.generateGoodMesh(100, mapExtent);
                myRender.h = continent_generator_1.ContinentGenerator.generate(myRender.mesh, continent_generator_1.pangeaTerrainSeed);
                myRender.coasts = terrain_drawer_1.TerrainDrawer.generateContour(myRender.mesh, myRender.h, 0);
                const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(myRender.mesh, myRender.h, 0.1);
                drawWaterFlow(myRender.mesh, myRender.h, waterFlowRate);
                primDraw();
                loading_handler_1.LoadingHandler.setLoadingVisibility(false);
            }, 50);
        });
        primCtrlDiv.append("button")
            .text("大陸の生成")
            .on("click", function () {
            loading_handler_1.LoadingHandler.setLoadingVisibility(true, '大陸を生成中...');
            setTimeout(function () {
                const myRender = status_store_1.CurrentStatus.render;
                myRender.mesh = mesh_generator_1.MeshGenerator.generateGoodMesh(16038, mapExtent);
                myRender.h = continent_generator_1.ContinentGenerator.generate(myRender.mesh, continent_generator_1.continentTerrainSeed);
                myRender.coasts = terrain_drawer_1.TerrainDrawer.generateContour(myRender.mesh, myRender.h, 0);
                const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(myRender.mesh, myRender.h, 0.1);
                drawWaterFlow(myRender.mesh, myRender.h, waterFlowRate);
                primDraw();
                loading_handler_1.LoadingHandler.setLoadingVisibility(false);
            }, 50);
        });
        primCtrlDiv.append("button")
            .text("地方図の生成")
            .on("click", function () {
            loading_handler_1.LoadingHandler.setLoadingVisibility(true, '地方図を生成中...');
            setTimeout(function () {
                const myRender = status_store_1.CurrentStatus.render;
                const localViewExtent = Object.assign({}, mapExtent);
                localViewExtent.height = localViewExtent.height += 500;
                localViewExtent.width = localViewExtent.width += 500;
                myRender.mesh = mesh_generator_1.MeshGenerator.generateGoodMesh(16038, localViewExtent);
                myRender.h = continent_generator_1.ContinentGenerator.generate(myRender.mesh, continent_generator_1.localViewTerrainSeed);
                myRender.coasts = terrain_drawer_1.TerrainDrawer.generateContour(myRender.mesh, myRender.h, 0);
                const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(myRender.mesh, myRender.h, 0.1);
                drawWaterFlow(myRender.mesh, myRender.h, waterFlowRate);
                primDraw();
                loading_handler_1.LoadingHandler.setLoadingVisibility(false);
            }, 50);
        });
        function drawWaterFlow(mesh, h, waterFlowRate) {
            const myRender = status_store_1.CurrentStatus.render;
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
            const waterConnections = river_generator_1.RiverGenerator.generateRivers(render.mesh, render.h, 100, 10);
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
            myRender.rivers = util_1.TerrainCalcUtil.mergeSegments(flowPoints).map(terrain_generator_1.TerrainGenerator.relaxPath);
        }
        primCtrlDiv.append("button")
            .text("地形の高さを見る")
            .on("click", function () {
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("単純な浸食を実行")
            .on("click", function () {
            const myRender = status_store_1.CurrentStatus.render;
            myRender.h = terrain_generator_1.TerrainGenerator.erodeSimply(myRender.mesh, myRender.h, 0.2);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("海岸線の整理")
            .on("click", function () {
            const myRender = status_store_1.CurrentStatus.render;
            myRender.h = terrain_generator_1.TerrainGenerator.cleanCoast(myRender.mesh, myRender.h, 1);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("不自然なメッシュを沈める")
            .on("click", function () {
            const myRender = status_store_1.CurrentStatus.render;
            myRender.h = terrain_generator_1.TerrainGenerator.sinkUnnaturalCoastSideMesh(myRender.mesh, myRender.h);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("Relax")
            .on("click", function () {
            const myRender = status_store_1.CurrentStatus.render;
            myRender.h = terrain_generator_1.TerrainGenerator.relax(myRender.mesh, myRender.h);
            primDraw();
        });
        primCtrlDiv.append("button")
            .text("水による浸食")
            .on("click", function () {
            const myRender = status_store_1.CurrentStatus.render;
            for (let i = 0; i < 5; i++) {
            }
            const waterFlowRate = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlowRate(myRender.mesh, myRender.h, 0.1);
            drawWaterFlow(myRender.mesh, myRender.h, waterFlowRate);
            myRender.h = water_erosion_executor_1.WaterErosionExecutor.erodeByWaterRate(myRender.mesh, myRender.h, waterFlowRate, 0.01);
            primDraw();
        });
        loading_handler_1.LoadingHandler.setLoadingVisibility(false);
    }
    exports.drawTerrainControll = drawTerrainControll;
});
