import './style.css';
import Phaser from 'phaser';
import GameScene from './GameScene.js';
import { initPlayables } from './YouTubePlayables.js';

await initPlayables();

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 420,
  height: 740,
  backgroundColor: '#020617',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },

  scene: GameScene
};

new Phaser.Game(config);
