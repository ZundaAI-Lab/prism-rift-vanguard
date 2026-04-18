/**
 * Responsibility:
 * - Three.js object disposal helpers shared by runtime systems.
 *
 * Rules:
 * - Only release GPU resources here. Do not place gameplay logic in this module.
 * - Shared geometries/materials must set `userData.shared = true` so they are not disposed per-instance.
 * - Callers should prefer detachAndDispose()/clearAndDisposeChildren() instead of ad-hoc parent.remove() to avoid leaks.
 * - Do not pass pickup or projectile logic anchors here. Their GPU resources live in Renderer.batches.
 */
function disposeMaterial(material, disposed) {
  if (!material || disposed.has(material) || material.userData?.shared) return;
  disposed.add(material);
  for (const key of ['map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap']) {
    const tex = material[key];
    if (tex && typeof tex.dispose === 'function') tex.dispose();
  }
  material.dispose?.();
}

export function disposeObject3D(root) {
  if (!root) return;
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  root.traverse((object) => {
    const geometry = object.geometry;
    if (geometry && !disposedGeometries.has(geometry) && !geometry.userData?.shared) {
      disposedGeometries.add(geometry);
      geometry.dispose?.();
    }
    const material = object.material;
    if (Array.isArray(material)) {
      for (const entry of material) disposeMaterial(entry, disposedMaterials);
    } else {
      disposeMaterial(material, disposedMaterials);
    }
  });
}

export function detachAndDispose(object) {
  if (!object) return;
  object.parent?.remove(object);
  disposeObject3D(object);
}

export function clearAndDisposeChildren(group) {
  if (!group) return;
  for (const child of [...group.children]) detachAndDispose(child);
}
