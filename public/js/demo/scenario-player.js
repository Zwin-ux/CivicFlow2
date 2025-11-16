/**
 * Scenario Player
 * Handles scenario sequencing, playback controls, and timeline events
 */

class ScenarioPlayer {
  constructor(options = {}) {
    this.events = [];
    this.duration = 0;
    this.currentIndex = 0;
    this.playbackOffset = 0;
    this.speed = 1;
    this.isPlaying = false;
    this.timerId = null;
    this.listeners = new Map();
    this.scenario = null;
    this.startTime = null;
    this.controls = options.controls || {};
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }

  loadScenario(definition) {
    this.stop();
    this.scenario = definition;
    this.events = (definition?.events || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    this.duration = definition?.duration || (this.events.length ? this.events[this.events.length - 1].timestamp : 0);
    this.currentIndex = 0;
    this.playbackOffset = 0;
    this.emit('loaded', definition);
  }

  play() {
    if (this.isPlaying || !this.events.length) {
      return;
    }
    this.isPlaying = true;
    this.startTime = Date.now() - this.playbackOffset / this.speed;
    this.emit('play');
    this._scheduleNextEvent();
  }

  pause() {
    if (!this.isPlaying) {
      return;
    }
    this.isPlaying = false;
    clearTimeout(this.timerId);
    this.timerId = null;
    this.emit('pause');
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
    this.playbackOffset = 0;
    this.emit('stop');
  }

  setSpeed(value) {
    this.speed = value;
    if (this.isPlaying) {
      clearTimeout(this.timerId);
      this._scheduleNextEvent();
    }
    this.emit('speed', value);
  }

  _scheduleNextEvent() {
    if (this.currentIndex >= this.events.length) {
      this.isPlaying = false;
      this.emit('complete', this.scenario);
      return;
    }

    const nextEvent = this.events[this.currentIndex];
    const delay = Math.max((nextEvent.timestamp - this.playbackOffset) / this.speed, 0);

    this.timerId = setTimeout(() => {
      this.playbackOffset = nextEvent.timestamp;
      this.emit('event', nextEvent);
      this.currentIndex += 1;
      this._scheduleNextEvent();
    }, delay);
  }

  seek(timestamp) {
    this.pause();
    this.playbackOffset = Math.min(Math.max(timestamp, 0), this.duration);
    this.currentIndex = this.events.findIndex((event) => event.timestamp > this.playbackOffset);
    if (this.currentIndex === -1) {
      this.currentIndex = this.events.length;
    }
    this.emit('seek', this.playbackOffset);
  }

  getProgress() {
    if (!this.duration) {
      return 0;
    }
    return Math.min(this.playbackOffset / this.duration, 1);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScenarioPlayer;
}

if (typeof window !== 'undefined') {
  window.ScenarioPlayer = ScenarioPlayer;
}
