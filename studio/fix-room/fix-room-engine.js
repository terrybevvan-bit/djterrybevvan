'use strict';
/* ===== Fix Room DSP core. Runs in a Worker (or on the main thread as a fallback). ===== */
const TAU = Math.PI * 2, NFFT = 2048, HOP = 512, NB = NFFT / 2 + 1;
let T = null, fft = null, WIN = null, WSUM2 = 0;

function makeFFT(N) {
  const rev = new Uint32Array(N), cs = new Float64Array(N / 2), sn = new Float64Array(N / 2), bits = Math.log2(N);
  for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  for (let i = 0; i < N / 2; i++) { cs[i] = Math.cos(TAU * i / N); sn[i] = Math.sin(TAU * i / N); }
  return function (re, im, inv) {
    for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = cs[k], wi = inv ? sn[k] : -sn[k], a = i + j, b = a + half;
          const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inv) { const s = 1 / N; for (let i = 0; i < N; i++) { re[i] *= s; im[i] *= s; } }
  };
}
function initFFT() {
  if (fft) return;
  fft = makeFFT(NFFT); WIN = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) { WIN[i] = 0.5 - 0.5 * Math.cos(TAU * i / NFFT); WSUM2 += WIN[i] * WIN[i]; }
}
/* One complex FFT carries mid (real) and side (imag). */
function frameFFT(L, R, pos, re, im) {
  const n = L.length;
  for (let i = 0; i < NFFT; i++) {
    const x = pos + i;
    if (x >= 0 && x < n) { const w = WIN[i], l = L[x], r = R[x]; re[i] = (l + r) * 0.5 * w; im[i] = (l - r) * 0.5 * w; }
    else { re[i] = 0; im[i] = 0; }
  }
  fft(re, im, false);
}
const db10 = x => 10 * Math.log10(x + 1e-30);
const ramp = (f, a, b) => f <= a ? 0 : f >= b ? 1 : Math.log(f / a) / Math.log(b / a);

/* ---------- loudness (ITU-R BS.1770) ---------- */
function kCoefs(sr) {
  let K = Math.tan(Math.PI * 1681.974450955533 / sr), Q = 0.7071752369554196;
  const Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const s = { b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  K = Math.tan(Math.PI * 38.13547087602444 / sr); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K;
  const h = { b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [s, h];
}
function lufs(L, R, sr, G, gc, ct, cc) {
  const n = L.length, [s, h] = kCoefs(sr), sub = Math.max(1, Math.round(sr * 0.1)), nb = Math.floor(n / sub);
  if (nb < 4) return -70;
  const e = new Float64Array(nb);
  for (let c = 0; c < 2; c++) {
    const x = c ? R : L; let z1 = 0, z2 = 0, y1 = 0, y2 = 0, i = 0;
    for (let b = 0; b < nb; b++) {
      let acc = 0; const end = i + sub;
      for (; i < end; i++) {
        let v = gc ? x[i] * G * gc[i] : x[i] * G;
        if (ct) { const av = v < 0 ? -v : v; if (av > ct) { const y_ = cc - (cc - ct) * Math.exp(-(av - ct) / (cc - ct)); v = v < 0 ? -y_ : y_; } }
        const u = s.b0 * v + z1; z1 = s.b1 * v - s.a1 * u + z2; z2 = s.b2 * v - s.a2 * u;
        const y = h.b0 * u + y1; y1 = h.b1 * u - h.a1 * y + y2; y2 = h.b2 * u - h.a2 * y;
        acc += y * y;
      }
      e[b] += acc;
    }
  }
  const z = []; for (let b = 0; b + 3 < nb; b++) z.push((e[b] + e[b + 1] + e[b + 2] + e[b + 3]) / (4 * sub));
  const abs = Math.pow(10, (-70 + 0.691) / 10); let sum = 0, cnt = 0;
  for (const v of z) if (v > abs) { sum += v; cnt++; }
  if (!cnt) return -70;
  const rel = (sum / cnt) * 0.1; let s2 = 0, c2 = 0;
  for (const v of z) if (v > abs && v > rel) { s2 += v; c2++; }
  return c2 ? -0.691 + db10(s2 / c2) : -70;
}

/* ---------- true peak (4x oversampled) ---------- */
let TPK = null;
function truePeak(L, R) {
  if (!TPK) {
    TPK = [];
    for (let p = 1; p < 4; p++) {
      const h = new Float64Array(16); let sum = 0;
      for (let j = 0; j < 16; j++) { const t = (j - 7) - p / 4, w = 0.5 + 0.5 * Math.cos(Math.PI * t / 8.5); h[j] = (Math.sin(Math.PI * t) / (Math.PI * t)) * w; sum += h[j]; }
      for (let j = 0; j < 16; j++) h[j] /= sum; TPK.push(h);
    }
  }
  let pk = 0; const n = L.length;
  for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > pk) pk = a; if (b > pk) pk = b; }
  const thr = pk * 0.75; let tp = pk;
  for (let c = 0; c < 2; c++) {
    const x = c ? R : L;
    for (let i = 7; i < n - 9; i++) {
      if (Math.abs(x[i]) < thr && Math.abs(x[i + 1]) < thr) continue;
      for (let p = 0; p < 3; p++) { const h = TPK[p]; let v = 0; for (let j = 0; j < 16; j++) v += h[j] * x[i - 7 + j]; v = Math.abs(v); if (v > tp) tp = v; }
    }
  }
  return tp;
}

