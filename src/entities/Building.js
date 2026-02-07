import { SmeltingRecipes } from '../data/Recipes.js';

export const BuildingType = {
    WALL: 'wall',
    DOOR: 'door',
    WORKBENCH: 'workbench',
    FURNACE: 'furnace',
    STORAGE: 'storage'
};

const BuildingConfig = {
    wood_wall: { type: BuildingType.WALL, tier: 'wood', hp: 100, color: '#a16207', preferredTool: 'axe', cost: [{ id: 'wood', count: 4 }] },
    stone_wall: { type: BuildingType.WALL, tier: 'stone', hp: 200, color: '#6b7280', preferredTool: 'pickaxe', cost: [{ id: 'stone', count: 4 }] },
    iron_wall: { type: BuildingType.WALL, tier: 'iron', hp: 400, color: '#ffffff', preferredTool: 'pickaxe', cost: [{ id: 'iron_ore', count: 4 }] },
    wood_door: { type: BuildingType.DOOR, tier: 'wood', hp: 100, color: '#a16207', preferredTool: 'axe', cost: [{ id: 'wood', count: 4 }] },
    stone_door: { type: BuildingType.DOOR, tier: 'stone', hp: 200, color: '#6b7280', preferredTool: 'pickaxe', cost: [{ id: 'stone', count: 4 }] },
    iron_door: { type: BuildingType.DOOR, tier: 'iron', hp: 400, color: '#ffffff', preferredTool: 'pickaxe', cost: [{ id: 'iron_ore', count: 4 }] },
    workbench: { type: BuildingType.WORKBENCH, hp: 100, color: '#92400e', preferredTool: 'axe', cost: [{ id: 'wood', count: 10 }] },
    furnace: { type: BuildingType.FURNACE, hp: 150, color: '#78350f', preferredTool: 'pickaxe', cost: [{ id: 'stone', count: 8 }] },
    storage: { type: BuildingType.STORAGE, hp: 100, color: '#a16207', preferredTool: 'axe', cost: [{ id: 'wood', count: 8 }] },
};

export class Building {
    constructor(x, y, buildingId, angle = 0, ownerId = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.buildingId = buildingId;
        this.ownerId = ownerId;

        const config = BuildingConfig[buildingId];
        if (!config) {
            throw new Error(`Unknown building: ${buildingId}`);
        }

        this.type = config.type;
        this.tier = config.tier || null;
        this.maxHp = config.hp;
        this.hp = this.maxHp;
        this.color = config.color;
        this.preferredTool = config.preferredTool;

        this.wallLength = 50;
        this.wallThickness = 8;
        this.destroyed = false;

        this.storageContents = null;
        if (this.type === BuildingType.STORAGE) {
            this.storageContents = new Array(27).fill(null);
        } else if (this.type === BuildingType.FURNACE) {
            this.storageContents = new Array(3).fill(null);
        }

        this.smeltingProgress = 0;
        this.fuelRemaining = 0;
    }

    update(dt, world) {
        if (this.type === BuildingType.FURNACE && !this.destroyed) {
            this.updateFurnace(dt, world);
        }
    }

    updateFurnace(dt, world) {
        const inputSlot = this.storageContents[0];
        const fuelSlot = this.storageContents[1];
        const outputSlot = this.storageContents[2];

        // inputがない場合は燃料を消費しない
        if (this.fuelRemaining > 0 && inputSlot) {
            this.fuelRemaining -= dt;
        }

        // inputがあり、燃料が必要な場合のみ燃料を消費
        if (this.fuelRemaining <= 0 && fuelSlot && inputSlot) {
            const recipe = SmeltingRecipes.find(r => r.input === inputSlot.itemId);
            // レシピが存在する場合のみ燃料を消費
            if (recipe) {
                if (fuelSlot.itemId === 'coal') {
                    this.fuelRemaining += 60;
                    this.removeItemFromSlot(1, 1);
                } else if (fuelSlot.itemId === 'wood') {
                    this.fuelRemaining += 15;
                    this.removeItemFromSlot(1, 1);
                }
            }
        }

        if (inputSlot && this.fuelRemaining > 0) {
            const recipe = SmeltingRecipes.find(r => r.input === inputSlot.itemId);
            if (recipe) {
                if (!outputSlot || (outputSlot.itemId === recipe.output && outputSlot.count < 30)) {
                    this.smeltingProgress += dt;
                    if (this.smeltingProgress >= recipe.time) {
                        this.smeltingProgress = 0;
                        this.removeItemFromSlot(0, 1);
                        this.addItemToSlot(2, recipe.output, 1);
                    }
                } else {
                    this.smeltingProgress = 0;
                }
            } else {
                this.smeltingProgress = 0;
            }
        } else {
            this.smeltingProgress = 0;
        }
    }

    removeItemFromSlot(index, count) {
        if (!this.storageContents[index]) return;
        this.storageContents[index].count -= count;
        if (this.storageContents[index].count <= 0) {
            this.storageContents[index] = null;
        }
    }

    addItemToSlot(index, itemId, count) {
        if (!this.storageContents[index]) {
            this.storageContents[index] = { itemId, count };
        } else {
            this.storageContents[index].count += count;
        }
    }

    takeDamage(amount, toolType = null, miningSpeed = 1.0) {
        let efficiency = 0.3;

        if (toolType === this.preferredTool) {
            efficiency = 1.0;
        } else if (toolType === 'axe' || toolType === 'pickaxe') {
            efficiency = 0.5;
        }

        this.hp -= amount * miningSpeed * efficiency;

        if (this.hp <= 0) {
            return { items: this.destroy(), sfxType: 'metal' };
        }
        return { items: null, sfxType: 'metal' };
    }

