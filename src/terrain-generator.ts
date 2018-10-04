'use strict';
import * as d3 from 'd3';
import * as language from './language';
import 'js-priority-queue';
import { Edge, MapExtent, MapMesh, MapRender, TerrainHeights, TerrainPoint, MergeMethod, COAST_LINE_HEIGHT, ShadowLevel, CLIFF_BOUNDARY_HEIGHT } from './terrain-interfaces';
import { VoronoiEdge, VoronoiLayout, VoronoiSite } from 'd3';
import { VoronoiDiagram } from 'd3';
import { MeshGenerator } from './mesh-generator';
import { TerrainCalcUtil } from './util';

export var defaultExtent = {
    width: 1,
    height: 1,
    margin: 0.10,
};

export class TerrainGenerator {
    static generateZeroHeights(mesh: MapMesh): TerrainHeights {
        var z: TerrainHeights = [];
        for (var i = 0; i < mesh.voronoiPoints.length; i++) {
            z[i] = 0;
        }
        z.heightRange = [-1, 1];
        z.seaLevelHeight = 0;
        return z;
    }

    // 平均0, 分散1のデータに標準化
    static standardize(mesh: MapMesh, h: TerrainHeights): TerrainHeights {
        const avg = TerrainCalcUtil.mean(h);
        const std = TerrainCalcUtil.standardDeviation(h, avg);

        let newH: TerrainHeights = TerrainGenerator.generateZeroHeights(mesh);
        for(let i = 0; i < h.length; ++i) {
            newH[i] = (h[i] - avg) / std;
        }
        return newH;
    }

