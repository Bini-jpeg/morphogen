
import { ComplexDomain }   from './complex-domain.js';
import { PhasePortrait }   from './phase-portrait.js';
import { FourierAnalysis } from './fourier.js';
import { Chaos }           from './chaos.js';
import { EllipticCurve }   from './elliptic.js';
import { HyperbolicGeometry } from './hyperbolic.js';
import { NumberTheory }    from './number-theory.js';
import { LinearAlgebra }   from './linalg.js';
import { Probability }     from './probability.js';
import { Surfaces }        from './surfaces.js';
import { Fractal }         from './fractal.js';
import { LSystem }         from './lsystem.js';

export const SYSTEMS = [
  { id:'complex-domain',  name:'Complex Functions',    group:'Analysis',           dot:'#1a4fa8', create:(W,H)=>new ComplexDomain(W,H) },
  { id:'phase-portrait',  name:'Phase Portraits',       group:'Analysis',           dot:'#1a6b1a', create:(W,H)=>new PhasePortrait(W,H) },
  { id:'fourier',         name:'Fourier Analysis',      group:'Analysis',           dot:'#c42020', create:(W,H)=>new FourierAnalysis(W,H) },
  { id:'chaos',           name:'Chaos & Bifurcation',   group:'Dynamical Systems',  dot:'#a05000', create:(W,H)=>new Chaos(W,H) },
  { id:'fractal',         name:'Fractal Explorer',      group:'Dynamical Systems',  dot:'#6020a0', create:(W,H)=>new Fractal(W,H) },
  { id:'elliptic',        name:'Elliptic Curves',       group:'Algebra',            dot:'#1a7a7a', create:(W,H)=>new EllipticCurve(W,H) },
  { id:'linalg',          name:'Linear Algebra',        group:'Algebra',            dot:'#c42020', create:(W,H)=>new LinearAlgebra(W,H) },
  { id:'hyperbolic',      name:'Hyperbolic Geometry',   group:'Geometry',           dot:'#1a4fa8', create:(W,H)=>new HyperbolicGeometry(W,H) },
  { id:'surfaces',        name:'Parametric Surfaces',   group:'Geometry',           dot:'#6020a0', create:(W,H)=>new Surfaces(W,H) },
  { id:'number-theory',   name:'Number Theory',         group:'Number Theory',      dot:'#a05000', create:(W,H)=>new NumberTheory(W,H) },
  { id:'probability',     name:'Probability & Stats',   group:'Probability',        dot:'#1a6b1a', create:(W,H)=>new Probability(W,H) },
  { id:'lsystem',         name:'Formal Grammars',       group:'Formal Systems',     dot:'#888888', create:(W,H)=>new LSystem(W,H) },
];
