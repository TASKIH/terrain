import { CurrentStatusStore, ControlStatus, CurrentStatus } from "./status-store";

interface IconData {
    name: string,
    path: string,
}

const buildingIcons: {[key: string]: IconData} = {
    'build-bank': {
        name: 'bank',
        path: './resources/building/bank.png'
    }
};

const natureIcons = [

];

const jobIcons = [

];

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
        for (let iKey in buildingIcons) {
            const icon = buildingIcons[iKey];
            targetElem.appendChild(getIconElement(icon));
        }
    }
}