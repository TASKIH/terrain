var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./mesh-generator", "./util", "js-priority-queue"], function (require, exports, d3, mesh_generator_1, util_1) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    exports.defaultExtent = {
        width: 1,
        height: 1
    };
    var TerrainGenerator = /** @class */ (function () {
        function TerrainGenerator() {
        }
        TerrainGenerator.resetTerrainHeights = function (mesh) {
            var z = [];
            for (var i = 0; i < mesh.voronoiPoints.length; i++) {
                z[i] = 0;
            }
            z.mesh = mesh;
            z.heightRange = [-1, 1];
            z.seaLevelHeight = 0;
            return z;
        };
        TerrainGenerator.slope = function (mesh, direction) {
            return mesh.pointMapFunction(function (param) {
                return param[0] * direction[0] + param[1] * direction[1];
            });
        };
        TerrainGenerator.gaussianLikeSlope = function (mesh) {
            return mesh.pointMapFunction(function (param) {
                return Math.sqrt(-2.0 * Math.log(param[0] + ((Math.random() - 0.5) / 3))) * Math.cos(2.0 * Math.PI * param[1] + ((Math.random() - 0.5) / 3));
            });
        };
        TerrainGenerator.cone = function (mesh, slope) {
            return mesh.pointMapFunction(function (param) {
                return Math.pow(param[0] * param[0] + param[1] * param[1], 0.5) * slope;
            });
        };
        TerrainGenerator.map = function (h, f) {
            var newh = h.map(f);
            newh.mesh = h.mesh;
            newh.heightRange = h.heightRange;
            newh.seaLevelHeight = h.seaLevelHeight;
            return newh;
        };
        TerrainGenerator.normalize = function (h) {
            var lo = d3.min(h);
            var hi = d3.max(h);
            return TerrainGenerator.map(h, function (x) {
                return (x - (lo || 0)) / (hi || 0 - (lo || 0));
            });
        };
        TerrainGenerator.peaky = function (heights) {
            return TerrainGenerator.map(TerrainGenerator.normalize(heights), Math.sqrt);
        };
        TerrainGenerator.mergeHeights = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var n = args[0].length;
            var newVals = TerrainGenerator.resetTerrainHeights(args[0].mesh);
            for (var i = 0; i < n; i++) {
                for (var j = 0; j < arguments.length; j++) {
                    newVals[i] += arguments[j][i];
                }
            }
            return newVals;
        };
        TerrainGenerator.mountains = function (mesh, n, radius) {
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
                    var doubleDistanceFromOrigin = (p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]);
                    newvals[i] += Math.pow(Math.exp(-(doubleDistanceFromOrigin) / (2 * radius * radius)), 2);
                }
            }
            console.log(newvals);
            return newvals;
        };
        TerrainGenerator.continent = function (mesh, peakHeight, count, radius) {
            radius = radius || 0.05;
            var n = count;
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
                    var distanceFromOrigin = (p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]);
                    newvals[i] += Math.exp((-1 * Math.pow(distanceFromOrigin, 2)) / Math.pow(radius, 2)) * peakHeight;
                }
            }
            console.log(newvals);
            return newvals;
        };
        // 傾斜をなだらかにする
        TerrainGenerator.relax = function (h) {
            // @ts-ignore
            var newh = resetTerrainHeights(h.mesh);
            for (var i = 0; i < h.length; i++) {
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
                if (nbs.length < 3) {
                    newh[i] = 0;
                    continue;
                }
                newh[i] = d3.mean(nbs.map(function (j) { return h[j]; })) || 0;
            }
            return newh;
        };
        // どのポイントからどのポイントに対して傾斜させるかを決定する
        TerrainGenerator.downhill = function (h) {
            if (h.downhill)
                return h.downhill;
            function downFrom(i) {
                if (util_1.TerrainCalcUtil.isEdge(h.mesh, i))
                    return -2;
                var best = -1;
                var besth = h[i];
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
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
        };
        TerrainGenerator.fillSinks = function (h, epsilon) {
            epsilon = epsilon || 1e-5;
            var infinity = 999999;
            var newHeights = TerrainGenerator.resetTerrainHeights(h.mesh);
            for (var i = 0; i < h.length; i++) {
                if (util_1.TerrainCalcUtil.isNearEdge(h.mesh, i)) {
                    newHeights[i] = h[i];
                }
                else {
                    newHeights[i] = infinity;
                }
            }
            while (true) {
                var hasChanged = false;
                for (var i = 0; i < h.length; i++) {
                    if (newHeights[i] == h[i])
                        continue;
                    var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
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
                if (!hasChanged)
                    return newHeights;
            }
        };
        TerrainGenerator.getFlux = function (h) {
            // 傾斜を作成
            var dh = TerrainGenerator.downhill(h);
            var idxs = [];
            var flux = TerrainGenerator.resetTerrainHeights(h.mesh);
            for (var i = 0; i < h.length; i++) {
                idxs[i] = i;
                flux[i] = 1 / h.length;
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
        };
        TerrainGenerator.getSlope = function (h) {
            var dh = TerrainGenerator.downhill(h);
            var slope = TerrainGenerator.resetTerrainHeights(h.mesh);
            for (var i = 0; i < h.length; i++) {
                var s = TerrainGenerator.trislope(h, i);
                slope[i] = Math.sqrt(s[0] * s[0] + s[1] * s[1]);
                continue;
                if (dh[i] < 0) {
                    slope[i] = 0;
                }
                else {
                    slope[i] = (h[i] - h[dh[i]]) / util_1.TerrainCalcUtil.getDistance(h.mesh, i, dh[i]);
                }
            }
            return slope;
        };
        TerrainGenerator.erosionRate = function (h) {
            var flux = TerrainGenerator.getFlux(h);
            var slope = TerrainGenerator.getSlope(h);
            var newh = TerrainGenerator.resetTerrainHeights(h.mesh);
            for (var i = 0; i < h.length; i++) {
                var river = Math.sqrt(flux[i]) * slope[i];
                var creep = slope[i] * slope[i];
                var total = 1000 * river + creep;
                total = total > 200 ? 200 : total;
                newh[i] = total;
            }
            return newh;
        };
        TerrainGenerator.erode = function (h, amount) {
            var er = TerrainGenerator.erosionRate(h);
            var newh = TerrainGenerator.resetTerrainHeights(h.mesh);
            var maxr = d3.max(er) || 0;
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i] - amount * (er[i] / maxr);
            }
            return newh;
        };
        TerrainGenerator.doErosion = function (h, amount, n) {
            n = n || 1;
            h = TerrainGenerator.fillSinks(h);
            for (var i = 0; i < n; i++) {
                h = TerrainGenerator.erode(h, amount);
                h = TerrainGenerator.fillSinks(h);
            }
            return h;
        };
        TerrainGenerator.setSeaLevel = function (h, q) {
            var newh = TerrainGenerator.resetTerrainHeights(h.mesh);
            newh.seaLevelHeight = q;
            var delta = util_1.TerrainCalcUtil.getQuantile(h, q) || 0;
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i] - delta;
            }
            return newh;
        };
        // 海抜ゼロメートル地点とみなす高さを設定して、既存のすべての高さを調整しなおす
        TerrainGenerator.rescaleBySeaLevel = function (h, newSeaLevel) {
            var delta = newSeaLevel - 0;
            for (var i = 0; i < h.length; i++) {
                h[i] = h[i] - delta;
                if (h[i] > h.heightRange[1]) {
                    h[i] = h.heightRange[1];
                }
                if (h[i] < h.heightRange[0]) {
                    h[i] = h.heightRange[0];
                }
            }
            return h;
        };
        TerrainGenerator.cleanCoast = function (h, iters) {
            for (var iter = 0; iter < iters; iter++) {
                var changed = 0;
                var newh = TerrainGenerator.resetTerrainHeights(h.mesh);
                for (var i = 0; i < h.length; i++) {
                    newh[i] = h[i];
                    var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
                    if (h[i] <= 0 || nbs.length != 3)
                        continue;
                    var count = 0;
                    var best = -999999;
                    for (var j = 0; j < nbs.length; j++) {
                        if (h[nbs[j]] > 0) {
                            count++;
                        }
                        else if (h[nbs[j]] > best) {
                            best = h[nbs[j]];
                        }
                    }
                    if (count > 1)
                        continue;
                    newh[i] = best / 2;
                    changed++;
                }
                h = newh;
                newh = TerrainGenerator.resetTerrainHeights(h.mesh);
                for (var i = 0; i < h.length; i++) {
                    newh[i] = h[i];
                    var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
                    if (h[i] > 0 || nbs.length != 3)
                        continue;
                    var count = 0;
                    var best = 999999;
                    for (var j = 0; j < nbs.length; j++) {
                        if (h[nbs[j]] <= 0) {
                            count++;
                        }
                        else if (h[nbs[j]] < best) {
                            best = h[nbs[j]];
                        }
                    }
                    if (count > 1)
                        continue;
                    newh[i] = best / 2;
                    changed++;
                }
                h = newh;
            }
            return h;
        };
        TerrainGenerator.trislope = function (h, i) {
            var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
            if (nbs.length != 3)
                return [0, 0];
            var p0 = h.mesh.voronoiPoints[nbs[0]];
            var p1 = h.mesh.voronoiPoints[nbs[1]];
            var p2 = h.mesh.voronoiPoints[nbs[2]];
            var x1 = p1.x - p0.x;
            var x2 = p2.x - p0.x;
            var y1 = p1.y - p0.y;
            var y2 = p2.y - p0.y;
            var det = x1 * y2 - x2 * y1;
            var h1 = h[nbs[1]] - h[nbs[0]];
            var h2 = h[nbs[2]] - h[nbs[0]];
            return [(y2 * h1 - y1 * h2) / det,
                (-x2 * h1 + x1 * h2) / det];
        };
        TerrainGenerator.relaxPath = function (path) {
            var newpath = [path[0]];
            for (var i = 1; i < path.length - 1; i++) {
                var newpt = [0.25 * path[i - 1][0] + 0.5 * path[i][0] + 0.25 * path[i + 1][0],
                    0.25 * path[i - 1][1] + 0.5 * path[i][1] + 0.25 * path[i + 1][1]];
                newpath.push(newpt);
            }
            newpath.push(path[path.length - 1]);
            return newpath;
        };
        TerrainGenerator.dropEdge = function (h, p) {
            p = p || 4;
            var newh = TerrainGenerator.resetTerrainHeights(h.mesh);
            for (var i = 0; i < h.length; i++) {
                var v = h.mesh.voronoiPoints[i];
                var x = 2.4 * v.x / h.mesh.extent.width;
                var y = 2.4 * v.y / h.mesh.extent.height;
                newh[i] = h[i] - Math.exp(10 * (Math.pow(Math.pow(x, p) + Math.pow(y, p), 1 / p) - 1));
            }
            return newh;
        };
        TerrainGenerator.generateCoast = function (npts, extent) {
            var mesh = mesh_generator_1.MeshGenerator.generateGoodMesh(npts, extent);
            var generatedSlopes = TerrainGenerator.slope(mesh, util_1.TerrainCalcUtil.randomVector(4));
            var generatedCones = TerrainGenerator.cone(mesh, util_1.TerrainCalcUtil.runif(-1, -1));
            var generatedMountains = TerrainGenerator.mountains(mesh, 50);
            console.log(generatedSlopes);
            console.log(mesh);
            var h = TerrainGenerator.mergeHeights(generatedSlopes, generatedCones, generatedMountains);
            for (var i = 0; i < 10; i++) {
                h = TerrainGenerator.relax(h);
            }
            h = TerrainGenerator.peaky(h);
            h = TerrainGenerator.doErosion(h, util_1.TerrainCalcUtil.runif(0, 0.1), 5);
            h = TerrainGenerator.setSeaLevel(h, util_1.TerrainCalcUtil.runif(0.2, 0.6));
            h = TerrainGenerator.fillSinks(h);
            h = TerrainGenerator.cleanCoast(h, 3);
            return h;
        };
        TerrainGenerator.defaultParams = {
            extent: exports.defaultExtent,
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
        return TerrainGenerator;
    }());
    exports.TerrainGenerator = TerrainGenerator;
});
