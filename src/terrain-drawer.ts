import { MapRender, MapExportParam, TerrainHeights, TerrainPoint, MapMesh, TerrainPointContainer } from "./terrain-interfaces";
import { TerrainCalcUtil } from "./util";
import * as language from './language';
import * as d3 from 'd3';
import { TerrainFeatureGenerator } from "./terrain-feature-generator";
import { TerrainGenerator } from "./terrain-generator";
import { VoronoiSite } from "d3";
import { MeshGenerator } from "./mesh-generator";
import { Water } from "./water-recorder";

export class TerrainDrawer {
    static drawLabels(svg: any, render: MapRender) {
        var params = render.params;
        var h = render.h;
        var terr = render.terr;
        var cities = render.cities;
        var nterrs = render.params.nterrs;
        var avoids = [render.rivers, render.coasts, render.borders];
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

            for (var i = 0; i < cities!.length; i++) {
                var c = render.mesh!.voronoiPoints[cities![i]];
                if (label.x0 < c.x && label.x1 > c.x && label.y0 < c.y && label.y1 > c.y) {
                    pen += 100;
                }
            }
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
        }
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
        }
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

        var reglabels = [];
        for (var i = 0; i < nterrs; i++) {
            var city = cities![i];
            var text = language.makeName(lang, 'region');
            var sy = params.fontsizes.region / 1000;
            var sx = 0.6 * text.length * sy;
            var lc = TerrainCalcUtil.terrCenter(h, terr, city, true);
            var oc = TerrainCalcUtil.terrCenter(h, terr, city, false);
            var best = 0;
            var bestscore = -999999;
            for (var j = 0; j < h.length; j++) {
                var score = 0;
                var v = render.mesh!.voronoiPoints[j];
                score -= 3000 * Math.sqrt((v.x - lc[0]) * (v.x - lc[0]) + (v.y - lc[1]) * (v.y - lc[1]));
                score -= 1000 * Math.sqrt((v.x - oc[0]) * (v.x - oc[0]) + (v.y - oc[1]) * (v.y - oc[1]));
                if (terr![j] != city) score -= 3000;
                for (var k = 0; k < cities!.length; k++) {
                    var u = render.mesh!.voronoiPoints[cities![k]];
                    if (Math.abs(v.x - u.x) < sx &&
                        Math.abs(v.y - sy/2 - u.y) < sy) {
                        score -= k < nterrs ? 4000 : 500;
                    }
                    if (v.x - sx/2 < citylabels[k].x1 &&
                        v.x + sx/2 > citylabels[k].x0 &&
                        v.y - sy < citylabels[k].y1 &&
                        v.y > citylabels[k].y0) {
                        score -= 5000;
                    }
                }
                for (var k = 0; k < reglabels.length; k++) {
                    // @ts-ignore
                    var label = reglabels[k];
                    // @ts-ignore
                    if (v.x - sx/2 < label.x + label.width/2 &&
                        // @ts-ignore
                        v.x + sx/2 > label.x - label.width/2 &&
                        v.y - sy < label.y &&
                        v.y > label.y - label.size) {
                        score -= 20000;
                    }
                }
                if (h[j] <= 0) score -= 500;
                if (v.x + sx/2 > 0.5 * render.mesh!.extent.width) score -= 50000;
                if (v.x - sx/2 < -0.5 * render.mesh!.extent.width) score -= 50000;
                if (v.y > 0.5 * render.mesh!.extent.height) score -= 50000;
                if (v.y - sy < -0.5 * render.mesh!.extent.height) score -= 50000;
                if (score > bestscore) {
                    bestscore = score;
                    best = j;
                }
            }
            reglabels.push({
                text: text,
                x: render.mesh!.voronoiPoints[best].x,
                y: render.mesh!.voronoiPoints[best].y,
                size:sy,
                width:sx
            });
        }
        texts = svg.selectAll('text.region').data(reglabels);
        texts.enter()
            .append('text')
            .classed('region', true);
        texts.exit()
            .remove();
        svg.selectAll('text.region')
            .attr('x', function (d: any) {return 1000*d.x;})
            .attr('y', function (d: any) {return 1000*d.y;})
            .style('font-size', function (d: any) {return 1000*d.size;})
            .style('text-anchor', 'middle')
            .text(function (d: any) {return d.text;})
            .raise();

    }
    
    // 等高線の作成
    static contour(mesh: MapMesh, h: TerrainHeights, level: number) {
        level = h.seaLevelHeight || 0;
        var edges = [];
        for (var i = 0; i < mesh.edges.length; i++) {
            var edge = mesh.edges[i];
            if (edge.right == undefined) continue;
    
            if (TerrainCalcUtil.isNextEdge(mesh, edge.index1) || TerrainCalcUtil.isNextEdge(mesh, edge.index2))
                continue;
    
            if ((h[edge.index1] > level && h[edge.index2] <= level) ||
                (h[edge.index2] > level && h[edge.index1] <= level)) {
                edges.push([edge.left, edge.right]);
            }
        }
        return TerrainCalcUtil.mergeSegments(edges);
    }
    
    static drawMap(svg: any, render: MapRender) {
        render.rivers = TerrainFeatureGenerator.getRivers(render.mesh!, render.h, 0.01);
        render.coasts = TerrainDrawer.contour(render.mesh!, render.h, 0);
        render.terr = TerrainFeatureGenerator.getTerritories(render);
        render.borders = TerrainFeatureGenerator.getBorders(render);
        TerrainDrawer.drawPaths(svg, 'river', render.rivers);
        TerrainDrawer.drawPaths(svg, 'coast', render.coasts);
        TerrainDrawer.drawPaths(svg, 'border', render.borders);
        TerrainDrawer.visualizeSlopes(svg, render);
        TerrainDrawer.visualizeCities(svg, render);
        TerrainDrawer.drawLabels(svg, render);
    }

    static doMap(svg: any, params: MapExportParam) {
        var width = svg.attr('width');
        svg.attr('height', width * params.extent.height / params.extent.width);
        svg.attr('viewBox', -1000 * params.extent.width/2 + ' ' +
            -1000 * params.extent.height/2 + ' ' +
            1000 * params.extent.width + ' ' +
            1000 * params.extent.height);
        svg.selectAll().remove();
        var mesh = MeshGenerator.generateGoodMesh(params.npts, params.extent);
        var render: MapRender = {
            params: params,
            h:  params.generator(mesh, params.extent)
        };

        TerrainFeatureGenerator.placeCities(render);
        TerrainDrawer.drawMap(svg, render);
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
    
    
    static makeD3Path(path: TerrainPointContainer) {
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

    static visualizeVoronoi(svg: any, mesh: MapMesh, field: TerrainHeights, lo?: number, hi?: number) {
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
    
        svg.selectAll('path.field')
            .attr('d', TerrainDrawer.makeD3Path)
            .style('fill', function (d: TerrainPointContainer, i: number) {
                return TerrainDrawer.getColor(field[d.point.id]);
            });
    }
    
    static visualizeWater(svg: any, mesh: MapMesh, waters: {[key: number]: Water} ) {
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
    
        console.log(waters);
        svg.selectAll('path.field')
            .attr('d', TerrainDrawer.makeD3Path)
            .style('fill', function (d: TerrainPointContainer, i: number) {
                return TerrainDrawer.getWaterColor(waters[d.point.id].amount);
            });
    }
    

    static visualizeDownhill(mesh: MapMesh, h: TerrainHeights) {
        var links = TerrainFeatureGenerator.getRivers(mesh, h, 0.01);
        TerrainDrawer.drawPaths('river', links);
    }
    
    static drawPaths(svg: any, cls: any, paths?: any) {
        var paths = svg.selectAll('path.' + cls).data(paths);
        paths.enter()
            .append('path')
            .classed(cls, true);
        paths.exit()
            .remove();
        svg.selectAll('path.' + cls)
            .attr('d', TerrainDrawer.makeD3Path);
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
                s += slopes[0] / 10;
                s2 += slopes[1];
            }
            s /= nbs.length;
            s2 /= nbs.length;
            if (Math.abs(s) < TerrainCalcUtil.runif(0.1, 0.4)) continue;
            var l = r * TerrainCalcUtil.runif(1, 2) * (1 - 0.2 * Math.pow(Math.atan(s), 2)) * Math.exp(s2/100);
            var x = render.mesh!.voronoiPoints[i].x;
            var y = render.mesh!.voronoiPoints[i].y;
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
    
    
    static visualizeCities(svg: any, render: MapRender) {
        var cities = render.cities;
        var h = render.h;
        var n = render.params.nterrs;
    
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
    
}