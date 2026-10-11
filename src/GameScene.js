import Phaser from 'phaser';
import {
  getState,
  updateState,
  saveState,
  sendBestScore,
  notifyFirstFrameReady,
  notifyGameReady,
  isPlatformAudioEnabled
} from './YouTubePlayables.js';

// Just One More Run — Final Browser RC1

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.autoStart = Boolean(data?.autoStart);
  }

  create() {
    this.score = 0;
    this.streak = 0;
    this.gameSpeed = 190;

    this.started = false;
    this.gameOver = false;
    this.gateActive = false;
    this.invincible = false;
    this.shieldActive = false;

    this.lives = 3;
    this.maxLives = 3;

    const savedState = getState();

    this.voiceEnabled =
      savedState.voiceEnabled;

    this.soundEnabled =
      savedState.soundEnabled;

    this.voiceUnlocked = false;
    this.audioUnlocked = false;
    this.newBestAnnounced = false;

    this.bestScore =
      savedState.bestScore;

    this.runStartBest = this.bestScore;

    // Final balance settings
    this.maxScore = 999999;
    this.maxGameSpeed = 390;

    this.createBackground();
    this.createTrack();
    this.createMovingRoad();
    this.createHUD();
    this.createPlayer();
    this.createGroups();
    this.createCollisions();
    this.createControls();
    this.setupYouTubeLifecycle();

    // First rendered interactive frame / menu is ready.
    requestAnimationFrame(() => {
      notifyFirstFrameReady();
      notifyGameReady();
    });

    if (this.autoStart) {
      this.unlockAudioAndVoice();
      this.startGame();
    } else {
      this.createStartScreen();
    }
  }

  setupYouTubeLifecycle() {
    this._onYouTubePause = () => {
      window.speechSynthesis?.cancel();

      if (
        this.audioContext?.state ===
        'running'
      ) {
        this.audioContext.suspend();
      }

      if (
        this.scene.isActive()
      ) {
        this.scene.pause();
      }

      this.persistProgress();
    };

    this._onYouTubeResume = () => {
      if (
        this.scene.isPaused()
      ) {
        this.scene.resume();
      }

      if (
        this.audioUnlocked &&
        this.audioContext?.state ===
          'suspended' &&
        isPlatformAudioEnabled()
      ) {
        this.audioContext.resume();
      }
    };

    this._onYouTubeAudioChange =
      (event) => {
        const enabled =
          Boolean(
            event?.detail?.enabled
          );

        if (!enabled) {
          window.speechSynthesis?.cancel();

          if (
            this.audioContext?.state ===
            'running'
          ) {
            this.audioContext.suspend();
          }
        } else if (
          this.audioUnlocked &&
          this.audioContext?.state ===
            'suspended'
        ) {
          this.audioContext.resume();
        }
      };

    window.addEventListener(
      'ytgame-pause',
      this._onYouTubePause
    );

    window.addEventListener(
      'ytgame-resume',
      this._onYouTubeResume
    );

    window.addEventListener(
      'ytgame-audio-change',
      this._onYouTubeAudioChange
    );

    this.events.once(
      'shutdown',
      () => {
        window.removeEventListener(
          'ytgame-pause',
          this._onYouTubePause
        );

        window.removeEventListener(
          'ytgame-resume',
          this._onYouTubeResume
        );

        window.removeEventListener(
          'ytgame-audio-change',
          this._onYouTubeAudioChange
        );
      }
    );
  }

  async persistProgress() {
    updateState({
      bestScore: this.bestScore,
      soundEnabled:
        this.soundEnabled,
      voiceEnabled:
        this.voiceEnabled
    });

    try {
      await saveState();
    } catch {
      // Keep gameplay running if save temporarily fails.
    }
  }

  /* =========================
   * AUDIO + VOICE
   * ========================= */

  unlockAudioAndVoice() {
    this.voiceUnlocked = true;

    if (!this.audioUnlocked) {
      this.audioUnlocked = true;

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (AudioContextClass) {
        this.audioContext ??=
          new AudioContextClass();

        if (
          this.audioContext.state ===
          'suspended'
        ) {
          this.audioContext.resume();
        }
      }
    }
  }

  speak(text) {
    if (
      !this.voiceEnabled ||
      !this.voiceUnlocked ||
      !isPlatformAudioEnabled() ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = 'en-US';
    utterance.rate = 1.12;
    utterance.pitch = 1.08;
    utterance.volume = 0.85;

    window.speechSynthesis.speak(
      utterance
    );
  }

  playPointSound() {
    if (
      !this.soundEnabled ||
      !this.audioUnlocked ||
      !isPlatformAudioEnabled() ||
      !this.audioContext
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    const osc =
      this.audioContext.createOscillator();

    const gain =
      this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(
      880,
      now
    );

    osc.frequency.exponentialRampToValueAtTime(
      1320,
      now + 0.07
    );

    gain.gain.setValueAtTime(
      0.055,
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + 0.09
    );

    osc.connect(gain);
    gain.connect(
      this.audioContext.destination
    );

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playHitSound() {
    if (
      !this.soundEnabled ||
      !this.audioUnlocked ||
      !isPlatformAudioEnabled() ||
      !this.audioContext
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    const osc =
      this.audioContext.createOscillator();

    const gain =
      this.audioContext.createGain();

    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(
      180,
      now
    );

    osc.frequency.exponentialRampToValueAtTime(
      75,
      now + 0.18
    );

    gain.gain.setValueAtTime(
      0.06,
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + 0.2
    );

    osc.connect(gain);
    gain.connect(
      this.audioContext.destination
    );

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /* =========================
   * BACKGROUND / TRACK
   * ========================= */

  createBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(
      w / 2,
      h / 2,
      w,
      h,
      0x020617
    );

    for (
      let i = 0;
      i < 28;
      i++
    ) {
      const star =
        this.add.circle(
          Phaser.Math.Between(0, w),
          Phaser.Math.Between(0, h),
          Phaser.Math.Between(1, 2),
          0x38bdf8,
          Phaser.Math.FloatBetween(
            0.25,
            0.8
          )
        );

      this.tweens.add({
        targets: star,
        alpha: 0.08,
        duration:
          Phaser.Math.Between(
            600,
            1400
          ),
        yoyo: true,
        repeat: -1
      });
    }
  }

  createTrack() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.track =
      this.add.rectangle(
        w / 2,
        h / 2,
        300,
        h,
        0x0f172a
      );

    this.leftEdge =
      this.add.rectangle(
        w / 2 - 150,
        h / 2,
        4,
        h,
        0x22d3ee
      ).setAlpha(0.75);

    this.rightEdge =
      this.add.rectangle(
        w / 2 + 150,
        h / 2,
        4,
        h,
        0x22d3ee
      ).setAlpha(0.75);
  }

  createMovingRoad() {
    this.roadMarkers = [];

    const xs = [
      this.scale.width / 2 - 50,
      this.scale.width / 2 + 50
    ];

    for (
      let y = -50;
      y < 800;
      y += 90
    ) {
      xs.forEach((x) => {
        const marker =
          this.add.rectangle(
            x,
            y,
            4,
            34,
            0x38bdf8,
            0.36
          );

        this.roadMarkers.push(
          marker
        );
      });
    }
  }

  /* =========================
   * HUD
   * ========================= */

  createHUD() {
    this.scoreText =
      this.add.text(
        18,
        18,
        'Score: 0',
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      ).setDepth(100);

    this.streakText =
      this.add.text(
        18,
        48,
        'Streak: 0',
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#facc15'
        }
      ).setDepth(100);

    this.bestText =
      this.add.text(
        this.scale.width - 18,
        18,
        `Best: ${this.bestScore}`,
        {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#facc15'
        }
      )
        .setOrigin(1, 0)
        .setDepth(100);

    this.livesText =
      this.add.text(
        this.scale.width / 2,
        18,
        '♥ ♥ ♥',
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#fb7185',
          fontStyle: 'bold'
        }
      )
        .setOrigin(0.5, 0)
        .setDepth(100);

    this.shieldText =
      this.add.text(
        this.scale.width / 2,
        48,
        '',
        {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#67e8f9',
          fontStyle: 'bold'
        }
      )
        .setOrigin(0.5, 0)
        .setDepth(100);

    this.soundButton =
      this.add.text(
        this.scale.width - 18,
        49,
        this.soundEnabled
          ? '🔊'
          : '🔇',
        {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#0f172a',
          padding: {
            x: 8,
            y: 5
          }
        }
      )
        .setOrigin(1, 0)
        .setInteractive()
        .setDepth(120);

    this.voiceButton =
      this.add.text(
        this.scale.width - 18,
        84,
        this.voiceEnabled
          ? '🗣️'
          : '🔕',
        {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#0f172a',
          padding: {
            x: 8,
            y: 5
          }
        }
      )
        .setOrigin(1, 0)
        .setInteractive()
        .setDepth(120);

    this.soundButton.on(
      'pointerdown',
      () => {
        this.unlockAudioAndVoice();

        this.soundEnabled =
          !this.soundEnabled;

        updateState({
          soundEnabled:
            this.soundEnabled
        });

        this.persistProgress();

        this.soundButton.setText(
          this.soundEnabled
            ? '🔊'
            : '🔇'
        );
      }
    );

    this.voiceButton.on(
      'pointerdown',
      () => {
        this.unlockAudioAndVoice();

        this.voiceEnabled =
          !this.voiceEnabled;

        updateState({
          voiceEnabled:
            this.voiceEnabled
        });

        this.persistProgress();

        window.speechSynthesis?.cancel();

        this.voiceButton.setText(
          this.voiceEnabled
            ? '🗣️'
            : '🔕'
        );
      }
    );
  }

  updateLivesHUD() {
    const full =
      '♥ '.repeat(
        Math.max(this.lives, 0)
      );

    const empty =
      '♡ '.repeat(
        Math.max(
          this.maxLives -
            this.lives,
          0
        )
      );

    this.livesText.setText(
      `${full}${empty}`.trim()
    );
  }

  /* =========================
   * PLAYER
   * ========================= */

  createPlayer() {
    this.playerGlow =
      this.add.circle(
        this.scale.width / 2,
        this.scale.height - 90,
        34,
        0x22d3ee,
        0.16
      ).setDepth(8);

    this.player =
      this.add.circle(
        this.scale.width / 2,
        this.scale.height - 90,
        21,
        0x22d3ee
      ).setDepth(10);

    this.physics.add.existing(
      this.player
    );

    this.player.body
      .setCollideWorldBounds(true);

    this.player.body.enable = false;

    this.tweens.add({
      targets: this.playerGlow,
      scale: 1.22,
      alpha: 0.06,
      duration: 700,
      yoyo: true,
      repeat: -1
    });
  }

  syncPlayerGlow() {
    this.playerGlow.x =
      this.player.x;

    this.playerGlow.y =
      this.player.y;
  }

  /* =========================
   * GROUPS
   * ========================= */

  createGroups() {
    this.points =
      this.physics.add.group();

    this.obstacles =
      this.physics.add.group();

    this.gates =
      this.physics.add.group();

    this.shields =
      this.physics.add.group();
  }

  /* =========================
   * START
   * ========================= */

  createStartScreen() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.startOverlay =
      this.add.rectangle(
        w / 2,
        h / 2,
        w,
        h,
        0x020617,
        0.91
      )
        .setDepth(500)
        .setInteractive();

    this.startTitle =
      this.add.text(
        w / 2,
        h / 2 - 145,
        'JUST ONE MORE RUN',
        {
          fontFamily: 'Arial',
          fontSize: '30px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      )
        .setOrigin(0.5)
        .setDepth(501);

    this.startTagline =
      this.add.text(
        w / 2,
        h / 2 - 90,
        'Collect • Dodge • Boost • Survive',
        {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#67e8f9'
        }
      )
        .setOrigin(0.5)
        .setDepth(501);

    this.startSubtitle =
      this.add.text(
        w / 2,
        h / 2 - 35,
        'Drag / Mouse / Arrow Keys',
        {
          fontFamily: 'Arial',
          fontSize: '17px',
          color: '#94a3b8'
        }
      )
        .setOrigin(0.5)
        .setDepth(501);

    this.startButton =
      this.add.rectangle(
        w / 2,
        h / 2 + 60,
        230,
        64,
        0x06b6d4
      )
        .setInteractive()
        .setDepth(501);

    this.startButtonText =
      this.add.text(
        w / 2,
        h / 2 + 60,
        'TAP TO START',
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      )
        .setOrigin(0.5)
        .setDepth(502);

    const launch = () => {
      this.unlockAudioAndVoice();
      this.startGame();
    };

    this.startButton.on(
      'pointerdown',
      launch
    );

    this.startOverlay.on(
      'pointerdown',
      launch
    );
  }

  startGame() {
    if (this.started) {
      return;
    }

    this.started = true;

    [
      this.startOverlay,
      this.startTitle,
      this.startTagline,
      this.startSubtitle,
      this.startButton,
      this.startButtonText
    ].forEach((obj) => {
      obj?.destroy();
    });

    this.player.body.enable = true;

    this.createSpawners();

    this.speak('Go!');
  }

  /* =========================
   * SPAWNERS
   * ========================= */

  createSpawners() {
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        if (
          this.started &&
          !this.gameOver
        ) {
          this.spawnPoint();
        }
      }
    });

    this.time.addEvent({
      delay: 1450,
      loop: true,
      callback: () => {
        if (
          this.started &&
          !this.gameOver
        ) {
          this.spawnObstacle();
        }
      }
    });

    this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => {
        if (
          this.started &&
          !this.gameOver
        ) {
          this.spawnGatePair();
        }
      }
    });

    this.time.addEvent({
      delay: 9500,
      loop: true,
      callback: () => {
        if (
          this.started &&
          !this.gameOver
        ) {
          this.spawnShield();
        }
      }
    });

    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        if (
          this.started &&
          !this.gameOver
        ) {
          this.gameSpeed =
            Math.min(
              this.gameSpeed + 10,
              this.maxGameSpeed
            );
        }
      }
    });
  }

  /* =========================
   * COLLISIONS
   * ========================= */

  createCollisions() {
    this.physics.add.overlap(
      this.player,
      this.points,
      (player, point) => {
        this.collectPoint(point);
      }
    );

    this.physics.add.overlap(
      this.player,
      this.obstacles,
      (player, obstacle) => {
        this.hitObstacle(
          obstacle
        );
      }
    );

    this.physics.add.overlap(
      this.player,
      this.gates,
      (player, gate) => {
        this.hitGate(gate);
      }
    );

    this.physics.add.overlap(
      this.player,
      this.shields,
      (player, shield) => {
        this.collectShield(
          shield
        );
      }
    );
  }

  /* =========================
   * CONTROLS
   * ========================= */

  createControls() {
    this.cursors =
      this.input.keyboard
        .createCursorKeys();

    this.input.on(
      'pointerdown',
      () => {
        this.unlockAudioAndVoice();
      }
    );

    this.input.keyboard.on(
      'keydown',
      () => {
        this.unlockAudioAndVoice();

        if (!this.started) {
          this.startGame();
        }
      }
    );

    this.input.on(
      'pointermove',
      (pointer) => {
        if (
          pointer.isDown &&
          this.started &&
          !this.gameOver
        ) {
          this.player.x =
            Phaser.Math.Clamp(
              pointer.x,
              72,
              this.scale.width - 72
            );
        }
      }
    );
  }

  /* =========================
   * POINTS
   * ========================= */

  spawnPoint() {
    const lanes =
      this.getLanes();

    const x =
      Phaser.Utils.Array.GetRandom(
        lanes
      );

    const point =
      this.add.circle(
        x,
        -20,
        11,
        0xfacc15
      );

    this.physics.add.existing(
      point
    );

    this.points.add(point);

    point.body.setVelocityY(
      this.gameSpeed
    );

    this.tweens.add({
      targets: point,
      scale: 1.22,
      alpha: 0.62,
      duration: 420,
      yoyo: true,
      repeat: -1
    });
  }

  collectPoint(point) {
    this.playPointSound();

    this.score = Math.min(
      this.score + 10,
      this.maxScore
    );
    this.streak += 1;

    if (this.streak === 5) {
      this.speak('Nice!');
    } else if (
      this.streak === 10
    ) {
      this.speak('Great!');
    } else if (
      this.streak === 15
    ) {
      this.speak('Awesome!');
    } else if (
      this.streak === 20
    ) {
      this.speak('On fire!');
    } else if (
      this.streak > 20 &&
      this.streak % 10 === 0
    ) {
      this.speak('Amazing!');
    }

    if (
      this.streak % 5 === 0
    ) {
      this.score = Math.min(
        this.score + 25,
        this.maxScore
      );

      this.showFloatingText(
        '+25 STREAK!'
      );
    }

    this.createBurst(
      point.x,
      point.y,
      0xfacc15
    );

    point.destroy();

    this.updateHUD();
  }

  /* =========================
   * OBSTACLES
   * ========================= */

  spawnObstacle() {
    if (this.gateActive) {
      return;
    }

    const x =
      Phaser.Utils.Array.GetRandom(
        this.getLanes()
      );

    const glow =
      this.add.rectangle(
        x,
        -30,
        66,
        46,
        0xef4444,
        0.15
      );

    const obstacle =
      this.add.rectangle(
        x,
        -30,
        54,
        34,
        0xef4444
      );

    this.physics.add.existing(
      obstacle
    );

    this.obstacles.add(
      obstacle
    );

    obstacle.setData(
      'glowObject',
      glow
    );

    obstacle.body.setVelocityY(
      this.gameSpeed + 20
    );
  }

  hitObstacle(obstacle) {
    if (
      this.gameOver ||
      this.invincible
    ) {
      return;
    }

    const glow =
      obstacle.getData(
        'glowObject'
      );

    if (this.shieldActive) {
      this.shieldActive = false;

      this.shieldText.setText('');

      this.speak(
        'Shield saved you!'
      );

      this.showFloatingText(
        'SHIELD BLOCK!'
      );

      this.createBurst(
        this.player.x,
        this.player.y,
        0x22d3ee
      );

      glow?.destroy();
      obstacle.destroy();

      return;
    }

    this.playHitSound();

    this.lives -= 1;
    this.streak = 0;

    this.updateLivesHUD();
    this.updateHUD();

    this.invincible = true;

    this.speak(
      this.lives > 0
        ? 'Watch out!'
        : 'Try again!'
    );

    this.cameras.main.shake(
      180,
      0.012
    );

    this.player.setAlpha(
      0.35
    );

    this.playerGlow.setAlpha(
      0.04
    );

    glow?.destroy();
    obstacle.destroy();

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.time.delayedCall(
      900,
      () => {
        if (!this.gameOver) {
          this.invincible = false;

          this.player.setAlpha(
            1
          );

          this.playerGlow.setAlpha(
            0.16
          );
        }
      }
    );
  }

  /* =========================
   * SHIELD
   * ========================= */

  spawnShield() {
    if (this.shieldActive) {
      return;
    }

    const x =
      Phaser.Utils.Array.GetRandom(
        this.getLanes()
      );

    const shield =
      this.add.circle(
        x,
        -25,
        17,
        0x38bdf8
      );

    this.physics.add.existing(
      shield
    );

    this.shields.add(
      shield
    );

    shield.body.setVelocityY(
      this.gameSpeed
    );

    this.tweens.add({
      targets: shield,
      scale: 1.28,
      alpha: 0.5,
      duration: 450,
      yoyo: true,
      repeat: -1
    });
  }

  collectShield(shield) {
    this.shieldActive = true;

    this.shieldText.setText(
      'SHIELD READY'
    );

    this.speak(
      'Shield ready!'
    );

    this.showFloatingText(
      'SHIELD!'
    );

    this.createBurst(
      shield.x,
      shield.y,
      0x38bdf8
    );

    shield.destroy();
  }

  /* =========================
   * GATES
   * ========================= */

  spawnGatePair() {
    this.gateActive = true;

    this.time.delayedCall(
      1700,
      () => {
        this.gateActive = false;
      }
    );

    const choices = [
      {
        label: '+50',
        type: 'add',
        value: 50,
        color: 0x22c55e
      },
      {
        label: 'x2',
        type: 'multiply',
        value: 2,
        color: 0x3b82f6
      },
      {
        label: '+100',
        type: 'add',
        value: 100,
        color: 0xa855f7
      }
    ];

    const left =
      Phaser.Utils.Array.GetRandom(
        choices
      );

    let right =
      Phaser.Utils.Array.GetRandom(
        choices
      );

    while (
      right.label === left.label
    ) {
      right =
        Phaser.Utils.Array.GetRandom(
          choices
        );
    }

    this.createGate(
      this.scale.width / 2 - 75,
      left
    );

    this.createGate(
      this.scale.width / 2 + 75,
      right
    );
  }

  createGate(x, config) {
    const glow =
      this.add.rectangle(
        x,
        -50,
        136,
        68,
        config.color,
        0.15
      );

    const gate =
      this.add.rectangle(
        x,
        -50,
        125,
        58,
        config.color,
        0.9
      );

    this.physics.add.existing(
      gate
    );

    this.gates.add(gate);

    gate.body.setVelocityY(
      this.gameSpeed
    );

    gate.setData(
      'type',
      config.type
    );

    gate.setData(
      'value',
      config.value
    );

    gate.setData(
      'used',
      false
    );

    gate.setData(
      'glowObject',
      glow
    );

    const label =
      this.add.text(
        x,
        -50,
        config.label,
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      )
        .setOrigin(0.5)
        .setDepth(5);

    gate.setData(
      'labelObject',
      label
    );
  }

  hitGate(gate) {
    if (
      gate.getData('used')
    ) {
      return;
    }

    gate.setData(
      'used',
      true
    );

    const type =
      gate.getData('type');

    const value =
      gate.getData('value');

    if (type === 'add') {
      this.score = Math.min(
        this.score + value,
        this.maxScore
      );
    }

    if (
      type === 'multiply'
    ) {
      const doubled =
        this.score * value;

      this.score = Math.min(
        doubled,
        this.maxScore
      );
    }

    if (
      type === 'multiply'
    ) {
      this.speak('Double!');
    } else if (
      value === 100
    ) {
      this.speak('Big boost!');
    } else {
      this.speak('Boost!');
    }

    this.showFloatingText(
      type === 'multiply'
        ? `x${value}`
        : `+${value}`
    );

    gate.setFillStyle(
      0x475569
    );

    const label =
      gate.getData(
        'labelObject'
      );

    label?.setAlpha(0.35);

    this.updateHUD();
  }

  /* =========================
   * EFFECTS / SCORE
   * ========================= */

  showFloatingText(text) {
    const popup =
      this.add.text(
        this.player.x,
        this.player.y - 62,
        text,
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      )
        .setOrigin(0.5)
        .setDepth(200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 45,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        popup.destroy();
      }
    });
  }

  createBurst(
    x,
    y,
    color = 0xfacc15
  ) {
    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const particle =
        this.add.circle(
          x,
          y,
          4,
          color
        );

      this.tweens.add({
        targets: particle,
        x:
          x +
          Phaser.Math.Between(
            -38,
            38
          ),
        y:
          y +
          Phaser.Math.Between(
            -38,
            38
          ),
        alpha: 0,
        duration: 350,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  updateHUD() {
    this.scoreText.setText(
      `Score: ${this.score}`
    );

    this.streakText.setText(
      `Streak: ${this.streak}`
    );

    if (
      this.runStartBest > 0 &&
      this.score >
        this.runStartBest &&
      !this.newBestAnnounced
    ) {
      this.newBestAnnounced = true;

      this.speak('New best!');

      this.showFloatingText(
        'NEW BEST!'
      );
    }

    if (
      this.score >
      this.bestScore
    ) {
      this.bestScore =
        this.score;

      this.bestText.setText(
        `Best: ${this.bestScore}`
      );

      updateState({
        bestScore:
          this.bestScore
      });
    }
  }

  /* =========================
   * GAME OVER
   * ========================= */

  endGame() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.physics.pause();

    this.persistProgress()
      .then(() =>
        sendBestScore(
          this.bestScore
        )
      )
      .catch(() => {});

    this.showEndScreen();
  }

  showEndScreen() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(
      w / 2,
      h / 2,
      w,
      h,
      0x020617,
      0.9
    ).setDepth(300);

    this.add.text(
      w / 2,
      h / 2 - 145,
      'GAME OVER',
      {
        fontFamily: 'Arial',
        fontSize: '38px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    )
      .setOrigin(0.5)
      .setDepth(301);

    this.add.text(
      w / 2,
      h / 2 - 82,
      `Score: ${this.score}`,
      {
        fontFamily: 'Arial',
        fontSize: '27px',
        color: '#ffffff'
      }
    )
      .setOrigin(0.5)
      .setDepth(301);

    this.add.text(
      w / 2,
      h / 2 - 42,
      `Best: ${this.bestScore}`,
      {
        fontFamily: 'Arial',
        fontSize: '21px',
        color: '#facc15'
      }
    )
      .setOrigin(0.5)
      .setDepth(301);

    const difference =
      this.bestScore -
      this.score;

    let message =
      this.score >= this.maxScore
        ? 'MAX SCORE!'
        : 'Can you beat it?';

    if (
      difference > 0 &&
      difference <= 200
    ) {
      message =
        `Only ${difference} from your best!`;
    } else if (
      this.score ===
        this.bestScore &&
      this.score > 0
    ) {
      message =
        'That is your best run!';
    }

    this.add.text(
      w / 2,
      h / 2 + 8,
      message,
      {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#67e8f9'
      }
    )
      .setOrigin(0.5)
      .setDepth(301);

    const button =
      this.add.rectangle(
        w / 2,
        h / 2 + 105,
        235,
        64,
        0x06b6d4
      )
        .setInteractive()
        .setDepth(301);

    this.add.text(
      w / 2,
      h / 2 + 105,
      'ONE MORE RUN',
      {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    )
      .setOrigin(0.5)
      .setDepth(302);

    button.on(
      'pointerdown',
      () => {
        window.speechSynthesis?.cancel();

        this.scene.restart({
          autoStart: true
        });
      }
    );
  }

  /* =========================
   * HELPERS
   * ========================= */

  getLanes() {
    return [
      this.scale.width / 2 - 85,
      this.scale.width / 2,
      this.scale.width / 2 + 85
    ];
  }

  cleanupGroup(group) {
    group
      .getChildren()
      .forEach((item) => {
        if (!item) {
          return;
        }

        const label =
          item.getData
            ? item.getData(
                'labelObject'
              )
            : null;

        const glow =
          item.getData
            ? item.getData(
                'glowObject'
              )
            : null;

        if (label) {
          label.x = item.x;
          label.y = item.y;
        }

        if (glow) {
          glow.x = item.x;
          glow.y = item.y;
        }

        if (
          item.y >
          this.scale.height + 80
        ) {
          label?.destroy();
          glow?.destroy();
          item.destroy();
        }
      });
  }

  /* =========================
   * UPDATE
   * ========================= */

  update() {
    if (
      !this.started ||
      this.gameOver ||
      !this.player?.body
    ) {
      return;
    }

    const moveSpeed = 330;

    this.player.body
      .setVelocityX(0);

    if (
      this.cursors.left.isDown
    ) {
      this.player.body
        .setVelocityX(
          -moveSpeed
        );
    }

    if (
      this.cursors.right.isDown
    ) {
      this.player.body
        .setVelocityX(
          moveSpeed
        );
    }

    this.syncPlayerGlow();

    this.roadMarkers.forEach(
      (marker) => {
        marker.y +=
          this.gameSpeed * 0.016;

        if (
          marker.y >
          this.scale.height + 40
        ) {
          marker.y = -40;
        }
      }
    );

    this.cleanupGroup(
      this.points
    );

    this.cleanupGroup(
      this.obstacles
    );

    this.cleanupGroup(
      this.gates
    );

    this.cleanupGroup(
      this.shields
    );
  }
}
