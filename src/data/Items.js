// アイテムタイプ
export const ItemType = {
    MATERIAL: 'material',
    TOOL: 'tool',
    WEAPON: 'weapon',
    ARMOR: 'armor',
    AMMO: 'ammo',
    PLACEABLE: 'placeable',
    FOOD: 'food'
};

// 全アイテム定義
export const Items = {
    // --- 素材 (スタック30) ---
    wood: { id: 'wood', name: '木材', type: ItemType.MATERIAL, stackable: 30 },
    stone: { id: 'stone', name: '石', type: ItemType.MATERIAL, stackable: 30 },
    iron_ore: { id: 'iron_ore', name: '鉄鉱石', type: ItemType.MATERIAL, stackable: 30 },
    copper_ore: { id: 'copper_ore', name: '銅鉱石', type: ItemType.MATERIAL, stackable: 30 },
    sulfur_ore: { id: 'sulfur_ore', name: '硫黄鉱石', type: ItemType.MATERIAL, stackable: 30 }, // Ore item
    coal: { id: 'coal', name: '石炭', type: ItemType.MATERIAL, stackable: 30 },
    iron_ingot: { id: 'iron_ingot', name: '鉄インゴット', type: ItemType.MATERIAL, stackable: 30 },
    copper_ingot: { id: 'copper_ingot', name: '銅インゴット', type: ItemType.MATERIAL, stackable: 30 },
    sulfur: { id: 'sulfur', name: '硫黄', type: ItemType.MATERIAL, stackable: 30 },
    gunpowder: { id: 'gunpowder', name: '火薬', type: ItemType.MATERIAL, stackable: 30 },
    leather: { id: 'leather', name: '革', type: ItemType.MATERIAL, stackable: 30 },

    // --- 道具 (スタック1) ---
    stone_axe: { id: 'stone_axe', name: '石の斧', type: ItemType.TOOL, stackable: 1, toolType: 'axe', tier: 'stone', miningSpeed: 1.5 },
    stone_pickaxe: { id: 'stone_pickaxe', name: '石のピッケル', type: ItemType.TOOL, stackable: 1, toolType: 'pickaxe', tier: 'stone', miningSpeed: 1.5 },
    iron_axe: { id: 'iron_axe', name: '鉄の斧', type: ItemType.TOOL, stackable: 1, toolType: 'axe', tier: 'iron', miningSpeed: 2.5 },
    iron_pickaxe: { id: 'iron_pickaxe', name: '鉄のピッケル', type: ItemType.TOOL, stackable: 1, toolType: 'pickaxe', tier: 'iron', miningSpeed: 2.5 },
    torch: { id: 'torch', name: '松明', type: ItemType.TOOL, stackable: 10, toolType: 'torch' },

    // --- 武器 (スタック1) ---
    bomb: { id: 'bomb', name: '爆弾', type: ItemType.WEAPON, stackable: 10, toolType: 'bomb', damage: 100, range: 100, isThrowable: true },
    pistol: { id: 'pistol', name: 'ピストル', type: ItemType.WEAPON, stackable: 1, magazineSize: 12, damage: 20, fireRate: 0.3, ammoType: 'pistol_ammo', reloadTime: 1.5 },
    shotgun: { id: 'shotgun', name: 'ショットガン', type: ItemType.WEAPON, stackable: 1, magazineSize: 6, damage: 8, pellets: 6, fireRate: 0.8, ammoType: 'shotgun_ammo', reloadTime: 0.6, shellReload: true },
    assault_rifle: { id: 'assault_rifle', name: 'アサルトライフル', type: ItemType.WEAPON, stackable: 1, magazineSize: 30, damage: 15, fireRate: 0.1, ammoType: 'ar_ammo', reloadTime: 2.5 },
    spear: { id: 'spear', name: '槍', type: ItemType.WEAPON, stackable: 1, toolType: 'spear', damage: 15, range: 100 },

    // --- 弾薬 (スタック60) ---
    pistol_ammo: { id: 'pistol_ammo', name: 'ピストル弾', type: ItemType.AMMO, stackable: 60 },
    shotgun_ammo: { id: 'shotgun_ammo', name: 'ショットガン弾', type: ItemType.AMMO, stackable: 60 },
    ar_ammo: { id: 'ar_ammo', name: 'AR弾', type: ItemType.AMMO, stackable: 60 },

    // --- 防具 (スタック1) ---
    leather_helmet: { id: 'leather_helmet', name: '革の帽子', type: ItemType.ARMOR, slot: 'head', defense: 2 },
    leather_armor: { id: 'leather_armor', name: '革の服', type: ItemType.ARMOR, slot: 'body', defense: 3 },
    leather_leggings: { id: 'leather_leggings', name: '革のズボン', type: ItemType.ARMOR, slot: 'legs', defense: 2 },

    iron_helmet: { id: 'iron_helmet', name: '鉄のヘルメット', type: ItemType.ARMOR, slot: 'head', defense: 5 },
    iron_armor: { id: 'iron_armor', name: '鉄の鎧', type: ItemType.ARMOR, slot: 'body', defense: 8 },
    iron_leggings: { id: 'iron_leggings', name: '鉄のレギンス', type: ItemType.ARMOR, slot: 'legs', defense: 5 },

    copper_helmet: { id: 'copper_helmet', name: '銅のヘルメット', type: ItemType.ARMOR, slot: 'head', defense: 3 },
    copper_armor: { id: 'copper_armor', name: '銅の鎧', type: ItemType.ARMOR, slot: 'body', defense: 5 },
    copper_leggings: { id: 'copper_leggings', name: '銅のレギンス', type: ItemType.ARMOR, slot: 'legs', defense: 3 },

    // --- 食料 (スタック20-50) ---
    fruit: { id: 'fruit', name: '果物', type: ItemType.FOOD, stackable: 50, foodValue: 15 }, // 食料
    raw_meat: { id: 'raw_meat', name: '生肉', type: ItemType.FOOD, stackable: 20, foodValue: 5 }, // 食料
    cooked_meat: { id: 'cooked_meat', name: '調理済み肉', type: ItemType.FOOD, stackable: 20, foodValue: 40 }, // 食料

    // --- 設置物 (スタック30 or 1) ---
    workbench: { id: 'workbench', name: '作業台', type: ItemType.PLACEABLE, stackable: 1, buildingType: 'workbench' },
    furnace: { id: 'furnace', name: 'かまど', type: ItemType.PLACEABLE, stackable: 1, buildingType: 'furnace' },
    storage: { id: 'storage', name: '保管庫', type: ItemType.PLACEABLE, stackable: 1, buildingType: 'storage' },
    bed: { id: 'bed', name: 'ベッド', type: ItemType.PLACEABLE, stackable: 1, buildingType: 'bed' },
    wood_wall: { id: 'wood_wall', name: '木の壁', type: ItemType.PLACEABLE, stackable: 30, buildingType: 'wall', tier: 'wood', hp: 100 },
    stone_wall: { id: 'stone_wall', name: '石の壁', type: ItemType.PLACEABLE, stackable: 30, buildingType: 'wall', tier: 'stone', hp: 200 },
    iron_wall: { id: 'iron_wall', name: '鉄の壁', type: ItemType.PLACEABLE, stackable: 30, buildingType: 'wall', tier: 'iron', hp: 400 },
    wood_door: { id: 'wood_door', name: '木のドア', type: ItemType.PLACEABLE, stackable: 30, buildingType: 'door', tier: 'wood', hp: 100 },
    stone_door: { id: 'stone_door', name: '石のドア', type: ItemType.PLACEABLE, stackable: 30, buildingType: 'door', tier: 'stone', hp: 200 },
    iron_door: { id: 'iron_door', name: '鉄のドア', type: ItemType.PLACEABLE, stackable: 30, buildingType: 'door', tier: 'iron', hp: 400 },
};

export function getItem(id) {
    return Items[id] || null;
}
