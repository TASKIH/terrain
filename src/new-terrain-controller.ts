import * as d3 from 'd3';
import {
    MapRender, MapMesh, TerrainHeights, MergeMethod, TerrainPoint, MapExtent, MapEventListener, EventKind
} from './terrain-interfaces';
import { MeshGenerator } from './mesh-generator';
import { TerrainCalcUtil } from './util';
import { TerrainDrawer } from './terrain-drawer';
import { TerrainGenerator, defaultExtent } from './terrain-generator';
import { TerrainFeatureGenerator } from './terrain-feature-generator';
import { WaterErosionExecutor } from './water-erosion-executor';
import { WaterFlowResult, WaterRecorder, Water, WaterFlow, WaterFlowRate } from './water-recorder';
import { ContinentGenerator, pangeaTerrainSeed, continentTerrainSeed, localViewTerrainSeed } from './continent-generator';
import { RiverGenerator } from './feature-generator/river-generator';
import { displayIcon } from './icons/icon-displayer';
import { MapEventHandler } from './event-handler';
import { CurrentStatusStore, ControlStatus, CurrentStatus } from './status-store';
import { LoadingHandler } from './loading-handler';


const mapExtent: MapExtent = {
    width: 1000,
    height: 500,
    margin: 50,
}

CurrentStatus.onControlStatusChangeListeners.push(e => {
    onModeChange();
});


var primCtrlDiv = d3.select("div#prim-ctrl");
var primDiv = d3.select("div#prim");
var primSVG = addSVG(primDiv);

var tmpMesh = MeshGenerator.generateGoodMesh(4096, mapExtent);

const render: MapRender = {
    mesh: tmpMesh,
    h: TerrainGenerator.generateZeroHeights(tmpMesh)
}
CurrentStatus.render = render;

const eventListeners: MapEventListener[] = [
    {
        call: (kind: EventKind) => {
            switch (kind) {
                case EventKind.IconChanged:
                    TerrainDrawer.visualizeIcons(primSVG, render, mapEventHandler);
                    TerrainDrawer.drawLabels(primSVG, render);
                    break;

                case EventKind.LabelChanged:
                    TerrainDrawer.drawLabels(primSVG, render);
                    break;

                case EventKind.WholeMapChanged:
                    TerrainGenerator.setShadows(CurrentStatus.render!.mesh!, CurrentStatus.render!.h!);
                    TerrainDrawer.visualizeTriangles(primSVG, CurrentStatus.render!.mesh!, CurrentStatus.render!.h!, mapEventHandler, -1, 1, 'prim-info', true);
                    CurrentStatus.render!.coasts = TerrainDrawer.generateContour(CurrentStatus.render!.mesh!, CurrentStatus.render!.h!, 0);

                    TerrainDrawer.drawPaths(primSVG, 'river', CurrentStatus.render!.rivers);

                    TerrainDrawer.drawPaths(primSVG, 'coast', CurrentStatus.render!.coasts);
                    TerrainDrawer.visualizeIcons(primSVG, CurrentStatus.render!, mapEventHandler);
                    TerrainDrawer.drawLabels(primSVG, CurrentStatus.render!);
                    break;
            }
        }
    },
]
const mapEventHandler: MapEventHandler = new MapEventHandler(render, eventListeners);

export function onModeChange() {
    mapEventHandler.onModeChange();
}

export function onSelectSymbolClick() {
    mapEventHandler.onSelectSymbolClick();
}

export function onSymbolChangeClick() {
    mapEventHandler.onSymbolChangeClick();
}

export function onSymbolDeleteClick() {
    mapEventHandler.onSymbolDeleteClick();
}

export function onMapSaveClick() {
    LoadingHandler.setLoadingVisibility(true, 'セーブ中...');

    setTimeout(function(){
        mapEventHandler.onMapSaveClick();
        LoadingHandler.setLoadingVisibility(false);
    }, 50);
}
export function onMapLoadClick(evt: any) {
    LoadingHandler.setLoadingVisibility(true, 'ロード中...');

    setTimeout(function(){
        mapEventHandler.onMapLoadClick(evt);
    }, 50);
}
export function onDownloadClick() {
    LoadingHandler.setLoadingVisibility(true, '画像ファイルを生成中...');

    setTimeout(function(){
        mapEventHandler.onMapExport('map-svg');
    }, 50);
}
export function onSelModeShadowClick() {
    mapEventHandler.onSelModeShadowClick();
}
function addSVG(div: any) {
    return div.insert("svg", ":first-child")
        .attr("height", mapExtent.height)
        .attr("width", mapExtent.width)
        .attr("viewBox", getViewBoxString())
        .attr("class", "select-mode")
        .attr("id", "map-svg")
        .on('mousemove', mouseMove);
}
function getViewBoxString(): string {
    const x = mapExtent.width / 2 * (-1);
    const y = mapExtent.height / 2 * (-1);
    return x + ' ' + y + ' ' + mapExtent.width + ' ' + mapExtent.height;
}
function mouseMove(this: any) {
    // console.log(d3.mouse(this));
}

