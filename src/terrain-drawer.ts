import { MapRender, TerrainHeights, TerrainPoint, MapMesh, TerrainPointContainer, Edge } from "./terrain-interfaces";
import { TerrainCalcUtil } from "./util";
import * as language from './language';
import * as d3 from 'd3';
import { TerrainFeatureGenerator } from "./terrain-feature-generator";
import { TerrainGenerator } from "./terrain-generator";
import { MeshGenerator } from "./mesh-generator";
import { Water, WaterFlow } from "./water-recorder";
import { VoronoiEdge } from "d3";

export class TerrainDrawer {
    static drawLabels(svg: any, render: MapRender) {
        var h = render.h;
        //var cities = render.cities;
        var avoids = [render.rivers, render.coasts];
        var lang = language.makeRandomLanguage();
        var citylabels: any = [];

        function penalty(label: any) {
            var pen = 0;
            if (label.x0 < -0.45 * render.mesh!.extent.width) pen += 100;
            if (label.x1 > 0.45 * render.mesh!.extent.width) pen += 100;
            if (label.y0 < -0.45 * render.mesh!.extent.height) pen += 100;
            if (label.y1 > 0.45 * render.mesh!.extent.height) pen += 100;
            for (var i = 0; i < citylabels.length; i++) {
                var olabel = citylabels[i];
                if (label.x0 < olabel.x1 && label.x1 > olabel.x0 &&
                    label.y0 < olabel.y1 && label.y1 > olabel.y0) {
                    pen += 100;
                }
            }
/*
            for (var i = 0; i < cities!.length; i++) {
                var c = render.mesh!.voronoiPoints[cities![i]];
                if (label.x0 < c.x && label.x1 > c.x && label.y0 < c.y && label.y1 > c.y) {
                    pen += 100;
                }
            }*/
            for (var i = 0; i < avoids.length; i++) {
                var avoid = avoids[i];
                for (var j = 0; j < avoid!.length; j++) {
                    var avpath = avoid![j];
                    for (var k = 0; k < avpath.length; k++) {
                        var pt = avpath[k];
                        if (pt[0] > label.x0 && pt[0] < label.x1 && pt[1] > label.y0 && pt[1] < label.y1) {
                            pen++;
                        }
                    }
                }
            }
            return pen;
        }/*
        for (var i = 0; i < cities!.length; i++) {
            var x = render.mesh!.voronoiPoints[cities![i]].x;
            var y = render.mesh!.voronoiPoints[cities![i]].y;
            var text = language.makeName(lang, 'city');
            var size = i < nterrs ? params.fontsizes.city : params.fontsizes.town;
            var sx = 0.65 * size/1000 * text.length;
            var sy = size/1000;
            var posslabels = [
                {
                    text: '',
                    size: 12,
                    x: x + 0.8 * sy,
                    y: y + 0.3 * sy,
                    align: 'start',
                    x0: x + 0.7 * sy,
                    y0: y - 0.6 * sy,
                    x1: x + 0.7 * sy + sx,
                    y1: y + 0.6 * sy
                },
                {
                    text: '',
                    size: 12,
                    x: x - 0.8 * sy,
                    y: y + 0.3 * sy,
                    align: 'end',
                    x0: x - 0.9 * sy - sx,
                    y0: y - 0.7 * sy,
                    x1: x - 0.9 * sy,
                    y1: y + 0.7 * sy
                },
                {
                    text: '',
                    size: 12,
                    x: x,
                    y: y - 0.8 * sy,
                    align: 'middle',
                    x0: x - sx/2,
                    y0: y - 1.9*sy,
                    x1: x + sx/2,
                    y1: y - 0.7 * sy
                },
                {
                    text: '',
                    size: 12,
                    x: x,
                    y: y + 1.2 * sy,
                    align: 'middle',
                    x0: x - sx/2,
                    y0: y + 0.1*sy,
                    x1: x + sx/2,
                    y1: y + 1.3*sy
                }
            ];
            var label = posslabels[d3.scan(posslabels, function (a: any, b: any) {return penalty(a) - penalty(b);}) || 0];
            label.text = text;
            label.size = size;
            citylabels.push(label);
        }*/
        var texts = svg.selectAll('text.city').data(citylabels);
        texts.enter()
            .append('text')
            .classed('city', true);
        texts.exit()
            .remove();
        svg.selectAll('text.city')
            .attr('x', function (d: any) {return 1000*d.x;})
            .attr('y', function (d: any) {return 1000*d.y;})
            .style('font-size', function (d: any) {return d.size;})
            .style('text-anchor', function (d: any) {return d.align;})
            .text(function (d: any) {return d.text;})
            .raise();
    }
    
