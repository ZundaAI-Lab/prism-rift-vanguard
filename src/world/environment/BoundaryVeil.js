/**
 * Responsibility:
 * - フィールド外周ベールとその粒子演出を担当する。
 *
 * Rules:
 * - プレイヤー移動境界の可視化だけを扱い、移動制限ロジックは持たない。
 * - ベール本体と粒子の生成・更新はここへ集約する。
 */
import { MINIMAP, PLAYER_TRAVEL, THREE, randRange } from '../EnvironmentBuilderShared.js';

export function installBoundaryVeil(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.createBoundaryVeil = function createBoundaryVeil(theme) {
      const playerMesh = this.game.store.playerMesh;
      const playerCenterX = playerMesh?.position?.x ?? this.game.state?.player?.x ?? 0;
      const playerCenterZ = playerMesh?.position?.z ?? this.game.state?.player?.z ?? 0;
      const config = {
        halfExtent: PLAYER_TRAVEL.radius,
        inset: 4,
        outerOffset: 10,
        height: 60,
        opacity: 0.26,
        noiseScale: 6.2,
        distortionAmp: 4.8,
        segmentLength: 10,
        verticalSegments: 8,
        primaryColor: theme.accent,
        secondaryColor: theme.secondaryAccent ?? theme.accent,
        visibleRadius: MINIMAP.range,
        visibleFeather: 10,
        ...theme.boundaryVeil,
      };
      const innerHalf = Math.max(12, config.halfExtent - config.inset);
      const veilHalf = innerHalf + config.outerOffset;
      const sideSpan = innerHalf * 2;
      const horizontalSegments = Math.max(16, Math.ceil(sideSpan / Math.max(4, config.segmentLength)));
      const verticalSegments = Math.max(4, Math.floor(config.verticalSegments));
      const sideData = [
        { axis: 'x', fixed: veilHalf, dirX: 1, dirZ: 0, tangentSign: 1 },
        { axis: 'z', fixed: -veilHalf, dirX: 0, dirZ: -1, tangentSign: 1 },
        { axis: 'x', fixed: -veilHalf, dirX: -1, dirZ: 0, tangentSign: -1 },
        { axis: 'z', fixed: veilHalf, dirX: 0, dirZ: 1, tangentSign: -1 },
      ];
  
      const verticesPerSide = (horizontalSegments + 1) * (verticalSegments + 1);
      const vertexCount = sideData.length * verticesPerSide;
      const positions = new Float32Array(vertexCount * 3);
      const uvs = new Float32Array(vertexCount * 2);
      const edgeCoord = new Float32Array(vertexCount);
      const flowDir = new Float32Array(vertexCount * 2);
      const indices = [];
  
      let vertexIndex = 0;
      for (let sideIndex = 0; sideIndex < sideData.length; sideIndex += 1) {
        const side = sideData[sideIndex];
        const sideVertexStart = vertexIndex;
        for (let step = 0; step <= horizontalSegments; step += 1) {
          const t = step / horizontalSegments;
          const tangent = THREE.MathUtils.lerp(-innerHalf, innerHalf, t) * side.tangentSign;
          const edge = 1.0 - Math.abs(t * 2.0 - 1.0);
          const x = side.axis === 'x' ? side.fixed : tangent;
          const z = side.axis === 'z' ? side.fixed : tangent;
  
          for (let level = 0; level <= verticalSegments; level += 1) {
            const yT = level / verticalSegments;
            const pOffset = vertexIndex * 3;
            const uvOffset = vertexIndex * 2;
            const dirOffset = vertexIndex * 2;
            positions[pOffset] = x;
            positions[pOffset + 1] = config.height * yT;
            positions[pOffset + 2] = z;
            uvs[uvOffset] = t;
            uvs[uvOffset + 1] = yT;
            edgeCoord[vertexIndex] = edge;
            flowDir[dirOffset] = side.dirX;
            flowDir[dirOffset + 1] = side.dirZ;
            vertexIndex += 1;
          }
        }
  
        for (let step = 0; step < horizontalSegments; step += 1) {
          for (let level = 0; level < verticalSegments; level += 1) {
            const a = sideVertexStart + step * (verticalSegments + 1) + level;
            const b = a + (verticalSegments + 1);
            const c = a + 1;
            const d = b + 1;
            indices.push(a, b, c);
            indices.push(c, b, d);
          }
        }
      }
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geometry.setAttribute('edgeCoord', new THREE.BufferAttribute(edgeCoord, 1));
      geometry.setAttribute('flowDir', new THREE.BufferAttribute(flowDir, 2));
      geometry.setIndex(indices);
  
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          colorA: { value: new THREE.Color(config.primaryColor) },
          colorB: { value: new THREE.Color(config.secondaryColor) },
          opacity: { value: config.opacity },
          noiseScale: { value: config.noiseScale },
          distortionAmp: { value: config.distortionAmp },
          playerCenter: { value: new THREE.Vector2(playerCenterX, playerCenterZ) },
          visibleRadius: { value: config.visibleRadius },
          visibleFeather: { value: Math.min(config.visibleFeather, config.visibleRadius * 0.35) },
        },
        vertexShader: `
          attribute float edgeCoord;
          attribute vec2 flowDir;
          varying vec2 vUv;
          varying vec3 vWorld;
          varying float vFlow;
          varying float vEdge;
          uniform float time;
          uniform float noiseScale;
          uniform float distortionAmp;
  
          void main() {
            vUv = uv;
            vEdge = edgeCoord;
            float waveA = sin(vUv.x * 6.28318 * noiseScale + time * 0.62 + position.y * 0.11);
            float waveB = sin(vUv.x * 6.28318 * (noiseScale * 0.57) - time * 0.96 - position.y * 0.15);
            float waveC = sin((position.y * 0.21 + vUv.x * 24.0) + time * 0.38);
            float flow = waveA * 0.52 + waveB * 0.33 + waveC * 0.22;
            float lift = sin(vUv.x * 18.0 - time * 0.48 + position.y * 0.05) * 0.5 + 0.5;
            float topWarp = smoothstep(0.45, 1.0, uv.y);
            vec3 displaced = position;
            displaced.xz += flowDir * (flow * distortionAmp * (0.45 + uv.y * 0.9));
            displaced.y += lift * (0.45 + uv.y * 1.2);
            displaced.y += sin(vUv.x * 9.0 + time * 0.31 + uv.y * 7.5) * topWarp * 2.8;
            displaced.xz += flowDir * sin(vUv.x * 13.0 - time * 0.44 + uv.y * 6.0) * topWarp * 1.6;
            vec4 world = modelMatrix * vec4(displaced, 1.0);
            vWorld = world.xyz;
            vFlow = flow;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vWorld;
          varying float vFlow;
          varying float vEdge;
          uniform vec3 colorA;
          uniform vec3 colorB;
          uniform float opacity;
          uniform float time;
          uniform vec2 playerCenter;
          uniform float visibleRadius;
          uniform float visibleFeather;
  
          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 34.45);
            return fract(p.x * p.y);
          }
  
          void main() {
            float baseFade = smoothstep(0.02, 0.18, vUv.y);
            float topBlend = 1.0 - smoothstep(0.52, 1.0, vUv.y);
            float lateralFade = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
            float edgeBoost = 0.45 + vEdge * 0.55;
            float curtain = sin(vUv.x * 21.0 + time * 0.85 + vWorld.y * 0.09) * 0.5 + 0.5;
            float pulse = sin((vWorld.x + vWorld.z) * 0.032 - time * 0.68) * 0.5 + 0.5;
            float grain = hash21(vWorld.xz * 0.05 + time * 0.026);
            float density = curtain * 0.44 + pulse * 0.28 + grain * 0.28;
            density = smoothstep(0.22, 0.9, density + vFlow * 0.12);
            float playerDistance = distance(vWorld.xz, playerCenter);
            float minimapMask = 1.0 - smoothstep(max(0.0, visibleRadius - visibleFeather), visibleRadius, playerDistance);
            float cameraFade = smoothstep(7.0, 20.0, distance(cameraPosition, vWorld));
            float alpha = opacity * baseFade * topBlend * lateralFade * edgeBoost * density * minimapMask * cameraFade;
            vec3 col = mix(colorA, colorB, smoothstep(0.18, 0.88, density));
            col += mix(colorA, colorB, 0.5) * (0.14 + grain * 0.16);
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });
  
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = this.terrain.getHeight(0, 0) - 3.5;
      mesh.renderOrder = 25;
      mesh.frustumCulled = false;
      this.boundaryVeilMesh = mesh;
      this.boundaryVeilMaterial = material;
      this.game.renderer.groups.world.add(mesh);
    }

  EnvironmentBuilder.prototype.createBoundaryVeilParticles = function createBoundaryVeilParticles(theme) {
      const config = {
        halfExtent: PLAYER_TRAVEL.radius,
        innerSpread: 6,
        outerSpread: 12,
        count: 160,
        minY: 2.4,
        maxY: 18,
        size: theme.decor === 'frost' ? 1.2 : theme.decor === 'mirror' ? 0.82 : 0.96,
        opacity: 0.18,
        color: theme.accent,
        ...theme.boundaryVeilParticles,
      };
      const positions = new Float32Array(config.count * 3);
      const edge = new Uint8Array(config.count);
      const lane = new Float32Array(config.count);
      const travel = new Float32Array(config.count);
      const y = new Float32Array(config.count);
      const speed = new Float32Array(config.count);
      const wobble = new Float32Array(config.count);
      const perimeter = config.halfExtent * 8;
  
      const placePoint = (index) => {
        const travelDist = ((travel[index] % perimeter) + perimeter) % perimeter;
        const sideSpan = config.halfExtent * 2;
        const sideIndex = Math.floor(travelDist / sideSpan) % 4;
        const local = (travelDist % sideSpan) / sideSpan;
        const tangent = THREE.MathUtils.lerp(-config.halfExtent, config.halfExtent, local);
        const offset = lane[index];
        const pOffset = index * 3;
  
        if (sideIndex === 0) {
          positions[pOffset] = config.halfExtent + offset;
          positions[pOffset + 2] = tangent;
        } else if (sideIndex === 1) {
          positions[pOffset] = tangent;
          positions[pOffset + 2] = -config.halfExtent - offset;
        } else if (sideIndex === 2) {
          positions[pOffset] = -config.halfExtent - offset;
          positions[pOffset + 2] = -tangent;
        } else {
          positions[pOffset] = -tangent;
          positions[pOffset + 2] = config.halfExtent + offset;
        }
        positions[pOffset + 1] = this.terrain.getHeight(0, 0) + y[index];
      };
  
      for (let i = 0; i < config.count; i += 1) {
        edge[i] = i % 4;
        lane[i] = randRange(-config.innerSpread, config.outerSpread);
        travel[i] = Math.random() * perimeter;
        y[i] = randRange(config.minY, config.maxY);
        speed[i] = randRange(6.5, 18.0) * (Math.random() < 0.5 ? -1 : 1);
        wobble[i] = randRange(0.8, 2.4);
        placePoint(i);
      }
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
  
      this.boundaryVeilPoints = new THREE.Points(geometry, material);
      this.boundaryVeilPoints.frustumCulled = false;
      this.boundaryVeilState = {
        positions,
        lane,
        travel,
        y,
        speed,
        wobble,
        count: config.count,
        halfExtent: config.halfExtent,
        perimeter,
        baseHeight: this.terrain.getHeight(0, 0),
      };
      this.game.renderer.groups.world.add(this.boundaryVeilPoints);
    }

  EnvironmentBuilder.prototype.updateBoundaryVeil = function updateBoundaryVeil(dt) {
    const playerMesh = this.game.store.playerMesh;
    const playerCenterX = playerMesh?.position?.x ?? this.game.state?.player?.x ?? 0;
    const playerCenterZ = playerMesh?.position?.z ?? this.game.state?.player?.z ?? 0;
  
    if (this.boundaryVeilMaterial) {
      this.boundaryVeilMaterial.uniforms.time.value = this.localTime;
      this.boundaryVeilMaterial.uniforms.playerCenter.value.set(playerCenterX, playerCenterZ);
    }
    if (!this.boundaryVeilPoints || !this.boundaryVeilState) return;
  
    const { positions, lane, travel, y, speed, wobble, count, halfExtent, perimeter, baseHeight } = this.boundaryVeilState;
    const sideSpan = halfExtent * 2;
    for (let i = 0; i < count; i += 1) {
      travel[i] += speed[i] * dt;
      const pathDist = ((travel[i] % perimeter) + perimeter) % perimeter;
      const sideIndex = Math.floor(pathDist / sideSpan) % 4;
      const local = (pathDist % sideSpan) / sideSpan;
      const tangent = THREE.MathUtils.lerp(-halfExtent, halfExtent, local);
      const offset = lane[i] + Math.sin(this.localTime * (0.55 + wobble[i] * 0.14) + i * 0.71) * 0.9;
      const pOffset = i * 3;
  
      if (sideIndex === 0) {
        positions[pOffset] = halfExtent + offset;
        positions[pOffset + 2] = tangent;
      } else if (sideIndex === 1) {
        positions[pOffset] = tangent;
        positions[pOffset + 2] = -halfExtent - offset;
      } else if (sideIndex === 2) {
        positions[pOffset] = -halfExtent - offset;
        positions[pOffset + 2] = -tangent;
      } else {
        positions[pOffset] = -tangent;
        positions[pOffset + 2] = halfExtent + offset;
      }
      positions[pOffset + 1] = baseHeight + y[i] + Math.sin(this.localTime * wobble[i] + i * 0.43) * 0.45;
    }
    this.boundaryVeilPoints.geometry.attributes.position.needsUpdate = true;
  }

}
