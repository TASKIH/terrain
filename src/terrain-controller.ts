import * as d3 from 'd3';
import {
    MapRender
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
    var expH = TerrainGenerator.resetTerrainHeights(MeshGenerator.generateGoodMesh(4096));

    function expDraw() {
        TerrainDrawer.visualizeVoronoi(expSVG, expH, -1, 1);
        TerrainDrawer.drawPaths(expSVG, 'coast', TerrainDrawer.contour(expH, 0));
    }

    expDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            // @ts-ignore
            expH = resetTerrainHeights(expH.mesh);
            expDraw();
        });

    expDiv.append("button")
        .text("Continentを作成")
        .on("click", function () {
            const height = +(document.getElementById("continent-height") as HTMLInputElement).value;
            const radius = +(document.getElementById("continent-radius") as HTMLInputElement).value;
            expH = TerrainGenerator.mergeHeights(expH, TerrainGenerator.continent(expH.mesh!, height, 1, radius));
            expDraw();
        });


    var primDiv = d3.select("div#prim");
    var primSVG = addSVG(primDiv);

    var primH = TerrainGenerator.resetTerrainHeights(MeshGenerator.generateGoodMesh(4096));

    function primDraw() {
        // visualizeVoronoi(primSVG, primH, -1, 1);
        // drawPaths(primSVG, 'coast', contour(primH, 0));
    }

    primDraw();

    primDiv.append("button")
        .text("Reset to flat")
        .on("click", function () {
            // @ts-ignore
            primH = resetTerrainHeights(primH.mesh);
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
                primH, TerrainGenerator.slope(primH.mesh!, TerrainCalcUtil.randomVector(4)));
            TerrainDrawer.visualizeVoronoi(primSVG, primH);
            // visualizeHeight(primSVG, primH, -1, 1);
            // primH = mergeHeights(primH, slope(primH.mesh!, [1, -1]));
            console.log(primH.mesh!);
            primDraw();
        });

    // XやYの絶対値が大きければ大きいほど凹む
    // SVGの中央が出っ張るように高さを調整する意図
    primDiv.append("button")
        .text("Add cone")
        .on("click", function () {
            // @ts-ignore
            primH = mergeHeights(primH, cone(primH.mesh, -0.5));
            primDraw();
        });

    // これは逆に
    primDiv.append("button")
        .text("Add inverted cone")
        .on("click", function () {
            // @ts-ignore
            primH = mergeHeights(primH, cone(primH.mesh, 0.5));
            primDraw();
        });

    primDiv.append("button")
        .text("Add five blobs")
        .on("click", function () {
            // @ts-ignore
            primH = mergeHeights(primH, mountains(primH.mesh, 5));
            primDraw();
        });

    primDiv.append("button")
        .text("Add one continent ")
        .on("click", function () {
            // @ts-ignore
            primH = mergeHeights(primH, continent(primH.mesh, 0.4, 3, 0.2));
            primDraw();
        });

    primDiv.append("button")
        .text("大陸の生成")
        .on("click", function () {
            
            primH = TerrainGenerator.resetTerrainHeights(MeshGenerator.generateGoodMesh(13048));

            console.log(primH);
            // @ts-ignore
            primH = TerrainGenerator.mergeHeights(primH, TerrainGenerator.continent(primH.mesh!, 0.2, 5, 1.4));
            primH = TerrainGenerator.mergeHeights(primH, TerrainGenerator.continent(primH.mesh!, 0.4, 20, 0.05));
            primH = TerrainGenerator.mergeHeights(primH, TerrainGenerator.continent(primH.mesh!, -0.05, 10, 1.4));
            primH = TerrainGenerator.mergeHeights(primH, TerrainGenerator.continent(primH.mesh!, -0.1, 20, 0.05));
            console.log(primH);
            let average = TerrainCalcUtil.mean(primH);
            console.log(primH);
            average = TerrainCalcUtil.mean(primH) - 0.1;
            primH = TerrainGenerator.rescaleBySeaLevel(primH, average);
            

            for(let i = 0; i < 5; i++)
                primH = TerrainGenerator.relax(primH);
            
            primH = TerrainGenerator.doErosion(primH, TerrainCalcUtil.runif(0, 0.1), 5);
            primH = TerrainGenerator.cleanCoast(primH, 5);
            console.log(primH);
            var myRenderer: MapRender = {
                params: TerrainGenerator.defaultParams,
                h:  primH
            };
            primH.seaLevelHeight = 0; 
            myRenderer.rivers = TerrainFeatureGenerator.getRivers(myRenderer.h, 0.01);
            myRenderer.coasts = TerrainDrawer.contour(myRenderer.h, 0);

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
            primH = TerrainGenerator.relax(primH);
            primDraw();
        });

    primDiv.append("button")
        .text("Set sea level to median")
        .on("click", function () {
            primH = TerrainGenerator.setSeaLevel(primH, 0.5);
            primDraw();
        });

    var erodeDiv = d3.select("div#erode");
    var erodeSVG = addSVG(erodeDiv);

    function generateUneroded() {
        var mesh = MeshGenerator.generateGoodMesh(4096);
        var h = TerrainGenerator.mergeHeights(
            TerrainGenerator.slope(mesh, TerrainCalcUtil.randomVector(4)),
            TerrainGenerator.cone(mesh, TerrainCalcUtil.runif(-1, 1)),
            TerrainGenerator.mountains(mesh, 50));
        h = TerrainGenerator.peaky(h);
        h = TerrainGenerator.fillSinks(h);
        h = TerrainGenerator.setSeaLevel(h, 0);
        return h;
    }

    var erodeH = primH;
    var erodeViewErosion = false;

    function erodeDraw() {
        if (erodeViewErosion) {
            TerrainDrawer.visualizeVoronoi(erodeSVG, TerrainGenerator.erosionRate(erodeH));
        } else {
            TerrainDrawer.visualizeVoronoi(erodeSVG, erodeH, 0, 1);
        }
        TerrainDrawer.drawPaths(erodeSVG, "coast", TerrainDrawer.contour(erodeH, 0));
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
            erodeH = TerrainGenerator.doErosion(erodeH, 0.1);
            erodeDraw();
        });

    erodeDiv.append("button")
        .text("Set sea level to median")
        .on("click", function () {
            erodeH = TerrainGenerator.setSeaLevel(erodeH, 0.0);
            erodeDraw();
        });


    erodeDiv.append("button")
        .text("Clean coastlines")
        .on("click", function () {
            erodeH = TerrainGenerator.cleanCoast(erodeH, 1);
            erodeH = TerrainGenerator.fillSinks(erodeH);
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

    var physViewCoast = false;
    var physViewRivers = false;
    var physViewSlope = false;
    var physViewHeight = true;

    function physDraw() {
        if (physViewHeight) {
            TerrainDrawer.visualizeVoronoi(physSVG, physH, 0);
        } else {
            physSVG.selectAll("path.field").remove();
        }
        if (physViewCoast) {
            TerrainDrawer.drawPaths(physSVG, "coast", TerrainDrawer.contour(physH, 0));
        } else {
            TerrainDrawer.drawPaths(physSVG, "coast", []);
        }
        if (physViewRivers) {
            TerrainDrawer.drawPaths(physSVG, "river", TerrainFeatureGenerator.getRivers(physH, 0.01));
        } else {
            TerrainDrawer.drawPaths(physSVG, "river", []);
        }
        if (physViewSlope) {
            TerrainDrawer.visualizeSlopes(physSVG, {
                h:physH, params: TerrainGenerator.defaultParams});
        } else {
            // @ts-ignore
            visualizeSlopes(physSVG, {h:resetTerrainHeights(physH.mesh)});
        }
    }
    physDiv.append("button")
        .text("Generate random heightmap")
        .on("click", function () {
            physH = TerrainGenerator.generateCoast(4096, 
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

    function newCityRender(h?: any) {
        h = h || TerrainGenerator.generateCoast(4096, defaultExtent);
        return {
            params: TerrainGenerator.defaultParams,
            h: h,
            cities: []
        };
    }
    var cityRender = newCityRender(physH);
    function cityDraw() {
        // @ts-ignore
        cityRender.terr = getTerritories(cityRender);
        if (cityViewScore) {
            var score = TerrainFeatureGenerator.cityScore(cityRender.h, cityRender.cities);
            // @ts-ignore
            visualizeVoronoi(citySVG, score, d3.max(score) - 0.5);
        } else {
            // @ts-ignore
            visualizeVoronoi(citySVG, cityRender.terr);
        }
        TerrainDrawer.drawPaths(citySVG, 'coast', TerrainDrawer.contour(cityRender.h, 0));
        TerrainDrawer.drawPaths(citySVG, 'river', TerrainFeatureGenerator.getRivers(cityRender.h, 0.01));
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
            cityRender = newCityRender(physH);
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
