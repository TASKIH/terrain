import * as d3 from 'd3';
import { TerrainCalcUtil } from "./util";
import { TerrainDrawer } from "./terrain-drawer";
import { TerrainGenerator } from "./terrain-generator";
import { TerrainHeights, MapRender, MapMesh } from "./terrain-interfaces";
import * as PriorityQueue from 'js-priority-queue';

export class TerrainFeatureGenerator {
    
    /**
     * 各ポイントに堅牢性を適当に設定する
     * @param mesh 
     */
    static setRandomRoberstness(mesh: MapMesh) {
        for(const key in mesh.pointDict){
            let pt = mesh.pointDict[key];
            pt.robustness = TerrainCalcUtil.normRand(0.5, 0.25);
            if (pt.robustness < 0) {
                pt.robustness = 0;
            }
            else if (pt.robustness > 1) {
                pt.robustness = 1;
            }
        }
    }
}