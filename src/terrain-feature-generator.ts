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

    static cityScore(mesh: MapMesh, h: TerrainHeights, cities: any[]) {
        var fluxes = TerrainGenerator.getFlux(mesh, h);
        var dataArray = [];
        for(var key in fluxes) {
            dataArray.push(fluxes[key]);
        }
        var score = TerrainGenerator.map(dataArray, Math.sqrt);
        for (var i = 0; i < h.length; i++) {
            if (h[i] <= 0 || TerrainCalcUtil.isNearEdge(mesh,  i)) {
                score[i] = -999999;
                score[i] = -999999;
                continue;
            }
            score[i] += 0.01 / (1e-9 + Math.abs(mesh.voronoiPoints[i].x) - mesh.extent.width/2);
            score[i] += 0.01 / (1e-9 + Math.abs(mesh.voronoiPoints[i].y) - mesh.extent.height/2);
            for (var j = 0; j < cities.length; j++) {
                score[i] -= 0.02 / (
                    TerrainCalcUtil.getDistance(mesh, cities[j], i) + 1e-9);
            }
        }
        return score;
    }
    static placeCity(render: MapRender) {
        render.cities = render.cities || [];
        var score = TerrainFeatureGenerator.cityScore(render.mesh!, render.h, render.cities);
        var newcity = d3.scan(score, d3.descending);
        render.cities.push(newcity);
    }
    
    static placeCities(render: MapRender) {
        var params = render.params;
        var h = render.h;
        var n = params.ncities;
        for (var i = 0; i < n; i++) {
            TerrainFeatureGenerator.placeCity(render);
        }
    }
    

    static getRivers(mesh: MapMesh, h: TerrainHeights, limit: number) {
        var dh = TerrainGenerator.generateDownFromDict(mesh, h);
        var flux = TerrainGenerator.getFlux(mesh, h);
        var links = [];
        var above = 0;
        for (var i = 0; i < h.length; i++) {
            if (h[i] > 0) above++;
        }

        limit *= above / h.length;
        for (var i = 0; i < h.length; i++) {
            var up = mesh.voronoiPoints[i];
            const down = dh[up.id];

            if (flux[up.id] > limit && h[up.id] > 0 && down) {
                if (h[down.id] > 0) {
                    links.push([[up.x, up.y], [down.x, down.y]]);
                } else {
                    links.push([[up.x, up.y], [(up.x + down.x)/2, (up.y + down.y)/2]]);
                }
            }
        }
        return TerrainCalcUtil.mergeSegments(links).map(TerrainGenerator.relaxPath);
    }
    
    static getTerritories(render: any) {
        var h = render.h;
        var cities = render.cities;
        var n = render.params.nterrs;
        if (n > render.cities.length) n = render.cities.length;
        var flux = TerrainGenerator.getFlux(render.mesh!, h);
        var terr = [];
        var newQueue = new PriorityQueue.ArrayStrategy({comparator: function (a: any, b: any) {return a.score - b.score;}});
        function weight(u: number, v: number) {
            var horiz = TerrainCalcUtil.getDistance(render.mesh!, u, v);
            var vert = h[v] - h[u];
            if (vert > 0) vert /= 10;
            var diff = 1 + 0.25 * Math.pow(vert/horiz, 2);
            diff += 100 * Math.sqrt(flux[u]);
            if (h[u] <= 0) diff = 100;
            if ((h[u] > 0) != (h[v] > 0)) return 1000;
            return horiz * diff;
        }
        for (var i = 0; i < n; i++) {
            terr[cities[i]] = cities[i];
            var nbs = TerrainCalcUtil.getNeighbourIds(render.mesh!, cities[i]);
            for (var j = 0; j < nbs.length; j++) {
                newQueue.queue({
                    score: weight(cities[i], nbs[j]),
                    city: cities[i],
                    vx: nbs[j]
                });
            }
        }
        while (newQueue.length) {
            var u = newQueue.dequeue();
            if (terr[u.vx] != undefined) continue;
            terr[u.vx] = u.city;
            var nbs = TerrainCalcUtil.getNeighbourIds(render.mesh!, u.vx);
            for (var i = 0; i < nbs.length; i++) {
                var v = nbs[i];
                if (terr[v] != undefined) continue;
                var newdist = weight(u.vx, v);
                newQueue.queue({
                    score: u.score + newdist,
                    city: u.city,
                    vx: v
                });
            }
        }
        return terr;
    }
    
    static getBorders(render: any) {
        var terr = render.terr;
        var h = render.h;
        var edges:any = [];
        for (var i = 0; i < terr.mesh.edges.length; i++) {
            var e = terr.mesh.edges[i];
            if (e[3] == undefined) continue;
            if (TerrainCalcUtil.isNearEdge(terr.mesh, e[0]) || TerrainCalcUtil.isNearEdge(terr.mesh, e[1])) continue;
            if (h[e[0]] < 0 || h[e[1]] < 0) continue;
            if (terr[e[0]] != terr[e[1]]) {
                edges.push([e[2], e[3]]);
            }
        }
        return TerrainCalcUtil.mergeSegments(edges).map(TerrainGenerator.relaxPath);
    }
}