export class LoadingHandler {
    private static LoadingElementId = 'loading-screen';
    private static LoadingTextElementId = 'loading-status';

    private static DefaultLoadingText = '少々お待ちください。。。';
    static setLoadingVisibility(showLoading: boolean, text?: string) {
        text = text || this.DefaultLoadingText;

        const loadingElement = document.getElementById(this.LoadingElementId);
        if (!loadingElement) {
            return;
        }

        const setModeStr = (showLoading)? 'visible' : 'collapse';
        loadingElement.style.visibility = setModeStr;

        const loadingTextElement = document.getElementById(this.LoadingTextElementId);
        if (!loadingTextElement) {
            return;
        }

        loadingTextElement.innerText = text;
    }
}