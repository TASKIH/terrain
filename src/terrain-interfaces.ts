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

export interface MapMesh {
    pts: number[];
    vor: VoronoiDiagram<[number, number]> ;
    vxs: [number, number][];
    adj: [number, number][],
    tris: {[key:number]: VoronoiSite<[number, number]>[]},
    edges: number[][],
    extent: MapExtent,
    map: (f: any) => {}
}

export interface MapExportParam {
    extent: MapExtent;
    generator: (npts: number, extent: MapExtent) => any;
    npts: number;
    ncities: number;
    nterrs: number;
    fontsizes: FontSize;
}