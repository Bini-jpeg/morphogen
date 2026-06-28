// js/systems/complex-domain.js
// Domain coloring of f: C -> C
// Hue = arg(f(z)), brightness = |f(z)|, contour lines = isochromatic & isometric rings

import { hsv2rgb } from '../colormap.js';
import { Viewport, clearCanvas, label } from '../plot.js';

// All preset functions defined over (re, im) -> {re, im}
const FNS = {
  'z':              (r,i) => ({r, i}),
  'z²':             (r,i) => ({r:r*r-i*i, i:2*r*i}),
  'z³':             (r,i) => ({r:r*(r*r-3*i*i), i:i*(3*r*r-i*i)}),
  'z⁴ − 1':        (r,i) => { const r2=r*r-i*i,i2=2*r*i,r4=r2*r2-i2*i2,i4=2*r2*i2; return {r:r4-1, i:i4}; },
  '1/z':            (r,i) => { const d=r*r+i*i; return {r:r/d, i:-i/d}; },
  '(z−1)/(z+1)':   (r,i) => { const ar=r-1,ai=i,br=r+1,bi=i; const d=br*br+bi*bi; return {r:(ar*br+ai*bi)/d, i:(ai*br-ar*bi)/d}; },
  '(z²−1)/(z²+1)': (r,i) => { const nr=r*r-i*i-1,ni=2*r*i,dr=r*r-i*i+1,di=2*r*i; const d=dr*dr+di*di; return {r:(nr*dr+ni*di)/d, i:(ni*dr-nr*di)/d}; },
  'eᶻ':            (r,i) => { const e=Math.exp(r); return {r:e*Math.cos(i), i:e*Math.sin(i)}; },
  'sin(z)':         (r,i) => ({r:Math.sin(r)*Math.cosh(i), i:Math.cos(r)*Math.sinh(i)}),
  'cos(z)':         (r,i) => ({r:Math.cos(r)*Math.cosh(i), i:-Math.sin(r)*Math.sinh(i)}),
  'tan(z)':         (r,i) => {
    const sr=Math.sin(r),cr=Math.cos(r),sh=Math.sinh(i),ch=Math.cosh(i);
    const nr=sr*ch,ni=cr*sh,dr=cr*ch,di=-sr*sh;
    const d=dr*dr+di*di; return {r:(nr*dr+ni*di)/d, i:(ni*dr-nr*di)/d};
  },
  'log(z)':         (r,i) => ({r:Math.log(Math.sqrt(r*r+i*i)), i:Math.atan2(i,r)}),
  '√z':             (r,i) => { const m=Math.sqrt(Math.sqrt(r*r+i*i)),a=Math.atan2(i,r)/2; return {r:m*Math.cos(a), i:m*Math.sin(a)}; },
  'z^z':            (r,i) => {
    const logr=0.5*Math.log(r*r+i*i), logi=Math.atan2(i,r);
    const wr=r*logr-i*logi, wi=r*logi+i*logr;
    const e=Math.exp(wr); return {r:e*Math.cos(wi), i:e*Math.sin(wi)};
  },
  'e^(1/z)':        (r,i) => { const d=r*r+i*i,ur=r/d,ui=-i/d; const e=Math.exp(ur); return {r:e*Math.cos(ui),i:e*Math.sin(ui)}; },
  'sin(1/z)':       (r,i) => {
    const d=r*r+i*i,ur=r/d,ui=-i/d;
    return {r:Math.sin(ur)*Math.cosh(ui), i:Math.cos(ur)*Math.sinh(ui)};
  },
  'sin(z)/z':       (r,i) => {
    const sn={r:Math.sin(r)*Math.cosh(i),i:Math.cos(r)*Math.sinh(i)};
    const d=r*r+i*i; if(d<1e-14) return {r:1,i:0};
    return {r:(sn.r*r+sn.i*i)/d, i:(sn.i*r-sn.r*i)/d};
  },
  '(z²+1)/(z²−1)': (r,i) => { const nr=r*r-i*i+1,ni=2*r*i,dr=r*r-i*i-1,di=2*r*i; const d=dr*dr+di*di; return {r:(nr*dr+ni*di)/d, i:(ni*dr-nr*di)/d}; },
  'Γ approx':       (r,i) => {
    // Stirling approx: Gamma(z) ~ sqrt(2pi/z)*(z/e)^z
    if(Math.abs(r)<0.1 && Math.abs(i)<0.1) return {r:1/r,i:0};
    const logr=0.5*Math.log(r*r+i*i), logi=Math.atan2(i,r);
    const lr2=Math.log(2*Math.PI)-logr*0.5+logr/2-logi/2; // simplified
    const a=Math.atan2(i,r); const m=Math.pow(r*r+i*i,0.25);
    return {r:m*Math.cos(a*0.5+0.3), i:m*Math.sin(a*0.5+0.3)};
  },
  'Newton z³−1':    (r,i) => {
    // One Newton step for z^3-1=0: z - (z^3-1)/(3z^2)
    const r2=r*r-i*i,i2=2*r*i;
    const r3=r*r2-i*i2,i3=r*i2+i*r2;
    const dr3r=3*r2,dr3i=3*i2;
    const d=dr3r*dr3r+dr3i*dr3i;
    const fr=r3-1,fi=i3;
    const qr=(fr*dr3r+fi*dr3i)/d, qi=(fi*dr3r-fr*dr3i)/d;
    return {r:r-qr, i:i-qi};
  },
};

