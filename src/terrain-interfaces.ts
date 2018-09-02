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
    margin: number;
}

export interface Edge {
    index1: number;
    index2: number;
    left: VoronoiSite<[number, number]> | null;
    right: VoronoiSite<[number, number]> | null;
}

export interface TerrainPoint {
    id: number;
    x: number;
    y: number;

    height: number;
}

export interface TerrainPointContainer {
    point: TerrainPoint;
    connectingPoints: TerrainPoint[];
    relatedVoronoiSites: VoronoiSite<[number, number]>[];
    // 地盤の強固さ
    robustness: number;
    // 地盤の高さ
    height: number;
}

export interface MapMesh {
    voronoiPoints: TerrainPoint[];
    pointDict: {[key: number]: TerrainPointContainer};

    edges: Edge[];
    extent: MapExtent;
    pointMapFunction: (f: any) => any;
}


export interface MapRender {
    params: MapExportParam,
    mesh?: MapMesh;
    h: TerrainHeights,
    cities?: any[],
    terr?: any[],
    rivers?: any[],
    coasts?: any[],
    borders?: any[],
}

export interface TerrainHeights extends Array<number> {
    downFromDict?: {[key: number]: TerrainPoint | null};

    heightRange?: [number, number];
    seaLevelHeight?: number;
}

export interface MapExportParam {
    extent: MapExtent;
    generator: (mesh: MapMesh, extent: MapExtent) => any;
    npts: number;
    ncities: number;
    nterrs: number;
    fontsizes: FontSize;
}