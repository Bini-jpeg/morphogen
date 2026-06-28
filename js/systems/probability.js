
import { clearCanvas, label, dot } from '../plot.js';

function randn() {
  let u=0,v=0;
  while(!u)u=Math.random();while(!v)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

// ─── 2D Brownian motion ─────────────────────────────────────────
class Walk2D {
  constructor(W,H){ this.W=W;this.H=H;this.reset(); }
  reset(){
    this.trails=[]; this.sigma=1; this.steps=0;
    const n=6,cols=['#c42020','#1a4fa8','#1a6b1a','#a05000','#6020a0','#1a7a7a'];
    for(let i=0;i<n;i++) this.trails.push({pts:[{x:this.W/2,y:this.H/2}],col:cols[i]});
  }
  step(sigma){
    for(const t of this.trails){
      const last=t.pts[t.pts.length-1];
      t.pts.push({x:last.x+randn()*sigma*8, y:last.y+randn()*sigma*8});
      if(t.pts.length>600)t.pts.shift();
    }
    this.steps++;
  }
  render(ctx,W,H,sigma){
    clearCanvas(ctx,W,H,'#fff');
    for(const t of this.trails){
      if(t.pts.length<2)continue;
      ctx.strokeStyle=t.col+'cc';ctx.lineWidth=1.2;ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(t.pts[0].x,t.pts[0].y);
      for(let i=1;i<t.pts.length;i++)ctx.lineTo(t.pts[i].x,t.pts[i].y);
      ctx.stroke();
      const l=t.pts[t.pts.length-1];
      ctx.fillStyle=t.col;ctx.beginPath();ctx.arc(l.x,l.y,4,0,Math.PI*2);ctx.fill();
    }
    // Expected RMS radius ring
    const expR=sigma*8*Math.sqrt(this.steps)*0.8;
    ctx.save();ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(W/2,H/2,Math.min(expR,W/2-10),0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
    label(ctx,`2D Brownian motion — ${this.trails.length} walkers — step ${this.steps}`,8,8,{color:'#333',size:12,bg:'rgba(255,255,255,0.88)'});
    label(ctx,'E[|B_n|] ~ σ√n  (dashed ring)',8,H-16,{color:'#888',size:10});
  }
}

// ─── 1D Random walk ─────────────────────────────────────────────
class Walk1D {
  constructor(W,H){this.W=W;this.H=H;this.reset();}
  reset(){
    this.walkers=[];
    const n=8,cols=['#c42020','#1a4fa8','#1a6b1a','#a05000','#6020a0','#1a7a7a','#884400','#004488'];
    for(let i=0;i<n;i++) this.walkers.push({pos:0,history:[0],col:cols[i]});
    this.step_=0;
  }
  step(){
    for(const w of this.walkers){w.pos+=Math.random()<0.5?1:-1;w.history.push(w.pos);}
    this.step_++;
  }
  render(ctx,W,H){
    clearCanvas(ctx,W,H,'#fff');
    const maxSteps=Math.min(this.step_+1,500);
    const pad=48, tw=i=>pad+(i/Math.max(1,maxSteps-1))*(W-2*pad), sc=(H-2*pad)/(2*Math.sqrt(maxSteps+1)*2.5);
    const cy=H/2;
    ctx.strokeStyle='#bbb';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad,cy);ctx.lineTo(W-pad,cy);ctx.stroke();
    // σ envelopes
    ctx.save();ctx.strokeStyle='rgba(0,0,0,0.1)';ctx.setLineDash([3,5]);
    for(const k of [1,2,-1,-2]){
      const env=k*Math.sqrt(maxSteps);
      ctx.beginPath();ctx.moveTo(pad,cy-env*sc);ctx.lineTo(W-pad,cy-env*sc);ctx.stroke();
      label(ctx,`${k}σ√n`,W-pad+4,cy-env*sc-6,{color:'#bbb',size:9});
    }
    ctx.setLineDash([]);ctx.restore();
    for(const w of this.walkers){
      ctx.strokeStyle=w.col+'99';ctx.lineWidth=1;ctx.lineJoin='round';
      const hist=w.history.slice(-maxSteps);
      ctx.beginPath();ctx.moveTo(tw(0),cy-hist[0]*sc);
      for(let i=1;i<hist.length;i++)ctx.lineTo(tw(i),cy-hist[i]*sc);
      ctx.stroke();
    }
    label(ctx,`1D Random Walk — ${this.walkers.length} walkers — step ${this.step_}`,8,8,{color:'#333',size:12,bg:'rgba(255,255,255,0.88)'});
    label(ctx,'Dashed = ±σ√n, ±2σ√n  (diffusion bands)',8,H-16,{color:'#888',size:10});
  }
}

// ─── CLT demo ────────────────────────────────────────────────────
class CLTDemo {
  constructor(){this.reset();}
  reset(){this.samples=[];this.n=20;}
  step(n){
    for(let i=0;i<50;i++){
      let s=0; for(let j=0;j<n;j++) s+=(Math.random()-0.5);
      this.samples.push(s/Math.sqrt(n/12));
      if(this.samples.length>4000) this.samples.shift();
    }
  }
  render(ctx,W,H,n){
    clearCanvas(ctx,W,H,'#fff');
    const bins=60,pad=48,bw=(W-2*pad)/bins;
    const hist=new Float32Array(bins);
    for(const s of this.samples){
      const b=Math.floor((s+4)/8*bins);
      if(b>=0&&b<bins)hist[b]++;
    }
    const mx=Math.max(...hist)||1;
    ctx.fillStyle='rgba(26,79,168,0.65)';
    for(let i=0;i<bins;i++){
      const h=(hist[i]/mx)*(H-2*pad-20);
      ctx.fillRect(pad+i*bw,H-pad-h,bw-1,h);
    }
    // Normal overlay
    ctx.strokeStyle='#c42020';ctx.lineWidth=2.5;
    ctx.beginPath();
    for(let i=0;i<=300;i++){
      const x=-4+(i/300)*8;
      const g=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
      const cx=pad+(x+4)/8*(W-2*pad);
      const cy=H-pad-g*2.506*(H-2*pad-20)*0.85;
      i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);
    }
    ctx.stroke();
    label(ctx,`CLT: sum of ${n} uniform vars — ${this.samples.length} samples`,8,8,{color:'#333',size:12,bg:'rgba(255,255,255,0.88)'});
    label(ctx,'Blue: empirical  |  Red: N(0,1) — they converge as n→∞',8,H-16,{color:'#555',size:10});
  }
}

