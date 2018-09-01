import { MapExtent, MapMesh, Edge } from "./terrain-interfaces";
import * as d3 from 'd3';
import { TerrainCalcUtil } from "./util";
import { defaultExtent } from "./terrain-generator";
import { VoronoiDiagram, VoronoiSite } from "d3";

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

    static makeMesh(pts: [number, number][], extent?: MapExtent): MapMesh {
        extent = extent || defaultExtent;
        var vor: VoronoiDiagram<[number, number]> = MeshGenerator.generateVoronoiDiagram(pts, extent);
        var pointToIdDict: {[key:string]: number} = {};
        var voronoiPoints: [number, number][] = [];

        // Edgeとして隣接するポイント同士を接続する
        var adjacentIds: [number, number, number][] = [];
        var edges: Edge[] = [];
        var pointConnections: {[key:number]: VoronoiSite<[number, number]>[]}  = [];

        for (var i = 0; i < vor.edges.length; i++) {
            var edge = vor.edges[i];
            if (edge == undefined) continue;

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

        var mesh: MapMesh = {
            voronoiPoints: voronoiPoints,
            adjacentPointIds: adjacentIds,
            pointConnections: pointConnections,
            edges: edges,
            extent: extent,
            pointMapFunction: (f: any) => {
            }
        };

        mesh.pointMapFunction = function (f: (param : [number, number]) => [number, number]) {
            var mapped = voronoiPoints.map(f);
            // @ts-ignore
            mapped.mesh = mesh;
            return mapped;
        };

        return mesh;
    }

}