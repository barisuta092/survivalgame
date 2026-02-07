import { Input } from './Input.js';
import { World } from './World.js';
import { getItem, ItemType } from './data/Items.js';
import { Recipes, SmeltingRecipes } from './data/Recipes.js';
import { audioManager } from './systems/AudioManager.js';
import { textureManager } from './systems/TextureManager.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { Minimap } from './ui/Minimap.js'; // Import Minimap
import { Building } from './entities/Building.js';
import { DroppedItem } from './entities/DroppedItem.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.input = new Input();
        this.iconCache = {}; // 先に初期化
        this.saveSystem = new SaveSystem();

        // ゲーム状態管理
        this.gameState = 'mainmenu'; // 'mainmenu', 'playing', 'paused'
        this.world = null; // メインメニュ ーでは null

        this.minimap = null; // Minimap instance

        this.minimap = null; // Minimap instance

        this.lastTime = 0;

        // ドラッグ&ドロップ状態
        this.dragData = null; // { source: 'inv'|'storage'|'furnace', index, itemId, count }
        this.heldItem = null; // Currently held item for click-based move
        this.heldFrom = null; // { type, index } where item was picked from

        // セーブスロット管理
        this.currentSaveSlot = 1; // 現在使用中のセーブスロット
        this.slotSelectionMode = null; // 'save' | 'load' | null
        this.confirmCallback = null; // 確認ダイアログのコールバック

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.loadAssets();

        this.setupHotbarUI();
        this.setupInventoryUI();
        this.setupCraftingUI();
        this.setupStorageUI();
        this.setupFurnaceUI();
        this.setupTopButtons();
        this.setupDragDrop();
        this.setupMobileUI();
        this.setupHelpUI();
        this.setupMainMenu();
        this.setupPauseMenu();
        this.setupRecipeBook();
        this.setupSaveSlotUI();
        this.setupConfirmDialog();

        // メインメニューを表示
        this.showMainMenu();

        requestAnimationFrame((t) => this.loop(t));
    }

    loadAssets() {
        textureManager.load('player', 'assets/textures/player.png', true);
        textureManager.load('zombie_normal', 'assets/textures/zombie_normal.png', true);
        textureManager.load('zombie_power', 'assets/textures/zombie_power.png', true);
        textureManager.load('zombie_ranger', 'assets/textures/zombie_ranger.png', true);
        textureManager.load('deer', 'assets/textures/deer.png', true);
        textureManager.load('tree', 'assets/textures/tree.png', true);
    }

    setupMobileUI() {
        const mobileControls = document.getElementById('mobile-controls');
        window.addEventListener('touchstart', () => {
            if (mobileControls.classList.contains('hidden')) {
                mobileControls.classList.remove('hidden');
            }
        }, { once: true });

        // モバイルメニューボタン
        const btnMobileMenu = document.getElementById('btn-mobile-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const btnMenuClose = document.getElementById('btn-menu-close');
        const btnMenuInventory = document.getElementById('btn-menu-inventory');
        const btnMenuCrafting = document.getElementById('btn-menu-crafting');
        const btnMenuHelp = document.getElementById('btn-menu-help');

        // メニューを開く
        if (btnMobileMenu) {
            btnMobileMenu.addEventListener('click', () => {
                mobileMenu?.classList.remove('hidden');
            });
        }

        // メニューを閉じる
        if (btnMenuClose) {
            btnMenuClose.addEventListener('click', () => {
                mobileMenu?.classList.add('hidden');
            });
        }

        // インベントリを開く
        if (btnMenuInventory) {
            btnMenuInventory.addEventListener('click', () => {
                mobileMenu?.classList.add('hidden');
                document.getElementById('btn-inventory')?.click();
            });
        }

        // クラフトを開く
        if (btnMenuCrafting) {
            btnMenuCrafting.addEventListener('click', () => {
                mobileMenu?.classList.add('hidden');
                document.getElementById('btn-crafting')?.click();
            });
        }

        // ヘルプを開く
        if (btnMenuHelp) {
            btnMenuHelp.addEventListener('click', () => {
                mobileMenu?.classList.add('hidden');
                document.getElementById('btn-help')?.click();
            });
        }
    }

    setupTopButtons() {
        document.getElementById('btn-inventory').onclick = () => {
            if (this.world.uiState === 'gameover') return;
            this.world.uiState = this.world.uiState === 'inventory' ? 'none' : 'inventory';
        };
        document.getElementById('btn-crafting').onclick = () => {
            if (this.world.uiState === 'gameover') return;
            this.world.uiState = this.world.uiState === 'crafting' ? 'none' : 'crafting';
        };
        document.getElementById('btn-fullscreen').onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };
        document.getElementById('btn-respawn').onclick = () => {
            this.world.respawnPlayer();
        };
    }

    setupDragDrop() {
        // Obsolete: Replaced by click-based handleSlotClick
    }

    attachSlotEvents(slot, source, index, getSlotData) {
        slot.dataset.source = source;
        slot.dataset.index = index;

        const start = (e) => {
            if (e.type === 'touchstart') {
                this.startDrag(source, index, getSlotData());
            } else {
                if (e.button === 0) {
                    this.startDrag(source, index, getSlotData());
                }
            }
        };

        slot.onmousedown = start;
        slot.ontouchstart = start;

        slot.onmouseenter = () => {
            if (this.dragData) slot.classList.add('drag-over');
        };
        slot.onmouseleave = () => {
            slot.classList.remove('drag-over');
        };
    }

    startDrag(source, index, slotData) {
        if (!slotData) return;

        this.dragData = {
            source,
            index,
            itemId: slotData.itemId,
            count: slotData.count
        };

        const ghost = document.getElementById('drag-ghost');
        const item = getItem(slotData.itemId);
        const iconCanvas = this.getItemIcon(item);

        ghost.innerHTML = '';
        if (iconCanvas) {
            const img = document.createElement('img');
            img.src = iconCanvas.toDataURL();
            ghost.appendChild(img);
        }
        ghost.classList.remove('hidden');
    }

    endDrag() {
        const ghost = document.getElementById('drag-ghost');
        ghost.classList.add('hidden');
        this.dragData = null;
        document.querySelectorAll('.slot.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    handleDrop(target, targetIndex) {
        if (!this.dragData) return;
        const { source, index: sourceIndex } = this.dragData;

        if (source === target && sourceIndex === targetIndex) {
            this.endDrag();
            return;
        }

        const playerInv = this.world.player.inventory;
        const storage = this.world.openStorage;
        let sourceSlots, targetSlots;

        if (source === 'inv') sourceSlots = playerInv.slots;
        else if ((source === 'storage' || source === 'furnace') && storage) sourceSlots = storage.storageContents;

        if (target === 'inv') targetSlots = playerInv.slots;
        else if ((target === 'storage' || target === 'furnace') && storage) targetSlots = storage.storageContents;

        if (sourceSlots && targetSlots) {
            const temp = targetSlots[targetIndex];
            targetSlots[targetIndex] = sourceSlots[sourceIndex];
            sourceSlots[sourceIndex] = temp;
        }
        this.endDrag();
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // ゲームプレイ中のみワールドを更新
        if (this.gameState === 'playing' && this.world) {
            this.world.update(dt, this.input);
            if (this.minimap) this.minimap.update(dt); // Update Minimap
        }

        // ワールドが存在しない場合は早期リターン
        if (!this.world) return;

        const invScreen = document.getElementById('inventory-screen');
        const craftList = document.getElementById('crafting-list');
        const storageScreen = document.getElementById('storage-screen');
        const furnaceScreen = document.getElementById('furnace-screen');
        const gameOverScreen = document.getElementById('game-over-screen');

        invScreen.classList.toggle('hidden', this.world.uiState !== 'inventory' && this.world.uiState !== 'crafting');
        craftList.classList.toggle('hidden', this.world.uiState !== 'crafting');
        storageScreen.classList.toggle('hidden', this.world.uiState !== 'storage');
        furnaceScreen.classList.toggle('hidden', this.world.uiState !== 'furnace');

        // モバイルコントロールを UI が開いている時は非表示
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            const isUIOpen = this.world.uiState !== 'none' && this.world.uiState !== 'gameover';
            mobileControls.classList.toggle('hidden', isUIOpen);
        }

        if (this.world.uiState === 'gameover') {
            gameOverScreen.classList.remove('hidden');
            document.getElementById('death-day').textContent = this.world.dayNight.dayNumber;
            const hours = Math.floor(this.world.dayNight.elapsedTime / (this.world.dayNight.dayLength / 24));
            document.getElementById('death-time').textContent = hours + (this.world.dayNight.dayNumber - 1) * 24;
        } else {
            gameOverScreen.classList.add('hidden');
        }

        this.updateHotbarUI();
        if (this.world.uiState === 'inventory' || this.world.uiState === 'crafting') this.updateInventoryUI();
        if (this.world.uiState === 'crafting') this.updateCraftingUI();
        if (this.world.uiState === 'storage') this.updateStorageUI();
        if (this.world.uiState === 'furnace') this.updateFurnaceUI();
    }

    updateFurnaceUI() {
        // ... (existing furnace UI code)
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.world) {
            this.world.draw(this.ctx);
            if (this.minimap) this.minimap.draw(this.ctx); // Draw Minimap
            this.drawPlayerStatus();
        }
    }

    drawPlayerStatus() {
        const player = this.world.player;
        const barWidth = 150, barHeight = 15;
        const x = 20;
        const y = this.canvas.height - 60; // 左下

        // HPバー
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
        const hpRatio = player.health / player.maxHealth;
        this.ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
        this.ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillText(`HP: ${Math.ceil(player.health)}/${player.maxHealth}`, x + 5, y + 12);

        // 食糧ゲージ (HPバーの右)
        const foodX = x + barWidth + 15;
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(foodX - 2, y - 2, barWidth + 4, barHeight + 4);
        const foodRatio = player.food / player.maxFood;
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.fillRect(foodX, y, barWidth * foodRatio, barHeight);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`FOOD: ${Math.ceil(player.food)}/${player.maxFood}`, foodX + 5, y + 12);

        // 座標表示 (上部中央に維持)
        const coordText = `X: ${Math.floor(player.x)} Y: ${Math.floor(player.y)}`;
        this.ctx.font = 'bold 14px monospace';
        const textWidth = this.ctx.measureText(coordText).width;
        const coordX = this.canvas.width / 2 - textWidth / 2;
        const bgX = coordX - 10;
        const bgY = 5;
        const bgWidth = textWidth + 20;
        const bgHeight = 25;
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(coordText, this.canvas.width / 2, bgY + bgHeight / 2);
        this.ctx.textAlign = 'left'; // Reset for other text
        this.ctx.textBaseline = 'alphabetic'; // Reset
    }

    setupHotbarUI() {
        const container = document.getElementById('Hotbar-container');
        container.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = `hotbar-slot-${i}`;
            slot.onclick = () => this.world.player.inventory.selectSlot(i);
            container.appendChild(slot);
        }
    }

    setupInventoryUI() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';
        for (let i = 0; i < 27; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            grid.appendChild(slot);
            this.attachSlotEvents(slot, 'inv', i, () => this.world.player.inventory.slots[i]);
        }
    }

    // click-based inventory move/merge logic (Minecraft-style)
    handleSlotClick(type, index, isRightClick = false) {
        // Guard against null world/player (game not started)
        if (!this.world || !this.world.player) {
            console.log('handleSlotClick: No world or player');
            return;
        }

        const player = this.world.player;
        const inventory = player.inventory;
        const storage = this.world.openStorage; // Can be storage or furnace

        let sourceContainer;
        let sourceIndex = index;

        // Identify source container based on UI type
        if (type === 'inv') {
            sourceContainer = inventory;
        } else if (type === 'storage' && storage) {
            sourceContainer = {
                slots: storage.storageContents,
                size: storage.storageContents.length
            };
        } else if (type === 'furnace' && storage) {
            sourceContainer = {
                slots: storage.storageContents,
                size: 3
            };
        }

        if (!sourceContainer) return;

        // Simple "Selected Item" state for moving
        if (!this.heldItem) {
            // Pick up
            const slot = sourceContainer.slots[sourceIndex];
            if (!slot) return;

            if (isRightClick) {
                // Split half
                const count = Math.ceil(slot.count / 2);
                if (slot.count > 1) {
                    this.heldItem = { ...slot, count: count };
                    slot.count -= count;
                    this.heldFrom = { type, index };
                } else {
                    // Pick up whole if only 1
                    this.heldItem = slot;
                    sourceContainer.slots[sourceIndex] = null;
                    this.heldFrom = { type, index };
                }
            } else {
                // Pick up all
                this.heldItem = slot;
                sourceContainer.slots[sourceIndex] = null;
                this.heldFrom = { type, index };
            }

            this.updateDragGhost();
        } else {
            // Place / Merge / Swap
            let targetSlot = sourceContainer.slots[sourceIndex];

            if (!targetSlot) {
                // Place all
                if (isRightClick) {
                    // Place one
                    sourceContainer.slots[sourceIndex] = { ...this.heldItem, count: 1 };
                    this.heldItem.count--;
                    if (this.heldItem.count <= 0) this.heldItem = null;
                } else {
                    sourceContainer.slots[sourceIndex] = this.heldItem;
                    this.heldItem = null;
                }
            } else if (targetSlot.itemId === this.heldItem.itemId) {
                // Merge
                // Check max stack
                const max = 30;
                const space = max - targetSlot.count;
                if (space > 0) {
                    if (isRightClick) {
                        // Add one
                        targetSlot.count++;
                        this.heldItem.count--;
                        if (this.heldItem.count <= 0) this.heldItem = null;
                    } else {
                        const toAdd = Math.min(this.heldItem.count, space);
                        targetSlot.count += toAdd;
                        this.heldItem.count -= toAdd;
                        if (this.heldItem.count <= 0) this.heldItem = null;
                    }
                }
            } else {
                // Swap
                if (!isRightClick) {
                    sourceContainer.slots[sourceIndex] = this.heldItem;
                    this.heldItem = targetSlot; // Swap held
                }
            }
            this.updateDragGhost();
        }

        // Force UI update
        this.updateInventoryUI();
        if (this.world.uiState === 'storage') this.updateStorageUI();
        if (this.world.uiState === 'furnace') this.updateFurnaceUI();
        this.updateHotbarUI();
    }

    updateDragGhost() {
        const ghost = document.getElementById('drag-ghost');
        if (this.heldItem) {
            ghost.classList.remove('hidden');
            // Render item icon
            const item = getItem(this.heldItem.itemId);
            const icon = this.getItemIcon(item);
            ghost.innerHTML = '';
            if (icon) {
                const img = document.createElement('img');
                img.src = icon.toDataURL();
                img.style.width = '32px';
                img.style.height = '32px';
                ghost.appendChild(img);
            }
            const count = document.createElement('span');
            count.textContent = this.heldItem.count;
            count.className = 'item-count';
            ghost.appendChild(count);
        } else {
            ghost.classList.add('hidden');
        }
    }

    attachSlotEvents(slot, type, index, getSlotData) {
        slot.addEventListener('click', (e) => {
            // Prevent default hotbar selection if in inventory screen
            e.stopPropagation();
            e.preventDefault();
            console.log('Slot clicked:', type, index);
            this.handleSlotClick(type, index, false);
        });
        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Slot right-clicked:', type, index);
            this.handleSlotClick(type, index, true);
        });
        // For mobile long press
        let pressTimer;
        slot.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent ghost clicks
            pressTimer = setTimeout(() => {
                this.handleSlotClick(type, index, true); // Long press = Right click
            }, 500);
        });
        slot.addEventListener('touchend', (e) => {
            clearTimeout(pressTimer);
            // Short tap = left click
            if (e.cancelable) e.preventDefault();
            this.handleSlotClick(type, index, false);
        });
    }

    setupStorageUI() {
        const storageGrid = document.getElementById('storage-grid');
        storageGrid.innerHTML = '';
        for (let i = 0; i < 27; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            storageGrid.appendChild(slot);
            this.attachSlotEvents(slot, 'storage', i, () => this.world.openStorage?.storageContents[i]);
        }
        const invGrid = document.getElementById('storage-inv-grid');
        invGrid.innerHTML = '';
        for (let i = 0; i < 27; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            invGrid.appendChild(slot);
            this.attachSlotEvents(slot, 'inv', i, () => this.world.player.inventory.slots[i]);
        }
    }

    setupFurnaceUI() {
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`furnace-slot-${i}`);
            this.attachSlotEvents(slot, 'furnace', i, () => this.world.openStorage?.storageContents[i]);
        }
        const invGrid = document.getElementById('furnace-inv-grid');
        invGrid.innerHTML = '';
        for (let i = 0; i < 27; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            invGrid.appendChild(slot);
            this.attachSlotEvents(slot, 'inv', i, () => this.world.player.inventory.slots[i]);
        }
    }

    setupCraftingUI() {
        const list = document.getElementById('crafting-list');
        list.innerHTML = '';
        for (const recipe of Recipes) {
            const item = getItem(recipe.result);
            if (!item) continue;
            const row = document.createElement('div');
            row.className = 'craft-row';
            row.dataset.result = recipe.result;
            const name = document.createElement('span');
            name.textContent = item.name + (recipe.count > 1 ? ` x${recipe.count}` : '');
            name.style.flex = '1';
            const ingText = recipe.ingredients.map(ing => `${getItem(ing.id)?.name || ing.id} x${ing.count}`).join(', ');
            const ingredients = document.createElement('span');
            ingredients.textContent = ingText;
            ingredients.style.fontSize = '0.8em';
            ingredients.style.color = '#aaa';
            const btn = document.createElement('button');
            btn.textContent = 'Craft';
            btn.onclick = () => this.tryCraft(recipe);
            row.appendChild(name);
            row.appendChild(ingredients);
            row.appendChild(btn);
            list.appendChild(row);
        }
    }

    setupHelpUI() {
        const btnHelp = document.getElementById('btn-help');
        const btnClose = document.getElementById('btn-help-close');
        const screen = document.getElementById('help-screen');

        btnHelp.onclick = () => {
            this.world.uiState = 'help';
            screen.classList.remove('hidden');
        };

        btnClose.onclick = () => {
            this.world.uiState = 'none';
            screen.classList.add('hidden');
        };
    }

    tryCraft(recipe) {
        const inv = this.world.player.inventory;
        if (inv.hasItems(recipe.ingredients)) {
            recipe.ingredients.forEach(ing => inv.removeItem(ing.id, ing.count));
            inv.addItem(recipe.result, recipe.count);
        }
    }

    updateHotbarUI() {
        const inv = this.world.player.inventory;
        const player = this.world.player;
        for (let i = 0; i < 9; i++) {
            const slotEl = document.getElementById(`hotbar-slot-${i}`);
            slotEl.classList.toggle('selected', i === inv.selectedSlot);
            this.renderSlot(slotEl, inv.slots[i]);

            // リロード進行バーを表示（選択スロットのみ）
            if (i === inv.selectedSlot && player.reloadCooldown > 0 && player.reloadMaxTime > 0) {
                let progressBar = slotEl.querySelector('.reload-progress');
                if (!progressBar) {
                    progressBar = document.createElement('div');
                    progressBar.className = 'reload-progress';
                    progressBar.style.position = 'absolute';
                    progressBar.style.bottom = '0';
                    progressBar.style.left = '0';
                    progressBar.style.height = '4px';
                    progressBar.style.backgroundColor = '#22c55e';
                    progressBar.style.transition = 'width 0.1s';
                    progressBar.style.borderRadius = '0 0 4px 4px';
                    slotEl.appendChild(progressBar);
                }
                const progress = 1 - (player.reloadCooldown / player.reloadMaxTime);
                progressBar.style.width = `${progress * 100}%`;
            } else {
                const existingBar = slotEl.querySelector('.reload-progress');
                if (existingBar) existingBar.remove();
            }
        }
    }

    updateInventoryUI() {
        const inv = this.world.player.inventory;
        for (let i = 0; i < 27; i++) {
            const slotEl = document.querySelectorAll('#inventory-grid .slot')[i];
            if (slotEl) this.renderSlot(slotEl, inv.slots[i]);
        }
    }

    updateStorageUI() {
        const storage = this.world.openStorage;
        const inv = this.world.player.inventory;
        if (!storage) return;
        for (let i = 0; i < 27; i++) {
            const sSlot = document.querySelectorAll('#storage-grid .slot')[i];
            if (sSlot) this.renderSlot(sSlot, storage.storageContents[i]);
            const iSlot = document.querySelectorAll('#storage-inv-grid .slot')[i];
            if (iSlot) this.renderSlot(iSlot, inv.slots[i]);
        }
    }

    updateFurnaceUI() {
        const furnace = this.world.openStorage;
        const inv = this.world.player.inventory;
        if (!furnace || furnace.type !== 'furnace') return;

        for (let i = 0; i < 3; i++) {
            const slotEl = document.getElementById(`furnace-slot-${i}`);
            this.renderSlot(slotEl, furnace.storageContents[i]);
        }
        for (let i = 0; i < 27; i++) {
            const slotEl = document.querySelectorAll('#furnace-inv-grid .slot')[i];
            if (slotEl) this.renderSlot(slotEl, inv.slots[i]);
        }

        const bar = document.getElementById('smelting-progress-bar');
        const activeRecipe = furnace.storageContents[0] ? furnace.world?.SmeltingRecipes?.find(r => r.input === furnace.storageContents[0].itemId) : null;
        // 注意: SmeltingRecipes は import されているのでそちらを参照。
        // ... But wait, SmeltingRecipes is imported here too.
        // Actually, SmeltingRecipes can be checked from data.
        import('./data/Recipes.js').then(m => {
            const recipes = m.SmeltingRecipes;
            const r = recipes.find(rr => rr.input === furnace.storageContents[0]?.itemId);
            if (r) bar.style.width = (furnace.smeltingProgress / r.time * 100) + '%';
            else bar.style.width = '0%';
        });

        document.getElementById('fuel-time').textContent = Math.ceil(furnace.fuelRemaining) + 's';
        document.getElementById('furnace-screen').classList.toggle('burning', furnace.fuelRemaining > 0);
    }

    updateCraftingUI() {
        const inv = this.world.player.inventory;
        const hasWorkbench = !!this.world.getNearbyWorkbench(this.world.player.x, this.world.player.y, 80);
        for (const recipe of Recipes) {
            const row = document.querySelector(`.craft-row[data-result="${recipe.result}"]`);
            if (!row) continue;
            const isVisible = !recipe.requiresWorkbench || hasWorkbench;
            row.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) {
                const canCraft = inv.hasItems(recipe.ingredients);
                row.style.opacity = canCraft ? '1' : '0.5';
                const btn = row.querySelector('button');
                if (btn) btn.disabled = !canCraft;
            }
        }
    }

    renderSlot(slotEl, slotData) {
        slotEl.innerHTML = '';
        if (slotData) {
            const item = getItem(slotData.itemId);
            const iconCanvas = this.getItemIcon(item);
            if (iconCanvas) {
                const img = document.createElement('img');
                img.src = iconCanvas.toDataURL();
                img.style.width = '32px';
                img.style.height = '32px';
                img.style.imageRendering = 'pixelated';
                img.draggable = false;
                slotEl.appendChild(img);
            }

            // 通常のアイテム数表示
            if (slotData.count > 1) {
                const countEl = document.createElement('span');
                countEl.className = 'item-count';
                countEl.textContent = slotData.count;
                slotEl.appendChild(countEl);
            }

            // 銃の残弾数表示
            if (item && item.type === ItemType.WEAPON && item.magazineSize && slotData.currentAmmo !== undefined) {
                const ammoEl = document.createElement('span');
                ammoEl.className = 'ammo-count';
                ammoEl.textContent = `${slotData.currentAmmo}/${item.magazineSize}`;
                ammoEl.style.position = 'absolute';
                ammoEl.style.top = '2px';
                ammoEl.style.left = '3px';
                ammoEl.style.fontSize = '10px';
                ammoEl.style.color = slotData.currentAmmo > 0 ? '#fbbf24' : '#ef4444';
                ammoEl.style.fontWeight = 'bold';
                ammoEl.style.textShadow = '1px 1px 0 #000';
                slotEl.appendChild(ammoEl);
            }
        }
    }

    getItemIcon(itemOrId) {
        if (!itemOrId) return null;
        const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId.id || itemOrId.itemId;
        if (!itemId) return null;

        if (this.iconCache[itemId]) return this.iconCache[itemId];

        const item = getItem(itemId);
        if (!item) return null;

        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const cx = size / 2;
        const cy = size / 2;

        if (item.id === 'wood') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(8, 6, 16, 20);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(10, 8, 12, 16);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(14, 8, 2, 16);
        } else if (item.id === 'stone') {
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
            grd.addColorStop(0, '#9ca3af');
            grd.addColorStop(1, '#4b5563');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
        } else if (item.id === 'iron_ore' || item.id === 'copper_ore' || item.id === 'sulfur_ore') {
            const baseColor = item.id === 'iron_ore' ? '#ffffff' : item.id === 'copper_ore' ? '#f97316' : '#fef08a';
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.moveTo(cx, 4); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, 28); ctx.lineTo(cx - 12, cy); ctx.closePath();
            ctx.fill();
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(cx, 8); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, 24); ctx.lineTo(cx - 8, cy); ctx.closePath();
            ctx.fill();
        } else if (item.id === 'coal' || item.id === 'charcoal') {
            ctx.fillStyle = '#111827';
            ctx.beginPath(); ctx.arc(cx - 5, cy, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 5, cy, 7, 0, Math.PI * 2); ctx.fill();
        } else if (item.id === 'sulfur') {
            // Yellow powder
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.arc(cx, cy + 2, 10, Math.PI, 0); ctx.fill(); // pile
            ctx.beginPath(); ctx.arc(cx - 4, cy + 4, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 4, cy + 6, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
        } else if (item.id === 'gunpowder') {
            // Dark gray powder
            ctx.fillStyle = '#171717'; // Neutral 900 (Black)
            ctx.beginPath(); ctx.arc(cx, cy + 2, 10, Math.PI, 0); ctx.fill(); // pile
            ctx.beginPath(); ctx.arc(cx - 3, cy + 3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 5, cy + 5, 2, 0, Math.PI * 2); ctx.fill();
        } else if (item.id === 'iron_ingot' || item.id === 'copper_ingot') {
            const grd = ctx.createLinearGradient(4, 10, 28, 22);
            grd.addColorStop(0, item.id === 'iron_ingot' ? '#f3f4f6' : '#f97316');
            grd.addColorStop(1, item.id === 'iron_ingot' ? '#9ca3af' : '#7c2d12');
            ctx.fillStyle = grd;
            ctx.fillRect(4, 10, 24, 12);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.strokeRect(4, 10, 24, 12);
        } else if (item.id === 'bomb') {
            ctx.fillStyle = '#1f2937';
            ctx.beginPath(); ctx.arc(cx, cy + 2, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#9ca3af'; // Fuse cap
            ctx.fillRect(cx - 3, cy - 12, 6, 6);
            ctx.strokeStyle = '#fca5a5'; // Fuse
            ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.quadraticCurveTo(cx + 5, cy - 16, cx + 8, cy - 14); ctx.stroke();
            ctx.fillStyle = '#ef4444'; // Spark
            ctx.beginPath(); ctx.arc(cx + 8, cy - 14, 2, 0, Math.PI * 2); ctx.fill();
        } else if (item.toolType === 'axe') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(14, 6, 4, 22);
            const headGrd = ctx.createLinearGradient(18, 6, 28, 18);
            headGrd.addColorStop(0, item.tier === 'iron' ? '#f8fafc' : '#94a3b8');
            headGrd.addColorStop(1, '#475569');
            ctx.fillStyle = headGrd;
            ctx.beginPath();
            ctx.moveTo(18, 6); ctx.lineTo(28, 10); ctx.lineTo(28, 18); ctx.lineTo(18, 14); ctx.closePath();
            ctx.fill();
        } else if (item.toolType === 'pickaxe') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(14, 8, 4, 20);
            const headGrd = ctx.createLinearGradient(4, 6, 28, 14);
            headGrd.addColorStop(0, item.tier === 'iron' ? '#f8fafc' : '#94a3b8');
            headGrd.addColorStop(1, '#475569');
            ctx.fillStyle = headGrd;
            ctx.beginPath();
            ctx.moveTo(4, 14); ctx.quadraticCurveTo(cx, 4, 28, 14); ctx.lineTo(24, 14); ctx.quadraticCurveTo(cx, 8, 8, 14); ctx.closePath();
            ctx.fill();
        } else if (item.id === 'fruit') {
            const grd = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 10);
            grd.addColorStop(0, '#f87171');
            grd.addColorStop(1, '#b91c1c');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#15803d'; // leaf
            ctx.beginPath(); ctx.ellipse(cx, cy - 8, 6, 3, -0.7, 0, Math.PI * 2); ctx.fill();
        } else if (item.id === 'raw_meat' || item.id === 'cooked_meat') {
            ctx.fillStyle = item.id === 'raw_meat' ? '#f87171' : '#7c2d12';
            ctx.beginPath(); ctx.ellipse(cx, cy, 12, 8, 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.moveTo(cx - 6, cy - 2); ctx.lineTo(cx + 6, cy + 2); ctx.stroke();
        } else if (item.id === 'spear') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(14, 4, 4, 24);
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(22, 12); ctx.lineTo(10, 12); ctx.closePath(); ctx.fill();
        } else if (item.toolType === 'torch') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(13, 14, 6, 16);
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.arc(16, 8, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.arc(16, 9, 4, 0, Math.PI * 2); ctx.fill();
        } else if (item.type === 'weapon') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(4, 12, 24, 8);
            ctx.fillStyle = '#334155';
            ctx.fillRect(4, 18, 8, 8);
        } else if (item.type === 'ammo') {
            ctx.fillStyle = '#fbbf24';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(8 + i * 8, cy, 3, 0, Math.PI * 2); ctx.fill();
            }
        } else if (item.buildingType === 'wall' || item.buildingType === 'door') {
            const baseC = item.tier === 'iron' ? '#94a3b8' : item.tier === 'stone' ? '#4b5563' : '#92400e';
            ctx.fillStyle = baseC;
            ctx.fillRect(4, 4, 24, 24);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.strokeRect(4, 4, 24, 24);
            if (item.buildingType === 'door') {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(12, 8, 8, 16);
            }
        } else if (item.buildingType === 'workbench') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(4, 6, 24, 20);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(4, 6, 24, 6);
        } else if (item.buildingType === 'furnace') {
            ctx.fillStyle = '#374151';
            ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f97316'; // fire
            ctx.beginPath(); ctx.arc(cx, cy + 4, 6, 0, Math.PI * 2); ctx.fill();
        } else if (item.buildingType === 'storage') {
            ctx.fillStyle = '#422006';
            ctx.fillRect(4, 8, 24, 18);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(14, 15, 4, 5);
        } else {
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        this.iconCache[item.id] = canvas;
        return canvas;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.world) this.world.resize(this.canvas.width, this.canvas.height);
    }

    // ==== メインメニュー ====
    setupMainMenu() {
        const btnNewGame = document.getElementById('btn-new-game');
        const btnLoadGame = document.getElementById('btn-load-game');
        const btnSettings = document.getElementById('btn-settings');

        if (btnNewGame) {
            btnNewGame.onclick = () => this.newGame();
        }
        if (btnLoadGame) {
            btnLoadGame.onclick = () => this.showSlotSelection('load');
            // セーブデータがない場合は無効化
            btnLoadGame.disabled = !this.saveSystem.hasAnySaveData();
        }
        if (btnSettings) {
            btnSettings.onclick = () => alert('設定画面は今後実装予定');
        }
    }

    showMainMenu() {
        this.gameState = 'mainmenu';
        const menu = document.getElementById('main-menu');
        if (menu) menu.classList.remove('hidden');

        // セーブデータ情報を表示
        const btnLoadGame = document.getElementById('btn-load-game');
        if (btnLoadGame) {
            const hasAnySave = this.saveSystem.hasAnySaveData();
            btnLoadGame.textContent = hasAnySave ? 'Load Game' : 'Load Game (No Save)';
            btnLoadGame.disabled = !hasAnySave;
        }
    }

    hideMainMenu() {
        const menu = document.getElementById('main-menu');
        if (menu) menu.classList.add('hidden');
    }

    newGame() {
        this.world = new World(this);
        this.minimap = new Minimap(this.world); // Initialize Minimap
        this.world.respawnPlayer();
        this.gameState = 'playing';
        this.resize();
        this.hideMainMenu();
    }

    // セーブデータをロードして開始
    loadGame(slotId = 1) {
        const saveData = this.saveSystem.loadGame(slotId);
        if (!saveData) return;

        this.currentSaveSlot = slotId;
        this.world = new World(this);
        this.minimap = new Minimap(this.world); // Initialize Minimap

        // データの復元
        this.world.dayNight.elapsedTime = saveData.world.dayTime;
        this.world.dayNight.dayNumber = saveData.world.dayNumber;
        this.world.player.x = saveData.player.x;
        this.world.player.y = saveData.player.y;
        this.world.player.health = saveData.player.health;
        this.world.player.food = saveData.player.food;
        this.world.player.maxHealth = saveData.player.maxHealth;
        this.world.player.maxFood = saveData.player.maxFood;

        this.saveSystem.deserializeInventory(saveData.player.inventory, this.world.player.inventory);

        // 建物
        this.world.buildings = saveData.world.buildings.map(b => {
            const building = new Building(b.x, b.y, b.id, b.angle || 0);
            if (b.storageContents && building.storageContents) {
                this.saveSystem.deserializeInventory(b.storageContents, { slots: building.storageContents });
            }
            if (b.fuelRemaining) building.fuelRemaining = b.fuelRemaining;
            if (b.smeltingProgress) building.smeltingProgress = b.smeltingProgress;
            return building;
        });

        // ドロップアイテム
        this.world.droppedItems = saveData.world.droppedItems.map(d => {
            return new DroppedItem(d.x, d.y, d.itemId, d.count);
        });

        this.gameState = 'playing';
        this.resize();
        this.hideMainMenu();
        this.hideSlotSelection();
    }

    saveGameNow(slotId = 1) {
        if (!this.world) return false;
        this.currentSaveSlot = slotId;
        return this.saveSystem.saveGame(this.world, null, slotId);
    }

    // オートセーブ（スロット1に保存）
    autoSave() {
        if (!this.world) return false;
        return this.saveSystem.saveGame(this.world, null, 1);
    }

    // ==== ポーズメニュー ====
    setupPauseMenu() {
        const btnResume = document.getElementById('btn-resume');
        const btnSave = document.getElementById('btn-save');
        const btnMainMenu = document.getElementById('btn-to-mainmenu');

        if (btnResume) {
            btnResume.onclick = () => this.resumeGame();
        }
        if (btnSave) {
            btnSave.onclick = () => {
                this.showSlotSelection('save');
            };
        }
        if (btnMainMenu) {
            btnMainMenu.onclick = () => {
                if (confirm('メインメニューに戻りますか？（現在の進行状況はセーブされません）')) {
                    this.hidePauseMenu();
                    this.showMainMenu();
                    this.world = null;
                }
            };
        }

        // ESCキーでポーズ
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.gameState === 'playing') {
                this.showPauseMenu();
            } else if (e.key === 'Escape' && this.gameState === 'paused') {
                this.resumeGame();
            }
        });
    }

    showPauseMenu() {
        if (this.gameState !== 'playing') return;
        this.gameState = 'paused';
        const menu = document.getElementById('pause-menu');
        if (menu) menu.classList.remove('hidden');
    }

    hidePauseMenu() {
        const menu = document.getElementById('pause-menu');
        if (menu) menu.classList.add('hidden');
    }

    resumeGame() {
        this.hidePauseMenu();
        this.gameState = 'playing';
    }

    // ==== レシピブック ====
    setupRecipeBook() {
        const btnRecipeBook = document.getElementById('btn-recipe-book');
        const btnRecipeClose = document.getElementById('btn-recipe-close');

        if (btnRecipeBook) {
            btnRecipeBook.onclick = () => this.showRecipeBook();
        }
        if (btnRecipeClose) {
            btnRecipeClose.onclick = () => this.hideRecipeBook();
        }

        // レシピリストを生成
        this.updateRecipeBookUI();
    }

    showRecipeBook() {
        const book = document.getElementById('recipe-book');
        if (book) book.classList.remove('hidden');
    }

    hideRecipeBook() {
        const book = document.getElementById('recipe-book');
        if (book) book.classList.add('hidden');
    }

    updateRecipeBookUI() {
        const container = document.getElementById('recipe-list');
        if (!container) return;

        container.innerHTML = '';
        Recipes.forEach(recipe => {
            const item = getItem(recipe.result);
            if (!item) return;

            const recipeEl = document.createElement('div');
            recipeEl.className = 'recipe-item';

            const title = document.createElement('h4');
            title.textContent = `${item.name} x${recipe.count}`;

            const ingredients = document.createElement('div');
            ingredients.className = 'recipe-ingredients';
            recipe.ingredients.forEach(ing => {
                const ingItem = getItem(ing.id);
                const ingEl = document.createElement('span');
                ingEl.textContent = `${ingItem?.name || ing.id} x${ing.count}`;
                ingredients.appendChild(ingEl);
            });

            const requirement = document.createElement('div');
            requirement.className = 'recipe-requirement';
            requirement.textContent = recipe.requiresWorkbench ? '⚒️ 作業台が必要' : '✋ 手持ちでクラフト可能';

            recipeEl.appendChild(title);
            recipeEl.appendChild(ingredients);
            recipeEl.appendChild(requirement);
            container.appendChild(recipeEl);
        });
    }

    // ==== セーブスロット選択UI ====
    setupSaveSlotUI() {
        const btnCancel = document.getElementById('btn-slot-cancel');
        if (btnCancel) {
            btnCancel.onclick = () => this.hideSlotSelection();
        }
    }

    showSlotSelection(mode) {
        this.slotSelectionMode = mode; // 'save' or 'load'
        const screen = document.getElementById('save-slot-screen');
        const title = document.getElementById('slot-screen-title');

        if (title) {
            title.textContent = mode === 'save' ? 'セーブスロット選択' : 'ロードスロット選択';
        }

        this.updateSlotList();
        if (screen) screen.classList.remove('hidden');
    }

    hideSlotSelection() {
        const screen = document.getElementById('save-slot-screen');
        if (screen) screen.classList.add('hidden');
        this.slotSelectionMode = null;
    }

    updateSlotList() {
        const container = document.getElementById('save-slot-list');
        if (!container) return;

        container.innerHTML = '';
        const slots = this.saveSystem.getAllSlotInfo();

        slots.forEach(slot => {
            const item = document.createElement('div');
            item.className = 'save-slot-item';
            if (slot.isAutoSave) item.classList.add('autosave');
            if (slot.isEmpty) item.classList.add('empty');

            const info = document.createElement('div');
            info.className = 'save-slot-info';

            const name = document.createElement('div');
            name.className = 'save-slot-name';
            if (slot.isAutoSave) {
                name.textContent = `スロット ${slot.slotId} (オートセーブ)`;
            } else {
                name.textContent = `スロット ${slot.slotId}`;
            }

            const details = document.createElement('div');
            details.className = 'save-slot-details';
            if (slot.isEmpty) {
                details.textContent = '-- 空きスロット --';
            } else {
                details.textContent = `Day ${slot.day} - ${slot.formattedDate}`;
            }

            info.appendChild(name);
            info.appendChild(details);
            item.appendChild(info);

            if (slot.isAutoSave) {
                const badge = document.createElement('span');
                badge.className = 'save-slot-badge';
                badge.textContent = 'AUTO';
                item.appendChild(badge);
            }

            // クリックハンドラー
            item.onclick = () => this.handleSlotSelection(slot);

            container.appendChild(item);
        });
    }

    handleSlotSelection(slot) {
        if (this.slotSelectionMode === 'load') {
            // ロードモード
            if (slot.isEmpty) {
                alert('このスロットにはセーブデータがありません');
                return;
            }
            this.loadGame(slot.slotId);
        } else if (this.slotSelectionMode === 'save') {
            // セーブモード
            if (slot.isAutoSave) {
                alert('オートセーブスロットには手動でセーブできません');
                return;
            }

            if (!slot.isEmpty) {
                // 上書き確認
                this.showConfirmDialog(
                    '上書き確認',
                    `スロット ${slot.slotId} のデータを上書きしますか？`,
                    () => {
                        if (this.saveGameNow(slot.slotId)) {
                            alert('セーブしました！');
                            this.hideSlotSelection();
                            this.hidePauseMenu();
                        } else {
                            alert('セーブに失敗しました');
                        }
                    }
                );
            } else {
                // 空きスロットなので直接セーブ
                if (this.saveGameNow(slot.slotId)) {
                    alert('セーブしました！');
                    this.hideSlotSelection();
                    this.hidePauseMenu();
                } else {
                    alert('セーブに失敗しました');
                }
            }
        }
    }

    // ==== 確認ダイアログ ====
    setupConfirmDialog() {
        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        if (btnYes) {
            btnYes.onclick = () => {
                if (this.confirmCallback) {
                    this.confirmCallback();
                }
                this.hideConfirmDialog();
            };
        }
        if (btnNo) {
            btnNo.onclick = () => this.hideConfirmDialog();
        }
    }

    showConfirmDialog(title, message, callback) {
        this.confirmCallback = callback;
        const dialog = document.getElementById('confirm-dialog');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (dialog) dialog.classList.remove('hidden');
    }

    hideConfirmDialog() {
        const dialog = document.getElementById('confirm-dialog');
        if (dialog) dialog.classList.add('hidden');
        this.confirmCallback = null;
    }
}

