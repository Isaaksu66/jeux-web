class AssetLoader {
    constructor() {
        this.images = {};
        this.totalImages = 0;
        this.loadedImages = 0;
    }

    loadImages(imagePaths, onComplete) {
        const keys = Object.keys(imagePaths);
        this.totalImages = keys.length;

        if (this.totalImages === 0) {
            onComplete();
            return;
        }

        keys.forEach(key => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages++;
                if (this.loadedImages === this.totalImages) {
                    onComplete();
                }
            };
            img.onerror = () => {
                console.error("Failed to load image: " + imagePaths[key]);
                this.loadedImages++;
                if (this.loadedImages === this.totalImages) {
                    onComplete(); // On continue même en cas d'erreur
                }
            };
            img.src = imagePaths[key];
            this.images[key] = img;
        });
    }

    get(key) {
        return this.images[key];
    }
}

const Assets = new AssetLoader();
