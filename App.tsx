import React, { useState, useEffect, useRef } from 'react';
import InputPanel from './components/InputPanel';
import View2D from './components/View2D';
import View3D from './components/View3D';
import StatsPanel from './components/StatsPanel';
import LoginModal from './components/LoginModal';
import JobSearch from './components/JobSearch';
import { WarehouseConfig, StorageStats, GeminiOptimizationResult, LayoutItem } from './types';
import { DEFAULT_CONFIG } from './constants';
import { calculateStats, generateProceduralLayout } from './services/warehouseLogic';
import { getAIOptimization } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { generateWarehouseReport } from './services/pdfService';
import { LayoutTemplate, Cuboid, Download, Lock, Unlock, UserCircle, Sparkles, Building2, Plus, Trash2, ChevronDown, Cloud, CloudOff, RefreshCw, CheckCircle, Loader2, ChevronLeft, ChevronRight, Menu, Copy, Maximize, Minimize, Search } from 'lucide-react';

const App: React.FC = () => {
  // App Initialization State
  const [isInitializing, setIsInitializing] = useState(true);

  // State for multiple warehouses
  const [warehouses, setWarehouses] = useState<WarehouseConfig[]>([DEFAULT_CONFIG]);
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>(DEFAULT_CONFIG.id);
  
  // Derived active config
  const config = warehouses.find(w => w.id === activeWarehouseId) || warehouses[0];

  const [stats, setStats] = useState<StorageStats>({ palletPositions: 0, cubicVolume: 0, usableEfficiency: 0, rackCount: 0 });
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [aiResult, setAiResult] = useState<GeminiOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Auth State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showJobSearch, setShowJobSearch] = useState(false);

  const toggleFullScreen = () => {
      setIsFullScreen(!isFullScreen);
      if (!isFullScreen) {
          setIsSidebarOpen(false);
          setIsStatsOpen(false);
      } else {
          setIsSidebarOpen(true);
          setIsStatsOpen(true);
      }
  };

  // Database Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'loading'>('idle');
  const saveTimeout = useRef<any>(null);

  // Load Data from Supabase on mount
  useEffect(() => {
    const initApp = async () => {
        try {
            const { data, error } = await supabase.from('warehouses').select('*').order('name');
            
            if (error) {
                console.error('Error fetching from Supabase:', error);
                setSyncStatus('error');
            } else if (data && data.length > 0) {
                // Map the JSONB data back to config objects
                const loadedConfigs: WarehouseConfig[] = data.map((row: any) => ({
                    ...row.data,
                    id: row.id // ensure ID matches the primary key
                }));
                setWarehouses(loadedConfigs);
                setActiveWarehouseId(loadedConfigs[0].id);
            } else {
                // DB is connected but empty. Seed with default config.
                console.log("Database empty. Seeding default config...");
                await supabase.from('warehouses').insert({
                    id: DEFAULT_CONFIG.id,
                    name: DEFAULT_CONFIG.name,
                    data: DEFAULT_CONFIG
                });
                // State is already DEFAULT_CONFIG, so no need to set it, just let it load.
            }
        } catch (err) {
            console.error("Initialization failed", err);
        } finally {
            // Artificial delay for smoother UX (prevent flickering)
            setTimeout(() => setIsInitializing(false), 800);
        }
    };

    initApp();
  }, []);

  // Initialize Layout logic on mount or when a new warehouse is created empty
  useEffect(() => {
    if (!isInitializing && config.levels.length > 0 && config.levels[0].items.length === 0 && config.mode === 'auto') {
        const initialItems = generateProceduralLayout(config);
        const newLevels = [...config.levels];
        newLevels[0].items = initialItems;
        handleUpdateConfig({ ...config, levels: newLevels });
    }
  }, [config.id, isInitializing]); 

  useEffect(() => {
    const newStats = calculateStats(config);
    setStats(newStats);
    setAiResult(null); // Reset AI result when config changes
  }, [config]);

  // Debounced Save to Supabase
  const saveToSupabase = (configToSave: WarehouseConfig) => {
      // Only save if admin to prevent unauthorized overwrites
      if (!isAdmin) return;

      setSyncStatus('saving');
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      saveTimeout.current = setTimeout(async () => {
          const { error } = await supabase.from('warehouses').upsert({
              id: configToSave.id,
              name: configToSave.name,
              data: configToSave
          });

          if (error) {
              console.error('Error saving to Supabase:', error);
              setSyncStatus('error');
          } else {
              setSyncStatus('saved');
              setTimeout(() => setSyncStatus('idle'), 2000);
          }
      }, 1000); // 1 second debounce
  };

  const handleUpdateConfig = (newConfig: WarehouseConfig) => {
      // Optimistic Update
      setWarehouses(prev => prev.map(w => w.id === newConfig.id ? newConfig : w));
      
      // Trigger Database Sync
      saveToSupabase(newConfig);
  };

  const handleAddWarehouse = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdmin) {
          setShowLogin(true);
          return;
      }

      const newId = `wh-${Date.now()}`;
      const newWarehouse: WarehouseConfig = {
          ...DEFAULT_CONFIG,
          id: newId,
          name: `Warehouse ${warehouses.length + 1}`,
          levels: [{ ...DEFAULT_CONFIG.levels[0], id: `level-${Date.now()}`, items: [] }]
      };
      
      // Auto-generate layout immediately
      const initialItems = generateProceduralLayout(newWarehouse);
      newWarehouse.levels[0].items = initialItems;

      const updatedList = [...warehouses, newWarehouse];
      setWarehouses(updatedList);
      setActiveWarehouseId(newId);

      // Save new warehouse to DB immediately
      const { error } = await supabase.from('warehouses').insert({
          id: newWarehouse.id,
          name: newWarehouse.name,
          data: newWarehouse
      });
      if (error) console.error("Error creating warehouse:", error);
  };

  const handleDuplicateWarehouse = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdmin) {
          setShowLogin(true);
          return;
      }

      const newId = `wh-${Date.now()}`;
      const newWarehouse: WarehouseConfig = {
          ...config,
          id: newId,
          name: `${config.name} (Copy)`,
          // Deep copy levels to ensure unique IDs if needed, though simple spread is often enough if we change IDs
          levels: config.levels.map(l => ({ ...l, id: `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }))
      };

      const updatedList = [...warehouses, newWarehouse];
      setWarehouses(updatedList);
      setActiveWarehouseId(newId);

      // Save new warehouse to DB immediately
      const { error } = await supabase.from('warehouses').insert({
          id: newWarehouse.id,
          name: newWarehouse.name,
          data: newWarehouse
      });
      if (error) console.error("Error duplicating warehouse:", error);
  };

  const handleForceSave = async () => {
      if (!isAdmin) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      setSyncStatus('saving');
      const { error } = await supabase.from('warehouses').upsert({
          id: config.id,
          name: config.name,
          data: config
      });

      if (error) {
          console.error('Error saving to Supabase:', error);
          setSyncStatus('error');
      } else {
          setSyncStatus('saved');
          setTimeout(() => setSyncStatus('idle'), 2000);
      }
  };

  const handleDeleteWarehouse = async (e: React.MouseEvent, idToDelete: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isAdmin) return;
      if (warehouses.length <= 1) {
          alert("You must have at least one warehouse.");
          return;
      }
      
      if (window.confirm("Are you sure you want to delete this warehouse?")) {
          console.log("Deleting warehouse:", idToDelete);
          // 1. Calculate new list
          const updatedList = warehouses.filter(w => w.id !== idToDelete);
          
          if (updatedList.length === warehouses.length) {
              console.error("Delete failed: Warehouse ID not found in list");
              return;
          }

          // 2. Determine next ID
          // If we are deleting the active one, pick the first from the new list
          // If we are deleting a non-active one, active ID stays same
          let nextId = activeWarehouseId;
          if (idToDelete === activeWarehouseId) {
             // If we deleted the active one, switch to the first available from the NEW list
             // Ensure we have a valid ID to switch to
             nextId = updatedList.length > 0 ? updatedList[0].id : ''; 
          }

          console.log("Next ID:", nextId);

          // 3. Update State Optimistically
          setWarehouses(updatedList);
          if (nextId) {
              setActiveWarehouseId(nextId);
          }

          // 4. Delete from DB
          const { error } = await supabase.from('warehouses').delete().eq('id', idToDelete);
          if (error) {
              console.error("Failed to delete from server:", error);
              alert("Warning: Could not delete from server. Refreshing may restore it.");
          }
      }
  };

  const handleOptimization = async () => {
    setIsOptimizing(true);
    const result = await getAIOptimization(config, stats);
    setAiResult(result);
    setIsOptimizing(false);
  };

  const handleApplyAIDesign = () => {
    if (!aiResult?.generatedLayout || !isAdmin) return;

    const newLevels = config.levels.map(l => {
        if (l.id === config.activeLevelId) {
            return { ...l, items: aiResult.generatedLayout! };
        }
        return l;
    });
    
    handleUpdateConfig({ ...config, levels: newLevels, mode: 'custom' });
    alert("AI Design Applied Successfully! Switch to 3D View to see the optimized density.");
  };

  const handleExport = () => {
    generateWarehouseReport(config);
  };

  const handleUpdateItems = (levelId: string, newItems: LayoutItem[]) => {
      // Security check
      if (!isAdmin) return; 

      const newLevels = config.levels.map(l => {
          if (l.id === levelId) return { ...l, items: newItems };
          return l;
      });
      handleUpdateConfig({ ...config, levels: newLevels, mode: 'custom' });
  };

  // --- Initial Loading Screen ---
  if (isInitializing) {
      return (
          <div className="h-screen w-screen bg-brand-primary flex flex-col items-center justify-center text-white z-50">
              <h1 className="text-3xl font-serif font-bold tracking-widest mt-6">WRITER</h1>
              <p className="text-sm font-sans font-bold text-brand-accent uppercase tracking-[0.3em] mb-8">RELOCATIONS</p>
              
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="animate-spin text-brand-accent" size={18} />
                  <span>Loading Warehouse Data...</span>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)} 
        onLogin={() => setIsAdmin(true)} 
      />

      {/* Header */}
      {!isFullScreen && (
      <header className="bg-brand-primary text-white h-16 flex items-center justify-between px-6 shadow-md z-30 shrink-0 border-b-2 border-brand-accent">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col justify-center">
                    <h1 className="text-xl font-serif font-bold tracking-widest text-white leading-none">WRITER</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-sans font-bold text-red-500 uppercase tracking-[0.2em] leading-tight">RELOCATIONS</p>
                        <span className="text-[8px] text-brand-accent bg-gray-800 px-1 rounded ml-1 opacity-80">PLANNER</span>
                    </div>
                </div>
            </div>

            {/* Warehouse Selector */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-md p-1 pl-3 border border-gray-700 z-20">
                <Building2 size={16} className="text-gray-400" />
                
                <div className="relative">
                    <select 
                        value={activeWarehouseId}
                        onChange={(e) => setActiveWarehouseId(e.target.value)}
                        className="bg-transparent text-sm font-bold text-white border-none outline-none cursor-pointer focus:ring-0 w-32 md:w-48 appearance-none pr-6"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id} className="text-black">{w.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-400">
                        <ChevronDown size={14} />
                    </div>
                </div>

                {isAdmin && (
                    <div className="flex items-center border-l border-gray-600 pl-2 ml-2">
                        <button 
                            onClick={handleAddWarehouse}
                            title="Add New Warehouse"
                            className="p-1.5 hover:bg-brand-accent hover:text-black rounded transition-colors text-gray-300"
                        >
                            <Plus size={16} />
                        </button>
                        <button 
                            onClick={handleDuplicateWarehouse}
                            title="Duplicate Current Warehouse"
                            className="p-1.5 hover:bg-blue-500 hover:text-white rounded transition-colors text-gray-300 ml-1"
                        >
                            <Copy size={16} />
                        </button>
                        {warehouses.length > 1 && (
                            <button 
                                onClick={(e) => handleDeleteWarehouse(e, activeWarehouseId)}
                                title="Delete Current Warehouse"
                                className="p-1.5 hover:bg-red-600 hover:text-white rounded transition-colors text-gray-300 ml-1"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        <div className="flex items-center gap-4">
             {/* Sync Status Indicator */}
             <div className="hidden lg:flex items-center gap-2 mr-4">
                 {syncStatus === 'saving' && <span className="text-[10px] text-gray-400 flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Saving...</span>}
                 {syncStatus === 'saved' && <span className="text-[10px] text-green-500 flex items-center gap-1"><CheckCircle size={10}/> Saved</span>}
                 {syncStatus === 'error' && <span className="text-[10px] text-red-500 flex items-center gap-1"><CloudOff size={10}/> Sync Error</span>}
                 {syncStatus === 'idle' && (
                      <div title="Synced">
                        <Cloud size={14} className="text-gray-600" />
                      </div>
                  )}
             </div>

            {/* View Modes */}
            <div className="bg-white/10 rounded p-1 flex">
                <button 
                    onClick={() => setViewMode('2D')}
                    className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-2 ${viewMode === '2D' ? 'bg-brand-accent text-black font-bold shadow' : 'text-gray-300 hover:text-white'}`}
                >
                    <LayoutTemplate size={16} /> 2D
                </button>
                <button 
                    onClick={() => setViewMode('3D')}
                    className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-2 ${viewMode === '3D' ? 'bg-brand-accent text-black font-bold shadow' : 'text-gray-300 hover:text-white'}`}
                >
                    <Cuboid size={16} /> 3D
                </button>
            </div>
            
            <div className="h-6 w-px bg-white/20 mx-2 hidden md:block"></div>

            {/* Apply AI Button (Visible only if AI Result exists and is Admin) */}
            {aiResult?.generatedLayout && isAdmin && (
                <button 
                    onClick={handleApplyAIDesign}
                    className="hidden md:flex items-center gap-2 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded font-bold transition-all animate-pulse"
                >
                    <Sparkles size={14} /> Apply AI
                </button>
            )}

            {/* Auth Button */}
            {isAdmin ? (
                 <button 
                    onClick={() => setIsAdmin(false)}
                    className="flex items-center gap-2 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1.5 rounded border border-red-800 transition-colors"
                 >
                    <Unlock size={14} /> <span className="hidden md:inline">Admin</span>
                 </button>
            ) : (
                <button 
                    onClick={() => setShowLogin(true)}
                    className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded border border-gray-600 transition-colors"
                >
                    <Lock size={14} /> <span className="hidden md:inline">Guest</span>
                 </button>
            )}

            <button onClick={handleExport} className="bg-brand-accent hover:bg-yellow-400 text-black px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors border border-black/10">
                <Download size={16} /> <span className="hidden md:inline">Export PDF</span>
            </button>
            <button 
                onClick={() => setShowJobSearch(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold transition-all border border-white/20"
                title="Search Jobs & Shippers"
            >
                <Search size={14} className="text-brand-accent" /> 
                <span className="hidden lg:inline">JOB SEARCH</span>
            </button>
            <button 
                onClick={toggleFullScreen}
                className="p-2 hover:bg-white/10 rounded text-white transition-colors"
                title="Full Screen Mode"
            >
                <Maximize size={20} />
            </button>
        </div>
      </header>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {showJobSearch && (
            <JobSearch 
                config={config} 
                onClose={() => setShowJobSearch(false)} 
            />
        )}
        
        {/* Left Sidebar (Collapsible) */}
        <div 
          className={`shrink-0 h-full z-20 transition-all duration-300 ease-in-out border-r border-gray-200 bg-white relative ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}
        >
            <div className="w-80 h-full"> {/* Inner container maintains width to prevent squishing content */}
                <InputPanel 
                    config={config} 
                    onChange={handleUpdateConfig} 
                    onOptimize={handleOptimization}
                    isOptimizing={isOptimizing}
                    isAdmin={isAdmin}
                    onSave={handleForceSave}
                />
            </div>
        </div>

        {/* Sidebar Toggle Button */}
        {!isFullScreen && (
        <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`absolute top-1/2 z-30 transform -translate-y-1/2 bg-white border border-gray-300 shadow-md p-1 rounded-r-md text-gray-600 hover:bg-gray-50 transition-all duration-300 ${isSidebarOpen ? 'left-80' : 'left-0'}`}
            title={isSidebarOpen ? "Hide Parameters" : "Show Parameters"}
        >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        )}

        {/* Center/Right Visualizer */}
        <main className="flex-1 flex flex-col relative bg-gray-100 overflow-hidden">
            {isFullScreen && (
                <button 
                    onClick={toggleFullScreen} 
                    className="absolute bottom-6 left-6 z-50 bg-white/90 backdrop-blur p-3 rounded-full shadow-lg hover:bg-gray-100 text-gray-800 border border-gray-200 transition-transform hover:scale-110"
                    title="Exit Full Screen"
                >
                    <Minimize size={24} />
                </button>
            )}

            <div className="flex-1 relative flex flex-col overflow-hidden">
                {viewMode === '2D' ? (
                    <View2D 
                        config={config} 
                        onUpdateItems={handleUpdateItems} 
                        activeLevelId={config.activeLevelId}
                        isAdmin={isAdmin}
                        onUpdateConfig={handleUpdateConfig}
                    />
                ) : (
                    <View3D config={config} />
                )}
            </div>
            
            {/* Bottom Stats */}
            {!isFullScreen && (
            <StatsPanel 
                stats={stats} 
                config={config} 
                aiData={aiResult} 
                isOpen={isStatsOpen}
                onToggle={() => setIsStatsOpen(!isStatsOpen)}
                onOpenSearch={() => setShowJobSearch(true)}
            />
            )}
        </main>
      </div>
    </div>
  );
};

export default App;