    // levelを基準にした等高線の作成
    static generateContour(mesh: MapMesh, h: TerrainHeights, level: number) {
        var edges = [];
        var transactedDataDict: any = {};
        const edgeKeyGenerator = (edge: VoronoiEdge<[number, number]>): string => {
            if (!edge.right) {
                return edge.left.toString();
            }
            return edge.left.toString() + '-' + edge.right.toString();
        }
        for (let i = 0; i < mesh.voronoiPoints.length; i++) { 
            let point = mesh.voronoiPoints[i];

            let connectingSites = mesh.pointDict[point.id].relatedVoronoiSites;
            for (let j = 0; j < connectingSites.length; j++) {
                let site = connectingSites[j];

                const curPointHeight = h[point.id];
                const nextSiteHeight = h[site.terrainPointIndex];

                if ((curPointHeight > level && nextSiteHeight <= level) ||
                    (curPointHeight <= level && nextSiteHeight > level)) {
                        if(!site.edge.right) {
                            continue;
                        }
                        let edgeKey = edgeKeyGenerator(site.edge);

                        if (transactedDataDict[edgeKey]) {
                            continue;
                        }
                        edges.push([site.edge.left, site.edge.right]);
                        transactedDataDict[edgeKey] = site.edge;
                    }
            }
        }
        return TerrainCalcUtil.mergeSegments(edges);
    }

    static visualizePoints(svg: any, pts: TerrainPoint[]) {
        var circle = svg.selectAll('circle').data(pts);
        circle.enter()
            .append('circle');
        circle.exit().remove();
        d3.selectAll('circle')
            .attr('cx', function (d: any) {return 1000*d.x;})
            .attr('cy', function (d: any) {return 1000*d.y;})
            .attr('r', 100 / Math.sqrt(pts.length));
    }
    
    
    static makeD3PathByPointContainer(path: TerrainPointContainer) {
        var p = d3.path();

        let idx = 0;
        path.relatedVoronoiSites.forEach((e, i) => {
            if (i === 0){
                p.moveTo(1000*e[0], 1000*e[1]);
            }
            else {
                p.lineTo(1000*e[0], 1000*e[1]);
            }
        });
        return p.toString();
    }

    static makeD3PathByPath(path: number[][]) {
        var p = d3.path();
        p.moveTo(1000*path[0][0], 1000*path[0][1]);
        for (var i = 1; i < path.length; i++) {
            p.lineTo(1000*path[i][0], 1000*path[i][1]);
        }
        return p.toString();
    }
    
    static genVoronoiInfo(h: TerrainHeights, elem: any) {
        let result =
        'id:' + elem.point.id + '<br>' +
        'x:' + elem.point.x + '<br>' + 
        'y:' + elem.point.y + '<br>' + 
        'height:' + h[elem.point.id] + '<br>';
        for(let i = 0;i < elem.relatedVoronoiSites.length; i++) {
            let next = elem.relatedVoronoiSites[i];

            console.log(next);
            result += 'next ' + next.terrainPointIndex + 'height' + h[next.terrainPointIndex] + '<br>';
        }
        
        return result;
    }
    static visualizeVoronoi(svg: any, mesh: MapMesh, field: TerrainHeights, lo?: number, hi?: number, showDataId?: string, doColorize?: boolean) {
        if (hi == undefined) hi = (d3.max(field) || 0) + 1e-9;
        if (lo == undefined) lo = (d3.min(field) || 0) - 1e-9;

        const pointContainers: TerrainPointContainer[] = [];

        for (var key in  mesh.pointDict) {
            const pointCnt = mesh.pointDict[key];
            pointContainers.push(pointCnt);
        }

        var tris = svg.selectAll('path.field').data(pointContainers);
        tris.enter()
            .append('path')
            .classed('field', true);
    
        tris.exit()
            .remove();
    
        const drawer = svg.selectAll('path.field')
            .attr('d', TerrainDrawer.makeD3PathByPointContainer)
            .on('mousedown', (elem: any) => {
                console.log(elem);
                if (showDataId) {
                    document.getElementById(showDataId)!.innerHTML =
                        '<div>' +
                        TerrainDrawer.genVoronoiInfo(field, elem)+
                        '</div>';
                }
            });
        if (doColorize) {
            drawer.style('fill', function (d: TerrainPointContainer, i: number) {
                return TerrainDrawer.getColor(field[d.point.id]);
            });
        }
    }
    
    static visualizeWaterFlow(svg: any, cls: any, paths?: any) {
        var paths = svg.selectAll('path.' + cls).data(paths);
        paths.enter()
            .append('path')
            .classed(cls, true);
        paths.exit()
            .remove();
        svg.selectAll('path.' + cls)
            .attr('d', TerrainDrawer.makeD3PathByPath);
    }

