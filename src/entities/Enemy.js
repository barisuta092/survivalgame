import { textureManager } from '../systems/TextureManager.js';

export const EnemyType = {
    NORMAL: 'normal',
    POWER: 'power',
    RANGER: 'ranger',
    // Biome Variants
    FOREST: 'forest_zombie',
    DESERT: 'desert_zombie',
    SNOW: 'snow_zombie'
};

const EnemyConfig = {
    [EnemyType.NORMAL]: { hp: 50, damage: 10, speed: 50, color: '#22c55e', size: 28 }, // Green
    [EnemyType.POWER]: { hp: 100, damage: 25, speed: 35, color: '#dc2626', size: 36 }, // Red
    [EnemyType.RANGER]: { hp: 30, damage: 15, speed: 50, color: '#a855f7', size: 24, ranged: true, attackRange: 300, fireRate: 3 }, // Purple

    // Biome Variants Configuration
    [EnemyType.FOREST]: { hp: 60, damage: 12, speed: 55, color: '#166534', size: 28 }, // Dark Green (Forest)
    [EnemyType.DESERT]: { hp: 40, damage: 8, speed: 80, color: '#eab308', size: 26 }, // Yellow (Desert) - Fast but weak
    [EnemyType.SNOW]: { hp: 120, damage: 15, speed: 30, color: '#bae6fd', size: 32 }, // Light Blue (Snow) - Slow but tanky
};

export class Enemy {
    constructor(x, y, type = EnemyType.NORMAL) {
        this.x = x;
        this.y = y;
        this.type = type;

        const config = EnemyConfig[type];
        this.maxHp = config.hp;
        this.hp = this.maxHp;
        this.damage = config.damage;
        this.speed = config.speed;
        this.color = config.color;
        this.width = config.size;
        this.height = config.size;

        this.isRanged = config.ranged || false;
        this.attackRange = config.attackRange || 40;
        this.fireRate = config.fireRate || 1;
        this.attackCooldown = 0;

        this.targetWall = null;
        this.destroyed = false;

        // ランダム徘徊用
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderChangeInterval = 2 + Math.random() * 3; // 2-5秒ごとに方向変更
    }

    update(dt, player, walls, world) {
        if (this.destroyed) return;

        this.attackCooldown -= dt;
        this.wanderTimer += dt;

        // プレイヤーとの距離
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        // プレイヤー認識距離（400ピクセル以内のみ認識）
        const recognitionRange = 400;

        if (distToPlayer > recognitionRange) {
            // プレイヤーが遠すぎる場合はランダムに徘徊
            if (this.wanderTimer >= this.wanderChangeInterval) {
                this.wanderAngle = Math.random() * Math.PI * 2;
                this.wanderTimer = 0;
                this.wanderChangeInterval = 2 + Math.random() * 3;
            }

            // 徘徊移動
            this.x += Math.cos(this.wanderAngle) * this.speed * 0.3 * dt;
            this.y += Math.sin(this.wanderAngle) * this.speed * 0.3 * dt;
            return;
        }

        // プレイヤーを発見した場合
        // まず、プレイヤーへの経路上に障害物（壁）があるかチェック
        const obstacleWall = this.findObstacleWall(walls, player);

        if (obstacleWall) {
            // 障害物がある場合はそれを破壊する
            const wdx = obstacleWall.x - this.x;
            const wdy = obstacleWall.y - this.y;
            const wdist = Math.sqrt(wdx * wdx + wdy * wdy);

            if (wdist > 30) {
                this.x += (wdx / wdist) * this.speed * dt;
                this.y += (wdy / wdist) * this.speed * dt;
            } else {
                // 壁を攻撃
                if (this.attackCooldown <= 0) {
                    obstacleWall.takeDamage(this.damage);
                    this.attackCooldown = 1;
                }
            }
        } else {
            // 障害物がない場合はプレイヤーに向かって移動・攻撃
            if (this.isRanged && distToPlayer < this.attackRange) {
                // 遠距離敵: 射程内なら攻撃
                if (this.attackCooldown <= 0) {
                    world.spawnEnemyBullet(this.x, this.y, dx / distToPlayer, dy / distToPlayer, 300, this.damage);
                    this.attackCooldown = this.fireRate;
                }
            } else if (distToPlayer > 30) {
                // 移動
                this.x += (dx / distToPlayer) * this.speed * dt;
                this.y += (dy / distToPlayer) * this.speed * dt;
            } else {
                // 近接攻撃
                if (this.attackCooldown <= 0 && !this.isRanged) {
                    player.takeDamage(this.damage, world);
                    this.attackCooldown = 1;
                }
            }
        }
    }

