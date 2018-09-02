var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./util", "./terrain-generator", "js-priority-queue"], function (require, exports, d3, util_1, terrain_generator_1, PriorityQueue) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    PriorityQueue = __importStar(PriorityQueue);
    var TerrainFeatureGenerator = /** @class */ (function () {
        function TerrainFeatureGenerator() {
        }
        TerrainFeatureGenerator.cityScore = function (mesh, h, cities) {
            var score = terrain_generator_1.TerrainGenerator.map(terrain_generator_1.TerrainGenerator.getFlux(mesh, h), Math.sqrt);
            for (var i = 0; i < h.length; i++) {
                if (h[i] <= 0 || util_1.TerrainCalcUtil.isNearEdge(mesh, i)) {
                    score[i] = -999999;
                    score[i] = -999999;
                    continue;
                }
                score[i] += 0.01 / (1e-9 + Math.abs(mesh.voronoiPoints[i].x) - mesh.extent.width / 2);
                score[i] += 0.01 / (1e-9 + Math.abs(mesh.voronoiPoints[i].y) - mesh.extent.height / 2);
                for (var j = 0; j < cities.length; j++) {
                    score[i] -= 0.02 / (util_1.TerrainCalcUtil.getDistance(mesh, cities[j], i) + 1e-9);
                }
            }
            return score;
        };
        TerrainFeatureGenerator.placeCity = function (render) {
            render.cities = render.cities || [];
            var score = TerrainFeatureGenerator.cityScore(render.mesh, render.h, render.cities);
            var newcity = d3.scan(score, d3.descending);
            render.cities.push(newcity);
        };
        TerrainFeatureGenerator.placeCities = function (render) {
            var params = render.params;
            var h = render.h;
            var n = params.ncities;
            for (var i = 0; i < n; i++) {
                TerrainFeatureGenerator.placeCity(render);
            }
        };
        TerrainFeatureGenerator.getRivers = function (mesh, h, limit) {
            var dh = terrain_generator_1.TerrainGenerator.downhill(mesh, h);
            var flux = terrain_generator_1.TerrainGenerator.getFlux(mesh, h);
            var links = [];
            var above = 0;
            for (var i = 0; i < h.length; i++) {
                if (h[i] > 0)
                    above++;
            }
            limit *= above / h.length;
            for (var i = 0; i < dh.length; i++) {
                if (util_1.TerrainCalcUtil.isNearEdge(mesh, i))
                    continue;
                if (flux[i] > limit && h[i] > 0 && dh[i] >= 0) {
                    var up = mesh.voronoiPoints[i];
                    var down = mesh.voronoiPoints[dh[i]];
                    if (h[dh[i]] > 0) {
                        links.push([up, down]);
                    }
                    else {
                        links.push([up, [(up.x + down.x) / 2, (up.y + down.y) / 2]]);
                    }
                }
            }
            return util_1.TerrainCalcUtil.mergeSegments(links).map(terrain_generator_1.TerrainGenerator.relaxPath);
        };
        TerrainFeatureGenerator.getTerritories = function (render) {
            var h = render.h;
            var cities = render.cities;
            var n = render.params.nterrs;
            if (n > render.cities.length)
                n = render.cities.length;
            var flux = terrain_generator_1.TerrainGenerator.getFlux(render.mesh, h);
            var terr = [];
            var newQueue = new PriorityQueue.ArrayStrategy({ comparator: function (a, b) { return a.score - b.score; } });
            function weight(u, v) {
                var horiz = util_1.TerrainCalcUtil.getDistance(render.mesh, u, v);
                var vert = h[v] - h[u];
                if (vert > 0)
                    vert /= 10;
                var diff = 1 + 0.25 * Math.pow(vert / horiz, 2);
                diff += 100 * Math.sqrt(flux[u]);
                if (h[u] <= 0)
                    diff = 100;
                if ((h[u] > 0) != (h[v] > 0))
                    return 1000;
                return horiz * diff;
            }
            for (var i = 0; i < n; i++) {
                terr[cities[i]] = cities[i];
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(render.mesh, cities[i]);
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
                if (terr[u.vx] != undefined)
                    continue;
                terr[u.vx] = u.city;
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(render.mesh, u.vx);
                for (var i = 0; i < nbs.length; i++) {
                    var v = nbs[i];
                    if (terr[v] != undefined)
                        continue;
                    var newdist = weight(u.vx, v);
                    newQueue.queue({
                        score: u.score + newdist,
                        city: u.city,
                        vx: v
                    });
                }
            }
            return terr;
        };
        TerrainFeatureGenerator.getBorders = function (render) {
            var terr = render.terr;
            var h = render.h;
            var edges = [];
            for (var i = 0; i < terr.mesh.edges.length; i++) {
                var e = terr.mesh.edges[i];
                if (e[3] == undefined)
                    continue;
                if (util_1.TerrainCalcUtil.isNearEdge(terr.mesh, e[0]) || util_1.TerrainCalcUtil.isNearEdge(terr.mesh, e[1]))
                    continue;
                if (h[e[0]] < 0 || h[e[1]] < 0)
                    continue;
                if (terr[e[0]] != terr[e[1]]) {
                    edges.push([e[2], e[3]]);
                }
            }
            return util_1.TerrainCalcUtil.mergeSegments(edges).map(terrain_generator_1.TerrainGenerator.relaxPath);
        };
        return TerrainFeatureGenerator;
    }());
    exports.TerrainFeatureGenerator = TerrainFeatureGenerator;
});
