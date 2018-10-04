// Set up any config you need (you might not need this)
requirejs.config({
    basePath: "/scripts",
    paths: {
        d3: "../lib/d3.min",
        "js-priority-queue": "../lib/priority-queue.min",
        "domReady": "../lib/domReady",
    }
});

requirejs(["new-terrain-controller", "domReady"], function(ctrl, domReady, canvg) {

    domReady(() => {
        ctrl.drawTerrainControll();

        document.getElementById("select-symbol").addEventListener("click", ctrl.onSelectSymbolClick);
        document.getElementById("save-name").addEventListener("click", ctrl.onNameChangeClick);
        document.getElementById("delete-symbol").addEventListener("click", ctrl.onSymbolDeleteClick);
        document.getElementById("save-map").addEventListener("click", ctrl.onMapSaveClick);
        document.getElementById("load-map").addEventListener("change", ctrl.onMapLoadClick, false);
        document.getElementById("download-image").addEventListener("click", ctrl.onDownloadClick, false);
    });

});