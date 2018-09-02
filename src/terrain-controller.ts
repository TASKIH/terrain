import * as d3 from 'd3';
import {
    MapRender, MapMesh
} from './terrain-interfaces';
import { MeshGenerator } from './mesh-generator';
import { TerrainCalcUtil } from './util';
import { TerrainDrawer } from './terrain-drawer';
import { TerrainGenerator, defaultExtent } from './terrain-generator';
import { TerrainFeatureGenerator } from './terrain-feature-generator';

export function drawTerrainControll() {
    function addSVG(div: any) {
        return div.insert("svg", ":first-child")
            .attr("height", 400)
            .attr("width", 400)
            .attr("viewBox", "-500 -500 1000 1000");
    }
    var meshDiv = d3.select("div#mesh");
    var meshSVG = addSVG(meshDiv);

    var meshPts: any = null;
    var meshVxs: any = null;
    var meshDual = false;

    function meshDraw() {
        if (meshDual && !meshVxs) {
            meshVxs = MeshGenerator.makeMesh(meshPts).voronoiPoints;
        }
        TerrainDrawer.visualizePoints(meshSVG, meshDual ? meshVxs : meshPts);
    }

    meshDiv.append("button")
        .text("Generate random points")
        .on("click", function () {
            meshDual = false;
            meshVxs = null;
            meshPts = MeshGenerator.generatePoints(256);
            meshDraw();
        });

    meshDiv.append("button")
        .text("Improve points")
        .on("click", function () {
            meshPts = MeshGenerator.appendPoints(meshPts);
            meshVxs = null;
            meshDraw();
        });

    var vorBut = meshDiv.append("button")
        .text("Show Voronoi corners")
        .on("click", function () {
            meshDual = !meshDual;
            if (meshDual) {
                vorBut.text("Show original points");
            } else {
                vorBut.text("Show Voronoi corners");
            }
            meshDraw();
        });

    var expDiv = d3.select("div#exp");
    var expSVG = addSVG(expDiv);
    var expMesh = MeshGenerator.generateGoodMesh(4096);
    var expH = TerrainGenerator.generateZeroHeights(expMesh);
    var waters = TerrainGenerator.resetWaterFlow(expMesh);

    function expDraw() {
        TerrainDrawer.visualizeVoronoi(expSVG, expMesh, expH, -1, 1);
        TerrainDrawer.drawPaths(expSVG, 'coast', TerrainDrawer.contour(expMesh, expH, 0));
    }

    function expDrawWater() {
        TerrainDrawer.visualizeWater(expSVG, expMesh, waters);
        TerrainDrawer.drawPaths(expSVG, 'coast', TerrainDrawer.contour(expMesh, expH, 0));
    }

    expDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            expH = TerrainGenerator.generateZeroHeights(expMesh);
            expDraw();
        });

    expDiv.append("button")
        .text("マージン部を海にする")
        .on("click", function () {
            const height = +(document.getElementById("continent-height") as HTMLInputElement).value;
            const radius = +(document.getElementById("continent-radius") as HTMLInputElement).value;
            TerrainGenerator.makeMarginSea(expMesh, expH);
            expDraw();
        });


    expDiv.append("button")
        .text("Continentを作成")
        .on("click", function () {
            const height = +(document.getElementById("continent-height") as HTMLInputElement).value;
            const radius = +(document.getElementById("continent-radius") as HTMLInputElement).value;
            expH = TerrainGenerator.mergeHeights(expMesh, expH, TerrainGenerator.continent(expMesh, height, 1, radius, expMesh.extent.margin));
            expDraw();
        });

        expDiv.append("button")
        .text("堅牢性を変更")
        .on("click", function () {
            TerrainFeatureGenerator.setRandomRoberstness(expMesh);
            expDraw();
        });

        expDiv.append("button")
        .text("海を作成")
        .on("click", function () {
            let average = TerrainCalcUtil.mean(expH) - 0.1;
            expH = TerrainGenerator.rescaleBySeaLevel(expH, average);
            expDraw();
        });


        expDiv.append("button")
        .text("単純な浸食を実行")
        .on("click", function () {
            expH = TerrainGenerator.erodeSimply(expMesh, expH, 0.2);
            expDraw();
        });


        expDiv.append("button")
        .text("よりよい浸食を実行")
        .on("click", function () {
            expH = TerrainGenerator.doErosion(expMesh, expH, TerrainCalcUtil.runif(0, 0.1), 5);
            expDraw();
        });

        expDiv.append("button")
        .text("海岸線の整理")
        .on("click", function () {
            expH = TerrainGenerator.cleanCoast(expMesh, expH, 5);
            expDraw();
        });

        expDiv.append("button")
        .text("水の流れの計算")
        .on("click", function () {
            waters = TerrainGenerator.calcWaterFlow(expMesh, expH, 0.2, 0.5);
            expDrawWater();
        });

        expDiv.append("button")
        .text("水による浸食")
        .on("click", function () {
            for (let i = 0; i < 5; i++) {

            }
            waters = TerrainGenerator.calcWaterFlow(expMesh, expH, 0.2, 0.5);
            expH = TerrainGenerator.erodeByWater(expMesh, expH, waters);
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

    var primDiv = d3.select("div#prim");
    var primSVG = addSVG(primDiv);
    var primMesh = MeshGenerator.generateGoodMesh(4096);
    var primH = TerrainGenerator.generateZeroHeights(primMesh);

    function primDraw() {
        TerrainDrawer.visualizeVoronoi(primSVG, primMesh, primH, -1, 1);
        TerrainDrawer.drawPaths(primSVG, 'coast', TerrainDrawer.contour(primMesh, primH, 0));
    }

    primDraw();

    primDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            primH = TerrainGenerator.generateZeroHeights(primMesh);
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
            primH = TerrainGenerator.mergeHeights(
                primMesh, primH, TerrainGenerator.slope(primMesh, TerrainCalcUtil.randomVector(4)));
            TerrainDrawer.visualizeVoronoi(primMesh, primSVG, primH);
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
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.cone(primMesh, -0.5));
            primDraw();
        });

    // これは逆に
    primDiv.append("button")
        .text("Add inverted cone")
        .on("click", function () {
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.cone(primMesh, 0.5));
            primDraw();
        });

    primDiv.append("button")
        .text("Add five blobs")
        .on("click", function () {
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.mountains(primMesh, 5));
            primDraw();
        });

    primDiv.append("button")
        .text("Add one continent ")
        .on("click", function () {
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.continent(primMesh, 0.4, 3, 0.2));
            primDraw();
        });

    primDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            primMesh = MeshGenerator.generateGoodMesh(13048);
            primH = TerrainGenerator.generateZeroHeights(primMesh);

            console.log(primH);
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.continent(primMesh, 0.2, 5, 1.4));
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.continent(primMesh, 0.4, 20, 0.05));
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.continent(primMesh, -0.05, 10, 1.4));
            primH = TerrainGenerator.mergeHeights(primMesh, primH, TerrainGenerator.continent(primMesh, -0.1, 20, 0.05));
            console.log(primH);
            let average = TerrainCalcUtil.mean(primH);
            console.log(primH);
            average = TerrainCalcUtil.mean(primH) - 0.1;
            primH = TerrainGenerator.rescaleBySeaLevel(primH, average);
            

            for(let i = 0; i < 5; i++)
                primH = TerrainGenerator.relax(primMesh, primH);
            
            primH = TerrainGenerator.doErosion(primMesh, primH, TerrainCalcUtil.runif(0, 0.1), 5);
            primH = TerrainGenerator.cleanCoast(primMesh, primH, 5);
            console.log(primH);
            var myRenderer: MapRender = {
                params: TerrainGenerator.defaultParams,
                mesh: primMesh,
                h:  primH
            };
            primH.seaLevelHeight = 0; 
            myRenderer.rivers = TerrainFeatureGenerator.getRivers(primMesh, myRenderer.h, 0.01);
            myRenderer.coasts = TerrainDrawer.contour(primMesh, myRenderer.h, 0);

            TerrainDrawer.drawPaths(primSVG, 'river', myRenderer.rivers);
            TerrainDrawer.drawPaths(primSVG, 'coast', myRenderer.coasts);
            TerrainDrawer.visualizeSlopes(primSVG, myRenderer);

            // primDraw();
        });


    primDiv.append("button")
        .text("rescale by median heights")
        .on("click", function () {
            console.log(primH);
            const average = TerrainCalcUtil.mean(primH);
            primH = TerrainGenerator.rescaleBySeaLevel(primH, average);
            primDraw();
        });


    primDiv.append("button")
        .text("Normalize heightmap")
        .on("click", function () {
            primH = TerrainGenerator.normalize(primH);
            primDraw();
        });

    primDiv.append("button")
        .text("Round hills")
        .on("click", function () {
            primH = TerrainGenerator.peaky(primH);
            primDraw();
        });

    primDiv.append("button")
        .text("Relax")
        .on("click", function () {
            primH = TerrainGenerator.relax(primMesh, primH);
            primDraw();
        });

    primDiv.append("button")
        .text("Set sea level to median")
        .on("click", function () {
            primH = TerrainGenerator.setSeaLevel(primMesh, primH, 0.5);
            primDraw();
        });

    var erodeDiv = d3.select("div#erode");
    var erodeSVG = addSVG(erodeDiv);

    function generateUneroded() {
        var mesh = MeshGenerator.generateGoodMesh(4096);
        var h = TerrainGenerator.mergeHeights(
            mesh,
            TerrainGenerator.slope(mesh, TerrainCalcUtil.randomVector(4)),
            TerrainGenerator.cone(mesh, TerrainCalcUtil.runif(-1, 1)),
            TerrainGenerator.mountains(mesh, 50));
        h = TerrainGenerator.peaky(h);
        h = TerrainGenerator.fillSinks(mesh, h);
        h = TerrainGenerator.setSeaLevel(mesh, h, 0);
        return h;
    }

    var erodeH = primH;
    var erodeMesh = primMesh;
    var erodeViewErosion = false;

    function erodeDraw() {
        if (erodeViewErosion) {
            TerrainDrawer.visualizeVoronoi(erodeMesh, erodeSVG, TerrainGenerator.erosionRate(erodeMesh, erodeH));
        } else {
            TerrainDrawer.visualizeVoronoi(erodeMesh, erodeSVG, erodeH, 0, 1);
        }
        TerrainDrawer.drawPaths(erodeSVG, "coast", TerrainDrawer.contour(erodeMesh, erodeH, 0));
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
            erodeH = TerrainGenerator.doErosion(erodeMesh, erodeH, 0.1);
            erodeDraw();
        });

    erodeDiv.append("button")
        .text("Set sea level to median")
        .on("click", function () {
            erodeH = TerrainGenerator.setSeaLevel(erodeMesh, erodeH, 0.0);
            erodeDraw();
        });


    erodeDiv.append("button")
        .text("Clean coastlines")
        .on("click", function () {
            erodeH = TerrainGenerator.cleanCoast(erodeMesh, erodeH, 1);
            erodeH = TerrainGenerator.fillSinks(erodeMesh, erodeH);
            erodeDraw();
        });

    var erodeBut = erodeDiv.append("button")
        .text("Show erosion rate")
        .on("click", function () {
            erodeViewErosion = !erodeViewErosion;
            if (erodeViewErosion) {
                erodeBut.text("Show heightmap");
            } else {
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
            TerrainDrawer.visualizeVoronoi(physMesh, physSVG, physH, 0);
        } else {
            physSVG.selectAll("path.field").remove();
        }
        if (physViewCoast) {
            TerrainDrawer.drawPaths(physSVG, "coast", TerrainDrawer.contour(physMesh, physH, 0));
        } else {
            TerrainDrawer.drawPaths(physSVG, "coast", []);
        }
        if (physViewRivers) {
            TerrainDrawer.drawPaths(physSVG, "river", TerrainFeatureGenerator.getRivers(physMesh, physH, 0.01));
        } else {
            TerrainDrawer.drawPaths(physSVG, "river", []);
        }
        if (physViewSlope) {
            TerrainDrawer.visualizeSlopes(physSVG, {
                h:physH, params: TerrainGenerator.defaultParams});
        } else {
            TerrainDrawer.visualizeSlopes(physSVG, {
                h: TerrainGenerator.generateZeroHeights(physMesh), 
                params: TerrainGenerator.defaultParams
            });
        }
    }
    physDiv.append("button")
        .text("Generate random heightmap")
        .on("click", function () {
            physMesh = MeshGenerator.generateGoodMesh(4096, defaultExtent);
            physH = TerrainGenerator.generateCoast(physMesh, 
                defaultExtent);
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

    function newCityRender(mesh?: MapMesh, h?: any): MapRender {
        mesh = mesh || MeshGenerator.generateGoodMesh(4096, defaultExtent);
        h = h || TerrainGenerator.generateCoast(mesh, defaultExtent);
        return {
            params: TerrainGenerator.defaultParams,
            h: h,
            mesh: mesh,
            cities: []
        };
    }
    var cityRender = newCityRender(physMesh, physH);
    function cityDraw() {
        cityRender.terr = TerrainFeatureGenerator.getTerritories(cityRender);
        if (cityViewScore) {
            var score = TerrainFeatureGenerator.cityScore(cityRender.mesh!, cityRender.h, cityRender.cities!);
            TerrainDrawer.visualizeVoronoi(citySVG, cityRender.mesh!, score, (d3.max(score) || 0) - 0.5);
        } else {
            TerrainDrawer.visualizeVoronoi(citySVG, cityRender.mesh!, cityRender.terr);
        }
        TerrainDrawer.drawPaths(citySVG, 'coast', TerrainDrawer.contour(cityRender.mesh!, cityRender.h, 0));
        TerrainDrawer.drawPaths(citySVG, 'river', TerrainFeatureGenerator.getRivers(cityRender.mesh!, cityRender.h, 0.01));
        TerrainDrawer.drawPaths(citySVG, 'border', TerrainFeatureGenerator.getBorders(cityRender));
        TerrainDrawer.visualizeSlopes(citySVG, cityRender);
        TerrainDrawer.visualizeCities(citySVG, cityRender);
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
            TerrainFeatureGenerator.placeCity(cityRender);
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
            TerrainDrawer.drawMap(finalSVG, cityRender);
        });

    finalDiv.append("button")
        .text("Generate high resolution pointMapFunction")
        .on("click", function () {
            TerrainDrawer.doMap(finalSVG, TerrainGenerator.defaultParams);
        });
}