    // プレイヤーへの経路上の障害物を探す
    findObstacleWall(walls, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        // プレイヤーまでの経路上に壁があるか探す
        for (const wall of walls) {
            const wdx = wall.x - this.x;
            const wdy = wall.y - this.y;
            const distToWall = Math.sqrt(wdx * wdx + wdy * wdy);

            // 壁がプレイヤーより近く、プレイヤーへの方向と壁への方向が似ている場合
            if (distToWall < distToPlayer && distToWall < 200) {
                const angleToPlayer = Math.atan2(dy, dx);
                const angleToWall = Math.atan2(wdy, wdx);
                const angleDiff = Math.abs(angleToPlayer - angleToWall);

                // 角度差が30度以内なら経路上の障害物とみなす
                if (angleDiff < Math.PI / 6 || angleDiff > Math.PI * 2 - Math.PI / 6) {
                    return wall;
                }
            }
        }
        return null;
    }

    findNearestWall(walls) {
        let nearest = null;
        let minDist = 200; // 壁探索範囲

        for (const wall of walls) {
            const dx = wall.x - this.x;
            const dy = wall.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = wall;
            }
        }

        return nearest;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.destroyed = true;
            return { items: [], sfxType: 'organic' };
        }
        return { items: null, sfxType: 'organic' };
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    draw(ctx) {
        if (this.destroyed) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // ボディ/テクスチャ
        let texKey = 'zombie_normal';
        if (this.type === 'power') texKey = 'zombie_power';
        if (this.type === 'ranger') texKey = 'zombie_ranger';

        const tex = textureManager.get(texKey);
        if (tex) {
            // 敵はターゲット（プレイヤー）の方向を向くように調整が必要かもしれないが、
            // 現状は単純に描画
            ctx.drawImage(tex, -this.width, -this.height, this.width * 2, this.height * 2);
        } else {
            // 改良されたゾンビの描画
            // 体（楕円）
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 2, this.width / 2.2, this.height / 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 頭（円）
            const headSize = this.width / 2.5;
            ctx.fillStyle = this.adjustColor(this.color, 20);
            ctx.beginPath();
            ctx.arc(0, -this.height / 4, headSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 目（不気味な赤い光）
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.arc(-headSize / 2.5, -this.height / 4 - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(headSize / 2.5, -this.height / 4 - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 口（暗い線）
            ctx.strokeStyle = '#2a1a1a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -this.height / 4 + 4, headSize / 3, 0.2, Math.PI - 0.2);
            ctx.stroke();

            // 腕（左右）
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            // 左腕
            ctx.beginPath();
            ctx.moveTo(-this.width / 3, 0);
            ctx.lineTo(-this.width / 2 - 3, this.height / 4);
            ctx.stroke();
            // 右腕
            ctx.beginPath();
            ctx.moveTo(this.width / 3, 0);
            ctx.lineTo(this.width / 2 + 3, this.height / 4);
            ctx.stroke();

            // タイプ別のエフェクト
            if (this.type === 'power') {
                // パワータイプ: 筋肉質なアウトライン
                ctx.strokeStyle = 'rgba(139, 0, 0, 0.6)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, 2, this.width / 2.2, this.height / 2.5, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (this.type === 'ranger') {
                // レンジャータイプ: 紫のオーラ
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#a855f7';
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 1.8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // HPバー
        if (this.hp < this.maxHp) {
            const barWidth = 30;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-barWidth / 2, -this.height / 2 - 10, barWidth, 5);
            ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(-barWidth / 2, -this.height / 2 - 10, barWidth * ratio, 5);
        }

        ctx.restore();
    }

    // ヘルパー: 色を明るくまたは暗く調整
    adjustColor(color, amount) {
        if (!color.startsWith('#')) return color;
        const num = parseInt(color.slice(1), 16);
        let r = Math.min(255, Math.max(0, (num >> 16) + amount));
        let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}
