import { Achievements } from '../data/Achievements.js';

export class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.unlocked = new Set(); // IDのセット
        this.counts = {
            enemiesKilled: 0,
            buildingsPlaced: 0,
            rocksMined: 0,
            biomesVisited: new Set()
        };
        this.notificationQueue = [];
        this.notificationTimer = 0;
    }

    // セーブデータから復元
    load(data) {
        if (!data) return;
        if (data.unlocked) {
            data.unlocked.forEach(id => this.unlocked.add(id));
        }
        if (data.counts) {
            this.counts.enemiesKilled = data.counts.enemiesKilled || 0;
            this.counts.buildingsPlaced = data.counts.buildingsPlaced || 0;
            this.counts.rocksMined = data.counts.rocksMined || 0;
            if (data.counts.biomesVisited) {
                // Array -> Set
                this.counts.biomesVisited = new Set(data.counts.biomesVisited);
            }
        }
    }

    // セーブ用データ生成
    save() {
        return {
            unlocked: Array.from(this.unlocked),
            counts: {
                enemiesKilled: this.counts.enemiesKilled,
                buildingsPlaced: this.counts.buildingsPlaced,
                rocksMined: this.counts.rocksMined,
                biomesVisited: Array.from(this.counts.biomesVisited)
            }
        };
    }

    unlock(id) {
        if (this.unlocked.has(id)) return;

        const achievement = Achievements[id];
        if (!achievement) return;

        this.unlocked.add(id);
        this.showNotification(achievement);
    }

    showNotification(achievement) {
        const el = document.getElementById('achievement-notification');
        if (!el) return;

        // 内容を更新して表示クラスを付与
        const title = el.querySelector('.title');
        const desc = el.querySelector('.desc');
        const icon = el.querySelector('.icon');

        if (title) title.textContent = achievement.title;
        if (desc) desc.textContent = achievement.description;
        if (icon) icon.textContent = achievement.icon;

        el.classList.remove('hidden');
        el.classList.add('show');

        // 音を鳴らす (AudioManagerがあれば)
        // this.game.audioManager.play('achievement'); 

        // 3秒後に消す
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            el.classList.remove('show');
            el.classList.add('hidden');
        }, 3000);
    }

    // イベントハンドラ
    onCraft() {
        this.unlock('FIRST_CRAFT');
    }

    onKillEnemy() {
        this.counts.enemiesKilled++;
        if (this.counts.enemiesKilled >= 5) {
            this.unlock('HUNTER');
        }
    }

    onPlaceBuilding() {
        this.counts.buildingsPlaced++;
        if (this.counts.buildingsPlaced >= 5) {
            this.unlock('BUILDER');
        }
    }

    onMineRock() {
        this.counts.rocksMined++;
        if (this.counts.rocksMined >= 10) {
            this.unlock('MINER');
        }
    }

    onDayPass() {
        this.unlock('SURVIVOR_1');
    }

    onEnterBiome(biome) {
        if (!this.counts.biomesVisited.has(biome)) {
            this.counts.biomesVisited.add(biome);
            if (this.counts.biomesVisited.size >= 3) {
                this.unlock('EXPLORER');
            }
        }
    }
}
