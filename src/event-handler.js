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
            }
        }
        onModeChange() {
            if (status_store_1.CurrentStatus.controlStatus === status_store_1.ControlStatus.None) {
                const elems = document.getElementsByTagName("svg");
                for (let i = 0; i < elems.length; i++) {
                    elems[i].classList.add("select-mode");
                }
            }
            else {
                const elems = document.getElementsByTagName("svg");
                for (let i = 0; i < elems.length; i++) {
                    elems[i].classList.remove("select-mode");
                }
            }
            const selectingIcons = document.getElementsByClassName('now-selecting');
            if (selectingIcons) {
                for (let i = 0; i < selectingIcons.length; i++) {
                    selectingIcons[i].classList.remove('now-selecting');
                }
            }
        }
        onReleaseModeClick() {
            status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.None;
            status_store_1.CurrentStatus.currentIconAlt = "";
            status_store_1.CurrentStatus.currentIconPath = "";
            const selectingIconElement = document.getElementById("current-selecting-icon");
            if (selectingIconElement) {
                selectingIconElement.innerHTML = "";
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
        onDeleteSymbolClick() {
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
                delete status_store_1.CurrentStatus.render.icons[currentIdInt];
            }
            this.eventListeners.forEach(ev => {
                ev.call(terrain_interfaces_1.EventKind.IconChanged);
                ev.call(terrain_interfaces_1.EventKind.LabelChanged);
            });
        }
    }
    exports.MapEventHandler = MapEventHandler;
});
