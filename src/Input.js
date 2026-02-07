export class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, rightDown: false, prevRightDown: false };
        this.joystick = { x: 0, y: 0, active: false };
        this.isTouch = false;

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            const ghost = document.getElementById('drag-ghost');
            if (ghost && !ghost.classList.contains('hidden')) {
                ghost.style.left = e.clientX + 'px';
                ghost.style.top = e.clientY + 'px';
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.down = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.down = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        // タッチ操作 (モバイル)
        const joystickContainer = document.getElementById('joystick-container');
        const joystickZone = document.getElementById('joystick-zone');
        const joystickStick = document.getElementById('joystick-stick');

        // 4つのアクションボタン
        const btnAttack = document.getElementById('btn-attack');
        const btnPickup = document.getElementById('btn-pickup');
        const btnInteract = document.getElementById('btn-interact');
        const btnMine = document.getElementById('btn-mine');

        // ジョイスティック
        let joystickId = null;
        const joystickCenter = { x: 0, y: 0 };

        if (joystickContainer && joystickZone && joystickStick) {
            joystickContainer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isTouch = true;
                // 既に操作中なら無視（マルチタッチの2本目以降など）
                if (joystickId !== null) return;

                const touch = e.changedTouches[0];
                joystickId = touch.identifier;
                this.joystick.active = true;

                // タッチ位置をジョイスティックの中心にする
                joystickCenter.x = touch.clientX;
                joystickCenter.y = touch.clientY;

                // ビジュアル表示・移動
                joystickZone.style.display = 'block';
                joystickZone.style.left = (touch.clientX - 55) + 'px'; // 55 = 110/2
                joystickZone.style.top = (touch.clientY - 55) + 'px';

                // Stickは中心にリセット
                joystickStick.style.transform = 'translate(-50%, -50%)';

                // 初期位置では入力0
                this.updateJoystick(touch.clientX, touch.clientY, joystickCenter, joystickStick);
            }, { passive: false });

            joystickContainer.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickId) {
                        this.updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY, joystickCenter, joystickStick);
                        break;
                    }
                }
            }, { passive: false });

            joystickContainer.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickId) {
                        this.joystick.active = false;
                        this.joystick.x = 0;
                        this.joystick.y = 0;
                        joystickId = null;

                        // ビジュアル非表示
                        joystickZone.style.display = 'none';
                        break;
                    }
                }
            }, { passive: false });
        }

        // Attack button (Space)
        if (btnAttack) {
            btnAttack.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['Space'] = true;
            }, { passive: false });

            btnAttack.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['Space'] = false;
            }, { passive: false });
        }

        // Pickup button (B)
        if (btnPickup) {
            btnPickup.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['KeyB'] = true;
            }, { passive: false });

            btnPickup.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['KeyB'] = false;
            }, { passive: false });
        }

        // Interact button (F)
        if (btnInteract) {
            btnInteract.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['KeyF'] = true;
            }, { passive: false });

            btnInteract.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys['KeyF'] = false;
            }, { passive: false });
        }

        // Mine button (Left Click emulation)
        if (btnMine) {
            btnMine.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isTouch = true;
                this.mouse.down = true;
            }, { passive: false });

            btnMine.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.mouse.down = false;
            }, { passive: false });
        }
    }

    updateJoystick(touchX, touchY, center, stickElement) {
        const maxDist = 32; // Half of joystick zone radius minus stick radius
        let dx = touchX - center.x;
        let dy = touchY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        this.joystick.x = dx / maxDist;
        this.joystick.y = dy / maxDist;

        // ビジュアル更新
        if (stickElement) {
            stickElement.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
    }

    getAxis() {
        let dx = 0;
        let dy = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

        // Joystick priority if active
        if (this.joystick.active) {
            return { x: this.joystick.x, y: this.joystick.y };
        }

        // Normalize
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        return { x: dx, y: dy };
    }
}
