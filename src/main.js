// Set up any config you need (you might not need this)
requirejs.config({
    basePath: "/scripts",
    paths: {
        d3: "http://d3js.org/d3.v4.min",
        "js-priority-queue": "../lib/priority-queue.min",
        "domReady": "../lib/domReady"
    }
});

requirejs(["terrain-controller", "domReady"], function(ctrl, domReady) {

    domReady(() => {
        ctrl.drawTerrainControll();

    });
});