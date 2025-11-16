class ScenarioPlayer {
  constructor(orchestrator, options = {}) {
    this.orchestrator = orchestrator;
    this.scenarioDirectory = options.scenarioDirectory || '/data/scenarios';
    this.scenarioCache = new Map();
    this.queueTimer = null;
    this.state = {
      isPlaying: false,
      currentScenario: null,
      currentStepIndex: 0,
      speed: 1,
      progress: 0
    };
    this.listeners = new Map();
  }

  async loadScenario(scenarioId) {
    if (!scenarioId) {
      return null;
    }
    if (this.scenarioCache.has(scenarioId)) {
      return this.scenarioCache.get(scenarioId);
    }
    const url = `${this.scenarioDirectory}/${scenarioId}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load scenario: ${scenarioId}`);
    }
    const data = await response.json();
    this.scenarioCache.set(scenarioId, data);
    return data;
  }

  async startScenario(scenarioId) {
    const scenario = await this.loadScenario(scenarioId);
    if (!scenario) {
      return;
    }

    this.stop();
    this.state.currentScenario = scenario;
    this.state.currentStepIndex = 0;
    this.state.progress = 0;
    this.state.isPlaying = true;
    this._emit('scenario-loaded', scenario);
    this._playNextStep();
    return scenario;
  }

  stop() {
    this.state.isPlaying = false;
    this.state.currentStepIndex = 0;
    this.state.progress = 0;
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
    this._emit('scenario-stopped', this.state.currentScenario);
  }

  pause() {
    this.state.isPlaying = false;
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
    this._emit('scenario-paused', this.state.currentScenario);
  }

  resume() {
    if (!this.state.currentScenario || this.state.isPlaying) {
      return;
    }
    this.state.isPlaying = true;
    this._playNextStep();
    this._emit('scenario-resumed', this.state.currentScenario);
  }

  setSpeed(speed = 1) {
    this.state.speed = Math.max(0.5, Math.min(2, speed));
    this._emit('speed-changed', this.state.speed);
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  _emit(event, payload) {
    (this.listeners.get(event) || []).forEach((listener) => listener(payload));
  }

  getProgress() {
    return Math.min(Math.max(this.state.progress / 100, 0), 1);
  }

  _playNextStep() {
    if (!this.state.isPlaying || !this.state.currentScenario) {
      return;
    }

    const steps = this.state.currentScenario.steps || [];
    if (this.state.currentStepIndex >= steps.length) {
      this.state.isPlaying = false;
      this._emit('scenario-complete', this.state.currentScenario);
      return;
    }

    const step = steps[this.state.currentStepIndex];
    this._emit('step-played', { step, index: this.state.currentStepIndex });

    const delay = (step.duration || 2200) / this.state.speed;
    this.state.currentStepIndex += 1;
    this.state.progress = (this.state.currentStepIndex / steps.length) * 100;
    this._emit('progress', this.state.progress);

    this.queueTimer = setTimeout(() => this._playNextStep(), delay);
  }
}

if (typeof window !== 'undefined') {
  window.ScenarioPlayer = ScenarioPlayer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScenarioPlayer;
}
