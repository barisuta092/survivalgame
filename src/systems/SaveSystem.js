// LocalStorageベースのセーブ/ロードシステム（複数スロット対応）
export class SaveSystem {
    constructor() {
        this.saveKeyPrefix = 'survival_game_save_';
        this.settingsKey = 'survival_game_settings';
        this.totalSlots = 6;
        this.autoSaveSlot = 1; // スロット1はオートセーブ専用
    }

    // スロットキーを取得
    getSlotKey(slotId) {
        return `${this.saveKeyPrefix}${slotId}`;
    }

    // ゲーム状態を保存
    saveGame(world, achievementSystem, slotId = 1) {
        try {
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                slotId: slotId,

                // プレイヤー状態
                player: {
                    x: world.player.x,
                    y: world.player.y,
                    health: world.player.health,
                    food: world.player.food,
                    maxHealth: world.player.maxHealth,
                    maxFood: world.player.maxFood,
                    inventory: this.serializeInventory(world.player.inventory),
                    armor: {
                        helmet: world.player.armor?.helmet || null,
                        chest: world.player.armor?.chest || null,
                        legs: world.player.armor?.legs || null
                    }
                },

                // ワールド状態
                world: {
                    dayNumber: world.dayNight.dayNumber,
                    dayTime: world.dayNight.elapsedTime,

                    // 建物
                    buildings: world.buildings.map(b => ({
                        id: b.buildingId,
                        x: b.x,
                        y: b.y,
                        angle: b.angle,
                        hp: b.hp,
                        storageContents: this.serializeInventory({ slots: b.storageContents || [] }).slots,
                        fuelRemaining: b.fuelRemaining,
                        smeltingProgress: b.smeltingProgress
                    })),

                    // ドロップアイテム
                    droppedItems: world.droppedItems.map(d => ({
                        x: d.x,
                        y: d.y,
                        itemId: d.itemId,
                        count: d.count
                    }))
                },

                // アチーブメント
                achievements: achievementSystem ? achievementSystem.save() : null
            };

            localStorage.setItem(this.getSlotKey(slotId), JSON.stringify(saveData));
            return true;
        } catch (error) {
            console.error('セーブに失敗:', error);
            return false;
        }
    }

    // ゲーム状態をロード
    loadGame(slotId = 1) {
        try {
            const saveDataStr = localStorage.getItem(this.getSlotKey(slotId));
            if (!saveDataStr) {
                return null;
            }

            const saveData = JSON.parse(saveDataStr);

            // バージョンチェック
            if (saveData.version !== '1.0') {
                console.warn('セーブデータのバージョンが異なります');
            }

            return saveData;
        } catch (error) {
            console.error('ロードに失敗:', error);
            return null;
        }
    }

    // 特定スロットのセーブデータ存在確認
    hasSaveData(slotId = 1) {
        return localStorage.getItem(this.getSlotKey(slotId)) !== null;
    }

    // いずれかのスロットにセーブデータがあるか確認
    hasAnySaveData() {
        for (let i = 1; i <= this.totalSlots; i++) {
            if (this.hasSaveData(i)) return true;
        }
        return false;
    }

    // セーブデータを削除
    deleteSave(slotId = 1) {
        localStorage.removeItem(this.getSlotKey(slotId));
    }

    // 特定スロットの情報を取得
    getSlotInfo(slotId) {
        try {
            const saveDataStr = localStorage.getItem(this.getSlotKey(slotId));
            if (!saveDataStr) {
                return {
                    slotId: slotId,
                    isEmpty: true,
                    isAutoSave: slotId === this.autoSaveSlot
                };
            }

            const saveData = JSON.parse(saveDataStr);
            return {
                slotId: slotId,
                isEmpty: false,
                isAutoSave: slotId === this.autoSaveSlot,
                day: saveData.world.dayNumber,
                timestamp: saveData.timestamp,
                formattedDate: this.formatDate(saveData.timestamp)
            };
        } catch (error) {
            return {
                slotId: slotId,
                isEmpty: true,
                isAutoSave: slotId === this.autoSaveSlot
            };
        }
    }

    // 全スロット情報を取得
    getAllSlotInfo() {
        const slots = [];
        for (let i = 1; i <= this.totalSlots; i++) {
            slots.push(this.getSlotInfo(i));
        }
        return slots;
    }

    // インベントリをシリアライズ
    serializeInventory(inventory) {
        return {
            size: inventory.size,
            slots: inventory.slots.map(slot => {
                if (!slot) return null;
                return {
                    itemId: slot.itemId,
                    count: slot.count,
                    currentAmmo: slot.currentAmmo
                };
            }),
            selectedSlot: inventory.selectedSlot
        };
    }

    // インベントリをデシリアライズ
    deserializeInventory(data, inventory) {
        if (!data || !data.slots || !inventory) return;
        if (data.selectedSlot !== undefined) {
            inventory.selectedSlot = data.selectedSlot;
        }
        for (let i = 0; i < data.slots.length; i++) {
            inventory.slots[i] = data.slots[i];
        }
    }

    // 設定を保存
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('設定の保存に失敗:', error);
            return false;
        }
    }

    // 設定をロード
    loadSettings() {
        try {
            const settingsStr = localStorage.getItem(this.settingsKey);
            if (!settingsStr) {
                return this.getDefaultSettings();
            }
            return JSON.parse(settingsStr);
        } catch (error) {
            console.error('設定のロードに失敗:', error);
            return this.getDefaultSettings();
        }
    }

    // デフォルト設定
    getDefaultSettings() {
        return {
            volume: 0.5,
            showFPS: false,
            autoSave: true,
            autoSaveInterval: 300 // 5分
        };
    }

    // 日付フォーマット
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    }

    // 時間フォーマット
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}時間${minutes}分`;
        }
        return `${minutes}分`;
    }
}
