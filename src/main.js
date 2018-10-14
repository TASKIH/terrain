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
        var elems = document.querySelectorAll('.collapsible');
        var instances = M.Collapsible.init(elems, options);
        ctrl.drawTerrainControll();
        
        document.getElementById("select-symbol").addEventListener("click", ctrl.onSelectSymbolClick);
        document.getElementById("save-name").addEventListener("click", ctrl.onSymbolChangeClick);
        document.getElementById("delete-symbol").addEventListener("click", ctrl.onSymbolDeleteClick);
        document.getElementById("save-map").addEventListener("click", ctrl.onMapSaveClick);
        document.getElementById("load-map").addEventListener("change", ctrl.onMapLoadClick, false);
        document.getElementById("download-image").addEventListener("click", ctrl.onDownloadClick, false);
        document.getElementById("select-mode-whole-shadow").addEventListener("mousedown", ctrl.onSelModeShadowClick)
    });

});