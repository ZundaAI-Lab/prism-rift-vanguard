/**
 * Responsibility:
 * - 空、星、地面、環境粒子などの基盤環境描画を担当する。
 *
 * Rules:
 * - テーマごとの基礎色調と ambient 系メッシュだけを扱う。
 * - バイオーム固有の装飾物や天候状態は別モジュールへ分ける。
 */
import { PLAYER_TRAVEL, THREE, randRange } from '../EnvironmentBuilderShared.js';

const BACKGROUND_PARTICLE_TEXTURE_SIZE = 64;
const WHITE = new THREE.Color(0xffffff);
const STAR_GROUND_MIN_BRIGHTNESS = 0.015;
const STAR_GROUND_DIM_START_HEIGHT = 6.0;
const STAR_GROUND_FULL_BRIGHT_HEIGHT = 110.0;
const STAR_GROUND_DIM_EXPONENT = 4.0;
const STAR_PLAYABLE_PADDING = PLAYER_TRAVEL.boundaryMargin ?? 18;
const STAR_PLAYABLE_CLEARANCE = 96.0;
const STAR_SPAWN_MAX_ATTEMPTS = 16;
let backgroundParticleAlphaMap = null;

function getBackgroundParticleAlphaMap() {
  if (backgroundParticleAlphaMap) return backgroundParticleAlphaMap;

  const canvas = document.createElement('canvas');
  canvas.width = BACKGROUND_PARTICLE_TEXTURE_SIZE;
  canvas.height = BACKGROUND_PARTICLE_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const radius = BACKGROUND_PARTICLE_TEXTURE_SIZE * 0.5;
  const gradient = ctx.createRadialGradient(radius, radius, radius * 0.08, radius, radius, radius);
  gradient.addColorStop(0.0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.96)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.68)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  backgroundParticleAlphaMap = texture;
  return backgroundParticleAlphaMap;
}

function createBackgroundPointMaterial({
  color,
  size,
  opacity,
  blending = THREE.AdditiveBlending,
  vertexColors = false,
}) {
  const alphaMap = getBackgroundParticleAlphaMap();
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    alphaMap,
    depthWrite: false,
    blending,
    sizeAttenuation: true,
    toneMapped: false,
    vertexColors,
  });
  material.alphaTest = 0.06;
  material.fog = false;
  return material;
}

function sampleHeightBasedBrightness(altitudeFromGround, {
  minBrightness = STAR_GROUND_MIN_BRIGHTNESS,
  dimStartHeight = STAR_GROUND_DIM_START_HEIGHT,
  fullBrightHeight = STAR_GROUND_FULL_BRIGHT_HEIGHT,
  exponent = STAR_GROUND_DIM_EXPONENT,
} = {}) {
  const safeAltitude = Math.max(0, altitudeFromGround);
  const t = THREE.MathUtils.smoothstep(safeAltitude, dimStartHeight, fullBrightHeight);
  return THREE.MathUtils.lerp(minBrightness, 1.0, Math.pow(t, exponent));
}

function isInsidePlayableStarSuppressionArea(x, z) {
  const limit = PLAYER_TRAVEL.radius + STAR_PLAYABLE_PADDING;
  return Math.abs(x) <= limit && Math.abs(z) <= limit;
}

