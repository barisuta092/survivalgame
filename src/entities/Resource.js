import { textureManager } from '../systems/TextureManager.js';

// 資源タイプ
export const ResourceType = {
    TREE: 'tree',
    STONE: 'stone',
    IRON: 'iron',
    COPPER: 'copper',
    COAL: 'coal',
    BERRY_BUSH: 'berry_bush',
    SULFUR: 'sulfur'
};

const ResourceConfig = {
    [ResourceType.TREE]: { hp: 50, preferredTool: 'axe', drops: [{ id: 'wood', min: 2, max: 4 }], color: '#4d7c0f', size: 40, respawnTime: 120, sfxType: 'wood' },
    [ResourceType.STONE]: { hp: 40, preferredTool: 'pickaxe', drops: [{ id: 'stone', min: 1, max: 3 }], color: '#4b5563', size: 30, respawnTime: 90, sfxType: 'stone' },
    [ResourceType.IRON]: { hp: 80, preferredTool: 'pickaxe', drops: [{ id: 'iron_ore', min: 1, max: 2 }], color: '#94a3b8', size: 35, respawnTime: 300, sfxType: 'metal' },
    [ResourceType.COPPER]: { hp: 60, preferredTool: 'pickaxe', drops: [{ id: 'copper_ore', min: 1, max: 2 }], color: '#b45309', size: 35, respawnTime: 240, sfxType: 'metal' },
    [ResourceType.SULFUR]: { hp: 30, preferredTool: 'pickaxe', drops: [{ id: 'sulfur_ore', min: 1, max: 2 }], color: '#facc15', size: 30, respawnTime: 200, sfxType: 'stone' },
    [ResourceType.COAL]: { hp: 40, preferredTool: 'pickaxe', drops: [{ id: 'coal', min: 1, max: 2 }], color: '#1f2937', size: 30, respawnTime: 180, sfxType: 'stone' },
    [ResourceType.BERRY_BUSH]: { hp: 20, preferredTool: 'axe', drops: [{ id: 'fruit', min: 2, max: 4 }], color: '#16a34a', size: 25, respawnTime: 60, sfxType: 'organic' },
};

export class Resource {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;

        const config = ResourceConfig[type];
        this.config = config; // Store config for sfxType access
        this.maxHp = config.hp;
        this.hp = this.maxHp;
        this.preferredTool = config.preferredTool;
        this.drops = config.drops;
        this.color = config.color;
        this.size = config.size;
        this.respawnTime = config.respawnTime;

        this.isDepleted = false;
        this.respawnTimer = 0;