    static mergeHeights(mesh: MapMesh, method: MergeMethod, ...args: TerrainHeights[]): TerrainHeights {
        let mergeMethod: (left: number, right: number) => number;

        switch(method) {
            case MergeMethod.Add:
                mergeMethod = (left: number, right: number): number => {
                    return left + right;
                }
                break;
            default:
                mergeMethod = (left: number, right: number): number => {
                    return (left + right) / 2;
                };
                break;
        }

        var n = args[0].length;
        var newVals = TerrainGenerator.generateZeroHeights(mesh);
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < args.length; j++) {
                newVals[i] = mergeMethod(args[j][i], newVals[i]);
                newVals[i] = Math.min(1, newVals[i]);
                newVals[i] = Math.max(-1, newVals[i]);
            }
        }
        return newVals;
    }
    
    static generateContinent(mesh: MapMesh, peakHeight: number, count: number, radius?: number, margin?: number): TerrainHeights {
        radius = radius || 0.05;
        margin = margin || 0;
        const validWidth = mesh.extent.width - (margin * 2);
        const validHeight = mesh.extent.height - (margin * 2);

        const n = count;
        var mounts = [];
        for (var i = 0; i < n; i++) {
            mounts.push([validWidth * (Math.random() - 0.5) + margin, validHeight * (Math.random() - 0.5) + margin]);
        }
        var newvals = TerrainGenerator.generateZeroHeights(mesh);
        for (var i = 0; i < mesh.voronoiPoints.length; i++) {
            var p = mesh.voronoiPoints[i];
            for (var j = 0; j < n; j++) {
                var m = mounts[j];
                const distanceFromOrigin = Math.sqrt((p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]));
                newvals[p.id] += Math.exp((-1 * Math.pow(distanceFromOrigin, 2)) / Math.pow(radius, 2) ) * peakHeight;
            }
        }
        return newvals;
    }

    /**
     * 浸食・風化を実行
     * @param mesh: MapのMesh
     * @param h: 地盤の高さ
     * @param eroseRate: どれくらい浸食させるか
     */
    static erodeSimply(mesh: MapMesh, h: TerrainHeights, eroseRate: number): TerrainHeights {
        let newHeights = h;
        mesh.voronoiPoints.forEach(e => {
            const myHeight = newHeights[e.id];
            mesh.pointDict[e.id].connectingPoints.forEach(rel => {
                const nextHeight = newHeights[rel.id];
                // 自分の方が周りよりも低いときは何もしない
                if (myHeight <= nextHeight) {
                    return;
                }

                // 高さの差分を見る。露出が多いほど浸食・風化が激しいという考え。
                const delta = myHeight - nextHeight;
                // 差分に風化レートと地盤の頑健さをかけあわせる
                const decHeight = delta * eroseRate * (1 - mesh.pointDict[e.id].robustness);

                // 差分を引く
                newHeights[e.id] = newHeights[e.id] - decHeight;
                // 引いた分を低い方に流す（拡散方程式などが使えるかもしれないけど、今は単純に）
                newHeights[rel.id] = newHeights[rel.id] + decHeight;
            });
        });

        return newHeights;
    }

    // 傾斜をなだらかにする
    static relax(mesh: MapMesh, h: TerrainHeights) {
        var newh = TerrainGenerator.generateZeroHeights(mesh);
        for (var i = 0; i < h.length; i++) {
            var nbs = TerrainCalcUtil.getNeighbourIds(mesh, i);
            if (nbs.length < 3) {
                newh[i] = 0;
                continue;
            }
            newh[i] = d3.mean(nbs.map(function (j) {return h[j];})) || 0;
        }
        return newh;
    }
    
    // 傾斜元IDのリストを取得する
    static generateDownFromDict(mesh: MapMesh, h: TerrainHeights): {[key: number]: TerrainPoint | null} {
        if (h.downFromDict) return h.downFromDict;
    
        /**
         * どのポイントから傾斜させるか返す。戻り値はID
         * @param i 
         */
        function downFrom(i: number): number {
            if (TerrainCalcUtil.isEdge(mesh, i)) return -2;
            var best = -1;
            var besth = h[i];
            var nbs = TerrainCalcUtil.getNeighbourIds(mesh, i);
            for (var j = 0; j < nbs.length; j++) {
                const neighbousId = nbs[j];

                if (h[neighbousId] < besth) {
                    besth = h[neighbousId];
                    best = neighbousId;
                }
            }
            return best;
        }

        var downs:{[key: number]: TerrainPoint | null}  = {};
        for (var i = 0; i < h.length; i++) {
            const downPoint = mesh.pointDict[downFrom(i)];
            downs[i] = (downPoint)? downPoint.point: null;
        }
        h.downFromDict = downs;
        return downs;
    }
    
    /**
     * Sinkの平滑化。https://pro.arcgis.com/ja/pro-app/tool-reference/spatial-analyst/how-fill-works.htm
     * 変な窪地をなくすための処理
     * @param mesh 
     * @param h 
     * @param epsilon 
     */
    static fillSinks(mesh: MapMesh, h: TerrainHeights, epsilon?: number): TerrainHeights {
        // ごく小さい値（何か意味があるわけじゃなく、必ず小さな傾斜をつけるために値を与えているだけ）
        epsilon = epsilon || 1e-5;
        var infinity = 999999;
        var newHeights: TerrainHeights = TerrainGenerator.generateZeroHeights(mesh);
    
        for (var i = 0; i < h.length; i++) {
            if (TerrainCalcUtil.isNextEdge(mesh, i)) {
                newHeights[i] = h[i];
            } else {
                newHeights[i] = infinity;
            }
        }
        while (true) {
            var hasChanged = false;
    
            for (var i = 0; i < h.length; i++) {
                if (newHeights[i] == h[i])
                    continue;
    
                var nbs = TerrainCalcUtil.getNeighbourIds(mesh, i);
                for (var j = 0; j < nbs.length; j++) {
                    const nbHeight = newHeights[nbs[j]];
                    // 最初の段階ではnewHeightsは極大の値なので、必ずnewHeightが与えられる
                    if (h[i] >= nbHeight + epsilon) {
                        newHeights[i] = h[i];
                        hasChanged = true;
                        break;
                    }
                    var oh = nbHeight + epsilon;
                    // 新しい高さが隣の点よりも高くて、かつ現時点の隣の点が自分の最初の高さよりも高かった時
                    if ((newHeights[i] > oh) && (oh > h[i])) {
                        newHeights[i] = oh;
                        hasChanged = true;
                    }
                }
            }
            if (!hasChanged) return newHeights;
        }
    }
    
    static cleanCoast(mesh: MapMesh, h: TerrainHeights, iters: number) {
        for (var iter = 0; iter < iters; iter++) {
            var newh = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i];
                var nbs = TerrainCalcUtil.getNeighbourIds(mesh, i);
                // 既に水面下にある地点はスルー
                if (h[i] <= 0 || nbs.length != 3) continue;

                let doNotSetNewheight = false;
                var topNeighboursHeight = -999999;
                for (var j = 0; j < nbs.length; j++) {
                    if (h[nbs[j]] > 0) {
                        doNotSetNewheight = true;
                        break;
                    } else if (h[nbs[j]] > topNeighboursHeight) {
                        topNeighboursHeight = h[nbs[j]];
                    }
                }
                if (doNotSetNewheight) continue;
                newh[i] = topNeighboursHeight / 2;
            }
            h = newh;
            newh = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i];
                var nbs = TerrainCalcUtil.getNeighbourIds(mesh, i);
                // 既に地上になっている地点はスルー
                if (h[i] > 0 || nbs.length != 3) continue;

                let doNotSetNewheight = false;
                var bottomNeighboursHeight = 999999;
                for (var j = 0; j < nbs.length; j++) {
                    if (h[nbs[j]] <= 0) {
                        doNotSetNewheight = true;
                        break;
                    } else if (h[nbs[j]] < bottomNeighboursHeight) {
                        bottomNeighboursHeight = h[nbs[j]];
                    }
                }
                if (doNotSetNewheight) continue;
                newh[i] = bottomNeighboursHeight / 2;
            }
            h = newh;
        }
        return h;
    }
    
    /**
     * 周辺の点の高さを見てどれくらい傾いてるのか取得する
     * @param mesh 
     * @param h 
     * @param i 
     */
    static trislope(mesh: MapMesh, h: TerrainHeights, i: number): [number, number] {
        var nbs = TerrainCalcUtil.getNeighbourIds(mesh, i);
        if (nbs.length != 3) return [0,0];
        var p0 = mesh.voronoiPoints[nbs[0]];
        var p1 = mesh.voronoiPoints[nbs[1]];
        var p2 = mesh.voronoiPoints[nbs[2]];
    
        var deltaXFrom1To0 = p1.x - p0.x;
        var deltaXFrom2To0 = p2.x - p0.x;
        var deltaYFrom1To0 = p1.y - p0.y;
        var deltaYFrom2To0 = p2.y - p0.y;
    
        var det = deltaXFrom1To0 * deltaYFrom2To0 - deltaXFrom2To0 * deltaYFrom1To0;
        var deltaHeightFrom1To0 = h[nbs[1]] - h[nbs[0]];
        var deltaHeightFrom2To0 = h[nbs[2]] - h[nbs[0]];

        if (det == 0) {
            return [0, 0];
        }
        return [(deltaYFrom2To0 * deltaHeightFrom1To0 - deltaYFrom1To0 * deltaHeightFrom2To0) / det,
            (-deltaXFrom2To0 * deltaHeightFrom1To0 + deltaXFrom1To0 * deltaHeightFrom2To0) / det];
    }

    static getNearestUpperLeftPoint(mesh: MapMesh, targetPoint: TerrainPoint, points: TerrainPoint[]): TerrainPoint | undefined {
        let leftPoint: TerrainPoint | undefined = undefined;
        let topPoint: TerrainPoint | undefined = undefined;
        for(let i = 0; i < points.length; i++) {
            const pt = points[i];
            if (pt.x < targetPoint.x && pt.y < targetPoint.y) {
                return pt;
            } else if(pt.x < targetPoint.x) {
                leftPoint = pt;
            } else if (pt.y < targetPoint.y) {
                topPoint = pt;
            }
        }
        if (leftPoint) {
            return this.getNearestUpperLeftPoint(mesh, leftPoint, mesh.pointDict[leftPoint.id].connectingPoints);
        } else if (topPoint) {
            return this.getNearestUpperLeftPoint(mesh, topPoint, mesh.pointDict[topPoint.id].connectingPoints);
        }
        return undefined;
    }
    static calcShadow(mesh: MapMesh, h: TerrainHeights, point: TerrainPoint): ShadowLevel {
        const nbs = mesh.pointDict[point.id].connectingPoints;
        const compPoint = this.getNearestUpperLeftPoint(mesh, point, nbs);

        if (!compPoint) {
            return ShadowLevel.Normal;
        }

        if (h[compPoint.id] <= h[point.id]) {
            return ShadowLevel.Normal;
        }
        const heighDelta = h[compPoint.id] - h[point.id];
        if (heighDelta > CLIFF_BOUNDARY_HEIGHT) {
            return ShadowLevel.Dark2;
        }
        return ShadowLevel.Dark1;
    }

    static setShadows(mesh: MapMesh, h: TerrainHeights) {
        for(let key in mesh.pointDict) {
            const point = mesh.pointDict[key];
            point.shadow = this.calcShadow(mesh, h, point.point);
        }
    }

    static relaxPath(path: any[]) {
        var newpath = [path[0]];
        for (var i = 1; i < path.length - 1; i++) {
            var newpt = [0.25 * path[i-1][0] + 0.5 * path[i][0] + 0.25 * path[i+1][0],
                0.25 * path[i-1][1] + 0.5 * path[i][1] + 0.25 * path[i+1][1]];
            newpath.push(newpt);
        }
        newpath.push(path[path.length - 1]);
        return newpath;
    }
    
    /**
     * 海岸線に面しているものの中で不自然なメッシュを沈めます。
     * 具体的には海に突出した部分の角度を測って一定の角度よりも狭ければ沈めます。
     */
    static sinkUnnaturalCoastSideMesh(mesh: MapMesh, h: TerrainHeights): TerrainHeights {
        const MIN_ANGLE = 60;

        const isTargetMesh = (vrPoint: TerrainPoint): boolean => {
            const trCntPt = mesh.pointDict[vrPoint.id];
            if (TerrainCalcUtil.isNearEdge(mesh, trCntPt.point.id)) {
                return false;
            }
            if (h[vrPoint.id] < COAST_LINE_HEIGHT) {
                return false;
            }
            let isTarget: boolean = false;
            let aboveSeaMeshCount = 0;
            for(let i = 0; i < trCntPt.connectingPoints.length; i++) {
                if(h[trCntPt.connectingPoints[i].id] >= COAST_LINE_HEIGHT) {
                    aboveSeaMeshCount++;
                }
                if (aboveSeaMeshCount >= 2) {
                    return false;
                }
            }
            const targetEdges: VoronoiEdge<[number, number]>[] = [];

            trCntPt.relatedVoronoiSites.forEach(rvs => {
                if (h[rvs.terrainPointIndex] > COAST_LINE_HEIGHT) {
                    return;
                }
                targetEdges.push(rvs.edge);
            });
            if (targetEdges.length != 2) {
                return false;
            }
            let ptA: [number, number], ptB: [number, number], ptX: [number, number];

            // 点Aと点Bからそれぞれ原点Oに線を引いたときに交わる角度を出せば良い
            if (targetEdges[0][0] === targetEdges[1]["0"]) {
                ptA = targetEdges[0]["1"];
                ptB = targetEdges[1]["1"];
                ptX = targetEdges[0]["0"];
            } else if(targetEdges[0]["0"] === targetEdges[1]["1"]) {
                ptA = targetEdges[0]["1"];
                ptB = targetEdges[1]["0"];
                ptX = targetEdges[0]["0"];
            } else if(targetEdges[0]["1"] === targetEdges[1]["0"]) {
                ptA = targetEdges[0]["0"];
                ptB = targetEdges[1]["1"];
                ptX = targetEdges[0]["1"];
            } else {
                ptA = targetEdges[0]["0"];
                ptB = targetEdges[1]["0"];
                ptX = targetEdges[0]["1"];
            }
            // ptXが原点になるように座標変換
            ptA[0] -= ptX[0];
            ptA[1] -= ptX[1];
            ptB[0] -= ptX[0];
            ptB[1] -= ptX[1];

            let rad = Math.atan2(ptA[0] - ptB[0], ptA[1] - ptB[1]);
            let angle = rad * (180 / Math.PI);
            return (Math.abs(angle) < MIN_ANGLE);
        }

        var newh = TerrainGenerator.generateZeroHeights(mesh);
        mesh.voronoiPoints.forEach(e => {
            if (isTargetMesh(e)) {
                // 沈める
                const randValue = TerrainCalcUtil.runif( COAST_LINE_HEIGHT + 1e-5, 0.1);
                newh[e.id] = -1 * (h[e.id] + randValue);
            }
        });
        return TerrainGenerator.mergeHeights(mesh, MergeMethod.Add, newh, h);
    }
}
