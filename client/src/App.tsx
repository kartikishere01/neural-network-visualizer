import React, { useState, useEffect, useRef } from 'react';
import { DrawingCanvas } from './components/DrawingCanvas';
import { NeuralNetworkVisualization } from './components/NeuralNetworkVisualization';
import { ActivationHeatmap } from './components/ActivationHeatmap';
import { ControlPanel } from './components/ControlPanel';
import { ConceptExplainer } from './components/Tooltip';
import { Brain, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';


export default function App() {
  const [isModelReady, setIsModelReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Predictions state
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [confidences, setConfidences] = useState<number[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);

  // Layer activations — 4 hidden layers
  const [layerActivations, setLayerActivations] = useState<{
    input:   number[];
    hidden1: number[];
    hidden2: number[];
    hidden3: number[];
    hidden4: number[];
    output:  number[];
  }>({
    input: [], hidden1: [], hidden2: [], hidden3: [], hidden4: [], output: []
  });

  // Animation states
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1200); // ms per layer — slow for immersive feel
  const [currentStep, setCurrentStep] = useState(0); // 0: idle, 1-8: animation steps
  const [isStepMode, setIsStepMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const animationTimerRef = useRef<any>(null);
  const latestActivationsRef = useRef(layerActivations);
  // Keep animationSpeed in a ref so triggerAutoWave always reads current value
  const animationSpeedRef = useRef(animationSpeed);

  // Keep refs up to date
  useEffect(() => { latestActivationsRef.current = layerActivations; }, [layerActivations]);
  useEffect(() => { animationSpeedRef.current = animationSpeed; }, [animationSpeed]);

  // Check backend and preload model status
  useEffect(() => {
    let cancelled = false;
    const checkModel = async () => {
      try {
        const res = await fetch('/api/model-info');
        if (!res.ok) throw new Error('Server returned error');
        const data = await res.json();
        if (data.status === 'ready') {
          if (!cancelled) setIsModelReady(true);
        } else {
          // Still training — clear any error and retry
          if (!cancelled) {
            setErrorMessage(null);
            setTimeout(checkModel, 2000);
          }
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Training the AI model for the first time — this takes about 90 seconds. The page will update automatically.');
          setTimeout(checkModel, 2000);
        }
      }
    };
    checkModel();
    return () => { cancelled = true; };
  }, []);


  // 18-step animation: each of 4 hidden layers gets scan+fire+activate phases
  // 0:idle  1-2:input  3:fire→h1  4-5:h1  6:fire→h2  7-8:h2  9:fire→h3  10-11:h3  12:fire→h4  13-14:h4  15:fire→out  16-17:output  18:done!
  const triggerAutoWave = () => {
    if (animationTimerRef.current) { clearTimeout(animationTimerRef.current); animationTimerRef.current = null; }
    setCurrentStep(1);
    let step = 1;
    const tick = () => {
      step++;
      setCurrentStep(step);
      if (step >= 18) {
        animationTimerRef.current = null;
      } else {
        animationTimerRef.current = setTimeout(tick, animationSpeedRef.current);
      }
    };
    animationTimerRef.current = setTimeout(tick, animationSpeedRef.current);
  };

  // Trigger when new drawing pixels are processed
  const handleDraw = async (pixels: number[]) => {
    if (!isModelReady) return;

    try {
      const res = await fetch('/api/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels })
      });
      const data = await res.json();
      
      if (data.error) {
        console.error('Inference error from server:', data.error);
        return;
      }

      setPrediction(data.prediction);
      setConfidence(data.confidence);
      setConfidences(data.confidences);
      setProcessingTime(data.processingTime);
      setLayerActivations(data.layerActivations);

      // Start automatic step animation if not in step-by-step mode
      if (!isStepMode && isAnimating) {
        triggerAutoWave();
      } else if (isStepMode) {
        setCurrentStep(1);
      } else {
        setCurrentStep(18);
      }
    } catch (err) {
      console.error('Failed to execute inference:', err);
    }
  };

  // Step mode helpers
  const stepForward = () => {
    if (currentStep < 18) {
      const next = currentStep + 1;
      setCurrentStep(next);
    }
  };

  const resetAnimation = () => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    // Always reset to step 0 (idle/waiting) so the UI shows "Waiting for you to draw..."
    setCurrentStep(0);
  };

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        clearInterval(animationTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col">
      {/* Top Professional Header Navigation */}
      <header className="border-b border-gray-900 bg-black/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00d9ff]/10 rounded-xl border border-[#00d9ff]/30 text-[#00d9ff] glow-active">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              HOW AI SEES YOUR DRAWING
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              A Simple 3D Visualizer of a Neural Network
            </p>
          </div>
        </div>

        {/* Global Connection / Status Indicators */}
        <div className="hidden sm:flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">AI STATUS:</span>
            {isModelReady ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                READY
              </span>
            ) : (
              <span className="text-amber-500 flex items-center gap-1 animate-pulse font-semibold">
                <Cpu className="w-3.5 h-3.5 animate-spin" />
                GETTING READY...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Warning notification banner if backend disconnected */}
        {!isModelReady && (
          <div className="col-span-1 lg:col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-4 flex gap-3 items-center text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Left Column: Input Drawing & Control Panel (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Simple 1-2-3 Explainer */}
          <div className="glass-panel rounded-2xl p-5 border border-gray-900 bg-black/40">
            <h3 className="text-xs font-bold text-[#00d9ff] uppercase tracking-wider mb-3">How it works:</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex gap-2">
                <span className="text-[#00d9ff] font-bold">1.</span>
                <span>Draw a single number (0-9) inside the box below.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#00d9ff] font-bold">2.</span>
                <span>Watch the signal travel through the 3D network on the right.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#00d9ff] font-bold">3.</span>
                <span>See the AI's final guess at the bottom of controls!</span>
              </li>
            </ul>
          </div>

          <DrawingCanvas onDraw={handleDraw} isModelReady={isModelReady} />
          
          <ControlPanel
            isAnimating={isAnimating}
            setIsAnimating={setIsAnimating}
            animationSpeed={animationSpeed}
            setAnimationSpeed={setAnimationSpeed}
            currentStep={currentStep}
            stepForward={stepForward}
            resetAnimation={resetAnimation}
            isStepMode={isStepMode}
            setIsStepMode={setIsStepMode}
            processingTime={processingTime}
            prediction={prediction}
            confidence={confidence}
          />
        </div>

        {/* Right Columns: 3D Visualization & Detail Panels (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main 3D Canvas Visualizer — give it an explicit height so the 3D canvas fills it */}
          <div className="flex flex-col gap-4" style={{ minHeight: '560px' }}>
            <div className="flex-1" style={{ minHeight: '500px' }}>
              <NeuralNetworkVisualization
                layerActivations={layerActivations}
                currentStep={currentStep}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="px-4 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 hover:border-[#00d9ff]/30 text-xs font-semibold rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer shadow-md"
              >
                {showAdvanced ? 'Hide Advanced Data' : 'Show Advanced Developer Tools'}
              </button>
            </div>
          </div>

          {/* Bottom Grid: Heatmap Display & Concept Explainer (hidden by default) */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <ActivationHeatmap
                hidden1={layerActivations.hidden1}
                hidden2={layerActivations.hidden2}
                hidden3={layerActivations.hidden3}
                hidden4={layerActivations.hidden4}
              />
              
              <ConceptExplainer />
            </div>
          )}

        </div>

      </main>

      {/* Footer Info */}
      <footer className="border-t border-gray-950 py-5 px-6 font-mono flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="text-white font-semibold tracking-wide">Kartik Singh</span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-600">&copy; {new Date().getFullYear()} All Rights Reserved</span>
        </div>
        <div className="text-[10px] text-gray-700">
          React 19 &middot; Three.js &middot; TensorFlow.js &middot; TypeScript
        </div>
      </footer>
    </div>
  );
}
