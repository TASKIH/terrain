define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LoadingHandler {
        static setLoadingVisibility(showLoading, text) {
            text = text || this.DefaultLoadingText;
            const loadingElement = document.getElementById(this.LoadingElementId);
            if (!loadingElement) {
                return;
            }
            const setModeStr = (showLoading) ? 'visible' : 'collapse';
            loadingElement.style.visibility = setModeStr;
            const loadingTextElement = document.getElementById(this.LoadingTextElementId);
            if (!loadingTextElement) {
                return;
            }
            loadingTextElement.innerText = text;
        }
    }
    LoadingHandler.LoadingElementId = 'loading-screen';
    LoadingHandler.LoadingTextElementId = 'loading-status';
    LoadingHandler.DefaultLoadingText = '少々お待ちください。。。';
    exports.LoadingHandler = LoadingHandler;
});
