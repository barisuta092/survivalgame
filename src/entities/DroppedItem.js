export class DroppedItem {
    constructor(x, y, itemId, count = 1) {
        this.x = x;
        this.y = y;
        this.itemId = itemId;
        this.count = count;

        this.vx = (Math.random() - 0.5) * 100;
        this.vy = (Math.random() - 0.5) * 100;
        this.friction = 0.92;

        this.pickupRadius = 50;
        this.isPickedUp = false;

        this.floatingTimer = Math.random() * Math.PI * 2;

        this.lifeTime = 0;
        this.maxLife = 300; // 5 minutes (300 seconds)
    }

    update(dt) {
        if (this.isPickedUp) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        this.vx *= this.friction;
        this.vy *= this.friction;

        this.floatingTimer += dt * 3;

        this.lifeTime += dt;
        if (this.lifeTime >= this.maxLife) {
            this.destroyed = true;
        }
    }

    draw(ctx, game) {
        if (this.isPickedUp) return;

        const floatOffset = Math.sin(this.floatingTimer) * 5;

        ctx.save();
        ctx.translate(this.x, this.y);

        // デバッグ用: 巨大な影 (確実に見えるように)
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // アイコン (Game.getItemIconを使用)
        if (game) {
            const icon = game.getItemIcon(this.itemId);
            if (icon) {
                ctx.drawImage(icon, -16, -16 + floatOffset, 32, 32);
            } else {
                // フォールバック: 控えめなアイコン
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.arc(0, floatOffset, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 数表示
        if (this.count > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.count, 0, 25 + floatOffset);
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - 15,
            y: this.y - 15,
            width: 30,
            height: 30
        };
    }
}
