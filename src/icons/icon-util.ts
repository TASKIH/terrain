class IconUtil {
    static getCurrentIconAreaElement(src: string, alt: string): Element {
        let element = document.createElement("span");
        element.classList.add('map-symbol');
        let img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        element.appendChild(img);
    
        return element;
    }
}