/* ---------- average spectrum for the before/after plot ---------- */
const SPEC_PTS = 150, SPEC_LO = 30;
function avgSpec(L, R, sr) {
  initFFT();
  const n = L.length, re = new Float64Array(NFFT), im = new Float64Array(NFFT), acc = new Float64Array(NB);
  const frames = Math.min(160, Math.max(1, Math.floor((n - NFFT) / HOP))), step = Math.max(HOP, Math.floor((n - NFFT) / frames));
  let cnt = 0;
  for (let pos = 0; pos + NFFT <= n; pos += step) {
    frameFFT(L, R, pos, re, im);
    for (let k = 0; k < NB; k++) { const kk = (NFFT - k) % NFFT; acc[k] += (re[k] * re[k] + im[k] * im[k] + re[kk] * re[kk] + im[kk] * im[kk]) * 0.5; }
    cnt++;
  }
  const hi = Math.min(22000, sr / 2), out = new Float32Array(SPEC_PTS), bin = sr / NFFT, norm = 1 / (Math.max(1, cnt) * WSUM2 * NFFT / 2);
  for (let i = 0; i < SPEC_PTS; i++) {
    const f0 = SPEC_LO * Math.pow(hi / SPEC_LO, (i - 0.5) / (SPEC_PTS - 1)), f1 = SPEC_LO * Math.pow(hi / SPEC_LO, (i + 0.5) / (SPEC_PTS - 1));
    let a = Math.max(1, Math.floor(f0 / bin)), b = Math.min(NB - 1, Math.max(a, Math.ceil(f1 / bin)));
    let s = 0; for (let k = a; k <= b; k++) s += acc[k];
    out[i] = db10(s / (b - a + 1) * norm * (f0 + f1) * 0.5 / 1000); /* tilt so pink-ish music reads flat */
  }
  return out;
}


