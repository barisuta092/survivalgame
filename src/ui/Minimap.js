export class Minimap {
    constructor(world) {
        this.world = world;
        this.size = 200; // 直径
        this.scale = 0.1; // ワールド座標 -> ミニマップ座標の縮尺 (10倍縮小表示)
        this.margin = 20; // 画面端からのマージン

        // パフォーマンスのためのキャッシュキャンバス
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = this.size;
        this.cacheCanvas.height = this.size;
        this.cacheCtx = this.cacheCanvas.getContext('2d');

        this.lastUpdate = 0;
        this.updateInterval = 0.1; // キャッシュ更新頻度 (10FPS)
    }

    update(dt) {
        this.lastUpdate += dt;
        if (this.lastUpdate > this.updateInterval) {
            this.updateCache();
            this.lastUpdate = 0;
        }
    }

    updateCache() {
        const ctx = this.cacheCtx;
        const w = this.size;
        const h = this.size;
        const r = this.size / 2;
        const cx = r;
        const cy = r;

        // クリア
        ctx.clearRect(0, 0, w, h);

        // マスク（円形）
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // 背景（半透明の黒または地形色）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, h);

        // 地形/バイオーム描画 (簡易的)
        // プレイヤー中心に周囲をスキャンして色を置くのは重いので、
        // 視界内の重要なオブジェクトだけプロットする方式にする

        // 範囲計算 (プレイヤー中心)
        const range = (this.size / 2) / this.scale;

        // 資源
        if (this.world.resources) {
            for (const res of this.world.resources) {
                if (res.isDepleted) continue;
                this.drawDot(ctx, res.x, res.y, range, res.size * this.scale, this.getResourceColor(res.type));
            }
        }

        // 建物
        if (this.world.buildings) {
            for (const b of this.world.buildings) {
                if (b.destroyed) continue;
                this.drawDot(ctx, b.x, b.y, range, b.size * this.scale, '#3b82f6'); // 青
            }
        }

        // 敵 (赤)
        if (this.world.enemies) {
            for (const e of this.world.enemies) {
                if (e.destroyed) continue;
                this.drawDot(ctx, e.x, e.y, range, e.width * this.scale, '#ef4444');
            }
        }

        ctx.restore();

        // 枠線
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawDot(ctx, worldX, worldY, range, dotSize, color) {
        const px = this.world.player.x;
        const py = this.world.player.y;

        const dx = worldX - px;
        const dy = worldY - py;

        if (Math.abs(dx) > range || Math.abs(dy) > range) return;

        const mapX = this.size / 2 + dx * this.scale;
        const mapY = this.size / 2 + dy * this.scale;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mapX, mapY, Math.max(1, dotSize), 0, Math.PI * 2);
        ctx.fill();
    }

    getResourceColor(type) {
        switch (type) {
            case 'tree': return '#166534'; // 深緑
            case 'stone': return '#9ca3af'; // グレー
            case 'iron': return '#d1d5db'; // 明るいグレー
            case 'cooper': return '#b45309'; // 銅色
            case 'coal': return '#1f2937'; // 濃いグレー
            case 'sulfur': return '#fde047'; // 黄色
            default: return '#ffffff';
        }
    }

    draw(ctx) {
        const x = ctx.canvas.width - this.size - this.margin;
        const y = this.margin;

        // キャッシュを描画
        ctx.drawImage(this.cacheCanvas, x, y);

        // プレイヤー（中心）
        const cx = x + this.size / 2;
        const cy = y + this.size / 2;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // 向いている方向（矢印）
        // プレイヤーの向き情報は現在World/Playerにないので省略、あるいはマウス位置から計算可能だが一旦ドットのみ

        // ラベル (N)
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, y - 5);
    }
}
