const fs = require('fs');
const path = require('path');

function buildAudioAssets() {
  const assetsDir = path.join(__dirname, '../src/assets');
  const soundDir = path.join(assetsDir, 'sound');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }
  if (!fs.existsSync(soundDir)) {
    fs.mkdirSync(soundDir);
  }

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
    { name: 'afterburner.wav', freq: 0, dur: 1.5, isNoise: true, isAfterburner: true },
    { name: 'chime.wav', freq: 880, dur: 0.7, isNoise: false, isChime: true },
    { name: 'click.wav', freq: 1400, dur: 0.06, isNoise: false, isClick: true },
    { name: 'thump.wav', freq: 55, dur: 0.4, isNoise: false, isThump: true },
    { name: 'buffet.wav', freq: 0, dur: 1.6, isNoise: true, isBuffet: true },
    { name: 'gpws.wav', freq: 0, dur: 1.1, isNoise: false, isGpws: true }
  ];

  requiredSounds.forEach((sound) => {
    let targetPath = soundDir;
    if (sound.isPiston || sound.name === 'fighter_engine.wav' || sound.isAfterburner) {
      const engineDir = path.join(soundDir, 'engine');
      if (!fs.existsSync(engineDir)) {
        fs.mkdirSync(engineDir);
      }
      targetPath = engineDir;
    }

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

function generateSoundFile(filePath, sound) {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSec = sound.dur;

  const numSamples = Math.round(sampleRate * durationSec);
  const dataSize = numSamples * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM Format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    const t = i / sampleRate;

    if (sound.isPiston) {
      const pistonFreq = sound.freq + Math.sin(2.0 * Math.PI * 10 * t) * 3.0;
      const cycle = t * pistonFreq;
      const triangle = 2.0 * Math.abs(2.0 * (cycle - Math.floor(cycle + 0.5))) - 1.0;
      const subBass = Math.sin(2.0 * Math.PI * (pistonFreq * 0.5) * t) * 0.35;
      const cylinderImpulse = 0.45 + 0.55 * Math.abs(Math.sin(2.0 * Math.PI * 25 * t));
      sample = (triangle * 0.55 + subBass) * cylinderImpulse * 0.12 * 32767;
    } else if (sound.name === 'fighter_engine.wav') {
      const whine = Math.sin(2.0 * Math.PI * sound.freq * t) * 0.04;
      const fanHum = Math.sin(2.0 * Math.PI * (sound.freq * 0.15) * t) * 0.06;
      const exhaustRoar = (Math.random() * 2.0 - 1.0) * 0.08;
      sample = (whine + fanHum + exhaustRoar) * 32767;
    } else if (sound.isAfterburner) {
      const roar = (Math.random() * 2.0 - 1.0) * 0.28;
      const crackle = Math.random() > 0.985 ? (Math.random() * 2.0 - 1.0) * 0.35 : 0.0;
      sample = (roar + crackle) * 32767;
    } else if (sound.isChime) {
      // Ring checkpoint: two-tone bell (fundamental + fifth) with a fast decay.
      const decay = Math.exp(-5.0 * t);
      const tone1 = Math.sin(2.0 * Math.PI * sound.freq * t);
      const tone2 = Math.sin(2.0 * Math.PI * sound.freq * 1.5 * t) * 0.6;
      const shimmer = Math.sin(2.0 * Math.PI * sound.freq * 2.0 * t) * 0.25;
      sample = (tone1 + tone2 + shimmer) * 0.18 * decay * 32767;
    } else if (sound.isClick) {
      // UI click: a very short damped tick.
      const decay = Math.exp(-90.0 * t);
      sample = Math.sin(2.0 * Math.PI * sound.freq * t) * 0.22 * decay * 32767;
    } else if (sound.isThump) {
      // Touchdown thump: pitch-dropping low sine plus a burst of crunch.
      const decay = Math.exp(-9.0 * t);
      const fallingFreq = sound.freq * (1.0 - 0.5 * Math.min(t * 4.0, 1.0));
      const body = Math.sin(2.0 * Math.PI * fallingFreq * t);
      const crunch = (Math.random() * 2.0 - 1.0) * 0.30 * Math.exp(-25.0 * t);
      sample = (body * 0.5 + crunch) * decay * 32767;
    } else if (sound.isGpws) {
      // GPWS "whoop whoop": two rising 400->800 Hz sweeps.
      const cycle = t % 0.55;
      if (cycle < 0.45) {
        const sweep = 400 + (800 - 400) * (cycle / 0.45);
        sample = Math.sin(2.0 * Math.PI * sweep * cycle) * 0.20 * 32767;
      }
    } else if (sound.isBeep) {
      const isBeepOn = Math.floor(t * 5.0) % 2 === 0;
      sample = isBeepOn ? Math.sin(2.0 * Math.PI * sound.freq * t) * 0.15 * 32767 : 0;
    } else if (sound.isNoise) {
      if (sound.isBuffet) {
        // Pre-stall buffet loop: low rumble with an irregular 8-14 Hz beat, the
        // separated flow slamming the tail. Loops cleanly (envelope is periodic).
        const beat = 0.55 + 0.45 * Math.sin(2.0 * Math.PI * (10.0 + 3.0 * Math.sin(2.0 * Math.PI * t / sound.dur)) * t);
        const rumble = (Math.random() * 2.0 - 1.0) * 0.22;
        const lowBody = Math.sin(2.0 * Math.PI * 38 * t) * 0.10;
        sample = (rumble + lowBody) * beat * 32767;
      } else if (sound.isSplash) {
        const decay = Math.exp(-4.5 * t);
        sample = (Math.random() * 2.0 - 1.0) * 0.30 * decay * 32767;
      } else if (sound.isCrash) {
        const decay = Math.exp(-3.0 * t);
        const ring = Math.sin(2.0 * Math.PI * 180 * t) * 0.15;
        const crunch = (Math.random() * 2.0 - 1.0) * 0.40;
        sample = (crunch + ring) * decay * 32767;
      } else if (sound.isScrape) {
        const scrapeNoise = (Math.random() * 2.0 - 1.0) * 0.18;
        const metallicGrate = Math.sin(2.0 * Math.PI * 1100 * t) * 0.05;
        sample = (scrapeNoise + metallicGrate) * 32767;
      } else {
        const amplitudeMod = 0.8 + 0.2 * Math.sin(2.0 * Math.PI * 0.5 * t);
        sample = (Math.random() * 2.0 - 1.0) * 0.15 * amplitudeMod * 32767;
      }
    } else {
      if (sound.isGear) {
        const sweepFreq = 220 + (440 - 220) * (t / durationSec);
        sample = Math.sin(2.0 * Math.PI * sweepFreq * t) * 0.15 * 32767;
      } else if (sound.isFlaps) {
        sample = Math.sign(Math.sin(2.0 * Math.PI * 180 * t)) * 0.10 * 32767;
      } else if (sound.isSqueal) {
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