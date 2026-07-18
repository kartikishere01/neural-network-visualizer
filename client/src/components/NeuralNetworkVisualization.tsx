/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface LayerActivations {
  input:   number[];
  hidden1: number[];
  hidden2: number[];
  hidden3: number[];
  hidden4: number[];
  output:  number[];
}

interface SceneProps {
  layerActivations: LayerActivations;
  currentStep: number;
}

// ─── Deterministic jitter for organic, brain-like placement ──────────────────
const jit = (seed: number, scale: number) =>
  (Math.sin(seed * 127.1 + 311.7) * 0.6 + Math.cos(seed * 263.5 + 47.3) * 0.4) * scale;

// ─── Coordinates: same funnel layout with subtle organic jitter ───────────────
const generateCoordinates = () => {
  const inputCoords:   [number,number,number][] = [];
  const hidden1Coords: [number,number,number][] = [];
  const hidden2Coords: [number,number,number][] = [];
  const hidden3Coords: [number,number,number][] = [];
  const hidden4Coords: [number,number,number][] = [];
  const outputCoords:  [number,number,number][] = [];

  let s = 0;

  // Input: 28×28 = 784  at X = -16
  for (let r = 0; r < 28; r++)
    for (let c = 0; c < 28; c++)
      inputCoords.push([
        -16 + jit(s++, 0.04),
        (13.5 - r) * 0.36 + jit(s++, 0.03),
        (c - 13.5) * 0.36 + jit(s++, 0.03),
      ]);

  // Hidden1: 16×16 = 256  at X = -9.5
  for (let r = 0; r < 16; r++)
    for (let c = 0; c < 16; c++)
      hidden1Coords.push([
        -9.5 + jit(s++, 0.12),
        (7.5 - r) * 0.75 + jit(s++, 0.10),
        (c - 7.5) * 0.75 + jit(s++, 0.10),
      ]);

  // Hidden2: 8×16 = 128  at X = -3.5
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 16; c++)
      hidden2Coords.push([
        -3.5 + jit(s++, 0.18),
        (3.5 - r) * 0.9 + jit(s++, 0.12),
        (c - 7.5) * 0.9 + jit(s++, 0.12),
      ]);

  // Hidden3: 8×8 = 64  at X = 2.5
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      hidden3Coords.push([
        2.5 + jit(s++, 0.22),
        (3.5 - r) * 1.1 + jit(s++, 0.15),
        (c - 3.5) * 1.1 + jit(s++, 0.15),
      ]);

  // Hidden4: 4×8 = 32  at X = 8.5
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 8; c++)
      hidden4Coords.push([
        8.5 + jit(s++, 0.28),
        (1.5 - r) * 1.4 + jit(s++, 0.18),
        (c - 3.5) * 1.4 + jit(s++, 0.18),
      ]);

  // Output: 10  at X = 14
  for (let i = 0; i < 10; i++)
    outputCoords.push([14, (4.5 - i) * 1.3, 0]);

  return { inputCoords, hidden1Coords, hidden2Coords, hidden3Coords, hidden4Coords, outputCoords };
};

const COORDS = generateCoordinates();

// ─── Biological activation color: dark purple → magenta → amber → white ──────
// Mimics false-colour neuroscience imaging (like fMRI / calcium imaging)
const activationColor = (act: number, colorObj: THREE.Color): THREE.Color => {
  const v = Math.max(0, Math.min(1, act));
  if (v < 0.33) {
    // dark navy → vivid purple
    const t = v / 0.33;
    colorObj.setRGB(0.05 + t * 0.45, 0.01 + t * 0.04, 0.18 + t * 0.52);
  } else if (v < 0.66) {
    // vivid purple → hot magenta/pink
    const t = (v - 0.33) / 0.33;
    colorObj.setRGB(0.50 + t * 0.50, 0.05 + t * 0.20, 0.70 - t * 0.40);
  } else {
    // hot pink → amber → near-white
    const t = (v - 0.66) / 0.34;
    colorObj.setRGB(1.0, 0.25 + t * 0.70, 0.30 * (1 - t));
  }
  return colorObj;
};

