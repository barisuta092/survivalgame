// 1日 = 12分 = 720秒
// ゲーム内時間: 0秒=6:00, 360秒=18:00(夜開始), 720秒=翌6:00
export class DayNight {
    constructor() {
        this.dayLength = 1440; // 24 minutes in seconds
        this.elapsedTime = 0; // 朝6時スタート
        this.dayNumber = 1;
    }

    update(dt) {
        this.elapsedTime += dt;
        this.checkDayOverflow();
    }

    checkDayOverflow() {
        while (this.elapsedTime >= this.dayLength) {
            this.elapsedTime -= this.dayLength;
            this.dayNumber++;
        }
    }

    skipTime(seconds) {
        this.elapsedTime += seconds;
        this.checkDayOverflow();
    }

    get timeOfDay() {
        return this.elapsedTime;
    }

    // 現在のゲーム内時間（24時間表記、6-30で表現）
    get currentHour() {
        const progress = this.elapsedTime / this.dayLength; // 0-1
        return 6 + progress * 24; // 6:00 - 翌6:00
    }

    get isNight() {
        // 18:00 (720秒) から翌6:00 (1440秒) まで夜
        return this.elapsedTime >= this.dayLength / 2;
    }

    get nightProgress() {
        if (!this.isNight) return 0;
        return (this.elapsedTime - this.dayLength / 2) / (this.dayLength / 2);
    }

    get dayProgress() {
        if (this.isNight) return 1;
        return this.elapsedTime / (this.dayLength / 2);
    }

    // 視界倍率: 昼1.0, 夜0.5
    get visionMultiplier() {
        return this.isNight ? 0.5 : 1.0;
    }

    // 日光の強さ (0-1)
    // 6:00=0.3, 12:00=1.0, 18:00=0.3, 0:00=0.0
    get sunlight() {
        const hour = this.currentHour % 24;

        if (hour >= 6 && hour < 12) {
            // 朝: 6時から12時にかけて明るくなる
            return 0.3 + 0.7 * ((hour - 6) / 6);
        } else if (hour >= 12 && hour < 18) {
            // 午後: 12時から18時にかけて暗くなる
            return 1.0 - 0.7 * ((hour - 12) / 6);
        } else if (hour >= 18 && hour < 24) {
            // 夜前半: 18時から24時にかけてさらに暗く
            return 0.3 - 0.3 * ((hour - 18) / 6);
        } else {
            // 夜後半 (0-6時): 徐々に明るくなる
            return 0.0 + 0.3 * (hour / 6);
        }
    }

    // 空の色 (RGB)
    get skyColor() {
        const sunlight = this.sunlight;

        if (sunlight > 0.7) {
            // 明るい昼
            return { r: 135, g: 206, b: 235 }; // Sky blue
        } else if (sunlight > 0.3) {
            // 朝焼け/夕焼け
            const t = (sunlight - 0.3) / 0.4;
            return {
                r: Math.floor(135 + (255 - 135) * (1 - t)),
                g: Math.floor(206 * t + 140 * (1 - t)),
                b: Math.floor(235 * t + 100 * (1 - t))
            };
        } else {
            // 夜
            const t = sunlight / 0.3;
            return {
                r: Math.floor(20 + 60 * t),
                g: Math.floor(24 + 50 * t),
                b: Math.floor(82 + 30 * t)
            };
        }
    }

    // 敵スポーン数 (日数に応じて増加)
    get enemySpawnCount() {
        if (!this.isNight) return 0;
        // 5 + dayNumber, max 30
        return Math.min(30, 5 + this.dayNumber * 1);
    }

    // 強敵出現率 (0-1, 日数に応じて増加)
    get strongEnemyRate() {
        return Math.min(0.5, 0.02 * this.dayNumber);
    }

    getDisplayTime() {
        const progress = this.elapsedTime / this.dayLength;
        const totalMinutesInDay = 24 * 60;
        const currentMinutes = Math.floor(progress * totalMinutesInDay);
        const hour = (Math.floor(currentMinutes / 60) + 6) % 24;
        const min = currentMinutes % 60;
        return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }

    getDisplayString() {
        return `Day ${this.dayNumber} - ${this.getDisplayTime()}`;
    }
}
