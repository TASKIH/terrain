define(["require", "exports", "./util"], function (require, exports, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TerrainFeatureGenerator {
        /**
         * 各ポイントに堅牢性を適当に設定する
         * @param mesh
         */
        static setRandomRoberstness(mesh) {
            for (const key in mesh.pointDict) {
                let pt = mesh.pointDict[key];
                pt.robustness = util_1.TerrainCalcUtil.normRand(0.5, 0.25);
                if (pt.robustness < 0) {
                    pt.robustness = 0;
                }
                else if (pt.robustness > 1) {
                    pt.robustness = 1;
                }
            }
        }
    }
    exports.TerrainFeatureGenerator = TerrainFeatureGenerator;
});