/* ---------- measurements used by the report and the before/after proof ---------- */
const BANDS = [[30, 60], [60, 200], [200, 500], [500, 2000], [2000, 6000], [6000, 12000], [12000, 20000]];
function metrics(L, R, sr, maxB) {
  initFFT();
  const n = L.length, bin = sr / NFFT, BL = 8, F = Math.max(1, Math.floor((n - NFFT) / HOP)), nB = Math.max(1, Math.min(maxB, Math.floor(F / BL))), gap = F / nB;
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT), P = new Float64Array(NB), d = new Float64Array(NB), pre = new Float64Array(NB + 1), mean = new Float64Array(NB);
  const kl = Math.round(1000 / bin), k8 = Math.round(8000 / bin), top = [];
  const idx = (f0, f1) => {
    const a0 = Math.round(f0 / bin), a1 = Math.min(NB - 2, Math.round(f1 / bin)); top.length = 0;
    for (let k = a0; k <= a1; k++) { const w = Math.max(3, Math.round(k * 0.08)), a = Math.max(kl, k - w), c = Math.min(NB - 1, k + w); top.push(d[k] - (pre[c + 1] - pre[a]) / (c - a + 1)); }
    top.sort((x, y) => y - x); const m = Math.max(1, Math.round(top.length * 0.02)); let s = 0; for (let i = 0; i < m; i++) s += top[i]; return s / m;
  };
  let shim = 0, harsh = 0, cnt = 0, midHF = 0, sideHF = 0;
  for (let b = 0; b < nB; b++) {
    P.fill(0); let en = 0;
    for (let j = 0; j < BL; j++) {
      const pos = (Math.floor(b * gap) + j) * HOP; if (pos + NFFT > n) break;
      frameFFT(L, R, pos, re, im);
      for (let k = 0; k < NB; k++) {
        const kk = (NFFT - k) % NFFT; P[k] += (re[k] * re[k] + im[k] * im[k] + re[kk] * re[kk] + im[kk] * im[kk]) * 0.5 / BL;
        if (k >= k8 && k < NB - 1) { const mr = re[k] + re[kk], mi = im[k] - im[kk], s_ = re[k] - re[kk], si = im[k] + im[kk]; midHF += mr * mr + mi * mi; sideHF += s_ * s_ + si * si; }
      }
    }
    for (let k = 1; k < NB; k++) en += P[k];
    if (en / (WSUM2 * NFFT / 2) < 1e-8) continue;
    for (let k = 0; k < NB; k++) mean[k] += P[k];
    let mx = -1e9; for (let k = kl; k < NB; k++) { d[k] = db10(P[k]); if (d[k] > mx) mx = d[k]; }
    pre[kl] = 0; for (let k = kl; k < NB; k++) { if (d[k] < mx - 55) d[k] = mx - 55; pre[k + 1] = pre[k] + d[k]; }
    shim += idx(7000, 15000); harsh += idx(2000, 6000); cnt++;
  }
  const bands = BANDS.map(([f0, f1]) => { f1 = Math.min(f1, sr / 2 - bin); const a = Math.max(1, Math.round(f0 / bin)), c = Math.max(a, Math.round(f1 / bin)); let s = 0; for (let k = a; k <= c; k++) s += mean[k]; return db10(s / Math.max(0.2, Math.log2(f1 / f0))); });
  const ref = bands[3];
  return { shim: cnt ? shim / cnt : 0, harsh: cnt ? harsh / cnt : 0, sideHF: db10(sideHF / (midHF + 1e-30)), bands: bands.map(v => v - ref) };
}
function bandDb(L, R, sr, f0, f1) {
  initFFT();
  const n = L.length, bin = sr / NFFT, a = Math.round(f0 / bin), c = Math.min(NB - 2, Math.round(f1 / bin)), re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  let s = 0, cnt = 0;
  for (let pos = Math.floor(n * 0.2); pos + NFFT <= n * 0.8; pos += HOP * 2) { frameFFT(L, R, pos, re, im); for (let k = a; k <= c; k++) { const kk = NFFT - k; s += re[k] * re[k] + im[k] * im[k] + re[kk] * re[kk] + im[kk] * im[kk]; } cnt++; }
  return db10(s / Math.max(1, cnt) / WSUM2 / NFFT);
}
/* tempo: comb of the onset autocorrelation */
function tempo(L, R, sr, start) {
  const hop = 512, n = L.length, st = Math.max(0, Math.min(start, n - 75 * sr)), nH = Math.min(Math.floor((n - st) / hop), Math.floor(75 * sr / hop));
  if (nH < 800) return 0;
  const fl = new Float32Array(nH); let prev = 0, mean = 0;
  for (let i = 0; i < nH; i++) { let e = 0; const o = st + i * hop; for (let j = 0; j < hop; j++) { const v = L[o + j] + R[o + j]; e += v * v; } e = Math.log(1e-9 + e); fl[i] = i && e > prev ? e - prev : 0; prev = e; mean += fl[i]; }
  mean /= nH; for (let i = 0; i < nH; i++) fl[i] -= mean;
  const fps = sr / hop, maxLag = Math.min(nH - 200, Math.ceil(8 * 60 / 70 * fps) + 2), ac = new Float64Array(maxLag + 1);
  for (let lg = 1; lg <= maxLag; lg++) { let s = 0; const m = nH - lg; for (let i = 0; i < m; i++) s += fl[i] * fl[i + lg]; ac[lg] = s / m; }
  const at = x => { if (x >= maxLag) return 0; const i = Math.floor(x), f = x - i; return ac[i] * (1 - f) + ac[i + 1] * f; };
  const score = bpm => { const lg = 60 / bpm * fps; return at(lg) + at(2 * lg) + at(4 * lg) + at(8 * lg); };
  let best = 0, bs = -1e9;
  for (let b = 70; b <= 180; b += 0.25) { const s = score(b); if (s > bs) { bs = s; best = b; } }
  let fine = best; for (let b = best - 1; b <= best + 1; b += 0.02) { const s = score(b); if (s > bs) { bs = s; fine = b; } }
  if (fine < 95) fine *= 2;
  return Math.abs(fine - Math.round(fine)) < 0.35 ? Math.round(fine) : Math.round(fine * 10) / 10;
}
/* time x frequency map of the audition window: raw level and how much the repair cut */
const HEAT_C = 240, HEAT_R = 56;
function heat(aL, aR, bL, bR, sr) {
  initFFT();
  const n = aL.length, bin = sr / NFFT, hi = Math.min(21000, sr / 2 - bin), lo = 1000, re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const lvl = new Uint8Array(HEAT_C * HEAT_R), cut = new Uint8Array(HEAT_C * HEAT_R), ra = new Float64Array(HEAT_R), rb = new Float64Array(HEAT_R), raw = new Float32Array(HEAT_C * HEAT_R);
  const edge = []; for (let r = 0; r <= HEAT_R; r++) edge.push(Math.max(1, Math.round(lo * Math.pow(hi / lo, r / HEAT_R) / bin)));
  const acc = (L, R, pos, out) => { frameFFT(L, R, pos, re, im); for (let r = 0; r < HEAT_R; r++) { let s = 0; const e1 = Math.max(edge[r] + 1, edge[r + 1]); for (let k = edge[r]; k < e1 && k < NB - 1; k++) { const kk = NFFT - k; s += re[k] * re[k] + im[k] * im[k] + re[kk] * re[kk] + im[kk] * im[kk]; } out[r] += s / (e1 - edge[r]); } };
  let mx = -1e9;
  for (let c = 0; c < HEAT_C; c++) {
    ra.fill(0); rb.fill(0);
    for (let j = 0; j < 3; j++) { const pos = Math.min(Math.max(0, n - NFFT), Math.floor((c + j / 3) / HEAT_C * (n - NFFT))); acc(aL, aR, pos, ra); acc(bL, bR, pos, rb); }
    for (let r = 0; r < HEAT_R; r++) { const row = HEAT_R - 1 - r, d = db10(ra[r]); raw[row * HEAT_C + c] = d; if (d > mx) mx = d; const cd = d - db10(rb[r]); cut[row * HEAT_C + c] = Math.max(0, Math.min(255, Math.round(cd / 15 * 255))); }
  }
  for (let i = 0; i < raw.length; i++) lvl[i] = Math.max(0, Math.min(255, Math.round((raw[i] - (mx - 70)) / 70 * 255)));
  return { lvl, cut, cols: HEAT_C, rows: HEAT_R, lo, hi };
}

