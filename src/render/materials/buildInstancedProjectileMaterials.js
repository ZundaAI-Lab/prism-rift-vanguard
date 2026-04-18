import * as THREE from 'three';

function appendCacheSuffix(material, suffix) {
  const baseKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${baseKey ? baseKey() : material.type}-${suffix}`;
}

function patchSharedInstancedAttributes(material) {
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute float instanceOpacity;\nattribute float instanceGlow;\nvarying float vInstanceOpacity;\nvarying float vInstanceGlow;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;\nvInstanceGlow = instanceGlow;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying float vInstanceOpacity;\nvarying float vInstanceGlow;',
    );
  };
}

/**
 * Responsibility:
 * - Build the instanced projectile materials used by ProjectileBatchRenderer.
 *
 * Rules:
 * - Core keeps standard lighting so bullets retain their solid body instead of turning into flat billboards.
 * - Halo and ring stay additive layers; do not merge them into the core material or the original projectile silhouette will drift.
 * - Per-instance tint goes through InstancedMesh.instanceColor. Do not enable material.vertexColors here; these geometries do not carry per-vertex color attributes and forcing USE_COLOR will black out every projectile layer.
 * - This module only patches the extra opacity/glow attributes.
 */
export function buildInstancedProjectileCoreMaterial(baseParams = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    transparent: true,
    depthWrite: false,
    roughness: 0.18,
    metalness: 0.15,
    ...baseParams,
  });
  patchSharedInstancedAttributes(material);
  material.onBeforeCompile = ((previous) => (shader) => {
    previous?.(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n  totalEmissiveRadiance *= vColor.rgb;\n#endif\ntotalEmissiveRadiance *= vInstanceGlow;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'diffuseColor.a *= vInstanceOpacity;\n#include <opaque_fragment>',
    );
  })(material.onBeforeCompile);
  appendCacheSuffix(material, 'instanced-projectile-core');
  material.needsUpdate = true;
  return material;
}

export function buildInstancedProjectileHaloMaterial(baseParams = {}) {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    ...baseParams,
  });
  patchSharedInstancedAttributes(material);
  material.onBeforeCompile = ((previous) => (shader) => {
    previous?.(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'diffuseColor.rgb *= vInstanceGlow;\ndiffuseColor.a *= vInstanceOpacity;\n#include <opaque_fragment>',
    );
  })(material.onBeforeCompile);
  appendCacheSuffix(material, `instanced-projectile-halo-${material.blending}`);
  material.needsUpdate = true;
  return material;
}

export function buildInstancedProjectileRingMaterial(baseParams = {}) {
  const material = buildInstancedProjectileHaloMaterial(baseParams);
  appendCacheSuffix(material, `instanced-projectile-ring-${material.blending}`);
  material.needsUpdate = true;
  return material;
}
