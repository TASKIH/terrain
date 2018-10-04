import { CurrentStatusStore, ControlStatus, CurrentStatus } from "./status-store";
import { ICON_FILES } from "./icon-files";

interface IconData {
    name: string,
    path: string,
}

function getCurrentIconAreaElement(src: string, alt: string): Element {
    let element = document.createElement("span");
    element.classList.add('map-symbol');
    let img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    element.appendChild(img);

    return element;
}

function getIconElement(icon: IconData): Element {
    let element = document.createElement("span");
    element.classList.add('map-symbol');
    let img = document.createElement('img');
    img.src = icon.path;
    img.alt = icon.name;

    img.addEventListener("mousedown", (e: any) => {
        if (e && e.target) {
            CurrentStatus.controlStatus = ControlStatus.IconSelect;
            CurrentStatus.currentIconPath = e.target.src;
            CurrentStatus.currentIconAlt = e.target.alt;

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

export function displayIcon() {
    let targetElem = document.getElementById('building');
    if (targetElem) {
        for (let iKey in ICON_FILES['building']) {
            const icon = ICON_FILES['building'][iKey];
            targetElem.appendChild(getIconElement(icon));
        }
    }
    targetElem = document.getElementById('items');
    if (targetElem) {
        for (let iKey in ICON_FILES['items']) {
            const icon = ICON_FILES['items'][iKey];
            targetElem.appendChild(getIconElement(icon));
        }
    }
    targetElem = document.getElementById('weapons');
    if (targetElem) {
        for (let iKey in ICON_FILES['weapons']) {
            const icon = ICON_FILES['weapons'][iKey];
            targetElem.appendChild(getIconElement(icon));
        }
    }
    targetElem = document.getElementById('jobs');
    if (targetElem) {
        for (let iKey in ICON_FILES['jobs']) {
            const icon = ICON_FILES['jobs'][iKey];
            targetElem.appendChild(getIconElement(icon));
        }
    }
    targetElem = document.getElementById('nature');
    if (targetElem) {
        for (let iKey in ICON_FILES['nature']) {
            const icon = ICON_FILES['nature'][iKey];
            targetElem.appendChild(getIconElement(icon));
        }
    }
}