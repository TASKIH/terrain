import { VoronoiEdge, VoronoiLayout, VoronoiSite } from 'd3-voronoi';
import { VoronoiDiagram } from 'd3';

export interface FontSize {
    region: number;
    city: number;
    town: number;
}

export interface MapExtent {
    width: number;
    height: number;
}

export interface Edge {
    index1: number;
    index2: number;
    left: VoronoiSite<[number, number]> | null;
    right: VoronoiSite<[number, number]> | null;
}

export interface MapMesh {
    pts: [number, number][];
    vor: VoronoiDiagram<[number, number]>;
    voronoiPoints: [number, number][];
    adjacentPointIds: [number, number, number][],
    pointConnections: { [key: number]: VoronoiSite<[number, number]>[] },
    edges: Edge[],
    extent: MapExtent,
    pointMapFunction: (f: any) => any,
}


export interface MapRender {
    params: MapExportParam,
    h: any,
    cities?: any[],
    terr?: any[],
    rivers?: any[],
    coasts?: any[],
    borders?: any[],
}

export interface TerrainHeights extends Array<number> {
    mesh?: MapMesh;
    downhill?: number[]
}

export interface MapExportParam {
    extent: MapExtent;
    generator: (npts: number, extent: MapExtent) => any;
    npts: number;
    ncities: number;
    nterrs: number;
    fontsizes: FontSize;
}