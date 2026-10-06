/**
 * Procedural Web Audio API sound engine for authentic Taoist chimes,
 * singing bowls, and subtle energetic resonance.
 */

class TaoAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private isDroneActive: boolean = false;

  // Energy Gauge Dynamic Resonance Synthesizer & Humming Nodes
  private energyMasterGain: GainNode | null = null;
  private energyCarrierOsc: OscillatorNode | null = null;
  private energyCarrierGain: GainNode | null = null;
  private energyCarrierFilter: BiquadFilterNode | null = null;
  private hummingGain: GainNode | null = null;
  private hummingOsc1: OscillatorNode | null = null;
  private hummingOsc2: OscillatorNode | null = null;
  private hummingOsc3: OscillatorNode | null = null;
  private hummingFilter: BiquadFilterNode | null = null;
  private isEnergySynthInitialized: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime, 0.05);
      if (this.energyMasterGain) {
        this.energyMasterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime, 0.05);
      }
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Resonant Tibetan / Taoist singing bowl (颂钵) harmonic chime
   */
  public playSingingBowl(freq = 216, duration = 3.5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const partials = [1, 2.76, 5.4, 8.9];
    const gains = [0.35, 0.18, 0.08, 0.03];

    partials.forEach((mult, i) => {
      const osc = this.ctx!.createOscillator();
      const pGain = this.ctx!.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * mult, now);

      // Gentle pitch vibrato
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.value = 4.5 + i * 0.8;
      lfoGain.gain.value = 1.2;
      lfo.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);

      pGain.gain.setValueAtTime(0, now);
      pGain.gain.linearRampToValueAtTime(gains[i], now + 0.05);
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(pGain);
      pGain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /**
   * Ancient Bronze Bell (青铜大钟) deep reverbing strike
   */
  public playBronzeBell() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const baseFreq = 108; // Sacred 108Hz resonance

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + 4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 4.5);
  }

  /**
   * Armillary Sphere deployment sound (浑天仪乾坤破阵 · 机械咬合与天体轰鸣)
   */
  public playArmillaryDeploy() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Deep resonant gong fundamental
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(80, now);
    bassOsc.frequency.exponentialRampToValueAtTime(54, now + 3.0);
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.45, now + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);
    bassOsc.start(now);
    bassOsc.stop(now + 3.2);

    // 2. High metallic ring & ratchets (ancient bronze celestial mechanism)
    [240, 360, 480, 720].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + idx * 0.08 + 1.2);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.8);
    });
  }

  /**
   * Armillary Sphere snap-back lock sound (浑天仪归元合一 · 磁吸闭合锁定)
   */
  public playArmillarySnap() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Solid mechanical heavy bronze latch strike
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.8);

    // Accompanying crystalline chime
    this.playSingingBowl(432, 2.5);
  }

  /**
   * Element activation chime (五行灵音)
   */
  public playElementChime(elementId: string) {
    const freqs: Record<string, number> = {
      wood: 324,  // Jade wood note
      fire: 432,  // Radiant fire note
      earth: 216, // Grounded earth note
      metal: 540, // Crisp metal starlight
      water: 288, // Flowing water note
    };
    this.playSingingBowl(freqs[elementId] || 360, 2.8);
  }

  /**
   * Subtle Qi whoosh / magnetic resonance tick when rotating the compass dial
   */
  public playCompassRotationResonance(velocity: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const speed = Math.min(Math.abs(velocity), 10);
    if (speed < 0.2) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180 + speed * 40, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400 + speed * 120, now);

    gain.gain.setValueAtTime(0.04 * Math.min(speed, 2), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Gentle continuous ambient drone for Meditation mode (太极吐纳)
   */
  public setMeditationDrone(active: boolean) {
    if (active && !this.isDroneActive) {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      this.isDroneActive = true;
      const now = this.ctx.currentTime;

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneGain = this.ctx.createGain();

      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(108, now); // 108Hz Root

      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(162, now); // Fifth harmonic 162Hz

      this.droneGain.gain.setValueAtTime(0, now);
      this.droneGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.08, now + 3);

      this.droneOsc1.connect(this.droneGain);
      this.droneOsc2.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      this.droneOsc1.start(now);
      this.droneOsc2.start(now);
    } else if (!active && this.isDroneActive) {
      if (this.droneGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.droneGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
        setTimeout(() => {
          try {
            this.droneOsc1?.stop();
            this.droneOsc2?.stop();
            this.droneOsc1?.disconnect();
            this.droneOsc2?.disconnect();
          } catch {
            // ignore
          }
          this.isDroneActive = false;
        }, 1600);
      } else {
        this.isDroneActive = false;
      }
    }
  }

  /**
   * Dynamically synthesize and modulate Qi resonance audio based on energyLevel (0-100).
   * When energyLevel > 80, layers in a subtle warm humming drone (轻微嗡鸣声),
   * increasing presence and sacred acoustic resonance.
   */
  public updateEnergyResonanceAudio(energyLevel: number) {
    if (this.isMuted) {
      if (this.energyMasterGain && this.ctx) {
        this.energyMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }

    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Initialize the synthesizer voice nodes once
    if (!this.isEnergySynthInitialized) {
      try {
        this.energyMasterGain = this.ctx.createGain();
        this.energyMasterGain.gain.setValueAtTime(0, now);
        this.energyMasterGain.connect(this.masterGain);

        // 1. Dynamic Carrier Tone (Resonant Taoist overtone carrier)
        this.energyCarrierOsc = this.ctx.createOscillator();
        this.energyCarrierOsc.type = 'sine';
        this.energyCarrierOsc.frequency.setValueAtTime(144, now);

        this.energyCarrierFilter = this.ctx.createBiquadFilter();
        this.energyCarrierFilter.type = 'lowpass';
        this.energyCarrierFilter.frequency.setValueAtTime(320, now);
        this.energyCarrierFilter.Q.value = 2.0;

        this.energyCarrierGain = this.ctx.createGain();
        this.energyCarrierGain.gain.setValueAtTime(0, now);

        this.energyCarrierOsc.connect(this.energyCarrierFilter);
        this.energyCarrierFilter.connect(this.energyCarrierGain);
        this.energyCarrierGain.connect(this.energyMasterGain);

        this.energyCarrierOsc.start(now);

        // 2. Layered Warm Humming (嗡鸣声) Generator for High Energy (>80)
        // Dual detuned deep sines (sacred 72Hz & 73.2Hz create natural acoustic acoustic beating / humming)
        this.hummingOsc1 = this.ctx.createOscillator();
        this.hummingOsc1.type = 'sine';
        this.hummingOsc1.frequency.setValueAtTime(72, now); // 72Hz Deep root

        this.hummingOsc2 = this.ctx.createOscillator();
        this.hummingOsc2.type = 'sine';
        this.hummingOsc2.frequency.setValueAtTime(73.2, now); // 1.2Hz natural vibratory beating

        this.hummingOsc3 = this.ctx.createOscillator();
        this.hummingOsc3.type = 'triangle';
        this.hummingOsc3.frequency.setValueAtTime(144, now); // Warm octave harmonic

        this.hummingFilter = this.ctx.createBiquadFilter();
        this.hummingFilter.type = 'lowpass';
        this.hummingFilter.frequency.setValueAtTime(180, now); // Velvety deep humming warmth
        this.hummingFilter.Q.value = 1.5;

        this.hummingGain = this.ctx.createGain();
        this.hummingGain.gain.setValueAtTime(0, now);

        this.hummingOsc1.connect(this.hummingFilter);
        this.hummingOsc2.connect(this.hummingFilter);
        this.hummingOsc3.connect(this.hummingFilter);
        this.hummingFilter.connect(this.hummingGain);
        this.hummingGain.connect(this.energyMasterGain);

        this.hummingOsc1.start(now);
        this.hummingOsc2.start(now);
        this.hummingOsc3.start(now);

        this.isEnergySynthInitialized = true;
      } catch (err) {
        console.warn('Energy audio synth init error:', err);
        return;
      }
    }

    // Smoothly update parameters based on energy level
    const clampedEnergy = Math.max(0, Math.min(100, energyLevel));
    const normalized = clampedEnergy / 100;

    // Active master presence
    this.energyMasterGain?.gain.setTargetAtTime(this.isMuted ? 0 : 0.45, now, 0.08);

    // Dynamic Carrier frequency: 144Hz (base) to 216Hz (peak), smooth ascension with Qi
    const targetFreq = 144 + normalized * 72;
    this.energyCarrierOsc?.frequency.setTargetAtTime(targetFreq, now, 0.1);

    // Carrier filter opens with energy: 280Hz to 850Hz
    const targetCutoff = 280 + normalized * 570;
    this.energyCarrierFilter?.frequency.setTargetAtTime(targetCutoff, now, 0.1);

    // Carrier volume scales smoothly
    const targetCarrierGain = 0.015 + normalized * 0.055;
    this.energyCarrierGain?.gain.setTargetAtTime(targetCarrierGain, now, 0.08);

    // Humming Layer: Layered in when energy exceeds 80
    if (clampedEnergy > 80) {
      const surgeIntensity = Math.min(1, (clampedEnergy - 80) / 20); // 0.0 to 1.0
      // Warm, subtle humming volume (0.025 to 0.075) - balanced presence without harshness
      const targetHummingGain = 0.028 + surgeIntensity * 0.052;
      this.hummingGain?.gain.setTargetAtTime(targetHummingGain, now, 0.15);

      // Increase humming filter warmth with surge
      this.hummingFilter?.frequency.setTargetAtTime(180 + surgeIntensity * 60, now, 0.15);
    } else {
      // Smoothly fade out humming when below 80
      this.hummingGain?.gain.setTargetAtTime(0.0001, now, 0.25);
    }
  }

  /**
   * Stop the energy resonance synth (e.g. on unmount)
   */
  public stopEnergyResonanceAudio() {
    if (this.energyMasterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.energyMasterGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }
  }
}

export const audioEngine = new TaoAudioEngine();
