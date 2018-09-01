import { TerrainHeights, MapMesh } from "./terrain-interfaces";
import * as d3 from 'd3';

'use strict';

export class TerrainCalcUtil {
    static mean(numbers: number[]): number {
        var total = 0, i;
        for (i = 0; i < numbers.length; i += 1) {
            total += numbers[i];
        }
        return total / numbers.length;
    }
    
    // 乱数を生成する
    static runif(lo: number, hi: number): number {
        return lo + Math.random() * (hi - lo);
    }
    
    static rnorm(): number {
        let z2:number | null = null;
        function rnorm(): number {
            if (z2 != null) {
                var tmp = z2;
                z2 = null;
                return tmp;
            }
            var x1 = 0;
            var x2 = 0;
            var w = 2.0;
            while (w >= 1) {
                x1 = TerrainCalcUtil.runif(-1, 1);
                x2 = TerrainCalcUtil.runif(-1, 1);
                w = x1 * x1 + x2 * x2;
            }
            w = Math.sqrt(-2 * Math.log(w) / w);
            z2 = x2 * w;
            return x1 * w;
        }
        return rnorm();
    }
    
    static randomVector(scale: number): [number, number] {
        return [scale * TerrainCalcUtil.rnorm(), scale * TerrainCalcUtil.rnorm()];
    }
    
    static centroid(pts: [number, number][]): [number, number] {
        var x = 0;
        var y = 0;
        for (var i = 0; i < pts.length; i++) {
            x += pts[i][0];
            y += pts[i][1];
        }
        return [x/pts.length, y/pts.length];
    }
    
    static terrCenter(h: TerrainHeights, terr: any, city: any, landOnly: boolean) {
        var x = 0;
        var y = 0;
        var n = 0;
        for (var i = 0; i < terr.length; i++) {
            if (terr[i] != city) continue;
            if (landOnly && h[i] <= 0) continue;
            x += terr.mesh.voronoiPoints[i].x;
            y += terr.mesh.voronoiPoints[i].y;
            n++;
        }
        return [x/n, y/n];
    }
    

    static isEdge(mesh: MapMesh, i: number): boolean {
        return (mesh.adjacentPointIds[i].length < 3);
    }

    // 領域の端に隣接するEdgeかどうか
    static isNearEdge(mesh: MapMesh, i: number): boolean {
        var x = mesh.voronoiPoints[i].x;
        var y = mesh.voronoiPoints[i].y;
        var w = mesh.extent.width;
        var h = mesh.extent.height;
        return (x < -0.45 * w) || (x > 0.45 * w) || (y < -0.45 * h) || (y > 0.45 * h);
    }

    static getNeighbourIds(mesh: MapMesh, i: number) {
        var onbs = mesh.adjacentPointIds[i];
        var nbs = [];
        for (var i = 0; i < onbs.length; i++) {
            nbs.push(onbs[i]);
        }
        return nbs;
    }

    static getDistance(mesh: MapMesh, i: number, j: number): number {
        var p = mesh.voronoiPoints[i];
        var q = mesh.voronoiPoints[j];
        return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
    }

    static getQuantile(h: TerrainHeights, q: any): number | undefined {
        var sortedh = [];
        for (var i = 0; i < h.length; i++) {
            sortedh[i] = h[i];
        }
        sortedh.sort(d3.ascending);
        return d3.quantile(sortedh, q);
    }
    
    static mergeSegments(segs: any[]) {
        var adj:any = {};
        for (var i = 0; i < segs.length; i++) {
            var seg = segs[i];
            // @ts-ignore
            var a0 = adj[seg[0]] || [];
            // @ts-ignore
            var a1 = adj[seg[1]] || [];
            // @ts-ignore
            a0.push(seg[1]);
            // @ts-ignore
            a1.push(seg[0]);
            // @ts-ignore
            adj[seg[0]] = a0;
            // @ts-ignore
            adj[seg[1]] = a1;
        }
        var done = [];
        var paths = [];
        var path = null;
        while (true) {
            if (path == null) {
                for (var i = 0; i < segs.length; i++) {
                    if (done[i]) continue;
                    done[i] = true;
                    // @ts-ignore
                    // @ts-ignore
                    path = [segs[i][0], segs[i][1]];
                    break;
                }
                if (path == null) break;
            }
            var changed = false;
            for (var i = 0; i < segs.length; i++) {
                if (done[i]) continue;
                // @ts-ignore
                if (adj[path[0]].length == 2 && segs[i][0] == path[0]) {
                    // @ts-ignore
                    path.unshift(segs[i][1]);
                } else { // @ts-ignore
                    // @ts-ignore
                    if (adj[path[0]].length == 2 && segs[i][1] == path[0]) {
                                    // @ts-ignore
                                    path.unshift(segs[i][0]);
                                } else { // @ts-ignore
                        // @ts-ignore
                        if (adj[path[path.length - 1]].length == 2 && segs[i][0] == path[path.length - 1]) {
                                                        // @ts-ignore
                                                        path.push(segs[i][1]);
                                                    } else { // @ts-ignore
                            // @ts-ignore
                            if (adj[path[path.length - 1]].length == 2 && segs[i][1] == path[path.length - 1]) {
                                                                                // @ts-ignore
                                                    path.push(segs[i][0]);
                                                                            } else {
                                                                                continue;
                                                                            }
                        }
                    }
                }
                done[i] = true;
                changed = true;
                break;
            }
            if (!changed) {
                paths.push(path);
                path = null;
            }
        }
        return paths;
    }
}
