define(["require", "exports", "./terrain-interfaces", "./status-store", "./util", "./icons/icon-util", "./loading-handler", "./terrain-generator", "./terrain-drawer"], function (require, exports, terrain_interfaces_1, status_store_1, util_1, icon_util_1, loading_handler_1, terrain_generator_1, terrain_drawer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class MapEventHandler {
        constructor(r, e) {
            this.render = r;
            this.eventListeners = e;
        }
        addIcon(x, y, iconPath, iconAlt) {
            const ICON_SIZE = 32;
            const appendIcon = {
                id: status_store_1.CurrentStatus.maxIconId,
                x: x - ICON_SIZE / 2,
                y: y - ICON_SIZE / 2,
                src: iconPath,
                fontSize: 12,
                name: iconAlt,
            };
            if (!this.render.icons) {
                this.render.icons = {};
            }
            status_store_1.CurrentStatus.maxIconId++;
            this.render.icons[appendIcon.id] = appendIcon;
            this.eventListeners.forEach(ev => {
                ev.call(terrain_interfaces_1.EventKind.IconChanged);
            });
        }
        modifyTerrain(x, y, topHeight, radius) {
            if (!this.render.icons) {
                this.render.icons = {};
            }
            if (!status_store_1.CurrentStatus.render) {
                return;
            }
            loading_handler_1.LoadingHandler.setLoadingVisibility(true, '生成中...');
            const self = this;
            setTimeout(function () {
                try {
                    const myRender = status_store_1.CurrentStatus.render;
                    myRender.h = terrain_generator_1.TerrainGenerator.mergeHeights(myRender.mesh, terrain_interfaces_1.MergeMethod.Add, myRender.h, terrain_generator_1.TerrainGenerator.calcMountHeights(self.render.mesh, topHeight, radius, x, y));
                    myRender.coasts = terrain_drawer_1.TerrainDrawer.generateContour(myRender.mesh, myRender.h, 0);
                    self.eventListeners.forEach(ev => {
                        ev.call(terrain_interfaces_1.EventKind.WholeMapChanged);
                    });
                }
                finally {
                    loading_handler_1.LoadingHandler.setLoadingVisibility(false, '生成中...');
                }
            }, 50);
        }
        setSymbolDivVisibility(isVisible) {
            const selectModeDiv = document.getElementById('select-mode-div');
            if (!selectModeDiv) {
                return;
            }
            const selectModeShadowDiv = document.getElementById('select-mode-whole-shadow');
            if (!selectModeShadowDiv) {
                return;
            }
            const setModeStr = (isVisible) ? 'visible' : 'collapse';
            selectModeDiv.style.visibility = setModeStr;
            selectModeShadowDiv.style.visibility = setModeStr;
        }
        onMeshClick(x, y) {
            if (status_store_1.CurrentStatus.controlStatus === status_store_1.ControlStatus.IconSelect) {
                if (status_store_1.CurrentStatus.currentIconType == 'terrain') {
                    this.modifyTerrain(x, y, parseFloat(status_store_1.CurrentStatus.iconOption.topHeight), parseFloat(status_store_1.CurrentStatus.iconOption.radius));
                }
                else {
                    this.addIcon(x, y, status_store_1.CurrentStatus.currentIconPath, status_store_1.CurrentStatus.currentIconAlt);
                }
            }
        }
        // 地図上のSymbolをクリックした時のイベント
        onClickSymbolOnMap(icon, d3Event) {
            if (status_store_1.CurrentStatus.controlStatus === status_store_1.ControlStatus.None) {
                const selectingIcons = document.getElementsByClassName('now-selecting');
                if (selectingIcons) {
                    for (let i = 0; i < selectingIcons.length; i++) {
                        selectingIcons[i].classList.remove('now-selecting');
                    }
                }
                const symbolNameDiv = document.getElementById("symbolNameDiv");
                if (!symbolNameDiv) {
                    console.log('her1');
                    return;
                }
                symbolNameDiv.setAttribute("data-current-id", icon.id.toString());
                const symbolNameInput = document.getElementById("symbolName");
                if (!symbolNameInput) {
                    console.log('her2');
                    return;
                }
                symbolNameInput.value = icon.name;
                const symbolSizeInput = document.getElementById("symbolFontSize");
                if (!symbolSizeInput) {
                    console.log('her13');
                    return;
                }
                symbolSizeInput.value = icon.fontSize.toString();
                const nextIconElem = document.getElementById(util_1.TerrainUtil.getIconId(icon.id));
                if (nextIconElem) {
                    console.log('her14');
                    nextIconElem.classList.add('now-selecting');
                }
                const elems = document.getElementById("map-svg");
                if (!elems) {
                    console.log('her5');
                    return;
                }
                const iconEditor = document.getElementById('select-mode-div');
                if (iconEditor) {
                    console.log('her6');
                    const x = d3Event.pageX;
                    const y = d3Event.pageY + 36;
                    iconEditor.style.left = x.toString() + 'px';
                    iconEditor.style.top = y.toString() + 'px';
                }
                this.setSymbolDivVisibility(true);
                // @ts-ignore
                M.updateTextFields();
            }
        }
        onModeChange() {
            const svg = document.getElementById("map-svg");
            if (!svg) {
                return;
            }
            const plcModeDiv = document.getElementById('place-mode-div');
            if (status_store_1.CurrentStatus.controlStatus === status_store_1.ControlStatus.None) {
                const elems = document.getElementById("map-svg");
                if (!elems) {
                    return;
                }
                elems.classList.add("select-mode");
                svg.classList.remove("place-mode");
                if (plcModeDiv) {
                    plcModeDiv.style.visibility = 'collapse';
                }
            }
            else {
                const elems = document.getElementById("map-svg");
                if (!elems) {
                    return;
                }
                elems.classList.remove("select-mode");
                elems.classList.add("place-mode");
                if (plcModeDiv) {
                    plcModeDiv.style.visibility = 'visible';
                }
                this.setSymbolDivVisibility(false);
            }
            const selectingIcons = document.getElementsByClassName('now-selecting');
            if (selectingIcons) {
                for (let i = 0; i < selectingIcons.length; i++) {
                    selectingIcons[i].classList.remove('now-selecting');
                }
            }
        }
        onSelectSymbolClick() {
            status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.None;
            status_store_1.CurrentStatus.currentIconAlt = "";
            status_store_1.CurrentStatus.currentIconPath = "";
            status_store_1.CurrentStatus.currentIconType = "";
            status_store_1.CurrentStatus.iconOption = {};
            const selectingIconElement = document.getElementById("current-selecting-icon");
            if (selectingIconElement) {
                selectingIconElement.innerHTML = "";
            }
        }
        onSelectSymbolOnIconList(e) {
            status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.IconSelect;
            status_store_1.CurrentStatus.currentIconPath = e.target.src;
            status_store_1.CurrentStatus.currentIconAlt = e.target.alt;
            status_store_1.CurrentStatus.currentIconType = e.target.getAttribute('data-icon-type');
            status_store_1.CurrentStatus.iconOption = {
                topHeight: e.target.getAttribute('data-top-height'),
                radius: e.target.getAttribute('data-radius'),
            };
            const currentIconArea = document.getElementById('current-selecting-icon');
            if (currentIconArea) {
                currentIconArea.textContent = null;
                currentIconArea.appendChild(icon_util_1.IconUtil.getCurrentIconAreaElement(e.target.src, e.target.alt));
            }
        }
        onSymbolChangeClick() {
            const inputText = document.getElementById("symbolName");
            if (!inputText) {
                return;
            }
            const symbolSizeInput = document.getElementById("symbolFontSize");
            if (!symbolSizeInput) {
                return;
            }
            const inputedValue = inputText.value;
            const inputedFontSize = parseFloat(symbolSizeInput.value);
            const symbolDiv = document.getElementById("symbolNameDiv");
            if (!symbolDiv) {
                return;
            }
            const currentId = symbolDiv.getAttribute('data-current-id');
            if (!currentId) {
                return;
            }
            const currentIdInt = parseInt(currentId);
            if (status_store_1.CurrentStatus.render) {
                status_store_1.CurrentStatus.render.icons[currentIdInt].name = inputedValue;
                status_store_1.CurrentStatus.render.icons[currentIdInt].fontSize = inputedFontSize || 12;
            }
            this.eventListeners.forEach(ev => {
                ev.call(terrain_interfaces_1.EventKind.LabelChanged);
            });
            this.setSymbolDivVisibility(false);
        }
        onSymbolDeleteClick() {
            const symbolDiv = document.getElementById("symbolNameDiv");
            if (!symbolDiv) {
                return;
            }
            const currentId = symbolDiv.getAttribute('data-current-id');
            if (!currentId) {
                return;
            }
            const currentIdInt = parseInt(currentId);
            if (status_store_1.CurrentStatus.render) {
                delete status_store_1.CurrentStatus.render.icons[currentIdInt];
            }
            this.eventListeners.forEach(ev => {
                ev.call(terrain_interfaces_1.EventKind.IconChanged);
                ev.call(terrain_interfaces_1.EventKind.LabelChanged);
            });
            this.setSymbolDivVisibility(false);
        }
        onMapSaveClick() {
            if (!status_store_1.CurrentStatus.render) {
                return;
            }
            const saveObj = JSON.stringify({
                mesh: status_store_1.CurrentStatus.render.mesh,
                h: status_store_1.CurrentStatus.render.h,
                rivers: status_store_1.CurrentStatus.render.rivers,
                icons: status_store_1.CurrentStatus.render.icons,
            });
            const contentType = 'application/octet-stream';
            const a = document.createElement('a');
            const blob = new Blob([saveObj], { 'type': contentType });
            a.href = window.URL.createObjectURL(blob);
            a.download = 'MapData.json';
            a.click();
        }
        onMapLoadClick(evt) {
            const files = evt.target.files; // FileList object
            const self = this;
            if (files.length !== 1) {
                return;
            }
            for (let i = 0, f; f = files[i]; i++) {
                const reader = new FileReader();
                // Closure to capture the file information.
                reader.onload = (function (theFile) {
                    return function (e) {
                        const data = reader.result;
                        if (typeof data !== 'string') {
                            return;
                        }
                        try {
                            const saveData = JSON.parse(data);
                            status_store_1.CurrentStatus.render.mesh = saveData.mesh;
                            status_store_1.CurrentStatus.render.icons = saveData.icons;
                            status_store_1.CurrentStatus.render.h = saveData.h;
                            status_store_1.CurrentStatus.render.rivers = saveData.rivers;
                            status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.None;
                            status_store_1.CurrentStatus.currentIconAlt = '';
                            status_store_1.CurrentStatus.currentIconPath = '';
                            status_store_1.CurrentStatus.currentIconType = '';
                            status_store_1.CurrentStatus.iconOption = {};
                            let maxIconId = 0;
                            for (let key in status_store_1.CurrentStatus.render.icons) {
                                const icon = status_store_1.CurrentStatus.render.icons[key];
                                if (icon.id > maxIconId) {
                                    maxIconId = icon.id;
                                }
                            }
                            status_store_1.CurrentStatus.maxIconId = maxIconId;
                            self.eventListeners.forEach(ev => {
                                ev.call(terrain_interfaces_1.EventKind.WholeMapChanged);
                            });
                        }
                        catch (err) {
                            // @ts-ignore
                            M.toast({ html: 'ファイルの読み込みができませんでした' });
                        }
                        loading_handler_1.LoadingHandler.setLoadingVisibility(false);
                    };
                })(f);
                reader.readAsText(f);
            }
        }
        onSelModeShadowClick() {
            this.setSymbolDivVisibility(false);
        }
        onMapExport(svgId) {
            const OFF_SCREEN_CANVAS_ID = "svgOffScreeenRenderCanvas";
            const OFF_SCREEN_CANVAS_CLASS = "svg-off-screen-render-canvas";
            function saveToPngByCanvg(callback) {
                var svg = document.getElementById(svgId);
                var svgStr = new XMLSerializer().serializeToString(svg);
                var canvas = document.getElementById(OFF_SCREEN_CANVAS_ID);
                if (!canvas) {
                    var svgW = svg.getAttribute('width');
                    var svgH = svg.getAttribute('height');
                    canvas = createOffScreenCanvas(svgW, svgH);
                }
                // @ts-ignore
                canvg(OFF_SCREEN_CANVAS_ID, svgStr, {
                    renderCallback: function (data) {
                        if (callback) {
                            var newData = canvas.toDataURL('image/png');
                            callback(newData);
                            const body = document.getElementsByTagName('body');
                            body[0].removeChild(document.getElementById(OFF_SCREEN_CANVAS_ID));
                        }
                    }
                });
            }
            function createOffScreenCanvas(width, height) {
                var newCanvas = document.createElement('canvas');
                newCanvas.setAttribute('id', OFF_SCREEN_CANVAS_ID);
                newCanvas.setAttribute('width', width);
                newCanvas.setAttribute('height', height);
                //styleの設定
                var style = newCanvas.style;
                style.position = 'absolute';
                style.left = '-9999px';
                style.top = '0px';
                newCanvas.classList.add(OFF_SCREEN_CANVAS_CLASS);
                document.querySelector('body').appendChild(newCanvas);
                return newCanvas;
            }
            saveToPngByCanvg((imgData) => {
                const a = document.createElement('a');
                a.href = imgData;
                a.download = 'MapData.png';
                a.id = "imglink";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                loading_handler_1.LoadingHandler.setLoadingVisibility(false);
            });
        }
    }
    exports.MapEventHandler = MapEventHandler;
});
