import { TerrainPoint, MapMesh, TerrainHeights, River, COAST_LINE_HEIGHT } from "../terrain-interfaces";
import { TerrainCalcUtil } from "../util";

export class RiverGenerator {
    static generateTerminalPoints(
        mesh: MapMesh,
        h: TerrainHeights,
        count: number
    ): TerrainPoint[] {
        const results: TerrainPoint[] = [];

        let curCount = 0;
        const executedPointIds = new Set<number>();

        while(curCount <= count) {
            // 全体の1/4を消化したのに完成していない = 順当な開始位置がないとしてClose
            if (executedPointIds.size * 4 >= mesh.voronoiPoints.length) {
                break;
            }
            const randIdx = Math.floor(TerrainCalcUtil.runif(0, mesh.voronoiPoints.length - 1));
            if (h[randIdx] <= 0 || executedPointIds.has(randIdx)) {
                continue;
            }
            executedPointIds.add(randIdx);
            
            curCount++;
            results.push(mesh.pointDict[randIdx].point);
        }

        return results;
    }

    static generateOneRiver(
        mesh: MapMesh,
        h: TerrainHeights,
        startPoint: TerrainPoint): River {
        const newRiver: River = {
            root: startPoint,
            route: [startPoint],
        }
        
        let currentPoint = startPoint;
        newRiver.route.push(startPoint);
        while(true) {
            if (h[currentPoint.id] <= 0) {
                newRiver.dest = currentPoint;
                break;
            }
            let minHeightPoint = currentPoint;
            mesh.pointDict[currentPoint.id].connectingPoints.forEach(e => {
                if (h[e.id] < h[minHeightPoint.id]) {
                    minHeightPoint = e;
                }
            });
            if (minHeightPoint.id === currentPoint.id) {
                newRiver.dest = currentPoint;
                break;
            }
            else {
                newRiver.route.push(minHeightPoint);
                currentPoint = minHeightPoint;
            }
        }

        return newRiver;
    }

    static generateRivers(
        mesh: MapMesh,
        h: TerrainHeights,
        riverCount: number,
        minRiverLength: number): River[] {

        const terminalPoints = RiverGenerator.generateTerminalPoints(mesh, h, riverCount);
    
        const rivers: River[] = [];
        
        terminalPoints.forEach(e => {
            const river = RiverGenerator.generateOneRiver(mesh, h, e);
            if (river.route.length < minRiverLength) {
                return;
            }
            // 海や湖に到達しているものだけを川として認める
            if (h[river.dest!.id] <= COAST_LINE_HEIGHT || h[river.root.id] <= COAST_LINE_HEIGHT) {
                rivers.push(river);
            }

        });

        return rivers;
    }
}