/* ---------- scan: noise profile + diagnosis ---------- */
function scan(post, id) {
  initFFT();
  const { L, R, sr, n } = T, bin = sr / NFFT, BL = 8;
  const F = Math.max(1, Math.floor(n / HOP)), nBurst = Math.max(1, Math.min(1000, Math.floor(F / BL))), gap = F / nBurst;
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT), P = new Float64Array(NB), d = new Float64Array(NB), pre = new Float64Array(NB + 1);
  const mat = new Float32Array(nBurst * NB), mean = new Float64Array(NB);
  const kS0 = Math.round(7000 / bin), kS1 = Math.min(NB - 2, Math.round(15000 / bin)), k8 = Math.round(8000 / bin);
  let rows = 0, shimSum = 0, shimCnt = 0, midHF = 0, sideHF = 0; const top = [];
  const kQ0 = Math.round(6000 / bin), kQ1 = Math.min(NB - 2, Math.round(14000 / bin)); let quietE = Infinity, quietPos = 0;
  for (let b = 0; b < nBurst; b++) {
    const f0 = Math.floor(b * gap); P.fill(0); let en = 0;
    for (let j = 0; j < BL; j++) {
      const pos = (f0 + j) * HOP; if (pos + NFFT > n) break;
      frameFFT(L, R, pos, re, im);
      for (let k = 0; k < NB; k++) {
        const kk = (NFFT - k) % NFFT, a = re[k] * re[k] + im[k] * im[k], c = re[kk] * re[kk] + im[kk] * im[kk];
        P[k] += (a + c) * 0.5 / BL;
        if (k >= k8 && k < NB - 1) { const mr = re[k] + re[kk], mi = im[k] - im[kk], sr_ = re[k] - re[kk], si = im[k] + im[kk]; midHF += mr * mr + mi * mi; sideHF += sr_ * sr_ + si * si; }
      }
    }
    for (let k = 1; k < NB; k++) en += P[k];
    if (en / (WSUM2 * NFFT / 2) < 1e-8) continue;
    mat.set(P, rows * NB); rows++;
    { let hf = 0; for (let k = kQ0; k <= kQ1; k++) hf += P[k]; if (en / (WSUM2 * NFFT / 2) > 1e-7 && hf < quietE) { quietE = hf; quietPos = f0 * HOP; } }
    for (let k = 0; k < NB; k++) mean[k] += P[k];
    /* shimmer index: how far the strongest narrow peaks in 7-15 kHz stand above their surroundings */
    let mx = -1e9; for (let k = kS0 - 40; k <= kS1 + 40 && k < NB; k++) { d[k] = db10(P[k]); if (d[k] > mx) mx = d[k]; }
    pre[kS0 - 40] = 0; for (let k = kS0 - 40; k <= kS1 + 40 && k < NB; k++) { if (d[k] < mx - 55) d[k] = mx - 55; pre[k + 1] = pre[k] + d[k]; }
    top.length = 0;
    for (let k = kS0; k <= kS1; k++) { const w = Math.max(3, Math.round(k * 0.08)), a = Math.max(kS0 - 40, k - w), c = Math.min(Math.min(NB - 1, kS1 + 40), k + w); top.push(d[k] - (pre[c + 1] - pre[a]) / (c - a + 1)); }
    top.sort((x, y) => y - x); const m = Math.max(1, Math.round(top.length * 0.02)); let s = 0; for (let i = 0; i < m; i++) s += top[i];
    shimSum += s / m; shimCnt++;
    if (b % 50 === 0) post({ type: 'progress', id, pct: 5 + 75 * b / nBurst, label: 'Scanning for hiss and shimmer' });
  }
  const prof = new Float64Array(NB), col = new Float32Array(Math.max(1, rows));
  for (let k = 0; k < NB; k++) {
    if (!rows) { prof[k] = 0; continue; }
    for (let r = 0; r < rows; r++) col[r] = mat[r * NB + k];
    col.sort(); mean[k] /= rows; prof[k] = Math.min(col[Math.floor(rows * 0.1)] * 1.5, mean[k] * 0.25);
  }
  T.prof = prof;
  const k6 = Math.round(6000 / bin), k14 = Math.min(NB - 2, Math.round(14000 / bin)); let hs = 0, ms = 0;
  for (let k = k6; k <= k14; k++) { hs += prof[k]; ms += mean[k]; }
  const hissDb = db10(hs / WSUM2 * 2 / NFFT), bandDb = db10(ms / WSUM2 * 2 / NFFT);
  let mxm = -1e9; const k200 = Math.round(200 / bin); for (let k = k200; k < NB; k++) mxm = Math.max(mxm, db10(mean[k]));
  let reach = NB - 1; while (reach > k200 && db10(mean[reach]) < mxm - 62) reach--;
  post({ type: 'progress', id, pct: 85, label: 'Measuring loudness' });
  const loud = lufs(L, R, sr, 1, null), tp = truePeak(L, R);
  let clips = 0, run = 0; for (let i = 0; i < n; i++) { if (Math.abs(L[i]) >= 0.999 || Math.abs(R[i]) >= 0.999) { run++; if (run === 3) clips++; } else run = 0; }
  /* overview + busiest 30 s */
  const cols = 1200, blk = Math.max(1, Math.floor(n / cols)), mins = new Float32Array(cols), maxs = new Float32Array(cols), en = new Float64Array(cols);
  for (let c = 0; c < cols; c++) { let lo = 0, hi = 0, e = 0; const st = c * blk, ed = Math.min(n, st + blk); for (let i = st; i < ed; i++) { const v = (L[i] + R[i]) * 0.5; if (v < lo) lo = v; if (v > hi) hi = v; e += v * v; } mins[c] = lo; maxs[c] = hi; en[c] = e; }
  const wc = Math.max(1, Math.min(cols, Math.round(30 * sr / blk))); let best = 0, bestE = -1, acc = 0;
  for (let c = 0; c < cols; c++) { acc += en[c]; if (c >= wc) acc -= en[c - wc]; if (c >= wc - 1 && acc > bestE) { bestE = acc; best = c - wc + 1; } }
  T.quietPos = quietPos; const mm = metrics(L, R, sr, 300);
  return {
    lufs: loud, tp: 20 * Math.log10(tp + 1e-12), clips, hissDb, hissRel: hissDb - loud, hissGap: bandDb - hissDb,
    shimmer: shimCnt ? shimSum / shimCnt : 0, reach: reach * bin, sideHF: db10(sideHF / (midHF + 1e-30)),
    busiest: best * blk, mins, maxs, dur: n / sr, sr, quietPos, bpm: tempo(L, R, sr, best * blk), bands: mm.bands, harsh: mm.harsh
  };
}

