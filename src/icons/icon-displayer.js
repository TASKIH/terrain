define(["require", "exports", "./icon-files"], function (require, exports, icon_files_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getIconElement(icon, ev) {
        let element = document.createElement("span");
        element.classList.add('map-symbol');
        let img = document.createElement('img');
        img.src = icon.path;
        img.alt = icon.name;
        img.addEventListener("mousedown", (e) => {
            if (e && e.target) {
                ev.onSelectSymbolOnIconList(e);
            }
        });
        element.appendChild(img);
        return element;
    }
    function displayIcon(ev) {
        let targetElem = document.getElementById('building');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['building']) {
                const icon = icon_files_1.ICON_FILES['building'][iKey];
                targetElem.appendChild(getIconElement(icon, ev));
            }
        }
        targetElem = document.getElementById('items');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['items']) {
                const icon = icon_files_1.ICON_FILES['items'][iKey];
                targetElem.appendChild(getIconElement(icon, ev));
            }
        }
        targetElem = document.getElementById('weapons');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['weapons']) {
                const icon = icon_files_1.ICON_FILES['weapons'][iKey];
                targetElem.appendChild(getIconElement(icon, ev));
            }
        }
        targetElem = document.getElementById('jobs');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['jobs']) {
                const icon = icon_files_1.ICON_FILES['jobs'][iKey];
                targetElem.appendChild(getIconElement(icon, ev));
            }
        }
        targetElem = document.getElementById('nature');
        if (targetElem) {
            for (let iKey in icon_files_1.ICON_FILES['nature']) {
                const icon = icon_files_1.ICON_FILES['nature'][iKey];
                targetElem.appendChild(getIconElement(icon, ev));
            }
        }
    }
    exports.displayIcon = displayIcon;
});
