import Phaser from 'phaser';
import { sound } from '../../audio/sound';
import { costumeById } from '../../data/costumes';
import { petById, type PetInfo } from '../../data/pets';
import { mountById } from '../../data/mounts';
import { wingById } from '../../data/wings';
import { dungeonTier } from '../../data/dungeon';
import { ELEMENT_COLOR } from '../../data/elements';
import { RARITY } from '../../data/items';
import { gameController } from '../../state/controller';
import { isMotionReduced } from '../../state/motion';
import type { Element, Enemy, SimEvent } from '../../sim/types';
import { ensureHeroTexture, registerDummyTextures, SPRITE_SIZE } from '../dummy/assets';
import { buzz } from '../haptics';

const GROUND_Y = 370;
const HERO_X = 105;
const ENEMY_X = 290;
/** The knight drifts this far forward while marching; enemies walk in from further out. */
const HERO_STEP = 16;
const ENEMY_ENTER = 110;
/** Ground scroll in pixels per second: idle drift, then the march after a kill. */
const WALK_IDLE = 6;
const WALK_BURST = 96;
const STEP = 1 / 30;
/** Floating labels stay above the hero's helm, clear of the HUD panel. */
const HERO_TEXT_Y = GROUND_Y - 74;
const HERO_TOP_Y = GROUND_Y - 96;
/** Light tints read as an element while keeping the rival's pixel detail. */
const ELEMENT_TINT: Record<Element, number> = {
  fire: 0xff9a6b,
  ice: 0x7fd8ff,
  lightning: 0xffe066,
  holy: 0xfff0b8,
  dark: 0xc084ff,
};

export class BattleScene extends Phaser.Scene {
  private heroContainer!: Phaser.GameObjects.Container;
  private heroSprite!: Phaser.GameObjects.Image;
  private sword!: Phaser.GameObjects.Image;
  private enemyContainer!: Phaser.GameObjects.Container;
  private enemySprite!: Phaser.GameObjects.Image;
  private enemyShadow!: Phaser.GameObjects.Ellipse;
  private banner!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private redFlash!: Phaser.GameObjects.Rectangle;
  private streak = 0;
  private streakUntil = 0;
  private enemyKnock?: Phaser.Tweens.Tween;
  private heroShadow!: Phaser.GameObjects.Ellipse;
  private nearGround!: Phaser.GameObjects.TileSprite;
  private farGround!: Phaser.GameObjects.TileSprite;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Visual-only march offsets; combat still resolves at HERO_X / ENEMY_X. */
  private heroOffset = 0;
  private heroPush = 0;
  private enemyOffset = 0;
  private walkTimer = 0;
  private wisp?: Phaser.GameObjects.Image;
  private mountSprite?: Phaser.GameObjects.Image;
  private mountShadow?: Phaser.GameObjects.Ellipse;
  /** Pixels the knight sits above the ground while riding. */
  private mountOffset = 0;
  private wingSprite?: Phaser.GameObjects.Image;
  private burstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private emberEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private frostEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chainEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private surgeAura!: Phaser.GameObjects.Particles.ParticleEmitter;
  private damagePool: Phaser.GameObjects.Text[] = [];
  private enemyId = -1;
  private enemyScale = 2;
  private enemyLift = 0;
  /** Enemy currently wears the frost tint, so it is only repainted on a change. */
  private slowTint = false;
  private heroDead = false;
  private heroTexture = 'hero';
  private accumulator = 0;
  private hitStop = 0;
  private spawnToken = 0;
  private unsubscribe?: () => void;

  constructor() {
    super('battle');
  }

  create(): void {
    registerDummyTextures(this);

    this.add.image(195, 422, 'bg').setDepth(0);

    // Two mark strips scroll at different speeds, so the arena reads as travel
    // while the painted backdrop stays put.
    this.farGround = this.add
      .tileSprite(195, 353, 390, 34, 'ground-strip')
      .setTileScale(0.7)
      .setAlpha(0.45)
      .setDepth(1);
    this.nearGround = this.add.tileSprite(195, 402, 390, 78, 'ground-strip').setDepth(3);

    const fog = this.add.rectangle(195, 640, 390, 190, 0x7a5a8a, 0.06).setDepth(2);
    this.tweens.add({
      targets: fog,
      alpha: 0.14,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: 390 },
        y: { min: 320, max: 366 },
        lifespan: { min: 3000, max: 6000 },
        speedY: { min: -22, max: -6 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.8, end: 0 },
        frequency: 240,
        tint: 0xe3b34f,
        blendMode: 'ADD',
      })
      .setDepth(3);

    this.heroShadow = this.add
      .ellipse(HERO_X, GROUND_Y + 2, 58, 14, 0x000000, 0.35)
      .setDepth(4);
    this.enemyShadow = this.add
      .ellipse(ENEMY_X, GROUND_Y + 2, 58, 14, 0x000000, 0.35)
      .setDepth(4);

    this.heroSprite = this.add.image(0, 0, 'hero').setOrigin(0.5, 1).setScale(2);
    this.sword = this.add
      .image(18, -18, 'blade')
      .setOrigin(0.5, 0.86)
      .setScale(1.45)
      .setAngle(18);
    this.heroContainer = this.add
      .container(HERO_X, GROUND_Y, [this.heroSprite, this.sword])
      .setDepth(10);
    this.syncOutfit();
    this.startHeroIdle();

