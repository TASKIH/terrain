import { MapExtent, MapMesh, Edge, TerrainPoint, TerrainPointContainer, DelaunayRelation } from "./terrain-interfaces";
import * as d3 from 'd3';
import { TerrainCalcUtil } from "./util";
import { defaultExtent } from "./terrain-generator";
import { VoronoiDiagram, VoronoiSite, VoronoiEdge } from "d3";

export class MeshGenerator {
    static generatePoints(n: number, extent?: MapExtent): [number, number][] {
        extent = extent || defaultExtent;
        var pts:[number, number][] = [];

        for (var i = 0; i < n; i++) {
            // ランダムな数値を得て、領域全体に散らばるように補正(領域のwidth/heightを乗じる）
            const x = (Math.random() - 0.5) * extent.width;
            const y = (Math.random() - 0.5) * extent.height;
            pts.push([x, y]);
        }
        return pts;
    }

    static appendPoints(pts: [number, number][], extent?: MapExtent): [number, number][] {
        extent = extent || defaultExtent;
        pts.concat(MeshGenerator.generateVoronoiDiagram(pts, extent)
            .polygons()
            .map(TerrainCalcUtil.centroid));
        return pts;
    }

    static generateGoodPoints(n: number, extent: MapExtent): [number, number][] {
        extent = extent || defaultExtent;
        let pts = MeshGenerator.generatePoints(n, extent);
        pts = pts.sort(function (a, b) {
            return a[0] - b[0];
        });
        return MeshGenerator.appendPoints(pts, extent);
    }

    static generateGoodMesh(n: number, extent?: MapExtent): MapMesh {
        extent = extent || defaultExtent;
        var pts = MeshGenerator.generateGoodPoints(n, extent);
        return MeshGenerator.makeMesh(pts, extent);
    }
    
    static generateVoronoiDiagram(
            pts: [number, number][],
            extent: MapExtent): VoronoiDiagram<[number, number]> {
        extent = extent || defaultExtent;
        var w = extent.width/2;
        var h = extent.height/2;

        // voronoi図の範囲を示し、VoronoiDiagramを作成する
        return d3.voronoi().extent([[-w, -h], [w, h]])(pts);
    }

    static newTerrainPointContainer(
        point: TerrainPoint): TerrainPointContainer {
            return {
                point: point,
                connectingPoints: [],
                delaunayRelations: [],
                height: 0,
                robustness: 0
            }
    }
    static generateVoronoiSiteContainer(
        voronoiEdge: VoronoiEdge<[number, number]>,
        srcSite: VoronoiSite<[number, number]>,
        destSite: VoronoiSite<[number, number]>,
        srcPointIndex: number,
        destPointIndex: number,
    ): DelaunayRelation {
        return Object.assign({
            srcPointIndex: srcPointIndex,
            destPointIndex: destPointIndex,
            srcVoronoiSite: srcSite,
            destVoronoiSite: destSite,
            voronoiEdge: voronoiEdge,}
        );
    }

    static makeMesh(pts: [number, number][], extent?: MapExtent): MapMesh {
        extent = extent || defaultExtent;
        var vor: VoronoiDiagram<[number, number]> = MeshGenerator.generateVoronoiDiagram(pts, extent);
        var pointToIdDict: {[key:string]: number} = {};
        var delaunayPoints: TerrainPoint[] = [];
        var pointDict: {[key: number]: TerrainPointContainer} = {};

        var edges: Edge[] = [];

        for (var i = 0; i < vor.edges.length; i++) {
            var edge = vor.edges[i];
            if (edge == undefined) continue;

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
                }

                pointDict[delaunayPoint2Id] = MeshGenerator.newTerrainPointContainer(newPoint);
                delaunayPoints.push(newPoint);

            }
            pointDict[delaunayPoint1Id].connectingPoints.push(pointDict[delaunayPoint2Id].point);

            pointDict[delaunayPoint2Id].connectingPoints.push(pointDict[delaunayPoint1Id].point);

            if (edge.right) {
                const e0Relation: DelaunayRelation = 
                MeshGenerator.generateVoronoiSiteContainer(edge, edge.left, edge.right, delaunayPoint1Id, delaunayPoint2Id);
                const p0DelaunayRelations = pointDict[delaunayPoint1Id].delaunayRelations;
                if (!p0DelaunayRelations.find(e => 
                    e.destPointIndex === delaunayPoint2Id)) {
                    p0DelaunayRelations.push(e0Relation);
                }

                const e1Relation: DelaunayRelation = 
                MeshGenerator.generateVoronoiSiteContainer(edge, edge.right, edge.left, delaunayPoint2Id, delaunayPoint1Id);

                const p1DelaunayRelations = pointDict[delaunayPoint2Id].delaunayRelations;
                if (!p1DelaunayRelations.find(e => 
                    e.destPointIndex === delaunayPoint1Id)) {
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

        var mesh: MapMesh = {
            terrainPoints: delaunayPoints,
            pointDict: pointDict,
            edges: edges,
            extent: extent,
            pointMapFunction: (f: any) => {
            }
        };

        mesh.pointMapFunction = function (f: (param : TerrainPoint) => [number, number]) {
            var mapped = delaunayPoints.map(f);
            return mapped;
        };

        return mesh;
    }

}