/* ---------- repair: spectral de-hiss, resonance (shimmer / harsh) smoothing, side tame ---------- */
function repair(L, R, sr, p, prof, prog) {
  initFFT();
  const n = L.length, oL = new Float32Array(n), oR = new Float32Array(n), bin = sr / NFFT;
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT), P = new Float64Array(NB), Ps = new Float64Array(NB);
  const g = new Float64Array(NB), gs = new Float64Array(NB).fill(1), d = new Float64Array(NB), pre = new Float64Array(NB + 1);
  const wH = new Float64Array(NB), wS = new Float64Array(NB), wX = new Float64Array(NB), gTop = new Float64Array(NB), gSide = new Float64Array(NB), hw = new Int32Array(NB);
  const aH = p.hiss / 100, aS = p.shim / 100, aX = p.harsh / 100, aF = p.fizz / 100;
  const beta = 1.5 + 1.5 * aH, gmin = Math.pow(10, -20 * aH / 20), gmin2 = gmin * gmin;
  const thrS = 6 - 3 * aS, ratS = 0.4 + 0.55 * aS, thrX = 6.5 - 3 * aX, ratX = 0.3 + 0.5 * aX, maxRed = 15;
  const fizzG = Math.pow(10, -12 * aF / 20), k0 = Math.max(4, Math.round(1200 / bin));
  for (let k = 0; k < NB; k++) {
    const f = k * bin;
    wH[k] = aH > 0 ? ramp(f, 1500, 4500) : 0;
    wS[k] = aS > 0 ? ramp(f, 5500, 7500) : 0;
    wX[k] = aX > 0 ? ramp(f, 1600, 2400) * (1 - ramp(f, 5000, 6800)) : 0;
    gTop[k] = p.top >= 21900 ? 1 : 1 / Math.sqrt(1 + Math.pow(f / p.top, 16));
    gSide[k] = (1 - ramp(f, 6000, 9000) * (1 - fizzG)) * (p.mono > 0 ? ramp(f, p.mono * 0.8, p.mono * 1.25) : 1);
    hw[k] = Math.max(3, Math.round(k * 0.08));
  }
  const doRes = aS > 0 || aX > 0; let first = true, fi = 0;
  const total = Math.ceil((n + NFFT) / HOP);
  for (let pos = -NFFT + HOP; pos < n; pos += HOP, fi++) {
    frameFFT(L, R, pos, re, im);
    for (let k = 0; k < NB; k++) { const kk = (NFFT - k) % NFFT; P[k] = (re[k] * re[k] + im[k] * im[k] + re[kk] * re[kk] + im[kk] * im[kk]) * 0.5; }
    if (first) { Ps.set(P); first = false; } else for (let k = 0; k < NB; k++) Ps[k] += 0.2 * (P[k] - Ps[k]);
    for (let k = 0; k < NB; k++) {
      let gh = 1;
      if (wH[k] > 0) { const pe = P[k] > Ps[k] ? P[k] : Ps[k], v = 1 - beta * prof[k] / (pe + 1e-30); gh = v > gmin2 ? Math.sqrt(v) : gmin; gh = 1 - wH[k] * (1 - gh); }
      g[k] = gh;
    }
    if (doRes) {
      let mx = -1e9; for (let k = k0; k < NB; k++) { d[k] = db10(Ps[k]); if (d[k] > mx) mx = d[k]; }
      const fl = mx - 55; pre[k0] = 0; for (let k = k0; k < NB; k++) { if (d[k] < fl) d[k] = fl; pre[k + 1] = pre[k] + d[k]; }
      for (let k = k0; k < NB; k++) {
        if (wS[k] === 0 && wX[k] === 0) continue;
        const a = Math.max(k0, k - hw[k]), c = Math.min(NB - 1, k + hw[k]), ex = d[k] - (pre[c + 1] - pre[a]) / (c - a + 1);
        let red = 0;
        if (wS[k] > 0 && ex > thrS) red += Math.min(maxRed, (ex - thrS) * ratS) * wS[k];
        if (wX[k] > 0 && ex > thrX) red += Math.min(maxRed, (ex - thrX) * ratX) * wX[k];
        if (red > 0) g[k] *= Math.exp(-0.115129 * red);
      }
    }
    for (let k = 0; k < NB; k++) { const t = g[k], s = gs[k]; gs[k] = s + (t < s ? 0.5 : 0.8) * (t - s); }
    for (let k = 0; k < NB; k++) {
      const gf = k === 0 || k === NB - 1 ? gs[k] : 0.25 * gs[k - 1] + 0.5 * gs[k] + 0.25 * gs[k + 1];
      const Gm = gf * gTop[k], Gs = Gm * gSide[k], A = (Gm + Gs) * 0.5, B = (Gm - Gs) * 0.5;
      if (k === 0 || k === NFFT / 2) { re[k] *= (A + B); im[k] *= (A - B); }
      else { const kk = NFFT - k, ar = re[k], ai = im[k], cr = re[kk], ci = im[kk]; re[k] = ar * A + cr * B; im[k] = ai * A - ci * B; re[kk] = cr * A + ar * B; im[kk] = ci * A - ai * B; }
    }
    fft(re, im, true);
    for (let i = 0; i < NFFT; i++) { const x = pos + i; if (x < 0 || x >= n) continue; const w = WIN[i] / 1.5, m = re[i] * w, s = im[i] * w; oL[x] += m + s; oR[x] += m - s; }
    if (prog && fi % 400 === 0) prog(fi / total);
  }
  return [oL, oR];
}

