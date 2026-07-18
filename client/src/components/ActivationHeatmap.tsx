import React from 'react';

interface ActivationHeatmapProps {
  hidden1: number[];
  hidden2: number[];
  hidden3: number[];
  hidden4: number[];
}

export const ActivationHeatmap: React.FC<ActivationHeatmapProps> = ({ hidden1, hidden2, hidden3, hidden4 }) => {
  // Helper to calculate color based on activation value (usually 0 to infinity for ReLU)
  const getCellColor = (value: number) => {
    const normalized = Math.min(value / 3, 1);
    
    if (value === 0 || !value) return 'rgba(31, 41, 55, 0.4)'; // Gray for dead neurons
    
    const r = Math.round(normalized * 150);
    const g = Math.round(normalized * 217 + (1 - normalized) * 20);
    const b = Math.round(normalized * 255 + (1 - normalized) * 40);
    const a = 0.3 + normalized * 0.7;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const renderLayerGrid = (
    label: string,
    data: number[],
    cols: number,
    total: number,
    gridClass: string
  ) => {
    const activeCount = data ? data.filter(v => v > 0).length : 0;
    const activePct = total > 0 ? ((activeCount / total) * 100).toFixed(0) : '0';

    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-gray-300">{label}</span>
          <span className="text-[10px] text-[#00d9ff] font-mono">
            Active: {activeCount} / {total} ({activePct}%)
          </span>
        </div>
        {!data || data.length === 0 ? (
          <div className="h-16 bg-black/40 border border-gray-900 rounded-lg flex items-center justify-center text-xs text-gray-500 italic">
            Awaiting draw input...
          </div>
        ) : (
          <div 
            className={`grid gap-1 bg-black/45 p-2.5 border border-gray-900 rounded-xl ${gridClass}`}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {data.map((val, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-sm transition-all duration-300 relative group cursor-pointer"
                style={{
                  backgroundColor: getCellColor(val),
                  boxShadow: val > 0 ? `0 0 4px ${getCellColor(val)}` : 'none',
                }}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 bg-[#0c0c0c] border border-gray-800 text-[10px] text-gray-300 font-mono px-2 py-1 rounded shadow-xl pointer-events-none whitespace-nowrap">
                  Neuron #{idx}: <span className="text-[#00d9ff] font-bold">{val.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 glow-border h-full flex flex-col justify-between">
      <div>
        <h2 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
          <span>Activation Heatmaps</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Real-time Node States</span>
        </h2>

        {renderLayerGrid("Hidden Layer 1 (256 units)", hidden1, 16, 256, "max-w-full")}
        {renderLayerGrid("Hidden Layer 2 (128 units)", hidden2, 16, 128, "max-w-full")}
        {renderLayerGrid("Hidden Layer 3 (64 units)", hidden3, 8, 64, "max-w-[200px]")}
        {renderLayerGrid("Hidden Layer 4 (32 units)", hidden4, 8, 32, "max-w-[200px]")}
      </div>

      <div className="mt-2 border-t border-gray-800/80 pt-3 flex items-center justify-between text-[10px] text-gray-500 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-800 border border-gray-700"></span>
          <span>Dead (value = 0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#00d9ff] shadow-[0_0_4px_#00d9ff]"></span>
          <span>Active (&gt; 0)</span>
        </div>
      </div>
    </div>
  );
};
