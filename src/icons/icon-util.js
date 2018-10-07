define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class IconUtil {
        static getCurrentIconAreaElement(src, alt) {
            let element = document.createElement("span");
            element.classList.add('map-symbol');
            let img = document.createElement('img');
            img.src = src;
            img.alt = alt;
            element.appendChild(img);
            return element;
        }
    }
    exports.IconUtil = IconUtil;
});
