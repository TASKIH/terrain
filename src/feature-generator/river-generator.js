define(["require", "exports", "../terrain-interfaces", "../util"], function (require, exports, terrain_interfaces_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class RiverGenerator {
        static generateTerminalPoints(mesh, h, count) {
            const results = [];
            let curCount = 0;
            const executedPointIds = new Set();
            while (curCount <= count) {
                // 全体の1/4を消化したのに完成していない = 順当な開始位置がないとしてClose
                if (executedPointIds.size * 4 >= mesh.voronoiPoints.length) {
                    break;
                }
                const randIdx = Math.floor(util_1.TerrainCalcUtil.runif(0, mesh.voronoiPoints.length - 1));
                if (h[randIdx] <= 0 || executedPointIds.has(randIdx)) {
                    continue;
                }
                executedPointIds.add(randIdx);
                curCount++;
                results.push(mesh.pointDict[randIdx].point);
            }
            return results;
        }
        static generateOneRiver(mesh, h, startPoint) {
            const newRiver = {
                root: startPoint,
                route: [startPoint],
            };
            let currentPoint = startPoint;
            newRiver.route.push(startPoint);
            while (true) {
                if (h[currentPoint.id] <= 0) {
                    newRiver.dest = currentPoint;
                    break;
                }
                let minHeightPoint = currentPoint;
                mesh.pointDict[currentPoint.id].connectingPoints.forEach(e => {
                    if (h[e.id] < h[minHeightPoint.id]) {
                        minHeightPoint = e;
                    }
                });
                if (minHeightPoint.id === currentPoint.id) {
                    newRiver.dest = currentPoint;
                    break;
                }
                else {
                    newRiver.route.push(minHeightPoint);
                    currentPoint = minHeightPoint;
                }
            }
            return newRiver;
        }
        static generateRivers(mesh, h, riverCount, minRiverLength) {
            const terminalPoints = RiverGenerator.generateTerminalPoints(mesh, h, riverCount);
            const rivers = [];
            terminalPoints.forEach(e => {
                const river = RiverGenerator.generateOneRiver(mesh, h, e);
                if (river.route.length < minRiverLength) {
                    return;
                }
                // 海や湖に到達しているものだけを川として認める
                if (h[river.dest.id] <= terrain_interfaces_1.COAST_LINE_HEIGHT || h[river.root.id] <= terrain_interfaces_1.COAST_LINE_HEIGHT) {
                    rivers.push(river);
                }
            });
            return rivers;
        }
    }
    exports.RiverGenerator = RiverGenerator;
});
