define(["require", "exports", "./terrain-interfaces", "./status-store", "./util"], function (require, exports, terrain_interfaces_1, status_store_1, util_1) {
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
        onMeshClick(x, y) {
            if (status_store_1.CurrentStatus.controlStatus === status_store_1.ControlStatus.IconSelect) {
                this.addIcon(x, y, status_store_1.CurrentStatus.currentIconPath, status_store_1.CurrentStatus.currentIconAlt);
            }
        }
        onIconClick(icon) {
            if (status_store_1.CurrentStatus.controlStatus === status_store_1.ControlStatus.None) {
                const selectingIcons = document.getElementsByClassName('now-selecting');
                if (selectingIcons) {
                    for (let i = 0; i < selectingIcons.length; i++) {
                        selectingIcons[i].classList.remove('now-selecting');
                    }
                }
                const symbolNameDiv = document.getElementById("symbolNameDiv");
                if (!symbolNameDiv) {
                    return;
                }
                symbolNameDiv.setAttribute("data-current-id", icon.id.toString());
                const symbolNameInput = document.getElementById("symbolName");
                if (!symbolNameInput) {
                    return;
                }
                symbolNameInput.value = icon.name;
                const nextIconElem = document.getElementById(util_1.TerrainUtil.getIconId(icon.id));
                if (nextIconElem) {
                    nextIconElem.classList.add('now-selecting');
                }
                const elems = document.getElementById("map-svg");
                if (!elems) {
                    return;
                }
            }
        }
        onModeChange() {
            const svg = document.getElementById("map-svg");
            if (!svg) {
                return;
            }
            const plcModeDiv = document.getElementById('place-mode-div');
            const selectModeDiv = document.getElementById('select-mode-div');
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
                if (selectModeDiv) {
                    selectModeDiv.style.visibility = 'visible';
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
                if (selectModeDiv) {
                    selectModeDiv.style.visibility = 'collapse';
                }
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
            const selectingIconElement = document.getElementById("current-selecting-icon");
            if (selectingIconElement) {
                selectingIconElement.innerHTML = "";
            }
        }
        onSelectSymbolOnMap(e) {
            status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.IconSelect;
            status_store_1.CurrentStatus.currentIconPath = e.target.src;
            status_store_1.CurrentStatus.currentIconAlt = e.target.alt;
            const currentIconArea = document.getElementById('current-selecting-icon');
            if (currentIconArea) {
                currentIconArea.textContent = null;
                currentIconArea.appendChild(IconUtil.getCurrentIconAreaElement(e.target.src, e.target.alt));
            }
        }
        onNameChangeClick() {
            const inputText = document.getElementById("symbolName");
            if (!inputText) {
                return;
            }
            const inputedValue = inputText.value;
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
            }
            this.eventListeners.forEach(ev => {
                ev.call(terrain_interfaces_1.EventKind.LabelChanged);
            });
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
                        const saveData = JSON.parse(data);
                        status_store_1.CurrentStatus.render.mesh = saveData.mesh;
                        status_store_1.CurrentStatus.render.icons = saveData.icons;
                        status_store_1.CurrentStatus.render.h = saveData.h;
                        status_store_1.CurrentStatus.render.rivers = saveData.rivers;
                        status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.None;
                        status_store_1.CurrentStatus.currentIconAlt = '';
                        status_store_1.CurrentStatus.currentIconPath = '';
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
                    };
                })(f);
                reader.readAsText(f);
            }
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
                            document.removeChild(document.getElementById(OFF_SCREEN_CANVAS_ID));
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
            });
        }
    }
    exports.MapEventHandler = MapEventHandler;
});