        // Visuals generation (Moved from draw to prevent jitter)
        this.visuals = this.generateVisuals();
    }

    generateVisuals() {
        const visuals = {};
        const radius = this.size / 2;
        let sides = 6;
        let roughness = 0;

        // Shape parameters based on type
        if (this.type === ResourceType.STONE) {
            sides = 6 + Math.floor(Math.random() * 2);
            roughness = 2;
        } else if (this.type === ResourceType.IRON) {
            sides = 4 + Math.floor(Math.random() * 2);
            roughness = 1;
        } else if (this.type === ResourceType.COPPER) {
            sides = 7 + Math.floor(Math.random() * 2);
            roughness = 3;
        } else if (this.type === ResourceType.COAL) {
            sides = 5 + Math.floor(Math.random() * 3);
            roughness = 5;
        } else if (this.type === ResourceType.SULFUR) {
            sides = 8 + Math.floor(Math.random() * 3);
            roughness = 2;
        }

        visuals.sides = sides;
        visuals.radius = radius;
        visuals.roughness = roughness;
        visuals.points = [];
        visuals.shadowPoints = [];

        // Generate main shape points
        for (let i = 0; i < sides; i++) {
            const ang = (i * Math.PI * 2) / sides;
            const r = radius + (Math.random() - 0.5) * roughness;
            const px = Math.cos(ang) * r;
            const py = Math.sin(ang) * r;
            visuals.points.push({ x: px, y: py });
            visuals.shadowPoints.push({ x: Math.cos(ang) * (r + 2) + 2, y: Math.sin(ang) * (r + 2) + 2 });
        }

        // Specific details
        visuals.details = [];
        if (this.type === ResourceType.COPPER) {
            // Green spots
            for (let k = 0; k < 4; k++) {
                visuals.details.push({
                    x: (Math.random() - 0.5) * radius * 1.2,
                    y: (Math.random() - 0.5) * radius * 1.2,
                    r: 3
                });
            }
        } else if (this.type === ResourceType.SULFUR) {
            // Yellow dots
            for (let k = 0; k < 15; k++) {
                visuals.details.push({
                    x: (Math.random() - 0.5) * radius * 1.5,
                    y: (Math.random() - 0.5) * radius * 1.5,
                    r: 1.5
                });
            }
        }

        return visuals;
    }

    update(dt) {
        if (this.isDepleted) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
        }
    }

    // 採取ダメージを受ける
    // toolType: 使用している道具の種類 (axe, pickaxe)
    // miningSpeed: 道具のマイニングスピード倍率
    takeDamage(amount, toolType, miningSpeed = 1.0) {
        if (this.isDepleted) return null;

        // 道具チェック
        let efficiency = 1.0;
        if (toolType !== this.preferredTool) {
            if (!toolType) {
                // 素手の場合: 木とベリーは壊せるが、石や鉱石は壊せない
                if (this.type === ResourceType.TREE || this.type === ResourceType.BERRY_BUSH) {
                    efficiency = 0.3;
                } else {
                    efficiency = 0; // 石・鉱石は素手では不可
                }
            } else {
                // 不適切な道具（斧で石など）: 0.3倍の効率
                efficiency = 0.3;
            }
        }

        this.hp -= amount * miningSpeed * efficiency;

        if (this.hp <= 0) { // Assuming 'this.health' in instruction was a typo and should be 'this.hp'
            return { items: this.deplete(), sfxType: this.config.sfxType };
        }
        return { items: null, sfxType: this.config.sfxType };
    }

    deplete() {
        this.isDepleted = true;
        this.respawnTimer = this.respawnTime;

        const droppedItems = [];
        for (const drop of this.drops) {
            const count = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
            droppedItems.push({ id: drop.id, count });
        }
        return droppedItems;
    }

    respawn() {
        this.isDepleted = false;
        this.hp = this.maxHp;
    }

    draw(ctx) {
        if (this.isDepleted) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === ResourceType.TREE) {
            const tex = textureManager.get('tree');
            if (tex) {
                // 木は非常に大きい画像(2.5倍程度)で描画すると見栄えが良い
                ctx.drawImage(tex, -this.size * 1.5, -this.size * 1.5, this.size * 3, this.size * 3);
            } else {
                // 改良された木の描画
                // 幹の描画（グラデーションで立体感）
                const trunkGrd = ctx.createLinearGradient(-8, 0, 8, 0);
                trunkGrd.addColorStop(0, '#654321');
                trunkGrd.addColorStop(0.5, '#8b4513');
                trunkGrd.addColorStop(1, '#654321');
                ctx.fillStyle = trunkGrd;
                ctx.fillRect(-8, -5, 16, 40);

                // 幹のテクスチャ（樹皮）
                ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 6; i++) {
                    const y = -5 + i * 7;
                    ctx.beginPath();
                    ctx.moveTo(-7, y);
                    ctx.lineTo(-5, y + 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(7, y + 3);
                    ctx.lineTo(5, y + 5);
                    ctx.stroke();
                }

                // 葉の層（複数の円で深みを表現）
                const leafColors = ['#2d5016', '#3d6820', '#4d7c0f', '#5d8c1f'];
                const leafPositions = [
                    { x: 0, y: -25, r: 18 },
                    { x: -12, y: -18, r: 14 },
                    { x: 12, y: -18, r: 14 },
                    { x: -8, y: -12, r: 12 },
                    { x: 8, y: -12, r: 12 },
                    { x: 0, y: -15, r: 16 }
                ];

                leafPositions.forEach((pos, idx) => {
                    ctx.fillStyle = leafColors[idx % leafColors.length];
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
                    ctx.fill();
                    // ハイライト
                    ctx.fillStyle = 'rgba(134, 196, 63, 0.3)';
                    ctx.beginPath();
                    ctx.arc(pos.x - 3, pos.y - 3, pos.r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        } else if (this.type === ResourceType.BERRY_BUSH) {
            // 果実の茂み: より深い緑と立体感
            const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, this.size);
            grd.addColorStop(0, '#16a34a');
            grd.addColorStop(1, '#14532d');
            ctx.fillStyle = grd;

            // 複数の塊で茂みを表現
            for (let i = 0; i < 5; i++) {
                const ang = (i * Math.PI * 2) / 5;
                const ox = Math.cos(ang) * 8;
                const oy = Math.sin(ang) * 8;
                ctx.beginPath();
                ctx.arc(ox, oy, this.size / 2.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // 赤い実：光沢を追加
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5 + 0.5;
                const rx = Math.cos(angle) * 10;
                const ry = Math.sin(angle) * 10;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff'; // ハイライト
            }
        } else {
            // 使用cached visuals描画
            const v = this.visuals;
            const radius = v.radius;
            const sides = v.sides;

            // 影
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            if (v.shadowPoints.length > 0) {
                ctx.moveTo(v.shadowPoints[0].x, v.shadowPoints[0].y);
                for (let i = 1; i < sides; i++) {
                    ctx.lineTo(v.shadowPoints[i].x, v.shadowPoints[i].y);
                }
            }
            ctx.closePath();
            ctx.fill();

            // 本体形状
            ctx.beginPath();
            if (v.points.length > 0) {
                ctx.moveTo(v.points[0].x, v.points[0].y);
                for (let i = 1; i < sides; i++) {
                    ctx.lineTo(v.points[i].x, v.points[i].y);
                }
            }
            ctx.closePath();

            // ベースカラーと質感
            if (this.type === ResourceType.STONE) {
                const stoneGrd = ctx.createRadialGradient(-5, -5, 0, 0, 0, radius);
                stoneGrd.addColorStop(0, '#9ca3af');
                stoneGrd.addColorStop(1, '#4b5563');
                ctx.fillStyle = stoneGrd;
                ctx.fill();
                // ひび割れ (Fixed pattern for simplicity or store in visuals if complex)
                ctx.strokeStyle = '#374151';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(radius * 0.5, radius * 0.5);
                ctx.stroke();
            } else if (this.type === ResourceType.IRON) {
                const ironGrd = ctx.createLinearGradient(-radius, -radius, radius, radius);
                ironGrd.addColorStop(0, '#e2e8f0');
                ironGrd.addColorStop(0.5, '#94a3b8');
                ironGrd.addColorStop(1, '#64748b');
                ctx.fillStyle = ironGrd;
                ctx.fill();
                // 金属光沢
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.moveTo(-radius * 0.5, -radius);
                ctx.lineTo(radius * 0.5, radius);
                ctx.lineTo(radius * 0.8, radius);
                ctx.lineTo(-radius * 0.2, -radius);
                ctx.fill();
            } else if (this.type === ResourceType.COPPER) {
                const copperGrd = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
                copperGrd.addColorStop(0, '#d97706');
                copperGrd.addColorStop(1, '#92400e');
                ctx.fillStyle = copperGrd;
                ctx.fill();
                // 酸化（緑青）の斑点 -> 陰影（濃いオレンジ）に変更
                ctx.fillStyle = '#78350f'; // Amber 900
                v.details.forEach(d => {
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                    ctx.fill();
                });
                // オレンジの輝き
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(-radius * 0.3, -radius * 0.3, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === ResourceType.COAL) {
                ctx.fillStyle = '#111827';
                ctx.fill();
                // 断面の反射 (Use cached points)
                ctx.fillStyle = '#374151';
                ctx.beginPath();
                ctx.moveTo(v.points[0].x, v.points[0].y);
                ctx.lineTo(0, 0);
                ctx.lineTo(v.points[1].x, v.points[1].y);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(v.points[2].x, v.points[2].y);
                ctx.lineTo(0, 0);
                ctx.lineTo(v.points[3].x, v.points[3].y);
                ctx.fill();
            } else if (this.type === ResourceType.SULFUR) {
                ctx.fillStyle = '#fef08a';
                ctx.fill();
                // ザラザラ (Cached)
                ctx.fillStyle = '#eab308';
                v.details.forEach(d => {
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.arc(-radius * 0.3, -radius * 0.4, 6, 0, Math.PI * 2);
                ctx.fill();
            }

            // アウトライン
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (v.points.length > 0) {
                ctx.moveTo(v.points[0].x, v.points[0].y);
                for (let i = 1; i < sides; i++) {
                    ctx.lineTo(v.points[i].x, v.points[i].y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }

        // HPバー
        if (this.hp < this.maxHp) {
            const barWidth = 30;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barWidth / 2, this.size / 2 + 8, barWidth, 6);
            ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(-barWidth / 2, this.size / 2 + 8, barWidth * ratio, 6);
        }

        ctx.restore();
    }

    // ヘルパー関数: 色の明度を調整
    adjustBrightness(color, amount) {
        // 簡易的な色調整（HEXカラーのみ対応）
        if (!color.startsWith('#')) return color;

        const num = parseInt(color.slice(1), 16);
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    getBounds() {
        const half = this.size / 2;
        return {
            x: this.x - half,
            y: this.y - half,
            width: this.size,
            height: this.size
        };
    }
}