// ─── Wave-progress hook ───────────────────────────────────────────────────────
const useWaveProgress = (currentStep: number) => {
  const waveRef  = useRef(1);
  const prevStep = useRef(currentStep);
  useFrame((_, delta) => {
    if (prevStep.current !== currentStep) {
      prevStep.current = currentStep;
      waveRef.current  = 0;
    }
    if (waveRef.current < 1)
      waveRef.current = Math.min(1, waveRef.current + delta / 1.2);
  });
  return waveRef;
};

// ─── Axon connections ─────────────────────────────────────────────────────────
const Axons: React.FC<{
  currentStep: number;
  waveRef: React.MutableRefObject<number>;
  layerActivations: LayerActivations;
}> = ({ currentStep, waveRef, layerActivations }) => {
  const lineRef = useRef<THREE.LineSegments>(null);

  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];

    const axon = (p1: [number,number,number], p2: [number,number,number], strength: number) => {
      pos.push(...p1, ...p2);
      const v = Math.min(strength, 1);
      // Warm bio-electric color: dim violet → bright amber
      const r = 0.3 + v * 0.70;
      const g = 0.05 + v * 0.55;
      const b = 0.55 - v * 0.45;
      col.push(r, g, b, r, g, b);
    };

    if (currentStep >= 3 && layerActivations.input.length > 0)
      layerActivations.input.map((v,i) => ({v,i})).filter(x => x.v > 0.05).slice(0, 55)
        .forEach(({v,i}) => COORDS.hidden1Coords.forEach(p2 => axon(COORDS.inputCoords[i], p2, v * 0.55)));

    if (currentStep >= 6 && layerActivations.hidden1.length > 0)
      layerActivations.hidden1.map((v,i) => ({v,i})).filter(x => x.v > 0).slice(0, 42)
        .forEach(({v,i}) => COORDS.hidden2Coords.forEach(p2 => axon(COORDS.hidden1Coords[i], p2, v * 0.65)));

    if (currentStep >= 9 && layerActivations.hidden2.length > 0)
      layerActivations.hidden2.map((v,i) => ({v,i})).filter(x => x.v > 0).slice(0, 32)
        .forEach(({v,i}) => COORDS.hidden3Coords.forEach(p2 => axon(COORDS.hidden2Coords[i], p2, v * 0.75)));

    if (currentStep >= 12 && layerActivations.hidden3.length > 0)
      layerActivations.hidden3.map((v,i) => ({v,i})).filter(x => x.v > 0).slice(0, 22)
        .forEach(({v,i}) => COORDS.hidden4Coords.forEach(p2 => axon(COORDS.hidden3Coords[i], p2, v * 0.85)));

    if (currentStep >= 15 && layerActivations.hidden4.length > 0)
      layerActivations.hidden4.forEach((v, i) => {
        if (v > 0) COORDS.outputCoords.forEach((p2, oi) =>
          axon(COORDS.hidden4Coords[i], p2, v * (layerActivations.output[oi] || 0) * 1.5));
      });

    return { positions: new Float32Array(pos), colors: new Float32Array(col) };
  }, [currentStep, layerActivations]);

  useFrame(state => {
    if (!lineRef.current) return;
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    // Slow, breathing pulse — like a living network
    mat.opacity = waveRef.current * (0.18 + Math.sin(state.clock.getElapsedTime() * 1.8) * 0.07);
  });

  if (positions.length === 0) return null;
  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};

