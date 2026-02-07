import { getItem } from '../data/Items.js';

export class Inventory {
    constructor(size = 27) {
        this.size = size;
        this.slots = new Array(size).fill(null); // { itemId, count }
        this.selectedSlot = 0; // ホットバー選択
    }

    // アイテム追加 (可能な分だけ追加, 余りを返す)
    addItem(itemId, count) {
        const itemDef = getItem(itemId);
        if (!itemDef) return count;

        const maxStack = itemDef.stackable;
        let remaining = count;

        // 既存スタックに追加
        for (let i = 0; i < this.size && remaining > 0; i++) {
            if (this.slots[i] && this.slots[i].itemId === itemId) {
                const canAdd = maxStack - this.slots[i].count;
                const toAdd = Math.min(canAdd, remaining);
                this.slots[i].count += toAdd;
                remaining -= toAdd;
            }
        }

        // 空きスロットに追加
        for (let i = 0; i < this.size && remaining > 0; i++) {
            if (!this.slots[i]) {
                const toAdd = Math.min(maxStack, remaining);
                const newSlot = { itemId, count: toAdd };

                // 銃の場合はcurrentAmmoを初期化
                if (itemDef.type === 'weapon' && itemDef.magazineSize) {
                    newSlot.currentAmmo = itemDef.magazineSize;
                }

                this.slots[i] = newSlot;
                remaining -= toAdd;
            }
        }

        return remaining; // 追加しきれなかった分
    }

    // アイテム消費
    removeItem(itemId, count) {
        let remaining = count;

        for (let i = this.size - 1; i >= 0 && remaining > 0; i--) {
            if (this.slots[i] && this.slots[i].itemId === itemId) {
                const toRemove = Math.min(this.slots[i].count, remaining);
                this.slots[i].count -= toRemove;
                remaining -= toRemove;

                if (this.slots[i].count <= 0) {
                    this.slots[i] = null;
                }
            }
        }

        return remaining === 0; // 全部消費できたか
    }

    // 所持数を取得
    countItem(itemId) {
        let total = 0;
        for (const slot of this.slots) {
            if (slot && slot.itemId === itemId) {
                total += slot.count;
            }
        }
        return total;
    }

    // 素材が足りるかチェック
    hasItems(requirements) {
        for (const req of requirements) {
            if (this.countItem(req.id) < req.count) {
                return false;
            }
        }
        return true;
    }

    // 選択中のアイテムを取得
    getSelectedItem() {
        const slot = this.slots[this.selectedSlot];
        if (!slot) return null;
        return getItem(slot.itemId);
    }

    // ホットバー切り替え (1-9キー)
    selectSlot(index) {
        if (index >= 0 && index < 9) {
            this.selectedSlot = index;
        }
    }

    // スロット内容をスワップ (D&D用)
    swapSlots(indexA, indexB) {
        const temp = this.slots[indexA];
        this.slots[indexA] = this.slots[indexB];
        this.slots[indexB] = temp;
    }

    // スタックを分割（半分に分ける）
    splitStack(fromIndex, toIndex) {
        const fromSlot = this.slots[fromIndex];
        if (!fromSlot || fromSlot.count <= 1) return false;

        const splitCount = Math.ceil(fromSlot.count / 2);
        const remainCount = fromSlot.count - splitCount;

        // 移動先が空の場合
        if (!this.slots[toIndex]) {
            this.slots[toIndex] = {
                itemId: fromSlot.itemId,
                count: splitCount
            };
            this.slots[fromIndex].count = remainCount;
            return true;
        }

        // 移動先に同じアイテムがある場合
        const toSlot = this.slots[toIndex];
        if (toSlot.itemId === fromSlot.itemId) {
            const itemDef = getItem(fromSlot.itemId);
            const maxStack = itemDef?.stackable || 30;
            const canAdd = maxStack - toSlot.count;

            if (canAdd > 0) {
                const toAdd = Math.min(splitCount, canAdd);
                toSlot.count += toAdd;
                fromSlot.count -= toAdd;

                if (fromSlot.count <= 0) {
                    this.slots[fromIndex] = null;
                }
                return true;
            }
        }

        return false;
    }

    // スタックから1個取り出す
    takeOne(fromIndex, toIndex) {
        const fromSlot = this.slots[fromIndex];
        if (!fromSlot) return false;

        // 移動先が空の場合
        if (!this.slots[toIndex]) {
            this.slots[toIndex] = {
                itemId: fromSlot.itemId,
                count: 1
            };
            fromSlot.count--;

            if (fromSlot.count <= 0) {
                this.slots[fromIndex] = null;
            }
            return true;
        }

        // 移動先に同じアイテムがある場合
        const toSlot = this.slots[toIndex];
        if (toSlot.itemId === fromSlot.itemId) {
            const itemDef = getItem(fromSlot.itemId);
            const maxStack = itemDef?.stackable || 30;

            if (toSlot.count < maxStack) {
                toSlot.count++;
                fromSlot.count--;

                if (fromSlot.count <= 0) {
                    this.slots[fromIndex] = null;
                }
                return true;
            }
        }

        return false;
    }

    clear() {
        this.slots = new Array(this.size).fill(null);
    }
}
