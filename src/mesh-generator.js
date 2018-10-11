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
    class MeshGenerator {
        static generatePoints(n, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var pts = [];
            for (var i = 0; i < n; i++) {
                // ランダムな数値を得て、領域全体に散らばるように補正(領域のwidth/heightを乗じる）
                const x = (Math.random() - 0.5) * extent.width;
                const y = (Math.random() - 0.5) * extent.height;
                pts.push([x, y]);
            }
            return pts;
        }
        static appendPoints(pts, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            pts.concat(MeshGenerator.generateVoronoiDiagram(pts, extent)
                .polygons()
                .map(util_1.TerrainCalcUtil.centroid));
            return pts;
        }
        static generateGoodPoints(n, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            let pts = MeshGenerator.generatePoints(n, extent);
            pts = pts.sort(function (a, b) {
                return a[0] - b[0];
            });
            return MeshGenerator.appendPoints(pts, extent);
        }
        static generateGoodMesh(n, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var pts = MeshGenerator.generateGoodPoints(n, extent);
            return MeshGenerator.makeMesh(pts, extent);
        }
        static generateVoronoiDiagram(pts, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var w = extent.width / 2;
            var h = extent.height / 2;
            // voronoi図の範囲を示し、VoronoiDiagramを作成する
            return d3.voronoi().extent([[-w, -h], [w, h]])(pts);
        }
        static newTerrainPointContainer(point) {
            return {
                point: point,
                connectingPoints: [],
                delaunayRelations: [],
                height: 0,
                robustness: 0
            };
        }
        static generateVoronoiSiteContainer(voronoiEdge, srcSite, destSite, srcPointIndex, destPointIndex) {
            return Object.assign({
                srcPointIndex: srcPointIndex,
                destPointIndex: destPointIndex,
                srcVoronoiSite: srcSite,
                destVoronoiSite: destSite,
                voronoiEdge: voronoiEdge,
            });
        }
        static makeMesh(pts, extent) {
            extent = extent || terrain_generator_1.defaultExtent;
            var vor = MeshGenerator.generateVoronoiDiagram(pts, extent);
            var pointToIdDict = {};
            var delaunayPoints = [];
            var pointDict = {};
            var edges = [];
            for (var i = 0; i < vor.edges.length; i++) {
                var edge = vor.edges[i];
                if (edge == undefined)
                    continue;
                var delaunayPoint1Id = pointToIdDict[edge[0].toString()];
                var delaunayPoint2Id = pointToIdDict[edge[1].toString()];
                if (delaunayPoint1Id == undefined) {
                    delaunayPoint1Id = delaunayPoints.length;
                    pointToIdDict[edge[0].toString()] = delaunayPoint1Id;
                    const newPoint = {
                        id: delaunayPoint1Id,
                        x: edge[0][0],
                        y: edge[0][1],
                        height: 0
                    };
                    pointDict[delaunayPoint1Id] = MeshGenerator.newTerrainPointContainer(newPoint);
                    delaunayPoints.push(newPoint);
                }
                if (delaunayPoint2Id == undefined) {
                    delaunayPoint2Id = delaunayPoints.length;
                    pointToIdDict[edge[1].toString()] = delaunayPoint2Id;
                    const newPoint = {
                        id: delaunayPoint2Id,
                        x: edge[1][0],
                        y: edge[1][1],
                        height: 0
                    };
                    pointDict[delaunayPoint2Id] = MeshGenerator.newTerrainPointContainer(newPoint);
                    delaunayPoints.push(newPoint);
                }
                pointDict[delaunayPoint1Id].connectingPoints.push(pointDict[delaunayPoint2Id].point);
                pointDict[delaunayPoint2Id].connectingPoints.push(pointDict[delaunayPoint1Id].point);
                if (edge.right) {
                    const e0Relation = MeshGenerator.generateVoronoiSiteContainer(edge, edge.left, edge.right, delaunayPoint1Id, delaunayPoint2Id);
                    const p0DelaunayRelations = pointDict[delaunayPoint1Id].delaunayRelations;
                    if (!p0DelaunayRelations.find(e => e.destPointIndex === delaunayPoint2Id)) {
                        p0DelaunayRelations.push(e0Relation);
                    }
                    const e1Relation = MeshGenerator.generateVoronoiSiteContainer(edge, edge.right, edge.left, delaunayPoint2Id, delaunayPoint1Id);
                    const p1DelaunayRelations = pointDict[delaunayPoint2Id].delaunayRelations;
                    if (!p1DelaunayRelations.find(e => e.destPointIndex === delaunayPoint1Id)) {
                        p1DelaunayRelations.push(e1Relation);
                    }
                }
                edges.push({
                    terminalPoint1Id: delaunayPoint1Id,
                    terminalPoint2Id: delaunayPoint2Id,
                    voronoiSite1: edge.left,
                    voronoiSite2: edge.right
                });
            }
            var mesh = {
                terrainPoints: delaunayPoints,
                pointDict: pointDict,
                edges: edges,
                extent: extent,
                pointMapFunction: (f) => {
                }
            };
            mesh.pointMapFunction = function (f) {
                var mapped = delaunayPoints.map(f);
                return mapped;
            };
            return mesh;
        }
    }
    exports.MeshGenerator = MeshGenerator;
});