    static drawPaths(svg: any, cls: any, paths?: any) {
        var paths = svg.selectAll('path.' + cls).data(paths);
        paths.enter()
            .append('path')
            .classed(cls, true);
        paths.exit()
            .remove();
        svg.selectAll('path.' + cls)
            .attr('d', TerrainDrawer.makeD3PathByPath);
    }
    
    static getColor(height: number): string {
        if (height < -0.4) {
            return "#000099"
        }
        else if (height < -0.4) {
            return "#1a1aff"
        }
        else if (height < -0.3) {
            return "#4d4dff"
        }
        else if (height < -0.2) {
            return "#8080ff"
        }
        else if (height < -0.1) {
            return "#b3b3ff"
        }
        else if (height < 0) {
            return "#e6e6ff"
        }
        else if (height < 0.1) {
            return "#f6f6ee"
        }
        else if (height < 0.2) {
            return "#ddddbb"
        }
        else if (height < 0.3) {
            return "#cccc99"
        }
        else if (height < 0.4) {
            return "#bbbb77"
        }
        else {
            return "#666633"
        }
    }
    
    static getWaterColor(water: number): string {
        if (water > 0.8) {
            console.log('here');
            return "#000099"
        }
        else if (water > 0.7) {
            return "#1a1aff"
        }
        else if (water > 0.6) {
            return "#4d4dff"
        }
        else if (water > 0.5) {
            return "#8080ff"
        }
        else if (water > 0.4) {
            return "#b3b3ff"
        }
        else if (water > 0.3) {
            return "#e6e6ff"
        }
        else {
            return "#666633"
        }
    }
    static visualizeSlopes(svg: any, render: MapRender) {
        var h = render.h;
        var strokes = [];
        var r = 0.25 / Math.sqrt(h.length);
        
        for (var i = 0; i < h.length; i++) {
            if (h[i] <= 0 || TerrainCalcUtil.isNextEdge(render.mesh!, i)) continue;
            var nbs = TerrainCalcUtil.getNeighbourIds(render.mesh!, i);
            nbs.push(i);
            var s = 0;
            var s2 = 0;
            for (var j = 0; j < nbs.length; j++) {
                var slopes = TerrainGenerator.trislope(render.mesh!, h, nbs[j]);
                s += slopes[0];
                s2 += slopes[1];
            }
            s /= nbs.length;
            s2 /= nbs.length;
            if (Math.abs(s) < TerrainCalcUtil.runif(0.1, 0.4)) continue;
            var l = r * TerrainCalcUtil.runif(1, 2) * (1 - 0.2 * Math.pow(Math.atan(s), 2)) * Math.exp(s2/100);
            var x = render.mesh!.pointDict[i].point.x;
            var y = render.mesh!.pointDict[i].point.y;
            if (Math.abs(l*s) > 2 * r) {
                var n = Math.floor(Math.abs(l*s/r));
                l /= n;
                if (n > 4) n = 4;
                for (var j = 0; j < n; j++) {
                    var u = TerrainCalcUtil.rnorm() * r;
                    var v = TerrainCalcUtil.rnorm() * r;
                    strokes.push([[x+u-l, y+v+l*s], [x+u+l, y+v-l*s]]);
                }
            } else {
                // console.log('x: '+ x + 'l' + l + 'y' +  y + 's' + s);
                strokes.push([[x-l, y+l*s], [x+l, y-l*s]]);
            }
        }
        var lines = svg.selectAll('line.slope').data(strokes);
        lines.enter()
            .append('line')
            .classed('slope', true);
        lines.exit()
            .remove();
        svg.selectAll('line.slope')
            .attr('x1', function (d: number[][]) {return 1000*d[0][0];})
            .attr('y1', function (d: number[][]) {return 1000*d[0][1];})
            .attr('x2', function (d: number[][]) {return 1000*d[1][0];})
            .attr('y2', function (d: number[][]) {return 1000*d[1][1];});
    }
    
    /*
    static visualizeCities(svg: any, render: MapRender) {
        var cities = render.cities;
    
        var circs = svg.selectAll('circle.city').data(cities);
        circs.enter()
            .append('circle')
            .classed('city', true);
        circs.exit()
            .remove();
        svg.selectAll('circle.city')
            .attr('cx', function (d: number) {return 1000*render.mesh!.voronoiPoints[d].x;})
            .attr('cy', function (d: number) {return 1000*render.mesh!.voronoiPoints[d].y;})
            .attr('r', function (d: number, i: number) {return i >= n ? 4 : 10;})
            .style('fill', 'white')
            .style('stroke-width', 5)
            .style('stroke-linecap', 'round')
            .style('stroke', 'black')
            .raise();
    }
    */
}