/* ---------- mastering ---------- */
function bq(type, f, sr, Q, gain) {
  const A = Math.pow(10, gain / 40), w = TAU * f / sr, cs = Math.cos(w), sn = Math.sin(w); let b0, b1, b2, a0, a1, a2;
  if (type === 'hp') { const al = sn / (2 * Q); b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'pk') { const al = sn / (2 * Q); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
  else { const al = sn / 2 * Math.SQRT2, q = 2 * Math.sqrt(A) * al;
    if (type === 'ls') { b0 = A * ((A + 1) - (A - 1) * cs + q); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - q); a0 = (A + 1) + (A - 1) * cs + q; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - q; }
    else { b0 = A * ((A + 1) + (A - 1) * cs + q); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - q); a0 = (A + 1) - (A - 1) * cs + q; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - q; } }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function runBq(x, c) { let z1 = 0, z2 = 0; const [b0, b1, b2, a1, a2] = c; for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + z1; z1 = b1 * v - a1 * y + z2; z2 = b2 * v - a2 * y; x[i] = y; } }

function limiterGain(L, R, G, c, sr, req, out) {
  const n = L.length, La = Math.max(2, Math.round(sr * 0.004)), relC = 1 - Math.exp(-1 / (0.12 * sr));
  for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]), pk = (a > b ? a : b) * G; req[i] = pk > c ? c / pk : 1; }
  const cap = La + 2, dq = new Int32Array(cap); let head = 0, size = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (size > 0 && req[dq[(head + size - 1) % cap]] >= req[i]) size--;
    dq[(head + size) % cap] = i; size++;
    while (dq[head] > i + La - 1) { head = (head + 1) % cap; size--; }
    out[i] = req[dq[head]];
  }
  let r = 1; for (let i = 0; i < n; i++) { const m = out[i]; r = m < r ? m : r + (m - r) * relC; out[i] = r; }
  let sum = 0; for (let i = 0; i < n; i++) { sum += out[i]; if (i >= La) sum -= out[i - La]; req[i] = sum / (i >= La ? La : i + 1); }
  for (let i = 0; i < La && i < n; i++) req[i] = Math.min(req[i], out[i]);
  return req;
}

