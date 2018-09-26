var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3"], function (require, exports, d3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    'use strict';
    class TerrainUtil {
        static getIconId(id) {
            return 'icon-' + id.toString();
        }
    }
    exports.TerrainUtil = TerrainUtil;
    class TerrainCalcUtil {
        static mean(numbers) {
            var total = 0, i;
            for (i = 0; i < numbers.length; i += 1) {
                total += numbers[i];
            }
            return total / numbers.length;
        }
        static standardDeviation(numbers, average) {
            if (!average) {
                average = TerrainCalcUtil.mean(numbers);
            }
            return Math.sqrt(numbers.map((num) => {
                let diff = num - average;
                return Math.pow(diff, 2);
            })
                .reduce((item1, item2) => item1 + item2) / numbers.length);
        }
        // 乱数を生成する
        static runif(lo, hi) {
            return lo + Math.random() * (hi - lo);
        }
        /**
         * 正規分布乱数関数 参考:http://d.hatena.ne.jp/iroiro123/20111210/1323515616
         * @param number m 平均μ
         * @param number s 分散σ^2
         * @return number ランダムに生成された値
         */
        static normRand(m, s) {
            var a = 1 - Math.random();
            var b = 1 - Math.random();
            var c = Math.sqrt(-2 * Math.log(a));
            if (0.5 - Math.random() > 0) {
                return c * Math.sin(Math.PI * 2 * b) * s + m;
            }
            else {
                return c * Math.cos(Math.PI * 2 * b) * s + m;
            }
        }
        ;
        static rnorm(lo, hi) {
            lo = lo || -1;
            hi = hi || 1;
            let z2 = null;
            function rnorm() {
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
        static randomVector(scale) {
            return [scale * TerrainCalcUtil.rnorm(), scale * TerrainCalcUtil.rnorm()];
        }
        static centroid(pts) {
            var x = 0;
            var y = 0;
            for (var i = 0; i < pts.length; i++) {
                x += pts[i][0];
                y += pts[i][1];
            }
            return [x / pts.length, y / pts.length];
        }
        static isEdge(mesh, i) {
            return (mesh.pointDict[i].connectingPoints.length < 3);
        }
        // マップの近隣にある領域かどうか
        static isNearEdge(mesh, i) {
            var x = mesh.voronoiPoints[i].x;
            var y = mesh.voronoiPoints[i].y;
            var w = mesh.extent.width;
            var h = mesh.extent.height;
            var margin = mesh.extent.margin;
            return (x < (w / 2) - w + margin) || (x > w - (w / 2) - margin) || (y < (h / 2) - h + margin) || (y > h - (h / 2) - margin);
        }
        // マップの端に隣接する領域かどうか
        static isNextEdge(mesh, i) {
            var x = mesh.voronoiPoints[i].x;
            var y = mesh.voronoiPoints[i].y;
            var w = mesh.extent.width;
            var h = mesh.extent.height;
            const marginW = (w - (w / 2)) / 100;
            const marginH = (h - (h / 2)) / 100;
            return (x < (w / 2) - w + marginW) ||
                (x > w - (w / 2) - marginW) ||
                (y < (h / 2) - h + marginH) ||
                (y > h - (h / 2) - marginH);
        }
        static getNeighbourIds(mesh, i) {
            return mesh.pointDict[i].connectingPoints.map(e => {
                return e.id;
            });
        }
        static getDistance(mesh, i, j) {
            var p = mesh.voronoiPoints[i];
            var q = mesh.voronoiPoints[j];
            return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
        }
        static getQuantile(h, q) {
            var sortedh = [];
            for (var i = 0; i < h.length; i++) {
                sortedh[i] = h[i];
            }
            sortedh.sort(d3.ascending);
            return d3.quantile(sortedh, q);
        }
        static mergeSegments(segs) {
            var adj = {};
            for (var i = 0; i < segs.length; i++) {
                var seg = segs[i];
                var a0 = adj[seg[0]] || [];
                var a1 = adj[seg[1]] || [];
                a0.push(seg[1]);
                a1.push(seg[0]);
                adj[seg[0]] = a0;
                adj[seg[1]] = a1;
            }
            var done = [];
            var paths = [];
            var path = null;
            while (true) {
                if (path == null) {
                    for (var i = 0; i < segs.length; i++) {
                        if (done[i])
                            continue;
                        done[i] = true;
                        path = [segs[i][0], segs[i][1]];
                        break;
                    }
                    if (path == null)
                        break;
                }
                var changed = false;
                for (var i = 0; i < segs.length; i++) {
                    if (done[i])
                        continue;
                    if (adj[path[0]].length == 2 && segs[i][0] == path[0]) {
                        path.unshift(segs[i][1]);
                    }
                    else {
                        if (adj[path[0]].length == 2 && segs[i][1] == path[0]) {
                            path.unshift(segs[i][0]);
                        }
                        else {
                            if (adj[path[path.length - 1]].length == 2 && segs[i][0] == path[path.length - 1]) {
                                path.push(segs[i][1]);
                            }
                            else {
                                if (adj[path[path.length - 1]].length == 2 && segs[i][1] == path[path.length - 1]) {
                                    path.push(segs[i][0]);
                                }
                                else {
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
    exports.TerrainCalcUtil = TerrainCalcUtil;
});
