import { Player } from './entities/Player.js';
import { Resource, ResourceType } from './entities/Resource.js';
import { Enemy, EnemyType } from './entities/Enemy.js';
import { Bullet } from './entities/Bullet.js';
import { Building } from './entities/Building.js';
import { Animal } from './entities/Animal.js'; // Added Animal import
import { DroppedItem } from './entities/DroppedItem.js';
import { Explosion } from './entities/Explosion.js';
import { Bomb } from './entities/Bomb.js';
import { DayNight } from './systems/DayNight.js';
import { audioManager } from './systems/AudioManager.js';

import { ChunkManager } from './systems/ChunkManager.js';

export class World {
    constructor(game) {
        this.game = game;
        // Infinite world, so these bounds are just for initial camera/reference
        this.width = 10000;
        this.height = 10000;

        this.player = new Player(0, 0); // Start at 0,0 for infinite feel? Or keep 5000,5000? 
        // Let's keep 5000,5000 as "Origin" to avoid negative coord issues if any system assumes positive?
        // Actually, noise function handles negatives fine.
        // But let's stick to 5000,5000 as start to match existing "center".
        // Let's keep 5000,5000 as "Origin" to avoid negative coord issues if any system assumes positive?
        // Actually, noise function handles negatives fine.
        // User requested 0,0 start.
        this.player = new Player(0, 0);

        this.resources = [];
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.buildings = [];
        this.animals = [];
        this.droppedItems = [];
        this.explosions = [];
        this.bombs = [];

        this.dayNight = new DayNight();
        this.chunkManager = new ChunkManager(this);

        this.uiState = 'none';

        this.camera = {
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            follow: function (target) { // Removed worldW, worldH args
                this.x = target.x - this.width / 2;
                this.y = target.y - this.height / 2;
                // Removed clamping
            }
        };

        this.spawnTimer = 0;
        this.spawnInterval = 5;

        this.openStorage = null;

        // 資源再生成タイマー
        this.resourceRegenTimer = 30 + Math.random() * 60;

        // this.generateResources(); // Handled by ChunkManager now
        this.spawnAnimals(20);

        // タイルキャッシュの初期化
        this.tileCache = new Map();
        this.tileSize = 80;
    }

