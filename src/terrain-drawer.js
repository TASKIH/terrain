var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./util", "./language", "d3", "./terrain-feature-generator", "./terrain-generator"], function (require, exports, util_1, language, d3, terrain_feature_generator_1, terrain_generator_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    language = __importStar(language);
    d3 = __importStar(d3);
    var TerrainDrawer = /** @class */ (function () {
        function TerrainDrawer() {
        }
        TerrainDrawer.drawLabels = function (svg, render) {
            var params = render.params;
            var h = render.h;
            var terr = render.terr;
            var cities = render.cities;
            var nterrs = render.params.nterrs;
            var avoids = [render.rivers, render.coasts, render.borders];
            var lang = language.makeRandomLanguage();
            var citylabels = [];
            function penalty(label) {
                var pen = 0;
                if (label.x0 < -0.45 * h.mesh.extent.width)
                    pen += 100;
                if (label.x1 > 0.45 * h.mesh.extent.width)
                    pen += 100;
                if (label.y0 < -0.45 * h.mesh.extent.height)
                    pen += 100;
                if (label.y1 > 0.45 * h.mesh.extent.height)
                    pen += 100;
                for (var i = 0; i < citylabels.length; i++) {
                    var olabel = citylabels[i];
                    if (label.x0 < olabel.x1 && label.x1 > olabel.x0 &&
                        label.y0 < olabel.y1 && label.y1 > olabel.y0) {
                        pen += 100;
                    }
                }
                for (var i = 0; i < cities.length; i++) {
                    var c = h.mesh.voronoiPoints[cities[i]];
                    if (label.x0 < c[0] && label.x1 > c[0] && label.y0 < c[1] && label.y1 > c[1]) {
                        pen += 100;
                    }
                }
                for (var i = 0; i < avoids.length; i++) {
                    var avoid = avoids[i];
                    for (var j = 0; j < avoid.length; j++) {
                        var avpath = avoid[j];
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
            for (var i = 0; i < cities.length; i++) {
                var x = h.mesh.voronoiPoints[cities[i]].x;
                var y = h.mesh.voronoiPoints[cities[i]].y;
                var text = language.makeName(lang, 'city');
                var size = i < nterrs ? params.fontsizes.city : params.fontsizes.town;
                var sx = 0.65 * size / 1000 * text.length;
                var sy = size / 1000;
                var posslabels = [
                    {
                        x: x + 0.8 * sy,
                        y: y + 0.3 * sy,
                        align: 'start',
                        x0: x + 0.7 * sy,
                        y0: y - 0.6 * sy,
                        x1: x + 0.7 * sy + sx,
                        y1: y + 0.6 * sy
                    },
                    {
                        x: x - 0.8 * sy,
                        y: y + 0.3 * sy,
                        align: 'end',
                        x0: x - 0.9 * sy - sx,
                        y0: y - 0.7 * sy,
                        x1: x - 0.9 * sy,
                        y1: y + 0.7 * sy
                    },
                    {
                        x: x,
                        y: y - 0.8 * sy,
                        align: 'middle',
                        x0: x - sx / 2,
                        y0: y - 1.9 * sy,
                        x1: x + sx / 2,
                        y1: y - 0.7 * sy
                    },
                    {
                        x: x,
                        y: y + 1.2 * sy,
                        align: 'middle',
                        x0: x - sx / 2,
                        y0: y + 0.1 * sy,
                        x1: x + sx / 2,
                        y1: y + 1.3 * sy
                    }
                ];
                // @ts-ignore
                var label = posslabels[d3.scan(posslabels, function (a, b) { return penalty(a) - penalty(b); })];
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
                .attr('x', function (d) { return 1000 * d.x; })
                .attr('y', function (d) { return 1000 * d.y; })
                .style('font-size', function (d) { return d.size; })
                .style('text-anchor', function (d) { return d.align; })
                .text(function (d) { return d.text; })
                .raise();
            var reglabels = [];
            for (var i = 0; i < nterrs; i++) {
                var city = cities[i];
                var text = language.makeName(lang, 'region');
                var sy = params.fontsizes.region / 1000;
                var sx = 0.6 * text.length * sy;
                var lc = util_1.TerrainCalcUtil.terrCenter(h, terr, city, true);
                var oc = util_1.TerrainCalcUtil.terrCenter(h, terr, city, false);
                var best = 0;
                var bestscore = -999999;
                for (var j = 0; j < h.length; j++) {
                    var score = 0;
                    var v = h.mesh.voronoiPoints[j];
                    score -= 3000 * Math.sqrt((v.x - lc[0]) * (v.x - lc[0]) + (v.y - lc[1]) * (v.y - lc[1]));
                    score -= 1000 * Math.sqrt((v.x - oc[0]) * (v.x - oc[0]) + (v.y - oc[1]) * (v.y - oc[1]));
                    if (terr[j] != city)
                        score -= 3000;
                    for (var k = 0; k < cities.length; k++) {
                        var u = h.mesh.voronoiPoints[cities[k]];
                        if (Math.abs(v.x - u.x) < sx &&
                            Math.abs(v.y - sy / 2 - u.y) < sy) {
                            score -= k < nterrs ? 4000 : 500;
                        }
                        if (v.x - sx / 2 < citylabels[k].x1 &&
                            v.x + sx / 2 > citylabels[k].x0 &&
                            v.y - sy < citylabels[k].y1 &&
                            v.y > citylabels[k].y0) {
                            score -= 5000;
                        }
                    }
                    for (var k = 0; k < reglabels.length; k++) {
                        var label = reglabels[k];
                        if (v.x - sx / 2 < label.x + label.width / 2 &&
                            v.x + sx / 2 > label.x - label.width / 2 &&
                            v.y - sy < label.y &&
                            v.y > label.y - label.size) {
                            score -= 20000;
                        }
                    }
                    if (h[j] <= 0)
                        score -= 500;
                    if (v.x + sx / 2 > 0.5 * h.mesh.extent.width)
                        score -= 50000;
                    if (v.x - sx / 2 < -0.5 * h.mesh.extent.width)
                        score -= 50000;
                    if (v.y > 0.5 * h.mesh.extent.height)
                        score -= 50000;
                    if (v.y - sy < -0.5 * h.mesh.extent.height)
                        score -= 50000;
                    if (score > bestscore) {
                        bestscore = score;
                        best = j;
                    }
                }
                reglabels.push({
                    text: text,
                    x: h.mesh.voronoiPoints[best].x,
                    y: h.mesh.voronoiPoints[best].y,
                    size: sy,
                    width: sx
                });
            }
            texts = svg.selectAll('text.region').data(reglabels);
            texts.enter()
                .append('text')
                .classed('region', true);
            texts.exit()
                .remove();
            svg.selectAll('text.region')
                .attr('x', function (d) { return 1000 * d.x; })
                .attr('y', function (d) { return 1000 * d.y; })
                .style('font-size', function (d) { return 1000 * d.size; })
                .style('text-anchor', 'middle')
                .text(function (d) { return d.text; })
                .raise();
        };
        // 等高線の作成
        TerrainDrawer.contour = function (h, level) {
            level = h.seaLevelHeight || 0;
            var edges = [];
            for (var i = 0; i < h.mesh.edges.length; i++) {
                var edge = h.mesh.edges[i];
                if (edge.right == undefined)
                    continue;
                if (util_1.TerrainCalcUtil.isNearEdge(h.mesh, edge.index1) || util_1.TerrainCalcUtil.isNearEdge(h.mesh, edge.index2))
                    continue;
                if ((h[edge.index1] > level && h[edge.index2] <= level) ||
                    (h[edge.index2] > level && h[edge.index1] <= level)) {
                    edges.push([edge.left, edge.right]);
                }
            }
            return util_1.TerrainCalcUtil.mergeSegments(edges);
        };
        TerrainDrawer.drawMap = function (svg, render) {
            render.rivers = terrain_feature_generator_1.TerrainFeatureGenerator.getRivers(render.h, 0.01);
            render.coasts = TerrainDrawer.contour(render.h, 0);
            render.terr = terrain_feature_generator_1.TerrainFeatureGenerator.getTerritories(render);
            render.borders = terrain_feature_generator_1.TerrainFeatureGenerator.getBorders(render);
            TerrainDrawer.drawPaths(svg, 'river', render.rivers);
            TerrainDrawer.drawPaths(svg, 'coast', render.coasts);
            TerrainDrawer.drawPaths(svg, 'border', render.borders);
            TerrainDrawer.visualizeSlopes(svg, render);
            TerrainDrawer.visualizeCities(svg, render);
            TerrainDrawer.drawLabels(svg, render);
        };
        TerrainDrawer.doMap = function (svg, params) {
            var width = svg.attr('width');
            svg.attr('height', width * params.extent.height / params.extent.width);
            svg.attr('viewBox', -1000 * params.extent.width / 2 + ' ' +
                -1000 * params.extent.height / 2 + ' ' +
                1000 * params.extent.width + ' ' +
                1000 * params.extent.height);
            svg.selectAll().remove();
            var render = {
                params: params,
                h: params.generator(params.npts, params.extent)
            };
            terrain_feature_generator_1.TerrainFeatureGenerator.placeCities(render);
            TerrainDrawer.drawMap(svg, render);
        };
        TerrainDrawer.visualizePoints = function (svg, pts) {
            var circle = svg.selectAll('circle').data(pts);
            circle.enter()
                .append('circle');
            circle.exit().remove();
            d3.selectAll('circle')
                .attr('cx', function (d) { return 1000 * d.x; })
                .attr('cy', function (d) { return 1000 * d.y; })
                .attr('r', 100 / Math.sqrt(pts.length));
        };
        TerrainDrawer.makeD3Path = function (path) {
            var p = d3.path();
            p.moveTo(1000 * path[0][0], 1000 * path[0][1]);
            for (var i = 1; i < path.length; i++) {
                p.lineTo(1000 * path[i][0], 1000 * path[i][1]);
            }
            return p.toString();
        };
        TerrainDrawer.visualizeVoronoi = function (svg, field, lo, hi) {
            if (hi == undefined)
                hi = (d3.max(field) || 0) + 1e-9;
            if (lo == undefined)
                lo = (d3.min(field) || 0) - 1e-9;
            // @ts-ignore
            var tris = svg.selectAll('path.field').data(field.mesh.pointConnections);
            tris.enter()
                .append('path')
                .classed('field', true);
            tris.exit()
                .remove();
            svg.selectAll('path.field')
                .attr('d', TerrainDrawer.makeD3Path)
                .style('fill', function (d, i) {
                return TerrainDrawer.getColor(field[i]);
            });
        };
        TerrainDrawer.visualizeDownhill = function (h) {
            var links = terrain_feature_generator_1.TerrainFeatureGenerator.getRivers(h, 0.01);
            TerrainDrawer.drawPaths('river', links);
        };
        TerrainDrawer.drawPaths = function (svg, cls, paths) {
            var paths = svg.selectAll('path.' + cls).data(paths);
            paths.enter()
                .append('path')
                .classed(cls, true);
            paths.exit()
                .remove();
            svg.selectAll('path.' + cls)
                .attr('d', TerrainDrawer.makeD3Path);
        };
        TerrainDrawer.getColor = function (height) {
            if (height < -0.4) {
                return "#000099";
            }
            else if (height < -0.4) {
                return "#1a1aff";
            }
            else if (height < -0.3) {
                return "#4d4dff";
            }
            else if (height < -0.2) {
                return "#8080ff";
            }
            else if (height < -0.1) {
                return "#b3b3ff";
            }
            else if (height < 0) {
                return "#e6e6ff";
            }
            else if (height < 0.1) {
                return "#f6f6ee";
            }
            else if (height < 0.2) {
                return "#ddddbb";
            }
            else if (height < 0.3) {
                return "#cccc99";
            }
            else if (height < 0.4) {
                return "#bbbb77";
            }
            else {
                return "#666633";
            }
        };
        TerrainDrawer.visualizeSlopes = function (svg, render) {
            var h = render.h;
            var strokes = [];
            var r = 0.25 / Math.sqrt(h.length);
            for (var i = 0; i < h.length; i++) {
                if (h[i] <= 0 || util_1.TerrainCalcUtil.isNearEdge(h.mesh, i))
                    continue;
                var nbs = util_1.TerrainCalcUtil.getNeighbourIds(h.mesh, i);
                nbs.push(i);
                var s = 0;
                var s2 = 0;
                for (var j = 0; j < nbs.length; j++) {
                    var slopes = terrain_generator_1.TerrainGenerator.trislope(h, nbs[j]);
                    s += slopes[0] / 10;
                    s2 += slopes[1];
                }
                s /= nbs.length;
                s2 /= nbs.length;
                if (Math.abs(s) < util_1.TerrainCalcUtil.runif(0.1, 0.4))
                    continue;
                var l = r * util_1.TerrainCalcUtil.runif(1, 2) * (1 - 0.2 * Math.pow(Math.atan(s), 2)) * Math.exp(s2 / 100);
                var x = h.mesh.voronoiPoints[i].x;
                var y = h.mesh.voronoiPoints[i].y;
                if (Math.abs(l * s) > 2 * r) {
                    var n = Math.floor(Math.abs(l * s / r));
                    l /= n;
                    if (n > 4)
                        n = 4;
                    for (var j = 0; j < n; j++) {
                        var u = util_1.TerrainCalcUtil.rnorm() * r;
                        var v = util_1.TerrainCalcUtil.rnorm() * r;
                        strokes.push([[x + u - l, y + v + l * s], [x + u + l, y + v - l * s]]);
                    }
                }
                else {
                    strokes.push([[x - l, y + l * s], [x + l, y - l * s]]);
                }
            }
            var lines = svg.selectAll('line.slope').data(strokes);
            lines.enter()
                .append('line')
                .classed('slope', true);
            lines.exit()
                .remove();
            svg.selectAll('line.slope')
                .attr('x1', function (d) { return 1000 * d[0][0]; })
                .attr('y1', function (d) { return 1000 * d[0][1]; })
                .attr('x2', function (d) { return 1000 * d[1][0]; })
                .attr('y2', function (d) { return 1000 * d[1][1]; });
        };
        TerrainDrawer.visualizeCities = function (svg, render) {
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
                .attr('cx', function (d) { return 1000 * h.mesh.voronoiPoints[d].x; })
                .attr('cy', function (d) { return 1000 * h.mesh.voronoiPoints[d].y; })
                .attr('r', function (d, i) { return i >= n ? 4 : 10; })
                .style('fill', 'white')
                .style('stroke-width', 5)
                .style('stroke-linecap', 'round')
                .style('stroke', 'black')
                .raise();
        };
        return TerrainDrawer;
    }());
    exports.TerrainDrawer = TerrainDrawer;
});
