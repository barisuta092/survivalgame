import { audioManager } from '../systems/AudioManager.js';

export class Explosion {
    constructor(x, y, damage, radius, world) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.radius = radius;
        this.world = world;

        this.timer = 0;
        this.duration = 0.5; // エフェクトの持続時間
        this.hasDealtDamage = false;

        // エフェクト用パーティクル
        this.particles = [];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * radius * 3;
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: Math.random() * 10 + 5,
                color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444' // 黄色か赤
            });
        }

        audioManager.playExplosion();
    }

    update(dt) {
        this.timer += dt;

        // ダメージ判定（最初のフレームでのみ実行）
        if (!this.hasDealtDamage) {
            this.dealDamage();
            this.hasDealtDamage = true;
        }

        // パーティクル更新
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2;
            p.vx *= 0.9; // 減速
            p.vy *= 0.9;
        });

        return this.timer < this.duration;
    }

    dealDamage() {
        // プレイヤー
        const distToPlayer = Math.sqrt((this.world.player.x - this.x) ** 2 + (this.world.player.y - this.y) ** 2);
        if (distToPlayer < this.radius) {
            // 中心に近いほどダメージ大
            const dmg = Math.floor(this.damage * (1 - distToPlayer / this.radius));
            this.world.player.takeDamage(dmg);
        }

        // 敵
        this.world.enemies.forEach(enemy => {
            if (enemy.dead) return;
            const dist = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
            if (dist < this.radius) {
                const dmg = Math.floor(this.damage * (1 - dist / this.radius));
                enemy.takeDamage(dmg);
            }
        });

        // 資源（鉱石など）
        this.world.resources.forEach(res => {
            if (res.depleted) return;
            // 簡易的な距離判定（矩形中心との距離）
            const bounds = res.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const dist = Math.sqrt((cx - this.x) ** 2 + (cy - this.y) ** 2);

            if (dist < this.radius) {
                // 爆発はツルハシ属性として扱う（破壊可能）
                const dmg = 200; // 一撃で壊れる程度
                const result = res.takeDamage(dmg, 'pickaxe', 1.0);
                if (result && result.items) {
                    result.items.forEach(item => {
                        this.world.spawnDrop(cx, cy, item.id, item.count);
                    });
                }
            }
        });

        // 建物（壁など）
        this.world.buildings.forEach(bld => {
            if (bld.destroyed) return;
            const bounds = bld.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const dist = Math.sqrt((cx - this.x) ** 2 + (cy - this.y) ** 2);

            if (dist < this.radius) {
                bld.takeDamage(this.damage);
            }
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 爆風
        const progress = this.timer / this.duration;
        const currentRadius = this.radius * (0.2 + 0.8 * Math.sin(progress * Math.PI));

        ctx.fillStyle = `rgba(255, 69, 0, ${0.7 * (1 - progress)})`;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // パーティクル
        this.particles.forEach(p => {
            if (p.life <= 0) return;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
}
