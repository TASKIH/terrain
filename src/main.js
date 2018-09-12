// Set up any config you need (you might not need this)
requirejs.config({
    basePath: "/scripts",
    paths: {
        d3: "../lib/d3.min",
        "js-priority-queue": "../lib/priority-queue.min",
        "domReady": "../lib/domReady"
    }
});

requirejs(["new-terrain-controller", "domReady"], function(ctrl, domReady) {

    domReady(() => {
        ctrl.drawTerrainControll();

    });
});