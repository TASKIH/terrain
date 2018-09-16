define(["require", "exports", "./water-recorder", "./terrain-interfaces", "./terrain-generator"], function (require, exports, water_recorder_1, terrain_interfaces_1, terrain_generator_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class WaterErosionExecutor {
        static resetWaterFlow(mesh) {
            const waters = {};
            mesh.voronoiPoints.forEach(e => {
                waters[e.id] = {
                    amount: 0,
                    deadEnd: false,
                    isRevived: false
                };
            });
            return waters;
        }
        static mergeWaterFlow(mesh, ...args) {
            const returnWater = WaterErosionExecutor.resetWaterFlow(mesh);
            args.forEach(arg => {
                for (const key in arg) {
                    returnWater[key].deadEnd = returnWater[key].deadEnd || arg[key].deadEnd;
                    returnWater[key].amount += arg[key].amount;
                }
            });
            return returnWater;
        }
        static drain(mesh, h, terrainPoint, currentWater, flowableAmount, recorder) {
            let restWater = currentWater[terrainPoint.id];
            if (!restWater || restWater.amount <= 0) {
                return currentWater;
            }
            // 低い順に並び変える
            let connectingPoints = mesh.pointDict[terrainPoint.id].connectingPoints.sort((a, b) => {
                return h[a.id] - h[b.id];
            });
            const myHeight = h[terrainPoint.id];
            let hasPassed = false;
            connectingPoints.forEach(cp => {
                const nextHeight = h[cp.id];
                // 隣の方が高い場合は何もしない
                if (nextHeight >= myHeight) {
                    return;
                }
                // 逆方向の水のやりとりがあったところは渡し直さない。
                if (recorder.hasOppositeFlowRecord(terrainPoint, cp)) {
                    return;
                }
                // 最大flowableAmountの水を低い土地に流せる
                const flow = Math.min(flowableAmount, restWater.amount);
                restWater.amount -= flow;
                if (!currentWater[cp.id]) {
                    currentWater[cp.id] = {
                        amount: 0,
                        deadEnd: false,
                        isRevived: true,
                    };
                }
                currentWater[cp.id].amount += flow;
                recorder.addWaterFlow(terrainPoint, cp, flow);
                hasPassed = true;
            });
            if (!hasPassed) {
                restWater.deadEnd = true;
            }
            return currentWater;
        }
        static calcWaterFlow(mesh, h, rainfall, flowableAmount) {
            let waters = {};
            // 高い順に並び変える
            let heightOrderedVoronois = mesh.voronoiPoints.sort((a, b) => {
                return h[b.id] - h[a.id];
            }).map(e => e);
            const getResult = (h, waters) => {
                let hasDeadend = false;
                for (let wk in waters) {
                    const water = waters[wk];
                    // 水がないところはスルーしてOK
                    if (water.amount <= 0) {
                        continue;
                    }
                    // 海の場合はスルーしてOK
                    if (h[wk] < 0) {
                        continue;
                    }
                    // 行き止まりに行き着いていたらスルーしてOK
                    if (water.deadEnd) {
                        hasDeadend = true;
                        continue;
                    }
                    // それ以外は継続
                    return {
                        isFinished: false,
                    };
                }
                return {
                    isFinished: true,
                    hasDeadend: hasDeadend,
                };
            };
            // 初期降水を設定
            heightOrderedVoronois.forEach(e => {
                waters[e.id] = {
                    amount: rainfall,
                    deadEnd: false,
                    isRevived: false,
                };
            });
            const record = new water_recorder_1.WaterRecorder();
            let i = 0;
            let result = {
                hasDeadend: undefined,
                isFinished: false,
            };
            let finishedWaters = {};
            let targetVoronois = heightOrderedVoronois.filter(e => !!waters[e.id]);
            do {
                targetVoronois.forEach(e => {
                    this.drain(mesh, h, e, waters, flowableAmount, record);
                });
                result = getResult(h, waters);
                const removableKeys = [];
                /**
                 * 計算コスト削減のため、終わったものは計算から除外する
                 */
                let doRefiltering = false;
                for (let key in waters) {
                    let water = waters[key];
                    if (water.amount === 0 || result.isFinished) {
                        finishedWaters[key] = water;
                        removableKeys.push(parseInt(key));
                        doRefiltering = true;
                    }
                    if (water.isRevived) {
                        targetVoronois;
                        water.isRevived = false;
                        doRefiltering = true;
                    }
                }
                for (let rv = 0; rv < removableKeys.length; rv++) {
                    delete waters[removableKeys[rv]];
                }
                if (doRefiltering) {
                    targetVoronois = heightOrderedVoronois.filter(e => !!waters[e.id]);
                }
                i++;
            } while (!result.isFinished && i <= 100);
            return { waters: finishedWaters, records: record, result: result };
        }
        /**
         * 水による浸食を行う
         * @param mesh: MapのMesh
         * @param h: 地盤の高さ
         * @param waters: 水の量
         * @param recorder
         * @param erodeRate
         */
        static erodeByWater(mesh, h, waters, recorder, erodeRate) {
            var newh = terrain_generator_1.TerrainGenerator.generateZeroHeights(mesh);
            // 高い順に並び変える
            let heightOrderedVoronois = mesh.voronoiPoints.sort((a, b) => {
                return h[b.id] - h[a.id];
            });
            const flowSummary = recorder.getSummaryWater();
            heightOrderedVoronois.forEach(e => {
                // 水の移動が多いところを削る
                const decreaseHeight = flowSummary[e.id] * erodeRate * (1 - mesh.pointDict[e.id].robustness);
                newh[e.id] -= decreaseHeight;
                newh[e.id] = Math.max(-1, newh[e.id]);
            });
            return terrain_generator_1.TerrainGenerator.mergeHeights(mesh, terrain_interfaces_1.MergeMethod.Add, newh, h);
        }
    }
    exports.WaterErosionExecutor = WaterErosionExecutor;
});