// ─── Animated Galton Board ───────────────────────────────────────
class GaltonBoard {
  constructor(){this.reset();}
  reset(){
    this.bins=new Array(17).fill(0);
    this.activeBalls=[];
    this.levels=16;
    this.totalDropped=0;
  }
  step(){
    // Drop a new ball every few frames
    if(this.totalDropped%3===0){
      this.activeBalls.push({level:0, pos:0, t:0});
      this.totalDropped++;
    }
    this.totalDropped++;
    // Advance all active balls
    const done=[];
    for(const b of this.activeBalls){
      b.t+=0.25;
      if(b.t>=1){
        b.t=0; b.level++;
        b.pos+=Math.random()<0.5?1:-1;
        if(b.level>this.levels){done.push(b);this.bins[Math.floor((b.pos+this.levels)/2)]++;}
      }
    }
    for(const b of done) this.activeBalls.splice(this.activeBalls.indexOf(b),1);
  }
  render(ctx,W,H){
    clearCanvas(ctx,W,H,'#fff');
    const L=this.levels, pad=48;
    const binW=(W-2*pad)/(L+2);
    const rowH=(H-pad*1.5)/(L+2);
    const cx0=W/2;
    // Peg grid
    ctx.fillStyle='#888';
    for(let row=0;row<=L;row++){
      for(let col=0;col<=row;col++){
        const px=cx0+(col-row/2)*binW;
        const py=pad+row*rowH;
        ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fill();
      }
    }
    // Active balls
    ctx.fillStyle='rgba(200,40,40,0.8)';
    for(const b of this.activeBalls){
      const row=b.level, col=(b.pos+row)/2;
      const px=cx0+(col-row/2)*binW;
      const py=pad+(row+b.t)*rowH;
      ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
    }
    // Bins
    const baseY=pad+(L+1)*rowH;
    const maxBin=Math.max(...this.bins,1);
    ctx.fillStyle='rgba(26,79,168,0.65)';
    for(let i=0;i<=L;i++){
      const h=(this.bins[i]/maxBin)*(H-baseY-16);
      const bx=cx0+(i-L/2)*binW-binW*0.4;
      ctx.fillRect(bx,baseY-h,binW*0.8,h);
    }
    // Binomial curve
    const N=this.bins.reduce((a,b)=>a+b,0)||1;
    ctx.strokeStyle='#c42020';ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=0;i<=L;i++){
      const binom=binomCoeff(L,i)*Math.pow(0.5,L)*N;
      const h=(binom/maxBin)*(H-baseY-16);
      const bx=cx0+(i-L/2)*binW;
      i===0?ctx.moveTo(bx,baseY-h):ctx.lineTo(bx,baseY-h);
    }
    ctx.stroke();
    label(ctx,`Galton Board  ${L} levels  |  dropped: ${this.totalDropped}`,8,8,{color:'#333',size:12,bg:'rgba(255,255,255,0.88)'});
    label(ctx,'Blue: counts  |  Red: Binomial(n,½) — converges to Normal',8,H-16,{color:'#555',size:10});
  }
}
function binomCoeff(n,k){let r=1;for(let i=0;i<k;i++){r=r*(n-i)/(i+1);}return r;}

