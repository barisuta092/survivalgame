import { Inventory } from '../systems/Inventory.js';
import { getItem, ItemType } from '../data/Items.js';
import { audioManager } from '../systems/AudioManager.js';
import { textureManager } from '../systems/TextureManager.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 150;
        this.angle = 0;

        this.health = 100;
        this.maxHealth = 100;
        this.food = 100;
        this.maxFood = 100;
        this.hungerRate = 0.1; // 1秒間に減る量 (10秒で1減少)

        this.inventory = new Inventory(27);
        this.armor = {
            head: null,
            body: null,
            legs: null
        };
        this.reach = 100;
        this.attackCooldown = 0;

        // 採掘アニメーション用
        this.isSwinging = false;
        this.swingTimer = 0;
        this.swingDuration = 0.3;

        // 移動アニメーション用
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.facingRight = true;
        this.game = null; // Will be set by the game world

        // 初期装備: 石の斧と松明
        this.inventory.addItem('stone_axe', 1);
        this.inventory.addItem('torch', 1);

        // 採取/破壊関連
        this.miningTarget = null;
        this.miningDamagePerSecond = 20;

        // 射撃関連
        this.shootCooldown = 0;
        this.reloadCooldown = 0; // リロードのクールダウン
        this.reloadMaxTime = 0; // リロードの最大時間（進捗表示用）
    }

    getDefense() {
        let defense = 0;
        if (this.armor.head) defense += this.armor.head.defense || 0;
        if (this.armor.body) defense += this.armor.body.defense || 0;
        if (this.armor.legs) defense += this.armor.legs.defense || 0;
        return defense;
    }

    takeDamage(amount) {
        // 防御力による軽減計算 (例: 防御10で約9%軽減, 防御100で50%軽減)
        const defense = this.getDefense();
        const reducedDamage = Math.max(1, Math.round(amount * (50 / (50 + defense))));

        this.health -= reducedDamage;
        audioManager.playHit();

        // ダメージ効果（赤く点滅など）
        this.damageFlash = 0.2;

        if (this.health <= 0) {
            this.health = 0;
            // worldへの参照が必要だが、引数で渡されていない場合はthis.game.worldを使うか、dieメソッドで処理
            if (this.game && this.game.world) {
                this.die(this.game.world);
            }
        }
    }

    die(world) {
        if (world) {
            world.spreadItemsOnDeath(this.x, this.y, this.inventory);
        }
        this.health = this.maxHealth;
        this.food = this.maxFood;
        // Infinite world: respawn at 0,0
        this.x = 0;
        this.y = 0;

        // 死亡時に石の斧を付与
        this.inventory.clear();
        this.inventory.addItem('stone_axe', 1);

        // 防具ロスト（任意）
        this.armor.head = null;
        this.armor.body = null;
        this.armor.legs = null;
    }

    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    equipArmor(item) {
        if (!item || item.type !== 'armor') return false;

        const slot = item.slot; // 'head', 'body', 'legs'
        const currentArmor = this.armor[slot];

        // 現在の装備を外してインベントリに戻す（空きがあれば）
        if (currentArmor) {
            if (!this.inventory.addItem(currentArmor)) {
                return false; // インベントリがいっぱいで外せない
            }
        }

        this.armor[slot] = item;
        return true;
    }

    unequipArmor(slot) {
        const armor = this.armor[slot];
        if (!armor) return;

        if (this.inventory.addItem(armor)) {
            this.armor[slot] = null;
        }
    }

    update(dt, input, camera, world) {
        // UI開いている間は移動などを止める
        if (world.uiState !== 'none') {
            return;
        }

        // Game参照を保持（死亡時などで利用）
        if (!this.game && world.game) {
            this.game = world.game;
        }

        // 移動
        // UI開いている間は移動などを止める (このチェックはWorldクラスで行うか、UI側でinputをブロックする)

        // 移動入力
        const axis = input.getAxis();
        if (axis.x !== 0 || axis.y !== 0) {
            let newX = this.x + axis.x * this.speed * dt;
            let newY = this.y + axis.y * this.speed * dt;

            // 建物との当たり判定
            if (!this.checkBuildingCollision(newX, this.y, world)) {
                this.x = newX;
            }
            if (!this.checkBuildingCollision(this.x, newY, world)) {
                this.y = newY;
            }

            // ジョイスティック操作時は移動方向を向く
            if (input.joystick.active) {
                this.angle = Math.atan2(axis.y, axis.x);
            }
        }

        // マウス操作時はマウスカーソルの方を向く（PC操作時、タッチデバイスでない場合のみ）
        if (!input.joystick.active && !input.isTouch) {
            const mouseX = input.mouse.x + camera.x;
            const mouseY = input.mouse.y + camera.y;
            this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        }

        // マップ端の制限解除 (無限ワールド)
        // this.x = Math.max(0, Math.min(world.width, this.x));
        // this.y = Math.max(0, Math.min(world.height, this.y));

        // カメラ位置更新
        camera.follow(this, world.width, world.height);

        // ホットバー切り替え (1-9キー)
        for (let i = 0; i < 9; i++) {
            if (input.keys[`Digit${i + 1}`]) {
                this.inventory.selectSlot(i);
            }
        }

        // クールダウン更新
        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }
        if (this.reloadCooldown > 0) {
            this.reloadCooldown -= dt;
        }

        // Rキーでリロード
        if (input.keys['KeyR'] && !input.prevKeys?.['KeyR']) {
            this.tryReload();
        }

        // アクション: スペースキー - 攻撃（槍・銃）/ 投擲（爆弾）
        const isSpaceDown = input.keys['Space'];

        if (isSpaceDown) {
            const item = this.inventory.getSelectedItem();
            const isWeapon = item && item.type === ItemType.WEAPON;
            const isSpear = item && item.toolType === 'spear';
            const isBomb = item && item.id === 'bomb';

            if (isBomb) {
                this.throwBomb(world);
            } else if (isWeapon && item.ammoType) {
                this.tryShoot(world);
            } else if (isSpear) {
                this.tryMineOrBreak(dt, world, camera, input, true);
            }
        }

        // 右クリック処理: 設置 / 防具装備
        if (input.mouse.rightDown && !input.mouse.prevRightDown) {
            const item = this.inventory.getSelectedItem();
            if (item) {
                if (item.type === ItemType.PLACEABLE) {
                    this.tryPlace(world, camera, input);
                } else if (item.type === 'armor') {
                    if (this.equipArmor(item)) {
                        this.inventory.removeItem(this.inventory.selectedSlot, 1);
                        audioManager.playPickup();
                    }
                }
            }
        }
        input.mouse.prevRightDown = input.mouse.rightDown;

        // 空腹度減少
        this.food -= this.hungerRate * dt;
        if (this.food <= 0) {
            this.food = 0;
            // お腹が空きすぎるとダメージ
            this.takeDamage(2 * dt);
        }

        // 食糧ゲージが90以上の時、体力を1秒に1回復
        if (this.food >= 90 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 1 * dt);
        }


        // 左クリックで採取/破壊（斧・ピッケル・素手）
        if (input.mouse.down) {
            this.tryMineOrBreak(dt, world, camera, input);
        } else if (!input.keys['Space']) { // スペースキーが押されていない場合のみminingTargetをリセット
            this.miningTarget = null;
        }
    }

    checkBuildingCollision(x, y, world) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;

        for (const building of world.buildings) {
            if (building.destroyed) continue;
            if (building.canPlayerPass()) continue;

            const bounds = building.getBounds();
            if (x + halfW > bounds.x && x - halfW < bounds.x + bounds.width &&
                y + halfH > bounds.y && y - halfH < bounds.y + bounds.height) {
                return true;
            }
        }
        return false;
    }

    tryShoot(world) {
        if (this.shootCooldown > 0 || this.reloadCooldown > 0) return;

        // Inventory.getSelectedItem() returns the item DEFINITION (static), not the slot.
        // We need the slot to modify currentAmmo.
        const inv = this.inventory;
        const slot = inv.slots[inv.selectedSlot];

        if (!slot) return;
        const itemDef = getItem(slot.itemId);
        if (!itemDef || itemDef.type !== ItemType.WEAPON) return;

        // 銃のマガジンから弾を取得
        if (slot.currentAmmo === undefined) {
            slot.currentAmmo = itemDef.magazineSize;
        }

        if (slot.currentAmmo <= 0) {
            // 弾がない場合は自動リロード
            this.tryReload();
            return;
        }

        // マガジンから弾を消費
        slot.currentAmmo--;
        this.shootCooldown = itemDef.fireRate;
        audioManager.playShoot();

        const bulletSpeed = 600;
        const dx = Math.cos(this.angle);
        const dy = Math.sin(this.angle);

        if (itemDef.pellets) {
            for (let i = 0; i < itemDef.pellets; i++) {
                const spread = (Math.random() - 0.5) * 0.3;
                const angle = this.angle + spread;
                world.spawnBullet(this.x, this.y, Math.cos(angle), Math.sin(angle), bulletSpeed, itemDef.damage);
            }
        } else {
            world.spawnBullet(this.x, this.y, dx, dy, bulletSpeed, itemDef.damage);
        }
    }

    throwBomb(world) {
        const selectedItem = this.inventory.getSelectedItem();
        if (!selectedItem || selectedItem.id !== 'bomb') return;

        // 投擲クールダウン（射撃と同じで良いか、別にするか。ここでは射撃CDを流用）
        if (this.shootCooldown > 0) return;

        // インベントリから消費
        this.inventory.removeItem('bomb', 1);
        this.shootCooldown = 1.0; // 1秒に1回

        const speed = 400;
        const dx = Math.cos(this.angle);
        const dy = Math.sin(this.angle);

        world.spawnBomb(this.x, this.y, dx, dy, speed);

        // 投擲音（シューッという音とか。とりあえずPickup音で代用）
        // audioManager.playThrow(); 
    }

    tryReload() {
        if (this.reloadCooldown > 0) return;

        const inv = this.inventory;
        const slot = inv.slots[inv.selectedSlot];
        if (!slot) return;
        const itemDef = getItem(slot.itemId);

        if (!itemDef || itemDef.type !== ItemType.WEAPON) return;

        // 必要な弾薬タイプ
        const ammoType = itemDef.ammoType || 'ammo';

        // 現在の弾数を初期化
        slot.currentAmmo = slot.currentAmmo === undefined ? itemDef.magazineSize : slot.currentAmmo;

        // 既に満タンの場合はリロードしない
        if (slot.currentAmmo >= itemDef.magazineSize) return;

        // インベントリから弾薬を確認
        const ammoAvailable = this.inventory.countItem(ammoType);

        if (ammoAvailable <= 0) {
            // 弾薬がない
            return;
        }

        // ショットガンなどの一発ずつリロード
        if (itemDef.shellReload) {
            // 1発だけリロード
            this.inventory.removeItem(ammoType, 1);
            slot.currentAmmo += 1;
            const reloadTime = itemDef.reloadTime || 0.6;
            this.reloadCooldown = reloadTime;
            this.reloadMaxTime = reloadTime;
        } else {
            // 通常リロード: 一度に全弾
            const ammoNeeded = itemDef.magazineSize - slot.currentAmmo;
            const ammoToLoad = Math.min(ammoNeeded, ammoAvailable);
            this.inventory.removeItem(ammoType, ammoToLoad);
            slot.currentAmmo += ammoToLoad;
            const reloadTime = itemDef.reloadTime || 1.5;
            this.reloadCooldown = reloadTime;
            this.reloadMaxTime = reloadTime;
        }

        audioManager.playPickup(); // リロード音（仮）
    }

    tryPlace(world, camera, input) {
        const selectedItem = this.inventory.getSelectedItem();
        if (!selectedItem || selectedItem.type !== ItemType.PLACEABLE) {
            return;
        }

        // 設置位置
        const placeDistance = 50;
        const placeX = this.x + Math.cos(this.angle) * placeDistance;
        const placeY = this.y + Math.sin(this.angle) * placeDistance;

        // 壁/ドアの場合はプレイヤーの向きに垂直
        let placeAngle = 0;
        if (selectedItem.buildingType === 'wall' || selectedItem.buildingType === 'door') {
            placeAngle = this.angle + Math.PI / 2;
        }

        // 既存の建物との重複チェック
        // プレイヤーの当たり判定メソッドを流用するが、これはプレイヤーのサイズでチェックするため、
        // 設置物のサイズに合わせたチェックが必要。ここでは簡易的にプレイヤーサイズでチェック。
        // 厳密には設置物のサイズと位置でチェックする専用のメソッドが必要。
        if (this.checkBuildingCollision(placeX, placeY, world)) {
            return false;
        }

        // 設置
        world.placeBuilding(placeX, placeY, selectedItem.id, placeAngle);

        // インベントリから消費
        this.inventory.removeItem(selectedItem.id, 1);
        return true;
    }

    eat(item) {
        if (!item || item.type !== ItemType.FOOD) return;
        this.food = Math.min(this.maxFood, this.food + (item.foodValue || 0));
        this.inventory.removeItem(item.id, 1);
        audioManager.playEat();
    }

    tryMineOrBreak(dt, world, camera, input, isActionKey = false, preferAnimal = false) {
        const selectedItem = this.inventory.getSelectedItem();
        const toolType = selectedItem?.toolType || null;
        const miningSpeed = selectedItem?.miningSpeed || 1.0;

        // ターゲット探索
        let target = null;

        // 優先度: マウスカーソル位置(PC) > 前方の近接オブジェクト(モバイル/ACTキー)

        if (isActionKey || input.joystick.active || input.isTouch) {
            // 前方のオブジェクトを探索
            const reach = toolType === 'spear' ? 100 : 60;
            const checkX = this.x + Math.cos(this.angle) * (reach * 0.7);
            const checkY = this.y + Math.sin(this.angle) * (reach * 0.7);

            const nRes = world.getNearbyResource(checkX, checkY, reach * 0.5);
            const nAni = world.getNearbyAnimal(checkX, checkY, reach * 0.5);
            const nEne = world.getNearbyEnemy(checkX, checkY, reach * 0.5);
            const nBld = world.getNearbyBuilding(checkX, checkY, reach * 0.5);

            if (preferAnimal) {
                target = nAni || nEne || nRes || nBld;
            } else {
                target = nRes || nAni || nEne || nBld;
            }
        } else {
            // マウス位置のオブジェクトを探索
            const mouseX = input.mouse.x + camera.x;
            const mouseY = input.mouse.y + camera.y;

            // マウス位置付近かつプレイヤーから一定距離以内
            const reach = toolType === 'spear' ? 120 : 100;
            const distToMouse = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);
            if (distToMouse < reach) {
                const nRes = world.getNearbyResource(mouseX, mouseY, 30);
                const nAni = world.getNearbyAnimal(mouseX, mouseY, 30);
                const nEne = world.getNearbyEnemy(mouseX, mouseY, 30);
                const nBld = world.getNearbyBuilding(mouseX, mouseY, 30);

                if (preferAnimal) {
                    target = nAni || nEne || nRes || nBld;
                } else {
                    target = nRes || nAni || nEne || nBld;
                }
            }
        }

        if (!target) {
            this.miningTarget = null;
            return;
        }

        if (this.miningTarget !== target) {
            this.miningTarget = target;
        }

        // プレイヤーの基本マイニング力を定義
        const baseMiningPower = 30; // 1秒あたりのダメージ

        // 攻撃制限: 動物には槍(spear)か武器(weapon)のみ有効
        if (target.constructor.name === 'Animal') {
            const isSpear = toolType === 'spear';
            const isWeapon = selectedItem && selectedItem.type === 'weapon';
            if (!isSpear && !isWeapon) {
                return; // 斧やピッケル、素手では攻撃不可
            }
        }

        // 槍の制限: 資源や建築物は壊せない
        if ((target.constructor.name === 'Resource' || target.constructor.name === 'Building') && toolType === 'spear') {
            return;
        }

        // 素手の制限: 建物は壊せない（木と石のみ採掘可能）
        if (target.constructor.name === 'Building' && !toolType) {
            return; // 素手では建物は壊せない
        }

        const result = target.takeDamage(baseMiningPower * dt, toolType, miningSpeed);
        if (!result) return;

        audioManager.playMine(result.sfxType || 'stone'); // 命中ごとに音を鳴らす

        if (result.items) {
            for (const item of result.items) {
                world.spawnDrop(target.x, target.y, item.id, item.count);
            }
            this.miningTarget = null;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 本体テクスチャ
        const tex = textureManager.get('player');
        if (tex) {
            // 画像は中心が(this.x, this.y)になるように描画
            // 画像の向きが右向き(0度)であることを想定
            ctx.rotate(Math.PI / 2); // もし画像が上を向いていたら調整が必要
            ctx.drawImage(tex, -this.width, -this.height, this.width * 2, this.height * 2);
            ctx.rotate(-Math.PI / 2);
        } else {
            // フォールバック
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 手
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(15, 10, 8, 0, Math.PI * 2);
            ctx.arc(15, -10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // 装備品描画
        const selectedItem = this.inventory.getSelectedItem();
        if (selectedItem) {
            this.drawHeldItem(ctx, selectedItem);
        }

        ctx.restore();

        // 建築プレビュー
        this.drawPreview(ctx);

        // 採掘エフェクト（ターゲットに枠を表示）
        if (this.miningTarget && typeof this.miningTarget.getBounds === 'function') {
            const bounds = this.miningTarget.getBounds();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
    }

    drawPreview(ctx) {
        const item = this.inventory.getSelectedItem();
        if (!item || item.type !== ItemType.PLACEABLE) return;

        const placeDistance = 50;
        const placeX = this.x + Math.cos(this.angle) * placeDistance;
        const placeY = this.y + Math.sin(this.angle) * placeDistance;
        let placeAngle = 0;

        if (item.buildingType === 'wall' || item.buildingType === 'door') {
            placeAngle = this.angle + Math.PI / 2;
        }

        ctx.save();
        ctx.translate(placeX, placeY);
        ctx.rotate(placeAngle);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'; // 青半透明
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;

        if (item.buildingType === 'wall' || item.buildingType === 'door') {
            // 壁/ドアのプレビュー
            // 90度回転しているので、長方形の描画もそれに合わせる必要があるが
            // 設置ロジックでは +PI/2 している。
            // 描画時も同じ角度に回しているなら、矩形の向きは横長にすべきか縦長にすべきか。
            // "線"として見えるようにしたい -> 薄い矩形で表現
            // ユーザー曰く「90度ずれてる」とのことなので、描画時の矩形の向きを修正する
            ctx.fillRect(-30, -5, 60, 10);
            ctx.strokeRect(-30, -5, 60, 10);
        } else {
            // その他の建物（正方形）
            const size = 30;
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.strokeRect(-size / 2, -size / 2, size, size);
        }

        ctx.restore();
    }

    drawHeldItem(ctx, item) {
        ctx.save();
        ctx.translate(18, 0);

        if (item.toolType === 'axe') {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(-2, -8, 4, 16);
            ctx.fillStyle = item.tier === 'iron' ? '#ffffff' : '#78716c';
            ctx.beginPath();
            ctx.moveTo(2, -8);
            ctx.lineTo(10, -4);
            ctx.lineTo(10, 4);
            ctx.lineTo(2, 8);
            ctx.closePath();
            ctx.fill();
        } else if (item.toolType === 'pickaxe') {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(-2, -8, 4, 16);
            ctx.fillStyle = item.tier === 'iron' ? '#ffffff' : '#78716c';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(12, -6);
            ctx.lineTo(12, 6);
            ctx.lineTo(0, 10);
            ctx.closePath();
            ctx.fill();
        } else if (item.toolType === 'torch') {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(-2, -6, 4, 12);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, -10, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (item.type === ItemType.WEAPON) {
            ctx.fillStyle = '#374151';
            ctx.fillRect(-2, -3, 20, 6);
        }

        ctx.restore();
    }

    takeDamage(amount, world) {
        this.health -= amount;
        audioManager.playHit();
        if (this.health <= 0) {
            this.health = 0;
            this.die(world);
        }
    }

    die(world) {
        if (world) {
            world.spreadItemsOnDeath(this.x, this.y, this.inventory);
        }
        this.health = this.maxHealth;
        this.food = this.maxFood;
        this.x = world ? world.width / 2 : this.x;
        this.y = world ? world.height / 2 : this.y;

        // 死亡時に石の斧を付与
        this.inventory.clear();
        this.inventory.addItem('stone_axe', 1);
    }
}
