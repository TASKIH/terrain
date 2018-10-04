define(["require", "exports", "./status-store", "./icon-files"], function (require, exports, status_store_1, icon_files_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getCurrentIconAreaElement(src, alt) {
        let element = document.createElement("span");
        element.classList.add('map-symbol');
        let img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        element.appendChild(img);
        return element;
    }
    function getIconElement(icon) {
        let element = document.createElement("span");
        element.classList.add('map-symbol');
        let img = document.createElement('img');
        img.src = icon.path;
        img.alt = icon.name;
        img.addEventListener("mousedown", (e) => {
            if (e && e.target) {
                status_store_1.CurrentStatus.controlStatus = status_store_1.ControlStatus.IconSelect;
                status_store_1.CurrentStatus.currentIconPath = e.target.src;
                status_store_1.CurrentStatus.currentIconAlt = e.target.alt;
                const currentIconArea = document.getElementById('current-selecting-icon');
                if (currentIconArea) {
                    currentIconArea.textContent = null;
                    currentIconArea.appendChild(getCurrentIconAreaElement(e.target.src, e.target.alt));
                }
            }
        });
        element.appendChild(img);
        return element;
    }
    function displayIcon() {
        let targetElem = document.getElementById('building');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['building']) {
                const icon = icon_files_1.ICON_FILES['building'][iKey];
                targetElem.appendChild(getIconElement(icon));
            }
        }
        targetElem = document.getElementById('items');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['items']) {
                const icon = icon_files_1.ICON_FILES['items'][iKey];
                targetElem.appendChild(getIconElement(icon));
            }
        }
        targetElem = document.getElementById('weapons');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['weapons']) {
                const icon = icon_files_1.ICON_FILES['weapons'][iKey];
                targetElem.appendChild(getIconElement(icon));
            }
        }
        targetElem = document.getElementById('jobs');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['jobs']) {
                const icon = icon_files_1.ICON_FILES['jobs'][iKey];
                targetElem.appendChild(getIconElement(icon));
            }
        }
        targetElem = document.getElementById('nature');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['nature']) {
                const icon = icon_files_1.ICON_FILES['nature'][iKey];
                targetElem.appendChild(getIconElement(icon));
            }
        }
    }
    exports.displayIcon = displayIcon;
});