    // The mount sits behind the knight, who is lifted into the saddle by
    // `syncMount`. Its shadow is wider so the beast reads as a separate body.
    this.mountShadow = this.add
      .ellipse(HERO_X + 2, GROUND_Y + 4, 96, 18, 0x000000, 0.32)
      .setDepth(4)
      .setVisible(false);
    this.mountSprite = this.add
      .image(HERO_X + 2, GROUND_Y + 2, 'mount-ember')
      .setOrigin(0.5, 1)
      .setScale(2.2)
      .setDepth(9)
      .setVisible(false);
    this.tweens.add({
      targets: this.mountSprite,
      y: GROUND_Y - 2,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.syncMount();

    // Wings spread behind everything, so the knight's silhouette stays clean
    // while the pair still reads as worn.
    this.wingSprite = this.add
      .image(HERO_X, GROUND_Y - 46, 'wing-ember')
      .setOrigin(0.5, 0.5)
      .setScale(1.9)
      .setDepth(8)
      .setVisible(false);
    this.tweens.add({
      targets: this.wingSprite,
      scaleX: 2.1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.syncWing();

    this.wisp = this.add
      .image(HERO_X + 36, GROUND_Y - 54, 'spark')
      .setTint(0xff9a4a)
      .setScale(2)
      .setDepth(11)
      .setVisible(false);
    this.syncPet();
    this.tweens.add({
      targets: this.wisp,
      y: GROUND_Y - 64,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.enemySprite = this.add.image(0, 0, 'slime').setOrigin(0.5, 1).setScale(2);
    this.enemyContainer = this.add
      .container(ENEMY_X, GROUND_Y, [this.enemySprite])
      .setDepth(9);

    this.burstEmitter = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 220, max: 520 },
        speed: { min: 40, max: 150 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 220,
        tint: [0xe3b34f, 0xff8a3d, 0x9fb4d8],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(40);

    // Kicked-up ground, only while the knight is actually marching.
    this.dust = this.add
      .particles(0, 0, 'spark', {
        x: { min: -12, max: 12 },
        y: { min: -5, max: 1 },
        lifespan: { min: 220, max: 480 },
        speed: { min: 10, max: 44 },
        angle: { min: 200, max: 340 },
        gravityY: -18,
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.45, end: 0 },
        tint: [0xd9c6ff, 0xb79bff, 0x8f7bd6],
        blendMode: 'ADD',
        frequency: 90,
        emitting: false,
      })
      .setDepth(5);

    // One emitter per wisp element, so each hit reads as fire, ice, or storm
    // without swapping textures on the shared burst.
    this.emberEmitter = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 280, max: 620 },
        speed: { min: 30, max: 110 },
        angle: { min: 240, max: 300 },
        gravityY: -60,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [0xff9a4a, 0xff5b2e, 0xffd75e],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(20);

    this.frostEmitter = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 320, max: 720 },
        speed: { min: 30, max: 120 },
        gravityY: 160,
        scale: { start: 0.85, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [0x9fe8ff, 0x7fd8ff, 0xe6faff],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(20);

    this.chainEmitter = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 180, max: 380 },
        speed: { min: 80, max: 210 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffe066, 0xfff6c2],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(21);

    this.surgeAura = this.add
      .particles(0, 0, 'spark', {
        x: { min: HERO_X - 26, max: HERO_X + 26 },
        y: { min: GROUND_Y - 84, max: GROUND_Y - 8 },
        lifespan: { min: 320, max: 720 },
        speedY: { min: -70, max: -20 },
        speedX: { min: -12, max: 12 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.9, end: 0 },
        frequency: 55,
        tint: [0xffd75e, 0xff8a4c, 0xff6bd6],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(12);

    this.banner = this.add
      .text(195, 196, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffc247',
        stroke: '#180e35',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setAlpha(0);

    this.streakText = this.add
      .text(195, 248, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffc247',
        stroke: '#180e35',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setAlpha(0);

    this.redFlash = this.add
      .rectangle(195, 422, 390, 844, 0xff3b3b, 0)
      .setDepth(55);

    this.unsubscribe = gameController.sim.on((event) => this.handleEvent(event));
    this.syncEnemy(gameController.sim.enemy);

    if (gameController.sim.surgeActive) {
      this.surgeAura.start();
      this.sword.setTint(0xffd75e);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
    });
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);

    // Brief freeze frames make crits and boss kills land harder.
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }

    this.accumulator += dt;
    let guard = 0;
    while (this.accumulator >= STEP && guard < 6) {
      gameController.tick(STEP);
      this.accumulator -= STEP;
      guard += 1;
    }

    this.syncSlowTint();
    this.updateMarch(dt);
  }

  /** Screen position of the knight, including the march and knockback offsets. */
  private get heroX(): number {
    return HERO_X + this.heroOffset + this.heroPush;
  }

  private get enemyX(): number {
    return ENEMY_X + this.enemyOffset;
  }

  /**
   * Visual march: the knight drifts forward after a kill, the ground strips
   * scroll, and dust trails his feet. Every cue comes from events the
   * simulation already emits, so combat timing and determinism are untouched.
   */
  private updateMarch(dt: number): void {
    const reduce = isMotionReduced();
    const marching = !reduce && this.walkTimer > 0;
    const target = marching ? HERO_STEP : 0;

    this.heroOffset += (target - this.heroOffset) * Math.min(1, dt * 7);
    this.heroPush += (0 - this.heroPush) * Math.min(1, dt * 16);
    this.enemyOffset = Math.max(0, this.enemyOffset - dt * 460);
    this.walkTimer = Math.max(0, this.walkTimer - dt);

    const walking = marching ? Math.min(1, this.walkTimer / 0.55) : 0;
    const speed = reduce ? 0 : WALK_IDLE + walking * WALK_BURST;
    this.nearGround.tilePositionX += speed * dt;
    // The far strip is drawn at 0.7 scale and moves at 40% of the near speed,
    // which is what sells the depth.
    this.farGround.tilePositionX += (speed * dt * 0.4) / 0.7;

    const knightX = this.heroX;
    this.heroContainer.setX(knightX);
    this.heroShadow.setX(knightX);
    this.mountShadow?.setX(knightX + 2);
    this.mountSprite?.setX(knightX + 2);
    this.wingSprite?.setX(knightX);
    this.wisp?.setX(knightX + 36);
    this.heroSprite.setRotation(walking * Math.sin(this.time.now / 85) * 0.05);

    this.enemyContainer.setX(this.enemyX);
    this.enemyShadow.setX(this.enemyX);

    this.dust.setPosition(knightX, GROUND_Y);
    this.dust.emitting = walking > 0.15;
  }

  /** Repaints the knight for the worn outfit plus the chosen palette accent. */
  private syncOutfit(): void {
    const outfit = costumeById(gameController.sim.costume.equipped);
    const key = ensureHeroTexture(
      this,
      outfit?.tier ?? null,
      gameController.sim.palette.worn,
    );
    if (key === this.heroTexture) return;

    this.heroTexture = key;
    this.heroSprite.setTexture(key);
  }

  /** Colours the wisp for the active pet; hidden while none is awake. */
  private syncPet(): void {
    const info = petById(gameController.sim.pets.active);
    if (!this.wisp) return;

    this.wisp.setVisible(Boolean(info));
    if (info) this.wisp.setTint(Number.parseInt(info.color.slice(1), 16));
  }

  /** Each wisp leaves its own mark: flame, frost shards, or a lightning arc. */
  private petBurst(info: PetInfo | undefined): void {
    const x = this.enemyX;
    const y = this.enemyTop() + 22;

    if (info?.effect === 'slow') {
      this.frostEmitter.explode(7, x, y);
      this.floatText(this.enemyX - 30, this.enemyTop() - 46, 'CHILL', '#9fe8ff', 12);
      return;
    }

    if (info?.effect === 'chain') {
      this.chainEmitter.explode(6, x, y);
      this.arcBolt();
      return;
    }

    this.emberEmitter.explode(5, x, y);
  }

  /** A short zigzag from the wisp to the target on a storm hit. */
  private arcBolt(): void {
    if (!this.wisp || !this.wisp.visible || isMotionReduced()) return;

    const startX = this.wisp.x;
    const startY = this.wisp.y;
    const endX = this.enemyX - 8;
    const endY = this.enemyTop() + 18;

    const bolt = this.add.graphics().setDepth(19);
    bolt.setBlendMode(Phaser.BlendModes.ADD);
    bolt.lineStyle(2, 0xffe066, 0.9);
    bolt.beginPath();
    bolt.moveTo(startX, startY);
    for (let step = 1; step < 4; step += 1) {
      const t = step / 4;
      bolt.lineTo(
        Phaser.Math.Linear(startX, endX, t),
        Phaser.Math.Linear(startY, endY, t) + Phaser.Math.Between(-9, 9),
      );
    }
    bolt.lineTo(endX, endY);
    bolt.strokePath();

    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 190,
      onComplete: () => bolt.destroy(),
    });
  }

  /**
   * Wing skills are the loudest hit in the run: a beam from the knight, a
   * shockwave on the target, an elemental burst, and a short flash. The camera
   * work is skipped under reduced motion; the beam and ring still read.
   */
  private wingStrike(element: Element, color: string): void {
    const tint = Number.parseInt(color.slice(1), 16);
    const startX = HERO_X + 12;
    const startY = GROUND_Y - 96 - this.mountOffset;
    const endX = ENEMY_X;
    const endY = this.enemyTop() + 20;

    const beam = this.add.graphics().setDepth(18);
    beam.setBlendMode(Phaser.BlendModes.ADD);
    beam.lineStyle(4, tint, 0.85);
    beam.beginPath();
    beam.moveTo(startX, startY);
    beam.lineTo(endX, endY);
    beam.strokePath();
    beam.lineStyle(1, 0xffffff, 0.8);
    beam.beginPath();
    beam.moveTo(startX, startY + 4);
    beam.lineTo(endX, endY + 4);
    beam.strokePath();
    // Two crossed feather slashes over the target, so the hit reads even on the
    // frame after the beam fades.
    beam.lineStyle(3, tint, 0.9);
    beam.beginPath();
    beam.moveTo(endX - 30, endY - 36);
    beam.lineTo(endX + 24, endY + 28);
    beam.strokePath();
    beam.lineStyle(2, 0xffffff, 0.7);
    beam.beginPath();
    beam.moveTo(endX - 24, endY + 30);
    beam.lineTo(endX + 30, endY - 32);
    beam.strokePath();
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 420,
      onComplete: () => beam.destroy(),
    });