export function drawTerrainControll() {

    displayIcon(mapEventHandler);

    function primDraw() {
        const myRender = CurrentStatus.render!;
        TerrainGenerator.setShadows(myRender.mesh!, myRender.h);
        TerrainDrawer.visualizeTriangles(primSVG, myRender.mesh!, myRender.h, mapEventHandler, -1, 1, 'prim-info', true);
        // TerrainDrawer.visualizeSlopes(primSVG, myRender);
        if (myRender.rivers) {
            TerrainDrawer.drawPaths(primSVG, 'river', myRender.rivers);
        }
        if (myRender.coasts) {
            TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);
        }
    }
    primDraw();

    primCtrlDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            const myRender = CurrentStatus.render!;
            myRender.h = TerrainGenerator.generateZeroHeights(myRender.mesh!);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("パンゲアの生成")
        .on("click", function () {
            LoadingHandler.setLoadingVisibility(true, 'パンゲアを生成中...');

            setTimeout(function(){
                const myRender = CurrentStatus.render!;
                myRender.mesh = MeshGenerator.generateGoodMesh(100, mapExtent);
                myRender.h = ContinentGenerator.generate(myRender.mesh!, pangeaTerrainSeed);

                myRender.coasts = TerrainDrawer.generateContour(myRender.mesh!, myRender.h, 0);

                const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(myRender.mesh!, myRender.h, 0.1);
                drawWaterFlow(myRender.mesh!, myRender.h, waterFlowRate);

                primDraw();
                LoadingHandler.setLoadingVisibility(false);
            }, 50);
        });

    primCtrlDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            LoadingHandler.setLoadingVisibility(true, '大陸を生成中...');

            setTimeout(function(){
                const myRender = CurrentStatus.render!;
                myRender.mesh = MeshGenerator.generateGoodMesh(16038, mapExtent);
                myRender.h = ContinentGenerator.generate(myRender.mesh!, continentTerrainSeed);
                myRender.coasts = TerrainDrawer.generateContour(myRender.mesh!, myRender.h, 0);
                const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(myRender.mesh!, myRender.h, 0.1);
                drawWaterFlow(myRender.mesh!, myRender.h, waterFlowRate);
                primDraw();
                LoadingHandler.setLoadingVisibility(false);
            }, 50);
        });

    primCtrlDiv.append("button")
        .text("地方図の生成")
        .on("click", function () {
            LoadingHandler.setLoadingVisibility(true, '地方図を生成中...');

            setTimeout(function(){
                const myRender = CurrentStatus.render!;
                const localViewExtent = {...mapExtent};
                localViewExtent.height = localViewExtent.height += 500;
                localViewExtent.width = localViewExtent.width += 500;
                myRender.mesh = MeshGenerator.generateGoodMesh(16038, localViewExtent);
                myRender.h = ContinentGenerator.generate(myRender.mesh!, localViewTerrainSeed);

                myRender.coasts = TerrainDrawer.generateContour(myRender.mesh!, myRender.h, 0);

                const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(myRender.mesh!, myRender.h, 0.1);
                drawWaterFlow(myRender.mesh!, myRender.h, waterFlowRate);

                primDraw();
                LoadingHandler.setLoadingVisibility(false);
            }, 50);
        });

    function drawWaterFlow(mesh: MapMesh, h: TerrainHeights, waterFlowRate: { [key: number]: WaterFlowRate }) {
        const myRender = CurrentStatus.render!;
        const watersArray: number[] = [];
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
        const mean = TerrainCalcUtil.mean(watersArray);
        const sd = TerrainCalcUtil.standardDeviation(watersArray, mean);
        const newWaterFlowRate: { [key: number]: WaterFlowRate } = {};

        for (let key1 in waterFlowRate) {
            const waterFlow = waterFlowRate[key1];
            let deviationVal = (waterFlow.rate - mean) / sd;
            if (deviationVal > 1.2) {
                newWaterFlowRate[key1] = waterFlow;
            }
        }

        const flowPoints: number[][][] = [];
        const waterConnections = RiverGenerator.generateRivers(render.mesh!, render.h!, 100, 10);

        waterConnections.forEach(conn => {

            let curFromPt: TerrainPoint = conn.root;
            conn.route.forEach(rt => {
                if (curFromPt.id === rt.id) {
                    return;
                }
                let newData: number[][] = [];
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
        myRender.rivers = TerrainCalcUtil.mergeSegments(flowPoints).map(TerrainGenerator.relaxPath);
    }

    primCtrlDiv.append("button")
        .text("地形の高さを見る")
        .on("click", function () {
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("単純な浸食を実行")
        .on("click", function () {
            const myRender = CurrentStatus.render!;
            myRender.h = TerrainGenerator.erodeSimply(myRender.mesh!, myRender.h, 0.2);
            primDraw();
        });


    primCtrlDiv.append("button")
        .text("海岸線の整理")
        .on("click", function () {
            const myRender = CurrentStatus.render!;
            myRender.h = TerrainGenerator.cleanCoast(myRender.mesh!, myRender.h, 1);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("不自然なメッシュを沈める")
        .on("click", function () {
            const myRender = CurrentStatus.render!;
            myRender.h = TerrainGenerator.sinkUnnaturalCoastSideMesh(myRender.mesh!, myRender.h);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("Relax")
        .on("click", function () {
            const myRender = CurrentStatus.render!;
            myRender.h = TerrainGenerator.relax(myRender.mesh!, myRender.h);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("水による浸食")
        .on("click", function () {
            const myRender = CurrentStatus.render!;
            for (let i = 0; i < 5; i++) {

            }
            const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(myRender.mesh!, myRender.h, 0.1);
            drawWaterFlow(myRender.mesh!, myRender.h, waterFlowRate);

            myRender.h = WaterErosionExecutor.erodeByWaterRate(myRender.mesh!, myRender.h, waterFlowRate, 0.01);
            primDraw();
        });

    LoadingHandler.setLoadingVisibility(false);
}
