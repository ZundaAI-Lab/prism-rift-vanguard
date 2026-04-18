/**
 * Responsibility:
 * - Lightweight pub/sub for decoupling UI and gameplay systems.
 *
 * Rules:
 * - Event payloads should be plain objects.
 * - Do not store long-lived runtime ownership in the bus.
 */
export class EventBus {
  constructor() {
    this.map = new Map();
  }

  on(eventName, handler) {
    if (!this.map.has(eventName)) this.map.set(eventName, new Set());
    this.map.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    this.map.get(eventName)?.delete(handler);
  }

  emit(eventName, payload = {}) {
    const handlers = this.map.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) handler(payload);
  }
}
