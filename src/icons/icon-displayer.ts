import { CurrentStatusStore, ControlStatus, CurrentStatus } from "../status-store";
import { ICON_FILES } from "./icon-files";
import { MapEventHandler } from "../event-handler";

interface IconData {
    name: string,
    path: string,
}

function getIconElement(icon: IconData, ev: MapEventHandler): Element {
    let element = document.createElement("span");
    element.classList.add('map-symbol');
    let img = document.createElement('img');
    img.src = icon.path;
    img.alt = icon.name;

    img.addEventListener("mousedown", (e: any) => {
        if (e && e.target) {
            ev.onSelectSymbolOnIconList(e);
        }
    });

    element.appendChild(img);
    return element;
}

export function displayIcon(ev: MapEventHandler) {
    let targetElem = document.getElementById('building');
    if (targetElem) {
        for (let iKey in ICON_FILES['building']) {
            const icon = ICON_FILES['building'][iKey];
            targetElem.appendChild(getIconElement(icon, ev));
        }
    }
    targetElem = document.getElementById('items');
    if (targetElem) {
        for (let iKey in ICON_FILES['items']) {
            const icon = ICON_FILES['items'][iKey];
            targetElem.appendChild(getIconElement(icon, ev));
        }
    }
    targetElem = document.getElementById('weapons');
    if (targetElem) {
        for (let iKey in ICON_FILES['weapons']) {
            const icon = ICON_FILES['weapons'][iKey];
            targetElem.appendChild(getIconElement(icon, ev));
        }
    }
    targetElem = document.getElementById('jobs');
    if (targetElem) {
        for (let iKey in ICON_FILES['jobs']) {
            const icon = ICON_FILES['jobs'][iKey];
            targetElem.appendChild(getIconElement(icon, ev));
        }
    }
    targetElem = document.getElementById('nature');
    if (targetElem) {
        for (let iKey in ICON_FILES['nature']) {
            const icon = ICON_FILES['nature'][iKey];
            targetElem.appendChild(getIconElement(icon, ev));
        }
    }
}