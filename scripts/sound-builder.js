const fs = require('fs');
const path = require('path');

function buildAudioAssets() {
  const assetsDir = path.join(__dirname, '../src/assets');
  const soundDir = path.join(assetsDir, 'sound');

  // Create folder hierarchies if not existing
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }
  if (!fs.existsSync(soundDir)) {
    fs.mkdirSync(soundDir);
  }

  // Specific procedural files list with unique aircraft categories
  const requiredSounds = [
    { name: 'trainer_engine.wav', freq: 52, dur: 1.2, isNoise: false, isPiston: true },
    { name: 'fighter_engine.wav', freq: 140, dur: 1.0, isNoise: false },
    { name: 'wind.wav', freq: 0, dur: 2.0, isNoise: true },
    { name: 'alarm.wav', freq: 800, dur: 0.4, isNoise: false, isBeep: true },
    { name: 'splash.wav', freq: 0, dur: 1.0, isNoise: true, isSplash: true },
    { name: 'crash.wav', freq: 0, dur: 1.2, isNoise: true, isCrash: true },
    { name: 'scrape.wav', freq: 0, dur: 1.0, isNoise: true, isScrape: true },
    { name: 'gear.wav', freq: 0, dur: 1.5, isNoise: false, isGear: true },
    { name: 'flaps.wav', freq: 0, dur: 1.0, isNoise: false, isFlaps: true },
    { name: 'squeal.wav', freq: 0, dur: 0.4, isNoise: false, isSqueal: true },
    { name: 'afterburner.wav', freq: 0, dur: 1.5, isNoise: true, isAfterburner: true }
  ];

  requiredSounds.forEach((sound) => {
    // Reorganize engine sounds into engine/ subfolder
    let targetPath = soundDir;
    if (sound.isPiston || sound.name === 'fighter_engine.wav' || sound.isAfterburner) {
      const engineDir = path.join(soundDir, 'engine');
      if (!fs.existsSync(engineDir)) {
        fs.mkdirSync(engineDir);
      }
      targetPath = engineDir;
    }

    // Clean filenames
    let fileName = sound.name;
    if (sound.isPiston) fileName = 'trainer.wav';
    if (sound.name === 'fighter_engine.wav') fileName = 'fighter.wav';
    if (sound.isAfterburner) fileName = 'afterburner.wav';

    const filePath = path.join(targetPath, fileName);
    if (!fs.existsSync(filePath)) {
      generateSoundFile(filePath, sound);
      console.log(`[sound-builder.js] Synthesized physical WAV asset: ${fileName}`);
    }
  });
}

/**
 * Synthesizes unique binary wave buffers for different aeronautical sound effects.
 */
function generateSoundFile(filePath, sound) {
  const sampleRate = 22050; // Balanced sampling rate for small files
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSec = sound.dur;

  const numSamples = Math.round(sampleRate * durationSec);
  const dataSize = numSamples * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);

  // 1. RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // 2. fmt Sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM Format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // 3. data Sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 4. Procedural Synthesizer Formulas
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    const t = i / sampleRate;

    if (sound.isPiston) {
      // Soft, warm piston engine chug (triangle/modulated square waves)
      const pistonFreq = sound.freq + Math.sin(2.0 * Math.PI * 10 * t) * 3.0;
      const cycle = t * pistonFreq;
      const triangle = 2.0 * Math.abs(2.0 * (cycle - Math.floor(cycle + 0.5))) - 1.0;
      
      const subBass = Math.sin(2.0 * Math.PI * (pistonFreq * 0.5) * t) * 0.35;
      const cylinderImpulse = 0.45 + 0.55 * Math.abs(Math.sin(2.0 * Math.PI * 25 * t));
      
      sample = (triangle * 0.55 + subBass) * cylinderImpulse * 0.12 * 32767;
    } else if (sound.name === 'fighter_engine.wav') {
      // High-pitched turbofan bypass whine layered with jet exhaust noise
      const whine = Math.sin(2.0 * Math.PI * sound.freq * t) * 0.04;
      const fanHum = Math.sin(2.0 * Math.PI * (sound.freq * 0.15) * t) * 0.06;
      const exhaustRoar = (Math.random() * 2.0 - 1.0) * 0.08;
      sample = (whine + fanHum + exhaustRoar) * 32767;
    } else if (sound.isAfterburner) {
      // Low-frequency combustion exhaust rumble with randomized thrust popping crackles
      const roar = (Math.random() * 2.0 - 1.0) * 0.28;
      const crackle = Math.random() > 0.985 ? (Math.random() * 2.0 - 1.0) * 0.35 : 0.0;
      sample = (roar + crackle) * 32767;
    } else if (sound.isBeep) {
      // Intermittent Master Caution square wave alarm beeping (e.g. 800Hz beep-beep-beep)
      const isBeepOn = Math.floor(t * 5.0) % 2 === 0; // 5Hz pulsing
      sample = isBeepOn ? Math.sin(2.0 * Math.PI * sound.freq * t) * 0.15 * 32767 : 0;
    } else if (sound.isNoise) {
      if (sound.isSplash) {
        // Decaying noise blast simulating water surface dispersion on splash down
        const decay = Math.exp(-4.5 * t);
        sample = (Math.random() * 2.0 - 1.0) * 0.30 * decay * 32767;
      } else if (sound.isCrash) {
        // Metallic structural collision: crunch noise layered with a low resonant ring
        const decay = Math.exp(-3.0 * t);
        const ring = Math.sin(2.0 * Math.PI * 180 * t) * 0.15;
        const crunch = (Math.random() * 2.0 - 1.0) * 0.40;
        sample = (crunch + ring) * decay * 32767;
      } else if (sound.isScrape) {
        // Friction scraping: low-pass rasp combined with high-frequency structural vibration
        const scrapeNoise = (Math.random() * 2.0 - 1.0) * 0.18;
        const metallicGrate = Math.sin(2.0 * Math.PI * 1100 * t) * 0.05;
        sample = (scrapeNoise + metallicGrate) * 32767;
      } else {
        // Standard Wind
        const amplitudeMod = 0.8 + 0.2 * Math.sin(2.0 * Math.PI * 0.5 * t);
        sample = (Math.random() * 2.0 - 1.0) * 0.15 * amplitudeMod * 32767;
      }
    } else {
      if (sound.isGear) {
        // Hydraulic actuator motor whine: sweeping sine frequency from 220Hz up to 440Hz
        const sweepFreq = 220 + (440 - 220) * (t / durationSec);
        sample = Math.sin(2.0 * Math.PI * sweepFreq * t) * 0.15 * 32767;
      } else if (sound.isFlaps) {
        // Flaps electric gear motor hum: constant 180Hz square wave
        sample = Math.sign(Math.sin(2.0 * Math.PI * 180 * t)) * 0.10 * 32767;
      } else if (sound.isSqueal) {
        // Landing tire rubber squeal: high pitched 1500Hz sine decaying fast on touchdown
        const decay = Math.exp(-8.0 * t);
        sample = Math.sin(2.0 * Math.PI * 1500 * t) * 0.35 * decay * 32767;
      }
    }

    buffer.writeInt16LE(Math.round(sample), offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
}

module.exports = { buildAudioAssets };