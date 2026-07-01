export class Noise {
  constructor(seed = 12345) {
    this.seed = seed;
    this.permutation = new Uint8Array(256);
    this.init();
  }

  init() {
    // Fill permutation table deterministically
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    // Seeded LCG (Linear Congruential Generator) shuffle
    let s = this.seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      const temp = this.permutation[i];
      this.permutation[i] = this.permutation[j];
      this.permutation[j] = temp;
    }
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    // Seeded hash lookups
    const aa = this.permutation[(this.permutation[X] + Y) & 255];
    const ab = this.permutation[(this.permutation[X] + ((Y + 1) & 255)) & 255];
    const ba = this.permutation[(this.permutation[(X + 1) & 255] + Y) & 255];
    const bb = this.permutation[(this.permutation[(X + 1) & 255] + ((Y + 1) & 255)) & 255];

    // Bilinear value noise interpolation
    const val1 = this.lerp(u, aa, ba);
    const val2 = this.lerp(u, ab, bb);
    return this.lerp(v, val1, val2) / 255.0; // Normalize scale [0, 1]
  }

  // Fractional Brownian Motion (fBm) builds multi-octave rolling topography
  fbm2D(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let total = 0.0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0.0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}