export class Bullet {
    constructor(x, y, dx, dy, speed, damage) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.speed = speed;
        this.damage = damage;
        this.radius = 4;
        this.lifetime = 2; // 秒
        this.destroyed = false;
    }

    update(dt) {
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;

        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.destroyed = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 敵との当たり判定
    checkHit(enemy) {
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + enemy.width / 2;
    }
}
