import React, { useState } from 'react';
import { WarehouseConfig, Level, StorageStats, GeminiOptimizationResult, BRANCH_MAP, BRANCH_LIST, BranchCode, StorageType, ForkliftType } from '../types';
import { calculateDimensionsFromArea, getLevelOccupiedCbm, getLevelFinancialSummary, getLevelMonthlyRevenue } from '../services/warehouseLogic';
import { Settings, Truck, Box, Ruler, Thermometer, Layers, Plus, Trash2, Database, Eye, Check, Lock, Coins, TrendingUp, Edit2, Eraser, Save, BarChart3, ChevronDown, ChevronUp, Package, Maximize, Sparkles, Building2, Globe, Warehouse, Target, DollarSign, Calculator, Percent, ArrowUpRight, Copy } from 'lucide-react';

interface Props {
  config: WarehouseConfig;
  onChange: (newConfig: WarehouseConfig) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
  isAdmin: boolean;
  onSave: () => void;
  stats: StorageStats;
  aiResult: GeminiOptimizationResult | null;
  isStatsOpen: boolean;
  onToggleStats: () => void;
}

const InputPanel: React.FC<Props> = ({ config, onChange, onOptimize, isOptimizing, isAdmin, onSave, stats, aiResult, isStatsOpen, onToggleStats }) => {
  const currency = config.branch ? (BRANCH_MAP[config.branch]?.currency || 'AED') : 'AED';
  const [selectedFloorForFinance, setSelectedFloorForFinance] = useState<string>('all');
  const [copiedPriceNotice, setCopiedPriceNotice] = useState<string | null>(null);

  const handleChange = (field: keyof WarehouseConfig | string, value: any) => {
    if (!isAdmin) return;

    const newConfig = { ...config };
    
    if (field === 'length' || field === 'width' || field === 'height' || field === 'totalArea') {
      newConfig.dimensions = { ...newConfig.dimensions, [field]: Number(value) };
      if (field === 'totalArea') {
        const { length, width } = calculateDimensionsFromArea(Number(value));
        newConfig.dimensions.length = length;
        newConfig.dimensions.width = width;
      } else if (field === 'length' || field === 'width') {
        // Recalculate area in m2 (cm * cm / 10000)
        newConfig.dimensions.totalArea = Math.round((newConfig.dimensions.length * newConfig.dimensions.width) / 10000);
      }
    } else if (field.startsWith('zones.')) {
        const zoneKey = field.split('.')[1] as keyof typeof config.zones;
        newConfig.zones = { ...newConfig.zones, [zoneKey]: Number(value) };
    } else if (field === 'docks' || field === 'aisleWidth' || field === 'columnSpacing' || field === 'pricePerCbm' || field === 'labelFontSize') {
      (newConfig as any)[field] = Number(value);
    } else {
      (newConfig as any)[field] = value;
    }
    onChange(newConfig);
  };

  const addLevel = () => {
    if (!isAdmin) return;
    const defaultPrice = config.pricePerCbm || 25;
    const defaultCap = 1000;
    const newLevel: Level = {
      id: `level-${Date.now()}`,
      name: `Level ${config.levels.length + 1}`,
      elevation: config.levels.length * 400, // 4m
      height: 400, // 4m
      totalVolumeCapacity: defaultCap, // Default m3
      items: [],
      pricePerCbm: defaultPrice,
      targetRevenue: Math.round(defaultCap * defaultPrice * 0.85),
      operatingCost: 6500,
      targetOccupancyRate: 85
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

  const [confirmClearLevelId, setConfirmClearLevelId] = useState<string | null>(null);

  const clearLevelItems = (id: string) => {
      if (!isAdmin) return;
      if (confirmClearLevelId === id) {
          const newLevels = config.levels.map(l => {
              if (l.id === id) return { ...l, items: [] };
              return l;
          });
          onChange({ ...config, levels: newLevels, mode: 'custom' });
          setConfirmClearLevelId(null);
      } else {
          setConfirmClearLevelId(id);
          setTimeout(() => setConfirmClearLevelId(null), 3500);
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
        
        {/* Warehouse Name & Branch */}
        <section className="space-y-3">
            <div>
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
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                    <Globe size={13} className="text-brand-primary" /> Operating Branch
                </label>
                <select
                    value={config.branch || 'UAE'}
                    disabled={!isAdmin}
                    onChange={(e) => handleChange('branch', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-sm border p-2 font-bold text-gray-800 bg-white disabled:bg-gray-100"
                >
                    {BRANCH_LIST.map(b => (
                        <option key={b.code} value={b.code}>
                            {b.flag} {b.name} ({b.currency})
                        </option>
                    ))}
                </select>
            </div>
        </section>

        {/* Warehouse Metrics Toggle Section */}
        <section className="border border-brand-accent/30 rounded-lg overflow-hidden bg-white shadow-sm">
            <button 
                onClick={onToggleStats}
                className={`w-full p-3 flex items-center justify-between transition-colors ${isStatsOpen ? 'bg-brand-primary text-white' : 'bg-brand-accent/10 text-brand-primary hover:bg-brand-accent/20'}`}
            >
                <div className="flex items-center gap-2">
                    <BarChart3 size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Warehouse Metrics</span>
                </div>
                {isStatsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {isStatsOpen && (
                <div className="p-4 space-y-4 bg-white animate-in slide-in-from-top duration-200">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2 rounded border border-gray-200 text-center">
                            <Package size={14} className="mx-auto mb-1 text-gray-400" />
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Pallets</p>
                            <p className="text-sm font-black text-gray-800">{stats.palletPositions.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-100 text-center">
                            <Maximize size={14} className="mx-auto mb-1 text-blue-400" />
                            <p className="text-[10px] text-blue-500 font-bold uppercase">Volume</p>
                            <p className="text-sm font-black text-blue-800">{(stats.cubicVolume / 1000000).toFixed(1)} m³</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded border border-green-100 text-center col-span-2">
                            <div className="flex justify-between items-center px-1">
                                <div className="text-left">
                                    <p className="text-[10px] text-green-600 font-bold uppercase">Current Load</p>
                                    <p className="text-sm font-black text-green-800">{stats.occupiedVolume.toLocaleString()} m³</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Utility</p>
                                    <p className="text-sm font-black text-brand-primary">
                                        {Math.round((stats.occupiedVolume / (stats.cubicVolume / 1000000)) * 100 || 0)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-primary/5 p-3 rounded border border-brand-primary/10">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Est. Monthly Revenue</span>
                            <Coins size={12} className="text-green-600" />
                        </div>
                        <p className="text-lg font-black text-brand-primary">
                            {currency} {(stats.occupiedVolume * (config.pricePerCbm || 0)).toLocaleString()}
                        </p>
                        {aiResult?.potentialRevenue && (
                            <div className="mt-2 text-[9px] bg-green-100 text-green-800 p-1 rounded border border-green-200 font-bold flex items-center gap-1">
                                <Sparkles size={10} /> AI Max Potential: {aiResult.potentialRevenue}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>

        {/* Per-Floor Financial Goals */}
        <section className="bg-gradient-to-br from-yellow-50 to-amber-50/70 p-3.5 rounded-xl border border-yellow-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <Coins size={16} className="text-brand-accent fill-black" /> Floor Financial Goals
                </h3>
                <span className="text-[10px] font-black bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                    {config.levels.length} {config.levels.length === 1 ? 'Floor' : 'Floors'}
                </span>
            </div>

            {copiedPriceNotice && (
                <div className="mb-2.5 text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 animate-in fade-in">
                    <Check size={14} className="text-emerald-700" /> {copiedPriceNotice}
                </div>
            )}

            {/* Floor Navigation Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-3 custom-scrollbar text-xs">
                <button
                    type="button"
                    onClick={() => setSelectedFloorForFinance('all')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold shrink-0 transition-all text-xs flex items-center gap-1.5 ${
                        selectedFloorForFinance === 'all'
                            ? 'bg-brand-primary text-brand-accent shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <Building2 size={12} /> All Floors Overview
                </button>
                {config.levels.map(l => {
                    const isSelected = selectedFloorForFinance === l.id;
                    const isCanvasActive = config.activeLevelId === l.id;
                    const floorSummary = getLevelFinancialSummary(l, config.pricePerCbm);
                    return (
                        <button
                            key={l.id}
                            type="button"
                            onClick={() => setSelectedFloorForFinance(l.id)}
                            className={`px-2.5 py-1.5 rounded-lg font-bold shrink-0 transition-all text-xs flex items-center gap-1.5 ${
                                isSelected
                                    ? 'bg-brand-primary text-brand-accent shadow-sm'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            <span>{l.name}</span>
                            <span className="text-[10px] font-mono opacity-80 font-normal">
                                {currency} {floorSummary.pricePerCbm}
                            </span>
                            {isCanvasActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active Canvas Floor" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* VIEW MODE: ALL FLOORS OVERVIEW */}
            {selectedFloorForFinance === 'all' && (() => {
                const totals = config.levels.reduce((acc, level) => {
                    const s = getLevelFinancialSummary(level, config.pricePerCbm);
                    acc.targetRevenue += s.targetRevenue;
                    acc.actualMonthlyRevenue += s.actualMonthlyRevenue;
                    acc.operatingCost += s.operatingCost;
                    acc.totalCapacity += s.totalVolumeCapacity;
                    acc.occupiedCbm += s.occupiedCbm;
                    acc.potentialRevenue += s.potentialCapacityRevenue;
                    return acc;
                }, {
                    targetRevenue: 0,
                    actualMonthlyRevenue: 0,
                    operatingCost: 0,
                    totalCapacity: 0,
                    occupiedCbm: 0,
                    potentialRevenue: 0
                });

                const totalTargetProfit = totals.targetRevenue - totals.operatingCost;
                const totalActualProfit = totals.actualMonthlyRevenue - totals.operatingCost;
                const totalAchievement = totals.targetRevenue > 0
                    ? Math.min(999, Math.round((totals.actualMonthlyRevenue / totals.targetRevenue) * 100))
                    : 0;

                return (
                    <div className="space-y-3">
                        {/* Warehouse Combined Financial Summary Card */}
                        <div className="bg-white rounded-xl p-3 border border-yellow-300/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                                <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                    <Target size={12} className="text-amber-600" /> Combined Warehouse Goals
                                </span>
                                <span className="font-mono font-black text-amber-800 text-[11px]">
                                    {totalAchievement}% Achieved
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="text-[9px] font-bold text-gray-500 uppercase">Total Monthly Target</div>
                                    <div className="text-sm font-black text-gray-900 font-mono">
                                        {currency} {totals.targetRevenue.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                    <div className="text-[9px] font-bold text-emerald-700 uppercase">Actual Active Revenue</div>
                                    <div className="text-sm font-black text-emerald-800 font-mono">
                                        {currency} {totals.actualMonthlyRevenue.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                    <div className="text-[9px] font-bold text-amber-700 uppercase">Monthly Operating Budget</div>
                                    <div className="text-sm font-black text-amber-900 font-mono">
                                        {currency} {totals.operatingCost.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    <div className="text-[9px] font-bold text-blue-700 uppercase">Target Net Profit</div>
                                    <div className="text-sm font-black text-blue-900 font-mono">
                                        {currency} {totalTargetProfit.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Overall Progress Bar */}
                            <div className="space-y-1 pt-1">
                                <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                    <span>Goal Progress ({totals.actualMonthlyRevenue.toLocaleString()} / {totals.targetRevenue.toLocaleString()})</span>
                                    <span>{totalAchievement}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${totalAchievement >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`}
                                        style={{ width: `${Math.min(100, totalAchievement)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Per-Floor Cards with Inline Inputs */}
                        <div className="space-y-2.5">
                            <div className="text-[11px] font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                                <span>Floor by Floor Breakdown</span>
                                <span className="text-[9px] text-gray-500 font-normal">Edit numbers per floor below</span>
                            </div>

                            {config.levels.map((level, idx) => {
                                const summary = getLevelFinancialSummary(level, config.pricePerCbm);
                                const isCanvasActive = config.activeLevelId === level.id;

                                return (
                                    <div
                                        key={level.id}
                                        className={`p-3 rounded-xl border transition-all ${
                                            isCanvasActive
                                                ? 'bg-white border-brand-accent shadow-md ring-1 ring-brand-accent/40'
                                                : 'bg-white/90 border-gray-200 hover:border-amber-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-md bg-brand-primary text-brand-accent font-mono font-black text-xs flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-bold text-xs text-gray-900">{level.name}</span>
                                                {isCanvasActive && (
                                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded uppercase">
                                                        Active Floor
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {!isCanvasActive && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onChange({ ...config, activeLevelId: level.id })}
                                                        className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-brand-accent hover:text-black font-bold transition-colors"
                                                    >
                                                        Make Active
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFloorForFinance(level.id)}
                                                    className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold transition-colors flex items-center gap-0.5"
                                                >
                                                    Configure <ArrowUpRight size={10} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 4 Financial Inputs for this floor */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {/* Floor Target Price per CBM */}
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-600 uppercase mb-0.5">
                                                    Target Price / CBM
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-[10px] font-bold text-gray-400">
                                                        {currency}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={level.pricePerCbm !== undefined ? level.pricePerCbm : config.pricePerCbm}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => updateLevel(level.id, 'pricePerCbm', Number(e.target.value))}
                                                        className="w-full text-xs border rounded-md p-1.5 pl-9 font-mono font-bold border-gray-300 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent disabled:bg-gray-100"
                                                        placeholder="25"
                                                    />
                                                    <span className="absolute right-2 top-1.5 text-[9px] text-gray-400 font-medium">/m³</span>
                                                </div>
                                            </div>

                                            {/* Floor Target Monthly Revenue */}
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-600 uppercase mb-0.5">
                                                    Monthly Goal
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-[10px] font-bold text-gray-400">
                                                        {currency}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={level.targetRevenue !== undefined ? level.targetRevenue : summary.targetRevenue}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => updateLevel(level.id, 'targetRevenue', Number(e.target.value))}
                                                        className="w-full text-xs border rounded-md p-1.5 pl-9 font-mono font-bold border-gray-300 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent disabled:bg-gray-100"
                                                        placeholder="20000"
                                                    />
                                                </div>
                                            </div>

                                            {/* Floor Operating Budget */}
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-600 uppercase mb-0.5">
                                                    Operating Budget
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-[10px] font-bold text-gray-400">
                                                        {currency}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={level.operatingCost !== undefined ? level.operatingCost : 0}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => updateLevel(level.id, 'operatingCost', Number(e.target.value))}
                                                        className="w-full text-xs border rounded-md p-1.5 pl-9 font-mono font-bold border-gray-300 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent disabled:bg-gray-100"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Floor Target Occupancy % */}
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-600 uppercase mb-0.5">
                                                    Target Occupancy %
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={level.targetOccupancyRate !== undefined ? level.targetOccupancyRate : 85}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => updateLevel(level.id, 'targetOccupancyRate', Number(e.target.value))}
                                                        className="w-full text-xs border rounded-md p-1.5 pr-6 font-mono font-bold border-gray-300 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent disabled:bg-gray-100"
                                                        placeholder="85"
                                                    />
                                                    <span className="absolute right-2 top-1.5 text-[10px] text-gray-400 font-bold">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Floor Progress & Yield Strip */}
                                        <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1">
                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                <span className="text-gray-500">
                                                    Actual Revenue: <span className="text-emerald-700 font-mono font-black">{currency} {summary.actualMonthlyRevenue.toLocaleString()}</span> / {summary.targetRevenue.toLocaleString()}
                                                </span>
                                                <span className={`font-mono font-black ${summary.achievementPercent >= 100 ? 'text-emerald-700' : 'text-amber-800'}`}>
                                                    {summary.achievementPercent}% Goal
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${summary.achievementPercent >= 100 ? 'bg-emerald-500' : 'bg-brand-accent'}`}
                                                    style={{ width: `${Math.min(100, summary.achievementPercent)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* VIEW MODE: SINGLE FLOOR FOCUS */}
            {selectedFloorForFinance !== 'all' && (() => {
                const currentFloor = config.levels.find(l => l.id === selectedFloorForFinance) || config.levels[0];
                if (!currentFloor) return null;
                const summary = getLevelFinancialSummary(currentFloor, config.pricePerCbm);
                const isCanvasActive = config.activeLevelId === currentFloor.id;

                const auto85Revenue = Math.round((currentFloor.totalVolumeCapacity || 0) * (currentFloor.pricePerCbm ?? config.pricePerCbm) * 0.85);

                return (
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-yellow-300 shadow-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div>
                                <div className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                                    <span>{currentFloor.name} Financial Settings</span>
                                    {isCanvasActive && (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded uppercase">
                                            Canvas Active
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    Capacity: {currentFloor.totalVolumeCapacity} m³ • Elevation: {currentFloor.elevation} cm
                                </div>
                            </div>

                            {!isCanvasActive && (
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...config, activeLevelId: currentFloor.id })}
                                    className="text-[10px] px-2.5 py-1 rounded bg-brand-primary text-brand-accent font-bold hover:bg-black transition-colors"
                                >
                                    Activate Canvas
                                </button>
                            )}
                        </div>

                        {/* Input 1: Floor Target Price per CBM */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-gray-800">
                                    Target Price per CBM ({currency}/m³)
                                </label>
                                {isAdmin && config.levels.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const p = currentFloor.pricePerCbm ?? config.pricePerCbm ?? 25;
                                            const newLevels = config.levels.map(l => ({ ...l, pricePerCbm: p }));
                                            onChange({ ...config, pricePerCbm: p, levels: newLevels });
                                            setCopiedPriceNotice(`Applied ${currency} ${p}/m³ to all floors!`);
                                            setTimeout(() => setCopiedPriceNotice(null), 3000);
                                        }}
                                        className="text-[10px] text-amber-700 hover:text-black font-bold flex items-center gap-1 underline decoration-amber-400"
                                        title="Copy this price to all floors"
                                    >
                                        <Copy size={10} /> Apply to all floors
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-sm text-gray-500 font-bold">{currency}</span>
                                <input
                                    type="number"
                                    value={currentFloor.pricePerCbm !== undefined ? currentFloor.pricePerCbm : config.pricePerCbm}
                                    disabled={!isAdmin}
                                    onChange={(e) => updateLevel(currentFloor.id, 'pricePerCbm', Number(e.target.value))}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 pl-12 font-mono font-bold disabled:bg-gray-100"
                                    placeholder="25"
                                />
                                <span className="absolute right-3 top-2 text-xs text-gray-400">/ m³</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Specific billing rate for {currentFloor.name}. Used when creating shipper contracts on this floor.
                            </p>
                        </div>

                        {/* Input 2: Floor Monthly Revenue Goal */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-gray-800">
                                    Target Monthly Revenue ({currency})
                                </label>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => updateLevel(currentFloor.id, 'targetRevenue', auto85Revenue)}
                                        className="text-[10px] text-blue-700 hover:text-black font-bold flex items-center gap-1 underline decoration-blue-300"
                                        title="Set target to 85% capacity yield"
                                    >
                                        <Calculator size={10} /> Auto-fill 85% ({currency} {auto85Revenue.toLocaleString()})
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-sm text-gray-500 font-bold">{currency}</span>
                                <input
                                    type="number"
                                    value={currentFloor.targetRevenue !== undefined ? currentFloor.targetRevenue : summary.targetRevenue}
                                    disabled={!isAdmin}
                                    onChange={(e) => updateLevel(currentFloor.id, 'targetRevenue', Number(e.target.value))}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 pl-12 font-mono font-bold disabled:bg-gray-100"
                                    placeholder="20000"
                                />
                                <span className="absolute right-3 top-2 text-xs text-gray-400">/ month</span>
                            </div>
                        </div>

                        {/* Input 3: Floor Monthly Operating Cost / Budget */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">
                                    Operating Budget ({currency})
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-bold">{currency}</span>
                                    <input
                                        type="number"
                                        value={currentFloor.operatingCost !== undefined ? currentFloor.operatingCost : 0}
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(currentFloor.id, 'operatingCost', Number(e.target.value))}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-xs border p-2 pl-10 font-mono font-bold disabled:bg-gray-100"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-800 mb-1">
                                    Occupancy Goal (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={currentFloor.targetOccupancyRate !== undefined ? currentFloor.targetOccupancyRate : 85}
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(currentFloor.id, 'targetOccupancyRate', Number(e.target.value))}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-xs border p-2 pr-7 font-mono font-bold disabled:bg-gray-100"
                                        placeholder="85"
                                    />
                                    <span className="absolute right-2.5 top-2 text-xs text-gray-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Real-Time Live Performance Dashboard for this Floor */}
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-wider flex items-center justify-between">
                                <span>{currentFloor.name} Live Financial Analytics</span>
                                <span className={`font-mono font-black ${summary.achievementPercent >= 100 ? 'text-emerald-700' : 'text-amber-800'}`}>
                                    {summary.achievementPercent}% of Goal
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Actual Monthly</div>
                                    <div className="text-sm font-black text-emerald-700 font-mono">
                                        {currency} {summary.actualMonthlyRevenue.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-gray-400">{summary.activeJobsCount} active contracts</div>
                                </div>

                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Target Monthly Goal</div>
                                    <div className="text-sm font-black text-gray-900 font-mono">
                                        {currency} {summary.targetRevenue.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-gray-400">Yield target</div>
                                </div>

                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Target Net Profit</div>
                                    <div className="text-sm font-black text-blue-700 font-mono">
                                        {currency} {summary.targetProfit.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-gray-400">After overhead</div>
                                </div>

                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">100% Capacity Max</div>
                                    <div className="text-sm font-black text-brand-primary font-mono">
                                        {currency} {summary.potentialCapacityRevenue.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-gray-400">{currentFloor.totalVolumeCapacity} m³ total</div>
                                </div>
                            </div>

                            {/* Revenue Goal Progress Bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                    <span>Goal Achievement</span>
                                    <span>{summary.actualMonthlyRevenue.toLocaleString()} / {summary.targetRevenue.toLocaleString()} {currency}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${summary.achievementPercent >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`}
                                        style={{ width: `${Math.min(100, summary.achievementPercent)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Physical Volume Occupancy */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                    <span>Floor CBM Occupancy</span>
                                    <span>{summary.occupiedCbm} m³ / {summary.totalVolumeCapacity} m³ ({summary.occupancyPercent}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${summary.occupancyPercent > 90 ? 'bg-red-500' : 'bg-brand-accent'}`}
                                        style={{ width: `${Math.min(100, summary.occupancyPercent)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Warehouse Global Baseline Reference */}
            <div className="mt-3 pt-2.5 border-t border-yellow-200/80 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Warehouse Baseline Fallback:
                </span>
                <div className="flex items-center gap-1 font-mono font-bold text-gray-700">
                    <span>{currency}</span>
                    <input
                        type="number"
                        value={config.pricePerCbm}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('pricePerCbm', e.target.value)}
                        className="w-16 p-1 text-xs border rounded font-mono font-bold text-right border-gray-300 disabled:bg-gray-100"
                    />
                    <span className="text-[10px] text-gray-400">/ m³</span>
                </div>
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
                                            title={confirmClearLevelId === level.id ? "Click again to confirm clear" : "Clear All Items in Level"}
                                            className={`p-1 rounded text-xs transition-all flex items-center gap-1 ${confirmClearLevelId === level.id ? 'bg-red-500 text-white font-bold px-2 py-0.5' : 'text-gray-400 hover:text-orange-500'}`}
                                        >
                                            {confirmClearLevelId === level.id ? 'Clear Items?' : <Eraser size={14} />}
                                        </button>
                                    )}
                                    {config.levels.length > 1 && isAdmin && (
                                        <button onClick={() => removeLevel(level.id)} className="text-gray-400 hover:text-red-600 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                <div className="col-span-3">
                                    <input 
                                        type="text" 
                                        value={level.name} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'name', e.target.value)}
                                        className="text-xs border rounded p-1.5 w-full font-medium disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                                        placeholder="Floor Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Elev (cm)</label>
                                    <input 
                                        type="number" 
                                        value={level.elevation || 0} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'elevation', Number(e.target.value))}
                                        className="text-xs border rounded p-1 w-full disabled:bg-gray-100 disabled:text-gray-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Height (cm)</label>
                                    <input 
                                        type="number" 
                                        value={level.height} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'height', Number(e.target.value))}
                                        className="text-xs border rounded p-1 w-full disabled:bg-gray-100 disabled:text-gray-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-0.5"><Database size={8}/> Cap (m³)</label>
                                    <input 
                                        type="number" 
                                        value={level.totalVolumeCapacity || 0} 
                                        disabled={!isAdmin}
                                        onChange={(e) => updateLevel(level.id, 'totalVolumeCapacity', Number(e.target.value))}
                                        className="text-xs border rounded p-1 w-full bg-yellow-50 text-yellow-800 font-bold border-yellow-200 disabled:opacity-70"
                                    />
                                </div>
                            </div>
                            
                            {/* Occupancy Progress */}
                            <div className="mt-2 text-[10px]">
                                {(() => {
                                    const occupied = getLevelOccupiedCbm(level);
                                    const capacity = level.totalVolumeCapacity || 0;
                                    const percent = capacity > 0 ? (occupied / capacity) * 100 : 0;
                                    return (
                                        <>
                                            <div className="flex justify-between font-bold mb-1">
                                                <span className="text-gray-500 uppercase tracking-tighter">Current Load:</span>
                                                <span className={percent > 90 ? 'text-red-600' : 'text-brand-primary'}>{occupied} m³ / {capacity} m³</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${percent > 90 ? 'bg-red-500' : 'bg-brand-primary'}`} 
                                                    style={{ width: `${Math.min(100, percent)}%` }}
                                                ></div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Floor Financial Goals Chip */}
                            {(() => {
                                const fSummary = getLevelFinancialSummary(level, config.pricePerCbm);
                                return (
                                    <div className="mt-1 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                                        <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                                            <Coins size={11} className="text-amber-600" />
                                            <span>{currency} {fSummary.pricePerCbm}/m³</span>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-gray-500">Goal: {currency} {fSummary.targetRevenue.toLocaleString()}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFloorForFinance(level.id)}
                                            className="text-[9px] text-amber-700 hover:text-black font-black uppercase tracking-wider flex items-center gap-0.5"
                                        >
                                            Financials <ArrowUpRight size={9} />
                                        </button>
                                    </div>
                                );
                            })()}
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 bg-gray-50 disabled:text-gray-500 font-bold"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Clear Height (cm)</label>
                    <input 
                        type="number" 
                        value={config.dimensions.height || 700}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('height', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Length (cm)</label>
                    <input 
                        type="number" 
                        value={config.dimensions.length}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('length', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Width (cm)</label>
                    <input 
                        type="number" 
                        value={config.dimensions.width}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('width', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                    />
                </div>
            </div>
        </section>

        {/* Storage & Equipment Config */}
        <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Box size={16} className="text-brand-primary" /> Storage & Equipment
            </h3>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Storage Type</label>
                        <select 
                            value={config.storageType}
                            disabled={!isAdmin}
                            onChange={(e) => handleChange('storageType', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                        >
                            <option value="Pallet Racking">Pallet Racking</option>
                            <option value="Fine Arts Racking">Fine Arts Racking</option>
                            <option value="Bulk Storage">Bulk Storage</option>
                            <option value="Mezzanine">Mezzanine</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Truck size={12} /> Forklift Equipment
                        </label>
                        <select 
                            value={config.forklift || 'Reach Truck'}
                            disabled={!isAdmin}
                            onChange={(e) => handleChange('forklift', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                        >
                            <option value="Counterbalance">Counterbalance</option>
                            <option value="Reach Truck">Reach Truck</option>
                            <option value="VNA">VNA (Very Narrow)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Aisle (cm)</label>
                        <input 
                            type="number" 
                            value={config.aisleWidth}
                            disabled={!isAdmin}
                            onChange={(e) => handleChange('aisleWidth', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-xs border p-2 disabled:bg-gray-100 font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Columns (cm)</label>
                        <input 
                            type="number" 
                            value={config.columnSpacing || 600}
                            disabled={!isAdmin}
                            onChange={(e) => handleChange('columnSpacing', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-xs border p-2 disabled:bg-gray-100 font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Docks / Bays</label>
                        <input 
                            type="number" 
                            value={config.docks || 1}
                            disabled={!isAdmin}
                            onChange={(e) => handleChange('docks', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-accent focus:ring-brand-accent text-xs border p-2 disabled:bg-gray-100 font-bold"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                     <input 
                        type="checkbox"
                        checked={config.temperatureControlled}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('temperatureControlled', e.target.checked)}
                        className="h-4 w-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent text-yellow-500 disabled:opacity-50"
                     />
                     <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <Thermometer size={14} className="text-blue-500" /> Temperature Controlled Facility
                     </label>
                </div>
            </div>
        </section>

        {/* Dedicated Operational Zones */}
        <section className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Warehouse size={14} className="text-brand-primary" /> Dedicated Zones (m²)
            </h3>
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Office</label>
                    <input 
                        type="number" 
                        value={config.zones?.office || 0}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('zones.office', e.target.value)}
                        className="w-full text-xs border rounded p-1.5 font-bold text-gray-800 disabled:bg-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Receiving</label>
                    <input 
                        type="number" 
                        value={config.zones?.receiving || 0}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('zones.receiving', e.target.value)}
                        className="w-full text-xs border rounded p-1.5 font-bold text-gray-800 disabled:bg-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Dispatch</label>
                    <input 
                        type="number" 
                        value={config.zones?.dispatch || 0}
                        disabled={!isAdmin}
                        onChange={(e) => handleChange('zones.dispatch', e.target.value)}
                        className="w-full text-xs border rounded p-1.5 font-bold text-gray-800 disabled:bg-gray-100"
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