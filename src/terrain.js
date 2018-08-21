var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./language", "js-priority-queue", "js-priority-queue"], function (require, exports, d3, language, PriorityQueue) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    language = __importStar(language);
    PriorityQueue = __importStar(PriorityQueue);
    // 乱数を生成する
    function runif(lo, hi) {
        return lo + Math.random() * (hi - lo);
    }
    exports.runif = runif;
    var rnorm = (function () {
        var z2 = null;
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
                x1 = runif(-1, 1);
                x2 = runif(-1, 1);
                w = x1 * x1 + x2 * x2;
            }
            w = Math.sqrt(-2 * Math.log(w) / w);
            z2 = x2 * w;
            return x1 * w;
        }
        return rnorm;
    })();
    function randomVector(scale) {
        return [scale * rnorm(), scale * rnorm()];
    }
    exports.randomVector = randomVector;
    exports.defaultExtent = {
        width: 1,
        height: 1
    };
    function generatePoints(n, extent) {
        extent = extent || exports.defaultExtent;
        var pts = [];
        for (var i = 0; i < n; i++) {
            // ランダムな数値を得て、領域全体に散らばるように補正(領域のwidth/heightを乗じる）
            var x = (Math.random() - 0.5) * extent.width;
            var y = (Math.random() - 0.5) * extent.height;
            pts.push([x, y]);
        }
        return pts;
    }
    exports.generatePoints = generatePoints;
    function centroid(pts) {
        var x = 0;
        var y = 0;
        for (var i = 0; i < pts.length; i++) {
            x += pts[i][0];
            y += pts[i][1];
        }
        return [x / pts.length, y / pts.length];
    }
    exports.centroid = centroid;
    function improvePoints(pts, n, extent) {
        n = n || 1;
        extent = extent || exports.defaultExtent;
        for (var i = 0; i < n; i++) {
            // @ts-ignore
            pts = voronoi(pts, extent)
                .polygons(pts)
                .map(centroid);
        }
        return pts;
    }
    exports.improvePoints = improvePoints;
    function generateGoodPoints(n, extent) {
        extent = extent || exports.defaultExtent;
        var pts = generatePoints(n, extent);
        pts = pts.sort(function (a, b) {
            return a[0] - b[0];
        });
        return improvePoints(pts, 1, extent);
    }
    exports.generateGoodPoints = generateGoodPoints;
    function voronoi(pts, extent) {
        extent = extent || exports.defaultExtent;
        var w = extent.width / 2;
        var h = extent.height / 2;
        // voronoi図の範囲を示し、VoronoiDiagramを作成する
        return d3.voronoi().extent([[-w, -h], [w, h]])(pts);
    }
    exports.voronoi = voronoi;
    function makeMesh(pts, extent) {
        extent = extent || exports.defaultExtent;
        var vor = voronoi(pts, extent);
        var vxids = {};
        var vxs = [];
        var adj = [];
        var edges = [];
        var tris = [];
        for (var i = 0; i < vor.edges.length; i++) {
            var e = vor.edges[i];
            if (e == undefined)
                continue;
            // @ts-ignore
            var e0 = vxids[e[0]];
            // @ts-ignore
            var e1 = vxids[e[1]];
            if (e0 == undefined) {
                e0 = vxs.length;
                // @ts-ignore
                vxids[e[0]] = e0;
                vxs.push(e[0]);
            }
            if (e1 == undefined) {
                e1 = vxs.length;
                // @ts-ignore
                vxids[e[1]] = e1;
                vxs.push(e[1]);
            }
            adj[e0] = adj[e0] || [];
            adj[e0].push(e1);
            adj[e1] = adj[e1] || [];
            adj[e1].push(e0);
            edges.push({
                index1: e0,
                index2: e1,
                left: e.left,
                right: e.right
            });
            tris[e0] = tris[e0] || [];
            if (tris[e0].indexOf(e.left) === -1)
                tris[e0].push(e.left);
            if (e.right && tris[e0].indexOf(e.right) === -1)
                tris[e0].push(e.right);
            tris[e1] = tris[e1] || [];
            if (tris[e1].indexOf(e.left) === -1)
                tris[e1].push(e.left);
            if (e.right && tris[e0].indexOf(e.right) === -1)
                tris[e1].push(e.right);
        }
        console.log(tris);
        console.log(vxs);
        var mesh = {
            pts: pts,
            vor: vor,
            vxs: vxs,
            adj: adj,
            tris: tris,
            edges: edges,
            extent: extent,
            map: function (f) {
            }
        };
        mesh.map = function (f) {
            var mapped = vxs.map(f);
            // @ts-ignore
            mapped.mesh = mesh;
            return mapped;
        };
        return mesh;
    }
    exports.makeMesh = makeMesh;
    function generateGoodMesh(n, extent) {
        extent = extent || exports.defaultExtent;
        var pts = generateGoodPoints(n, extent);
        return makeMesh(pts, extent);
    }
    exports.generateGoodMesh = generateGoodMesh;
    function isedge(mesh, i) {
        return (mesh.adj[i].length < 3);
    }
    exports.isedge = isedge;
    function isnearedge(mesh, i) {
        var x = mesh.vxs[i][0];
        var y = mesh.vxs[i][1];
        var w = mesh.extent.width;
        var h = mesh.extent.height;
        return x < -0.45 * w || x > 0.45 * w || y < -0.45 * h || y > 0.45 * h;
    }
    exports.isnearedge = isnearedge;
    function neighbours(mesh, i) {
        var onbs = mesh.adj[i];
        var nbs = [];
        for (var i = 0; i < onbs.length; i++) {
            nbs.push(onbs[i]);
        }
        return nbs;
    }
    exports.neighbours = neighbours;
    function distance(mesh, i, j) {
        var p = mesh.vxs[i];
        var q = mesh.vxs[j];
        return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]));
    }
    exports.distance = distance;
    function quantile(h, q) {
        var sortedh = [];
        for (var i = 0; i < h.length; i++) {
            sortedh[i] = h[i];
        }
        sortedh.sort(d3.ascending);
        return d3.quantile(sortedh, q);
    }
    exports.quantile = quantile;
    function zero(mesh) {
        var z = [];
        for (var i = 0; i < mesh.vxs.length; i++) {
            z[i] = 0;
        }
        z.mesh = mesh;
        return z;
    }
    exports.zero = zero;
    function slope(mesh, direction) {
        return mesh.map(function (param) {
            return param[0] * direction[0] + param[1] * direction[1];
        });
    }
    exports.slope = slope;
    function cone(mesh, slope) {
        return mesh.map(function (param) {
            return Math.pow(param[0] * param[0] + param[1] * param[1], 0.5) * slope;
        });
    }
    exports.cone = cone;
    function map(h, f) {
        var newh = h.map(f);
        newh.mesh = h.mesh;
        return newh;
    }
    exports.map = map;
    function normalize(h) {
        var lo = d3.min(h);
        var hi = d3.max(h);
        return map(h, function (x) {
            return (x - (lo || 0)) / (hi || 0 - (lo || 0));
        });
    }
    exports.normalize = normalize;
    function peaky(heights) {
        return map(normalize(heights), Math.sqrt);
    }
    exports.peaky = peaky;
    function add() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var n = args[0].length;
        var newvals = zero(args[0].mesh);
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < arguments.length; j++) {
                newvals[i] += arguments[j][i];
            }
        }
        return newvals;
    }
    exports.add = add;
    function mountains(mesh, n, r) {
        r = r || 0.05;
        var mounts = [];
        for (var i = 0; i < n; i++) {
            mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
        }
        var newvals = zero(mesh);
        for (var i = 0; i < mesh.vxs.length; i++) {
            var p = mesh.vxs[i];
            for (var j = 0; j < n; j++) {
                var m = mounts[j];
                newvals[i] += Math.pow(Math.exp(-((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1])) / (2 * r * r)), 2);
            }
        }
        return newvals;
    }
    exports.mountains = mountains;
    function relax(h) {
        // @ts-ignore
        var newh = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            // @ts-ignore
            var nbs = neighbours(h.mesh, i);
            if (nbs.length < 3) {
                newh[i] = 0;
                continue;
            }
            newh[i] = d3.mean(nbs.map(function (j) { return h[j]; })) || 0;
        }
        return newh;
    }
    exports.relax = relax;
    function downhill(h) {
        // @ts-ignore
        if (h.downhill)
            return h.downhill;
        function downfrom(i) {
            // @ts-ignore
            if (isedge(h.mesh, i))
                return -2;
            var best = -1;
            var besth = h[i];
            // @ts-ignore
            var nbs = neighbours(h.mesh, i);
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
            downs[i] = downfrom(i);
        }
        // @ts-ignore
        h.downhill = downs;
        return downs;
    }
    exports.downhill = downhill;
    function findSinks(h) {
        var dh = downhill(h);
        var sinks = [];
        for (var i = 0; i < dh.length; i++) {
            var node = i;
            while (true) {
                if (isedge(h.mesh, node)) {
                    sinks[i] = -2;
                    break;
                }
                if (dh[node] == -1) {
                    sinks[i] = node;
                    break;
                }
                node = dh[node];
            }
        }
    }
    exports.findSinks = findSinks;
    function fillSinks(h, epsilon) {
        epsilon = epsilon || 1e-5;
        var infinity = 999999;
        var newh = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            if (isnearedge(h.mesh, i)) {
                newh[i] = h[i];
            }
            else {
                newh[i] = infinity;
            }
        }
        while (true) {
            var changed = false;
            for (var i = 0; i < h.length; i++) {
                if (newh[i] == h[i])
                    continue;
                var nbs = neighbours(h.mesh, i);
                for (var j = 0; j < nbs.length; j++) {
                    if (h[i] >= newh[nbs[j]] + epsilon) {
                        newh[i] = h[i];
                        changed = true;
                        break;
                    }
                    var oh = newh[nbs[j]] + epsilon;
                    if ((newh[i] > oh) && (oh > h[i])) {
                        newh[i] = oh;
                        changed = true;
                    }
                }
            }
            if (!changed)
                return newh;
        }
    }
    exports.fillSinks = fillSinks;
    function getFlux(h) {
        var dh = downhill(h);
        var idxs = [];
        var flux = zero(h.mesh);
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
    }
    exports.getFlux = getFlux;
    function getSlope(h) {
        var dh = downhill(h);
        var slope = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            var s = trislope(h, i);
            slope[i] = Math.sqrt(s[0] * s[0] + s[1] * s[1]);
            continue;
            if (dh[i] < 0) {
                slope[i] = 0;
            }
            else {
                slope[i] = (h[i] - h[dh[i]]) / distance(h.mesh, i, dh[i]);
            }
        }
        return slope;
    }
    exports.getSlope = getSlope;
    function erosionRate(h) {
        var flux = getFlux(h);
        var slope = getSlope(h);
        var newh = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            var river = Math.sqrt(flux[i]) * slope[i];
            var creep = slope[i] * slope[i];
            var total = 1000 * river + creep;
            total = total > 200 ? 200 : total;
            newh[i] = total;
        }
        return newh;
    }
    exports.erosionRate = erosionRate;
    function erode(h, amount) {
        var er = erosionRate(h);
        var newh = zero(h.mesh);
        var maxr = d3.max(er) || 0;
        for (var i = 0; i < h.length; i++) {
            newh[i] = h[i] - amount * (er[i] / maxr);
        }
        return newh;
    }
    exports.erode = erode;
    function doErosion(h, amount, n) {
        n = n || 1;
        h = fillSinks(h);
        for (var i = 0; i < n; i++) {
            h = erode(h, amount);
            h = fillSinks(h);
        }
        return h;
    }
    exports.doErosion = doErosion;
    function setSeaLevel(h, q) {
        var newh = zero(h.mesh);
        var delta = quantile(h, q) || 0;
        for (var i = 0; i < h.length; i++) {
            newh[i] = h[i] - delta;
        }
        return newh;
    }
    exports.setSeaLevel = setSeaLevel;
    function cleanCoast(h, iters) {
        for (var iter = 0; iter < iters; iter++) {
            var changed = 0;
            var newh = zero(h.mesh);
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i];
                var nbs = neighbours(h.mesh, i);
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
            newh = zero(h.mesh);
            for (var i = 0; i < h.length; i++) {
                newh[i] = h[i];
                var nbs = neighbours(h.mesh, i);
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
    }
    exports.cleanCoast = cleanCoast;
    function trislope(h, i) {
        var nbs = neighbours(h.mesh, i);
        if (nbs.length != 3)
            return [0, 0];
        var p0 = h.mesh.vxs[nbs[0]];
        var p1 = h.mesh.vxs[nbs[1]];
        var p2 = h.mesh.vxs[nbs[2]];
        var x1 = p1[0] - p0[0];
        var x2 = p2[0] - p0[0];
        var y1 = p1[1] - p0[1];
        var y2 = p2[1] - p0[1];
        var det = x1 * y2 - x2 * y1;
        var h1 = h[nbs[1]] - h[nbs[0]];
        var h2 = h[nbs[2]] - h[nbs[0]];
        return [(y2 * h1 - y1 * h2) / det,
            (-x2 * h1 + x1 * h2) / det];
    }
    exports.trislope = trislope;
    function cityScore(h, cities) {
        var score = map(getFlux(h), Math.sqrt);
        for (var i = 0; i < h.length; i++) {
            if (h[i] <= 0 || isnearedge(h.mesh, i)) {
                score[i] = -999999;
                score[i] = -999999;
                continue;
            }
            score[i] += 0.01 / (1e-9 + Math.abs(h.mesh.vxs[i][0]) - h.mesh.extent.width / 2);
            score[i] += 0.01 / (1e-9 + Math.abs(h.mesh.vxs[i][1]) - h.mesh.extent.height / 2);
            for (var j = 0; j < cities.length; j++) {
                score[i] -= 0.02 / (distance(h.mesh, cities[j], i) + 1e-9);
            }
        }
        return score;
    }
    exports.cityScore = cityScore;
    function placeCity(render) {
        render.cities = render.cities || [];
        var score = cityScore(render.h, render.cities);
        var newcity = d3.scan(score, d3.descending);
        render.cities.push(newcity);
    }
    exports.placeCity = placeCity;
    function placeCities(render) {
        var params = render.params;
        var h = render.h;
        var n = params.ncities;
        for (var i = 0; i < n; i++) {
            placeCity(render);
        }
    }
    exports.placeCities = placeCities;
    // 等高線の作成
    function contour(h, level) {
        level = level || 0;
        var edges = [];
        for (var i = 0; i < h.mesh.edges.length; i++) {
            var e = h.mesh.edges[i];
            if (e.right == undefined)
                continue;
            if (isnearedge(h.mesh, e.index1) || isnearedge(h.mesh, e.index2))
                continue;
            if ((h[e.index1] > level && h[e.index2] <= level) ||
                (h[e.index2] > level && h[e.index1] <= level)) {
                edges.push([e.left, e.right]);
            }
        }
        return mergeSegments(edges);
    }
    exports.contour = contour;
    function getRivers(h, limit) {
        var dh = downhill(h);
        var flux = getFlux(h);
        var links = [];
        var above = 0;
        for (var i = 0; i < h.length; i++) {
            if (h[i] > 0)
                above++;
        }
        limit *= above / h.length;
        for (var i = 0; i < dh.length; i++) {
            if (isnearedge(h.mesh, i))
                continue;
            if (flux[i] > limit && h[i] > 0 && dh[i] >= 0) {
                var up = h.mesh.vxs[i];
                var down = h.mesh.vxs[dh[i]];
                if (h[dh[i]] > 0) {
                    links.push([up, down]);
                }
                else {
                    links.push([up, [(up[0] + down[0]) / 2, (up[1] + down[1]) / 2]]);
                }
            }
        }
        return mergeSegments(links).map(relaxPath);
    }
    exports.getRivers = getRivers;
    function getTerritories(render) {
        var h = render.h;
        var cities = render.cities;
        var n = render.params.nterrs;
        if (n > render.cities.length)
            n = render.cities.length;
        var flux = getFlux(h);
        var terr = [];
        var newQueue = new PriorityQueue.ArrayStrategy({ comparator: function (a, b) { return a.score - b.score; } });
        function weight(u, v) {
            var horiz = distance(h.mesh, u, v);
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
            var nbs = neighbours(h.mesh, cities[i]);
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
            var nbs = neighbours(h.mesh, u.vx);
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
        // @ts-ignore
        terr.mesh = h.mesh;
        return terr;
    }
    exports.getTerritories = getTerritories;
    function getBorders(render) {
        var terr = render.terr;
        var h = render.h;
        var edges = [];
        for (var i = 0; i < terr.mesh.edges.length; i++) {
            var e = terr.mesh.edges[i];
            if (e[3] == undefined)
                continue;
            if (isnearedge(terr.mesh, e[0]) || isnearedge(terr.mesh, e[1]))
                continue;
            if (h[e[0]] < 0 || h[e[1]] < 0)
                continue;
            if (terr[e[0]] != terr[e[1]]) {
                edges.push([e[2], e[3]]);
            }
        }
        return mergeSegments(edges).map(relaxPath);
    }
    exports.getBorders = getBorders;
    function mergeSegments(segs) {
        var adj = {};
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
                    if (done[i])
                        continue;
                    done[i] = true;
                    // @ts-ignore
                    // @ts-ignore
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
                // @ts-ignore
                if (adj[path[0]].length == 2 && segs[i][0] == path[0]) {
                    // @ts-ignore
                    path.unshift(segs[i][1]);
                }
                else { // @ts-ignore
                    // @ts-ignore
                    if (adj[path[0]].length == 2 && segs[i][1] == path[0]) {
                        // @ts-ignore
                        path.unshift(segs[i][0]);
                    }
                    else { // @ts-ignore
                        // @ts-ignore
                        if (adj[path[path.length - 1]].length == 2 && segs[i][0] == path[path.length - 1]) {
                            // @ts-ignore
                            path.push(segs[i][1]);
                        }
                        else { // @ts-ignore
                            // @ts-ignore
                            if (adj[path[path.length - 1]].length == 2 && segs[i][1] == path[path.length - 1]) {
                                // @ts-ignore
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
    exports.mergeSegments = mergeSegments;
    function relaxPath(path) {
        var newpath = [path[0]];
        for (var i = 1; i < path.length - 1; i++) {
            var newpt = [0.25 * path[i - 1][0] + 0.5 * path[i][0] + 0.25 * path[i + 1][0],
                0.25 * path[i - 1][1] + 0.5 * path[i][1] + 0.25 * path[i + 1][1]];
            newpath.push(newpt);
        }
        newpath.push(path[path.length - 1]);
        return newpath;
    }
    exports.relaxPath = relaxPath;
    function visualizePoints(svg, pts) {
        var circle = svg.selectAll('circle').data(pts);
        circle.enter()
            .append('circle');
        circle.exit().remove();
        d3.selectAll('circle')
            .attr('cx', function (d) { return 1000 * d[0]; })
            .attr('cy', function (d) { return 1000 * d[1]; })
            .attr('r', 100 / Math.sqrt(pts.length));
    }
    exports.visualizePoints = visualizePoints;
    function makeD3Path(path) {
        var p = d3.path();
        p.moveTo(1000 * path[0][0], 1000 * path[0][1]);
        for (var i = 1; i < path.length; i++) {
            p.lineTo(1000 * path[i][0], 1000 * path[i][1]);
        }
        return p.toString();
    }
    exports.makeD3Path = makeD3Path;
    function visualizeVoronoi(svg, field, lo, hi) {
        var valueHi;
        var valueLo;
        if (hi == undefined)
            valueHi = (d3.max(field) || 0) + 1e-9;
        if (lo == undefined)
            valueLo = (d3.min(field) || 0) - 1e-9;
        var mappedvals = field.map(function (x) { return x > valueHi ? 1 : x < valueLo ? 0 : (x - valueLo) / (valueHi - valueLo); });
        // @ts-ignore
        var tris = svg.selectAll('path.field').data(field.mesh.tris);
        tris.enter()
            .append('path')
            .classed('field', true);
        tris.exit()
            .remove();
        svg.selectAll('path.field')
            .attr('d', makeD3Path)
            .style('fill', function (d, i) {
            return d3.interpolateViridis(mappedvals[i]);
        });
    }
    exports.visualizeVoronoi = visualizeVoronoi;
    function visualizeDownhill(h) {
        var links = getRivers(h, 0.01);
        drawPaths('river', links);
    }
    exports.visualizeDownhill = visualizeDownhill;
    function drawPaths(svg, cls, paths) {
        var paths = svg.selectAll('path.' + cls).data(paths);
        paths.enter()
            .append('path')
            .classed(cls, true);
        paths.exit()
            .remove();
        svg.selectAll('path.' + cls)
            .attr('d', makeD3Path);
    }
    exports.drawPaths = drawPaths;
    function visualizeSlopes(svg, render) {
        var h = render.h;
        var strokes = [];
        var r = 0.25 / Math.sqrt(h.length);
        for (var i = 0; i < h.length; i++) {
            if (h[i] <= 0 || isnearedge(h.mesh, i))
                continue;
            var nbs = neighbours(h.mesh, i);
            nbs.push(i);
            var s = 0;
            var s2 = 0;
            for (var j = 0; j < nbs.length; j++) {
                var slopes = trislope(h, nbs[j]);
                s += slopes[0] / 10;
                s2 += slopes[1];
            }
            s /= nbs.length;
            s2 /= nbs.length;
            if (Math.abs(s) < runif(0.1, 0.4))
                continue;
            var l = r * runif(1, 2) * (1 - 0.2 * Math.pow(Math.atan(s), 2)) * Math.exp(s2 / 100);
            var x = h.mesh.vxs[i][0];
            var y = h.mesh.vxs[i][1];
            if (Math.abs(l * s) > 2 * r) {
                var n = Math.floor(Math.abs(l * s / r));
                l /= n;
                if (n > 4)
                    n = 4;
                for (var j = 0; j < n; j++) {
                    var u = rnorm() * r;
                    var v = rnorm() * r;
                    strokes.push([[x + u - l, y + v + l * s], [x + u + l, y + v - l * s]]);
                }
            }
            else {
                strokes.push([[x - l, y + l * s], [x + l, y - l * s]]);
            }
        }
        var lines = svg.selectAll('line.slope').data(strokes);
        lines.enter()
            .append('line')
            .classed('slope', true);
        lines.exit()
            .remove();
        svg.selectAll('line.slope')
            .attr('x1', function (d) { return 1000 * d[0][0]; })
            .attr('y1', function (d) { return 1000 * d[0][1]; })
            .attr('x2', function (d) { return 1000 * d[1][0]; })
            .attr('y2', function (d) { return 1000 * d[1][1]; });
    }
    exports.visualizeSlopes = visualizeSlopes;
    function visualizeCities(svg, render) {
        var cities = render.cities;
        var h = render.h;
        var n = render.params.nterrs;
        var circs = svg.selectAll('circle.city').data(cities);
        circs.enter()
            .append('circle')
            .classed('city', true);
        circs.exit()
            .remove();
        svg.selectAll('circle.city')
            .attr('cx', function (d) { return 1000 * h.mesh.vxs[d][0]; })
            .attr('cy', function (d) { return 1000 * h.mesh.vxs[d][1]; })
            .attr('r', function (d, i) { return i >= n ? 4 : 10; })
            .style('fill', 'white')
            .style('stroke-width', 5)
            .style('stroke-linecap', 'round')
            .style('stroke', 'black')
            .raise();
    }
    exports.visualizeCities = visualizeCities;
    function dropEdge(h, p) {
        p = p || 4;
        var newh = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            var v = h.mesh.vxs[i];
            var x = 2.4 * v[0] / h.mesh.extent.width;
            var y = 2.4 * v[1] / h.mesh.extent.height;
            newh[i] = h[i] - Math.exp(10 * (Math.pow(Math.pow(x, p) + Math.pow(y, p), 1 / p) - 1));
        }
        return newh;
    }
    exports.dropEdge = dropEdge;
    function generateCoast(npts, extent) {
        var mesh = generateGoodMesh(npts, extent);
        var h = add(slope(mesh, randomVector(4)), cone(mesh, runif(-1, -1)), mountains(mesh, 50));
        for (var i = 0; i < 10; i++) {
            h = relax(h);
        }
        h = peaky(h);
        h = doErosion(h, runif(0, 0.1), 5);
        h = setSeaLevel(h, runif(0.2, 0.6));
        h = fillSinks(h);
        h = cleanCoast(h, 3);
        return h;
    }
    exports.generateCoast = generateCoast;
    function terrCenter(h, terr, city, landOnly) {
        var x = 0;
        var y = 0;
        var n = 0;
        for (var i = 0; i < terr.length; i++) {
            if (terr[i] != city)
                continue;
            if (landOnly && h[i] <= 0)
                continue;
            x += terr.mesh.vxs[i][0];
            y += terr.mesh.vxs[i][1];
            n++;
        }
        return [x / n, y / n];
    }
    exports.terrCenter = terrCenter;
    function drawLabels(svg, render) {
        var params = render.params;
        var h = render.h;
        var terr = render.terr;
        var cities = render.cities;
        var nterrs = render.params.nterrs;
        var avoids = [render.rivers, render.coasts, render.borders];
        var lang = language.makeRandomLanguage();
        var citylabels = [];
        function penalty(label) {
            var pen = 0;
            if (label.x0 < -0.45 * h.mesh.extent.width)
                pen += 100;
            if (label.x1 > 0.45 * h.mesh.extent.width)
                pen += 100;
            if (label.y0 < -0.45 * h.mesh.extent.height)
                pen += 100;
            if (label.y1 > 0.45 * h.mesh.extent.height)
                pen += 100;
            for (var i = 0; i < citylabels.length; i++) {
                var olabel = citylabels[i];
                if (label.x0 < olabel.x1 && label.x1 > olabel.x0 &&
                    label.y0 < olabel.y1 && label.y1 > olabel.y0) {
                    pen += 100;
                }
            }
            for (var i = 0; i < cities.length; i++) {
                var c = h.mesh.vxs[cities[i]];
                if (label.x0 < c[0] && label.x1 > c[0] && label.y0 < c[1] && label.y1 > c[1]) {
                    pen += 100;
                }
            }
            for (var i = 0; i < avoids.length; i++) {
                var avoid = avoids[i];
                for (var j = 0; j < avoid.length; j++) {
                    var avpath = avoid[j];
                    for (var k = 0; k < avpath.length; k++) {
                        var pt = avpath[k];
                        if (pt[0] > label.x0 && pt[0] < label.x1 && pt[1] > label.y0 && pt[1] < label.y1) {
                            pen++;
                        }
                    }
                }
            }
            return pen;
        }
        for (var i = 0; i < cities.length; i++) {
            var x = h.mesh.vxs[cities[i]][0];
            var y = h.mesh.vxs[cities[i]][1];
            var text = language.makeName(lang, 'city');
            var size = i < nterrs ? params.fontsizes.city : params.fontsizes.town;
            var sx = 0.65 * size / 1000 * text.length;
            var sy = size / 1000;
            var posslabels = [
                {
                    x: x + 0.8 * sy,
                    y: y + 0.3 * sy,
                    align: 'start',
                    x0: x + 0.7 * sy,
                    y0: y - 0.6 * sy,
                    x1: x + 0.7 * sy + sx,
                    y1: y + 0.6 * sy
                },
                {
                    x: x - 0.8 * sy,
                    y: y + 0.3 * sy,
                    align: 'end',
                    x0: x - 0.9 * sy - sx,
                    y0: y - 0.7 * sy,
                    x1: x - 0.9 * sy,
                    y1: y + 0.7 * sy
                },
                {
                    x: x,
                    y: y - 0.8 * sy,
                    align: 'middle',
                    x0: x - sx / 2,
                    y0: y - 1.9 * sy,
                    x1: x + sx / 2,
                    y1: y - 0.7 * sy
                },
                {
                    x: x,
                    y: y + 1.2 * sy,
                    align: 'middle',
                    x0: x - sx / 2,
                    y0: y + 0.1 * sy,
                    x1: x + sx / 2,
                    y1: y + 1.3 * sy
                }
            ];
            // @ts-ignore
            var label = posslabels[d3.scan(posslabels, function (a, b) { return penalty(a) - penalty(b); })];
            label.text = text;
            label.size = size;
            citylabels.push(label);
        }
        var texts = svg.selectAll('text.city').data(citylabels);
        texts.enter()
            .append('text')
            .classed('city', true);
        texts.exit()
            .remove();
        svg.selectAll('text.city')
            .attr('x', function (d) { return 1000 * d.x; })
            .attr('y', function (d) { return 1000 * d.y; })
            .style('font-size', function (d) { return d.size; })
            .style('text-anchor', function (d) { return d.align; })
            .text(function (d) { return d.text; })
            .raise();
        var reglabels = [];
        for (var i = 0; i < nterrs; i++) {
            var city = cities[i];
            var text = language.makeName(lang, 'region');
            var sy = params.fontsizes.region / 1000;
            var sx = 0.6 * text.length * sy;
            var lc = terrCenter(h, terr, city, true);
            var oc = terrCenter(h, terr, city, false);
            var best = 0;
            var bestscore = -999999;
            for (var j = 0; j < h.length; j++) {
                var score = 0;
                var v = h.mesh.vxs[j];
                score -= 3000 * Math.sqrt((v[0] - lc[0]) * (v[0] - lc[0]) + (v[1] - lc[1]) * (v[1] - lc[1]));
                score -= 1000 * Math.sqrt((v[0] - oc[0]) * (v[0] - oc[0]) + (v[1] - oc[1]) * (v[1] - oc[1]));
                if (terr[j] != city)
                    score -= 3000;
                for (var k = 0; k < cities.length; k++) {
                    var u = h.mesh.vxs[cities[k]];
                    if (Math.abs(v[0] - u[0]) < sx &&
                        Math.abs(v[1] - sy / 2 - u[1]) < sy) {
                        score -= k < nterrs ? 4000 : 500;
                    }
                    if (v[0] - sx / 2 < citylabels[k].x1 &&
                        v[0] + sx / 2 > citylabels[k].x0 &&
                        v[1] - sy < citylabels[k].y1 &&
                        v[1] > citylabels[k].y0) {
                        score -= 5000;
                    }
                }
                for (var k = 0; k < reglabels.length; k++) {
                    var label = reglabels[k];
                    if (v[0] - sx / 2 < label.x + label.width / 2 &&
                        v[0] + sx / 2 > label.x - label.width / 2 &&
                        v[1] - sy < label.y &&
                        v[1] > label.y - label.size) {
                        score -= 20000;
                    }
                }
                if (h[j] <= 0)
                    score -= 500;
                if (v[0] + sx / 2 > 0.5 * h.mesh.extent.width)
                    score -= 50000;
                if (v[0] - sx / 2 < -0.5 * h.mesh.extent.width)
                    score -= 50000;
                if (v[1] > 0.5 * h.mesh.extent.height)
                    score -= 50000;
                if (v[1] - sy < -0.5 * h.mesh.extent.height)
                    score -= 50000;
                if (score > bestscore) {
                    bestscore = score;
                    best = j;
                }
            }
            reglabels.push({
                text: text,
                x: h.mesh.vxs[best][0],
                y: h.mesh.vxs[best][1],
                size: sy,
                width: sx
            });
        }
        texts = svg.selectAll('text.region').data(reglabels);
        texts.enter()
            .append('text')
            .classed('region', true);
        texts.exit()
            .remove();
        svg.selectAll('text.region')
            .attr('x', function (d) { return 1000 * d.x; })
            .attr('y', function (d) { return 1000 * d.y; })
            .style('font-size', function (d) { return 1000 * d.size; })
            .style('text-anchor', 'middle')
            .text(function (d) { return d.text; })
            .raise();
    }
    exports.drawLabels = drawLabels;
    function drawMap(svg, render) {
        render.rivers = getRivers(render.h, 0.01);
        render.coasts = contour(render.h, 0);
        render.terr = getTerritories(render);
        render.borders = getBorders(render);
        drawPaths(svg, 'river', render.rivers);
        drawPaths(svg, 'coast', render.coasts);
        drawPaths(svg, 'border', render.borders);
        visualizeSlopes(svg, render);
        visualizeCities(svg, render);
        drawLabels(svg, render);
    }
    exports.drawMap = drawMap;
    function doMap(svg, params) {
        var width = svg.attr('width');
        svg.attr('height', width * params.extent.height / params.extent.width);
        svg.attr('viewBox', -1000 * params.extent.width / 2 + ' ' +
            -1000 * params.extent.height / 2 + ' ' +
            1000 * params.extent.width + ' ' +
            1000 * params.extent.height);
        svg.selectAll().remove();
        var render = {
            params: params,
            h: params.generator(params.npts, params.extent)
        };
        placeCities(render);
        drawMap(svg, render);
    }
    exports.doMap = doMap;
    exports.defaultParams = {
        extent: exports.defaultExtent,
        generator: generateCoast,
        npts: 16384,
        ncities: 15,
        nterrs: 5,
        fontsizes: {
            region: 40,
            city: 25,
            town: 20
        }
    };
});
