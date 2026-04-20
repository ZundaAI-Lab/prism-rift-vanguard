export function createBootLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'bootLoadingOverlay';
  overlay.innerHTML = `
    <div class="boot-loading-card" role="status" aria-live="polite" aria-busy="true">
      <div class="boot-loading-eyebrow">SYSTEM BOOT</div>
      <h2 class="boot-loading-title">NOW LOADING</h2>
      <p class="boot-loading-text" id="bootLoadingText">音源を読み込んでいます…</p>
      <div class="boot-loading-progress" aria-hidden="true">
        <div class="boot-loading-progress-fill" id="bootLoadingProgressFill"></div>
      </div>
      <div class="boot-loading-meta" id="bootLoadingMeta">0 / 0</div>
    </div>
  `;
  document.body.append(overlay);
  return {
    root: overlay,
    text: overlay.querySelector('#bootLoadingText'),
    meta: overlay.querySelector('#bootLoadingMeta'),
    fill: overlay.querySelector('#bootLoadingProgressFill'),
  };
}

export function updateBootLoadingOverlay(overlay, snapshot = {}) {
  const total = Math.max(0, Number(snapshot.total) || 0);
  const completed = Math.max(0, Number(snapshot.completed) || 0);
  const pending = Math.max(0, Number(snapshot.pending) || Math.max(0, total - completed));
  const percent = total > 0 ? Math.min(100, Math.max(0, Number(snapshot.percent) || 0)) : 100;

  if (overlay.fill) {
    overlay.fill.style.width = `${percent}%`;
  }
  if (overlay.meta) {
    overlay.meta.textContent = `${completed} / ${total}`;
  }
  if (overlay.text) {
    overlay.text.textContent = pending > 0
      ? `音源を読み込んでいます… ${percent}%`
      : '起動準備を完了しています…';
  }
}

export function hideBootLoadingOverlay(overlay) {
  if (!overlay?.root) return;
  overlay.root.classList.add('is-hidden');
  window.setTimeout(() => {
    overlay.root.remove();
  }, 320);
}
