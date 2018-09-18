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
import { WaterFlowResult, WaterRecorder, Water, WaterFlow } from './water-recorder';
import { ContinentGenerator, pangeaTerrainSeed, continentTerrainSeed } from './continent-generator';

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
            params: TerrainGenerator.defaultParams,
            mesh: wholeMapMesh,
            h:  wholeMapHeights
        };

        //myRenderer.rivers = TerrainFeatureGenerator.getRivers(wholeMapMesh, wholeMapHeights, 0.005);
        TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, -1, 1, 'prim-info');
        TerrainDrawer.visualizeSlopes(primSVG, myRender);
        myRender.coasts = TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0);
        //TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
        TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);

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
            
            var myRender: MapRender = {
                params: TerrainGenerator.defaultParams,
                mesh: wholeMapMesh,
                h:  wholeMapHeights
            };

            //myRenderer.rivers = TerrainFeatureGenerator.getRivers(wholeMapMesh, wholeMapHeights, 0.005);
            myRender.coasts = TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0);
            //TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            TerrainDrawer.drawPaths(primSVG, 'coast', myRender.coasts);
            TerrainDrawer.visualizeSlopes(primSVG, myRender);

            primDraw();
        });

        primDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            wholeMapMesh = MeshGenerator.generateGoodMesh(2048);
            wholeMapHeights = ContinentGenerator.generate(wholeMapMesh, continentTerrainSeed);
            

            primDraw();
        });

    /**
     * 補助的な機能
     */
    let waterResult: WaterFlowResult;
    interface River {
        root: TerrainPoint;
        dest?: TerrainPoint;
        route: WaterFlow[];
    }

    function getTerminalPoint(mesh: MapMesh, waterRecord: WaterRecorder): 
    number[]{
        const fromPoints: {[key:number]: boolean} = {};
        
        for (let key1 in waterRecord.records) {
            let record = waterRecord.records[key1];
            for (let key2 in record) {
                const flow = record[key2]
                if(!fromPoints[flow.from.id]) {
                    fromPoints[flow.from.id] = true;
                }
                fromPoints[flow.to.id] = false;
            }
        }

        const result: number[] = [];
        for (let key in fromPoints) { 
            if (fromPoints[key]) {
                result.push(parseInt(key));
            }
        }

        return result;
    }

    function addRiverIfTerminal(
        records: {[key: number]: {[key: number]: WaterFlow}},
        fromPoint: TerrainPoint,
        currentRiver: River | undefined,
        rivers: River[]){
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
        } else {
            let isFirstLoop = true;
            for(let key2 in curRecord) {
                let currentFlow = curRecord[key2];
                if (isFirstLoop) {
                    currentRiver.route.push(currentFlow);
                    addRiverIfTerminal(records, currentFlow.to, currentRiver, rivers);
                    isFirstLoop = false;
                } else {
                    let newRiver = JSON.parse(JSON.stringify(currentRiver)) as River;
                    newRiver.route.push(currentFlow);
                    addRiverIfTerminal(records, currentFlow.to, newRiver, rivers);
                }
            }
        }
    }
    function getTargetWaterFlowRecord(
        waterRecord: WaterRecorder, 
        isTargetJudgeFunc: (amount:number) => boolean):
         {[key: number]: {[key: number]: WaterFlow}} {
        let result: {[key: number]: {[key: number]: WaterFlow}} = {
        };

        for (let key1 in waterRecord.records) {
            for(let key2 in waterRecord.records[key1]) {
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
    function generateWaterConnection(mesh: MapMesh, waterRecord: WaterRecorder): River[] {
        const rivers: River[] = [];
        const terminalPoints: number[] = getTerminalPoint(mesh, waterRecord);

        terminalPoints.forEach(pt => {
            addRiverIfTerminal(waterRecord.records, mesh.pointDict[pt].point, undefined, rivers);
        });

        return rivers;
    }
    function drawWaterFlow(mesh: MapMesh, h: TerrainHeights, waterRecord: WaterRecorder) {
        const watersArray: number[] = [];
        let records = waterRecord.records;
        for (let key1 in records) {
            let curRecord = records[key1];

            for (let key2 in curRecord) {
                watersArray.push(curRecord[key2].amount);
            }
        }
        const mean = TerrainCalcUtil.mean(watersArray);
        const sd = TerrainCalcUtil.standardDeviation(watersArray, mean);

        const newTargetWaterRecord = new WaterRecorder();
        newTargetWaterRecord.records = getTargetWaterFlowRecord(waterRecord, 
            (amount: number) => {
                let deviationVal = (amount - mean) / sd;
                return deviationVal > 1.2;
            });

        const flowPoints: number[][][] = [];
        const waterConnections = generateWaterConnection(mesh, newTargetWaterRecord);
        waterConnections.forEach(conn => {
            if (!conn.dest) {
                return;
            }
            // 終着点が海ではない場合は川として扱わない
            if (h[conn.dest!.id] > 0) {
                return ;
            }
            conn.route.forEach(rt => {
                let newData: number[][] = [];
                // 既に川が海に合流している場合は描画しない
                if (h[rt.from.id] < 0) {
                    return ;
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
        const rivers = TerrainCalcUtil.mergeSegments(flowPoints).map(TerrainGenerator.relaxPath);
        TerrainDrawer.drawPaths(primSVG, 'river', rivers);
    }
    function primDrawWater(waterRecord: WaterRecorder) {
        let waters: {[key: number]: Water} = {};
        let summaries = waterRecord.getSummaryWater();
        const watersArray: number[] = [];
        for(let key in summaries) {
            let summary = summaries[key];
            watersArray.push(summary);
        }
        const mean = TerrainCalcUtil.mean(watersArray);
        const sd = TerrainCalcUtil.standardDeviation(watersArray, mean);
        
        for(let key in summaries) {
            let summary = summaries[key];
            waters[key] = {
                amount: (summary - mean) / sd,
                deadEnd: false,
                isRevived: false,
            };
        }
        TerrainDrawer.visualizeWater(primSVG, wholeMapMesh, waters);
        TerrainDrawer.drawPaths(primSVG, 'coast', TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0));
    }

    primDiv.append("button")
    .text("水の流れの計算")
    .on("click", function () {
        waterResult = WaterErosionExecutor.calcWaterFlow(wholeMapMesh, wholeMapHeights, 0.2, 0.5);
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
        wholeMapHeights = TerrainGenerator.erodeSimply(wholeMapMesh, wholeMapHeights, 0.2);
        primDraw();
    });

    primDiv.append("button")
    .text("普通の浸食を実行")
    .on("click", function () {
        wholeMapHeights = TerrainGenerator.doErosion(wholeMapMesh, wholeMapHeights, 0.2);
        primDraw();
    });


    primDiv.append("button")
    .text("海岸線の整理")
    .on("click", function () {
        wholeMapHeights = TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 1);
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
        wholeMapHeights = WaterErosionExecutor.erodeByWater(wholeMapMesh, wholeMapHeights, waterResult.waters, waterResult.records, 0.01);
        primDraw();
    });



    }
