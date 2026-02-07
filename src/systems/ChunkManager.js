
import { Resource, ResourceType } from '../entities/Resource.js';

export class ChunkManager {
    constructor(world) {
        this.world = world;
        this.chunkSize = 1000; // 1000x1000 pixels per chunk
        this.loadedChunks = new Set(); // Stores keys "cx,cy"

        // Keep track of resources per chunk to easily unload them
        // key: "cx,cy", value: [Resource, Resource, ...]
        this.chunkResources = new Map();

        // 資源の上限
        this.maxResources = 500;
    }

    update(playerX, playerY) {
        const cx = Math.floor(playerX / this.chunkSize);
        const cy = Math.floor(playerY / this.chunkSize);

        // Load surrounding chunks (e.g., 3x3 area around player)
        // Range 1 means current + 1 neighbor on each side -> 3x3
        const range = 1;
        const activeKeys = new Set();

        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const ncx = cx + dx;
                const ncy = cy + dy;
                const key = this.getChunkKey(ncx, ncy);
                activeKeys.add(key);

                if (!this.loadedChunks.has(key)) {
                    this.loadChunk(ncx, ncy);
                }
            }
        }

        // Unload far chunks (optional, simply removing from world.resources)
        // For simplicity in this phase, we might keep them or implement unloading
        // If we want "Almost infinite", we should unload to prevent lag
        for (const key of this.loadedChunks) {
            if (!activeKeys.has(key)) {
                this.unloadChunk(key);
            }
        }
    }

    getChunkKey(cx, cy) {
        return `${cx},${cy}`;
    }

    loadChunk(cx, cy) {
        const key = this.getChunkKey(cx, cy);
        this.loadedChunks.add(key);

        console.log(`Loading chunk ${key}`);

        // 資源数が上限に達している場合は新規生成しない
        if (this.world.resources.length >= this.maxResources) {
            this.chunkResources.set(key, []);
            return;
        }

        // Generate resources for this chunk
        const remainingCapacity = this.maxResources - this.world.resources.length;
        const newResources = this.generateChunkResources(cx, cy, remainingCapacity);

        // Store reference
        this.chunkResources.set(key, newResources);

        // Add to world
        this.world.resources.push(...newResources);
    }

    unloadChunk(key) {
        if (!this.loadedChunks.has(key)) return;

        this.loadedChunks.delete(key);
        // console.log(`Unloading chunk ${key}`);

        const resourcesToRemove = this.chunkResources.get(key);
        if (resourcesToRemove) {
            // Remove from world.resources
            // This is O(N*M) where N is total resources. 
            // Better to use a Set in World or just filter.
            // Since we push/splice, let's filter.
            this.world.resources = this.world.resources.filter(r => !resourcesToRemove.includes(r));

            this.chunkResources.delete(key);
        }
    }

    generateChunkResources(cx, cy, maxCount = 40) {
        const resources = [];
        const desiredCount = 20 + Math.floor(Math.random() * 20); // Resources per chunk
        const count = Math.min(desiredCount, maxCount);

        // We utilize specific seeded-like random if we want deterministic,
        // but for now Math.random is used as per existing style.
        // To prevent resources "moving" when reloading, we would need a seed.

        for (let i = 0; i < count; i++) {
            // Local coordinates within chunk
            const localX = Math.random() * this.chunkSize;
            const localY = Math.random() * this.chunkSize;

            // World coordinates
            const x = cx * this.chunkSize + localX;
            const y = cy * this.chunkSize + localY;

            // Biome check
            const biome = this.world.getBiome(x, y);
            let type = this.getResourceTypeForBiome(biome);

            if (type) {
                // Check for building collision
                let collides = false;
                for (const building of this.world.buildings) {
                    const dx = building.x - x;
                    const dy = building.y - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < building.size + 40) { // Simple radius check
                        collides = true;
                        break;
                    }
                }

                if (!collides) {
                    resources.push(new Resource(x, y, type));
                }
            }
        }
        return resources;
    }

    getResourceTypeForBiome(biome) {
        const roll = Math.random();
        if (biome === 'forest') {
            if (roll < 0.7) return ResourceType.TREE;
            else if (roll < 0.8) return ResourceType.BERRY_BUSH;
            else if (roll < 0.9) return ResourceType.STONE;
            else if (roll < 0.95) return ResourceType.COAL;
        } else if (biome === 'desert') {
            if (roll < 0.1) return ResourceType.TREE;
            else if (roll < 0.5) return ResourceType.STONE;
            else if (roll < 0.6) return ResourceType.COPPER;
            else if (roll < 0.7) return ResourceType.IRON;
            else if (roll < 0.75) return ResourceType.COAL; // Desert has coal
            else if (roll < 0.8) return ResourceType.SULFUR; // Desert has sulfur
        } else if (biome === 'snow') {
            if (roll < 0.3) return ResourceType.TREE;
            else if (roll < 0.6) return ResourceType.STONE;
            else if (roll < 0.7) return ResourceType.IRON;
            else if (roll < 0.75) return ResourceType.COAL;
            else if (roll < 0.8) return ResourceType.SULFUR; // Snow also has sulfur (volcanic vents?)
        } else { // grass
            if (roll < 0.4) return ResourceType.TREE;
            else if (roll < 0.7) return ResourceType.STONE;
            else if (roll < 0.8) return ResourceType.BERRY_BUSH;
            else if (roll < 0.9) return ResourceType.IRON;
            else if (roll < 0.93) return ResourceType.COAL; // Rare Coal
            else if (roll < 0.96) return ResourceType.COPPER; // Rare Copper
            else if (roll < 0.98) return ResourceType.SULFUR; // Rare Sulfur
        }
        return null;
    }
}
