// レシピ定義
// requiresWorkbench: trueなら作業台が必要

export const Recipes = [
    // --- 手持ちクラフト ---
    { result: 'stone_axe', count: 1, ingredients: [{ id: 'wood', count: 2 }, { id: 'stone', count: 3 }], requiresWorkbench: false },
    { result: 'stone_pickaxe', count: 1, ingredients: [{ id: 'wood', count: 2 }, { id: 'stone', count: 3 }], requiresWorkbench: false },
    { result: 'spear', count: 1, ingredients: [{ id: 'wood', count: 2 }, { id: 'stone', count: 1 }], requiresWorkbench: false },
    { result: 'torch', count: 1, ingredients: [{ id: 'wood', count: 1 }, { id: 'coal', count: 1 }], requiresWorkbench: false },
    { result: 'workbench', count: 1, ingredients: [{ id: 'wood', count: 10 }], requiresWorkbench: false },

    // 素材 - 処理
    { result: 'sulfur', count: 1, ingredients: [{ id: 'sulfur_ore', count: 1 }], requiresWorkbench: false }, // Crushing ore
    { result: 'gunpowder', count: 2, ingredients: [{ id: 'sulfur', count: 1 }, { id: 'coal', count: 1 }], requiresWorkbench: false },

    // --- 作業台専用 ---
    { result: 'furnace', count: 1, ingredients: [{ id: 'stone', count: 10 }], requiresWorkbench: true },
    { result: 'storage', count: 1, ingredients: [{ id: 'wood', count: 10 }], requiresWorkbench: true },
    { result: 'bed', count: 1, ingredients: [{ id: 'wood', count: 6 }, { id: 'leather', count: 3 }], requiresWorkbench: true },
    { result: 'iron_axe', count: 1, ingredients: [{ id: 'wood', count: 2 }, { id: 'iron_ingot', count: 3 }], requiresWorkbench: true },
    { result: 'iron_pickaxe', count: 1, ingredients: [{ id: 'wood', count: 2 }, { id: 'iron_ingot', count: 3 }], requiresWorkbench: true },

    // 壁
    { result: 'wood_wall', count: 1, ingredients: [{ id: 'wood', count: 4 }], requiresWorkbench: true },
    { result: 'stone_wall', count: 1, ingredients: [{ id: 'stone', count: 4 }], requiresWorkbench: true },
    { result: 'iron_wall', count: 1, ingredients: [{ id: 'iron_ingot', count: 4 }], requiresWorkbench: true },
    { result: 'wood_door', count: 1, ingredients: [{ id: 'wood', count: 4 }], requiresWorkbench: true },
    { result: 'stone_door', count: 1, ingredients: [{ id: 'stone', count: 4 }], requiresWorkbench: true },
    { result: 'iron_door', count: 1, ingredients: [{ id: 'iron_ingot', count: 4 }], requiresWorkbench: true },

    // 防具 - 革
    { result: 'leather_helmet', count: 1, ingredients: [{ id: 'leather', count: 5 }], requiresWorkbench: true },
    { result: 'leather_armor', count: 1, ingredients: [{ id: 'leather', count: 8 }], requiresWorkbench: true },
    { result: 'leather_leggings', count: 1, ingredients: [{ id: 'leather', count: 7 }], requiresWorkbench: true },

    // 防具 - 銅
    { result: 'copper_helmet', count: 1, ingredients: [{ id: 'copper_ingot', count: 5 }], requiresWorkbench: true },
    { result: 'copper_armor', count: 1, ingredients: [{ id: 'copper_ingot', count: 8 }], requiresWorkbench: true },
    { result: 'copper_leggings', count: 1, ingredients: [{ id: 'copper_ingot', count: 7 }], requiresWorkbench: true },

    // 防具 - 鉄
    { result: 'iron_helmet', count: 1, ingredients: [{ id: 'iron_ingot', count: 5 }], requiresWorkbench: true },
    { result: 'iron_armor', count: 1, ingredients: [{ id: 'iron_ingot', count: 8 }], requiresWorkbench: true },
    { result: 'iron_leggings', count: 1, ingredients: [{ id: 'iron_ingot', count: 7 }], requiresWorkbench: true },

    // 銃・武器
    { result: 'pistol', count: 1, ingredients: [{ id: 'wood', count: 2 }, { id: 'iron_ingot', count: 5 }], requiresWorkbench: true },
    { result: 'shotgun', count: 1, ingredients: [{ id: 'wood', count: 4 }, { id: 'iron_ingot', count: 10 }], requiresWorkbench: true },
    { result: 'assault_rifle', count: 1, ingredients: [{ id: 'wood', count: 4 }, { id: 'iron_ingot', count: 15 }], requiresWorkbench: true },
    { result: 'bomb', count: 1, ingredients: [{ id: 'iron_ingot', count: 1 }, { id: 'gunpowder', count: 3 }], requiresWorkbench: true },

    // 弾薬
    { result: 'pistol_ammo', count: 12, ingredients: [{ id: 'copper_ingot', count: 1 }, { id: 'gunpowder', count: 1 }], requiresWorkbench: true },
    { result: 'shotgun_ammo', count: 6, ingredients: [{ id: 'copper_ingot', count: 1 }, { id: 'gunpowder', count: 2 }], requiresWorkbench: true },
    { result: 'ar_ammo', count: 30, ingredients: [{ id: 'copper_ingot', count: 1 }, { id: 'gunpowder', count: 2 }], requiresWorkbench: true },
];

// 精錬レシピ (かまど用)
export const SmeltingRecipes = [
    { input: 'iron_ore', output: 'iron_ingot', count: 1, time: 10, coalTime: 5 },
    { input: 'copper_ore', output: 'copper_ingot', count: 1, time: 10, coalTime: 5 },
    { input: 'raw_meat', output: 'cooked_meat', count: 1, time: 10, coalTime: 5 },
];