    this.strikeRing(endX, endY, 26, tint);
    this.burstEmitter.explode(18, endX, endY);
    if (element === 'fire') this.emberEmitter.explode(12, endX, endY);
    else if (element === 'ice') this.frostEmitter.explode(12, endX, endY);
    else this.chainEmitter.explode(12, endX, endY);

    if (this.wingSprite?.visible) {
      this.tweens.add({
        targets: this.wingSprite,
        scaleY: 2.25,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    const rgb = tint.toString(16).padStart(6, '0');
    if (!isMotionReduced()) {
      this.cameras.main.flash(
        120,
        Number.parseInt(rgb.slice(0, 2), 16),
        Number.parseInt(rgb.slice(2, 4), 16),
        Number.parseInt(rgb.slice(4, 6), 16),
        false,
      );
      this.cameras.main.shake(110, 0.004);
    }
    sound.play('crit');
  }

  /** A quick ring that expands off a point; used by wing skills and wards. */
  private strikeRing(x: number, y: number, size: number, tint: number): void {
    const ring = this.add.ellipse(x, y, size, size * 0.45).setDepth(18);
    ring.setStrokeStyle(3, tint, 0.9);
    this.tweens.add({
      targets: ring,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 340,
      onComplete: () => ring.destroy(),
    });
  }

  /** Shows the ridden beast and lifts the knight into the saddle. */
  private syncMount(): void {
    const info = mountById(gameController.sim.mounts.active);
    this.mountOffset = info ? 14 : 0;

    this.mountSprite?.setVisible(Boolean(info));
    this.mountShadow?.setVisible(Boolean(info));
    if (info && this.mountSprite) this.mountSprite.setTexture(info.sprite);

    this.startHeroIdle();
    this.syncWing();
  }

  /** Shows the worn wings behind the knight, riding height included. */
  private syncWing(): void {
    const info = wingById(gameController.sim.wings.active);
    if (this.wingSprite) {
      this.wingSprite.setVisible(Boolean(info));
      this.wingSprite.setPosition(HERO_X, GROUND_Y - 46 - this.mountOffset);
      if (info) this.wingSprite.setTexture(info.sprite);
    }
  }

  private startHeroIdle(): void {
    this.tweens.killTweensOf(this.heroContainer);
    this.tweens.killTweensOf(this.heroSprite);
    this.heroDead = false;
    this.syncOutfit();
    this.heroContainer
      .setPosition(HERO_X, GROUND_Y - this.mountOffset)
      .setAngle(0)
      .setAlpha(1);
    this.heroSprite.clearTint().setScale(2);
    this.sword.setAngle(18);
    if (gameController.sim.surgeActive) this.sword.setTint(0xffd75e);
    else this.sword.clearTint();
    this.tweens.add({
      targets: this.heroContainer,
      y: GROUND_Y - 3 - this.mountOffset,
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Slight breathing on top of the bob, so the silhouette never sits still.
    this.tweens.add({
      targets: this.heroSprite,
      scaleY: 2.04,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Lifts and idle motion per creature: bats hover, slimes squish, bosses breathe. */
  private startEnemyIdle(kind: Enemy['kind']): void {
    this.tweens.killTweensOf(this.enemyContainer);
    this.tweens.killTweensOf(this.enemySprite);
    this.enemyContainer.setPosition(ENEMY_X, GROUND_Y).setAngle(0).setAlpha(1);
    this.enemySprite.setScale(this.enemyScale).setY(this.enemyLift).setAngle(0);

    switch (this.enemySprite.texture.key) {
      case 'bat':
        this.tweens.add({
          targets: this.enemySprite,
          y: this.enemyLift - 8,
          angle: -3,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      case 'wraith':
        this.tweens.add({
          targets: this.enemySprite,
          y: this.enemyLift - 6,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: this.enemySprite,
          alpha: 0.78,
          duration: 1300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      case 'slime':
        this.tweens.add({
          targets: this.enemySprite,
          scaleX: this.enemyScale * 1.06,
          scaleY: this.enemyScale * 0.94,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      case 'skeleton':
        this.tweens.add({
          targets: this.enemySprite,
          angle: 2,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      case 'goblin':
        this.tweens.add({
          targets: this.enemySprite,
          y: this.enemyLift - 3,
          duration: 460,
          yoyo: true,
          repeat: -1,
          repeatDelay: 320,
          ease: 'Quad.easeOut',
        });
        break;
      default:
        this.tweens.add({
          targets: this.enemySprite,
          scaleY: this.enemyScale * (kind === 'boss' ? 1.03 : 1.015),
          duration: kind === 'boss' ? 1500 : 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
    }
  }

  private syncEnemy(enemy: Enemy): void {
    if (enemy.id === this.enemyId) return;
    this.enemyId = enemy.id;
    this.enemyScale = enemy.kind === 'boss' ? 4 : enemy.kind === 'elite' ? 3 : 2;
    this.enemyLift = enemy.sprite === 'bat' ? 22 : enemy.sprite === 'wraith' ? 10 : 0;

    this.enemyContainer.setAlpha(1);
    this.enemySprite.setTexture(enemy.sprite);
    this.enemySprite.setScale(this.enemyScale).clearTint().setAngle(0);
    this.slowTint = false;
    if (enemy.rival) this.enemySprite.setTint(ELEMENT_TINT[enemy.element]);
    // A slow carried over from the previous kill is re-applied next frame.
    this.enemySprite.setPosition(0, this.enemyLift + 10);
    this.enemySprite.setAlpha(0);
    this.enemyShadow.setScale(this.enemyScale / 2);

    this.tweens.killTweensOf(this.enemySprite);
    this.tweens.add({
      targets: this.enemySprite,
      alpha: 1,
      y: this.enemyLift,
      duration: 230,
      ease: 'Back.easeOut',
      onComplete: () => this.startEnemyIdle(enemy.kind),
    });

    if (enemy.kind === 'boss') {
      this.showBanner(`BOSS · ${enemy.name}`, '#ff8a8a');
      sound.play('bossSpawn');
      buzz([14, 40, 14]);
      this.cameras.main.flash(150, 90, 16, 24, false);
      if (!isMotionReduced()) {
        this.cameras.main.zoomTo(1.06, 420, 'Sine.easeOut', true);
        this.time.delayedCall(1100, () =>
          this.cameras.main.zoomTo(1, 900, 'Sine.easeInOut', true),
        );
      }
    }
  }

  private handleEvent(event: SimEvent): void {
    switch (event.type) {
      case 'hit':
        if (event.target === 'enemy') {
          this.showDamage(this.enemyX, this.enemyTop() - 12, event.damage, event.crit);
          if (event.advantage === 'strong') {
            this.floatText(this.enemyX + 22, this.enemyTop() - 48, 'WEAK', '#ffcf5a', 13);
          } else if (event.advantage === 'weak') {
            this.floatText(this.enemyX + 22, this.enemyTop() - 48, 'RESIST', '#8fa3c8', 13);
          }
          this.flashEnemy();
          this.spawnSlash();
          this.knockEnemy();
          this.swing();
          sound.play(event.crit ? 'crit' : 'hit');
          if (event.crit) {
            if (!isMotionReduced()) this.cameras.main.shake(70, 0.003);
            this.burstEmitter.explode(6, ENEMY_X, this.enemyTop() + 20);
            this.hitStop = Math.max(this.hitStop, 0.045);
            buzz(8);
          }
        } else {
          if (event.damage === 0) {
            this.floatText(HERO_X, HERO_TEXT_Y + 18, 'BLOCK', '#bcd2f0', 16);
            sound.play('block');
          } else {
            this.showDamage(HERO_X, HERO_TEXT_Y + 18, event.damage, false, '#ff9a9a');
            sound.play('hurt');
            buzz(10);
          }
          this.flashHero();
          this.enemyLunge();
          this.hitHero();
          if (!isMotionReduced()) this.cameras.main.shake(55, 0.002);
        }
        break;
      case 'companionHit': {
        const info = petById(gameController.sim.pets.active);
        const color =
          info?.effect === 'slow' ? '#9fe8ff' : info?.effect === 'chain' ? '#ffe066' : '#ffb066';
        this.showDamage(ENEMY_X, this.enemyTop() - 12, event.damage, false, color);
        this.petBurst(info);
        this.flashEnemy();
        break;
      }
      case 'burn':
        this.showDamage(ENEMY_X, this.enemyTop() - 34, event.damage, false, '#ff8a3d');
        this.emberEmitter.explode(2, ENEMY_X, this.enemyTop() + 24);
        break;
      case 'pet': {
        this.syncPet();
        const info = petById(event.id);
        if (this.wisp) this.burstEmitter.explode(8, this.wisp.x, this.wisp.y);
        this.floatText(
          HERO_X + 36,
          HERO_TOP_Y + 10,
          `${info?.name.split(' ')[0].toUpperCase() ?? 'PET'} L${event.level}`,
          info?.color ?? '#ffb066',
          13,
        );
        sound.play('level');
        break;
      }
      case 'petEgg':
        this.burstEmitter.explode(6, HERO_X + 36, GROUND_Y - 64);
        this.floatText(HERO_X + 36, HERO_TOP_Y + 26, 'EGG', '#ffe066', 12);
        break;
      case 'petSynth':
        this.floatText(HERO_X + 36, HERO_TOP_Y + 26, `CAP ${event.maxLevel}`, '#8fffa8', 12);
        break;
      case 'mount': {
        this.syncMount();
        if (event.id && event.level > 0) {
          const info = mountById(event.id);
          this.burstEmitter.explode(10, HERO_X + 2, GROUND_Y - 18);
          this.floatText(
            HERO_X + 2,
            HERO_TOP_Y + 26,
            `${info?.name.toUpperCase() ?? 'MOUNT'} L${event.level}`,
            info?.color ?? '#ffd75e',
            12,
          );
          sound.play('level');
        }
        break;
      }
      case 'wing': {
        this.syncWing();
        if (event.id && event.level > 0) {
          const info = wingById(event.id);
          this.burstEmitter.explode(14, HERO_X, GROUND_Y - 52);
          this.floatText(
            HERO_X,
            HERO_TOP_Y + 20,
            `${info?.name.toUpperCase() ?? 'WINGS'} L${event.level}`,
            info?.color ?? '#ffe066',
            12,
          );
          sound.play('level');
        }
        break;
      }
      case 'wingSkill': {
        const info = wingById(gameController.sim.wings.active);
        const color = info?.color ?? '#ffe066';
        if (event.kind === 'damage') {
          this.showDamage(ENEMY_X, this.enemyTop() - 12, event.amount, false, color);
          this.wingStrike(info?.element ?? 'lightning', color);
          this.floatText(
            ENEMY_X - 40,
            this.enemyTop() - 70,
            event.name.toUpperCase(),
            color,
            12,
          );
        } else if (event.kind === 'heal') {
          this.strikeRing(HERO_X, GROUND_Y - 40 - this.mountOffset, 24, 0x8fffa8);
          this.floatText(HERO_X, HERO_TEXT_Y - 6, `+${event.amount}`, '#8fffa8', 15);
        } else {
          this.strikeRing(HERO_X, GROUND_Y - 40 - this.mountOffset, 24, 0x9fe8ff);
          this.floatText(HERO_X, HERO_TEXT_Y - 6, `WARD +${event.amount}`, '#9fe8ff', 13);
        }
        break;
      }
      case 'mountSkill': {
        if (event.kind === 'damage') {
          this.showDamage(ENEMY_X, this.enemyTop() - 12, event.amount, false, '#ffe066');
          this.burstEmitter.explode(8, ENEMY_X, this.enemyTop() + 20);
          this.floatText(
            ENEMY_X - 34,
            this.enemyTop() - 58,
            event.name.toUpperCase(),
            '#ffe066',
            11,
          );
        } else if (event.kind === 'heal') {
          this.floatText(HERO_X, HERO_TEXT_Y - 6, `+${event.amount}`, '#8fffa8', 15);
        } else {
          this.floatText(HERO_X, HERO_TEXT_Y - 6, `WARD +${event.amount}`, '#9fe8ff', 13);
        }
        break;
      }
      case 'dungeonstart':
        this.showBanner(
          `DUNGEON · ${dungeonTier(event.tier)?.name.toUpperCase() ?? 'RUN'}`,
          '#ffd75e',
        );
        break;
      case 'kill':
        this.burstEmitter.explode(
          (event.kind === 'boss' ? 26 : 10) + Math.min(12, this.streak * 2),
          this.enemyX,
          this.enemyTop() + 24,
        );
        this.bumpStreak();
        sound.play(event.kind === 'boss' ? 'boss' : 'kill');
        buzz(event.kind === 'boss' ? [18, 50, 22] : 6);
        if (event.kind === 'boss') {
          if (!isMotionReduced()) this.cameras.main.shake(240, 0.009);
          this.cameras.main.flash(160, 227, 179, 79, false);
          this.hitStop = Math.max(this.hitStop, 0.14);
        }
        this.tweens.add({ targets: this.enemyContainer, alpha: 0.25, duration: 160 });
        // Walk on to the next encounter instead of standing over the corpse.
        this.walkTimer = Math.max(this.walkTimer, 1.1);
        break;
      case 'spawn': {
        this.enemyOffset = isMotionReduced() ? 0 : ENEMY_ENTER;
        const token = ++this.spawnToken;
        this.time.delayedCall(150, () => {
          if (this.spawnToken === token) this.syncEnemy(event.enemy);
        });
        break;
      }
      case 'levelup':
        this.floatText(HERO_X, HERO_TOP_Y - 30, `LEVEL ${event.level}`, '#8fffa8', 20);
        this.burstEmitter.explode(14, HERO_X, GROUND_Y - 60);
        sound.play('level');
        buzz(10);
        break;
      case 'stageup':
        this.showBanner(`STAGE ${event.stage}`);
        this.walkTimer = Math.max(this.walkTimer, 2.2);
        sound.play('stage');
        break;
      case 'ascend':
        this.showBanner('ASCENSION');
        this.burstEmitter.explode(22, HERO_X, GROUND_Y - 60);
        sound.play('ascend');
        buzz([20, 50, 20, 50, 30]);
        break;
      case 'surge':
        if (event.phase === 'start') {
          this.surgeAura.start();
          this.sword.setTint(0xffd75e);
          this.showBanner('SURGE', '#ffd75e');
          sound.play('surge');
          buzz([10, 30, 10]);
          if (!isMotionReduced()) this.cameras.main.flash(160, 255, 190, 90, false);
        } else {
          this.surgeAura.stop();
          this.sword.clearTint();
        }
        break;
      case 'death':
        this.heroDefeated();
        this.resetStreak();
        sound.play('death');
        buzz(50);
        break;
      case 'revive':
        this.startHeroIdle();
        break;
      case 'enhance':
        this.floatText(HERO_X, HERO_TOP_Y - 10, `+${event.level}`, '#ffc247', 26);
        this.burstEmitter.explode(8, HERO_X + 20, GROUND_Y - 60);
        sound.play('enhance');
        break;
      case 'palette':
        this.syncOutfit();
        break;
      case 'outfit':
        this.syncOutfit();
        break;
      case 'costume':
        this.syncOutfit();
        if (!event.duplicate) this.showBanner('NEW COSTUME');
        break;
      case 'skill': {
        const color =
          event.kind === 'damage'
            ? '#ffd75e'
            : event.kind === 'drain'
              ? '#b48cff'
              : event.kind === 'heal'
                ? '#8fffa8'
                : event.kind === 'shield'
                  ? '#bcd2f0'
                  : '#ff9b6b';
        this.floatText(HERO_X, HERO_TOP_Y + 10, event.name.toUpperCase(), color, 14);
        if (event.kind === 'heal' || event.kind === 'shield') {
          this.floatText(HERO_X, HERO_TOP_Y - 10, `+${event.amount}`, color, 18);
        } else if (event.kind === 'drain') {
          if (event.amount > 0) {
            this.floatText(HERO_X, HERO_TOP_Y - 10, `+${event.amount}`, color, 18);
          }
        } else if (event.kind === 'buff') {
          this.floatText(HERO_X, HERO_TOP_Y - 10, `+${event.amount}% ATK`, color, 16);
        }
        this.castSkill(event.kind === 'drain' ? 'damage' : event.kind, color);
        if (event.kind === 'drain') this.castSkill('heal', color);
        sound.play(
          event.kind === 'heal' || event.kind === 'drain'
            ? 'heal'
            : event.kind === 'shield'
              ? 'shield'
              : event.kind === 'buff'
                ? 'buff'
                : 'hit',
        );
        break;
      }
      case 'duelstart':
        this.resetStreak();
        this.showBanner(`DUEL · ${event.rival.name}`, '#e6c9ff');
        this.cameras.main.flash(140, 90, 40, 150, false);
        sound.play('bossSpawn');
        buzz([12, 30, 12]);
        break;
      case 'duelend':
        this.showBanner(event.result.win ? 'VICTORY' : 'DEFEAT', event.result.win ? '#8fffa8' : '#ffb3c1');
        this.burstEmitter.explode(
          event.result.win ? 24 : 12,
          event.result.win ? ENEMY_X : HERO_X,
          GROUND_Y - 50,
        );
        sound.play(event.result.win ? 'level' : 'death');
        buzz(event.result.win ? 18 : 40);
        break;
      case 'rivalSkill': {
        const color = ELEMENT_COLOR[event.element];
        this.floatText(HERO_X, HERO_TEXT_Y - 8, event.name, color, 14);
        this.showDamage(HERO_X, HERO_TEXT_Y + 18, event.damage, false, color);
        this.enemyLunge();
        this.flashHero();
        this.burstEmitter.explode(10, HERO_X, GROUND_Y - 50);
        if (!isMotionReduced()) this.cameras.main.shake(90, 0.004);
        sound.play('hurt');
        buzz(16);
        break;
      }
      case 'loot':
        this.floatText(
          ENEMY_X,
          this.enemyTop() - 26,
          event.item.rarity === 'common' ? 'LOOT' : event.item.rarity.toUpperCase(),
          RARITY[event.item.rarity].color,
          18,
        );
        sound.play('loot');
        this.burstEmitter.explode(
          event.item.rarity === 'common' ? 5 : 14,
          ENEMY_X,
          this.enemyTop() + 24,
        );
        if (event.item.rarity !== 'common') {
          this.lootBeam(RARITY[event.item.rarity].color);
        }
        break;
      default:
        break;
    }
  }

  private enemyTop(): number {
    return GROUND_Y - this.enemyLift - this.enemyScale * SPRITE_SIZE;
  }

  private swing(): void {
    this.tweens.killTweensOf(this.sword);
    this.sword.setAngle(18);
    this.tweens.add({
      targets: this.sword,
      angle: -38,
      duration: 85,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.sword.setAngle(18),
    });
    this.tweens.add({
      targets: [this.heroSprite, this.sword],
      x: '+=10',
      duration: 85,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private enemyLunge(): void {
    this.tweens.add({
      targets: this.enemySprite,
      x: -16,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.enemySprite.setX(0),
    });
  }

  private flashEnemy(): void {
    this.enemySprite.setTintFill(0xffffff);
    this.time.delayedCall(55, () => {
      if (this.enemySprite.active) this.restoreEnemyTint();
    });
  }

  /** Repaints the enemy for frost's slow or its rival element; cleanup otherwise. */
  private restoreEnemyTint(): void {
    const enemy = gameController.sim.enemy;
    if (gameController.sim.enemySlowTimer > 0) this.enemySprite.setTint(0x9fe8ff);
    else if (enemy.rival) this.enemySprite.setTint(ELEMENT_TINT[enemy.element]);
    else this.enemySprite.clearTint();
  }

  /** Frost's slow is readable on the sprite, not just in the CHILL label. */
  private syncSlowTint(): void {
    const slowed = gameController.sim.enemySlowTimer > 0;
    if (slowed === this.slowTint) return;
    this.slowTint = slowed;
    this.restoreEnemyTint();
  }

  private flashHero(): void {
    this.heroSprite.setTintFill(0xffb0b0);
    this.time.delayedCall(70, () => {
      if (!this.heroDead && this.heroSprite.active) this.heroSprite.clearTint();
    });
  }

  /** A bright crescent across the enemy on every landed hit. */
  private spawnSlash(): void {
    const slash = this.add
      .image(
        this.enemyX + Phaser.Math.Between(-8, 8),
        this.enemyTop() + Phaser.Math.Between(18, 42),
        'slash',
      )
      .setTint(0xfff2cd)
      .setScale(1.2)
      .setAngle(Phaser.Math.Between(-28, 28))
      .setDepth(37)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.95);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.8,
      duration: 190,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  /** Squash the enemy container briefly so hits have weight. */
  private knockEnemy(): void {
    this.enemyKnock?.stop();
    this.enemyContainer.setScale(1);
    this.enemyKnock = this.tweens.add({
      targets: this.enemyContainer,
      scaleX: 1.05,
      scaleY: 0.96,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.enemyContainer.setScale(1),
    });
  }

  /** Hero takes a hit: small knockback plus a red edge pulse. */
  private hitHero(): void {
    // Fed through the march offset instead of a tween, so the walk animation
    // and the knockback never fight over heroContainer.x.
    this.heroPush = -9;

    this.tweens.killTweensOf(this.redFlash);
    this.redFlash.setAlpha(0.2);
    this.tweens.add({ targets: this.redFlash, alpha: 0, duration: 260, ease: 'Quad.easeOut' });
  }

  /** Skill flourishes: an orb for damage, an expanding ring for support. */
  private castSkill(kind: 'damage' | 'heal' | 'shield' | 'buff', color: string): void {
    const tint = Phaser.Display.Color.HexStringToColor(color).color;

    if (kind === 'damage') {
      const orb = this.add
        .image(this.heroX + 14, GROUND_Y - 58, 'orb')
        .setTint(tint)
        .setScale(2)
        .setDepth(36)
        .setBlendMode(Phaser.BlendModes.ADD);
      const targetY = this.enemyTop() + 24;

      this.tweens.add({
        targets: orb,
        x: this.enemyX,
        y: targetY,
        scale: 2.8,
        duration: 260,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.burstEmitter.explode(10, this.enemyX, targetY);
          orb.destroy();
        },
      });
      return;
    }

    const ring = this.add
      .image(HERO_X, GROUND_Y - 40, 'ring')
      .setTint(tint)
      .setScale(0.5)
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.9);

    this.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    if (kind !== 'shield') {
      this.burstEmitter.explode(kind === 'heal' ? 10 : 6, HERO_X, GROUND_Y - 40);
    }
  }

  /** Consecutive kills inside a short window build a visible streak. */
  private bumpStreak(): void {
    const now = this.time.now;
    this.streak = now <= this.streakUntil ? this.streak + 1 : 1;
    this.streakUntil = now + 6000;
    if (this.streak < 3) return;

    const rampage = this.streak >= 8;
    this.tweens.killTweensOf(this.streakText);
    this.streakText
      .setText(`${rampage ? 'RAMPAGE' : 'STREAK'} ×${this.streak}`)
      .setColor(rampage ? '#ff8a3d' : '#ffc247')
      .setAlpha(1)
      .setScale(1.3);

    this.tweens.add({
      targets: this.streakText,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.streakText,
      alpha: 0,
      delay: 1000,
      duration: 500,
    });
  }

  private resetStreak(): void {
    this.streak = 0;
    this.streakUntil = 0;
    this.tweens.killTweensOf(this.streakText);
    this.streakText.setAlpha(0);
  }

  /** Coloured pillar of light for rare or better loot. */
  private lootBeam(color: string): void {
    const tint = Phaser.Display.Color.HexStringToColor(color).color;
    const beam = this.add
      .rectangle(ENEMY_X, this.enemyTop() + 30, 12, 180, tint, 0.45)
      .setDepth(33)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: beam,
      alpha: 0,
      scaleX: 3,
      duration: 540,
      ease: 'Cubic.easeOut',
      onComplete: () => beam.destroy(),
    });
  }

  private heroDefeated(): void {
    this.heroDead = true;
    this.tweens.killTweensOf(this.heroContainer);
    this.tweens.killTweensOf(this.heroSprite);
    this.heroSprite.setTint(0x666677);
    this.tweens.add({
      targets: this.heroContainer,
      angle: -78,
      alpha: 0.4,
      y: GROUND_Y + 10,
      duration: 430,
      ease: 'Quad.easeIn',
    });
  }

  private showDamage(
    x: number,
    y: number,
    amount: number,
    crit: boolean,
    color = '#f6f3ff',
  ): void {
    const text = this.acquireDamageText();
    text
      .setActive(true)
      .setVisible(true)
      .setText(crit ? `${amount}!` : `${amount}`)
      .setPosition(x + Phaser.Math.Between(-22, 22), y + Phaser.Math.Between(-10, 10))
      .setColor(crit ? '#ffd75e' : color)
      .setFontSize(crit ? 26 : 20)
      .setAlpha(1)
      .setScale(crit ? 1.25 : 1);

    this.tweens.add({
      targets: text,
      y: y - 54,
      alpha: 0,
      scale: crit ? 1.5 : 1.1,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.setActive(false).setVisible(false);
      },
    });
  }

  private floatText(x: number, y: number, label: string, color: string, size: number): void {
    const text = this.acquireDamageText();
    text
      .setActive(true)
      .setVisible(true)
      .setText(label)
      .setPosition(x, y)
      .setColor(color)
      .setFontSize(size)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.setActive(false).setVisible(false);
      },
    });
  }

  private acquireDamageText(): Phaser.GameObjects.Text {
    const existing = this.damagePool.find((text) => !text.active);
    if (existing) return existing;

    const text = this.add
      .text(0, 0, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f6f3ff',
        stroke: '#180e35',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setActive(false)
      .setVisible(false);

    this.damagePool.push(text);
    return text;
  }

  private showBanner(label: string, color = '#ffc247'): void {
    this.tweens.killTweensOf(this.banner);
    this.banner
      .setText(label)
      .setColor(color)
      .setAlpha(0)
      .setScale(0.85)
      .setY(190);

    this.tweens.add({
      targets: this.banner,
      alpha: 1,
      scale: 1,
      duration: 180,
      hold: 700,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.banner.setAlpha(0),
    });
  }
}