// ─── Neuron layer — SPHERES, organic colors ───────────────────────────────────
const NeuronLayer: React.FC<{
  positions:   [number,number,number][];
  activations: number[];
  layerStep:   number;
  currentStep: number;
  waveRef:     React.MutableRefObject<number>;
  size?:       number;
}> = ({ positions, activations, layerStep, currentStep, waveRef, size = 0.14 }) => {
  const meshRef  = useRef<THREE.InstancedMesh>(null);
  const colorObj = useMemo(() => new THREE.Color(), []);
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  useFrame(state => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const isReached = currentStep >= layerStep;
    const revealFraction = !isReached ? 0 : currentStep === layerStep ? waveRef.current : 1;

    for (let idx = 0; idx < positions.length; idx++) {
      const revealed = (idx / positions.length) < revealFraction;
      const act = (revealed && activations[idx]) ? activations[idx] : 0;

      dummy.position.set(...positions[idx]);
      dummy.rotation.set(0, 0, 0);

      if (act > 0) {
        const intensity = Math.min(act, 2.0) / 2.0;
        // Organic firing pulse — like a neuron action potential
        const pulse = 1.0 + intensity * 0.55 * (0.5 + 0.5 * Math.sin(t * 3.5 + idx * 0.47));
        dummy.scale.setScalar(size * pulse);
        activationColor(intensity, colorObj);
      } else if (revealed) {
        // Resting neuron — dim, slightly larger than unrevealed
        dummy.scale.setScalar(size * 0.72);
        colorObj.setRGB(0.06, 0.02, 0.16);
      } else {
        // Not yet reached — very dim ghost
        dummy.scale.setScalar(size * 0.42);
        colorObj.setRGB(0.03, 0.01, 0.08);
      }

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx, dummy.matrix);
      meshRef.current.setColorAt(idx, colorObj);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, positions.length]}>
      {/* Smooth sphere = organic neuron cell body (soma) */}
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial roughness={0.4} metalness={0.05} />
    </instancedMesh>
  );
};

// ─── Floating ambient particles (synaptic vesicles feel) ──────────────────────
const AmbientParticles: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  const COUNT = 320;

  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      pos.push((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20);
      // Soft purple/violet tones
      col.push(0.18 + Math.random() * 0.2, 0.04 + Math.random() * 0.06, 0.30 + Math.random() * 0.25);
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col) };
  }, []);

  useFrame(state => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.012;
    meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.008) * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.55} depthWrite={false} />
    </points>
  );
};

// ─── Main scene ───────────────────────────────────────────────────────────────
const NeuralNetworkScene: React.FC<SceneProps> = ({ layerActivations, currentStep }) => {
  const waveRef  = useWaveProgress(currentStep);
  const orbitRef = useRef<any>(null);

  // Slow auto-rotate
  useFrame((_, delta) => {
    if (orbitRef.current && currentStep > 0)
      orbitRef.current.azimuthAngle += delta * 0.04;
  });

  return (
    <>
      {/* Deep purple-black — like the inside of a brain */}
      <color attach="background" args={['#06000f']} />
      <fog attach="fog" args={['#06000f', 28, 70]} />

      {/* Biological lighting: cool purple fill + warm amber highlights */}
      <ambientLight intensity={0.18} color="#3a0060" />
      <pointLight position={[0, 18, 0]}    intensity={3.5}  color="#9920e8" />
      <pointLight position={[-16, 3, 0]}   intensity={3.0}  color="#4400cc" />
      <pointLight position={[14, 3, 0]}    intensity={4.0}  color="#ff8c00" />
      <pointLight position={[0, -8, 12]}   intensity={1.5}  color="#cc00aa" />
      <pointLight position={[0, 0, -10]}   intensity={1.0}  color="#220066" />
      <directionalLight position={[5, 20, 10]} intensity={0.4} color="#ffffff" />

      <AmbientParticles />

      {/* Neuron layers — spheres with organic colors */}
      {/* Input retina: 784 tiny cells */}
      <NeuronLayer positions={COORDS.inputCoords}   activations={layerActivations.input}   layerStep={1}  currentStep={currentStep} waveRef={waveRef} size={0.10} />
      {/* Layer 1: pattern detectors — 256 cells */}
      <NeuronLayer positions={COORDS.hidden1Coords} activations={layerActivations.hidden1} layerStep={4}  currentStep={currentStep} waveRef={waveRef} size={0.20} />
      {/* Layer 2: feature combiners — 128 cells */}
      <NeuronLayer positions={COORDS.hidden2Coords} activations={layerActivations.hidden2} layerStep={7}  currentStep={currentStep} waveRef={waveRef} size={0.27} />
      {/* Layer 3: concept neurons — 64 cells */}
      <NeuronLayer positions={COORDS.hidden3Coords} activations={layerActivations.hidden3} layerStep={10} currentStep={currentStep} waveRef={waveRef} size={0.34} />
      {/* Layer 4: decision neurons — 32 cells */}
      <NeuronLayer positions={COORDS.hidden4Coords} activations={layerActivations.hidden4} layerStep={13} currentStep={currentStep} waveRef={waveRef} size={0.42} />
      {/* Output: 10 digit neurons */}
      <NeuronLayer positions={COORDS.outputCoords}  activations={layerActivations.output}  layerStep={16} currentStep={currentStep} waveRef={waveRef} size={0.52} />

      {/* Axon connections */}
      <Axons currentStep={currentStep} waveRef={waveRef} layerActivations={layerActivations} />

      {/* Output digit labels */}
      {COORDS.outputCoords.map((pos, idx) => {
        const isWinner = currentStep >= 18
          && layerActivations.output.length > 0
          && layerActivations.output[idx] === Math.max(...layerActivations.output);
        return (
          <group key={idx} position={[pos[0] + 1.5, pos[1], pos[2]]}>
            <Text
              color={isWinner ? '#ffcc00' : '#5522aa'}
              fontSize={isWinner ? 0.95 : 0.62}
              anchorX="left"
              anchorY="middle"
            >
              {`${idx}`}
            </Text>
            {currentStep >= 18 && layerActivations.output[idx] > 0.01 && (
              <Text
                color={isWinner ? '#ff8800' : '#331166'}
                fontSize={0.36}
                position={[isWinner ? 1.1 : 0.85, -0.06, 0]}
                anchorX="left"
                anchorY="middle"
              >
                {`${(layerActivations.output[idx] * 100).toFixed(0)}%`}
              </Text>
            )}
          </group>
        );
      })}

      <OrbitControls
        ref={orbitRef}
        enableZoom
        enablePan
        minDistance={10}
        maxDistance={55}
        makeDefault
      />
    </>
  );
};

