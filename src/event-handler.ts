import { MapRender, MapIcon, EventKind, MapEventListener } from "./terrain-interfaces";
import { CurrentStatusStore, ControlStatus, CurrentStatus } from "./status-store";
import { select } from "../node_modules/@types/d3/index";
import { TerrainUtil } from "./util";

export class MapEventHandler {
    render: MapRender;
    eventListeners: MapEventListener[]
    
    constructor(r: MapRender, e: MapEventListener[]) {
        this.render = r;
        this.eventListeners = e;
    }

    private addIcon(x: number, y: number, iconPath: string, iconAlt: string) {
        const ICON_SIZE = 32;
        const appendIcon: MapIcon = {
            id: CurrentStatus.maxIconId,
            x: x - ICON_SIZE / 2,
            y: y - ICON_SIZE / 2,
            src: iconPath,
            name: iconAlt,
        }

        if (!this.render.icons) {
            this.render.icons = {};
        }
        CurrentStatus.maxIconId++;
        this.render.icons[appendIcon.id] = appendIcon;
        this.eventListeners.forEach(ev => {
            ev.call(EventKind.IconChanged);
        });
    }

    onMeshClick(x: number, y: number): void {
        if (CurrentStatus.controlStatus === ControlStatus.IconSelect) {
            this.addIcon(x, y, CurrentStatus.currentIconPath, CurrentStatus.currentIconAlt);
        }
    }
    onIconClick(icon: MapIcon): void {
        if (CurrentStatus.controlStatus === ControlStatus.None) {
            const selectingIcons = document.getElementsByClassName('now-selecting');
            if (selectingIcons) {
                for(let i = 0;i < selectingIcons.length; i++) {
                    selectingIcons[i].classList.remove('now-selecting')
                }
            }
            const symbolNameDiv = document.getElementById("symbolNameDiv");
            if (!symbolNameDiv) {
                return;
            }
            symbolNameDiv.setAttribute("data-current-id", icon.id.toString());
            const symbolNameInput = <HTMLInputElement>document.getElementById("symbolName");
            if(!symbolNameInput) {
                return;
            }
            symbolNameInput.value = icon.name;

            const nextIconElem = document.getElementById(TerrainUtil.getIconId(icon.id));
            if (nextIconElem) {
                nextIconElem.classList.add('now-selecting');
            }
        }
    }
    onModeChange() {
        if (CurrentStatus.controlStatus === ControlStatus.None) {
            const elems = document.getElementsByTagName("svg");
            for (let i = 0;i < elems.length; i++) {
                elems[i].classList.add("select-mode");
            }
        } else {
            const elems = document.getElementsByTagName("svg");
            for (let i = 0;i < elems.length; i++) {
                elems[i].classList.remove("select-mode");
            }
        }

        const selectingIcons = document.getElementsByClassName('now-selecting');
        if (selectingIcons) {
            for(let i = 0;i < selectingIcons.length; i++) {
                selectingIcons[i].classList.remove('now-selecting')
            }
        }
    }
    
    onReleaseModeClick() {
        CurrentStatus.controlStatus = ControlStatus.None;
        CurrentStatus.currentIconAlt = "";
        CurrentStatus.currentIconPath = "";
        const selectingIconElement = document.getElementById("current-selecting-icon");
        if(selectingIconElement) {
            selectingIconElement.innerHTML = "";
        }
    }

    onNameChangeClick() {
        const inputText = <HTMLInputElement>document.getElementById("symbolName");
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

        if (CurrentStatus.render) {
            CurrentStatus.render.icons![currentIdInt].name = inputedValue;
        }
        
        this.eventListeners.forEach(ev => {
            ev.call(EventKind.LabelChanged);
        });
    }
        
    onDeleteSymbolClick() {
        const inputText = <HTMLInputElement>document.getElementById("symbolName");
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

        if (CurrentStatus.render) {
            delete CurrentStatus.render.icons![currentIdInt];
        }
        
        this.eventListeners.forEach(ev => {
            ev.call(EventKind.IconChanged);
            ev.call(EventKind.LabelChanged);
        });
    }
}
