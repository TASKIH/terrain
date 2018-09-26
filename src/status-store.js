define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ControlStatus;
    (function (ControlStatus) {
        ControlStatus[ControlStatus["None"] = 0] = "None";
        ControlStatus[ControlStatus["IconSelect"] = 1] = "IconSelect";
    })(ControlStatus = exports.ControlStatus || (exports.ControlStatus = {}));
    class CurrentStatusStore {
        constructor() {
            this._controlStatus = ControlStatus.None;
            this.maxIconId = 0;
            this.currentIconPath = "";
            this.currentIconAlt = "";
            this.onControlStatusChangeListeners = [];
        }
        get controlStatus() {
            return this._controlStatus;
        }
        set controlStatus(val) {
            this._controlStatus = val;
            this.onControlStatusChangeListeners.forEach(fn => {
                fn(this._controlStatus);
            });
        }
    }
    exports.CurrentStatusStore = CurrentStatusStore;
    exports.CurrentStatus = new CurrentStatusStore();
});
