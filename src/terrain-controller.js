var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "d3", "./terrain-interfaces", "./mesh-generator", "./util", "./terrain-drawer", "./terrain-generator", "./terrain-feature-generator", "./water-erosion-executor", "./water-recorder"], function (require, exports, d3, terrain_interfaces_1, mesh_generator_1, util_1, terrain_drawer_1, terrain_generator_1, terrain_feature_generator_1, water_erosion_executor_1, water_recorder_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3 = __importStar(d3);
    function drawTerrainControll() {
        function addSVG(div) {
            return div.insert("svg", ":first-child")
                .attr("height", 400)
                .attr("width", 400)
                .attr("viewBox", "-500 -500 1000 1000");
        }
        var meshDiv = d3.select("div#mesh");
        var meshSVG = addSVG(meshDiv);
        var meshPts = null;
        var meshVxs = null;
        var meshDual = false;
        function meshDraw() {
            if (meshDual && !meshVxs) {
                meshVxs = mesh_generator_1.MeshGenerator.makeMesh(meshPts).voronoiPoints;
            }
            terrain_drawer_1.TerrainDrawer.visualizePoints(meshSVG, meshDual ? meshVxs : meshPts);
        }
        meshDiv.append("button")
            .text("Generate random points")
            .on("click", function () {
            meshDual = false;
            meshVxs = null;
            meshPts = mesh_generator_1.MeshGenerator.generatePoints(256);
            meshDraw();
        });
        meshDiv.append("button")
            .text("Improve points")
            .on("click", function () {
            meshPts = mesh_generator_1.MeshGenerator.appendPoints(meshPts);
            meshVxs = null;
            meshDraw();
        });
        var vorBut = meshDiv.append("button")
            .text("Show Voronoi corners")
            .on("click", function () {
            meshDual = !meshDual;
            if (meshDual) {
                vorBut.text("Show original points");
            }
            else {
                vorBut.text("Show Voronoi corners");
            }
            meshDraw();
        });
        var expDiv = d3.select("div#exp");
        var expSVG = addSVG(expDiv);
        var expMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096);
        var expH = terrain_generator_1.TerrainGenerator.generateZeroHeights(expMesh);
        class ContinentData {
            constructor() {
                this.continent = [];
                this.waters = {};
                this.waterResult = {
                    waters: {},
                    records: new water_recorder_1.WaterRecorder(),
                    result: {
                        hasDeadend: false,
                        isFinished: false,
                    }
                };
            }
        }
        var continents = [];
        function expDraw() {
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(expSVG, expMesh, expH, -1, 1);
            terrain_drawer_1.TerrainDrawer.drawPaths(expSVG, 'coast', terrain_drawer_1.TerrainDrawer.generateContour(expMesh, expH, 0));
        }
        function expDrawWater(waters) {
            terrain_drawer_1.TerrainDrawer.visualizeWater(expSVG, expMesh, waters);
            terrain_drawer_1.TerrainDrawer.drawPaths(expSVG, 'coast', terrain_drawer_1.TerrainDrawer.generateContour(expMesh, expH, 0));
        }
        expDiv.append("button")
            .text("Reset to flat")
            .on("click", function () {
            expH = terrain_generator_1.TerrainGenerator.generateZeroHeights(expMesh);
            expDraw();
        });
        expDiv.append("button")
            .text("マージン部を海にする")
            .on("click", function () {
            const height = +document.getElementById("continent-height").value;
            const radius = +document.getElementById("continent-radius").value;
            terrain_generator_1.TerrainGenerator.makeMarginSea(expMesh, expH);
            expDraw();
        });
        expDiv.append("button")
            .text("Continentを作成")
            .on("click", function () {
            const height = +document.getElementById("continent-height").value;
            const radius = +document.getElementById("continent-radius").value;
            expH = terrain_generator_1.TerrainGenerator.mergeHeights(expMesh, terrain_interfaces_1.MergeMethod.Add, expH, terrain_generator_1.TerrainGenerator.continent(expMesh, height, 1, radius, expMesh.extent.margin));
            expDraw();
        });
        expDiv.append("button")
            .text("堅牢性を変更")
            .on("click", function () {
            terrain_feature_generator_1.TerrainFeatureGenerator.setRandomRoberstness(expMesh);
            expDraw();
        });
        expDiv.append("button")
            .text("海を作成")
            .on("click", function () {
            let average = util_1.TerrainCalcUtil.mean(expH) - 0.1;
            expH = terrain_generator_1.TerrainGenerator.rescaleBySeaLevel(expH, average);
            expDraw();
        });
        expDiv.append("button")
            .text("単純な浸食を実行")
            .on("click", function () {
            expH = terrain_generator_1.TerrainGenerator.erodeSimply(expMesh, expH, 0.2);
            expDraw();
        });
        expDiv.append("button")
            .text("よりよい浸食を実行")
            .on("click", function () {
            expH = terrain_generator_1.TerrainGenerator.doErosion(expMesh, expH, util_1.TerrainCalcUtil.runif(0, 0.1), 5);
            expDraw();
        });
        expDiv.append("button")
            .text("海岸線の整理")
            .on("click", function () {
            expH = terrain_generator_1.TerrainGenerator.cleanCoast(expMesh, expH, 5);
            expDraw();
        });
        /*
                expDiv.append("button")
                .text("水の流れの計算")
                .on("click", function () {
                    waterResult = WaterErosionExecutor.calcWaterFlow(expMesh, expH, 0.2, 0.5);
                    console.log(waterResult);
                    expDrawWater();
                });
        
                expDiv.append("button")
                .text("水による浸食")
                .on("click", function () {
                    for (let i = 0; i < 5; i++) {
        
                    }
                    expH = WaterErosionExecutor.erodeByWater(expMesh, expH, waterResult.waters, waterResult.records, 0.01);
                    expDraw();
                });
        
                expDiv.append("button")
                .text("水の流れを見る")
                .on("click", function () {
                    expDrawWater();
                });
        
                expDiv.append("button")
                .text("地形の高さを見る")
                .on("click", function () {
                    expDraw();
                });
        */
        var primDiv = d3.select("div#prim");
        var primSVG = addSVG(primDiv);
        var primMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096);
        var primH = terrain_generator_1.TerrainGenerator.generateZeroHeights(primMesh);
        function primDraw() {
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primSVG, primMesh, primH, -1, 1);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', terrain_drawer_1.TerrainDrawer.generateContour(primMesh, primH, 0));
        }
        primDraw();
        primDiv.append("button")
            .text("Reset to flat")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.generateZeroHeights(primMesh);
            primDraw();
        });
        // SVG上の座標が-0.5～0.5の間で設定されている。
        // これに対してランダムなポイントをかけ合わせて（x * ランダムな数値 + y * ランダムな数値）にすると
        // 結果としてなだらかな傾きが作成されることになる。
        // 例えばランダムな値が[1, 1]だとすると、xとyが大きければ大きいほど高度が上がる。
        // [-1, 1]はxが大きいと高度が下がり、yが大きいと高度が上がる
        // slopeはポイントごとの「高さ」を作成する。
        primDiv.append("button")
            .text("Add random slope")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.mergeHeights(primMesh, terrain_interfaces_1.MergeMethod.Add, primH, terrain_generator_1.TerrainGenerator.slope(primMesh, util_1.TerrainCalcUtil.randomVector(4)));
            terrain_drawer_1.TerrainDrawer.visualizeVoronoi(primMesh, primSVG, primH);
            // visualizeHeight(primSVG, primH, -1, 1);
            // primH = mergeHeights(primH, slope(primMesh, [1, -1]));
            console.log(primMesh);
            primDraw();
        });
        // XやYの絶対値が大きければ大きいほど凹む
        // SVGの中央が出っ張るように高さを調整する意図
        primDiv.append("button")
            .text("Add cone")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.mergeHeights(primMesh, terrain_interfaces_1.MergeMethod.Add, primH, terrain_generator_1.TerrainGenerator.cone(primMesh, -0.5));
            primDraw();
        });
        // これは逆に
        primDiv.append("button")
            .text("Add inverted cone")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.mergeHeights(primMesh, terrain_interfaces_1.MergeMethod.Add, primH, terrain_generator_1.TerrainGenerator.cone(primMesh, 0.5));
            primDraw();
        });
        primDiv.append("button")
            .text("Add five blobs")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.mergeHeights(primMesh, terrain_interfaces_1.MergeMethod.Add, primH, terrain_generator_1.TerrainGenerator.mountains(primMesh, 5));
            primDraw();
        });
        primDiv.append("button")
            .text("Add one continent ")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.mergeHeights(primMesh, terrain_interfaces_1.MergeMethod.Add, primH, terrain_generator_1.TerrainGenerator.continent(primMesh, 0.4, 3, 0.2));
            primDraw();
        });
        primDiv.append("button")
            .text("大陸の生成")
            .on("click", function () {
            primMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(16028);
            let heights = [];
            const layerCounts = 5;
            let waterResult;
            for (let i = 0; i < layerCounts; i++) {
                let newHeight = terrain_generator_1.TerrainGenerator.generateZeroHeights(primMesh);
                newHeight = terrain_generator_1.TerrainGenerator.mergeHeights(primMesh, terrain_interfaces_1.MergeMethod.Add, primH, terrain_generator_1.TerrainGenerator.continent(primMesh, 0.05, 5, 0.025));
                waterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(primMesh, primH, 0.02, 0.5);
                heights.push(newHeight);
            }
            for (let i = 0; i < 7; i++)
                if (i == 5) {
                    waterResult = water_erosion_executor_1.WaterErosionExecutor.calcWaterFlow(primMesh, primH, 0.02, 0.5);
                }
            primH = water_erosion_executor_1.WaterErosionExecutor.erodeByWater(primMesh, primH, waterResult.waters, waterResult.records, 0.005);
            primH = terrain_generator_1.TerrainGenerator.doErosion(primMesh, primH, util_1.TerrainCalcUtil.runif(0, 0.1), 30);
            primH = terrain_generator_1.TerrainGenerator.cleanCoast(primMesh, primH, 10);
            var myRenderer = {
                params: terrain_generator_1.TerrainGenerator.defaultParams,
                mesh: primMesh,
                h: primH
            };
            myRenderer.rivers = terrain_feature_generator_1.TerrainFeatureGenerator.getRivers(primMesh, myRenderer.h, 0.01);
            myRenderer.coasts = terrain_drawer_1.TerrainDrawer.generateContour(primMesh, myRenderer.h, 0);
            console.log(myRenderer.rivers);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            terrain_drawer_1.TerrainDrawer.drawPaths(primSVG, 'coast', myRenderer.coasts);
            terrain_drawer_1.TerrainDrawer.visualizeSlopes(primSVG, myRenderer);
            console.log(myRenderer.rivers);
            primDraw();
        });
        primDiv.append("button")
            .text("rescale by median heights")
            .on("click", function () {
            console.log(primH);
            const average = util_1.TerrainCalcUtil.mean(primH);
            primH = terrain_generator_1.TerrainGenerator.rescaleBySeaLevel(primH, average);
            primDraw();
        });
        primDiv.append("button")
            .text("Normalize heightmap")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.normalize(primH);
            primDraw();
        });
        primDiv.append("button")
            .text("Round hills")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.peaky(primH);
            primDraw();
        });
        primDiv.append("button")
            .text("Relax")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.relax(primMesh, primH);
            primDraw();
        });
        primDiv.append("button")
            .text("Set sea level to median")
            .on("click", function () {
            primH = terrain_generator_1.TerrainGenerator.setSeaLevel(primMesh, primH, 0.5);
            primDraw();
        });
        var erodeDiv = d3.select("div#erode");
        var erodeSVG = addSVG(erodeDiv);
        function generateUneroded() {
            var mesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096);
            var h = terrain_generator_1.TerrainGenerator.mergeHeights(mesh, terrain_interfaces_1.MergeMethod.Add, terrain_generator_1.TerrainGenerator.slope(mesh, util_1.TerrainCalcUtil.randomVector(4)), terrain_generator_1.TerrainGenerator.cone(mesh, util_1.TerrainCalcUtil.runif(-1, 1)), terrain_generator_1.TerrainGenerator.mountains(mesh, 50));
            h = terrain_generator_1.TerrainGenerator.peaky(h);
            h = terrain_generator_1.TerrainGenerator.fillSinks(mesh, h);
            h = terrain_generator_1.TerrainGenerator.setSeaLevel(mesh, h, 0);
            return h;
        }
        var erodeH = primH;
        var erodeMesh = primMesh;
        var erodeViewErosion = false;
        function erodeDraw() {
            if (erodeViewErosion) {
                terrain_drawer_1.TerrainDrawer.visualizeVoronoi(erodeMesh, erodeSVG, terrain_generator_1.TerrainGenerator.erosionRate(erodeMesh, erodeH));
            }
            else {
                terrain_drawer_1.TerrainDrawer.visualizeVoronoi(erodeMesh, erodeSVG, erodeH, 0, 1);
            }
            terrain_drawer_1.TerrainDrawer.drawPaths(erodeSVG, "coast", terrain_drawer_1.TerrainDrawer.generateContour(erodeMesh, erodeH, 0));
        }
        erodeDiv.append("button")
            .text("Generate random heightmap")
            .on("click", function () {
            erodeH = generateUneroded();
            erodeDraw();
        });
        erodeDiv.append("button")
            .text("Copy heightmap from above")
            .on("click", function () {
            erodeH = primH;
            erodeDraw();
        });
        erodeDiv.append("button")
            .text("Erode")
            .on("click", function () {
            erodeH = terrain_generator_1.TerrainGenerator.doErosion(erodeMesh, erodeH, 0.1);
            erodeDraw();
        });
        erodeDiv.append("button")
            .text("Set sea level to median")
            .on("click", function () {
            erodeH = terrain_generator_1.TerrainGenerator.setSeaLevel(erodeMesh, erodeH, 0.0);
            erodeDraw();
        });
        erodeDiv.append("button")
            .text("Clean coastlines")
            .on("click", function () {
            erodeH = terrain_generator_1.TerrainGenerator.cleanCoast(erodeMesh, erodeH, 1);
            erodeH = terrain_generator_1.TerrainGenerator.fillSinks(erodeMesh, erodeH);
            erodeDraw();
        });
        var erodeBut = erodeDiv.append("button")
            .text("Show erosion rate")
            .on("click", function () {
            erodeViewErosion = !erodeViewErosion;
            if (erodeViewErosion) {
                erodeBut.text("Show heightmap");
            }
            else {
                erodeBut.text("Show erosion rate");
            }
            erodeDraw();
        });
        var physDiv = d3.select("div#phys");
        var physSVG = addSVG(physDiv);
        var physH = erodeH;
        var physMesh = erodeMesh;
        var physViewCoast = false;
        var physViewRivers = false;
        var physViewSlope = false;
        var physViewHeight = true;
        function physDraw() {
            if (physViewHeight) {
                terrain_drawer_1.TerrainDrawer.visualizeVoronoi(physMesh, physSVG, physH, 0);
            }
            else {
                physSVG.selectAll("path.field").remove();
            }
            if (physViewCoast) {
                terrain_drawer_1.TerrainDrawer.drawPaths(physSVG, "coast", terrain_drawer_1.TerrainDrawer.generateContour(physMesh, physH, 0));
            }
            else {
                terrain_drawer_1.TerrainDrawer.drawPaths(physSVG, "coast", []);
            }
            if (physViewRivers) {
                terrain_drawer_1.TerrainDrawer.drawPaths(physSVG, "river", terrain_feature_generator_1.TerrainFeatureGenerator.getRivers(physMesh, physH, 0.01));
            }
            else {
                terrain_drawer_1.TerrainDrawer.drawPaths(physSVG, "river", []);
            }
            if (physViewSlope) {
                terrain_drawer_1.TerrainDrawer.visualizeSlopes(physSVG, {
                    h: physH, params: terrain_generator_1.TerrainGenerator.defaultParams
                });
            }
            else {
                terrain_drawer_1.TerrainDrawer.visualizeSlopes(physSVG, {
                    h: terrain_generator_1.TerrainGenerator.generateZeroHeights(physMesh),
                    params: terrain_generator_1.TerrainGenerator.defaultParams
                });
            }
        }
        physDiv.append("button")
            .text("Generate random heightmap")
            .on("click", function () {
            physMesh = mesh_generator_1.MeshGenerator.generateGoodMesh(4096, terrain_generator_1.defaultExtent);
            physH = terrain_generator_1.TerrainGenerator.generateCoast(physMesh, terrain_generator_1.defaultExtent);
            physDraw();
        });
        physDiv.append("button")
            .text("Copy heightmap from above")
            .on("click", function () {
            physH = erodeH;
            physDraw();
        });
        var physCoastBut = physDiv.append("button")
            .text("Show coastline")
            .on("click", function () {
            physViewCoast = !physViewCoast;
            physCoastBut.text(physViewCoast ? "Hide coastline" : "Show coastline");
            physDraw();
        });
        var physRiverBut = physDiv.append("button")
            .text("Show rivers")
            .on("click", function () {
            physViewRivers = !physViewRivers;
            physRiverBut.text(physViewRivers ? "Hide rivers" : "Show rivers");
            physDraw();
        });
        var physSlopeBut = physDiv.append("button")
            .text("Show slope shading")
            .on("click", function () {
            physViewSlope = !physViewSlope;
            physSlopeBut.text(physViewSlope ? "Hide slope shading" : "Show slope shading");
            physDraw();
        });
        var physHeightBut = physDiv.append("button")
            .text("Hide heightmap")
            .on("click", function () {
            physViewHeight = !physViewHeight;
            physHeightBut.text(physViewHeight ? "Hide heightmap" : "Show heightmap");
            physDraw();
        });
        var cityDiv = d3.select("div#city");
        var citySVG = addSVG(cityDiv);
        var cityViewScore = true;
        function newCityRender(mesh, h) {
            mesh = mesh || mesh_generator_1.MeshGenerator.generateGoodMesh(4096, terrain_generator_1.defaultExtent);
            h = h || terrain_generator_1.TerrainGenerator.generateCoast(mesh, terrain_generator_1.defaultExtent);
            return {
                params: terrain_generator_1.TerrainGenerator.defaultParams,
                h: h,
                mesh: mesh,
                cities: []
            };
        }
        var cityRender = newCityRender(physMesh, physH);
        function cityDraw() {
            cityRender.terr = terrain_feature_generator_1.TerrainFeatureGenerator.getTerritories(cityRender);
            if (cityViewScore) {
                var score = terrain_feature_generator_1.TerrainFeatureGenerator.cityScore(cityRender.mesh, cityRender.h, cityRender.cities);
                terrain_drawer_1.TerrainDrawer.visualizeVoronoi(citySVG, cityRender.mesh, score, (d3.max(score) || 0) - 0.5);
            }
            else {
                terrain_drawer_1.TerrainDrawer.visualizeVoronoi(citySVG, cityRender.mesh, cityRender.terr);
            }
            terrain_drawer_1.TerrainDrawer.drawPaths(citySVG, 'coast', terrain_drawer_1.TerrainDrawer.generateContour(cityRender.mesh, cityRender.h, 0));
            terrain_drawer_1.TerrainDrawer.drawPaths(citySVG, 'river', terrain_feature_generator_1.TerrainFeatureGenerator.getRivers(cityRender.mesh, cityRender.h, 0.01));
            terrain_drawer_1.TerrainDrawer.drawPaths(citySVG, 'border', terrain_feature_generator_1.TerrainFeatureGenerator.getBorders(cityRender));
            terrain_drawer_1.TerrainDrawer.visualizeSlopes(citySVG, cityRender);
            terrain_drawer_1.TerrainDrawer.visualizeCities(citySVG, cityRender);
        }
        cityDiv.append("button")
            .text("Generate random heightmap")
            .on("click", function () {
            cityRender = newCityRender();
            cityDraw();
        });
        cityDiv.append("button")
            .text("Copy heightmap from above")
            .on("click", function () {
            cityRender = newCityRender(physMesh, physH);
            cityDraw();
        });
        cityDiv.append("button")
            .text("Add new city")
            .on("click", function () {
            terrain_feature_generator_1.TerrainFeatureGenerator.placeCity(cityRender);
            cityDraw();
        });
        var cityViewBut = cityDiv.append("button")
            .text("Show territories")
            .on("click", function () {
            cityViewScore = !cityViewScore;
            cityViewBut.text(cityViewScore ? "Show territories" : "Show city location scores");
            cityDraw();
        });
        var finalDiv = d3.select("div#final");
        var finalSVG = addSVG(finalDiv);
        finalDiv.append("button")
            .text("Copy pointMapFunction from above")
            .on("click", function () {
            terrain_drawer_1.TerrainDrawer.drawMap(finalSVG, cityRender);
        });
        finalDiv.append("button")
            .text("Generate high resolution pointMapFunction")
            .on("click", function () {
            terrain_drawer_1.TerrainDrawer.doMap(finalSVG, terrain_generator_1.TerrainGenerator.defaultParams);
        });
    }
    exports.drawTerrainControll = drawTerrainControll;
});
