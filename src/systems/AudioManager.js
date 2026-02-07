export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        // 音の重複再生を防ぐためのクールダウンタイマー
        this.lastPlayTime = {
            break: 0,
            hit: 0,
            shoot: 0,
            mine: 0,
            eat: 0,
            pickup: 0
        };
        this.cooldown = 0.05; // 50ms のクールダウン
    }

    // 短いノイズ音 (採掘/破壊)
    playBreak(type = 'stone') {
        // クールダウンチェック
        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime.break < this.cooldown) return;
        this.lastPlayTime.break = now;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        let freq = 400;
        let duration = 0.1;
        let gainVal = 0.3;

        if (type === 'wood') {
            freq = 250;
            duration = 0.15;
        } else if (type === 'organic') {
            freq = 150;
            duration = 0.1;
            gainVal = 0.4;
        } else if (type === 'metal') {
            freq = 800;
            duration = 0.2;
            gainVal = 0.2;
        } else { // stone
            freq = 450;
            duration = 0.12;
        }
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
        filter.Q.setValueAtTime(1, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    }

    // 鈍い打撃音 (ダメージを受けた時)
    playHit() {
        // クールダウンチェック
        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime.hit < this.cooldown) return;
        this.lastPlayTime.hit = now;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        const duration = 0.2;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // 射撃音
    playShoot() {
        // クールダウンチェック
        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime.shoot < this.cooldown) return;
        this.lastPlayTime.shoot = now;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        const duration = 0.2;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // ノイズ成分を追加 (低音の衝撃)
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();

        // 銃声本体
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // 採掘音 (破壊音より少し高い)
    playMine(type) {
        this.playBreak(type);
    }

    // 食事音
    playEat() {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const duration = 0.05;
        for (let i = 0; i < 2; i++) {
            const time = this.ctx.currentTime + i * 0.1;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400 + i * 200, time);
            osc.frequency.exponentialRampToValueAtTime(100, time + duration);

            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + duration);
        }
    }

    // 拾得音 (短いポップ音)
    playPickup() {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const duration = 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // 爆発音
    playExplosion() {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // ノイズ（衝撃音）
        const duration = 0.5;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();

        // 低音（重み）
        const osc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + duration);

        subGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(subGain);
        subGain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}

export const audioManager = new AudioManager();