// ─── Public wrapper ───────────────────────────────────────────────────────────
export const NeuralNetworkVisualization: React.FC<SceneProps> = (props) => (
  <div
    className="glass-panel rounded-2xl p-4 glow-border relative overflow-hidden"
    style={{ height: '100%', minHeight: '520px', background: '#06000f' }}
  >
    <Canvas
      camera={{ position: [0, 7, 28], fov: 54 }}
      style={{ width: '100%', height: '100%', outline: 'none' }}
      shadows
    >
      <NeuralNetworkScene {...props} />
    </Canvas>

    {/* HUD — human-friendly language */}
    <div className="absolute top-4 left-4 pointer-events-none bg-black/70 border border-purple-900/50 p-2.5 rounded-lg text-[10px] font-mono space-y-1 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
        <span className="text-white font-bold tracking-widest">LIVE NEURON VIEW</span>
      </div>
      <div className="text-purple-400/70">Rotate · Zoom · Explore</div>
    </div>

    {/* Color legend */}
    <div className="absolute top-4 right-4 pointer-events-none bg-black/70 border border-purple-900/50 p-2.5 rounded-lg text-[9px] font-mono space-y-1 backdrop-blur-sm">
      <div className="text-purple-300/60 uppercase tracking-wider mb-1">Activation</div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#0d0520]" />
        <span className="text-gray-500">Resting</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#8811d0]" />
        <span className="text-gray-400">Weak signal</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#e030c0]" />
        <span className="text-gray-300">Strong signal</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#ffaa10]" />
        <span className="text-white font-semibold">Highly Active</span>
      </div>
    </div>

    {/* Layer legend at bottom — human-readable names */}
    <div className="absolute bottom-4 left-4 pointer-events-none flex gap-4 flex-wrap">
      {[
        { label: 'Eyes',       sub: '784 cells', color: '#4433aa' },
        { label: 'Edges',      sub: '256 cells', color: '#6622cc' },
        { label: 'Shapes',     sub: '128 cells', color: '#aa22cc' },
        { label: 'Concepts',   sub: '64 cells',  color: '#cc3399' },
        { label: 'Decision',   sub: '32 cells',  color: '#ee7700' },
        { label: 'Answer',     sub: '10 cells',  color: '#ffcc00' },
      ].map(({ label, sub, color }) => (
        <div key={label} className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>{label}</span>
          <span className="text-[9px] text-gray-600">{sub}</span>
        </div>
      ))}
    </div>
  </div>
);
