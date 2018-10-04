import { MapRender, MapIcon, EventKind, MapEventListener, SaveData, MapExtent } from "./terrain-interfaces";
import { CurrentStatusStore, ControlStatus, CurrentStatus } from "./status-store";
import d3, { select, max } from "d3";
import { TerrainUtil } from "./util";
import { ICON_FILES } from "./icon-files";


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
                for (let i = 0; i < selectingIcons.length; i++) {
                    selectingIcons[i].classList.remove('now-selecting')
                }
            }
            const symbolNameDiv = document.getElementById("symbolNameDiv");
            if (!symbolNameDiv) {
                return;
            }
            symbolNameDiv.setAttribute("data-current-id", icon.id.toString());
            const symbolNameInput = <HTMLInputElement>document.getElementById("symbolName");
            if (!symbolNameInput) {
                return;
            }
            symbolNameInput.value = icon.name;

            const nextIconElem = document.getElementById(TerrainUtil.getIconId(icon.id));
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
        if (CurrentStatus.controlStatus === ControlStatus.None) {
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
        } else {
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
                selectingIcons[i].classList.remove('now-selecting')
            }
        }
    }

    onSelectSymbolClick() {
        CurrentStatus.controlStatus = ControlStatus.None;
        CurrentStatus.currentIconAlt = "";
        CurrentStatus.currentIconPath = "";
        const selectingIconElement = document.getElementById("current-selecting-icon");
        if (selectingIconElement) {
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

        if (CurrentStatus.render) {
            delete CurrentStatus.render.icons![currentIdInt];
        }
        this.eventListeners.forEach(ev => {
            ev.call(EventKind.IconChanged);
            ev.call(EventKind.LabelChanged);
        });
    }
    onMapSaveClick() {
        if (!CurrentStatus.render) {
            return;
        }

        const saveObj: string = JSON.stringify({
            mesh: CurrentStatus.render.mesh!,
            h: CurrentStatus.render.h,
            rivers: CurrentStatus.render.rivers,
            icons: CurrentStatus.render.icons,
        });

        const contentType = 'application/octet-stream';
        const a = document.createElement('a');
        const blob = new Blob([saveObj], { 'type': contentType });
        a.href = window.URL.createObjectURL(blob);
        a.download = 'MapData.json';
        a.click();
    }
    onMapLoadClick(evt: any) {
        const files = evt.target.files; // FileList object
        const self = this;
        if (files.length !== 1) {
            return;
        }
        for (let i = 0, f; f = files[i]; i++) {
            const reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function (theFile) {
                return function (e: any) {
                    const data = reader.result;

                    if (typeof data !== 'string') {
                        return;
                    }
                    const saveData = JSON.parse(data) as SaveData;
                    CurrentStatus.render!.mesh = saveData.mesh;
                    CurrentStatus.render!.icons = saveData.icons;
                    CurrentStatus.render!.h = saveData.h;
                    CurrentStatus.render!.rivers = saveData.rivers;
                    CurrentStatus.controlStatus = ControlStatus.None;
                    CurrentStatus.currentIconAlt = '';
                    CurrentStatus.currentIconPath = '';
                    let maxIconId = 0;
                    for (let key in CurrentStatus.render!.icons!) {
                        const icon = CurrentStatus.render!.icons![key];
                        if (icon.id > maxIconId) {
                            maxIconId = icon.id;
                        }
                    }

                    CurrentStatus.maxIconId = maxIconId;

                    self.eventListeners.forEach(ev => {
                        ev.call(EventKind.WholeMapChanged);
                    });
                };
            })(f);

            reader.readAsText(f);
        }
    }
    onMapExport(svgId: string) {
        const OFF_SCREEN_CANVAS_ID = "svgOffScreeenRenderCanvas";
        const OFF_SCREEN_CANVAS_CLASS = "svg-off-screen-render-canvas";

        function saveToPngByCanvg(callback: any) {
            var svg = document.getElementById(svgId);
            var svgStr = new XMLSerializer().serializeToString(svg!);

            var canvas = document.getElementById(OFF_SCREEN_CANVAS_ID) as HTMLCanvasElement;
            if (!canvas) {
                var svgW = svg!.getAttribute('width');
                var svgH = svg!.getAttribute('height');
                canvas = createOffScreenCanvas(svgW!, svgH!);
            }
            // @ts-ignore
            canvg(OFF_SCREEN_CANVAS_ID, svgStr, {
                renderCallback:function(data: any){
                    if(callback){
                        var newData = canvas!.toDataURL('image/png');
                        callback(newData);
                        document.removeChild(document.getElementById(OFF_SCREEN_CANVAS_ID)!);
                    }
                }
            });
        }

        function createOffScreenCanvas(width: string, height: string) {
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
            document.querySelector('body')!.appendChild(newCanvas);
            return newCanvas;
        }

        saveToPngByCanvg((imgData: any) => {
            const a = document.createElement('a');
            a.href = imgData;
            a.download = 'MapData.png';
            a.id = "imglink"
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }
}