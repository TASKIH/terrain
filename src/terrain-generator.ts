'use strict';
import * as d3 from 'd3';
import * as language from './language';
import 'js-priority-queue';
import { Edge, MapExportParam, MapExtent, MapMesh, MapRender, TerrainHeights } from './terrain-interfaces';
import { VoronoiEdge, VoronoiLayout, VoronoiSite } from 'd3-voronoi';
import { VoronoiDiagram } from 'd3';
import { MeshGenerator } from './mesh-generator';
import { TerrainCalcUtil } from './util';

export var defaultExtent = {
    width: 1,
    height: 1
};

export class TerrainGenerator {
    static resetTerrainHeights(mesh: MapMesh): TerrainHeights {
        var z: TerrainHeights = [];
        for (var i = 0; i < mesh.voronoiPoints.length; i++) {
            z[i] = 0;
        }
        z.mesh = mesh;
        z.heightRange = [-1, 1];
        z.seaLevelHeight = 0;
        return z;
    }
    
    static slope(mesh: MapMesh, direction: [number, number]): TerrainHeights {
        return mesh.pointMapFunction(function (param : [number, number]) {
            return param[0] * direction[0] + param[1] * direction[1];
        });
    }
    static gaussianLikeSlope(mesh: MapMesh): TerrainHeights {
        return mesh.pointMapFunction(function (param : [number, number]) {
            return Math.sqrt( -2.0 * Math.log( param[0] + ((Math.random() - 0.5) / 3)) ) * Math.cos( 2.0 * Math.PI * param[1] + ((Math.random() - 0.5) / 3) );
        });
    }
    
    static cone(mesh: MapMesh, slope: number): TerrainHeights {
        return mesh.pointMapFunction(function (param : [number, number]) {
            return Math.pow(param[0] * param[0] + param[1] * param[1], 0.5) * slope;
        });
    }
    static map(h: TerrainHeights, f: any): TerrainHeights {
        var newh: TerrainHeights = h.map(f);
        newh.mesh = h.mesh;
        newh.heightRange = h.heightRange;
        newh.seaLevelHeight = h.seaLevelHeight;
    
        return newh;
    }
    
    static normalize(h: TerrainHeights): TerrainHeights {
        var lo = d3.min(h);
        var hi = d3.max(h);
        return TerrainGenerator.map(h, function (x: number) {
            return (x - (lo || 0)) / (hi || 0 - (lo || 0));
        });
    }
    
    static peaky(heights: TerrainHeights) {
        return TerrainGenerator.map(TerrainGenerator.normalize(heights), Math.sqrt);
    }
    
