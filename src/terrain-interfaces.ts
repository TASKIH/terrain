import { VoronoiEdge, VoronoiLayout, VoronoiSite } from 'd3';
import { VoronoiDiagram } from 'd3';

export interface FontSize {
    region: number;
    city: number;
    town: number;
}
export enum MergeMethod {
    Add,
    Average,
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

export interface River {
    root: TerrainPoint;
    dest?: TerrainPoint;
    route: TerrainPoint[];
}

export interface TerrainPoint {
    id: number;
    x: number;
    y: number;

    height: number;
}
export interface VoronoiSiteContainer extends VoronoiSite<[number, number]> {
    edge: VoronoiEdge<[number, number]>;
    terrainPointIndex: number;
}
export class VoronoiSiteContainerArray extends Array<VoronoiSiteContainer> {
}
export interface TerrainPointContainer {
    point: TerrainPoint;
    connectingPoints: TerrainPoint[];
    relatedVoronoiSites: VoronoiSiteContainerArray;
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
    mesh?: MapMesh;
    h: TerrainHeights,
    rivers?: any[],
    coasts?: any[],
}

export interface TerrainHeights extends Array<number> {
    downFromDict?: {[key: number]: TerrainPoint | null};

    heightRange?: [number, number];
    seaLevelHeight?: number;
}
export const COAST_LINE_HEIGHT = 0;