// ─── Animated Markov Chain ───────────────────────────────────────
class MarkovChain {
  constructor(){
    this.states=['Sunny','Cloudy','Rainy','Foggy'];
    this.colors=['#c42020','#1a4fa8','#1a6b1a','#a05000'];
    this.P=[[0.6,0.25,0.1,0.05],[0.3,0.4,0.2,0.1],[0.1,0.2,0.5,0.2],[0.1,0.15,0.25,0.5]];
    this.reset();
  }
  reset(){
    this.current=0; this.history=[0]; this.counts=new Array(4).fill(0);
    this.counts[0]=1; this.step_=0; this.nextT=0;
  }
  step(){
    this.nextT++;
    if(this.nextT<8)return; // slow transitions for visibility
    this.nextT=0;
    const row=this.P[this.current]; let r=Math.random(), acc=0;
    for(let j=0;j<row.length;j++){acc+=row[j];if(r<acc){this.current=j;break;}}
    this.history.push(this.current);
    if(this.history.length>60)this.history.shift();
    this.counts[this.current]++;
    this.step_++;
  }
  render(ctx,W,H){
    clearCanvas(ctx,W,H,'#fff');
    const n=this.states.length, R=Math.min(W,H)*0.26;
    const cx0=W*0.42, cy0=H/2;
    const pos=this.states.map((_,i)=>({x:cx0+R*Math.cos(i*Math.PI*2/n-Math.PI/2), y:cy0+R*Math.sin(i*Math.PI*2/n-Math.PI/2)}));

    // Transition arrows
    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++){
        if(this.P[i][j]<0.08) continue;
        const w=this.P[i][j];
        if(i===j){ // self-loop
          ctx.save();ctx.strokeStyle=`rgba(0,0,0,${0.15+w*0.5})`;ctx.lineWidth=w*4;
          ctx.beginPath();ctx.arc(pos[i].x+22,pos[i].y-22,18,0,Math.PI*2);ctx.stroke();
          label(ctx,w.toFixed(2),pos[i].x+32,pos[i].y-44,{color:'#888',size:9});
          ctx.restore();
        } else {
          const dx=pos[j].x-pos[i].x, dy=pos[j].y-pos[i].y, d=Math.sqrt(dx*dx+dy*dy);
          const ox=-dy/d*12, oy=dx/d*12;
          const sx=pos[i].x+ox+dx/d*24, sy=pos[i].y+oy+dy/d*24;
          const ex=pos[j].x+ox-dx/d*24, ey=pos[j].y+oy-dy/d*24;
          ctx.save();ctx.strokeStyle=`rgba(0,0,0,${0.12+w*0.5})`;ctx.lineWidth=w*4+0.5;
          ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
          // Arrowhead
          const ang=Math.atan2(ey-sy,ex-sx);
          ctx.fillStyle=`rgba(0,0,0,${0.2+w*0.5})`;
          ctx.beginPath();ctx.moveTo(ex,ey);
          ctx.lineTo(ex-10*Math.cos(ang-0.4),ey-10*Math.sin(ang-0.4));
          ctx.lineTo(ex-10*Math.cos(ang+0.4),ey-10*Math.sin(ang+0.4));
          ctx.closePath();ctx.fill();
          label(ctx,w.toFixed(2),(sx+ex)/2+ox,(sy+ey)/2+oy,{color:'#777',size:9,bg:'rgba(255,255,255,0.7)'});
          ctx.restore();
        }
      }
    }
    // State nodes
    for(let i=0;i<n;i++){
      const isCur=i===this.current;
      ctx.save();
      ctx.fillStyle=this.colors[i]; ctx.globalAlpha=isCur?1:0.55;
      ctx.beginPath();ctx.arc(pos[i].x,pos[i].y,isCur?30:24,0,Math.PI*2);ctx.fill();
      if(isCur){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
      ctx.fillStyle='#fff';ctx.globalAlpha=1;
      ctx.font=`bold 11px "Courier New"`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(this.states[i],pos[i].x,pos[i].y);ctx.restore();
    }

    // Trace bar on right
    const bx=W*0.82, by=H*0.12, bH=(H*0.76)/this.history.length;
    label(ctx,'History',bx,by-20,{color:'#555',size:11});
    for(let i=0;i<this.history.length;i++){
      ctx.fillStyle=this.colors[this.history[i]];
      ctx.fillRect(bx,by+i*bH,W*0.12,Math.max(1,bH-1));
    }

    // Stationary distribution
    let pi=[0.25,0.25,0.25,0.25];
    for(let k=0;k<200;k++){const np=pi.map((_,j)=>pi.reduce((s,v,i)=>s+v*this.P[i][j],0));pi=np;}
    const total=this.counts.reduce((a,b)=>a+b,0)||1;
    label(ctx,'Stationary π:',8,H-90,{color:'#333',size:11,bg:'rgba(255,255,255,0.88)'});
    this.states.forEach((s,i)=>{
      const empirical=(this.counts[i]/total).toFixed(3);
      label(ctx,`${s}: π=${pi[i].toFixed(3)} emp=${empirical}`,8,H-74+i*16,{color:this.colors[i],size:10,bg:'rgba(255,255,255,0.85)'});
    });
    label(ctx,`Step: ${this.step_}  |  Current: ${this.states[this.current]}`,8,8,{color:'#333',size:12,bg:'rgba(255,255,255,0.88)'});
  }
}

