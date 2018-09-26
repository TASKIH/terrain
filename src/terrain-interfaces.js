define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // 高さの差を「崖」だとみなす高さ
    exports.CLIFF_BOUNDARY_HEIGHT = 0.05;
    var ShadowLevel;
    (function (ShadowLevel) {
        ShadowLevel[ShadowLevel["Normal"] = 0] = "Normal";
        ShadowLevel[ShadowLevel["Dark1"] = 1] = "Dark1";
        ShadowLevel[ShadowLevel["Dark2"] = 2] = "Dark2";
    })(ShadowLevel = exports.ShadowLevel || (exports.ShadowLevel = {}));
    var MergeMethod;
    (function (MergeMethod) {
        MergeMethod[MergeMethod["Add"] = 0] = "Add";
        MergeMethod[MergeMethod["Average"] = 1] = "Average";
    })(MergeMethod = exports.MergeMethod || (exports.MergeMethod = {}));
    var EventKind;
    (function (EventKind) {
        EventKind[EventKind["IconChanged"] = 0] = "IconChanged";
        EventKind[EventKind["LabelChanged"] = 1] = "LabelChanged";
    })(EventKind = exports.EventKind || (exports.EventKind = {}));
    class VoronoiSiteContainerArray extends Array {
    }
    exports.VoronoiSiteContainerArray = VoronoiSiteContainerArray;
    exports.COAST_LINE_HEIGHT = 0;
});
