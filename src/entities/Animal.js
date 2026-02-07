import { textureManager } from '../systems/TextureManager.js';

export class Animal {
    constructor(x, y, type = 'deer') {
        this.x = x;
        this.y = y;
        this.type = type;

        this.health = 40;
        this.maxHealth = 40;
        this.speed = 60;
        this.runSpeed = 150;

        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = this.angle;

        this.state = 'idle'; // idle, wandering, running
        this.stateTimer = 0;

        this.width = 25;
        this.height = 25;
        this.isDead = false;
    }

    update(dt, world) {
        if (this.isDead) return;

        this.stateTimer -= dt;

        if (this.state === 'idle') {
            if (this.stateTimer <= 0) {
                this.state = 'wandering';
                this.stateTimer = 2 + Math.random() * 3;
                this.targetAngle = Math.random() * Math.PI * 2;
            }
        } else if (this.state === 'wandering') {
            // 徐々にターゲット角度へ
            this.angle += (this.targetAngle - this.angle) * 0.1;
            this.x += Math.cos(this.angle) * this.speed * dt;
            this.y += Math.sin(this.angle) * this.speed * dt;

            if (this.stateTimer <= 0) {
                this.state = 'idle';
                this.stateTimer = 1 + Math.random() * 2;
            }
        } else if (this.state === 'running') {
            this.x += Math.cos(this.angle) * this.runSpeed * dt;
            this.y += Math.sin(this.angle) * this.runSpeed * dt;

            if (this.stateTimer <= 0) {
                this.state = 'idle';
                this.stateTimer = 2;
            }
        }

        // マップ端制限
        this.x = Math.max(20, Math.min(world.width - 20, this.x));
        this.y = Math.max(20, Math.min(world.height - 20, this.y));
    }

    takeDamage(amount, world) {
        if (this.isDead) return { items: null, sfxType: 'organic' };

        this.health -= amount;
        this.state = 'running';
        this.stateTimer = 3;
        // プレイヤーとは逆方向に逃げる
        if (world.player) {
            const dx = this.x - world.player.x;
            const dy = this.y - world.player.y;
            this.angle = Math.atan2(dy, dx);
        }

        if (this.health <= 0) {
            return { items: this.die(), sfxType: 'organic' };
        }
        return { items: null, sfxType: 'organic' };
    }

    die() {
        this.isDead = true;
        return [
            { id: 'raw_meat', count: Math.floor(Math.random() * 2) + 1 },
            { id: 'leather', count: Math.floor(Math.random() * 2) + 1 } // Add leather
        ];
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // テクスチャ描画
        const tex = textureManager.get('deer');
        if (tex) {
            // 動物のテクスチャが上向き(angle=Math.PI*1.5)か右向き(angle=0)かによるが、
            // プレイヤー同様に調整
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(tex, -this.width, -this.height, this.width * 2, this.height * 2);
        } else {
            // 改良された鹿の描画
            // 体（楕円、より鹿らしい形状）
            const bodyGrd = ctx.createLinearGradient(-5, -5, 5, 5);
            bodyGrd.addColorStop(0, '#d97706');
            bodyGrd.addColorStop(0.5, '#b45309');
            bodyGrd.addColorStop(1, '#92400e');
            ctx.fillStyle = bodyGrd;
            ctx.beginPath();
            ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 頭（楕円）
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.ellipse(14, 0, 7, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.stroke();

            // 鼻
            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(20, 0, 2, 0, Math.PI * 2);
            ctx.fill();

            // 目
            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(16, -3, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // 耳（改良）
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.ellipse(12, -5, 3, 5, -Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(12, 5, 3, 5, Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
            // 耳の内側（ピンク）
            ctx.fillStyle = '#fecaca';
            ctx.beginPath();
            ctx.ellipse(12, -5, 1.5, 3, -Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(12, 5, 1.5, 3, Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();

            // 足（4本）
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            // 前足
            ctx.beginPath();
            ctx.moveTo(6, 8);
            ctx.lineTo(6, 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(10, 8);
            ctx.lineTo(10, 14);
            ctx.stroke();
            // 後ろ足
            ctx.beginPath();
            ctx.moveTo(-6, 8);
            ctx.lineTo(-6, 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-10, 8);
            ctx.lineTo(-10, 14);
            ctx.stroke();

            // 尾
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.ellipse(-16, 0, 4, 3, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // ハイライト（体の上部）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.ellipse(0, -3, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}
