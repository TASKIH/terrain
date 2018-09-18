import { MapExtent, MapMesh, Edge, TerrainPoint, TerrainPointContainer, VoronoiSiteContainer } from "./terrain-interfaces";
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
                relatedVoronoiSites: [],
                height: 0,
                robustness: 0
            }
    }
    static generateVoronoiSiteContainer(
        edge: VoronoiEdge<[number, number]>,
        site: VoronoiSite<[number, number]>,
        terrainPointIndex: number
    ): VoronoiSiteContainer {
        return Object.assign({terrainPointIndex: terrainPointIndex,
        edge: edge}, site);
    }

    static makeMesh(pts: [number, number][], extent?: MapExtent): MapMesh {
        extent = extent || defaultExtent;
        var vor: VoronoiDiagram<[number, number]> = MeshGenerator.generateVoronoiDiagram(pts, extent);
        var pointToIdDict: {[key:string]: number} = {};
        var voronoiPoints: TerrainPoint[] = [];
        var pointDict: {[key: number]: TerrainPointContainer} = {};

        var edges: Edge[] = [];

        for (var i = 0; i < vor.edges.length; i++) {
            var edge = vor.edges[i];
            if (edge == undefined) continue;

            var e0Id = pointToIdDict[edge[0].toString()];
            var e1Id = pointToIdDict[edge[1].toString()];
            
            if (e0Id == undefined) {
                e0Id = voronoiPoints.length;
                pointToIdDict[edge[0].toString()] = e0Id;
                const newPoint = {
                    id: e0Id,
                    x: edge[0][0],
                    y: edge[0][1],
                    height: 0
                };

                pointDict[e0Id] = MeshGenerator.newTerrainPointContainer(newPoint);
                voronoiPoints.push(newPoint);
            }
            if (e1Id == undefined) {
                e1Id = voronoiPoints.length;
                pointToIdDict[edge[1].toString()] = e1Id;
                const newPoint = {
                    id: e1Id,
                    x: edge[1][0],
                    y: edge[1][1],
                    height: 0
                }

                pointDict[e1Id] = MeshGenerator.newTerrainPointContainer(newPoint);
                voronoiPoints.push(newPoint);

            }
            pointDict[e0Id].connectingPoints.push(pointDict[e1Id].point);

            pointDict[e1Id].connectingPoints.push(pointDict[e0Id].point);

            const leftSite: VoronoiSiteContainer = 
            MeshGenerator.generateVoronoiSiteContainer(edge, edge.left, e1Id);
            
            let rightSite: VoronoiSiteContainer | undefined = undefined;
            if (edge.right) {
                rightSite = 
                MeshGenerator.generateVoronoiSiteContainer(edge, edge.right, e0Id);
            }

            edges.push({
                    index1: e0Id,
                    index2: e1Id,
                    left: edge.left,
                    right: edge.right
            });

            if (leftSite.terrainPointIndex !== e0Id && pointDict[e0Id].relatedVoronoiSites.indexOf(leftSite) === -1) {
                pointDict[e0Id].relatedVoronoiSites.push(leftSite);
            }
            if (rightSite && rightSite.terrainPointIndex !== e0Id && pointDict[e0Id].relatedVoronoiSites.indexOf(rightSite!) === -1) {
                pointDict[e0Id].relatedVoronoiSites.push(rightSite!);
            }

            if (leftSite.terrainPointIndex !== e1Id && 
                pointDict[e1Id].relatedVoronoiSites.indexOf(leftSite) === -1) {

                pointDict[e1Id].relatedVoronoiSites.push(leftSite);
            }
            if (rightSite && 
                rightSite.terrainPointIndex !== e1Id && 
                pointDict[e1Id].relatedVoronoiSites.indexOf(rightSite!) === -1) {
                pointDict[e1Id].relatedVoronoiSites.push(rightSite!);
            }
        }

        var mesh: MapMesh = {
            voronoiPoints: voronoiPoints,
            pointDict: pointDict,
            edges: edges,
            extent: extent,
            pointMapFunction: (f: any) => {
            }
        };

        mesh.pointMapFunction = function (f: (param : TerrainPoint) => [number, number]) {
            var mapped = voronoiPoints.map(f);
            return mapped;
        };

        return mesh;
    }

}