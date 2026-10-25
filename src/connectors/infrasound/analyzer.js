// The 18.9 Hz "Fear Frequency" analyzer.
// Owns a maximum-resolution AnalyserNode (fftSize 32768). With a 48 kHz context that gives
// Bin Width = 48000 / 32768 ≈ 1.465 Hz, so 18.9 Hz lands in bin round(18.9 / 1.465) = 13.
// analyzeFrame() compares that one bin with the ambient noise floor (average of 30–60 Hz) and
// flags a spike at +12 dB. Most phone mics high-pass filter below 20 Hz, so injectTestTone()
// feeds a synthetic 18.9 Hz sine into the SAME analyser for demos — never to the speakers.
import { INFRASOUND } from '../../config/app';

const DB_FLOOR = -140; // getFloatFrequencyData returns -Infinity for digital silence

const average = (values) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);

export class InfrasoundAnalyzer {
  /** @param {AudioContext} audioContext */
  constructor(audioContext) {
    this.context = audioContext;
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = INFRASOUND.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;
    this.binWidth = audioContext.sampleRate / this.analyser.fftSize;
    this.targetBin = Math.round(INFRASOUND.targetHz / this.binWidth);
    this.dbData = new Float32Array(this.analyser.frequencyBinCount);
    this.tone = null;
  }

  /** The node a microphone (or any source) should connect into. */
  get input() {
    return this.analyser;
  }

  hzToBin(hz) {
    return Math.round(hz / this.binWidth);
  }

  /** Reads the analyser's current spectrum and analyses it. */
  read() {
    this.analyser.getFloatFrequencyData(this.dbData);
    return this.analyzeFrame(this.dbData);
  }

  /**
   * @param {Float32Array} frequencyDataArray  analyser.getFloatFrequencyData output (dB per bin)
   * @returns {{targetDb:number, noiseFloorDb:number, deltaDb:number, spiking:boolean,
   *            bins:number[], binHz:number, targetBin:number}}
   *   `bins` (0 → maxHz) and `binHz` feed the spectrum gauge.
   */
  analyzeFrame(frequencyDataArray) {
    const clampDb = (db) => Math.max(DB_FLOOR, db);
    const [floorFrom, floorTo] = INFRASOUND.noiseFloorHz;

    const targetDb = clampDb(frequencyDataArray[this.targetBin]);
    const floorBins = Array.from(frequencyDataArray.slice(this.hzToBin(floorFrom), this.hzToBin(floorTo) + 1), clampDb);
    const noiseFloorDb = average(floorBins);
    const deltaDb = Math.max(0, targetDb - noiseFloorDb);

    return {
      targetDb,
      noiseFloorDb,
      deltaDb,
      spiking: deltaDb >= INFRASOUND.spikeDeltaDb,
      bins: Array.from(frequencyDataArray.slice(0, this.hzToBin(INFRASOUND.maxHz) + 1), clampDb),
      binHz: this.binWidth,
      targetBin: this.targetBin,
    };
  }

  /** Starts an 18.9 Hz sine at gain 0.05, piped straight into the analyser (not the speakers). */
  injectTestTone(audioContext = this.context) {
    this.stopTestTone();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = INFRASOUND.targetHz;
    const gain = audioContext.createGain();
    gain.gain.value = INFRASOUND.testToneGain;
    oscillator.connect(gain).connect(this.analyser);
    oscillator.start();
    this.tone = { oscillator, gain };
  }

  stopTestTone() {
    if (!this.tone) return;
    this.tone.oscillator.stop();
    this.tone.oscillator.disconnect();
    this.tone.gain.disconnect();
    this.tone = null;
  }

  get testToneOn() {
    return Boolean(this.tone);
  }
}
