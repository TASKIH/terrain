var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./terrain-interfaces", "./util", "./language", "d3", "./terrain-generator"], function (require, exports, terrain_interfaces_1, util_1, language, d3, terrain_generator_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    language = __importStar(language);
    d3 = __importStar(d3);
    class TerrainDrawer {
        static drawLabels(svg, render) {
            var h = render.h;
            var icons = render.icons;
            var avoids = [render.rivers, render.coasts];
            var lang = language.makeRandomLanguage();
            var citylabels = [];
            function penalty(label) {
                var pen = 0;
                if (label.x0 < -0.45 * render.mesh.extent.width)
                    pen += 100;
                if (label.x1 > 0.45 * render.mesh.extent.width)
                    pen += 100;
                if (label.y0 < -0.45 * render.mesh.extent.height)
                    pen += 100;
                if (label.y1 > 0.45 * render.mesh.extent.height)
                    pen += 100;
                for (var i = 0; i < citylabels.length; i++) {
                    var olabel = citylabels[i];
                    if (label.x0 < olabel.x1 && label.x1 > olabel.x0 &&
                        label.y0 < olabel.y1 && label.y1 > olabel.y0) {
                        pen += 100;
                    }
                }
                for (let key in icons) {
                    const ico = icons[key];
                    if (label.x0 < ico.x && label.x1 > ico.x && label.y0 < ico.y && label.y1 > ico.y) {
                        pen += 100;
                    }
                } /*
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
                }*/
                return pen;
            }
            for (var key in icons) {
                const ico = icons[key];
                var x = ico.x;
                var y = ico.y;
                var text = ico.name;
                var size = ico.fontSize || 12;
                var sx = 0.65 * size / 1000 * text.length;
                var sy = size / 1000;
                var posslabels = [
                    {
                        text: '',
                        size: size,
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
                        size: size,
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
                        size: size,
                        x: x,
                        y: y - 0.8 * sy,
                        align: 'middle',
                        x0: x - sx / 2,
                        y0: y - 1.9 * sy,
                        x1: x + sx / 2,
                        y1: y - 0.7 * sy
                    },
                    {
                        text: '',
                        size: size,
                        x: x,
                        y: y + 1.2 * sy,
                        align: 'middle',
                        x0: x - sx / 2,
                        y0: y + 0.1 * sy,
                        x1: x + sx / 2,
                        y1: y + 1.3 * sy
                    }
                ];
                var label = posslabels[d3.scan(posslabels, function (a, b) { return penalty(a) - penalty(b); }) || 0];
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
                .attr('x', function (d) { return d.x; })
                .attr('y', function (d) { return d.y; })
                .attr('color', 'black')
                .attr('font-family', '"Palatino Linotype", "Book Antiqua", Palatino, "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", sans-serif, serif;')
                .attr('stroke', 'white')
                .attr('stroke-width', '5px')
                .attr('stroke-linejoin', 'round')
                .attr('paint-order', 'stroke')
                .style('font-size', function (d) { return d.size; })
                .style('text-anchor', function (d) { return d.align; })
                .text(function (d) { return d.text; })
                .raise();
        }
        // levelを基準にした等高線の作成
        static generateContour(mesh, h, level) {
            var edges = [];
            var transactedDataDict = {};
            const edgeKeyGenerator = (edge) => {
                if (!edge.right) {
                    return edge.left.toString();
                }
                return edge.left.toString() + '-' + edge.right.toString();
            };
            for (let i = 0; i < mesh.voronoiPoints.length; i++) {
                let point = mesh.voronoiPoints[i];
                let connectingSites = mesh.pointDict[point.id].relatedVoronoiSites;
                for (let j = 0; j < connectingSites.length; j++) {
                    let site = connectingSites[j];
                    const curPointHeight = h[point.id];
                    const nextSiteHeight = h[site.terrainPointIndex];
                    if ((curPointHeight > level && nextSiteHeight <= level) ||
                        (curPointHeight <= level && nextSiteHeight > level)) {
                        if (!site.edge.right) {
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
            return util_1.TerrainCalcUtil.mergeSegments(edges);
        }
        static visualizePoints(svg, pts) {
            var circle = svg.selectAll('circle').data(pts);
            circle.enter()
                .append('circle');
            circle.exit().remove();
            d3.selectAll('circle')
                .attr('cx', function (d) { return d.x; })
                .attr('cy', function (d) { return d.y; })
                .attr('r', 100 / Math.sqrt(pts.length));
        }
        static makeD3PathByPointContainer(path) {
            var p = d3.path();
            let idx = 0;
            path.relatedVoronoiSites.forEach((e, i) => {
                if (i === 0) {
                    p.moveTo(e[0], e[1]);
                }
                else {
                    p.lineTo(e[0], e[1]);
                }
            });
            p.closePath();
            return p.toString();
        }
        static makeD3PathByPath(path) {
            var p = d3.path();
            p.moveTo(path[0][0], path[0][1]);
            var i = 1;
            for (i = 1; i < path.length; i++) {
                p.lineTo(path[i][0], path[i][1]);
            }
            return p.toString();
        }
        static genVoronoiInfo(h, elem) {
            let result = 'id:' + elem.point.id + '<br>' +
                'x:' + elem.point.x + '<br>' +
                'y:' + elem.point.y + '<br>' +
                'height:' + h[elem.point.id] + '<br>';
            for (let i = 0; i < elem.relatedVoronoiSites.length; i++) {
                let next = elem.relatedVoronoiSites[i];
                console.log(next);
                result += 'next ' + next.terrainPointIndex + 'height' + h[next.terrainPointIndex] + '<br>';
            }
            return result;
        }
        static visualizeVoronoi(svg, mesh, field, ev, lo, hi, showDataId, doColorize) {
            if (hi == undefined)
                hi = (d3.max(field) || 0) + 1e-9;
            if (lo == undefined)
                lo = (d3.min(field) || 0) - 1e-9;
            const pointContainers = [];
            for (var key in mesh.pointDict) {
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
                .on('mousedown', (elem) => {
                if (showDataId) {
                    document.getElementById(showDataId).innerHTML =
                        '<div>' +
                            TerrainDrawer.genVoronoiInfo(field, elem) +
                            '</div>';
                }
                ev.onMeshClick(elem.point.x, elem.point.y);
            });
            if (doColorize) {
                drawer.style('stroke', function (d, i) {
                    return TerrainDrawer.getColor(field, d);
                });
                drawer.style('fill', function (d, i) {
                    return TerrainDrawer.getColor(field, d);
                });
            }
        }
        static visualizeWaterFlow(svg, cls, paths) {
            var paths = svg.selectAll('path.' + cls).data(paths);
            paths.enter()
                .append('path')
                .classed(cls, true);
            paths.exit()
                .remove();
            svg.selectAll('path.' + cls)
                .attr('d', TerrainDrawer.makeD3PathByPath);
        }
        static drawPaths(svg, cls, paths) {
            var paths = svg.selectAll('path.' + cls).data(paths);
            paths.enter()
                .append('path')
                .classed(cls, true);
            paths.exit()
                .remove();
            svg.selectAll('path.' + cls)
                .attr('d', TerrainDrawer.makeD3PathByPath)
                .attr('stroke', 'black')
                .attr('stroke-linecap', 'round');
            if (cls === 'coast') {
                svg.selectAll('path.' + cls)
                    .attr('fill', 'none')
                    .attr('stroke-width', '2px');
            }
            else if (cls === 'river') {
                svg.selectAll('path.' + cls)
                    .attr('stroke', '#000099')
                    .attr('stroke-width', '2px');
            }
            else if (cls === 'coast') {
                svg.selectAll('path.' + cls)
                    .attr('stroke-width', '2px');
            }
        }
        static getColor(h, point) {
            const height = h[point.point.id];
            if (height < 0) {
                return "#000099";
            }
            else if (height < 0.1) {
                if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark1) {
                    return "#EBF0E2";
                }
                else if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark2) {
                    return "#E4ECD8";
                }
                else {
                    return "#F1F5EB";
                }
            }
            else if (height < 0.2) {
                return "#BDD09F";
            }
            else if (height < 0.3) {
                if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark1) {
                    return "#B99C6B";
                }
                else if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark2) {
                    return "#947C55";
                }
                else {
                    return "#C7AF88";
                }
            }
            else if (height < 0.6) {
                if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark1) {
                    return "#493829";
                }
                else if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark2) {
                    return "#2B2118";
                }
                else {
                    return "#5B4B3E";
                }
            }
            else {
                if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark1) {
                    return "#A3ADB8";
                }
                else if (point.shadow === terrain_interfaces_1.ShadowLevel.Dark2) {
                    return "#727980";
                }
                else {
                    return "#C7CDD4";
                }
            }
        }
        static getWaterColor(water) {
            if (water > 0.8) {
                console.log('here');
                return "#000099";
            }
            else if (water > 0.7) {
                return "#1a1aff";
            }
            else if (water > 0.6) {
                return "#4d4dff";
            }
            else if (water > 0.5) {
                return "#8080ff";
            }
            else if (water > 0.4) {
                return "#b3b3ff";
            }
            else if (water > 0.3) {
                return "#e6e6ff";
            }
            else {
                return "#666633";
            }
        }
        static visualizeSlopes(svg, render) {
            var h = render.h;
            var strokes = [];
            const magnificationRate = (render.mesh.extent.height + render.mesh.extent.width) / 2;
            var r = 0.25 / Math.sqrt(h.length);
            for (var i = 0; i < h.length; i++) {
                if (h[i] <= 0 || util_1.TerrainCalcUtil.isNextEdge(render.mesh, i)) {
                    continue;
                }
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(render.mesh, i);
                nbs.push(i);
                var s = 0;
                var s2 = 0;
                for (var j = 0; j < nbs.length; j++) {
                    var slopes = terrain_generator_1.TerrainGenerator.trislope(render.mesh, h, nbs[j]);
                    s += slopes[0];
                    s2 += slopes[1];
                }
                s /= nbs.length;
                s2 /= nbs.length;
                if (Math.abs(s * 2 * magnificationRate) < util_1.TerrainCalcUtil.runif(0.1, 0.4)) {
                    continue;
                }
                var l = r * util_1.TerrainCalcUtil.runif(1, 2) * (1 - 0.2 * Math.pow(Math.atan(s), 2)) * Math.exp(s2 / 100) * magnificationRate / 2;
                var x = render.mesh.pointDict[i].point.x;
                var y = render.mesh.pointDict[i].point.y;
                if (Math.abs(l * s) > 2 * r) {
                    var n = Math.floor(Math.abs(l * s / r));
                    l /= n;
                    if (n > 4)
                        n = 4;
                    for (var j = 0; j < n; j++) {
                        var u = util_1.TerrainCalcUtil.rnorm() * r * 4 * magnificationRate / 4;
                        var v = util_1.TerrainCalcUtil.rnorm() * r * 4 * magnificationRate / 4;
                        strokes.push([[x + u - l, y + v + l * s * magnificationRate / 2], [x + u + l, y + v - l * s * magnificationRate / 2]]);
                    }
                }
                else {
                    // console.log('x: '+ x + 'l' + l + 'y' +  y + 's' + s);
                    strokes.push([[x - l, y + l * s * magnificationRate / 2], [x + l, y - l * s * magnificationRate / 2]]);
                }
            }
            var lines = svg.selectAll('line.slope').data(strokes);
            lines.enter()
                .append('line')
                .classed('slope', true);
            lines.exit()
                .remove();
            svg.selectAll('line.slope')
                .attr('x1', function (d) { return d[0][0]; })
                .attr('y1', function (d) { return d[0][1]; })
                .attr('x2', function (d) { return d[1][0]; })
                .attr('y2', function (d) { return d[1][1]; });
        }
        static visualizeIcons(svg, render, eh) {
            const icons = render.icons;
            if (!icons) {
                return;
            }
            let dataList = [];
            for (let key in icons) {
                dataList.push(icons[key]);
            }
            const svgData = svg.selectAll('image.icon').data(dataList);
            svgData.enter()
                .append('image')
                .classed('icon', true);
            svgData.exit()
                .remove();
            svg.selectAll('image.icon')
                .attr('x', function (d) { return d.x; })
                .attr('y', function (d) { return d.y; })
                .attr('width', function (d) { return 32; })
                .attr('height', function (d) { return 32; })
                .attr('xlink:href', function (d) { return d.src; })
                .attr('id', function (d) { return util_1.TerrainUtil.getIconId(d.id); })
                .on('mousedown', (elem) => {
                eh.onClickSymbolOnMap(elem, d3.event);
            })
                .raise();
        }
    }
    exports.TerrainDrawer = TerrainDrawer;
});
