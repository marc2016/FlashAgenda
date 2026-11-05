// Small synthesizer for a cheerful, royalty-free background track (fallback without Lyria).
// 115 BPM, C–G–Am–F, drums, bass, plucked arpeggio and pad. Returns a 16-bit stereo WAV buffer.
const RATE = 44100;
const BPM = 115;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// chords as MIDI notes (root in bass octave, chord tones in middle octave)
const AKKORDE = [
  { bass: 36, toene: [60, 64, 67, 72] }, // C
  { bass: 43, toene: [59, 62, 67, 71] }, // G
  { bass: 45, toene: [60, 64, 69, 72] }, // Am
  { bass: 41, toene: [60, 65, 69, 72] }, // F
];

export function musikSynthetisieren(sekunden = 80) {
  const n = Math.floor(sekunden * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const add = (i, v, pan = 0) => { if (i >= 0 && i < n) { L[i] += v * (1 - pan) * 0.5 * 2; R[i] += v * (1 + pan) * 0.5 * 2; } };
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;

  const takte = Math.ceil(sekunden / BAR);
  for (let t = 0; t < takte; t++) {
    const akk = AKKORDE[t % 4];
    const t0 = t * BAR;
    const drums = t >= 2 && t < takte - 1;

    // pad: soft detuned saw-ish (sum of a few harmonics), slow attack
    for (const ton of akk.toene.slice(0, 3)) {
      const f = midi(ton);
      const len = Math.floor(BAR * RATE);
      for (let k = 0; k < len; k++) {
        const z = k / RATE;
        const env = Math.min(1, z / 0.4) * Math.min(1, (BAR - z) / 0.3);
        const v = (Math.sin(2 * Math.PI * f * z) + 0.3 * Math.sin(2 * Math.PI * f * 2.003 * z) + 0.15 * Math.sin(2 * Math.PI * f * 3.01 * z)) * 0.028 * env;
        add(Math.floor((t0 + z) * RATE), v, ton % 2 ? -0.3 : 0.3);
      }
    }

    // plucked arpeggio, 16th notes
    if (t >= 1) {
      const muster = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 3, 2, 3, 1, 2];
      muster.forEach((m, s) => {
        if (t < 2 && s % 2) return;
        const f = midi(akk.toene[m] + 12);
        const start = t0 + (s * BEAT) / 4;
        const len = Math.floor(0.28 * RATE);
        let lp = 0;
        for (let k = 0; k < len; k++) {
          const z = k / RATE;
          const roh = (2 * ((f * z) % 1) - 1) * 0.6 + Math.sin(2 * Math.PI * f * z) * 0.4;
          lp += (roh - lp) * (0.35 * Math.exp(-z * 10) + 0.05);
          add(Math.floor((start + z) * RATE), lp * Math.exp(-z * 14) * 0.06, s % 2 ? 0.45 : -0.45);
        }
      });
    }

    // bass: 8th notes on the root, octave on the offbeat
    if (t >= 2 || t === takte - 1) {
      for (let s = 0; s < 8; s++) {
        const f = midi(akk.bass + (s % 2 ? 12 : 0)) ;
        const start = t0 + (s * BEAT) / 2;
        const len = Math.floor(BEAT * 0.45 * RATE);
        for (let k = 0; k < len; k++) {
          const z = k / RATE;
          const env = Math.min(1, z / 0.005) * Math.exp(-z * 5);
          const v = (Math.sin(2 * Math.PI * f * z) + 0.25 * Math.sin(4 * Math.PI * f * z)) * env * 0.16;
          add(Math.floor((start + z) * RATE), v);
        }
      }
    }

    if (!drums) continue;
    for (let b = 0; b < 4; b++) {
      const sb = t0 + b * BEAT;
      // kick
      for (let k = 0; k < 0.25 * RATE; k++) {
        const z = k / RATE;
        const f = 50 + 110 * Math.exp(-z * 30);
        add(Math.floor((sb + z) * RATE), Math.sin(2 * Math.PI * f * z) * Math.exp(-z * 14) * 0.42);
      }
      // clap on 2 and 4
      if (b % 2 === 1) {
        let hp = 0, vor = 0;
        for (let k = 0; k < 0.18 * RATE; k++) {
          const z = k / RATE;
          const r = rnd();
          hp = 0.85 * (hp + r - vor); vor = r;
          const env = Math.exp(-z * 22) * (1 + 0.6 * Math.exp(-((z - 0.012) ** 2) / 0.00002));
          add(Math.floor((sb + z) * RATE), hp * env * 0.11, 0.1);
        }
      }
      // hi-hats on 8ths
      for (let h = 0; h < 2; h++) {
        let hp = 0, vor = 0;
        const start = sb + (h * BEAT) / 2;
        for (let k = 0; k < 0.05 * RATE; k++) {
          const z = k / RATE;
          const r = rnd();
          hp = 0.6 * (hp + r - vor); vor = r;
          add(Math.floor((start + z) * RATE), hp * Math.exp(-z * 70) * (h ? 0.06 : 0.035), -0.25);
        }
      }
    }
  }

  // fade out over the last 3 seconds, normalize to -1 dBFS
  const fade = 3 * RATE;
  let spitze = 0;
  for (let i = 0; i < n; i++) {
    const g = i > n - fade ? (n - i) / fade : 1;
    L[i] *= g; R[i] *= g;
    spitze = Math.max(spitze, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.89 / spitze;
  const daten = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    daten.writeInt16LE(Math.round(Math.tanh(L[i] * norm) * 32767), i * 4);
    daten.writeInt16LE(Math.round(Math.tanh(R[i] * norm) * 32767), i * 4 + 2);
  }
  const kopf = Buffer.alloc(44);
  kopf.write("RIFF", 0);
  kopf.writeUInt32LE(36 + daten.length, 4);
  kopf.write("WAVEfmt ", 8);
  kopf.writeUInt32LE(16, 16);
  kopf.writeUInt16LE(1, 20);
  kopf.writeUInt16LE(2, 22);
  kopf.writeUInt32LE(RATE, 24);
  kopf.writeUInt32LE(RATE * 4, 28);
  kopf.writeUInt16LE(4, 32);
  kopf.writeUInt16LE(16, 34);
  kopf.write("data", 36);
  kopf.writeUInt32LE(daten.length, 40);
  return Buffer.concat([kopf, daten]);
}