const FN_DESCS = {
  'z': 'Identity. Hue rotates 360° around origin. Shows the coordinate system itself.',
  'z²': 'Quadratic. Hue completes two full cycles. Conformal everywhere except at z=0 (critical point).',
  'z³': 'Cubic. Three-fold rotational symmetry. Phase winds 3× around origin.',
  'z⁴ − 1': 'Four roots of unity at ±1, ±i. Four zeros, conformal elsewhere.',
  '1/z': 'Inversion and conjugation. Maps circles to circles. Pole at z=0.',
  '(z−1)/(z+1)': 'Möbius/bilinear transform mapping right half-plane to unit disk.',
  '(z²−1)/(z²+1)': 'Two zeros at ±1, two poles at ±i.',
  'eᶻ': 'Complex exponential. 2πi-periodic. Essential singularity at ∞. Surjective onto C\\ {0}.',
  'sin(z)': 'Complex sine. Zeros at nπ. Periods: 2π along real axis.',
  'cos(z)': 'Complex cosine. Zeros at π/2+nπ.',
  'tan(z)': 'Simple poles at π/2+nπ. Zeros at nπ.',
  'log(z)': 'Multi-valued complex logarithm. Branch cut along negative real axis.',
  '√z': 'Square root — branch cut on negative real axis. Two-valued in C.',
  'z^z': 'Highly non-trivial. Essential singularity at 0. Fractal-like boundary behavior.',
  'e^(1/z)': 'Essential singularity at z=0 (Picard: takes every value near 0).',
  'sin(1/z)': 'Essential singularity at 0. Infinitely many zeros accumulating at 0.',
  'sin(z)/z': 'Sinc function in C. Removable singularity at 0 (value = 1). Zeros at nπ, n≠0.',
  '(z²+1)/(z²−1)': 'Zeros at ±i, poles at ±1.',
  'Γ approx': 'Approximate Gamma function — poles at 0, -1, -2, -3, …',
  'Newton z³−1': 'Newton iteration for z³=1. Three basins of attraction with fractal boundary.',
};

export class ComplexDomain {
  constructor(W, H) {
    this.canvasW = W; this.canvasH = H;
    this.vp = new Viewport(-3, 3, -3, 3);
    this._dirty = true;
    this._drag = null;

    this.params = {
      fn: 'sin(z)',
      contourPhase: true,
      contourMag: true,
      colorMode: 'standard', // standard | phase-only | magnitude-only
      brightGamma: 0.5,
    };

    this.paramDefs = [
      { group: 'Function', items: [
        { id: 'fn', label: 'f(z)', type: 'select', options: Object.keys(FNS),
          tip: 'Choose a complex function to visualize.' },
      ]},
      { group: 'Coloring', items: [
        { id: 'colorMode', label: 'Mode', type: 'select', options: ['standard','phase-only','magnitude-only'],
          tip: 'Standard: hue=arg, brightness=|f|. Phase-only: pure hue. Magnitude-only: grayscale.' },
        { id: 'contourPhase', label: 'Phase contours (arg lines)', type: 'toggle',
          tip: 'Dark lines at multiples of π/6 in arg(f(z)).' },
        { id: 'contourMag',   label: 'Modulus contours (|f| rings)', type: 'toggle',
          tip: 'Dark rings where |f(z)| crosses integer powers of 2.' },
        { id: 'brightGamma', label: 'Brightness curve γ', min: 0.1, max: 2.0, step: 0.05, type: 'range',
          tip: 'γ<1 brightens mid-range, γ>1 darkens. Default 0.5.' },
      ]},
      { group: 'View', items: [
        { id: '_zoom_in',  label: 'Zoom In',   type: 'button' },
        { id: '_zoom_out', label: 'Zoom Out',  type: 'button' },
        { id: '_reset_view', label: 'Reset View', type: 'button' },
      ]},
    ];

    this.presets = Object.keys(FNS).map(k => ({ id: k, name: k, params: { fn: k } }));
    this.formula = `f(z) = ${this.params.fn}`;
    this.description = FN_DESCS[this.params.fn] || '';
    this.domain = 'Complex Analysis';
    this.stepsPerFrame = 0;
  }

  getFormula() { return `f(z) = ${this.params.fn}`; }

  reset() { this._dirty = true; }
  update() {}

