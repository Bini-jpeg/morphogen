
import { Viewport, drawAxes, clearCanvas, rk4, label, dot } from '../plot.js';

// Each preset has a direct JS function — no expression compilation needed
const PRESETS = {
  'Harmonic Oscillator':   { fn:(x,y)=>[y,-x],                              xr:[-4,4],yr:[-4,4], desc:'ẋ=y, ẏ=−x. Circles = conserved energy E=(x²+y²)/2. All orbits periodic.' },
  'Nonlinear Pendulum':    { fn:(x,y)=>[y,-Math.sin(x)],                    xr:[-7,7],yr:[-4,4], desc:'ẋ=y, ẏ=−sin(x). Libration (closed) vs rotation (open) separated by separatrix at (±π,0).' },
  'Damped Pendulum':       { fn:(x,y)=>[y,-Math.sin(x)-0.3*y],              xr:[-7,7],yr:[-4,4], desc:'ẋ=y, ẏ=−sin(x)−0.3y. Stable spirals at (0,0), saddles at (±π,0). Energy dissipates.' },
  'Van der Pol':           { fn:(x,y)=>[y,0.8*(1-x*x)*y-x],                xr:[-4,4],yr:[-4,4], desc:'ẍ−μ(1−x²)ẋ+x=0 (μ=0.8). Self-sustained oscillation with stable limit cycle.' },
  'Lotka-Volterra':        { fn:(x,y)=>[x*(1.5-0.5*y),y*(-1+0.5*x)],       xr:[-0.5,8],yr:[-0.5,8], desc:'Predator-prey. Closed orbits. ẋ=x(α−βy), ẏ=y(δx−γ). Coexistence equilibrium at (2,3).' },
  'SIR Epidemic':          { fn:(x,y)=>[-0.3*x*y,0.3*x*y-0.1*y],           xr:[-0.1,1.1],yr:[-0.1,1.1], desc:'S\'=−βSI, I\'=βSI−γI. R₀=β/γ=3. Epidemic curve: I rises then falls.' },
  'Duffing (double-well)': { fn:(x,y)=>[y,x-x*x*x-0.1*y],                  xr:[-2,2],yr:[-2,2], desc:'ẍ+0.1ẋ−x+x³=0. Double-well potential. Two stable spirals (±1,0), saddle at origin.' },
  'Hopf Bifurcation':      { fn:(x,y)=>[0.5*x-y-x*(x*x+y*y),x+0.5*y-y*(x*x+y*y)], xr:[-2,2],yr:[-2,2], desc:'Stable limit cycle of radius √μ (μ=0.5). Unstable spiral inside, stable outside.' },
  'Saddle Point':          { fn:(x,y)=>[x,-y],                              xr:[-3,3],yr:[-3,3], desc:'Eigenvalues ±1. Stable manifold: y-axis. Unstable manifold: x-axis.' },
  'Spiral Sink':           { fn:(x,y)=>[-0.3*x-y,x-0.3*y],                 xr:[-3,3],yr:[-3,3], desc:'Complex eigenvalues −0.3±i. All trajectories spiral inward. Asymptotically stable.' },
  'Spiral Source':         { fn:(x,y)=>[0.2*x-y,x+0.2*y],                  xr:[-3,3],yr:[-3,3], desc:'Complex eigenvalues +0.2±i. All trajectories spiral outward. Unstable focus.' },
  'Lotka–Volterra (compete)':{ fn:(x,y)=>[x*(1-x-0.5*y),y*(0.75-y-0.5*x)],xr:[-0.2,1.4],yr:[-0.2,1.4], desc:'Two competing species. Stable equilibria at (1,0) and (0,0.75). Unstable coexistence.' },
};

const COLORS = ['#c42020','#1a4fa8','#1a6b1a','#a05000','#6020a0','#1a7a7a','#884400','#004488','#880044'];

export class PhasePortrait {
  constructor(W, H) {
    this.canvasW = W; this.canvasH = H;
    this.vp = new Viewport(-4, 4, -4, 4);
    this.trajectories = [];
    this.t = 0;
    this._activeFn = null;
    this.params = {
      preset: 'Harmonic Oscillator',
      dt: 0.025, speed: 3, maxLen: 600,
      showField: true, showNullclines: true,
    };
    this.paramDefs = [
      { group: 'System', items: [
        { id: 'preset', label: 'Preset', type: 'select', options: Object.keys(PRESETS),
          tip: 'Choose a dynamical system. Click canvas to add trajectories.' },
      ]},
      { group: 'Display', items: [
        { id: 'showField',      label: 'Vector field',   type: 'toggle' },
        { id: 'showNullclines', label: 'Nullclines (dx/dt=0 red, dy/dt=0 blue)', type: 'toggle' },
        { id: 'dt',     label: 'Time step',    min: 0.002, max: 0.08, step: 0.002, type: 'range' },
        { id: 'speed',  label: 'Steps / frame',min: 1,     max: 20,   step: 1,     type: 'range' },
        { id: 'maxLen', label: 'Trail length', min: 100,   max: 2000, step: 100,   type: 'range' },
      ]},
    ];
    this.presets = Object.keys(PRESETS).map(k => ({ id: k, name: k, params: { preset: k } }));
    this.domain = 'Dynamical Systems';
    this._loadPreset('Harmonic Oscillator');
  }

