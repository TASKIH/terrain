var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./util", "js-priority-queue"], function (require, exports, d3, util_1) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    exports.defaultExtent = {
        width: 1,
        height: 1,
        margin: 0.10,
    };
    var TerrainGenerator = /** @class */ (function () {
        function TerrainGenerator() {
        }
        TerrainGenerator.generateZeroHeights = function (mesh) {
            var z = [];
            for (var i = 0; i < mesh.voronoiPoints.length; i++) {
                z[i] = 0;
            }
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
        TerrainGenerator.makeMarginSea = function (mesh, heights) {
            for (var i = 0; i < mesh.voronoiPoints.length; i++) {
                var p = mesh.voronoiPoints[i];
                if (util_1.TerrainCalcUtil.isNearEdge(mesh, i)) {
                    heights[p.id] = -0.4;
                }
            }
        };
        TerrainGenerator.mergeHeights = function (mesh) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var n = args[0].length;
            var newVals = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < n; i++) {
                for (var j = 0; j < args.length; j++) {
                    newVals[i] += args[j][i];
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
            var newvals = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < mesh.voronoiPoints.length; i++) {
                var p = mesh.voronoiPoints[i];
                for (var j = 0; j < n; j++) {
                    var m = mounts[j];
                    var doubleDistanceFromOrigin = (p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]);
                    newvals[i] += Math.pow(Math.exp(-(doubleDistanceFromOrigin) / (2 * radius * radius)), 2);
                }
            }
            return newvals;
        };
        TerrainGenerator.continent = function (mesh, peakHeight, count, radius, margin) {
            radius = radius || 0.05;
            margin = margin || 0;
            var validWidth = mesh.extent.width - (margin * 2);
            var validHeight = mesh.extent.height - (margin * 2);
            var n = count;
            var mounts = [];
            for (var i = 0; i < n; i++) {
                mounts.push([validWidth * (Math.random() - 0.5) + margin, validHeight * (Math.random() - 0.5) + margin]);
            }
            console.log(mounts);
            var newvals = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < mesh.voronoiPoints.length; i++) {
                var p = mesh.voronoiPoints[i];
                for (var j = 0; j < n; j++) {
                    var m = mounts[j];
                    var distanceFromOrigin = (p.x - m[0]) * (p.x - m[0]) + (p.y - m[1]) * (p.y - m[1]);
                    newvals[i] += Math.exp((-1 * Math.pow(distanceFromOrigin, 2)) / Math.pow(radius, 2)) * peakHeight;
                }
            }
            return newvals;
        };
        /**
         * 浸食・風化を実行
         * @param mesh: MapのMesh
         * @param h: 地盤の高さ
         * @param eroseRate: どれくらい浸食させるか
         */
        TerrainGenerator.erodeSimply = function (mesh, h, eroseRate) {
            var newHeights = h;
            mesh.voronoiPoints.forEach(function (e) {
                var myHeight = newHeights[e.id];
                mesh.pointDict[e.id].connectingPoints.forEach(function (rel) {
                    var nextHeight = newHeights[rel.id];
                    // 自分の方が周りよりも低いときは何もしない
                    if (myHeight <= nextHeight) {
                        return;
                    }
                    // 高さの差分を見る。露出が多いほど浸食・風化が激しいという考え。
                    var delta = myHeight - nextHeight;
                    // 差分に風化レートと地盤の頑健さをかけあわせる
                    var decHeight = delta * eroseRate * (1 - mesh.pointDict[e.id].robustness);
                    // 差分を引く
                    newHeights[e.id] = newHeights[e.id] - decHeight;
                    // 引いた分を低い方に流す（拡散方程式などが使えるかもしれないけど、今は単純に）
                    newHeights[rel.id] = newHeights[rel.id] + decHeight;
                });
            });
            return newHeights;
        };
        // 傾斜をなだらかにする
        TerrainGenerator.relax = function (mesh, h) {
            var newh = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(mesh, i);
                if (nbs.length < 3) {
                    newh[i] = 0;
                    continue;
                }
                newh[i] = d3.mean(nbs.map(function (j) { return h[j]; })) || 0;
            }
            return newh;
        };
        // 傾斜元IDのリストを取得する
        TerrainGenerator.generateDownFromDict = function (mesh, h) {
            if (h.downFromDict)
                return h.downFromDict;
            /**
             * どのポイントから傾斜させるか返す。戻り値はID
             * @param i
             */
            function downFrom(i) {
                if (util_1.TerrainCalcUtil.isEdge(mesh, i))
                    return -2;
                var best = -1;
                var besth = h[i];
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(mesh, i);
                for (var j = 0; j < nbs.length; j++) {
                    var neighbousId = nbs[j];
                    if (h[neighbousId] < besth) {
                        besth = h[neighbousId];
                        best = neighbousId;
                    }
                }
                return best;
            }
            var downs = {};
            for (var i = 0; i < h.length; i++) {
                var downPoint = mesh.pointDict[downFrom(i)];
                downs[i] = (downPoint) ? downPoint.point : null;
            }
            h.downFromDict = downs;
            return downs;
        };
        /**
         * Sinkの平滑化。https://pro.arcgis.com/ja/pro-app/tool-reference/spatial-analyst/how-fill-works.htm
         * 変な窪地をなくすための処理
         * @param mesh
         * @param h
         * @param epsilon
         */
        TerrainGenerator.fillSinks = function (mesh, h, epsilon) {
            // ごく小さい値（何か意味があるわけじゃなく、必ず小さな傾斜をつけるために値を与えているだけ）
            epsilon = epsilon || 1e-5;
            var infinity = 999999;
            var newHeights = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                if (util_1.TerrainCalcUtil.isNextEdge(mesh, i)) {
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
                    var nbs = util_1.TerrainCalcUtil.getNeighbourIds(mesh, i);
                    for (var j = 0; j < nbs.length; j++) {
                        var nbHeight = newHeights[nbs[j]];
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
                if (!hasChanged)
                    return newHeights;
            }
        };
        TerrainGenerator.getFlux = function (mesh, h) {
            // 傾斜を作成
            var downFromDict = TerrainGenerator.generateDownFromDict(mesh, h);
            var indexes = [];
            var flux = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                indexes[i] = i;
                flux[i] = 1 / h.length;
            }
            // 隣接する点との傾斜が激しい順に並び替える
            indexes.sort(function (idx1, idx2) {
                return h[idx2] - h[idx1];
            });
            for (var i = 0; i < h.length; i++) {
                var j = indexes[i];
                if (downFromDict[j]) {
                    flux[downFromDict[j].id] += flux[j];
                }
            }
            return flux;
        };
        TerrainGenerator.getSlope = function (mesh, h) {
            var downFromDict = TerrainGenerator.generateDownFromDict(mesh, h);
            var slope = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                if (!downFromDict[i]) {
                    slope[i] = 0;
                }
                else {
                    var delta = (h[i] - h[downFromDict[i].id]);
                    slope[i] = delta / util_1.TerrainCalcUtil.getDistance(mesh, i, downFromDict[i].id);
                }
            }
            return slope;
        };
        TerrainGenerator.erosionRate = function (mesh, h) {
            var flux = TerrainGenerator.getFlux(mesh, h);
            var slope = TerrainGenerator.getSlope(mesh, h);
            var newh = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                var river = Math.sqrt(flux[i]) * slope[i];
                var creep = slope[i] * slope[i];
                var total = 1000 * river + creep;
                total = total > 200 ? 200 : total;
                newh[i] = total;
            }
            return newh;
        };
        TerrainGenerator.erode = function (mesh, h, amount) {
            var er = TerrainGenerator.erosionRate(mesh, h);
            var newh = TerrainGenerator.generateZeroHeights(mesh);
            var maxr = d3.max(er) || 0;
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i] - amount * (er[i] / maxr);
            }
            return newh;
        };
        TerrainGenerator.doErosion = function (mesh, h, amount, n) {
            n = n || 1;
            h = TerrainGenerator.fillSinks(mesh, h);
            for (var i = 0; i < n; i++) {
                h = TerrainGenerator.erode(mesh, h, amount);
                h = TerrainGenerator.fillSinks(mesh, h);
            }
            return h;
        };
        TerrainGenerator.setSeaLevel = function (mesh, h, q) {
            var newh = TerrainGenerator.generateZeroHeights(mesh);
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
        TerrainGenerator.cleanCoast = function (mesh, h, iters) {
            for (var iter = 0; iter < iters; iter++) {
                var newh = TerrainGenerator.generateZeroHeights(mesh);
                for (var i = 0; i < h.length; i++) {
                    newh[i] = h[i];
                    var nbs = util_1.TerrainCalcUtil.getNeighbourIds(mesh, i);
                    // 既に水面下にある地点はスルー
                    if (h[i] <= 0 || nbs.length != 3)
                        continue;
                    var doNotSetNewheight = false;
                    var topNeighboursHeight = -999999;
                    for (var j = 0; j < nbs.length; j++) {
                        if (h[nbs[j]] > 0) {
                            doNotSetNewheight = true;
                            break;
                        }
                        else if (h[nbs[j]] > topNeighboursHeight) {
                            topNeighboursHeight = h[nbs[j]];
                        }
                    }
                    if (doNotSetNewheight)
                        continue;
                    newh[i] = topNeighboursHeight / 2;
                }
                h = newh;
                newh = TerrainGenerator.generateZeroHeights(mesh);
                for (var i = 0; i < h.length; i++) {
                    newh[i] = h[i];
                    var nbs = util_1.TerrainCalcUtil.getNeighbourIds(mesh, i);
                    // 既に地上になっている地点はスルー
                    if (h[i] > 0 || nbs.length != 3)
                        continue;
                    var doNotSetNewheight = false;
                    var bottomNeighboursHeight = 999999;
                    for (var j = 0; j < nbs.length; j++) {
                        if (h[nbs[j]] <= 0) {
                            doNotSetNewheight = true;
                            break;
                        }
                        else if (h[nbs[j]] < bottomNeighboursHeight) {
                            bottomNeighboursHeight = h[nbs[j]];
                        }
                    }
                    if (doNotSetNewheight)
                        continue;
                    newh[i] = bottomNeighboursHeight / 2;
                }
                h = newh;
            }
            return h;
        };
        /**
         * 周辺の点の高さを見てどれくらい傾いてるのか取得する
         * @param mesh
         * @param h
         * @param i
         */
        TerrainGenerator.trislope = function (mesh, h, i) {
            var nbs = util_1.TerrainCalcUtil.getNeighbourIds(mesh, i);
            if (nbs.length != 3)
                return [0, 0];
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
            return [(deltaYFrom2To0 * deltaHeightFrom1To0 - deltaYFrom1To0 * deltaHeightFrom2To0) / det,
                (-deltaXFrom2To0 * deltaHeightFrom1To0 + deltaXFrom1To0 * deltaHeightFrom2To0) / det];
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
        TerrainGenerator.dropEdge = function (mesh, h, p) {
            p = p || 4;
            var newh = TerrainGenerator.generateZeroHeights(mesh);
            for (var i = 0; i < h.length; i++) {
                var v = mesh.voronoiPoints[i];
                var x = 2.4 * v.x / mesh.extent.width;
                var y = 2.4 * v.y / mesh.extent.height;
                newh[i] = h[i] - Math.exp(10 * (Math.pow(Math.pow(x, p) + Math.pow(y, p), 1 / p) - 1));
            }
            return newh;
        };
        TerrainGenerator.generateCoast = function (mesh, extent) {
            var generatedSlopes = TerrainGenerator.slope(mesh, util_1.TerrainCalcUtil.randomVector(4));
            var generatedCones = TerrainGenerator.cone(mesh, util_1.TerrainCalcUtil.runif(-1, -1));
            var generatedMountains = TerrainGenerator.mountains(mesh, 50);
            console.log(generatedSlopes);
            console.log(mesh);
            var h = TerrainGenerator.mergeHeights(mesh, generatedSlopes, generatedCones, generatedMountains);
            for (var i = 0; i < 10; i++) {
                h = TerrainGenerator.relax(mesh, h);
            }
            h = TerrainGenerator.peaky(h);
            h = TerrainGenerator.doErosion(mesh, h, util_1.TerrainCalcUtil.runif(0, 0.1), 5);
            h = TerrainGenerator.setSeaLevel(mesh, h, util_1.TerrainCalcUtil.runif(0.2, 0.6));
            // h = TerrainGenerator.fillSinks(mesh, h);
            h = TerrainGenerator.cleanCoast(mesh, h, 3);
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
