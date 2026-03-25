import React from 'react';
import { WarehouseConfig, Level } from '../types';
import { calculateDimensionsFromArea } from '../services/warehouseLogic';
import { Settings, Truck, Box, Ruler, Thermometer, Layers, Plus, Trash2, Database, Eye, Check, Lock, DollarSign, TrendingUp, Edit2, Eraser, Save } from 'lucide-react';

interface Props {
  config: WarehouseConfig;
  onChange: (newConfig: WarehouseConfig) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
  isAdmin: boolean;
  onSave: () => void;
}

const InputPanel: React.FC<Props> = ({ config, onChange, onOptimize, isOptimizing, isAdmin, onSave }) => {

  const handleChange = (field: keyof WarehouseConfig | string, value: any) => {
    if (!isAdmin) return;

    const newConfig = { ...config };
    
    if (field === 'length' || field === 'width' || field === 'height' || field === 'totalArea') {
      newConfig.dimensions = { ...newConfig.dimensions, [field]: Number(value) };
      if (field === 'totalArea') {
        const { length, width } = calculateDimensionsFromArea(Number(value));
        newConfig.dimensions.length = length;
        newConfig.dimensions.width = width;
      } else {
        // Recalculate area in m2 (cm * cm / 10000)
        newConfig.dimensions.totalArea = Math.round((newConfig.dimensions.length * newConfig.dimensions.width) / 10000);
      }
    } else if (field.startsWith('zones.')) {
        const zoneKey = field.split('.')[1] as keyof typeof config.zones;
        newConfig.zones = { ...newConfig.zones, [zoneKey]: Number(value) };
    } else {
      (newConfig as any)[field] = value;
    }
    onChange(newConfig);
  };

  const addLevel = () => {
    if (!isAdmin) return;
    const newLevel: Level = {
      id: `level-${Date.now()}`,
      name: `Level ${config.levels.length + 1}`,
      elevation: config.levels.length * 400, // 4m
      height: 400, // 4m
      totalVolumeCapacity: 1000, // Default m3
      items: []
    };
    const newConfig = { ...config, levels: [...config.levels, newLevel], activeLevelId: newLevel.id };
    onChange(newConfig);
  };

  const removeLevel = (id: string) => {
    if (!isAdmin) return;
    if (config.levels.length <= 1) return;
    const newLevels = config.levels.filter(l => l.id !== id);
    const newConfig = { 
        ...config, 
        levels: newLevels,
        activeLevelId: newLevels[0].id // Safety fallback to ground
    };
    onChange(newConfig);
  };

  const clearLevelItems = (id: string) => {
      if (!isAdmin) return;
      if (window.confirm("Are you sure you want to clear all items in this level?")) {
          const newLevels = config.levels.map(l => {
              if (l.id === id) return { ...l, items: [] };
              return l;
          });
          onChange({ ...config, levels: newLevels, mode: 'custom' });
      }
  };

  const updateLevel = (id: string, field: keyof Level, value: any) => {
      if (!isAdmin) return;
      const newLevels = config.levels.map(l => {
          if (l.id === id) return { ...l, [field]: value };
          return l;
      });
      onChange({ ...config, levels: newLevels });
  };

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200 shadow-lg flex flex-col font-sans">
      <div className="p-4 bg-brand-primary text-white sticky top-0 z-10 border-b-4 border-brand-accent">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-brand-accent">
            <Settings size={20} className="text-brand-accent" />
            Parameters
            </h2>
            {isAdmin && (
                <button 
                    onClick={onSave}
                    className="bg-brand-accent text-black p-1.5 rounded hover:bg-yellow-400 transition-colors"
                    title="Save Changes"
                >
                    <Save size={16} />
                </button>
            )}
        </div>
        <div className="flex justify-between items-center mt-1">
             <p className="text-xs text-gray-400">Define your warehouse specs</p>
             {!isAdmin && <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1"><Lock size={8}/> Read Only</span>}
        </div>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Warehouse Name */}
        <section>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project Name</label>
            <div className="relative">
                <input 
                    type="text" 
                    value={config.name}
                    disabled={!isAdmin}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-sm border p-2 pr-8 font-bold text-gray-800 disabled:bg-gray-100"
                />
                <Edit2 size={14} className="absolute right-2 top-2.5 text-gray-400" />
            </div>
        </section>

        {/* Financials - NEW (AED) */}
        <section className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
             <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-brand-accent fill-black" /> Financial Goals
            </h3>
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Price per CBM (AED)</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-500 font-bold">AED</span>
                    <input 
                        type="number" 
                        value={config.pricePerCbm}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('pricePerCbm', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 pl-12 disabled:bg-gray-100 disabled:text-gray-500 font-mono font-bold"
                    />
                     <span className="absolute right-3 top-2 text-xs text-gray-400">/ m³</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">AI will generate a design based on this yield.</p>
            </div>
        </section>

        {/* Levels Management */}
        <section className="bg-gray-100 p-3 rounded-lg border border-gray-200">
             <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers size={16} className="text-brand-accent fill-black" /> Levels / Floors
            </h3>
            <div className="space-y-3">
                {config.levels.map((level, idx) => {
                    const isActive = config.activeLevelId === level.id;
                    return (
                        <div key={level.id} className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${isActive ? 'bg-white border-brand-accent shadow-md ring-1 ring-brand-accent/50' : 'bg-gray-50 border-gray-200 opacity-80 hover:opacity-100'}`}>
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => onChange({...config, activeLevelId: level.id})}
                                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${isActive ? 'bg-brand-accent text-black' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                >
                                    {isActive ? <Check size={12}/> : <Eye size={12}/>}
                                    {isActive ? 'Active' : 'View'}
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {isAdmin && (
                                        <button 
                                            onClick={() => clearLevelItems(level.id)} 
                                            title="Clear All Items in Level"
                                            className="text-gray-400 hover:text-orange-500 p-1"
                                        >
                                            <Eraser size={14} />
                                        </button>
                                    )}
                                    {config.levels.length > 1 && isAdmin && (
                                        <button onClick={() => removeLevel(level.id)} className="text-gray-400 hover:text-red-600 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="col-span-2">
                                    <input 
                                        type="text" 
                                        value={level.name} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'name', e.target.value)}
                                        className="text-xs border rounded p-1.5 w-full font-medium disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="Floor Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Height (cm)</label>
                                    <input 
                                        type="number" 
                                        value={level.height} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'height', Number(e.target.value))}
                                        className="text-xs border rounded p-1 w-full disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-1"><Database size={8}/> Cap (m³)</label>
                                    <input 
                                        type="number" 
                                        value={level.totalVolumeCapacity || 0} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'totalVolumeCapacity', Number(e.target.value))}
                                        className="text-xs border rounded p-1 w-full bg-yellow-50 text-yellow-800 font-bold border-yellow-200 disabled:opacity-70"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isAdmin && (
                    <button onClick={addLevel} className="w-full py-2 text-xs bg-black text-brand-accent border border-black rounded flex items-center justify-center gap-1 hover:bg-brand-accent hover:text-black transition-colors font-bold">
                        <Plus size={14} /> Add New Level
                    </button>
                )}
            </div>
        </section>

        {/* Visual Settings */}
        <section className="bg-blue-50 p-3 rounded-lg border border-blue-200">
             <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Ruler size={16} className="text-blue-600" /> Visual Settings
            </h3>
            <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">Label Font Size (px)</label>
                <div className="flex items-center gap-3">
                    <input 
                        type="range" 
                        min="6" 
                        max="24" 
                        step="1"
                        value={config.labelFontSize || 10}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('labelFontSize', e.target.value)}
                        className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm font-bold text-blue-900 w-8">{config.labelFontSize || 10}px</span>
                </div>
                <p className="text-[10px] text-blue-600 mt-1">Adjust label size for better visibility on 2D view.</p>
            </div>
        </section>

        {/* Dimensions Section */}
        <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Ruler size={16} className="text-brand-primary" /> Base Dimensions
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700">Total Area (m²)</label>
                    <input 
                        type="number" 
                        value={config.dimensions.totalArea}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('totalArea', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Length (cm)</label>
                    <input 
                        type="number" 
                        value={config.dimensions.length}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('length', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Width (cm)</label>
                    <input 
                        type="number" 
                        value={config.dimensions.width}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('width', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
            </div>
        </section>

        {/* Storage Config */}
        <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Box size={16} className="text-brand-primary" /> Storage Configuration
            </h3>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700">Storage Type</label>
                    <select 
                        value={config.storageType}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('storageType', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        <option>Pallet Racking</option>
                        <option>Fine Arts Racking</option>
                        <option>Bulk Storage</option>
                        <option>Mezzanine</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                     <input 
                        type="checkbox"
                        checked={config.temperatureControlled}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('temperatureControlled', e.target.checked)}
                        className="h-4 w-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent text-yellow-500 disabled:opacity-50"
                     />
                     <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Thermometer size={12} /> Temperature Controlled
                     </label>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700">Aisle Width (cm)</label>
                    <input 
                        type="number" 
                        value={config.aisleWidth}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('aisleWidth', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
            </div>
        </section>

        <button
            onClick={onOptimize}
            disabled={isOptimizing}
            className="w-full mt-4 bg-brand-accent text-black py-3 px-4 rounded shadow hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 font-bold border border-black/10"
        >
            <TrendingUp size={18} />
            {isOptimizing ? 'Analyzing & Designing...' : 'AI Design & Profit Maximizer'}
        </button>

      </div>
      
      <div className="mt-auto p-4 border-t text-xs text-gray-400 text-center">
        Writer Warehouse Planner Pro v1.0
      </div>
    </div>
  );
};

export default InputPanel;