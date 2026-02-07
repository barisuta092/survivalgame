export class TextureManager {
    constructor() {
        this.textures = {};
        this.loadedCount = 0;
        this.totalCount = 0;
        this.onComplete = null;
    }

    load(key, path, removeBackground = false) {
        this.totalCount++;
        const img = new Image();
        img.src = path;
        img.crossOrigin = "anonymous"; // Canvas操作用
        img.onload = () => {
            if (removeBackground) {
                this.textures[key] = this.processTransparency(img);
            } else {
                this.textures[key] = img;
            }
            this.loadedCount++;
            if (this.loadedCount === this.totalCount && this.onComplete) {
                this.onComplete();
            }
        };
        img.onerror = () => {
            console.error(`Failed to load texture: ${path}`);
            this.loadedCount++;
        };
    }

    processTransparency(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 背景色（白に近い色）を透明にする
        // AI生成画像の背景は完全な白(255,255,255)でない場合があるため許容値(threshold)を設ける
        const threshold = 240;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > threshold && g > threshold && b > threshold) {
                data[i + 3] = 0; // Alphaを0に
            }
        }
        ctx.putImageData(imageData, 0, 0);

        const newImg = new Image();
        newImg.src = canvas.toDataURL();
        return newImg;
    }

    get(key) {
        return this.textures[key] || null;
    }

    isLoaded() {
        return this.totalCount > 0 && this.loadedCount === this.totalCount;
    }
}

export const textureManager = new TextureManager();