function master(L, R, sr, p, prog) {
  const n = L.length;
  const chain = [bq('hp', p.hp, sr, 0.707, 0)];
  if (p.low) chain.push(bq('ls', 90, sr, 0, p.low));
  if (p.mud) chain.push(bq('pk', 300, sr, 1, p.mud));
  if (p.pres) chain.push(bq('pk', 3500, sr, 0.9, p.pres));
  if (p.air) chain.push(bq('hs', 11000, sr, 0, p.air));
  for (const c of chain) { runBq(L, c); runBq(R, c); }
  prog(0.2);
  if (p.sat > 0) { const a = p.sat / 100, dr = 1 + 3 * a, mix = 0.6 * a; for (let i = 0; i < n; i++) { L[i] += mix * (Math.tanh(L[i] * dr) / dr - L[i]); R[i] += mix * (Math.tanh(R[i] * dr) / dr - R[i]); } }
  if (Math.abs(p.width - 100) > 1) { const w = p.width / 100; for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5 * w; L[i] = m + s; R[i] = m - s; } }
  if (p.glue > 1.01) {
    const thr = -18, knee = 6, sl = 1 - 1 / p.glue, at = 1 - Math.exp(-1 / (0.02 * sr)), rl = 1 - Math.exp(-1 / (0.25 * sr)); let gr = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(L[i]), b = Math.abs(R[i]), lv = 20 * Math.log10((a > b ? a : b) + 1e-9), o = lv - thr;
      const t = o <= -knee / 2 ? 0 : o >= knee / 2 ? o * sl : sl * (o + knee / 2) * (o + knee / 2) / (2 * knee);
      gr += (t > gr ? at : rl) * (t - gr);
      const gl = Math.exp(-0.115129 * gr); L[i] *= gl; R[i] *= gl;
    }
  }
  prog(0.45);
  const pre = lufs(L, R, sr, 1, null), c = Math.pow(10, (p.ceil - 0.3) / 20);
  const clipDb = Math.max(0, p.clip || 0), ct = clipDb > 0 ? c * Math.pow(10, -clipDb / 20) : 0, cl = c * Math.pow(10, clipDb / 20);
  let G = Math.pow(10, (p.lufs - pre) / 20), req = new Float32Array(n), out = new Float32Array(n), gc = null, minG = 1;
  for (let it = 0; it < 6; it++) {
    gc = limiterGain(L, R, G, cl, sr, req, out);
    minG = 1; for (let i = 0; i < n; i += 16) if (gc[i] < minG) minG = gc[i];
    const m = lufs(L, R, sr, G, gc, ct, c), dd = p.lufs - m; prog(0.5 + it * 0.07);
    if (Math.abs(dd) < 0.1 || it === 5 || (dd > 0 && minG < 0.32)) break;   /* stop pushing past ~10 dB of limiting */
    G *= Math.pow(10, Math.min(4, dd) / 20);
  }
  for (let i = 0; i < n; i++) {
    const k = G * gc[i]; let l = L[i] * k, r = R[i] * k;
    if (ct) {
      let av = l < 0 ? -l : l; if (av > ct) { const y = c - (c - ct) * Math.exp(-(av - ct) / (c - ct)); l = l < 0 ? -y : y; }
      av = r < 0 ? -r : r; if (av > ct) { const y = c - (c - ct) * Math.exp(-(av - ct) / (c - ct)); r = r < 0 ? -y : y; }
    }
    L[i] = l; R[i] = r;
  }
  req = out = gc = null;
  const tp = truePeak(L, R), ceil = Math.pow(10, p.ceil / 20);
  if (tp > ceil) { const k = ceil / tp; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } }
  prog(1);
  return -20 * Math.log10(minG);
}