    static mergeHeights(...args: TerrainHeights[]): TerrainHeights {
        var n = args[0].length;
        var newVals = TerrainGenerator.resetTerrainHeights(args[0].mesh!);
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < arguments.length; j++) {
                newVals[i] += arguments[j][i];
            }
        }
        return newVals;
    }
    
    static mountains(mesh: MapMesh, n: number, radius?: number) {
        radius = radius || 0.05;
        var mounts = [];
        for (var i = 0; i < n; i++) {
            mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
        }
        var newvals = TerrainGenerator.resetTerrainHeights(mesh);
        for (var i = 0; i < mesh.voronoiPoints.length; i++) {
            var p = mesh.voronoiPoints[i];
            for (var j = 0; j < n; j++) {
                var m = mounts[j];
                const doubleDistanceFromOrigin = 
                    (p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]);
               
                newvals[i] += Math.pow(Math.exp(-(doubleDistanceFromOrigin) / (2 * radius * radius)), 2);
            }
        }
        console.log(newvals);
        return newvals;
    }
    
    static continent(mesh: MapMesh, peakHeight: number, count: number, radius?: number) {
        radius = radius || 0.05;
        const n = count;
        var mounts = [];
        for (var i = 0; i < n; i++) {
            mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
        }
    
        console.log(mounts);
        var newvals = TerrainGenerator.resetTerrainHeights(mesh);
        for (var i = 0; i < mesh.voronoiPoints.length; i++) {
            var p = mesh.voronoiPoints[i];
            for (var j = 0; j < n; j++) {
                var m = mounts[j];
                const distanceFromOrigin = (p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]);
                newvals[i] += Math.exp((-1 * Math.pow(distanceFromOrigin, 2)) / Math.pow(radius, 2) ) * peakHeight;
            }
        }
        console.log(newvals);
        return newvals;
    }
    // 傾斜をなだらかにする
    static relax(h: TerrainHeights) {
        // @ts-ignore
        var newh = resetTerrainHeights(h.mesh!);
        for (var i = 0; i < h.length; i++) {
            var nbs = TerrainCalcUtil.getNeighbourIds(h.mesh!, i);
            if (nbs.length < 3) {
                newh[i] = 0;
                continue;
            }
            newh[i] = d3.mean(nbs.map(function (j) {return h[j];})) || 0;
        }
        return newh;
    }
    
    // どのポイントからどのポイントに対して傾斜させるかを決定する
    static downhill(h: TerrainHeights): number[] {
        if (h.downhill) return h.downhill;
    
        function downFrom(i: number): number {
            if (TerrainCalcUtil.isEdge(h.mesh!, i)) return -2;
            var best = -1;
            var besth = h[i];
            var nbs = TerrainCalcUtil.getNeighbourIds(h.mesh!, i);
            for (var j = 0; j < nbs.length; j++) {
                if (h[nbs[j]] < besth) {
                    besth = h[nbs[j]];
                    best = nbs[j];
                }
            }
            return best;
        }
        var downs = [];
        for (var i = 0; i < h.length; i++) {
            downs[i] = downFrom(i);
        }
        h.downhill = downs;
        return downs;
    }
    
    static fillSinks(h: TerrainHeights, epsilon?: number): TerrainHeights {
        epsilon = epsilon || 1e-5;
        var infinity = 999999;
        var newHeights: TerrainHeights = TerrainGenerator.resetTerrainHeights(h.mesh!);
    
        for (var i = 0; i < h.length; i++) {
            if (TerrainCalcUtil.isNearEdge(h.mesh!, i)) {
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
    
                var nbs = TerrainCalcUtil.getNeighbourIds(h.mesh!, i);
                for (var j = 0; j < nbs.length; j++) {
                    if (h[i] >= newHeights[nbs[j]] + epsilon) {
                        newHeights[i] = h[i];
                        hasChanged = true;
                        break;
                    }
                    var oh = newHeights[nbs[j]] + epsilon;
                    if ((newHeights[i] > oh) && (oh > h[i])) {
                        newHeights[i] = oh;
                        hasChanged = true;
                    }
                }
            }
            if (!hasChanged) return newHeights;
        }
    }
    
    static getFlux(h: TerrainHeights) {
        // 傾斜を作成
        var dh = TerrainGenerator.downhill(h);
        var idxs = [];
    
        var flux = TerrainGenerator.resetTerrainHeights(h.mesh!);
        for (var i = 0; i < h.length; i++) {
            idxs[i] = i;
            flux[i] = 1/h.length;
        }
        idxs.sort(function (a, b) {
            return h[b] - h[a];
        });
        for (var i = 0; i < h.length; i++) {
            var j = idxs[i];
            if (dh[j] >= 0) {
                flux[dh[j]] += flux[j];
            }
        }
        return flux;
    }
    
    static getSlope(h: TerrainHeights) {
        var dh = TerrainGenerator.downhill(h);
        var slope = TerrainGenerator.resetTerrainHeights(h.mesh!);
        for (var i = 0; i < h.length; i++) {
            var s = TerrainGenerator.trislope(h, i);
            slope[i] = Math.sqrt(s[0] * s[0] + s[1] * s[1]);
            continue;
            if (dh[i] < 0) {
                slope[i] = 0;
            } else {
                slope[i] = (h[i] - h[dh[i]]) / TerrainCalcUtil.getDistance(h.mesh!, i, dh[i]);
            }
        }
        return slope;
    }
    
    static erosionRate(h: TerrainHeights) {
        var flux = TerrainGenerator.getFlux(h);
        var slope = TerrainGenerator.getSlope(h);
        var newh = TerrainGenerator.resetTerrainHeights(h.mesh!);
        for (var i = 0; i < h.length; i++) {
            var river = Math.sqrt(flux[i]) * slope[i];
            var creep = slope[i] * slope[i];
            var total = 1000 * river + creep;
            total = total > 200 ? 200 : total;
            newh[i] = total;
        }
        return newh;
    }
    
    static erode(h: TerrainHeights, amount: number): TerrainHeights {
        var er = TerrainGenerator.erosionRate(h);
        var newh = TerrainGenerator.resetTerrainHeights(h.mesh!);
        var maxr = d3.max(er) || 0;
        for (var i = 0; i < h.length; i++) {
            newh[i] = h[i] - amount * (er[i] / maxr);
        }
        return newh;
    }
    
    static doErosion(h: TerrainHeights, amount: number, n?: number) {
        n = n || 1;
        h = TerrainGenerator.fillSinks(h);
        for (var i = 0; i < n; i++) {
            h = TerrainGenerator.erode(h, amount);
            h = TerrainGenerator.fillSinks(h);
        }
        return h;
    }
    
    static setSeaLevel(h: TerrainHeights, q: any) {
        var newh = TerrainGenerator.resetTerrainHeights(h.mesh!);
        newh.seaLevelHeight = q;
    
        var delta = TerrainCalcUtil.getQuantile(h, q) || 0;
        for (var i = 0; i < h.length; i++) {
            newh[i] = h[i] - delta;
        }
        return newh;
    }
    
    // 海抜ゼロメートル地点とみなす高さを設定して、既存のすべての高さを調整しなおす
    static rescaleBySeaLevel(h: TerrainHeights, newSeaLevel: number): TerrainHeights {
        const delta = newSeaLevel - 0;
    
        for (var i = 0; i < h.length; i++) {
            h[i] = h[i] - delta;
            if (h[i] > h.heightRange![1]) {
                h[i] = h.heightRange![1];
            }
            if (h[i] < h.heightRange![0]) {
                h[i] = h.heightRange![0];
            }
        }
    
        return h;
    }
    
    static cleanCoast(h: TerrainHeights, iters: number) {
        for (var iter = 0; iter < iters; iter++) {
            var changed = 0;
            var newh = TerrainGenerator.resetTerrainHeights(h.mesh!);
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i];
                var nbs = TerrainCalcUtil.getNeighbourIds(h.mesh!, i);
                if (h[i] <= 0 || nbs.length != 3) continue;
                var count = 0;
                var best = -999999;
                for (var j = 0; j < nbs.length; j++) {
                    if (h[nbs[j]] > 0) {
                        count++;
                    } else if (h[nbs[j]] > best) {
                        best = h[nbs[j]];
                    }
                }
                if (count > 1) continue;
                newh[i] = best / 2;
                changed++;
            }
            h = newh;
            newh = TerrainGenerator.resetTerrainHeights(h.mesh!);
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i];
                var nbs = TerrainCalcUtil.getNeighbourIds(h.mesh!, i);
                if (h[i] > 0 || nbs.length != 3) continue;
                var count = 0;
                var best = 999999;
                for (var j = 0; j < nbs.length; j++) {
                    if (h[nbs[j]] <= 0) {
                        count++;
                    } else if (h[nbs[j]] < best) {
                        best = h[nbs[j]];
                    }
                }
                if (count > 1) continue;
                newh[i] = best / 2;
                changed++;
            }
            h = newh;
        }
        return h;
    }
    
    static trislope(h: TerrainHeights, i: number) {
        var nbs = TerrainCalcUtil.getNeighbourIds(h.mesh!, i);
        if (nbs.length != 3) return [0,0];
        var p0 = h.mesh!.voronoiPoints[nbs[0]];
        var p1 = h.mesh!.voronoiPoints[nbs[1]];
        var p2 = h.mesh!.voronoiPoints[nbs[2]];
    
        var x1 = p1.x - p0.x;
        var x2 = p2.x - p0.x;
        var y1 = p1.y - p0.y;
        var y2 = p2.y - p0.y;
    
        var det = x1 * y2 - x2 * y1;
        var h1 = h[nbs[1]] - h[nbs[0]];
        var h2 = h[nbs[2]] - h[nbs[0]];
    
        return [(y2 * h1 - y1 * h2) / det,
            (-x2 * h1 + x1 * h2) / det];
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
    
    static dropEdge(h: TerrainHeights, p: number) {
        p = p || 4;
        var newh = TerrainGenerator.resetTerrainHeights(h.mesh!);
        for (var i = 0; i < h.length; i++) {
            var v = h.mesh!.voronoiPoints[i];
            var x = 2.4*v.x / h.mesh!.extent.width;
            var y = 2.4*v.y / h.mesh!.extent.height;
            newh[i] = h[i] - Math.exp(10*(Math.pow(Math.pow(x, p) + Math.pow(y, p), 1/p) - 1));
        }
        return newh;
    }
    
    static generateCoast(npts: number, extent: MapExtent): any {
        var mesh = MeshGenerator.generateGoodMesh(npts, extent);
        const generatedSlopes = TerrainGenerator.slope(mesh, TerrainCalcUtil.randomVector(4));
        const generatedCones = TerrainGenerator.cone(mesh, TerrainCalcUtil.runif(-1, -1));
        const generatedMountains = TerrainGenerator.mountains(mesh, 50);
    
        console.log(generatedSlopes);
        console.log(mesh);
    
        var h = TerrainGenerator.mergeHeights(
            generatedSlopes,
            generatedCones,
            generatedMountains
        );
        for (var i = 0; i < 10; i++) {
            h = TerrainGenerator.relax(h);
        }
        h = TerrainGenerator.peaky(h);
        h = TerrainGenerator.doErosion(h, TerrainCalcUtil.runif(0, 0.1), 5);
        h = TerrainGenerator.setSeaLevel(h, TerrainCalcUtil.runif(0.2, 0.6));
        h = TerrainGenerator.fillSinks(h);
        h = TerrainGenerator.cleanCoast(h, 3);
        return h;
    }
    
    static defaultParams: MapExportParam = {
        extent: defaultExtent,
        generator: TerrainGenerator.generateCoast,
        npts: 16384,
        ncities: 15,
        nterrs: 5,
        fontsizes: {
            region: 40,
            city: 25,
            town: 20
        }
    };
}