  _loadPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this._activeFn = p.fn;
    this.vp = new Viewport(p.xr[0], p.xr[1], p.yr[0], p.yr[1]);
    this.description = p.desc;
    this.trajectories = [];
    this.t = 0;
  }

  getFormula() {
    const name = this.params.preset;
    const p = PRESETS[name];
    if (!p) return '';
    const src = p.fn.toString();
    const m = src.match(/\[(.+),(.+)\]/);
    return m ? `ẋ = ${m[1].trim()}   ẏ = ${m[2].replace(']','').trim()}` : name;
  }

  get stepsPerFrame() { return Math.round(this.params.speed); }

  reset() { this.trajectories = []; this.t = 0; }

  onParamChange(id) {
    // Handle both direct 'preset' change and '_preset' from controls panel
    if (id === 'preset' || id === '_preset') {
      this._loadPreset(this.params.preset);
    }
  }

  onClick(cx, cy, W, H) {
    const [wx, wy] = this.vp.toWorld(cx, cy, W, H);
    this.trajectories.push({
      pts: [{ x: wx, y: wy }],
      color: COLORS[this.trajectories.length % COLORS.length],
    });
  }

  onMouseDrag(ddx, ddy, cx, cy, W, H) {
    this.vp.pan(ddx, ddy, W, H);
  }

  onWheel(cx, cy, delta, W, H) {
    this.vp.zoom(delta > 0 ? 1.25 : 0.8, cx, cy, W, H);
  }

  update() {
    if (!this._activeFn) return;
    const { dt, maxLen } = this.params;
    for (const tr of this.trajectories) {
      const last = tr.pts[tr.pts.length - 1];
      try {
        const [nx, ny] = rk4(this._activeFn, last.x, last.y, dt);
        if (isFinite(nx) && isFinite(ny) && Math.abs(nx) < 500 && Math.abs(ny) < 500) {
          tr.pts.push({ x: nx, y: ny });
          if (tr.pts.length > maxLen) tr.pts.shift();
        }
      } catch (e) {}
    }
    this.t += this.params.dt;
  }

  render(ctx, canvas) {
    const W = canvas.width, H = canvas.height;
    clearCanvas(ctx, W, H, '#fff');
    drawAxes(ctx, this.vp, W, H);

    const fn = this._activeFn;
    if (!fn) return;

    // Nullclines (computed by sign-change detection on a coarse grid)
    if (this.params.showNullclines) {
      const steps = 100;
      for (let py = 0; py < steps; py++) {
        const y0 = this.vp.yMin + (py     / steps) * this.vp.height();
        const y1 = this.vp.yMin + ((py+1) / steps) * this.vp.height();
        for (let px = 0; px < steps; px++) {
          const x0 = this.vp.xMin + (px     / steps) * this.vp.width();
          const x1 = this.vp.xMin + ((px+1) / steps) * this.vp.width();
          const [dx00] = fn(x0, y0); const [dx10] = fn(x1, y0);
          const [, dy00] = fn(x0, y0); const [, dy10] = fn(x1, y0);
          const cx_ = this.vp.toCanvas((x0+x1)/2, (y0+y1)/2, W, H);
          if (dx00 * dx10 <= 0) { ctx.fillStyle='rgba(200,20,20,0.5)'; ctx.fillRect(cx_[0]-1,cx_[1]-1,2,2); }
          if (dy00 * dy10 <= 0) { ctx.fillStyle='rgba(20,50,200,0.5)'; ctx.fillRect(cx_[0]-1,cx_[1]-1,2,2); }
        }
      }
    }

    // Vector field
    if (this.params.showField) {
      const steps = 22;
      const cw = W / steps, ch = H / steps;
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
          const cx_ = i * cw, cy_ = j * ch;
          const [wx, wy] = this.vp.toWorld(cx_, cy_, W, H);
          const [vx, vy] = fn(wx, wy);
          const mag = Math.sqrt(vx*vx + vy*vy) || 1;
          const len = Math.min(1, Math.log1p(mag) / 3) * cw * 0.38;
          const ax = vx / mag * len, ay = -vy / mag * len; // flip y for canvas
          const hue = (Math.atan2(-ay, ax) / (Math.PI * 2) + 1) % 1;
          ctx.strokeStyle = `hsla(${hue*360+200},55%,42%,0.7)`;
          ctx.fillStyle   = `hsla(${hue*360+200},55%,42%,0.7)`;
          ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(cx_, cy_); ctx.lineTo(cx_+ax, cy_+ay); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx_+ax, cy_+ay, 1.5, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // Trajectories
    for (const tr of this.trajectories) {
      if (tr.pts.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = tr.color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      ctx.beginPath();
      const [cx0, cy0] = this.vp.toCanvas(tr.pts[0].x, tr.pts[0].y, W, H);
      ctx.moveTo(cx0, cy0);
      for (let i = 1; i < tr.pts.length; i++) {
        const [cx_, cy_] = this.vp.toCanvas(tr.pts[i].x, tr.pts[i].y, W, H);
        ctx.lineTo(cx_, cy_);
      }
      ctx.stroke();
      const last = tr.pts[tr.pts.length - 1];
      const [lx, ly] = this.vp.toCanvas(last.x, last.y, W, H);
      dot(ctx, lx, ly, 4, tr.color);
      ctx.restore();
    }

    // Legend
    if (this.params.showNullclines) {
      label(ctx, '■ ẋ=0', W-70, H-30, { color:'rgba(200,20,20,0.9)', size:10 });
      label(ctx, '■ ẏ=0', W-70, H-18, { color:'rgba(20,50,200,0.9)', size:10 });
    }
    label(ctx, 'Click to add trajectory  |  Drag to pan  |  Scroll to zoom', 6, H-16, { color:'#aaa', size:10 });
  }

  coordInfo(cx, cy, W, H) {
    const [x, y] = this.vp.toWorld(cx, cy, W, H);
    if (!this._activeFn) return '';
    const [dx, dy] = this._activeFn(x, y);
    return `(${x.toFixed(3)}, ${y.toFixed(3)})  →  (ẋ=${dx.toFixed(3)}, ẏ=${dy.toFixed(3)})`;
  }
}
