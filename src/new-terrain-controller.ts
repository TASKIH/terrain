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
import { ContinentGenerator, pangeaTerrainSeed, continentTerrainSeed } from './continent-generator';
import { RiverGenerator } from './feature-generator/river-generator';
import { displayIcon } from './icon-displayer';
import { MapEventHandler } from './event-handler';
import { CurrentStatusStore, ControlStatus, CurrentStatus } from './status-store';

    
const mapExtent: MapExtent = {
    width: 1000,
    height: 500,
    margin: 50,
}

CurrentStatus.onControlStatusChangeListeners.push(e => {
    onModeChange();
});


var wholeMapMesh = MeshGenerator.generateGoodMesh(4096, mapExtent);
var wholeMapHeights = TerrainGenerator.generateZeroHeights(wholeMapMesh);

var primCtrlDiv = d3.select("div#prim-ctrl");
var primDiv = d3.select("div#prim");
var primSVG = addSVG(primDiv);

const render: MapRender = {
    mesh: wholeMapMesh,
    h: wholeMapHeights
}
CurrentStatus.render = render;

const eventListeners: MapEventListener[] = [
    {
        call: (kind: EventKind) => {
            switch(kind) {
                case EventKind.IconChanged:
                    TerrainDrawer.visualizeIcons(primSVG, render, mapEventHandler);
                    TerrainDrawer.drawLabels(primSVG, render);
                    break;

                case EventKind.LabelChanged:
                    TerrainDrawer.drawLabels(primSVG, render);
                    break;
            }
        }
    },
]
const mapEventHandler: MapEventHandler = new MapEventHandler(render, eventListeners);

export function onModeChange() {
    mapEventHandler.onModeChange();
}

export function onReleaseModeClick() {
    mapEventHandler.onReleaseModeClick();
}

export function onNameChangeClick() {
    mapEventHandler.onNameChangeClick();
}
    
function addSVG(div: any) {
    return div.insert("svg", ":first-child")
        .attr("height", mapExtent.height)
        .attr("width", mapExtent.width)
        .attr("viewBox", getViewBoxString())
        .attr("class", "select-mode")
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

    displayIcon();

    class ContinentData {
        continent: TerrainHeights = [];
        waters: { [key: number]: Water } = {};
        waterResult: WaterFlowResult = {
            waters: {},
            records: new WaterRecorder(),
            result: {
                hasDeadend: false,
                isFinished: false,
            }
        };
    }

    var continents: ContinentData[] = [];


    function primDraw() {
        render.mesh = wholeMapMesh;
        render.h = wholeMapHeights;

        TerrainGenerator.setShadows(render.mesh, render.h);
        TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, mapEventHandler, -1, 1, 'prim-info', true);
        // TerrainDrawer.visualizeSlopes(primSVG, myRender);
        render.coasts = TerrainDrawer.generateContour(wholeMapMesh, wholeMapHeights, 0);
        TerrainDrawer.drawPaths(primSVG, 'coast', render.coasts);

        const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(wholeMapMesh, wholeMapHeights, 0.1);
        drawWaterFlow(wholeMapMesh, wholeMapHeights, waterFlowRate);
    }
    primDraw();

    primCtrlDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.generateZeroHeights(wholeMapMesh);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("パンゲアの生成")
        .on("click", function () {
            wholeMapMesh = MeshGenerator.generateGoodMesh(100, mapExtent);
            wholeMapHeights = ContinentGenerator.generate(wholeMapMesh, pangeaTerrainSeed);

            primDraw();
        });

    primCtrlDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            wholeMapMesh = MeshGenerator.generateGoodMesh(16038, mapExtent);
            wholeMapHeights = ContinentGenerator.generate(wholeMapMesh, continentTerrainSeed);


            primDraw();
        });

    function drawWaterFlow(mesh: MapMesh, h: TerrainHeights, waterFlowRate: { [key: number]: WaterFlowRate }) {
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
        const waterConnections = RiverGenerator.generateRivers(wholeMapMesh, wholeMapHeights, 100, 10);

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
        const rivers = TerrainCalcUtil.mergeSegments(flowPoints).map(TerrainGenerator.relaxPath);
        TerrainDrawer.drawPaths(primSVG, 'river', rivers);
    }

    primCtrlDiv.append("button")
        .text("地形の高さを見る")
        .on("click", function () {
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("単純な浸食を実行")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.erodeSimply(wholeMapMesh, wholeMapHeights, 0.2);
            primDraw();
        });


    primCtrlDiv.append("button")
        .text("海岸線の整理")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 1);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("不自然なメッシュを沈める")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.sinkUnnaturalCoastSideMesh(wholeMapMesh, wholeMapHeights);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("Relax")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.relax(wholeMapMesh, wholeMapHeights);
            primDraw();
        });

    primCtrlDiv.append("button")
        .text("水による浸食")
        .on("click", function () {
            for (let i = 0; i < 5; i++) {

            }
            const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(wholeMapMesh, wholeMapHeights, 0.1);
            drawWaterFlow(wholeMapMesh, wholeMapHeights, waterFlowRate);

            wholeMapHeights = WaterErosionExecutor.erodeByWaterRate(wholeMapMesh, wholeMapHeights, waterFlowRate, 0.01);
            primDraw();
        });

}
