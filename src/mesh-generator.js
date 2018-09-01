var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./util", "./terrain-generator"], function (require, exports, d3, util_1, terrain_generator_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    var MeshGenerator = /** @class */ (function () {
        function MeshGenerator() {
        }
        MeshGenerator.generatePoints = function (n, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var pts = [];
            for (var i = 0; i < n; i++) {
                // ランダムな数値を得て、領域全体に散らばるように補正(領域のwidth/heightを乗じる）
                var x = (Math.random() - 0.5) * extent.width;
                var y = (Math.random() - 0.5) * extent.height;
                pts.push([x, y]);
            }
            return pts;
        };
        MeshGenerator.appendPoints = function (pts, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            pts.concat(MeshGenerator.generateVoronoiDiagram(pts, extent)
                .polygons()
                .map(util_1.TerrainCalcUtil.centroid));
            return pts;
        };
        MeshGenerator.generateGoodPoints = function (n, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var pts = MeshGenerator.generatePoints(n, extent);
            pts = pts.sort(function (a, b) {
                return a[0] - b[0];
            });
            return MeshGenerator.appendPoints(pts, extent);
        };
        MeshGenerator.generateGoodMesh = function (n, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var pts = MeshGenerator.generateGoodPoints(n, extent);
            return MeshGenerator.makeMesh(pts, extent);
        };
        MeshGenerator.generateVoronoiDiagram = function (pts, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var w = extent.width / 2;
            var h = extent.height / 2;
            // voronoi図の範囲を示し、VoronoiDiagramを作成する
            return d3.voronoi().extent([[-w, -h], [w, h]])(pts);
        };
        MeshGenerator.makeMesh = function (pts, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var vor = MeshGenerator.generateVoronoiDiagram(pts, extent);
            var pointToIdDict = {};
            var voronoiPoints = [];
            // Edgeとして隣接するポイント同士を接続する
            var adjacentIds = [];
            var edges = [];
            var pointConnections = [];
            for (var i = 0; i < vor.edges.length; i++) {
                var edge = vor.edges[i];
                if (edge == undefined)
                    continue;
                var e0Id = pointToIdDict[edge[0].toString()];
                var e1Id = pointToIdDict[edge[1].toString()];
                if (e0Id == undefined) {
                    e0Id = voronoiPoints.length;
                    pointToIdDict[edge[0].toString()] = e0Id;
                    voronoiPoints.push(edge[0]);
                }
                if (e1Id == undefined) {
                    e1Id = voronoiPoints.length;
                    pointToIdDict[edge[1].toString()] = e1Id;
                    voronoiPoints.push(edge[1]);
                }
                adjacentIds[e0Id] = adjacentIds[e0Id] || [];
                adjacentIds[e0Id].push(e1Id);
                adjacentIds[e1Id] = adjacentIds[e1Id] || [];
                adjacentIds[e1Id].push(e0Id);
                edges.push({
                    index1: e0Id,
                    index2: e1Id,
                    left: edge.left,
                    right: edge.right
                });
                pointConnections[e0Id] = pointConnections[e0Id] || [];
                if (pointConnections[e0Id].indexOf(edge.left) === -1) {
                    pointConnections[e0Id].push(edge.left);
                }
                if (edge.right && pointConnections[e0Id].indexOf(edge.right) === -1) {
                    pointConnections[e0Id].push(edge.right);
                }
                pointConnections[e1Id] = pointConnections[e1Id] || [];
                if (pointConnections[e1Id].indexOf(edge.left) === -1) {
                    pointConnections[e1Id].push(edge.left);
                }
                if (edge.right && pointConnections[e0Id].indexOf(edge.right) === -1) {
                    pointConnections[e1Id].push(edge.right);
                }
            }
            var mesh = {
                voronoiPoints: voronoiPoints,
                adjacentPointIds: adjacentIds,
                pointConnections: pointConnections,
                edges: edges,
                extent: extent,
                pointMapFunction: function (f) {
                }
            };
            mesh.pointMapFunction = function (f) {
                var mapped = voronoiPoints.map(f);
                // @ts-ignore
                mapped.mesh = mesh;
                return mapped;
            };
            return mesh;
        };
        return MeshGenerator;
    }());
    exports.MeshGenerator = MeshGenerator;
});
