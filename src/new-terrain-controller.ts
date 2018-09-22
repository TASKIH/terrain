import * as d3 from 'd3';
import {
    MapRender, MapMesh, TerrainHeights, MergeMethod, TerrainPoint
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

export function drawTerrainControll() {
    function mouseMove(this: any) {
        // console.log(d3.mouse(this));
    }
    function addSVG(div: any) {
        return div.insert("svg", ":first-child")
            .attr("height", 400)
            .attr("width", 400)
            .attr("viewBox", "-500 -500 1000 1000")
            .on('mousemove', mouseMove);
    }

    var primDiv = d3.select("div#prim");
    var primSVG = addSVG(primDiv);

    var wholeMapMesh = MeshGenerator.generateGoodMesh(4096);
    var wholeMapHeights = TerrainGenerator.generateZeroHeights(wholeMapMesh);
    
    class ContinentData {
        continent: TerrainHeights = [];
        waters: {[key: number]: Water} = {};
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
        var myRender: MapRender = {
            mesh: wholeMapMesh,
            h:  wholeMapHeights
        };

        TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, -1, 1, 'prim-info', false);
        TerrainDrawer.visualizeSlopes(primSVG, myRender);
        myRender.coasts = TerrainDrawer.generateContour(wholeMapMesh, wholeMapHeights, 0);
        TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);

        const waterFlowRate = WaterErosionExecutor.calcWaterFlowRate(wholeMapMesh, wholeMapHeights, 0.1);
        drawWaterFlow(wholeMapMesh, wholeMapHeights, waterFlowRate);
    }

    primDraw();

    primDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.generateZeroHeights(wholeMapMesh);
            primDraw();
        });

    primDiv.append("button")
        .text("パンゲアの生成")
        .on("click", function () {
            wholeMapMesh = MeshGenerator.generateGoodMesh(4096);
            wholeMapHeights = ContinentGenerator.generate(wholeMapMesh, pangeaTerrainSeed);
            
            primDraw();
        });

        primDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            wholeMapMesh = MeshGenerator.generateGoodMesh(16038);
            wholeMapHeights = ContinentGenerator.generate(wholeMapMesh, continentTerrainSeed);
            

            primDraw();
        });

    function drawWaterFlow(mesh: MapMesh, h: TerrainHeights, waterFlowRate: {[key: number]: WaterFlowRate}) {
        const watersArray: number[] = [];
        for (let key1 in waterFlowRate) {
            let curRecord = waterFlowRate[key1];
            if (h[key1] <= 0) {
                continue;
            }
            watersArray.push(curRecord.rate);
        }
        if (watersArray.length === 0) {
            return ;
        }
        const mean = TerrainCalcUtil.mean(watersArray);
        const sd = TerrainCalcUtil.standardDeviation(watersArray, mean);
        const newWaterFlowRate: {[key: number]: WaterFlowRate} = {};
    
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

    primDiv.append("button")
    .text("地形の高さを見る")
    .on("click", function () {
        primDraw();
    });

    primDiv.append("button")
    .text("単純な浸食を実行")
    .on("click", function () {
        wholeMapHeights = TerrainGenerator.erodeSimply(wholeMapMesh, wholeMapHeights, 0.2);
        primDraw();
    });


    primDiv.append("button")
    .text("海岸線の整理")
    .on("click", function () {
        wholeMapHeights = TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 1);
        primDraw();
    });

    primDiv.append("button")
    .text("不自然なメッシュを沈める")
    .on("click", function () {
        wholeMapHeights = TerrainGenerator.sinkUnnaturalCoastSideMesh(wholeMapMesh, wholeMapHeights);
        primDraw();
    });

    primDiv.append("button")
        .text("Relax")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.relax(wholeMapMesh, wholeMapHeights);
            primDraw();
        });

        primDiv.append("button")
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
