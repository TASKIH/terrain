import { MapRender, MapIcon, EventKind, MapEventListener, SaveData, MapExtent, MergeMethod } from "./terrain-interfaces";
import { CurrentStatusStore, ControlStatus, CurrentStatus } from "./status-store";
import d3, { select, max } from "d3";
import { TerrainUtil } from "./util";
import { ICON_FILES } from "./icons/icon-files";
import { IconUtil } from "./icons/icon-util";
import { LoadingHandler } from "./loading-handler";
import { TerrainGenerator } from "./terrain-generator";
import { TerrainDrawer } from "./terrain-drawer";


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
            fontSize: 12,
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

    private modifyTerrain(x: number, y: number, topHeight: number, radius: number) {
        if (!this.render.icons) {
            this.render.icons = {};
        }

        if (!CurrentStatus.render) {
            return;
        }

        LoadingHandler.setLoadingVisibility(true, '生成中...');

        const self = this;
        setTimeout(function(){
            try{
                const myRender = CurrentStatus.render!;
                myRender.h = TerrainGenerator.mergeHeights(myRender.mesh!, MergeMethod.Add,
                    myRender.h,
                TerrainGenerator.calcMountHeights(self.render.mesh!, topHeight, radius, x, y));
                
                myRender.coasts = TerrainDrawer.generateContour(myRender.mesh!, myRender.h, 0);

                self.eventListeners.forEach(ev => {
                    ev.call(EventKind.WholeMapChanged);
                });
            } finally {
                LoadingHandler.setLoadingVisibility(false, '生成中...');
            }
        }, 50);
    }

    private setSymbolDivVisibility(isVisible: boolean): void {
        const selectModeDiv = document.getElementById('select-mode-div');
        if (!selectModeDiv) {
            return;
        }
        const selectModeShadowDiv = document.getElementById('select-mode-whole-shadow');
        if (!selectModeShadowDiv) {
            return;
        }
        const setModeStr = (isVisible)? 'visible' : 'collapse';
        selectModeDiv.style.visibility = setModeStr;
        selectModeShadowDiv.style.visibility = setModeStr;
    }

    onMeshClick(x: number, y: number): void {
        if (CurrentStatus.controlStatus === ControlStatus.IconSelect) {
            if (CurrentStatus.currentIconType == 'terrain') {
                this.modifyTerrain(x, y, parseFloat(CurrentStatus.iconOption.topHeight), parseFloat(CurrentStatus.iconOption.radius));
            } else {
                this.addIcon(x, y, CurrentStatus.currentIconPath, CurrentStatus.currentIconAlt);
            }
        }
    }
    // 地図上のSymbolをクリックした時のイベント
    onClickSymbolOnMap(icon: MapIcon, d3Event: any): void {
        if (CurrentStatus.controlStatus === ControlStatus.None) {
            const selectingIcons = document.getElementsByClassName('now-selecting');
            if (selectingIcons) {
                for (let i = 0; i < selectingIcons.length; i++) {
                    selectingIcons[i].classList.remove('now-selecting')
                }
            }
            const symbolNameDiv = document.getElementById("symbolNameDiv");
            if (!symbolNameDiv) {
                console.log('her1');
                return;
            }
            symbolNameDiv.setAttribute("data-current-id", icon.id.toString());
            const symbolNameInput = <HTMLInputElement>document.getElementById("symbolName");
            if (!symbolNameInput) {
                console.log('her2');
                return;
            }
            symbolNameInput.value = icon.name;

            const symbolSizeInput = <HTMLInputElement>document.getElementById("symbolFontSize");
            if (!symbolSizeInput) {
                console.log('her13');
                return;
            }
            symbolSizeInput.value = icon.fontSize.toString();

            const nextIconElem = document.getElementById(TerrainUtil.getIconId(icon.id));
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
            this.setSymbolDivVisibility(false);
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
        CurrentStatus.currentIconType = "";
        CurrentStatus.iconOption = {};
        const selectingIconElement = document.getElementById("current-selecting-icon");
        if (selectingIconElement) {
            selectingIconElement.innerHTML = "";
        }
    }
    onSelectSymbolOnIconList(e: any) {
        CurrentStatus.controlStatus = ControlStatus.IconSelect;
        CurrentStatus.currentIconPath = e.target.src;
        CurrentStatus.currentIconAlt = e.target.alt;
        CurrentStatus.currentIconType = e.target.getAttribute('data-icon-type');

        CurrentStatus.iconOption = {
            topHeight: e.target.getAttribute('data-top-height'),
            radius: e.target.getAttribute('data-radius'),
        };

        const currentIconArea = document.getElementById('current-selecting-icon');
        if (currentIconArea) {
            currentIconArea.textContent = null;
            currentIconArea.appendChild(IconUtil.getCurrentIconAreaElement(e.target.src, e.target.alt));
        }
    }
    onSymbolChangeClick() {
        const inputText = <HTMLInputElement>document.getElementById("symbolName");
        if (!inputText) {
            return;
        }

        const symbolSizeInput = <HTMLInputElement>document.getElementById("symbolFontSize");
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

        if (CurrentStatus.render) {
            CurrentStatus.render.icons![currentIdInt].name = inputedValue;
            CurrentStatus.render.icons![currentIdInt].fontSize = inputedFontSize || 12;
        }

        this.eventListeners.forEach(ev => {
            ev.call(EventKind.LabelChanged);
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

        if (CurrentStatus.render) {
            delete CurrentStatus.render.icons![currentIdInt];
        }
        this.eventListeners.forEach(ev => {
            ev.call(EventKind.IconChanged);
            ev.call(EventKind.LabelChanged);
        });
        this.setSymbolDivVisibility(false);
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
                    try {
                        const saveData = JSON.parse(data) as SaveData;
                        CurrentStatus.render!.mesh = saveData.mesh;
                        CurrentStatus.render!.icons = saveData.icons;
                        CurrentStatus.render!.h = saveData.h;
                        CurrentStatus.render!.rivers = saveData.rivers;
                        CurrentStatus.controlStatus = ControlStatus.None;
                        CurrentStatus.currentIconAlt = '';
                        CurrentStatus.currentIconPath = '';
                        CurrentStatus.currentIconType = '';
                        CurrentStatus.iconOption = {};
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
                    } catch(err) {
                        // @ts-ignore
                        M.toast({html: 'ファイルの読み込みができませんでした'});
                    }


                    LoadingHandler.setLoadingVisibility(false);
                };
            })(f);

            reader.readAsText(f);
        }
    }
    onSelModeShadowClick() {
        this.setSymbolDivVisibility(false);
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
                        const body = document.getElementsByTagName('body');
                        body[0].removeChild(document.getElementById(OFF_SCREEN_CANVAS_ID)!);
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
            LoadingHandler.setLoadingVisibility(false);
        });
    }
}