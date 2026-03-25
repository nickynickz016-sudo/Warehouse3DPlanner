import React from 'react';
import { StorageStats, WarehouseConfig } from '../types';
import { Package, Maximize, BarChart3, Layers, TrendingUp, DollarSign, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  stats: StorageStats;
  config: WarehouseConfig;
  aiData: { suggestion: string; score: number; potentialRevenue?: string; maxCbm?: string } | null;
  isOpen: boolean;
  onToggle: () => void;
  onOpenSearch: () => void;
}

const StatsPanel: React.FC<Props> = ({ stats, config, aiData, isOpen, onToggle, onOpenSearch }) => {
  
  // stats.cubicVolume is in cm3. Convert to m3 (1,000,000 cm3 = 1 m3)
  const volumeM3 = Math.round(stats.cubicVolume / 1000000);
  
  // Simple calculation if AI hasn't run yet
  const estimatedCurrentRevenue = volumeM3 * config.pricePerCbm;

  const chartData = [
    { name: 'Pallets', value: stats.palletPositions },
    { name: 'Volume', value: volumeM3 }, 
    { name: 'Racks', value: stats.rackCount },
  ];

  return (
    <div className={`bg-white border-t border-gray-200 shadow-up z-20 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'h-64' : 'h-12'}`}>
      
      {/* Toggle Bar */}
      <div 
        className="h-12 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
          <div className="flex items-center gap-6">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand-accent" /> 
                  Warehouse Metrics
              </h3>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenSearch(); }}
                className="flex items-center gap-1.5 px-3 py-1 bg-brand-primary text-brand-accent rounded text-[10px] font-bold hover:bg-black transition-colors"
              >
                <Search size={12} /> SEARCH JOBS
              </button>
              
              {!isOpen && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Package size={12}/> <b>{stats.palletPositions}</b> pallets</span>
                      <span className="flex items-center gap-1"><Maximize size={12}/> <b>{volumeM3}</b> m³</span>
                      <span className="flex items-center gap-1 text-green-600"><DollarSign size={12}/> <b>{aiData?.potentialRevenue || estimatedCurrentRevenue.toLocaleString()}</b></span>
                  </div>
              )}
          </div>

          <button className="text-gray-400 hover:text-brand-primary">
              {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="flex-1 p-4 grid grid-cols-12 gap-6 overflow-hidden">
          {/* KPIs */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-brand-accent rounded-full">
                    <Package size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Capacity</p>
                    <h3 className="text-2xl font-bold text-black">{stats.palletPositions.toLocaleString()} <span className="text-sm font-normal">pallets</span></h3>
                </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-center gap-4">
                <div className="p-3 bg-brand-accent text-black rounded-full">
                    <Maximize size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-600 font-medium">Storage Volume</p>
                    <h3 className="text-2xl font-bold text-gray-800">{volumeM3.toLocaleString()} <span className="text-sm font-normal">m³</span></h3>
                </div>
            </div>

            {/* Revenue Card (Dynamic based on AI or Calc) */}
             <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-4 col-span-2">
                <div className="p-3 bg-green-600 text-white rounded-full">
                    <DollarSign size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-green-800 font-medium">Projected Revenue (Monthly)</p>
                        {aiData?.potentialRevenue && <span className="text-[10px] bg-green-200 text-green-900 px-2 rounded-full font-bold">AI MAXIMIZED</span>}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-green-900">
                            {aiData?.potentialRevenue || `AED ${estimatedCurrentRevenue.toLocaleString()}`}
                        </h3>
                        {aiData?.maxCbm && (
                            <span className="text-xs text-green-700 font-medium">
                               Potential: {aiData.maxCbm}
                            </span>
                        )}
                    </div>
                </div>
            </div>
          </div>

          {/* AI Insights & Chart */}
          <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-3 overflow-y-auto relative border-l-4 border-l-brand-accent">
                 <div className="absolute top-0 right-0 bg-brand-primary text-brand-accent text-[10px] px-2 py-1 rounded-bl font-bold">AI CONSULTANT</div>
                 <h4 className="font-bold text-black mb-2 text-sm flex items-center gap-2">
                    <TrendingUp size={14}/> Profit Maximization
                 </h4>
                 {aiData ? (
                     <div className="text-sm text-gray-600 space-y-2">
                         <p className="font-semibold text-green-600">Density Score: {aiData.score}/100</p>
                         <p>{aiData.suggestion}</p>
                     </div>
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center px-4">
                         <p>Enter Price per CBM in parameters and click <b>"AI Design & Profit Maximizer"</b> to generate a new layout.</p>
                     </div>
                 )}
            </div>

            <div className="bg-white border rounded-lg p-2 flex flex-col">
                <h4 className="font-bold text-gray-700 text-xs mb-1 ml-2">Metrics Overview</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFCC00" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#FFCC00" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#111111" fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default StatsPanel;