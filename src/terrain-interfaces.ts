import { VoronoiEdge, VoronoiLayout, VoronoiSite } from 'd3';
import { VoronoiDiagram } from 'd3';

// 高さの差を「崖」だとみなす高さ
export const CLIFF_BOUNDARY_HEIGHT = 0.05;

export enum ShadowLevel {
    Normal,
    Dark1,
    Dark2,
}

export interface FontSize {
    region: number;
    city: number;
    town: number;
}
export enum MergeMethod {
    Add,
    Average,
}
export enum EventKind {
    IconChanged,
    LabelChanged,
    WholeMapChanged,
}
export interface MapExtent {
    width: number;
    height: number;
    margin: number;
}
export interface TerrainControlIcon {
    imgSrc: string;
    imgAlt: string;
    title: string;
    topHeight: string;
    radius: string;
}
export enum TerrainControllType {
    UpHill,
    DownHill,
    UpMountain,
    DownMountain
}

export interface Edge {
    terminalPoint1Id: number;
    terminalPoint2Id: number;
    voronoiSite1: VoronoiSite<[number, number]> | null;
    voronoiSite2: VoronoiSite<[number, number]> | null;
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
export interface DelaunayRelation {
    voronoiEdge: VoronoiEdge<[number, number]>;
    srcPointIndex: number;
    destPointIndex: number;
    srcVoronoiSite: VoronoiSite<[number, number]>;
    destVoronoiSite: VoronoiSite<[number, number]>;
}
export class DelaunayRelationArray extends Array<DelaunayRelation> {
}
export interface TerrainPointContainer {
    point: TerrainPoint;
    connectingPoints: TerrainPoint[];
    delaunayRelations: DelaunayRelationArray;
    // 地盤の強固さ
    robustness: number;
    shadow?: ShadowLevel;
    // 地盤の高さ
    height: number;
}

export interface MapMesh {
    terrainPoints: TerrainPoint[];
    pointDict: {[key: number]: TerrainPointContainer};

    edges: Edge[];
    extent: MapExtent;
    pointMapFunction: (f: any) => any;
}

export interface SaveData {
    mesh: MapMesh;
    h: TerrainHeights,
    rivers?: any[],
    icons?: {[key: number]: MapIcon},
}

export interface MapIcon {
    id: number;
    src: string;
    name: string;
    fontSize: number;
    x: number;
    y: number;
}

export interface MapRender {
    mesh?: MapMesh;
    h: TerrainHeights,
    rivers?: any[],
    coasts?: any[],
    icons?: {[key: number]: MapIcon},
}

export interface TerrainHeights extends Array<number> {
    downFromDict?: {[key: number]: TerrainPoint | null};

    heightRange?: [number, number];
    seaLevelHeight?: number;
}

export interface MapEventListener {
    call: (kind: EventKind, ...args: any[]) => void;
}

export const COAST_LINE_HEIGHT = 0;