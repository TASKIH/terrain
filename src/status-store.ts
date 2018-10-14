import { MapRender } from "./terrain-interfaces";

export enum ControlStatus {
    None,
    IconSelect,
}
export class CurrentStatusStore {
    _controlStatus: ControlStatus = ControlStatus.None;
    get controlStatus(): ControlStatus {
        return this._controlStatus;
    }
    set controlStatus(val: ControlStatus) {
        this._controlStatus = val;
        this.onControlStatusChangeListeners.forEach(fn => {
            fn(this._controlStatus);
        });
    }

    maxIconId: number = 0;
    currentIconPath: string = "";
    currentIconAlt: string = "";
    currentIconType: string = "";
    iconOption: any = {};
    render?: MapRender;

    onControlStatusChangeListeners: ((ev: ControlStatus) => void)[] = []
}

export let CurrentStatus: CurrentStatusStore = new CurrentStatusStore();