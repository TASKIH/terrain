import * as d3 from 'd3';
import {
    MapRender, MapMesh, TerrainHeights
} from './terrain-interfaces';
import { MeshGenerator } from './mesh-generator';
import { TerrainCalcUtil } from './util';
import { TerrainDrawer } from './terrain-drawer';
import { TerrainGenerator, defaultExtent } from './terrain-generator';
import { TerrainFeatureGenerator } from './terrain-feature-generator';
import { WaterErosionExecutor } from './water-erosion-executor';
import { WaterFlowResult, WaterRecorder, Water } from './water-recorder';

export function drawTerrainControll() {
    function addSVG(div: any) {
        return div.insert("svg", ":first-child")
            .attr("height", 400)
            .attr("width", 400)
            .attr("viewBox", "-500 -500 1000 1000");
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
        TerrainDrawer.visualizeVoronoi(primSVG, wholeMapMesh, wholeMapHeights, -1, 1);
        TerrainDrawer.drawPaths(primSVG, 'coast', TerrainDrawer.contour(wholeMapMesh, wholeMapHeights, 0));
    }

    primDraw();

    primDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            wholeMapHeights = TerrainGenerator.generateZeroHeights(wholeMapMesh);
            primDraw();
        });

    primDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            wholeMapMesh = MeshGenerator.generateGoodMesh(2048);
            wholeMapHeights = TerrainGenerator.generateZeroHeights(wholeMapMesh);

            let continentCount = 5;
            for(let i = 0; i < continentCount; i++) {
                let currentHeight = TerrainGenerator.generateZeroHeights(wholeMapMesh);
                currentHeight = TerrainGenerator.mergeHeights(wholeMapMesh, currentHeight, TerrainGenerator.continent(wholeMapMesh, 0.05, 5, 0.1));
                currentHeight = TerrainGenerator.mergeHeights(wholeMapMesh, currentHeight, TerrainGenerator.continent(wholeMapMesh, 0.05, 20, 0.05));
                currentHeight = TerrainGenerator.mergeHeights(wholeMapMesh, currentHeight, TerrainGenerator.continent(wholeMapMesh, -0.05, 10, 0.04));

                let currentWaterResult = WaterErosionExecutor.calcWaterFlow(wholeMapMesh, currentHeight, 0.02, 0.5);
                for(let i = 0; i < 7; i++) {
                    if (i == 5) {
                        currentWaterResult = WaterErosionExecutor.calcWaterFlow(wholeMapMesh, currentHeight, 0.02, 0.5);
                    }
                    currentHeight = WaterErosionExecutor.erodeByWater(wholeMapMesh, currentHeight, currentWaterResult.waters, currentWaterResult.records, 0.005);

                    currentHeight = TerrainGenerator.doErosion(wholeMapMesh, currentHeight, TerrainCalcUtil.runif(0, 0.1), 5);

                    currentHeight = TerrainGenerator.cleanCoast(wholeMapMesh, currentHeight, 2);    
                }
                wholeMapHeights = TerrainGenerator.mergeHeights(wholeMapMesh, wholeMapHeights, currentHeight);   
            }
            
            let currentWaterResult = WaterErosionExecutor.calcWaterFlow(wholeMapMesh, wholeMapHeights, 0.02, 0.5);
            for(let i = 0; i < 7; i++) {
                if (i == 5) {
                    currentWaterResult = WaterErosionExecutor.calcWaterFlow(wholeMapMesh, wholeMapHeights, 0.02, 0.5);
                }
                wholeMapHeights = WaterErosionExecutor.erodeByWater(wholeMapMesh, wholeMapHeights, currentWaterResult.waters, currentWaterResult.records, 0.005);

                wholeMapHeights = TerrainGenerator.doErosion(wholeMapMesh, wholeMapHeights, TerrainCalcUtil.runif(0, 0.1), 30);

                wholeMapHeights = TerrainGenerator.cleanCoast(wholeMapMesh, wholeMapHeights, 2);    
            }

            var myRenderer: MapRender = {
                params: TerrainGenerator.defaultParams,
                mesh: wholeMapMesh,
                h:  wholeMapHeights
            };

            myRenderer.rivers = TerrainFeatureGenerator.getRivers(wholeMapMesh, myRenderer.h, 0.01);
            myRenderer.coasts = TerrainDrawer.contour(wholeMapMesh, myRenderer.h, 0);
            console.log(myRenderer.rivers);
            TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            TerrainDrawer.drawPaths(primSVG, 'coast', myRenderer.coasts);
            TerrainDrawer.visualizeSlopes(primSVG, myRenderer);

            primDraw();
        });
    }