/* ---------- message handling ---------- */
function handle(msg, post) {
  try {
    if (msg.type === 'load') {
      T = { L: msg.L, R: msg.R, sr: msg.sr, n: msg.L.length, prof: null };
      const s = scan(post, msg.id);
      post({ type: 'loaded', id: msg.id, scan: s });
    } else if (msg.type === 'render') {
      if (!T) throw new Error('No track loaded');
      const p = msg.p, sr = T.sr, pad = sr, st = Math.max(0, msg.start | 0), en = Math.min(T.n, msg.end | 0);
      const a = Math.max(0, st - pad), b = Math.min(T.n, en + pad), o = st - a, len = en - st;
      const prog = (f, label) => post({ type: 'progress', id: msg.id, pct: f * 100, label });
      let L = T.L.slice(a, b), R = T.R.slice(a, b);
      const anyRep = p.repairOn && (p.hiss > 0 || p.shim > 0 || p.harsh > 0 || p.fizz > 0 || p.top < 21900 || p.mono > 0);
      if (anyRep) [L, R] = repair(L, R, sr, p, T.prof, f => prog(f * (p.masterOn ? 0.65 : 0.95), 'Repairing: hiss, shimmer, harshness'));
      const res = { type: 'rendered', id: msg.id, sr }; const tr = [];
      let repL = null, repR = null;
      if (msg.stages) {
        res.rawL = T.L.slice(st, en); res.rawR = T.R.slice(st, en);
        res.remL = new Float32Array(len); res.remR = new Float32Array(len);
        for (let i = 0; i < len; i++) { res.remL[i] = res.rawL[i] - L[o + i]; res.remR[i] = res.rawR[i] - R[o + i]; }
        res.specRaw = avgSpec(res.rawL, res.rawR, sr); res.inLufs = lufs(res.rawL, res.rawR, sr, 1, null);
        let e = 0, r = 0; for (let i = 0; i < len; i++) { e += res.rawL[i] * res.rawL[i] + res.rawR[i] * res.rawR[i]; r += res.remL[i] * res.remL[i] + res.remR[i] * res.remR[i]; }
        res.removedDb = db10(r / (e + 1e-30));
        repL = L.slice(o, o + len); repR = R.slice(o, o + len);
        const h0 = Math.max(0, T.quietPos - 2 * sr), h1 = Math.min(T.n, T.quietPos + 3 * sr); let hl = T.L.slice(h0, h1), hr = T.R.slice(h0, h1);
        res.hissBefore = bandDb(hl, hr, sr, 6000, 14000); if (anyRep) [hl, hr] = repair(hl, hr, sr, p, T.prof, null); res.hissAfter = bandDb(hl, hr, sr, 6000, 14000); res.quietT = T.quietPos / sr;
        tr.push(res.rawL.buffer, res.rawR.buffer, res.remL.buffer, res.remR.buffer);
      }
      res.gr = 0;
      if (p.masterOn) res.gr = master(L, R, sr, p, f => prog(anyRep ? 0.65 + 0.33 * f : f * 0.98, 'Mastering: EQ, glue, loudness, limiter'));
      res.L = L.slice(o, o + len); res.R = R.slice(o, o + len); L = R = null;
      res.outLufs = lufs(res.L, res.R, sr, 1, null); res.outTp = 20 * Math.log10(truePeak(res.L, res.R) + 1e-12);
      if (msg.stages) { res.specFix = avgSpec(res.L, res.R, sr); res.mRaw = metrics(res.rawL, res.rawR, sr, 150); res.mFix = metrics(res.L, res.R, sr, 150); res.heat = heat(res.rawL, res.rawR, repL, repR, sr); }
      tr.push(res.L.buffer, res.R.buffer);
      post(res, tr);
    }
  } catch (err) { post({ type: 'error', id: msg.id, message: String(err && err.message || err) }); }
}

/* Worker entry point. On the main thread this file only defines functions. */
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) self.onmessage = e => handle(e.data, (m, t) => self.postMessage(m, t || []));
