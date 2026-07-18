import React from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ title, content, children }) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-72 p-4 bg-[#0c0c0c] border border-gray-800 rounded-xl shadow-2xl transition-all duration-200">
        <h4 className="text-xs font-bold text-[#00d9ff] uppercase tracking-wider mb-1 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          {title}
        </h4>
        <p className="text-xs text-gray-400 leading-relaxed font-normal">{content}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0c0c0c] z-50"></div>
      </div>
    </div>
  );
};

export const ConceptExplainer: React.FC = () => {
  const concepts = [
    {
      name: 'Input Layer',
      desc: 'Takes the 28x28 pixel grid drawn by the user and flattens it into a 1D array of 784 values. Values are normalized between 0 (black) and 1 (white).'
    },
    {
      name: 'Dense (Fully Connected)',
      desc: 'Every neuron in this layer connects to every neuron in the previous layer. Each connection has a weight that multiplies the incoming signal, and the neuron adds a bias value.'
    },
    {
      name: 'ReLU Activation',
      desc: 'Rectified Linear Unit: f(x) = max(0, x). It sets negative values to zero, introducing non-linearity to let the network learn complex non-linear boundary patterns.'
    },
    {
      name: 'Softmax Activation',
      desc: 'Applies to the final 10 output neurons, converting their raw values into a probability distribution summing to 1. This gives us the confidence percentage for digits 0-9.'
    }
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 glow-border mt-6">
      <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider text-[#00d9ff]/80">
        AI & Deep Learning Concepts
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {concepts.map((c, i) => (
          <div key={i} className="p-3 bg-[#0d0d0d] rounded-xl border border-gray-900 hover:border-gray-800 transition-colors">
            <h4 className="text-xs font-bold text-gray-200 mb-1">{c.name}</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