export function installSkyEnvironment(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.createSky = function createSky(theme) {
      const skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          topColor: { value: new THREE.Color(theme.skyTop) },
          bottomColor: { value: new THREE.Color(theme.skyBottom) },
          accentColor: { value: new THREE.Color(theme.accent) },
          secondaryAccent: { value: new THREE.Color(theme.secondaryAccent ?? theme.accent) },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec3 vWorld;
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform vec3 accentColor;
          uniform vec3 secondaryAccent;
          uniform float time;
          void main() {
            vec3 dir = normalize(vWorld);
            float h = dir.y * 0.5 + 0.5;
            float band1 = smoothstep(0.16, 0.88, h) * (sin(vWorld.x * 0.011 + time * 0.28) * 0.5 + 0.5);
            float band2 = smoothstep(0.28, 0.92, h) * (sin(vWorld.z * 0.014 - time * 0.22) * 0.5 + 0.5);
            float veil = smoothstep(0.35, 1.0, h) * (sin((vWorld.x + vWorld.z) * 0.007 + time * 0.17) * 0.5 + 0.5);
            vec3 col = mix(bottomColor, topColor, smoothstep(0.0, 1.0, h));
            col += accentColor * band1 * 0.12;
            col += secondaryAccent * band2 * 0.08;
            col += mix(accentColor, secondaryAccent, 0.5) * veil * 0.06;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      this.skyMaterial = skyMaterial;
      const sky = new THREE.Mesh(new THREE.SphereGeometry(650, 48, 24), skyMaterial);
      this.game.renderer.groups.world.add(sky);
    }

  EnvironmentBuilder.prototype.createStars = function createStars(theme) {
      const baseCount = Number.isFinite(theme.starCount)
        ? Math.max(0, Math.floor(theme.starCount))
        : (theme.decor === 'astral' ? 3200 : theme.decor === 'mirror' ? 1800 : theme.decor === 'voidcrown' ? 2600 : 2200);
      const count = Math.floor(baseCount * this.getEnvironmentDensityScale('stars'));
      if (count <= 0) {
        this.starField = null;
        return;
      }

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const baseColor = new THREE.Color(theme.starColor ?? 0xdffcff).lerp(WHITE, 0.2);
      const colors = new Float32Array(count * 3);
      const maxRadius = theme.decor === 'astral' ? 620 : theme.decor === 'voidcrown' ? 700 : 540;

      for (let i = 0; i < count; i += 1) {
        const offset = i * 3;
        let x = 0;
        let y = 0;
        let z = 0;
        let altitudeFromGround = STAR_PLAYABLE_CLEARANCE;

        for (let attempt = 0; attempt < STAR_SPAWN_MAX_ATTEMPTS; attempt += 1) {
          const r = randRange(240, maxRadius);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI * 0.8;
          x = Math.cos(theta) * Math.sin(phi) * r;
          y = Math.cos(phi) * r + 160;
          z = Math.sin(theta) * Math.sin(phi) * r;
          const groundY = this.getHeight(x, z);
          altitudeFromGround = y - groundY;
          if (!isInsidePlayableStarSuppressionArea(x, z) || altitudeFromGround >= STAR_PLAYABLE_CLEARANCE) break;
        }

        if (isInsidePlayableStarSuppressionArea(x, z) && altitudeFromGround < STAR_PLAYABLE_CLEARANCE) {
          const groundY = this.getHeight(x, z);
          y = groundY + STAR_PLAYABLE_CLEARANCE + randRange(0, 18);
          altitudeFromGround = y - groundY;
        }

        positions[offset] = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;

        const brightness = sampleHeightBasedBrightness(altitudeFromGround);
        colors[offset] = baseColor.r * brightness;
        colors[offset + 1] = baseColor.g * brightness;
        colors[offset + 2] = baseColor.b * brightness;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const material = createBackgroundPointMaterial({
        color: baseColor,
        size: theme.starSize ?? 1.6,
        opacity: theme.starOpacity ?? (theme.decor === 'mirror' ? 0.7 : theme.decor === 'voidcrown' ? 0.82 : 0.9),
        vertexColors: true,
      });
      this.starField = new THREE.Points(geometry, material);
      this.starField.frustumCulled = false;
      this.game.renderer.groups.world.add(this.starField);
    }

  EnvironmentBuilder.prototype.createGround = function createGround(theme) {
      const center = this.getGroundFollowCenter();
      this.groundMesh = this.terrain.buildGroundMesh(theme, {
        centerX: center.x,
        centerZ: center.z,
      });
      this.groundFollowState = {
        snap: 12,
        centerX: center.x,
        centerZ: center.z,
      };
      this.game.renderer.groups.world.add(this.groundMesh);
    }

  EnvironmentBuilder.prototype.createAmbient = function createAmbient(theme) {
      const baseCount = theme.decor === 'mirror' ? 420 : theme.decor === 'astral' ? 680 : theme.decor === 'voidcrown' ? 780 : 560;
      const count = Math.floor(baseCount * this.getEnvironmentDensityScale('ambient'));
      if (count <= 0) {
        this.ambientPoints = null;
        return;
      }
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = THREE.MathUtils.randFloatSpread(360);
        positions[i * 3 + 1] = Math.random() * 44;
        positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(360);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const color = new THREE.Color(theme.ambientColor ?? 0xffffff).lerp(WHITE, 0.48);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        const groundY = this.getHeight(x, z);
        const altitudeFromGround = Math.max(0, y - groundY);
        const heightT = THREE.MathUtils.smoothstep(altitudeFromGround, 0.5, 12.0);
        const brightness = THREE.MathUtils.lerp(0.02, 1.0, heightT * heightT * heightT);
        colors[i * 3] = color.r * brightness;
        colors[i * 3 + 1] = color.g * brightness;
        colors[i * 3 + 2] = color.b * brightness;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = createBackgroundPointMaterial({
        color,
        size: theme.ambientSize ?? 0.24,
        opacity: theme.ambientOpacity ?? 0.34,
        vertexColors: true,
      });
      this.ambientPoints = new THREE.Points(geo, mat);
      this.ambientPoints.frustumCulled = false;
      this.game.renderer.groups.world.add(this.ambientPoints);
    }

  EnvironmentBuilder.prototype.getHeight = function getHeight(x, z) {
      return this.terrain.getHeight(x, z);
    }

}