// ─── Main system ─────────────────────────────────────────────────
export class Probability {
  constructor(W,H){
    this.canvasW=W; this.canvasH=H;
    this.params={ view:'walk2d', sigma:1.5, cltN:20, galtonLevels:16 };
    this.paramDefs=[
      { group:'Mode', items:[
        { id:'view', label:'Visualization', type:'select', options:['walk2d','walk1d','clt','galton','markov'] },
      ]},
      { group:'Settings', items:[
        { id:'sigma',       label:'Step size (σ)',   min:0.3, max:3,  step:0.1, type:'range' },
        { id:'cltN',        label:'CLT samples (n)', min:1,   max:50, step:1,   type:'range', tip:'n→∞ → Normal distribution' },
        { id:'galtonLevels',label:'Galton levels',   min:6,   max:20, step:1,   type:'range' },
      ]},
    ];
    this.presets=[
      {id:'w2d',  name:'2D Brownian Motion', params:{view:'walk2d'}},
      {id:'w1d',  name:'1D Random Walk',      params:{view:'walk1d'}},
      {id:'clt',  name:'Central Limit Theorem',params:{view:'clt',cltN:20}},
      {id:'gal',  name:'Galton Board',         params:{view:'galton'}},
      {id:'mar',  name:'Markov Chain',          params:{view:'markov'}},
    ];
    this.domain='Probability & Statistics';
    this.description='Random walks, CLT, Galton board (binomial→normal), and Markov chains. All animated in real-time.';
    this.stepsPerFrame=2;
    this._sub={ walk2d:new Walk2D(W,H), walk1d:new Walk1D(W,H), clt:new CLTDemo(), galton:new GaltonBoard(), markov:new MarkovChain() };
  }

  getFormula(){
    const m={walk2d:'E[|B_n|²] = n·σ²  (Brownian diffusion)',walk1d:'S_n = X_1+…+X_n,  X_i=±1',clt:'(X₁+…+X_n)/√n → N(0,σ²)',galton:'bin(n,½) → N(n/2, n/4)',markov:'P(X_{n+1}|X_n,…)=P(X_{n+1}|X_n)'};
    return m[this.params.view]||'';
  }
  get description(){
    const m={walk2d:'2D Brownian motion. Each step is Gaussian-distributed.',walk1d:'1D ±1 random walk.',clt:'Sum of n uniform variables → Normal distribution (CLT).',galton:'Balls fall through pegs, landing in bins — demonstrates binomial→normal.',markov:'Markov chain on 4 states with transition matrix P. Converges to stationary π.'};
    return m[this.params.view]||'';
  }

  reset(){
    const v=this.params.view;
    if(this._sub[v]) this._sub[v].reset();
  }

  onParamChange(id){
    if(id==='view'||id==='_preset') this.reset();
    if(id==='galtonLevels'&&this._sub.galton){ this._sub.galton.levels=this.params.galtonLevels; this._sub.galton.bins=new Array(this.params.galtonLevels+1).fill(0); }
  }

  update(){
    const v=this.params.view;
    if(v==='walk2d')  this._sub.walk2d.step(this.params.sigma);
    else if(v==='walk1d') this._sub.walk1d.step();
    else if(v==='clt')    this._sub.clt.step(this.params.cltN);
    else if(v==='galton') this._sub.galton.step();
    else if(v==='markov') this._sub.markov.step();
  }

  render(ctx,canvas){
    const W=canvas.width,H=canvas.height, v=this.params.view;
    if(v==='walk2d')  this._sub.walk2d.render(ctx,W,H,this.params.sigma);
    else if(v==='walk1d') this._sub.walk1d.render(ctx,W,H);
    else if(v==='clt')    this._sub.clt.render(ctx,W,H,this.params.cltN);
    else if(v==='galton') this._sub.galton.render(ctx,W,H);
    else if(v==='markov') this._sub.markov.render(ctx,W,H);
  }

  coordInfo(){ return `view: ${this.params.view}  |  press Reset (↺) to restart`; }
}