    // 資源をランダムな場所に再生成
    spawnRandomResources() {
        const roll = Math.random();

        if (roll < 0.3) {
            // 林を生成 (30%)
            const centerX = 200 + Math.random() * (this.width - 400);
            const centerY = 200 + Math.random() * (this.height - 400);
            const treeCount = 8 + Math.floor(Math.random() * 12);

            for (let t = 0; t < treeCount; t++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 100;
                const x = centerX + Math.cos(angle) * dist;
                const y = centerY + Math.sin(angle) * dist;
                this.resources.push(new Resource(x, y, ResourceType.TREE));
            }
        } else if (roll < 0.5) {
            // 石の群れ (20%)
            const centerX = 200 + Math.random() * (this.width - 400);
            const centerY = 200 + Math.random() * (this.height - 400);
            const count = 3 + Math.floor(Math.random() * 5);

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 60;
                const x = centerX + Math.cos(angle) * dist;
                const y = centerY + Math.sin(angle) * dist;
                this.resources.push(new Resource(x, y, ResourceType.STONE));
            }
        } else if (roll < 0.7) {
            // 鉱石の群れ (20%)
            const types = [ResourceType.IRON, ResourceType.COPPER, ResourceType.COAL];
            const type = types[Math.floor(Math.random() * types.length)];
            const centerX = 200 + Math.random() * (this.width - 400);
            const centerY = 200 + Math.random() * (this.height - 400);
            const count = 2 + Math.floor(Math.random() * 4);

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 50;
                const x = centerX + Math.cos(angle) * dist;
                const y = centerY + Math.sin(angle) * dist;
                this.resources.push(new Resource(x, y, type));
            }
        } else {
            // 単体資源 (30%)
            const allTypes = [ResourceType.TREE, ResourceType.STONE, ResourceType.IRON, ResourceType.COPPER, ResourceType.COAL, ResourceType.BERRY_BUSH]; // Added BERRY_BUSH
            const type = allTypes[Math.floor(Math.random() * allTypes.length)];
            const x = 100 + Math.random() * (this.width - 200);
            const y = 100 + Math.random() * (this.height - 200);
            this.resources.push(new Resource(x, y, type));
        }
    }

    generateResources() {
        // 全体をスキャンしてバイオームに応じたリソースを配置
        // 以前のランダム配置ではなく、グリッドベースまたはランダムポイントで判定して配置

        const count = 3000; // 全体の資源数（マップ広いので多めに）

        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const biome = this.getBiome(x, y);

            // バイオーム別の生成確率
            let type = null;
            const roll = Math.random();

            if (biome === 'forest') {
                // 森林: 木が非常に多い
                if (roll < 0.7) type = ResourceType.TREE;
                else if (roll < 0.8) type = ResourceType.BERRY_BUSH;
                else if (roll < 0.9) type = ResourceType.STONE;
                else if (roll < 0.95) type = ResourceType.COAL;
            } else if (biome === 'desert') {
                // 砂漠: 木はほとんどない、石が多い、独自のサボテン（未実装なので木を代用、あるいは黄色い木？）
                // 一旦、木を少なめに
                if (roll < 0.1) type = ResourceType.TREE;
                else if (roll < 0.6) type = ResourceType.STONE;
                else if (roll < 0.7) type = ResourceType.COPPER; // 銅が出やすい
                else if (roll < 0.75) type = ResourceType.IRON;
            } else if (biome === 'snow') {
                // 雪原: 木はまばら、鉱石は普通、鉄が出やすい
                if (roll < 0.3) type = ResourceType.TREE;
                else if (roll < 0.6) type = ResourceType.STONE;
                else if (roll < 0.75) type = ResourceType.IRON; // 鉄が出やすい
                else if (roll < 0.8) type = ResourceType.COAL;
            } else {
                // 草原 (Grass)
                if (roll < 0.4) type = ResourceType.TREE;
                else if (roll < 0.7) type = ResourceType.STONE;
                else if (roll < 0.8) type = ResourceType.BERRY_BUSH;
                else if (roll < 0.9) type = ResourceType.IRON;
            }

            if (type) {
                this.resources.push(new Resource(x, y, type));
            }
        }
    }

    spawnAnimals(count) {
        for (let i = 0; i < count; i++) {
            const x = 100 + Math.random() * (this.width - 200);
            const y = 100 + Math.random() * (this.height - 200);
            this.animals.push(new Animal(x, y));
        }
    }

    spawnDrop(x, y, itemId, count) {
        this.droppedItems.push(new DroppedItem(x, y, itemId, count));
    }

    spreadItemsOnDeath(x, y, inventory) {
        for (const slot of inventory.slots) {
            if (slot) {
                this.spawnDrop(x, y, slot.itemId, slot.count);
            }
        }
        inventory.clear();
    }

    update(dt, input) {
        if (this.uiState === 'gameover') return;

        if (input.keys['KeyE'] && !input.prevKeys?.['KeyE']) {
            if (this.uiState === 'storage') {
                this.uiState = 'none';
                this.openStorage = null;
            } else {
                this.uiState = this.uiState === 'inventory' ? 'none' : 'inventory';
            }
        }
        if (input.keys['KeyC'] && !input.prevKeys?.['KeyC']) {
            if (this.uiState === 'storage') {
                this.uiState = 'none';
                this.openStorage = null;
            } else {
                this.uiState = this.uiState === 'crafting' ? 'none' : 'crafting';
            }
        }
        // Fキー または OBJボタン で保管庫/作業台を開く
        const isInteractJustPressed = (input.keys['KeyF'] && !input.prevKeys?.['KeyF']);

        // PC用拾得キー(B) - アイテム拾得専用
        const isPickupJustPressed = (input.keys['KeyB'] && !input.prevKeys?.['KeyB']);

        // Bキー: アイテム拾得専用
        if (isPickupJustPressed) {
            if (this.uiState !== 'none') {
                this.uiState = 'none';
                this.openStorage = null;
            } else {
                const nearbyDrop = this.getNearbyDroppedItem(this.player.x, this.player.y, 80);
                if (nearbyDrop) {
                    this.player.inventory.addItem(nearbyDrop.itemId, nearbyDrop.count);
                    nearbyDrop.isPickedUp = true;
                    audioManager.playPickup(); // 専用の拾得音
                }
            }
        }

        // Fキー: インタラクト専用（建物を開く、設置、食べる）
        if (isInteractJustPressed) {
            if (this.uiState !== 'none') {
                this.uiState = 'none';
                this.openStorage = null;
            } else {
                const item = this.player.inventory.getSelectedItem();
                const canPlace = item && (item.buildingType || item.type === 'building' || item.type === 'building_wall' || item.type === 'building_door');

                // 1. 建築試行
                if (canPlace) {
                    const placed = this.player.tryPlace(this, this.camera, input);
                    if (placed) {
                        input.prevKeys = { ...input.keys };
                        return; // 設置できたら終了
                    }
                }

                // 2. 作業台などを開く
                const nearbyStorage = this.getNearbyStorage(this.player.x, this.player.y, 80);
                const nearbyFurnace = this.getNearbyFurnace(this.player.x, this.player.y, 80);
                const nearbyWorkbench = this.getNearbyWorkbench(this.player.x, this.player.y, 80);
                const nearbyBed = this.getNearbyBed(this.player.x, this.player.y, 80);

                if (nearbyStorage) {
                    this.openStorage = nearbyStorage;
                    this.uiState = 'storage';
                } else if (nearbyFurnace) {
                    this.openStorage = nearbyFurnace;
                    this.uiState = 'furnace';
                } else if (nearbyWorkbench) {
                    this.uiState = 'crafting';
                } else if (nearbyBed) {
                    // ベッドを使用
                    if (this.dayNight.isNight) {
                        this.dayNight.elapsedTime = this.dayNight.dayLength; // 朝にする（オーバーフロー処理で翌日になる）
                        this.dayNight.checkDayOverflow();
                        audioManager.playPickup(); // 仮の音
                        // メッセージ表示などができればベストだが今回は省略
                    } else {
                        // 昼間は寝られない（メッセージ出す？）
                    }
                } else if (item && item.type === 'food') {
                    this.player.eat(item);
                }
            }
        }

        this.dayNight.update(dt);

        this.player.update(dt, input, this.camera, this);

        // prevKeysを更新（player.updateの後に設定）
        input.prevKeys = { ...input.keys };

        // 死亡判定
        if (this.player.health <= 0) {
            this.player.die(this);
            this.uiState = 'gameover';
        }

        for (const building of this.buildings) {
            if (building.update) building.update(dt, this);
        }

        for (const res of this.resources) {
            res.update(dt);
        }

        for (const animal of this.animals) { // Updated animals
            animal.update(dt, this);
        }

        // 弾丸更新
        for (const bullet of this.bullets) {
            bullet.update(dt);

            for (const enemy of this.enemies) {
                if (!enemy.destroyed && bullet.checkHit(enemy)) {
                    enemy.takeDamage(bullet.damage);
                    bullet.destroyed = true;
                    break;
                }
            }
            // 動物への命中判定
            for (const animal of this.animals) {
                if (!animal.isDead && bullet.checkHit(animal)) {
                    const result = animal.takeDamage(bullet.damage, this);
                    if (result.items) {
                        for (const d of result.items) this.spawnDrop(animal.x, animal.y, d.id, d.count);
                    }
                    audioManager.playBreak(result.sfxType);
                    bullet.destroyed = true;
                    break;
                }
            }
        }
        this.bullets = this.bullets.filter(b => !b.destroyed);

        for (const bullet of this.enemyBullets) {
            bullet.update(dt);

            // 壁との当たり判定
            for (const building of this.buildings) {
                if (building.destroyed) continue;
                const bounds = building.getBounds();
                if (bullet.x > bounds.x && bullet.x < bounds.x + bounds.width &&
                    bullet.y > bounds.y && bullet.y < bounds.y + bounds.height) {
                    bullet.destroyed = true;
                    break;
                }
            }

            if (!bullet.destroyed) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                if (Math.sqrt(dx * dx + dy * dy) < bullet.radius + this.player.width / 2) {
                    this.player.takeDamage(bullet.damage, this);
                    bullet.destroyed = true;
                }
            }
        }
        this.enemyBullets = this.enemyBullets.filter(b => !b.destroyed);

        // 敵更新
        const isDayTime = !this.dayNight.isNight;
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.buildings, this);

            // 朝になった、またはプレイヤーから1000以上離れたらデスポーン
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distSq = dx * dx + dy * dy;

            if (isDayTime || distSq > 1000 * 1000) {
                enemy.destroyed = true;
            }
        }
        this.enemies = this.enemies.filter(e => !e.destroyed);

        // 動物の破壊判定
        this.animals = this.animals.filter(a => !a.isDead);

        // ドロップアイテムの更新
        for (const drop of this.droppedItems) {
            drop.update(dt);
        }
        this.droppedItems = this.droppedItems.filter(d => !d.isPickedUp && !d.destroyed);

        // 爆弾更新
        for (const bomb of this.bombs) {
            bomb.update(dt);
        }
        this.bombs = this.bombs.filter(b => !b.destroyed);

        // 爆発更新
        for (const exp of this.explosions) {
            const active = exp.update(dt);
            if (!active) {
                // 配列から削除するためのフラグ管理などはしていないので
                // ここでfilterする方式にする
            }
        }
        this.explosions = this.explosions.filter(e => e.timer < e.duration);

        // 建物の破壊判定
        this.buildings = this.buildings.filter(b => !b.destroyed);

        // 夜間の敵スポーン
        if (this.dayNight.isNight) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemies();
                this.spawnTimer = this.spawnInterval;
            }
        }

        // 資源の再生成 (ChunkManager handles this now)
        // this.resourceRegenTimer -= dt;
        // if (this.resourceRegenTimer <= 0) {
        //     this.spawnRandomResources();
        //     this.resourceRegenTimer = 30 + Math.random() * 90;
        // }

        this.updateCamera();

        this.chunkManager.update(this.player.x, this.player.y);

        // Infinite world: No player bounds clamping
        // this.player.x = ...
        // this.player.y = ...

        document.getElementById('day-night-indicator').textContent = this.dayNight.getDisplayString();
    }

    spawnEnemies() {
        // 遠くの敵をデスポーン
        const despawnDist = 2000;
        this.enemies = this.enemies.filter(e => {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            return (dx * dx + dy * dy) < despawnDist * despawnDist;
        });

        if (this.enemies.length >= 60) return;
        const count = Math.min(this.dayNight.enemySpawnCount, 20);
        const strongRate = this.dayNight.strongEnemyRate;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.camera.width, this.camera.height) / 2 + 100;
            const x = this.player.x + Math.cos(angle) * dist;
            const y = this.player.y + Math.sin(angle) * dist;

            const biome = this.getBiome(x, y);
            let type = EnemyType.NORMAL;
            const roll = Math.random();

            // バイオームに応じた敵タイプ決定
            if (biome === 'snow') {
                // 雪原: 雪ゾンビメイン、たまにパワー
                type = EnemyType.SNOW;
                if (roll < strongRate * 0.3) type = EnemyType.POWER;
            } else if (biome === 'desert') {
                // 砂漠: 砂漠ゾンビメイン、たまにレンジャー
                type = EnemyType.DESERT;
                if (roll < strongRate * 0.3) type = EnemyType.RANGER;
            } else if (biome === 'forest') {
                // 森林: 森ゾンビメイン、たまにレンジャー
                type = EnemyType.FOREST;
                if (roll < strongRate * 0.3) type = EnemyType.RANGER;
            } else {
                // 草原: ノーマル、強敵もたまに
                type = EnemyType.NORMAL;
                if (roll < strongRate * 0.5) type = EnemyType.RANGER;
                else if (roll < strongRate) type = EnemyType.POWER;
            }

            this.enemies.push(new Enemy(x, y, type));
        }
    }

    spawnBullet(x, y, dx, dy, speed, damage) {
        this.bullets.push(new Bullet(x, y, dx, dy, speed, damage));
    }

    spawnEnemyBullet(x, y, dx, dy, speed, damage) {
        this.enemyBullets.push(new Bullet(x, y, dx, dy, speed, damage));
    }

    spawnBomb(x, y, dx, dy, speed) {
        this.bombs.push(new Bomb(x, y, dx * speed, dy * speed, this));
    }

    createExplosion(x, y, damage, radius) {
        this.explosions.push(new Explosion(x, y, damage, radius, this));
    }

    placeBuilding(x, y, buildingId, angle = 0) {
        this.buildings.push(new Building(x, y, buildingId, angle));
    }

    spawnDrop(x, y, itemId, count) {
        if (isNaN(x) || isNaN(y)) {
            console.error('Invalid spawnDrop coordinates:', x, y);
            return;
        }
        this.droppedItems.push(new DroppedItem(x, y, itemId, count));
    }

    updateCamera() {
        this.camera.x = this.player.x - this.camera.width / 2;
        this.camera.y = this.player.y - this.camera.height / 2;

        // Infinite world: No camera bounds clamping
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        this.drawGround(ctx);

        // 夜間の視界範囲を計算
        const hasTorch = this.player.inventory.getSelectedItem()?.toolType === 'torch';
        const baseRadius = 300;
        const visionRadius = this.dayNight.isNight
            ? (hasTorch ? baseRadius * 2 : baseRadius * this.dayNight.visionMultiplier)
            : Infinity;

        // 建物
        for (const building of this.buildings) {
            if (this.isInView(building.x, building.y, building.size)) {
                if (this.isInVision(building.x, building.y, visionRadius)) {
                    building.draw(ctx);
                }
            }
        }

        // 資源
        for (const res of this.resources) {
            if (this.isInView(res.x, res.y, res.size)) {
                if (this.isInVision(res.x, res.y, visionRadius)) {
                    res.draw(ctx);
                }
            }
        }

        // 動物
        for (const animal of this.animals) {
            if (this.isInView(animal.x, animal.y, animal.width)) {
                if (this.isInVision(animal.x, animal.y, visionRadius)) {
                    animal.draw(ctx);
                }
            }
        }

        // ドロップアイテム
        for (const drop of this.droppedItems) {
            if (this.isInView(drop.x, drop.y, 30)) {
                if (this.isInVision(drop.x, drop.y, visionRadius)) {
                    drop.draw(ctx, this.game);
                }
            }
        }

        // 敵
        for (const enemy of this.enemies) {
            if (this.isInView(enemy.x, enemy.y, enemy.width)) {
                if (this.isInVision(enemy.x, enemy.y, visionRadius)) {
                    enemy.draw(ctx);
                }
            }
        }

        // 弾丸
        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
        for (const bullet of this.enemyBullets) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 爆弾
        for (const bomb of this.bombs) {
            bomb.draw(ctx);
        }

        // 爆発
        for (const exp of this.explosions) {
            exp.draw(ctx);
        }

        this.player.draw(ctx);

        ctx.restore();

        this.drawNightOverlay(ctx);
    }

    // 視界内かどうか判定
    isInVision(x, y, visionRadius) {
        if (visionRadius === Infinity) return true;
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        return Math.sqrt(dx * dx + dy * dy) < visionRadius;
    }

    // 座標からバイオームを判定
    getBiome(x, y) {
        // 簡易的な擬似ノイズ
        const scale = 0.0005;
        // 複数の波を合成して複雑さを出す
        const noise = Math.sin(x * scale) + Math.cos(y * scale) +
            Math.sin(x * scale * 2.5 + 100) * 0.5 + Math.cos(y * scale * 2.5 + 200) * 0.5;
        // range: roughly -3 to 3

        if (noise < -1.5) return 'snow'; // 雪原
        if (noise < -0.5) return 'forest'; // 森林
        if (noise < 1.0) return 'grass'; // 草原
        return 'desert'; // 砂漠
    }

    drawGround(ctx) {
        // 背景色（デフォルト）
        ctx.fillStyle = '#3d9e50';
        // 視界外の背景も一応埋めるが、タイル描画で上書きされる
        ctx.fillRect(this.camera.x, this.camera.y, this.camera.width, this.camera.height);

        const startX = Math.floor(this.camera.x / this.tileSize) * this.tileSize;
        const startY = Math.floor(this.camera.y / this.tileSize) * this.tileSize;

        for (let tx = startX; tx < this.camera.x + this.camera.width + this.tileSize; tx += this.tileSize) {
            for (let ty = startY; ty < this.camera.y + this.camera.height + this.tileSize; ty += this.tileSize) {
                const key = `${tx},${ty}`;

                // キャッシュがあればそれを利用
                if (!this.tileCache.has(key)) {
                    this.createTileCache(tx, ty);
                }

                const cachedTile = this.tileCache.get(key);
                ctx.drawImage(cachedTile, tx, ty);
            }
        }

        // メモリ管理：カメラから遠すぎるキャッシュを整理（簡易版）
        if (this.tileCache.size > 800) { // 画面サイズが大きめなので少し増やす
            this.tileCache.clear();
        }
    }

    // 特定の座標のタイルを事前描画してキャッシュする
    createTileCache(tx, ty) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = this.tileSize;
        offCanvas.height = this.tileSize;
        const offCtx = offCanvas.getContext('2d');

        // 中心座標でバイオーム判定
        const biome = this.getBiome(tx + this.tileSize / 2, ty + this.tileSize / 2);

        const seed = (tx * 73856093) ^ (ty * 19349663);
        let baseColor, detailColors;

        if (biome === 'snow') {
            baseColor = '#f3f4f6'; // 明るいグレー/白
            detailColors = ['#e5e7eb', '#d1d5db', '#f9fafb'];
        } else if (biome === 'desert') {
            baseColor = '#fde047'; // 黄色
            detailColors = ['#facc15', '#eab308', '#fef08a'];
        } else if (biome === 'forest') {
            baseColor = '#15803d'; // 濃い緑
            detailColors = ['#166534', '#14532d', '#15803d', '#4ade8055'];
        } else { // grass
            baseColor = '#4ade80'; // 明るい緑
            detailColors = ['rgba(74, 222, 128, 0.4)', 'rgba(34, 197, 94, 0.4)', 'rgba(22, 163, 74, 0.4)'];
        }

        // ベース塗りつぶし
        offCtx.fillStyle = baseColor;
        offCtx.fillRect(0, 0, this.tileSize, this.tileSize);

        // 詳細（草、石、模様など）
        for (let i = 0; i < 15; i++) {
            const localSeed = (seed + i * 12345) % 100000;
            const px = localSeed % this.tileSize;
            const py = (localSeed / this.tileSize) % this.tileSize;
            const colorIdx = (localSeed + i) % detailColors.length;

            offCtx.fillStyle = detailColors[colorIdx];
            offCtx.beginPath();

            if (biome === 'desert') {
                // 砂漠は丸い粒
                offCtx.arc(px, py, 1.5 + (localSeed % 2), 0, Math.PI * 2);
            } else if (biome === 'snow') {
                // 雪原は少しぼやけた感じ
                offCtx.arc(px, py, 2 + (localSeed % 3), 0, Math.PI * 2);
            } else {
                // 草や森は楕円
                offCtx.ellipse(px, py, 1.5, 3 + (localSeed % 2), (localSeed % 10) * 0.1, 0, Math.PI * 2);
            }
            offCtx.fill();
        }

        const key = `${tx},${ty}`;
        this.tileCache.set(key, offCanvas);
    }

    drawNightOverlay(ctx) {
        const sunlight = this.dayNight.sunlight;

        // 日光による明るさ調整（常に適用）
        if (sunlight < 1.0) {
            const darkness = 1.0 - sunlight;

            if (this.dayNight.isNight) {
                // 夜間: 視界制限あり
                const centerX = this.camera.width / 2;
                const centerY = this.camera.height / 2;

                const hasTorch = this.player.inventory.getSelectedItem()?.toolType === 'torch';
                const baseRadius = 300;
                const visionRadius = hasTorch ? baseRadius * 2 : baseRadius * this.dayNight.visionMultiplier;

                const gradient = ctx.createRadialGradient(centerX, centerY, visionRadius * 0.7, centerX, centerY, visionRadius);
                gradient.addColorStop(0, `rgba(0, 0, 20, ${darkness * 0.3})`);
                gradient.addColorStop(1, `rgba(0, 0, 20, ${darkness * 0.9})`);

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, this.camera.width, this.camera.height);
            } else {
                // 朝焼け/夕焼け: 全体的にオレンジがかった薄暗さ
                const skyColor = this.dayNight.skyColor;
                ctx.fillStyle = `rgba(${255 - skyColor.r}, ${100 - skyColor.g * 0.3}, 0, ${darkness * 0.3})`;
                ctx.fillRect(0, 0, this.camera.width, this.camera.height);
            }
        }
    }

    isInView(x, y, size = 0) {
        const margin = size + 50;
        return x > this.camera.x - margin &&
            x < this.camera.x + this.camera.width + margin &&
            y > this.camera.y - margin &&
            y < this.camera.y + this.camera.height + margin;
    }

    getNearbyResource(x, y, range = 50) {
        for (const res of this.resources) {
            if (res.isDepleted) continue;
            const dx = res.x - x;
            const dy = res.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return res;
            }
        }
        return null;
    }

    getNearbyAnimal(x, y, range = 50) { // Added getNearbyAnimal
        for (const animal of this.animals) {
            if (animal.isDead) continue;
            const dx = animal.x - x;
            const dy = animal.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return animal;
            }
        }
        return null;
    }

    getNearbyDroppedItem(x, y, range = 50) {
        let nearest = null;
        let minDist = range;
        for (const drop of this.droppedItems) {
            const dist = Math.sqrt((drop.x - x) ** 2 + (drop.y - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = drop;
            }
        }
        return nearest;
    }

    getNearbyEnemy(x, y, range = 50) {
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return enemy;
            }
        }
        return null;
    }

    getNearbyBuilding(x, y, range = 50) {
        for (const building of this.buildings) {
            if (building.destroyed) continue;
            const dx = building.x - x;
            const dy = building.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return building;
            }
        }
        return null;
    }

    getNearbyStorage(x, y, range = 80) {
        for (const building of this.buildings) {
            if (building.destroyed) continue;
            if (building.type !== 'storage') continue;
            const dx = building.x - x;
            const dy = building.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return building;
            }
        }
        return null;
    }

    getNearbyWorkbench(x, y, range = 80) {
        for (const building of this.buildings) {
            if (building.destroyed) continue;
            if (building.type !== 'workbench') continue;
            const dx = building.x - x;
            const dy = building.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return building;
            }
        }
        return null;
    }

    getNearbyFurnace(x, y, range = 80) {
        for (const building of this.buildings) {
            if (building.destroyed) continue;
            if (building.type !== 'furnace') continue;
            const dx = building.x - x;
            const dy = building.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return building;
            }
        }
        return null;
    }

    getNearbyBed(x, y, range = 80) {
        for (const building of this.buildings) {
            if (building.destroyed) continue;
            if (building.type !== 'bed') continue;
            const dx = building.x - x;
            const dy = building.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < range) {
                return building;
            }
        }
        return null;
    }

    resize(w, h) {
        this.camera.width = w;
        this.camera.height = h;
    }

    respawnPlayer() {
        this.player.health = this.player.maxHealth;
        // User requested 0,0 start
        this.player.x = 0;
        this.player.y = 0;
        this.uiState = 'none';
    }
}
