import { audioManager } from '../systems/AudioManager.js';

export class Bomb {
    constructor(x, y, vx, vy, world) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.world = world;

        this.radius = 10;
        this.friction = 0.95; // 減速
        this.timer = 2.0; // 2秒後に爆発
        this.bounces = 0;

        this.destroyed = false;
    }

    update(dt) {
        // 移動
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 減速
        this.vx *= this.friction;
        this.vy *= this.friction;

        // 建物との当たり判定（跳ね返り）
        this.checkCollision();

        // タイマー更新
        this.timer -= dt;
        if (this.timer <= 0) {
            this.explode();
        }
    }

    checkCollision() {
        for (const building of this.world.buildings) {
            if (building.destroyed) continue;
            const bounds = building.getBounds();

            // 簡易的なAABB衝突判定と跳ね返り
            if (this.x + this.radius > bounds.x && this.x - this.radius < bounds.x + bounds.width &&
                this.y + this.radius > bounds.y && this.y - this.radius < bounds.y + bounds.height) {

                // どこから当たったか判定して跳ね返る
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;

                const dx = this.x - centerX;
                const dy = this.y - centerY;

                if (Math.abs(dx) > Math.abs(dy)) {
                    this.vx *= -0.7; // 横方向反転＆減衰
                    this.x += Math.sign(dx) * 2; // 押し出し
                } else {
                    this.vy *= -0.7; // 縦方向反転＆減衰
                    this.y += Math.sign(dy) * 2; // 押し出し
                }

                if (Math.abs(this.vx) + Math.abs(this.vy) > 50) {
                    // 跳ね返り音（あれば）
                }
            }
        }
    }

    explode() {
        this.destroyed = true;

        // 爆発生成 (ダメージ100, 半径150)
        this.world.createExplosion(this.x, this.y, 100, 150);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 点滅エフェクト
        const flash = Math.floor(this.timer * 10) % 2 === 0;

        ctx.fillStyle = flash ? '#ef4444' : '#1f2937';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 導火線の火花
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -this.radius, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