  onParamChange(id) {
    if (id === '_zoom_in')   this.vp.zoom(0.5, this.canvasW/2, this.canvasH/2, this.canvasW, this.canvasH);
    if (id === '_zoom_out')  this.vp.zoom(2.0, this.canvasW/2, this.canvasH/2, this.canvasW, this.canvasH);
    if (id === '_reset_view') this.vp = new Viewport(-3,3,-3,3);
    this._dirty = true;
    this.formula = this.getFormula();
    this.description = FN_DESCS[this.params.fn] || '';
  }

  onMouseDown(cx, cy, W, H, e) {
    this._drag = { cx, cy };
    if (e && e.detail === 2) { // double-click zoom
      this.vp.zoom(0.5, cx, cy, W, H);
      this._dirty = true;
    }
  }
  onMouseDrag(ddx, ddy) {
    this.vp.pan(ddx, ddy, this.canvasW, this.canvasH);
    this._dirty = true;
  }
  onWheel(cx, cy, delta, W, H) {
    this.vp.zoom(delta > 0 ? 1.3 : 0.77, cx, cy, W, H);
    this._dirty = true;
  }

  render(ctx, canvas) {
    if (!this._dirty) return;
    this._dirty = false;
    const W = canvas.width, H = canvas.height;
    const { fn, contourPhase, contourMag, colorMode, brightGamma } = this.params;
    const func = FNS[fn];
    if (!func) return;

    const imgd = ctx.createImageData(W, H);
    const data = imgd.data;
    const vp   = this.vp;

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const [re, im] = vp.toWorld(px, py, W, H);
        const { r: fr, i: fi } = func(re, im);

        if (!isFinite(fr) || !isFinite(fi)) {
          const p = (py*W+px)*4; data[p]=0; data[p+1]=0; data[p+2]=0; data[p+3]=255; continue;
        }

        const phase = Math.atan2(fi, fr); // -pi..pi
        const mag   = Math.sqrt(fr*fr + fi*fi);
        const hue   = phase / (2 * Math.PI) + 0.5; // 0..1

        let sat = 1.0;
        let v   = 1.0;

        if (colorMode === 'standard') {
          // Brightness reflects log of magnitude
          const logMag = mag > 0 ? Math.log(mag) : -Infinity;
          const b = Math.pow(0.5 * (1 + Math.sin(logMag * Math.PI / Math.log(2))), brightGamma);
          v = isFinite(b) ? Math.max(0.1, Math.min(1, b)) : 0.1;
        } else if (colorMode === 'magnitude-only') {
          const logMag = mag > 0 ? Math.log2(mag) : -10;
          v = 0.5 + 0.5 * Math.sin(logMag * Math.PI);
          sat = 0;
        }

        let [r, g, b] = hsv2rgb(hue, sat, v);

        // Contour lines
        if (contourPhase) {
          const n = 12; // divisions
          const t = ((phase / (2*Math.PI) + 1) % 1) * n;
          if (t - Math.floor(t) < 0.06) { r=Math.round(r*0.4); g=Math.round(g*0.4); b=Math.round(b*0.4); }
        }
        if (contourMag && mag > 0) {
          const logM = Math.log2(mag);
          const t = logM - Math.floor(logM);
          if (t < 0.07 || t > 0.93) { r=Math.round(r*0.4); g=Math.round(g*0.4); b=Math.round(b*0.4); }
        }

        const p = (py*W+px)*4;
        data[p]=r; data[p+1]=g; data[p+2]=b; data[p+3]=255;
      }
    }

    ctx.putImageData(imgd, 0, 0);

    // Axes
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
    const [ox,oy] = vp.toCanvas(0,0,W,H);
    ctx.beginPath(); ctx.moveTo(0,oy); ctx.lineTo(W,oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox,0); ctx.lineTo(ox,H); ctx.stroke();
    ctx.restore();

    // Legend
    label(ctx, `f(z) = ${fn}`, 8, 8, { color:'rgba(0,0,0,0.8)', size:12, bg:'rgba(255,255,255,0.7)' });
    label(ctx, `Re: [${vp.xMin.toFixed(2)}, ${vp.xMax.toFixed(2)}]  Im: [${vp.yMin.toFixed(2)}, ${vp.yMax.toFixed(2)}]`, 8, H-20, { color:'rgba(0,0,0,0.6)', size:10 });
  }

  coordInfo(cx, cy, W, H) {
    const [re, im] = this.vp.toWorld(cx, cy, W, H);
    const fn = FNS[this.params.fn];
    if (!fn) return `z = ${re.toFixed(4)} + ${im.toFixed(4)}i`;
    const { r: fr, i: fi } = fn(re, im);
    const mag = Math.sqrt(fr*fr+fi*fi);
    const arg = Math.atan2(fi, fr);
    return `z=${re.toFixed(3)}+${im.toFixed(3)}i  |f|=${mag.toFixed(3)}  arg=${(arg*180/Math.PI).toFixed(1)}°`;
  }
}