    destroy() {
        this.destroyed = true;
        const config = BuildingConfig[this.buildingId];
        const drops = [];
        // 半分の資材を返却
        if (config.cost) {
            config.cost.forEach(c => {
                drops.push({ id: c.id, count: Math.ceil(c.count / 2) });
            });
        }
        // 保管庫の中身もドロップに追加
        if (this.storageContents) {
            this.storageContents.forEach(slot => {
                if (slot) drops.push({ id: slot.itemId, count: slot.count });
            });
        }
        return drops;
    }

    canPlayerPass() {
        return this.type === BuildingType.DOOR;
    }

    canEnemyPass() {
        return false;
    }

    draw(ctx) {
        if (this.destroyed) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === BuildingType.WALL || this.type === BuildingType.DOOR) {
            const halfLen = this.wallLength / 2;
            const halfThick = this.wallThickness / 2;

            // 木材のベース
            ctx.fillStyle = this.color;
            ctx.fillRect(-halfLen, -halfThick, this.wallLength, this.wallThickness);

            // 木目パターンのプロシーチャル描画
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            for (let i = -halfThick + 2; i < halfThick; i += 4) {
                ctx.beginPath();
                ctx.moveTo(-halfLen, i);
                ctx.lineTo(halfLen, i);
                ctx.stroke();
            }

            // 立体感の境界線
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.strokeRect(-halfLen, -halfThick, this.wallLength, this.wallThickness);

            if (this.type === BuildingType.DOOR) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(-8, -halfThick - 1, 16, this.wallThickness + 2);
                ctx.fillStyle = '#fbbf24'; // 金のノブ
                ctx.beginPath();
                ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === BuildingType.WORKBENCH) {
            const size = 36;
            // 影
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(-size / 2 + 2, -size / 2 + 2, size, size);

            // テーブル脚
            ctx.fillStyle = '#422006';
            ctx.fillRect(-size / 2 - 2, size / 2 - 12, 6, 12);
            ctx.fillRect(size / 2 - 4, size / 2 - 12, 6, 12);

            // テーブル天板（グラデーション）
            const tableGrd = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
            tableGrd.addColorStop(0, '#92400e');
            tableGrd.addColorStop(0.5, '#a16207');
            tableGrd.addColorStop(1, '#78350f');
            ctx.fillStyle = tableGrd;
            ctx.fillRect(-size / 2, -size / 2, size, size * 0.7);

            // 木目のテクスチャ
            ctx.strokeStyle = 'rgba(101, 67, 33, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const y = -size / 2 + i * 5;
                ctx.beginPath();
                ctx.moveTo(-size / 2 + 2, y);
                ctx.lineTo(size / 2 - 2, y);
                ctx.stroke();
            }

            // 工具（ハンマー）
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-12, -8, 3, 12); // 柄
            ctx.fillStyle = '#52525b';
            ctx.fillRect(-14, -10, 7, 4); // ハンマーヘッド

            // 工具（のこぎり）
            ctx.fillStyle = '#78350f';
            ctx.fillRect(6, 2, 8, 2); // 柄
            ctx.strokeStyle = '#d4d4d8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(14, -6);
            ctx.stroke();
            // のこぎりの刃
            ctx.strokeStyle = '#a1a1aa';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(6 + i * 2, 0);
                ctx.lineTo(8 + i * 2, -2);
                ctx.stroke();
            }
        } else if (this.type === BuildingType.FURNACE) {
            const size = 36;
            // 外枠（石）
            const grd = ctx.createRadialGradient(0, 0, 10, 0, 0, size / 2);
            grd.addColorStop(0, '#4b5563');
            grd.addColorStop(1, '#1f2937');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();
            // 焚き口
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(0, 4, 10, 0, Math.PI * 2);
            ctx.fill();
            // 火
            if (this.fuelRemaining > 0) {
                const flicker = Math.sin(Date.now() * 0.015) * 3;
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.arc(0, 4, 6 + flicker, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(0, 4, 3 + flicker / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === BuildingType.STORAGE) {
            const size = 30;
            // 側面
            ctx.fillStyle = '#422006';
            ctx.fillRect(-size / 2, -size / 2, size, size);
            // 蓋
            ctx.fillStyle = '#713f12';
            ctx.fillRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4);
            // 装飾（鉄のバンド）
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-size / 2 + 5, -size / 2, 4, size);
            ctx.fillRect(size / 2 - 9, -size / 2, 4, size);
            // 錠前
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-3, -2, 6, 8);
        }

        if (this.hp < this.maxHp) {
            ctx.rotate(-this.angle);
            const barWidth = 30;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barWidth / 2, -20, barWidth, 5);
            ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(-barWidth / 2, -20, barWidth * ratio, 5);
        }

        ctx.restore();
    }

    getBounds() {
        if (this.type === BuildingType.WALL || this.type === BuildingType.DOOR) {
            return {
                x: this.x - this.wallLength / 2,
                y: this.y - this.wallThickness / 2,
                width: this.wallLength,
                height: this.wallThickness,
                angle: this.angle
            };
        }
        const size = 30;
        return {
            x: this.x - size / 2,
            y: this.y - size / 2,
            width: size,
            height: size,
            angle: 0
        };
    }

    checkCollision(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        if (this.type === BuildingType.WALL || this.type === BuildingType.DOOR) {
            const halfLen = this.wallLength / 2;
            const halfThick = this.wallThickness / 2 + 10;
            return Math.abs(localX) < halfLen && Math.abs(localY) < halfThick;
        }

        const halfSize = 15;
        return Math.abs(localX) < halfSize && Math.abs(localY) < halfSize;
    }
}
