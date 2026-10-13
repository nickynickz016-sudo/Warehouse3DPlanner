import React, { useState, useEffect, useRef, useMemo } from 'react';
import InputPanel from './components/InputPanel';
import View2D from './components/View2D';
import View3D from './components/View3D';
import PropertyPanel from './components/PropertyPanel';
import LoginModal from './components/LoginModal';
import JobSearch from './components/JobSearch';
import { WarehouseConfig, StorageStats, GeminiOptimizationResult, LayoutItem, RackDetails, JobEntry, BranchCode, BRANCH_LIST, BRANCH_MAP, LocateTargetInfo } from './types';
import { DEFAULT_CONFIG, DEFAULT_QATAR_CONFIG, DEFAULT_KSA_CONFIG } from './constants';
import { calculateStats, generateProceduralLayout } from './services/warehouseLogic';
import { getAIOptimization } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { generateWarehouseReport } from './services/pdfService';
import QRCode from 'qrcode';
import { LayoutTemplate, Cuboid, Download, Lock, Unlock, UserCircle, Sparkles, Building2, Plus, Trash2, ChevronDown, Cloud, CloudOff, RefreshCw, CheckCircle, Loader2, ChevronLeft, ChevronRight, Menu, Copy, Maximize, Minimize, Search, Box, X, Grid, Clock, Coins, Calendar, QrCode, Activity, Globe, Layers, Settings, Printer, Share2, Check, ShieldCheck, FileText, MapPin, ArrowLeft, Tag } from 'lucide-react';
import { ConfirmProceedModal } from './components/ConfirmProceedModal';

const App: React.FC = () => {
  // App Initialization State
  const [isInitializing, setIsInitializing] = useState(true);

  // Branch State (UAE, Qatar, KSA)
  const [activeBranch, setActiveBranch] = useState<BranchCode>(() => {
    const saved = localStorage.getItem('writer_active_branch') as BranchCode;
    if (saved && (saved === 'UAE' || saved === 'QATAR' || saved === 'KSA')) return saved;
    return 'UAE';
  });

  // State for multiple warehouses
  const [warehouses, setWarehouses] = useState<WarehouseConfig[]>([DEFAULT_CONFIG]);
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>(DEFAULT_CONFIG.id);
  
  // Filter warehouses belonging to active branch
  const branchWarehouses = useMemo(() => {
    return warehouses.filter(w => (w.branch || 'UAE') === activeBranch);
  }, [warehouses, activeBranch]);

  // Derived active config with safety fallback
  const config = useMemo(() => {
    return branchWarehouses.find(w => w.id === activeWarehouseId) 
      || branchWarehouses[0] 
      || warehouses.find(w => w.id === activeWarehouseId)
      || warehouses[0] 
      || (activeBranch === 'QATAR' ? DEFAULT_QATAR_CONFIG : activeBranch === 'KSA' ? DEFAULT_KSA_CONFIG : DEFAULT_CONFIG);
  }, [branchWarehouses, warehouses, activeWarehouseId, activeBranch]);

  // Active branch metadata
  const currentBranchInfo = useMemo(() => {
    return BRANCH_MAP[config.branch || activeBranch] || BRANCH_MAP['UAE'];
  }, [config.branch, activeBranch]);

  const handleSelectBranch = (branch: BranchCode) => {
    setActiveBranch(branch);
    try {
      localStorage.setItem('writer_active_branch', branch);
    } catch (e) {}

    const bWhs = warehouses.filter(w => (w.branch || 'UAE') === branch);
    const savedWhId = localStorage.getItem(`writer_active_wh_${branch}`);
    const targetWh = bWhs.find(w => w.id === savedWhId) || bWhs[0];
    if (targetWh) {
      setActiveWarehouseId(targetWh.id);
      try {
        localStorage.setItem('writer_active_warehouse_id', targetWh.id);
      } catch (e) {}
    }
    setSelectedItemIds([]);
  };

  const [stats, setStats] = useState<StorageStats>(() => calculateStats(DEFAULT_CONFIG));
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [aiResult, setAiResult] = useState<GeminiOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Selection State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Selection listener to close sidebar on narrow screens
  useEffect(() => {
      if (selectedItemIds.length > 0 && typeof window !== 'undefined' && window.innerWidth < 1280) {
          setIsSidebarOpen(false);
      }
      setQrCodeUrl(null);
  }, [selectedItemIds]);

  // QR Code State (hoisted)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Locate & Walking Route State
  const [locateTarget, setLocateTarget] = useState<LocateTargetInfo | null>(null);

  // Auth State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('writer_is_admin') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleSetAdmin = (val: boolean) => {
    setIsAdmin(val);
    try {
      localStorage.setItem('writer_is_admin', String(val));
    } catch (e) {}
  };

  const [showLogin, setShowLogin] = useState(false);

  // In-app Notification / Toast State (no blocking window.alert)
  const [notification, setNotification] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);

  const showNotification = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // UI State
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [financialModalTab, setFinancialModalTab] = useState<'floors' | 'summary'>('floors');
  
  // Delete Warehouse Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  // Delete Job Confirmation
  const [showJobDeleteConfirm, setShowJobDeleteConfirm] = useState(false);
  const [jobToDeleteId, setJobToDeleteId] = useState<string | null>(null);
  const [jobConfirmInput, setJobConfirmInput] = useState('');

  // Delete Selected Units Confirmation
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false);



  // Package Management State (Hoisted from View2D)
  const [activePackageJobId, setActivePackageJobId] = useState<string | null>(null);
  const [packageSearch, setPackageSearch] = useState('');
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd, setBulkEnd] = useState('');
  const [expandedPackageHistory, setExpandedPackageHistory] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Item Update Handlers (Hoisted from View2D)
  const items = config.levels.find(l => l.id === config.activeLevelId)?.items || [];
  
  const handleUpdateItems = (levelId: string, newItems: LayoutItem[]) => {
      if (!isAdmin) return; 
      const newLevels = config.levels.map(l => {
          if (l.id === levelId) return { ...l, items: newItems };
          return l;
      });
      handleUpdateConfig({ ...config, levels: newLevels, mode: 'custom' });
  };

  const duplicateItem = () => {
      if (selectedItemIds.length === 0 || !isAdmin) return;
      const currentItems = config.levels.find(l => l.id === config.activeLevelId)?.items || [];
      const newItems: LayoutItem[] = [];
      const newIds: string[] = [];

      selectedItemIds.forEach(cloneId => {
          const itemToClone = currentItems.find(i => i.id === cloneId);
          if (!itemToClone) return;

          const newId = `${itemToClone.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const newItem: LayoutItem = {
              ...itemToClone,
              id: newId,
              x: itemToClone.x + 20,
              y: itemToClone.y + 20,
              label: itemToClone.label ? `${itemToClone.label} (Copy)` : ''
          };
          newItems.push(newItem);
          newIds.push(newId);
      });

      handleUpdateItems(config.activeLevelId, [...currentItems, ...newItems]);
      setSelectedItemIds(newIds);
  };

  const requestDeleteItem = () => {
      if (selectedItemIds.length === 0 || !isAdmin) return;
      setShowItemDeleteConfirm(true);
  };

  const confirmDeleteItem = () => {
      if (selectedItemIds.length === 0 || !isAdmin) return;
      const currentItems = config.levels.find(l => l.id === config.activeLevelId)?.items || [];
      handleUpdateItems(config.activeLevelId, currentItems.filter(i => !selectedItemIds.includes(i.id)));
      setSelectedItemIds([]);
      setShowItemDeleteConfirm(false);
  };

  // Keyboard shortcut for deleting selected items: opens proceed confirmation
  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;

          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemIds.length > 0 && isAdmin) {
              e.preventDefault();
              requestDeleteItem();
          } else if (e.key === 'Escape' && selectedItemIds.length > 0) {
              e.preventDefault();
              setSelectedItemIds([]);
          }
      };

      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedItemIds, isAdmin, config.activeLevelId, config.levels]);

  const updateSelectedProperty = (field: string, value: any, isRackDetail = false) => {
      if (selectedItemIds.length === 0 || !isAdmin) return;

      const updatedItems: LayoutItem[] = items.map(item => {
          if (selectedItemIds.includes(item.id)) {
              if (isRackDetail && (item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage')) {
                  const currentDetails = item.rackDetails || { status: 'available' as const, jobs: [], volumeOccupied: 0, enclosureType: 'Open Space' as const };
                  const newDetails = { ...currentDetails, [field]: value } as RackDetails;
                  return { ...item, rackDetails: newDetails };
              }
              return { ...item, [field]: value } as LayoutItem;
          }
          return item;
      });
      handleUpdateItems(config.activeLevelId, updatedItems);
  };

  const updateJobInSelected = (jobId: string, field: keyof JobEntry, value: any) => {
      if (selectedItemIds.length === 0 || !isAdmin) return;
      const updatedItems: LayoutItem[] = items.map(item => {
          if (selectedItemIds.includes(item.id) && (item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage')) {
              const currentJobs = item.rackDetails?.jobs || [];
              const updatedJobs = currentJobs.map(job => 
                  job.id === jobId ? { ...job, [field]: value } : job
              );
              const totalOccupied = updatedJobs.reduce((sum, j) => sum + (j.status === 'active' ? (j.cbm || 0) : 0), 0);
              const hasActive = updatedJobs.some(j => j.status === 'active');
              return { 
                  ...item, 
                  rackDetails: { 
                      ...item.rackDetails!, 
                      jobs: updatedJobs,
                      volumeOccupied: Math.round(totalOccupied * 100) / 100,
                      status: hasActive ? 'occupied' as const : (updatedJobs.length > 0 ? 'reserved' as const : 'available' as const)
                  } 
              };
          }
          return item;
      });
      handleUpdateItems(config.activeLevelId, updatedItems);
  };

  const removeJobFromSelected = (jobId: string) => {
    if (!isAdmin) return;
    setJobToDeleteId(jobId);
    setJobConfirmInput('');
    setShowJobDeleteConfirm(true);
  };

  const confirmRemoveJob = () => {
    if (!jobToDeleteId || jobConfirmInput.trim().toLowerCase() !== 'proceed') return;

    const updatedItems: LayoutItem[] = items.map(item => {
        if (item.rackDetails?.jobs?.some(j => j.id === jobToDeleteId)) {
            const currentJobs = item.rackDetails.jobs || [];
            const updatedJobs = currentJobs.filter(job => job.id !== jobToDeleteId);
            const totalOccupied = updatedJobs.reduce((sum, j) => sum + (j.status === 'active' ? (j.cbm || 0) : 0), 0);
            const newStatus = updatedJobs.length === 0 ? 'available' as const : (totalOccupied > 0 ? 'occupied' as const : 'available' as const);
            return { 
                ...item, 
                rackDetails: { 
                    ...item.rackDetails, 
                    jobs: updatedJobs, 
                    volumeOccupied: Math.round(totalOccupied * 100) / 100,
                    status: newStatus 
                } 
            };
        }
        return item;
    });
    handleUpdateItems(config.activeLevelId, updatedItems);
    setShowJobDeleteConfirm(false);
    setJobToDeleteId(null);
    setJobConfirmInput('');
  };

  const addJobToSelected = () => {
    if (selectedItemIds.length === 0 || !isAdmin) return;
    const branchInfo = config.branch ? (BRANCH_MAP[config.branch] || BRANCH_MAP['UAE']) : BRANCH_MAP['UAE'];
    const autoNum = Math.floor(1000 + Math.random() * 9000).toString();
    const activeLevel = config.levels.find(l => l.id === config.activeLevelId);
    const floorPricePerCbm = activeLevel?.pricePerCbm ?? config.pricePerCbm ?? 25;
    const newJob: JobEntry = {
        id: `job-${Date.now()}`,
        jobNumber: autoNum,
        shipperName: `Shipper #${branchInfo.jobPrefix}${autoNum}`,
        inDate: new Date().toISOString().split('T')[0],
        outDate: '',
        pricePerMonth: (floorPricePerCbm * 5) || 250,
        cbm: 5,
        storageType: 'SIT',
        paymentCycle: 'Monthly',
        status: 'active'
    };
    
    const updatedItems: LayoutItem[] = items.map(item => {
        if (selectedItemIds.includes(item.id) && (item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage')) {
            const currentJobs = item.rackDetails?.jobs || [];
            const allJobs = [...currentJobs, newJob];
            const totalOccupied = allJobs.reduce((sum, j) => sum + (j.status === 'active' ? (j.cbm || 0) : 0), 0);
            return { 
                ...item, 
                rackDetails: { 
                    ...item.rackDetails!, 
                    jobs: allJobs,
                    volumeOccupied: Math.round(totalOccupied * 100) / 100,
                    status: 'occupied' as const
                } 
            };
        }
        return item;
    });
    handleUpdateItems(config.activeLevelId, updatedItems);
  };

  const updatePackageStatus = (jobId: string, packageNumber: number, status: 'in' | 'out' | 'none') => {
    if (selectedItemIds.length === 0 || !isAdmin) return;
    const now = new Date().toLocaleString();
    const updatedItems: LayoutItem[] = items.map(item => {
        if (selectedItemIds.includes(item.id) && (item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage')) {
            const currentJobs = item.rackDetails?.jobs || [];
            const updatedJobs = currentJobs.map(job => {
                if (job.id === jobId) {
                    const currentPackages = job.packages || [];
                    const existingPackageIdx = currentPackages.findIndex(p => p.number === packageNumber);
                    let updatedPackages = [...currentPackages];
                    
                    const existingRecord = existingPackageIdx >= 0 ? currentPackages[existingPackageIdx] : null;
                    const history = existingRecord?.history || [];
                    
                    const newHistory = status !== 'none' 
                      ? [...history, { status: status as 'in' | 'out', timestamp: now }]
                      : history;

                    const newRecord = {
                        number: packageNumber,
                        status,
                        inTimestamp: status === 'in' ? now : existingRecord?.inTimestamp,
                        outTimestamp: status === 'out' ? now : existingRecord?.outTimestamp,
                        history: newHistory
                    };

                    if (existingPackageIdx >= 0) {
                        updatedPackages[existingPackageIdx] = newRecord;
                    } else {
                        updatedPackages.push(newRecord);
                    }

                    return { ...job, packages: updatedPackages };
                }
                return job;
            });
            return { ...item, rackDetails: { ...item.rackDetails!, jobs: updatedJobs } };
        }
        return item;
    });
    handleUpdateItems(config.activeLevelId, updatedItems);
  };

  const resetPackages = (jobId: string) => {
    if (selectedItemIds.length === 0 || !isAdmin) return;
    const updatedItems: LayoutItem[] = items.map(item => {
        if (selectedItemIds.includes(item.id) && (item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage')) {
            const currentJobs = item.rackDetails?.jobs || [];
            const updatedJobs = currentJobs.map(job => {
                if (job.id === jobId) {
                    return { ...job, packages: [] };
                }
                return job;
            });
            return { ...item, rackDetails: { ...item.rackDetails!, jobs: updatedJobs } };
        }
        return item;
    });
    handleUpdateItems(config.activeLevelId, updatedItems);
  };

  const bulkUpdatePackages = (jobId: string, status: 'in' | 'out') => {
    if (selectedItemIds.length === 0 || !isAdmin) return;
    const start = parseInt(bulkStart);
    const end = parseInt(bulkEnd);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end > 10000 || start > end) {
        return;
    }

    const now = new Date().toLocaleString();
    const updatedItems: LayoutItem[] = items.map(item => {
        if (selectedItemIds.includes(item.id) && (item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage')) {
            const currentJobs = item.rackDetails?.jobs || [];
            const updatedJobs = currentJobs.map(job => {
                if (job.id === jobId) {
                    const currentPackages = [...(job.packages || [])];
                    const packageMap = new Map(currentPackages.map(p => [p.number, p]));

                    for (let i = start; i <= end; i++) {
                        const existing = packageMap.get(i);
                        const history = existing?.history || [];
                        const newHistory = [...history, { status, timestamp: now }];
                        
                        const newRecord = {
                            number: i,
                            status,
                            inTimestamp: status === 'in' ? now : existing?.inTimestamp,
                            outTimestamp: status === 'out' ? now : existing?.outTimestamp,
                            history: newHistory
                        };
                        packageMap.set(i, newRecord);
                    }

                    return { ...job, packages: Array.from(packageMap.values()) };
                }
                return job;
            });
            return { ...item, rackDetails: { ...item.rackDetails!, jobs: updatedJobs } };
        }
        return item;
    });
    handleUpdateItems(config.activeLevelId, updatedItems);
    setBulkStart('');
    setBulkEnd('');
  };

  const handleIssuePassport = async (item: LayoutItem) => {
    if (!isAdmin) return;
    try {
        setSyncStatus('saving');
        const passportId = `passport-${item.id}-${Date.now()}`;
        let createdPassportId = passportId;

        // Try 'passports' table first
        try {
            const { data, error } = await supabase.from('passports').insert({
                unit_id: item.id,
                warehouse_name: config.name,
                data: {
                    ...item,
                    timestamp: new Date().toISOString()
                }
            }).select().single();

            if (!error && data?.id) {
                createdPassportId = data.id;
            } else {
                throw error || new Error("Failed to insert into passports table");
            }
        } catch (tableErr) {
            // Fallback to storing in 'warehouses' table as an immutable passport document
            const passportRecord = {
                id: passportId,
                name: `Digital Passport: ${item.label || item.id}`,
                data: {
                    isPassport: true,
                    unit_id: item.id,
                    warehouse_name: config.name,
                    created_at: new Date().toISOString(),
                    item: {
                        ...item,
                        timestamp: new Date().toISOString()
                    }
                }
            };
            const { error: whError } = await supabase.from('warehouses').upsert(passportRecord);
            if (whError) throw whError;
            createdPassportId = passportId;
        }
        
        // Return the new passport URL
        const passportUrl = `${window.location.origin}/?passportId=${createdPassportId}`;
        navigator.clipboard.writeText(passportUrl);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
        
        // Generate QR for the passport URL
        const qr = await QRCode.toDataURL(passportUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#111111', light: '#FFFFFFFF' }
        });
        setQrCodeUrl(qr);
        
        alert("IMMUTABLE DIGITAL PASSPORT ISSUED!\nThe link has been copied to your clipboard.");
    } catch (err) {
        console.error("Failed to issue passport:", err);
        setSyncStatus('error');
    }
  };

  const generateQRCode = async (item: LayoutItem) => {
    // Redirection URL for scanned assets
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/?unitId=${item.id}&warehouseId=${config.id}`;
    
    try {
        const url = await QRCode.toDataURL(redirectUrl, { 
          width: 600, 
          margin: 1,
          color: {
            dark: '#111111',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(url);
    } catch (err) { console.error(err); }
  };

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) : null;
  
  // Financial Calculations (Overall & Per-Floor Breakdowns)
  const financialTotals = useMemo(() => {
    let monthly = 0;
    let quarterly = 0;
    let yearly = 0;
    let totalCbm = 0;
    let activeJobs = 0;
    let totalTargetRevenue = 0;
    let totalOperatingCost = 0;
    let totalPotentialCapacityRevenue = 0;

    const floorBreakdowns = config.levels.map(level => {
      let fMonthly = 0;
      let fQuarterly = 0;
      let fYearly = 0;
      let fTotalCbm = 0;
      let fActiveJobs = 0;

      level.items.forEach(item => {
        if (item.rackDetails?.jobs) {
          item.rackDetails.jobs.forEach(job => {
            if (job.status === 'active') {
              const price = job.pricePerMonth || 0;
              const cycle = job.paymentCycle || 'Monthly';
              
              if (cycle === 'Monthly') {
                monthly += price;
                fMonthly += price;
              } else if (cycle === 'Quarterly') {
                quarterly += price;
                fQuarterly += price;
              } else if (cycle === 'Yearly') {
                yearly += price;
                fYearly += price;
              }

              totalCbm += (job.cbm || 0);
              fTotalCbm += (job.cbm || 0);
              activeJobs++;
              fActiveJobs++;
            }
          });
        }
      });

      const fPrice = level.pricePerCbm ?? config.pricePerCbm ?? 25;
      const fCapacity = level.totalVolumeCapacity || 0;
      const fPotential = fCapacity * fPrice;
      const fTarget = level.targetRevenue !== undefined ? level.targetRevenue : Math.round(fPotential * ((level.targetOccupancyRate ?? 85) / 100));
      const fCost = level.operatingCost ?? 0;
      const fNormalized = fMonthly + (fQuarterly / 3) + (fYearly / 12);
      const fProfitTarget = fTarget - fCost;
      const fActualProfit = fNormalized - fCost;
      const fAchievement = fTarget > 0 ? Math.min(999, Math.round((fNormalized / fTarget) * 100)) : 0;
      const fOccupancy = fCapacity > 0 ? Math.min(100, Math.round((fTotalCbm / fCapacity) * 100)) : 0;

      totalTargetRevenue += fTarget;
      totalOperatingCost += fCost;
      totalPotentialCapacityRevenue += fPotential;

      return {
        levelId: level.id,
        levelName: level.name,
        pricePerCbm: fPrice,
        monthly: fMonthly,
        quarterly: fQuarterly,
        yearly: fYearly,
        normalizedMonthly: Math.round(fNormalized),
        totalCbm: Math.round(fTotalCbm * 100) / 100,
        capacity: fCapacity,
        occupancyPercent: fOccupancy,
        targetRevenue: fTarget,
        operatingCost: fCost,
        targetProfit: fProfitTarget,
        actualProfit: Math.round(fActualProfit),
        potentialRevenue: fPotential,
        achievementPercent: fAchievement,
        activeJobs: fActiveJobs
      };
    });

    const normalizedTotal = monthly + (quarterly / 3) + (yearly / 12);
    const overallAchievement = totalTargetRevenue > 0 ? Math.min(999, Math.round((normalizedTotal / totalTargetRevenue) * 100)) : 0;

    return { 
      monthly, 
      quarterly, 
      yearly, 
      normalizedTotal: Math.round(normalizedTotal),
      totalCbm: Math.round(totalCbm * 100) / 100, 
      activeJobs,
      totalTargetRevenue,
      totalOperatingCost,
      totalTargetProfit: totalTargetRevenue - totalOperatingCost,
      totalActualProfit: Math.round(normalizedTotal - totalOperatingCost),
      totalPotentialCapacityRevenue,
      overallAchievement,
      floorBreakdowns 
    };
  }, [config]);

  // Public View State
  const [publicUnitId, setPublicUnitId] = useState<string | null>(null);
  const [passportData, setPassportData] = useState<any>(null);
  const [isPassportLoading, setIsPassportLoading] = useState(false);
  const [copiedPassportLink, setCopiedPassportLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unitId = params.get('unitId');
    const passportId = params.get('passportId');
    
    if (passportId) {
      // Fetch snapshot from passports table or fallback to warehouses table
      const fetchPassport = async () => {
        setIsPassportLoading(true);
        let passportObj: any = null;

        // 1. Try 'passports' table first
        try {
            const { data, error } = await supabase
              .from('passports')
              .select('*')
              .eq('id', passportId)
              .single();
            if (data && !error) {
                passportObj = data;
            }
        } catch (e) {}

        // 2. Try 'warehouses' fallback
        if (!passportObj) {
            try {
                const { data, error } = await supabase
                  .from('warehouses')
                  .select('*')
                  .eq('id', passportId)
                  .single();
                if (data && !error && data.data) {
                    passportObj = {
                        id: data.id,
                        unit_id: data.data.unit_id || data.data.item?.id,
                        warehouse_name: data.data.warehouse_name,
                        created_at: data.data.created_at || data.created_at || new Date().toISOString(),
                        data: data.data.item || data.data
                    };
                }
            } catch (e) {}
        }
        
        if (passportObj) {
          setPassportData(passportObj);
          setPublicUnitId(passportId); // Set this to trigger the public view
        } else {
          setPublicUnitId('NOT_FOUND');
        }
        setIsPassportLoading(false);
      };
      fetchPassport();
    } else if (unitId) {
      setPublicUnitId(unitId);
    }
  }, []);

  // Database Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'loading'>('idle');
  const saveTimeout = useRef<any>(null);

  // Load Data from Supabase on mount
  useEffect(() => {
    const initApp = async () => {
        try {
            // If we are in passport mode, we don't need to load all warehouses
            const params = new URLSearchParams(window.location.search);
            if (params.get('passportId')) {
                // Skiping full warehouse load for performance and security in passport view
                setSyncStatus('idle');
                setIsInitializing(false);
                return;
            }

            // Check localStorage cache as backup
            let cachedWarehouses: WarehouseConfig[] | null = null;
            try {
                const cachedStr = localStorage.getItem('writer_warehouses_cache');
                if (cachedStr) {
                    cachedWarehouses = JSON.parse(cachedStr);
                }
            } catch (e) {
                console.error("Failed to read local cache:", e);
            }

            const { data, error } = await supabase.from('warehouses').select('*').order('name');
            
            let loadedConfigs: WarehouseConfig[] = [];
            if (error) {
                console.error('Error fetching from Supabase:', error);
                setSyncStatus('error');
                if (cachedWarehouses && cachedWarehouses.length > 0) {
                    loadedConfigs = cachedWarehouses;
                }
            } else if (data && data.length > 0) {
                // Filter out any passport snapshot records
                const warehouseRows = data.filter((row: any) => !row.id?.startsWith('passport-') && !row.data?.isPassport);
                // Map the JSONB data back to config objects
                loadedConfigs = warehouseRows.map((row: any) => ({
                    ...row.data,
                    id: row.id // ensure ID matches the primary key
                }));
            } else {
                // DB is connected but empty.
                console.log("Database empty. Seeding default config...");
                if (cachedWarehouses && cachedWarehouses.length > 0) {
                    loadedConfigs = cachedWarehouses;
                } else {
                    await supabase.from('warehouses').insert({
                        id: DEFAULT_CONFIG.id,
                        name: DEFAULT_CONFIG.name,
                        data: DEFAULT_CONFIG
                    });
                    loadedConfigs = [DEFAULT_CONFIG];
                }
            }

            if (loadedConfigs.length > 0) {
                // 1. Auto-normalize & migrate any legacy single-entry fields into jobs array and assign branch
                let normalized: WarehouseConfig[] = loadedConfigs.map(wh => {
                    const branch: BranchCode = wh.branch || 'UAE';
                    const updatedLevels = (wh.levels || []).map(lvl => ({
                        ...lvl,
                        items: (lvl.items || []).map(item => {
                            if (!item.rackDetails) return item;
                            const rd = { ...item.rackDetails };
                            if (!rd.jobs) rd.jobs = [];

                            // Migrate legacy single-job fields into jobs array if jobs array is empty
                            if ((rd.jobNumber || rd.shipperName) && rd.jobs.length === 0) {
                                rd.jobs = [{
                                    id: `job-migrated-${item.id}`,
                                    jobNumber: rd.jobNumber || '1001',
                                    shipperName: rd.shipperName || 'General Storage',
                                    inDate: rd.inDate || new Date().toISOString().split('T')[0],
                                    outDate: rd.outDate || '',
                                    pricePerMonth: rd.price || 0,
                                    cbm: rd.volumeOccupied || 0,
                                    storageType: 'SIT',
                                    paymentCycle: rd.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly',
                                    status: rd.status === 'occupied' ? 'active' : 'pending'
                                }];
                            }

                            // Ensure any job has a visible jobNumber and shipperName
                            rd.jobs.forEach((j, jIdx) => {
                                if (!j.jobNumber || j.jobNumber.trim() === '') {
                                    j.jobNumber = `${1001 + jIdx}`;
                                }
                                if (!j.shipperName || j.shipperName.trim() === '') {
                                    j.shipperName = `Shipper #${j.jobNumber}`;
                                }
                            });

                            return { ...item, rackDetails: rd };
                        })
                    }));
                    return { ...wh, branch, levels: updatedLevels };
                });

                // 2. Ensure Qatar branch has a default warehouse
                if (!normalized.some(w => (w.branch || 'UAE') === 'QATAR')) {
                    const qatarWh: WarehouseConfig = {
                        ...DEFAULT_QATAR_CONFIG,
                        levels: [{ ...DEFAULT_QATAR_CONFIG.levels[0], items: generateProceduralLayout(DEFAULT_QATAR_CONFIG) }]
                    };
                    normalized.push(qatarWh);
                    supabase.from('warehouses').upsert({
                        id: qatarWh.id,
                        name: qatarWh.name,
                        data: qatarWh
                    }).then(({ error }) => { if (error) console.error("Error seeding Qatar:", error); });
                }

                // 3. Ensure KSA branch has a default warehouse
                if (!normalized.some(w => (w.branch || 'UAE') === 'KSA')) {
                    const ksaWh: WarehouseConfig = {
                        ...DEFAULT_KSA_CONFIG,
                        levels: [{ ...DEFAULT_KSA_CONFIG.levels[0], items: generateProceduralLayout(DEFAULT_KSA_CONFIG) }]
                    };
                    normalized.push(ksaWh);
                    supabase.from('warehouses').upsert({
                        id: ksaWh.id,
                        name: ksaWh.name,
                        data: ksaWh
                    }).then(({ error }) => { if (error) console.error("Error seeding KSA:", error); });
                }

                // 4. Scan localStorage legacy keys to recover any un-synced entries
                const legacyKeys = ['warehouses', 'warehouse_config', 'warehouseConfig', 'warehouse_planner_config', 'writer_warehouses_cache'];
                legacyKeys.forEach(k => {
                    try {
                        const raw = localStorage.getItem(k);
                        if (!raw) return;
                        const parsed = JSON.parse(raw);
                        const list: WarehouseConfig[] = Array.isArray(parsed) ? parsed : [parsed];
                        list.forEach(pWh => {
                            if (!pWh?.levels) return;
                            const matchWh = normalized.find(w => w.id === pWh.id || w.name === pWh.name);
                            if (!matchWh) return;
                            (pWh.levels || []).forEach(pLvl => {
                                (pLvl.items || []).forEach(pItem => {
                                    const pJobs = pItem.rackDetails?.jobs || [];
                                    if (pJobs.length > 0) {
                                        const mLvl = matchWh.levels.find(l => l.id === pLvl.id) || matchWh.levels[0];
                                        const mItem = mLvl?.items?.find(i => i.id === pItem.id);
                                        if (mItem && (!mItem.rackDetails?.jobs || mItem.rackDetails.jobs.length === 0)) {
                                            if (!mItem.rackDetails) {
                                                mItem.rackDetails = { status: 'occupied', jobs: pJobs, volumeOccupied: 0, enclosureType: 'Open Space' };
                                            } else {
                                                mItem.rackDetails.jobs = pJobs;
                                                mItem.rackDetails.status = 'occupied';
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    } catch (e) {}
                });

                setWarehouses(normalized);
                try {
                    localStorage.setItem('writer_warehouses_cache', JSON.stringify(normalized));
                } catch (e) {}

                // 5. Restore active branch and warehouse
                const savedBranch = localStorage.getItem('writer_active_branch') as BranchCode;
                const branchToUse: BranchCode = (savedBranch && ['UAE', 'QATAR', 'KSA'].includes(savedBranch)) ? savedBranch : 'UAE';
                setActiveBranch(branchToUse);

                const currentBranchWhs = normalized.filter(w => (w.branch || 'UAE') === branchToUse);
                const savedActiveId = localStorage.getItem(`writer_active_wh_${branchToUse}`) || localStorage.getItem('writer_active_warehouse_id');
                const matchedActive = currentBranchWhs.find(w => w.id === savedActiveId);
                const whWithJobs = currentBranchWhs.find(w => 
                    (w.levels || []).some(l => (l.items || []).some(i => (i.rackDetails?.jobs?.length || 0) > 0 || i.rackDetails?.shipperName))
                );

                if (matchedActive) {
                    const matchedHasJobs = (matchedActive.levels || []).some(l => (l.items || []).some(i => (i.rackDetails?.jobs?.length || 0) > 0));
                    if (!matchedHasJobs && whWithJobs && !localStorage.getItem(`writer_active_wh_${branchToUse}`)) {
                        setActiveWarehouseId(whWithJobs.id);
                    } else {
                        setActiveWarehouseId(matchedActive.id);
                    }
                } else if (whWithJobs) {
                    setActiveWarehouseId(whWithJobs.id);
                } else {
                    setActiveWarehouseId(currentBranchWhs[0]?.id || normalized[0].id);
                }
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
      // Always cache locally as safeguard
      try {
          setWarehouses(prev => {
              const updated = prev.map(w => w.id === configToSave.id ? configToSave : w);
              localStorage.setItem('writer_warehouses_cache', JSON.stringify(updated));
              return updated;
          });
      } catch (e) {}

      // Only save to DB if admin to prevent unauthorized overwrites
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
      setWarehouses(prev => {
          const updated = prev.map(w => w.id === newConfig.id ? newConfig : w);
          try {
              localStorage.setItem('writer_warehouses_cache', JSON.stringify(updated));
          } catch (e) {}
          return updated;
      });
      
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

      const branchCount = branchWarehouses.length + 1;
      const newId = `wh-${activeBranch.toLowerCase()}-${Date.now()}`;
      const defaultName = activeBranch === 'QATAR' 
          ? `Qatar Facility ${branchCount}` 
          : activeBranch === 'KSA' 
              ? `KSA Facility ${branchCount}` 
              : `Warehouse ${branchCount}`;

      const baseDefault = activeBranch === 'QATAR' 
          ? DEFAULT_QATAR_CONFIG 
          : activeBranch === 'KSA' 
              ? DEFAULT_KSA_CONFIG 
              : DEFAULT_CONFIG;

      const newWarehouse: WarehouseConfig = {
          ...baseDefault,
          id: newId,
          name: defaultName,
          branch: activeBranch,
          levels: [{ ...baseDefault.levels[0], id: `level-${Date.now()}`, items: [] }]
      };
      
      // Auto-generate layout immediately
      const initialItems = generateProceduralLayout(newWarehouse);
      newWarehouse.levels[0].items = initialItems;

      const updatedList = [...warehouses, newWarehouse];
      setWarehouses(updatedList);
      setActiveWarehouseId(newId);
      try {
          localStorage.setItem('writer_active_warehouse_id', newId);
          localStorage.setItem(`writer_active_wh_${activeBranch}`, newId);
          localStorage.setItem('writer_warehouses_cache', JSON.stringify(updatedList));
      } catch (err) {}

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

      const newId = `wh-${activeBranch.toLowerCase()}-${Date.now()}`;
      const newWarehouse: WarehouseConfig = {
          ...config,
          id: newId,
          name: `${config.name} (Copy)`,
          branch: config.branch || activeBranch,
          levels: config.levels.map(l => ({ ...l, id: `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }))
      };

      const updatedList = [...warehouses, newWarehouse];
      setWarehouses(updatedList);
      setActiveWarehouseId(newId);
      try {
          localStorage.setItem('writer_active_warehouse_id', newId);
          localStorage.setItem(`writer_active_wh_${activeBranch}`, newId);
          localStorage.setItem('writer_warehouses_cache', JSON.stringify(updatedList));
      } catch (err) {}

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
      if (branchWarehouses.length <= 1) {
          alert(`You must have at least one warehouse in ${currentBranchInfo.name}.`);
          return;
      }
      
      setDeleteTargetId(idToDelete);
      setConfirmInput('');
      setShowDeleteConfirm(true);
  };

  const confirmDeleteWarehouse = async () => {
      if (confirmInput.trim().toLowerCase() !== 'proceed' || !deleteTargetId) return;
      
      const idToDelete = deleteTargetId;
      console.log("Deleting warehouse:", idToDelete);
      // 1. Calculate new list
      const updatedList = warehouses.filter(w => w.id !== idToDelete);
      
      if (updatedList.length === warehouses.length) {
          console.error("Delete failed: Warehouse ID not found in list");
          setShowDeleteConfirm(false);
          return;
      }

      // 2. Determine next ID within current branch
      let nextId = activeWarehouseId;
      if (idToDelete === activeWarehouseId) {
         const remainingInBranch = updatedList.filter(w => (w.branch || 'UAE') === activeBranch);
         nextId = remainingInBranch.length > 0 ? remainingInBranch[0].id : (updatedList[0]?.id || ''); 
      }

      console.log("Next ID:", nextId);

      // 3. Update State Optimistically
      setWarehouses(updatedList);
      if (nextId) {
          setActiveWarehouseId(nextId);
          try {
              localStorage.setItem('writer_active_warehouse_id', nextId);
          } catch (e) {}
      }
      try {
          localStorage.setItem('writer_warehouses_cache', JSON.stringify(updatedList));
      } catch (e) {}

      // 4. Delete from DB
      const { error } = await supabase.from('warehouses').delete().eq('id', idToDelete);
      if (error) {
          console.error("Failed to delete from server:", error);
          alert("Warning: Could not delete from server. Refreshing may restore it.");
      }
      
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setConfirmInput('');
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

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleExport = () => {
    generateWarehouseReport(config);
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

  // --- Public Asset Profile View ---
  if (publicUnitId) {
      if (isPassportLoading) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="animate-spin text-brand-accent mb-4" size={48} />
                <p className="text-white font-black tracking-widest uppercase text-xs">Decrypting Digital Identity...</p>
            </div>
        );
      }

      // Find the item: either from live state (unitId) or from passportData (passportId)
      let foundItem: LayoutItem | null = null;
      let foundWarehouseName: string = '';
      let foundLevelName: string = 'Ground Level';
      let foundBranch: BranchCode = 'UAE';
      let isImmutable = false;
      let issueDate: string | null = null;
      
      if (passportData) {
        foundItem = passportData.data;
        foundWarehouseName = passportData.warehouse_name || passportData.data?.warehouseName || 'Writer Warehouse Facility';
        foundLevelName = passportData.level_name || passportData.data?.levelName || 'Main Level';
        foundBranch = (passportData.branch || passportData.data?.warehouseBranch || 'UAE') as BranchCode;
        isImmutable = true;
        issueDate = passportData.created_at 
            ? new Date(passportData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
            : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const targetWhId = urlParams.get('warehouseId');
        const targetBranch = (urlParams.get('branch') as BranchCode) || undefined;
        
        let match: { item: LayoutItem; wh: WarehouseConfig; levelName: string } | null = null;

        // 1. If a specific warehouse ID was provided in the link, search there first
        if (targetWhId) {
            const wh = warehouses.find(w => w.id === targetWhId);
            if (wh) {
                for (const level of wh.levels || []) {
                    const item = level.items?.find(i => i.id === publicUnitId);
                    if (item) {
                        match = { item, wh, levelName: level.name };
                        break;
                    }
                }
            }
        }

        // 2. If not found yet, search all warehouses prioritizing the one with active jobs/entries
        if (!match) {
            let bestScore = -1;
            for (const wh of warehouses) {
                for (const level of wh.levels || []) {
                    const item = level.items?.find(i => i.id === publicUnitId);
                    if (item) {
                        const jobsCount = item.rackDetails?.jobs?.length || 0;
                        const hasLegacy = Boolean(item.rackDetails?.jobNumber || item.rackDetails?.shipperName);
                        const score = jobsCount > 0 ? (jobsCount + 10) : (hasLegacy ? 5 : 1);
                        if (score > bestScore) {
                            bestScore = score;
                            match = { item, wh, levelName: level.name };
                        }
                    }
                }
            }
        }

        if (match) {
            foundItem = match.item;
            foundWarehouseName = match.wh.name;
            foundLevelName = match.levelName;
            foundBranch = (match.wh.branch || targetBranch || 'UAE') as BranchCode;
        }
      }

      if (!foundItem || publicUnitId === 'NOT_FOUND') {
          return (
              <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                  <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
                      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                          <X size={36} />
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 mb-2">Asset Identity Not Found</h2>
                      <p className="text-gray-500 text-sm mb-8 leading-relaxed">The digital identity for this unit has expired, been relocated, or is unavailable in our regional records.</p>
                      <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3.5 bg-brand-primary text-white font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 cursor-pointer text-xs"
                      >
                          Return to Planner
                      </button>
                  </div>
              </div>
          );
      }

      // Branch metadata
      const bInfo = BRANCH_MAP[foundBranch] || BRANCH_MAP['UAE'];
      const currency = bInfo.currency;

      // Cabin / Rack Classification
      const isCabin = foundItem.type === 'open_cabin' 
          || foundItem.rackDetails?.enclosureType === 'Close Cabin' 
          || (typeof foundItem.label === 'string' && foundItem.label.toLowerCase().includes('cabin'));
      
      const itemTypeLabel = isCabin 
          ? 'Storage Cabin' 
          : foundItem.type === 'rack' 
              ? 'Pallet Racking Bay' 
              : foundItem.type === 'open_space_storage'
                  ? 'Open Space Storage'
                  : foundItem.type.replace(/_/g, ' ').toUpperCase();

      // Normalize jobs (include legacy fields if jobs array is empty)
      const activeJobs: JobEntry[] = (foundItem.rackDetails?.jobs && foundItem.rackDetails.jobs.length > 0)
          ? foundItem.rackDetails.jobs
          : (foundItem.rackDetails?.shipperName || foundItem.rackDetails?.jobNumber)
              ? [{
                  id: 'legacy-job',
                  jobNumber: foundItem.rackDetails.jobNumber || 'N/A',
                  shipperName: foundItem.rackDetails.shipperName || 'Authorized Shipper',
                  inDate: foundItem.rackDetails.inDate || 'Registered',
                  outDate: foundItem.rackDetails.outDate || '',
                  pricePerMonth: foundItem.rackDetails.price || 0,
                  cbm: foundItem.rackDetails.volumeOccupied || 0,
                  storageType: 'SIT' as const,
                  paymentCycle: foundItem.rackDetails.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly',
                  status: 'active' as const,
                  packages: []
              }]
              : [];

      // Volume & Capacity Computations
      const widthCm = foundItem.width || 100;
      const heightCm = foundItem.height || 200;
      const depthCm = foundItem.depth || 100;
      const footprintM2 = ((widthCm * heightCm) / 10000).toFixed(2);
      const totalVolumeM3 = ((widthCm * heightCm * depthCm) / 1000000).toFixed(2);
      const capacityCbm = foundItem.rackDetails?.capacityPerLevel || Math.max(1, Math.round(Number(totalVolumeM3) * 0.85));
      const totalAllocatedCbm = activeJobs.reduce((sum, j) => sum + (j.cbm || 0), 0);
      const loadFactorPercent = Math.min(100, Math.round((totalAllocatedCbm / Math.max(0.1, capacityCbm)) * 100));

      // Package Counts
      const totalPackages = activeJobs.reduce((sum, j) => sum + (j.packages?.length || 0), 0);
      const totalPackagesIn = activeJobs.reduce((sum, j) => sum + (j.packages?.filter(p => p.status === 'in').length || 0), 0);
      const totalPackagesOut = activeJobs.reduce((sum, j) => sum + (j.packages?.filter(p => p.status === 'out').length || 0), 0);

      const copyPublicLink = () => {
          const url = window.location.href;
          navigator.clipboard.writeText(url);
          setCopiedPassportLink(true);
          setTimeout(() => setCopiedPassportLink(false), 2500);
      };

      return (
          <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans overflow-y-auto pb-24">
              {/* Luxury Facility Header */}
              <div className="bg-[#0B1B3D] p-5 sm:p-8 md:p-12 text-white rounded-b-[2rem] sm:rounded-b-[3rem] shadow-2xl relative overflow-hidden shrink-0 border-b-4 border-brand-accent">
                  <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-brand-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
                  
                  <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div>
                          {/* Brand Identity */}
                          <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-brand-accent text-black font-serif font-black rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-yellow-500/20 rotate-1 shrink-0">
                                  W
                              </div>
                              <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-black uppercase tracking-wider text-white leading-tight">
                                          Writer Relocations
                                      </h1>
                                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-brand-accent font-mono font-bold">
                                          {bInfo.flag} {bInfo.code}
                                      </span>
                                  </div>
                                  <p className="text-brand-accent text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase mt-0.5">
                                      Asset Identification & Verification System
                                  </p>
                              </div>
                          </div>

                          {/* Security & Verification Badges */}
                          <div className="flex items-center gap-2 flex-wrap mt-4 text-[10px] font-black uppercase tracking-wider">
                              <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 flex items-center gap-1.5 text-white">
                                  <ShieldCheck size={13} className="text-brand-accent shrink-0" />
                                  <span>Official Facility Asset</span>
                              </span>
                              <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                  <span>Secure Operational Status</span>
                              </span>
                              <span className="bg-blue-500/20 backdrop-blur-md text-blue-300 px-3 py-1.5 rounded-full border border-blue-500/30">
                                  {foundWarehouseName} • {foundLevelName}
                              </span>
                          </div>
                      </div>

                      {/* Header Quick Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <button
                              onClick={() => window.print()}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-sm active:scale-95"
                              title="Print Asset Tag / Spec Sheet"
                          >
                              <Printer size={14} className="text-brand-accent" />
                              <span>Print Record</span>
                          </button>
                          <button
                              onClick={copyPublicLink}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95 cursor-pointer ${
                                  copiedPassportLink 
                                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/30' 
                                      : 'bg-brand-accent hover:bg-yellow-400 text-black border-black/10'
                              }`}
                              title="Copy Asset Verification Link"
                          >
                              {copiedPassportLink ? <Check size={14} /> : <Share2 size={14} />}
                              <span>{copiedPassportLink ? 'Link Copied!' : 'Share Link'}</span>
                          </button>
                          <button
                              onClick={() => window.location.href = '/'}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
                              title="Open Full Management Studio"
                          >
                              <ArrowLeft size={14} />
                              <span className="hidden sm:inline">Planner</span>
                          </button>
                      </div>
                  </div>
              </div>

              {/* Main Body */}
              <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* --- Hero Identity Card --- */}
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
                      <div className="bg-gradient-to-br from-[#0B1B3D] via-gray-900 to-[#12285A] p-6 sm:p-8 text-white relative">
                          <div className="relative z-10 space-y-3">
                              {/* Metadata Badges */}
                              <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-3 py-1 bg-brand-accent text-brand-primary font-black text-[9px] rounded-full uppercase tracking-widest shadow-md">
                                      {isImmutable ? 'IMMUTABLE DIGITAL PASSPORT' : 'OFFICIAL LIVE DIGITAL ID'}
                                  </span>
                                  <span className="px-3 py-1 bg-white/10 text-white font-black text-[9px] rounded-full uppercase tracking-widest border border-white/20">
                                      {bInfo.flag} {bInfo.name}
                                  </span>
                                  <span className="px-3 py-1 bg-white/10 text-white font-black text-[9px] rounded-full uppercase tracking-widest border border-white/20">
                                      {foundWarehouseName}
                                  </span>
                                  <span className="px-3 py-1 bg-white/10 text-brand-accent font-black text-[9px] rounded-full uppercase tracking-widest border border-white/20">
                                      {foundLevelName}
                                  </span>
                                  {issueDate && (
                                      <span className="px-3 py-1 bg-white/10 text-gray-300 font-black text-[9px] rounded-full uppercase tracking-widest border border-white/20">
                                          ISSUED: {issueDate}
                                      </span>
                                  )}
                              </div>

                              {/* Unit Label & Classification */}
                              <div className="pt-2">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-600/90 text-white border border-teal-400/40">
                                          {itemTypeLabel}
                                      </span>
                                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600/90 text-white border border-blue-400/40">
                                          {foundItem.rackDetails?.enclosureType || (isCabin ? 'Close Cabin' : 'Open Space')}
                                      </span>
                                  </div>
                                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight break-words">
                                      {foundItem.label || (isCabin ? 'Storage Cabin' : foundItem.type.replace(/_/g, ' ').toUpperCase())}
                                  </h2>
                                  <p className="text-brand-accent/90 font-mono text-xs sm:text-sm font-bold tracking-wider mt-1 break-all">
                                      UNIT SERIAL ID: {foundItem.id}
                                  </p>
                              </div>
                          </div>

                          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                              <QrCode size={180} />
                          </div>
                      </div>
                      
                      {/* Technical Specs Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200">
                          <div className="bg-white p-4 sm:p-5 text-center flex flex-col justify-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dimensions</p>
                              <p className="text-base sm:text-lg font-black text-gray-900 font-mono leading-tight">
                                  {widthCm} × {heightCm} × {depthCm}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5">CM (W × L × H)</p>
                          </div>

                          <div className="bg-white p-4 sm:p-5 text-center flex flex-col justify-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Floor Footprint</p>
                              <p className="text-base sm:text-lg font-black text-gray-900 font-mono leading-tight">
                                  {footprintM2} m²
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5">Volume: {totalVolumeM3} m³</p>
                          </div>

                          <div className="bg-white p-4 sm:p-5 text-center flex flex-col justify-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rated Capacity</p>
                              <p className="text-base sm:text-lg font-black text-gray-900 font-mono leading-tight">
                                  {capacityCbm} CBM
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                                  {foundItem.rackDetails?.levels || 1} Tier Level(s)
                              </p>
                          </div>

                          <div className="bg-white p-4 sm:p-5 text-center flex flex-col justify-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                  <span className={`w-2.5 h-2.5 rounded-full ${foundItem.rackDetails?.status === 'available' ? 'bg-emerald-500' : 'bg-brand-accent'}`} />
                                  <span className="text-sm sm:text-base font-black uppercase text-gray-800">
                                      {foundItem.rackDetails?.status || (activeJobs.length > 0 ? 'Occupied' : 'Available')}
                                  </span>
                              </div>
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5 truncate px-1">
                                  {foundItem.rackDetails?.salesPerson || 'Authorized Rep'}
                              </p>
                          </div>
                      </div>
                  </div>

                  {/* --- Jobs & Shippers Section --- */}
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                          <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                              <LayoutTemplate size={16} className="text-brand-primary" /> 
                              <span>Shipper Allocations & Consignments ({activeJobs.length})</span>
                          </h3>
                          {activeJobs.length > 0 && (
                              <span className="text-xs font-bold text-gray-500">
                                  Total Allocated: <strong className="text-gray-900">{totalAllocatedCbm.toFixed(2)} CBM</strong>
                              </span>
                          )}
                      </div>
                      
                      {activeJobs.length > 0 ? (
                          <div className="flex flex-col gap-6">
                              {activeJobs.map((job, jIdx) => {
                                  const jobPackages = job.packages || [];
                                  const pIn = jobPackages.filter(p => p.status === 'in').length;
                                  const pOut = jobPackages.filter(p => p.status === 'out').length;
                                  const pNone = jobPackages.filter(p => p.status === 'none').length;

                                  const movementHistory = jobPackages.flatMap(p => 
                                      (p.history || []).map(h => ({
                                          pkgNum: p.number,
                                          type: h.status,
                                          time: h.timestamp
                                      }))
                                  ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

                                  return (
                                      <div key={job.id || jIdx} className="bg-white rounded-3xl shadow-lg border-2 border-gray-200 overflow-hidden">
                                          {/* Job Card Header */}
                                          <div className="bg-gray-50 px-6 sm:px-8 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-brand-primary text-brand-accent rounded-xl flex items-center justify-center font-black text-sm shadow shrink-0">
                                                      {bInfo.jobPrefix}
                                                  </div>
                                                  <div>
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                          Job Certificate
                                                      </p>
                                                      <h4 className="text-lg font-black text-gray-900 tracking-tight font-mono">
                                                          #{job.jobNumber ? `${bInfo.jobPrefix}${job.jobNumber}` : `REG-${jIdx + 1}`}
                                                      </h4>
                                                  </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-2 flex-wrap">
                                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                      job.storageType === 'SIT' 
                                                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                          : 'bg-purple-50 border-purple-200 text-purple-700'
                                                  }`}>
                                                      {job.storageType || 'SIT'} Storage
                                                  </span>
                                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                      job.status === 'active' 
                                                          ? 'bg-emerald-100 text-emerald-800' 
                                                          : job.status === 'completed' 
                                                              ? 'bg-gray-100 text-gray-700' 
                                                              : 'bg-amber-100 text-amber-800'
                                                  }`}>
                                                      {job.status || 'Active'}
                                                  </span>
                                                  {job.pricePerMonth ? (
                                                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-50 border border-yellow-200 text-yellow-800">
                                                          {currency} {job.pricePerMonth.toLocaleString()} / {job.paymentCycle || 'Monthly'}
                                                      </span>
                                                  ) : null}
                                              </div>
                                          </div>

                                          {/* Job Details Content */}
                                          <div className="p-6 sm:p-8 space-y-6">
                                              {/* Shipper Name & In/Out Dates */}
                                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                  <div className="space-y-1">
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                          Shipper Account Name
                                                      </p>
                                                      <h4 className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug break-words">
                                                          {job.shipperName || 'Authorized Shipper'}
                                                      </h4>
                                                  </div>
                                                  <div className="flex items-center gap-4 text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 shrink-0">
                                                      <div className="flex items-center gap-1.5">
                                                          <Calendar size={14} className="text-brand-primary" />
                                                          <span>IN: <strong className="text-gray-900">{job.inDate || 'Registered'}</strong></span>
                                                      </div>
                                                      {job.outDate && (
                                                          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                                                              <Calendar size={14} className="text-red-500" />
                                                              <span>OUT: <strong className="text-gray-900">{job.outDate}</strong></span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* Consignment Specs Grid */}
                                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                  <div>
                                                      <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Volume Allocated</p>
                                                      <p className="text-sm font-black text-brand-primary font-mono">{(job.cbm || 0).toFixed(2)} CBM</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Total Packages</p>
                                                      <p className="text-sm font-black text-gray-900 font-mono">{jobPackages.length} Units</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Tagged In-Stock</p>
                                                      <p className="text-sm font-black text-emerald-600 font-mono">{pIn} Units</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Checked Out</p>
                                                      <p className="text-sm font-black text-red-600 font-mono">{pOut} Units</p>
                                                  </div>
                                              </div>

                                              {/* Consignment Notes */}
                                              {job.notes && (
                                                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                                                      <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1">
                                                          <FileText size={12} /> Handling / Consignment Notes
                                                      </p>
                                                      <p className="text-xs text-amber-950 font-medium leading-relaxed break-words">
                                                          {job.notes}
                                                      </p>
                                                  </div>
                                              )}

                                              {/* Package Inventory Breakdown */}
                                              {jobPackages.length > 0 && (
                                                  <div className="space-y-2">
                                                      <div className="flex items-center justify-between text-xs">
                                                          <span className="font-black text-gray-600 uppercase tracking-wider text-[10px]">
                                                              Package Inventory Manifest ({jobPackages.length} Items)
                                                          </span>
                                                          <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                                                              <span className="text-emerald-700">In: {pIn}</span>
                                                              <span className="text-red-700">Out: {pOut}</span>
                                                              {pNone > 0 && <span className="text-gray-500">Unallocated: {pNone}</span>}
                                                          </div>
                                                      </div>
                                                      <div className="max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-1.5 custom-scrollbar">
                                                          {jobPackages.map(pkg => (
                                                              <span 
                                                                  key={pkg.number} 
                                                                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${
                                                                      pkg.status === 'in'
                                                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                          : pkg.status === 'out'
                                                                              ? 'bg-red-100 text-red-800 border-red-300'
                                                                              : 'bg-white text-gray-600 border-gray-300'
                                                                  }`}
                                                                  title={`Package #${pkg.number}: ${pkg.status.toUpperCase()}`}
                                                              >
                                                                  #{pkg.number}
                                                              </span>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}

                                              {/* Movement History Audit Logs */}
                                              <div className="space-y-2">
                                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                      <Clock size={12} className="text-brand-primary" /> 
                                                      <span>Movement Audit Trail ({movementHistory.length} Recorded Events)</span>
                                                  </p>
                                                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                      {movementHistory.length > 0 ? (
                                                          movementHistory.map((entry, mIdx) => (
                                                              <div 
                                                                  key={mIdx} 
                                                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs hover:bg-gray-100 transition-colors"
                                                              >
                                                                  <div className="flex items-center gap-2">
                                                                      <span className={`w-2 h-2 rounded-full shrink-0 ${entry.type === 'in' ? 'bg-emerald-500 shadow-sm' : 'bg-red-500 shadow-sm'}`} />
                                                                      <span className="font-bold text-gray-900 font-mono">PKG #{entry.pkgNum}</span>
                                                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                                          entry.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                                      }`}>
                                                                          {entry.type === 'in' ? 'Check-In' : 'Check-Out'}
                                                                      </span>
                                                                  </div>
                                                                  <span className="font-mono text-gray-500 text-[11px]">
                                                                      {new Date(entry.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                  </span>
                                                              </div>
                                                          ))
                                                      ) : (
                                                          <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-400 text-xs italic">
                                                              No movement events registered yet for this consignment.
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-gray-300 space-y-3">
                              <Box size={44} className="mx-auto text-gray-300" />
                              <h4 className="text-lg font-bold text-gray-800">Unit Available for Consignment Assignment</h4>
                              <p className="text-gray-500 text-xs max-w-md mx-auto leading-relaxed">
                                  This {itemTypeLabel.toLowerCase()} is currently vacant and prepared for inbound pallet/consignment allocation in {foundWarehouseName}.
                              </p>
                              <div className="pt-2 flex justify-center gap-2 flex-wrap">
                                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                                      Ready for Inbound Goods
                                  </span>
                                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                                      Capacity: {capacityCbm} CBM
                                  </span>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* --- Structural Integrity, Safety & Compliance --- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 space-y-4">
                          <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
                              <Activity size={15} /> Structural Integrity & Load Metric
                          </h4>
                          <div className="space-y-3">
                              <div>
                                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                                      <span className="text-gray-500">Main Frame Stability</span>
                                      <span className="text-emerald-600">OPTIMAL (95%)</span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 w-[95%]" />
                                  </div>
                              </div>

                              <div>
                                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                                      <span className="text-gray-500">Volumetric Utilization Factor</span>
                                      <span className="text-brand-primary font-mono">{loadFactorPercent}% ({totalAllocatedCbm.toFixed(1)} / {capacityCbm} CBM)</span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                          className={`h-full transition-all duration-500 ${loadFactorPercent > 90 ? 'bg-red-500' : loadFactorPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                          style={{ width: `${Math.min(100, Math.max(5, loadFactorPercent))}%` }} 
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 flex flex-col justify-between space-y-4">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                                  <RefreshCw size={22} />
                              </div>
                              <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Next Scheduled Inspection</p>
                                  <p className="text-lg font-black text-gray-900 uppercase">August 2026</p>
                                  <p className="text-[10px] text-gray-500 font-medium">Annual Facility & Racking Audit by Regional Engineer</p>
                              </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[10px] text-gray-600 font-semibold flex items-center justify-between">
                              <span>Security Standards:</span>
                              <span className="text-emerald-700 font-black uppercase">24/7 Monitored • Temperature Controlled</span>
                          </div>
                      </div>
                  </div>
              </main>

              {/* Luxury Corporate Footer */}
              <footer className="p-8 sm:p-12 text-center text-gray-500 border-t border-gray-200 mt-12 bg-white">
                   <div className="flex items-center justify-center gap-3 mb-3">
                        <span className="text-xl font-serif font-black tracking-widest text-gray-900">WRITER</span>
                        <div className="h-5 w-px bg-gray-300" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">WAREHOUSE MANAGEMENT SYSTEMS</span>
                   </div>
                   <p className="text-[10px] font-semibold uppercase tracking-wider leading-relaxed text-gray-400 max-w-xl mx-auto">
                       Confidential Digital Identity & Asset Verification Record. <br />
                       © 2026 Writer Relocations ({bInfo.country}). All rights reserved. <br />
                       Authorised Personnel Access Only.
                   </p>
                   <div className="mt-6">
                       <button 
                        onClick={() => window.location.href = '/'} 
                        className="text-[10px] font-black text-brand-primary hover:text-black border-b-2 border-brand-accent transition-all uppercase tracking-[0.25em] py-1 cursor-pointer"
                       >
                           Switch to Management Studio View
                       </button>
                   </div>
              </footer>
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
      <header className="bg-brand-primary text-white h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 shadow-md z-30 shrink-0 border-b-2 border-brand-accent">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
            {/* Mobile / Tablet Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center shrink-0"
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
            >
                <Menu size={20} />
            </button>

            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-brand-accent text-black font-serif font-black flex items-center justify-center text-sm shadow">
                    W
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="text-base sm:text-xl font-serif font-bold tracking-widest text-white leading-none">WRITER</h1>
                    <div className="flex items-center gap-1.5">
                        <p className="text-[9px] sm:text-[10px] font-sans font-bold text-red-500 uppercase tracking-[0.2em] leading-tight">RELOCATIONS</p>
                        <span className="hidden sm:inline text-[8px] text-brand-accent bg-gray-800 px-1 rounded ml-1 opacity-80">PLANNER</span>
                    </div>
                </div>
            </div>

            {/* Branch Selector (Desktop lg+) */}
            <div className="hidden lg:flex items-center bg-gray-900/90 p-1 rounded-xl border border-gray-700/80 shadow-inner">
                {BRANCH_LIST.map((b) => {
                    const isSelected = activeBranch === b.code;
                    const bWhs = warehouses.filter(w => (w.branch || 'UAE') === b.code);
                    const bJobs = bWhs.reduce((sum, w) => 
                        sum + (w.levels || []).reduce((lSum, lvl) => 
                            lSum + (lvl.items || []).reduce((iSum, i) => iSum + (i.rackDetails?.jobs?.length || 0), 0)
                        , 0)
                    , 0);

                    return (
                        <button
                            key={b.code}
                            onClick={() => handleSelectBranch(b.code)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isSelected 
                                    ? 'bg-brand-accent text-black shadow-md font-black ring-1 ring-white/20' 
                                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                            title={`${b.name} (${b.country}) - Currency: ${b.currency}`}
                        >
                            <span className="text-sm leading-none">{b.flag}</span>
                            <span className="font-extrabold uppercase tracking-wide">{b.code}</span>
                            {bJobs > 0 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                                    isSelected ? 'bg-black text-brand-accent' : 'bg-brand-accent/20 text-brand-accent'
                                }`}>
                                    {bJobs}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Warehouse Selector */}
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 bg-gray-800 rounded-md p-1 pl-2.5 sm:pl-3 border border-gray-700 z-20 shrink-0">
                <Building2 size={15} className="text-gray-400 shrink-0" />
                
                <div className="relative">
                    <select 
                        value={activeWarehouseId}
                        onChange={(e) => {
                            const newId = e.target.value;
                            setActiveWarehouseId(newId);
                            try {
                                localStorage.setItem('writer_active_warehouse_id', newId);
                                localStorage.setItem(`writer_active_wh_${activeBranch}`, newId);
                            } catch (err) {}
                        }}
                        className="bg-transparent text-xs sm:text-sm font-bold text-white border-none outline-none cursor-pointer focus:ring-0 w-28 sm:w-36 md:w-52 appearance-none pr-5 sm:pr-6 truncate"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                        {branchWarehouses.map(w => {
                            const jobsCount = (w.levels || []).reduce((sum, l) => sum + (l.items || []).reduce((iSum, i) => iSum + (i.rackDetails?.jobs?.length || 0), 0), 0);
                            return (
                                <option key={w.id} value={w.id} className="text-black">
                                    {w.name} {jobsCount > 0 ? `(${jobsCount} ${jobsCount === 1 ? 'Job' : 'Jobs'})` : ''}
                                </option>
                            );
                        })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-400">
                        <ChevronDown size={14} />
                    </div>
                </div>

                {isAdmin && (
                    <div className="hidden md:flex items-center border-l border-gray-600 pl-1.5 ml-1">
                        <button 
                            onClick={handleAddWarehouse}
                            title={`Add New Facility to ${currentBranchInfo.name}`}
                            className="p-1 hover:bg-brand-accent hover:text-black rounded transition-colors text-gray-300"
                        >
                            <Plus size={15} />
                        </button>
                        <button 
                            onClick={handleDuplicateWarehouse}
                            title="Duplicate Current Warehouse"
                            className="p-1 hover:bg-blue-500 hover:text-white rounded transition-colors text-gray-300 ml-1"
                        >
                            <Copy size={15} />
                        </button>
                        {branchWarehouses.length > 1 && (
                            <button 
                                onClick={(e) => handleDeleteWarehouse(e, activeWarehouseId)}
                                title="Delete Current Warehouse"
                                className="p-1 hover:bg-red-600 hover:text-white rounded transition-colors text-gray-300 ml-1"
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
             {/* Sync Status Indicator */}
             <div className="hidden xl:flex items-center gap-2 mr-2">
                 {syncStatus === 'saving' && <span className="text-[10px] text-gray-400 flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Saving...</span>}
                 {syncStatus === 'saved' && <span className="text-[10px] text-green-500 flex items-center gap-1"><CheckCircle size={10}/> Saved</span>}
                 {syncStatus === 'error' && <span className="text-[10px] text-red-500 flex items-center gap-1"><CloudOff size={10}/> Sync Error</span>}
                 {syncStatus === 'idle' && (
                      <div title="Synced">
                        <Cloud size={14} className="text-gray-600" />
                      </div>
                  )}
             </div>

            {/* View Modes (2D / 3D) */}
            <div className="bg-white/10 rounded-lg p-0.5 sm:p-1 flex">
                <button 
                    onClick={() => setViewMode('2D')}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors flex items-center gap-1 sm:gap-2 ${viewMode === '2D' ? 'bg-brand-accent text-black font-bold shadow' : 'text-gray-300 hover:text-white'}`}
                >
                    <LayoutTemplate size={14} /> 2D
                </button>
                <button 
                    onClick={() => setViewMode('3D')}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors flex items-center gap-1 sm:gap-2 ${viewMode === '3D' ? 'bg-brand-accent text-black font-bold shadow' : 'text-gray-300 hover:text-white'}`}
                >
                    <Cuboid size={14} /> 3D
                </button>
            </div>

            {/* Mobile Parameters Sidebar Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isSidebarOpen 
                        ? 'bg-brand-accent text-black border-brand-accent font-black' 
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
                title="Toggle Warehouse Parameters"
            >
                <Settings size={14} className={isSidebarOpen ? 'text-black' : 'text-brand-accent'} />
                <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Job Search Button */}
            <button 
                onClick={() => setShowJobSearch(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2 sm:px-3 py-1.5 rounded text-xs font-bold transition-all border border-white/20"
                title="Search Jobs, Shippers & Cabins"
            >
                <Search size={14} className="text-brand-accent" /> 
                <span className="hidden md:inline">SEARCH</span>
            </button>

            {/* Financials Button */}
            <button 
                onClick={() => setShowFinancials(true)}
                className="hidden md:flex items-center gap-1.5 bg-green-900/40 hover:bg-green-800 text-green-300 px-2.5 sm:px-3 py-1.5 rounded text-xs font-bold transition-all border border-green-800/50"
                title="View Billing & Financial Summary"
            >
                <Coins size={14} className="text-brand-accent" /> 
                <span className="hidden xl:inline text-brand-accent font-black">FINANCIALS</span>
            </button>

            {/* Export PDF Button */}
            <button onClick={handleExport} className="hidden md:flex bg-brand-accent hover:bg-yellow-400 text-black px-3 py-1.5 rounded text-xs font-bold items-center gap-1.5 transition-colors border border-black/10">
                <Download size={14} /> <span className="hidden lg:inline">Export PDF</span>
            </button>

            {/* Auth Button */}
            {isAdmin ? (
                 <button 
                    onClick={() => setIsAdmin(false)}
                    className="flex items-center gap-1.5 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-2.5 py-1.5 rounded border border-red-800 transition-colors"
                    title="Switch to Read-Only mode"
                 >
                    <Unlock size={14} /> <span className="hidden md:inline">Admin</span>
                 </button>
            ) : (
                <button 
                    onClick={() => setShowLogin(true)}
                    className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded border border-gray-600 transition-colors"
                    title="Login as Administrator"
                >
                    <Lock size={14} /> <span className="hidden md:inline">Guest</span>
                 </button>
            )}

            <button 
                onClick={toggleFullScreen}
                className="hidden sm:block p-1.5 sm:p-2 hover:bg-white/10 rounded text-white transition-colors"
                title="Full Screen Mode"
            >
                <Maximize size={18} />
            </button>
        </div>
      </header>
      )}

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-gray-900 text-white shadow-2xl z-50 flex flex-col border-r border-gray-700 animate-in slide-in-from-left duration-200">
                {/* Drawer Header */}
                <div className="p-4 bg-brand-primary border-b-2 border-brand-accent flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-accent text-black font-serif font-black flex items-center justify-center text-sm shadow">
                            W
                        </div>
                        <div>
                            <h2 className="text-base font-serif font-bold tracking-widest text-white leading-none">WRITER</h2>
                            <p className="text-[9px] font-sans font-bold text-red-500 uppercase tracking-widest leading-none mt-0.5">RELOCATIONS</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-sm">
                    {/* Branch Switcher */}
                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Globe size={13} className="text-brand-accent" /> Operating Branch
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 bg-gray-800/80 p-1.5 rounded-xl border border-gray-700">
                            {BRANCH_LIST.map((b) => {
                                const isSelected = activeBranch === b.code;
                                const bWhs = warehouses.filter(w => (w.branch || 'UAE') === b.code);
                                const bJobs = bWhs.reduce((sum, w) => 
                                    sum + (w.levels || []).reduce((lSum, lvl) => 
                                        lSum + (lvl.items || []).reduce((iSum, i) => iSum + (i.rackDetails?.jobs?.length || 0), 0)
                                    , 0)
                                , 0);
                                return (
                                    <button
                                        key={b.code}
                                        onClick={() => {
                                            handleSelectBranch(b.code);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                                            isSelected 
                                                ? 'bg-brand-accent text-black font-black shadow' 
                                                : 'text-gray-300 hover:bg-white/10'
                                        }`}
                                    >
                                        <span className="text-base leading-none mb-1">{b.flag}</span>
                                        <span className="uppercase text-[11px]">{b.code}</span>
                                        {bJobs > 0 && (
                                            <span className={`text-[9px] mt-0.5 px-1 rounded-full ${isSelected ? 'bg-black text-brand-accent' : 'bg-brand-accent/20 text-brand-accent'}`}>
                                                {bJobs} {bJobs === 1 ? 'Job' : 'Jobs'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Facility / Warehouse Switcher */}
                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><Building2 size={13} className="text-brand-accent" /> Facility Selection</span>
                            {isAdmin && (
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={(e) => { handleAddWarehouse(e); setIsMobileMenuOpen(false); }}
                                        className="p-1 hover:bg-brand-accent hover:text-black rounded text-gray-300 transition-colors"
                                        title="Add Facility"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => { handleDuplicateWarehouse(e); setIsMobileMenuOpen(false); }}
                                        className="p-1 hover:bg-blue-500 hover:text-white rounded text-gray-300 transition-colors"
                                        title="Duplicate Facility"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            {branchWarehouses.map((w) => {
                                const isSelected = w.id === activeWarehouseId;
                                const jobsCount = (w.levels || []).reduce((sum, l) => sum + (l.items || []).reduce((iSum, i) => iSum + (i.rackDetails?.jobs?.length || 0), 0), 0);
                                return (
                                    <div 
                                        key={w.id}
                                        onClick={() => {
                                            setActiveWarehouseId(w.id);
                                            try {
                                                localStorage.setItem('writer_active_warehouse_id', w.id);
                                                localStorage.setItem(`writer_active_wh_${activeBranch}`, w.id);
                                            } catch (err) {}
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                                            isSelected 
                                                ? 'bg-brand-accent text-black font-bold' 
                                                : 'bg-gray-800/60 text-gray-200 hover:bg-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Building2 size={16} className={isSelected ? 'text-black' : 'text-gray-400'} />
                                            <span className="truncate">{w.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {jobsCount > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-black text-brand-accent' : 'bg-gray-700 text-gray-300'}`}>
                                                    {jobsCount}
                                                </span>
                                            )}
                                            {isAdmin && branchWarehouses.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteWarehouse(e, w.id);
                                                    }}
                                                    className={`p-1 rounded hover:bg-red-600 hover:text-white transition-colors ${isSelected ? 'text-black' : 'text-gray-400'}`}
                                                    title="Delete Facility"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Action Navigation Buttons */}
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                        <button
                            onClick={() => { setIsSidebarOpen(true); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center justify-between p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5"><Settings size={16} className="text-brand-accent" /> Warehouse Parameters</span>
                            <ChevronRight size={16} className="text-gray-500" />
                        </button>

                        <button
                            onClick={() => { setShowJobSearch(true); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center justify-between p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5"><Search size={16} className="text-brand-accent" /> Job & Shipper Directory</span>
                            <ChevronRight size={16} className="text-gray-500" />
                        </button>

                        <button
                            onClick={() => { setShowFinancials(true); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center justify-between p-2.5 bg-green-950/60 hover:bg-green-900 border border-green-800/40 rounded-lg text-green-300 font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5"><Coins size={16} className="text-brand-accent" /> Financial Summary & Goals</span>
                            <ChevronRight size={16} className="text-green-500" />
                        </button>

                        <button
                            onClick={() => { handleExport(); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center justify-between p-2.5 bg-brand-accent text-black font-black rounded-lg hover:bg-yellow-400 transition-colors"
                        >
                            <span className="flex items-center gap-2.5"><Download size={16} /> Export PDF Layout</span>
                            <ChevronRight size={16} />
                        </button>

                        {aiResult?.generatedLayout && isAdmin && (
                            <button
                                onClick={() => { handleApplyAIDesign(); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center justify-between p-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold transition-colors animate-pulse"
                            >
                                <span className="flex items-center gap-2.5"><Sparkles size={16} /> Apply AI Design</span>
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>

                    {/* Mode & System Info */}
                    <div className="pt-2 border-t border-gray-800 space-y-2">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/40 text-xs">
                            <span className="text-gray-400">Current Role:</span>
                            {isAdmin ? (
                                <button
                                    onClick={() => { setIsAdmin(false); setIsMobileMenuOpen(false); }}
                                    className="px-2 py-1 rounded bg-red-900/60 text-red-200 text-xs font-bold border border-red-700 flex items-center gap-1"
                                >
                                    <Unlock size={12} /> Administrator
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setShowLogin(true); setIsMobileMenuOpen(false); }}
                                    className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs font-bold border border-gray-600 flex items-center gap-1"
                                >
                                    <Lock size={12} /> Guest (Log In)
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-2 text-xs text-gray-400">
                            <span>Cloud Sync:</span>
                            <span className="flex items-center gap-1">
                                {syncStatus === 'saving' && <><RefreshCw size={11} className="animate-spin text-amber-400"/> Saving</>}
                                {syncStatus === 'saved' && <><CheckCircle size={11} className="text-green-400"/> Synced</>}
                                {syncStatus === 'error' && <><CloudOff size={11} className="text-red-400"/> Error</>}
                                {syncStatus === 'idle' && <><Cloud size={11} className="text-gray-400"/> Ready</>}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {showJobSearch && (
            <JobSearch 
                config={config} 
                warehouses={warehouses}
                activeBranch={activeBranch}
                onSelectWarehouseAndItem={(whId, itemId, branch, levelId, locateInfo) => {
                    if (branch) {
                        handleSelectBranch(branch);
                    }
                    setActiveWarehouseId(whId);
                    try {
                        localStorage.setItem('writer_active_warehouse_id', whId);
                        if (branch) {
                            localStorage.setItem(`writer_active_wh_${branch}`, whId);
                        }
                    } catch (err) {}
                    if (levelId) {
                        setWarehouses(prev => prev.map(w => {
                            if (w.id === whId) {
                                return { ...w, activeLevelId: levelId };
                            }
                            return w;
                        }));
                    }
                    setViewMode('2D');
                    setSelectedItemIds([itemId]);
                    setShowJobSearch(false);
                    setLocateTarget(locateInfo || {
                        itemId,
                        timestamp: Date.now(),
                        warehouseId: whId,
                        branch,
                        levelId
                    });
                }}
                onClose={() => setShowJobSearch(false)} 
            />
        )}
        
        {/* Left Sidebar (Responsive Overlay Drawer on Mobile/Tablet, Docked on Desktop) */}
        {isSidebarOpen && (
            <div 
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
            />
        )}
        <div 
          className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] lg:static lg:z-20 h-full transition-all duration-300 ease-in-out border-r border-gray-200 bg-white ${
            isSidebarOpen 
                ? 'translate-x-0 lg:w-80 shadow-2xl lg:shadow-none' 
                : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
          }`}
        >
            <div className="w-80 max-w-[85vw] h-full"> {/* Inner container maintains width to prevent squishing content */}
                <InputPanel 
                    config={config} 
                    onChange={handleUpdateConfig} 
                    onOptimize={handleOptimization}
                    isOptimizing={isOptimizing}
                    isAdmin={isAdmin}
                    onSave={handleForceSave}
                    stats={stats}
                    aiResult={aiResult}
                    isStatsOpen={isStatsOpen}
                    onToggleStats={() => setIsStatsOpen(!isStatsOpen)}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </div>
        </div>

        {/* Desktop Sidebar Toggle Button */}
        {!isFullScreen && (
        <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`hidden lg:flex items-center justify-center absolute top-1/2 z-30 transform -translate-y-1/2 bg-white border border-gray-300 shadow-md p-1 rounded-r-md text-gray-600 hover:bg-gray-50 transition-all duration-300 ${isSidebarOpen ? 'left-80' : 'left-0'}`}
            title={isSidebarOpen ? "Hide Parameters" : "Show Parameters"}
        >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        )}

        {/* Center/Right Visualizer */}
        <main className="flex-1 flex flex-row relative bg-gray-100 overflow-hidden">
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
                        selectedItemIds={selectedItemIds}
                        onSelectionChange={setSelectedItemIds}
                        onDeleteSelected={requestDeleteItem}
                        locateTarget={locateTarget}
                        onClearLocateTarget={() => setLocateTarget(null)}
                    />
                ) : (
                    <View3D config={config} />
                )}
            </div>

            {/* Right Properties Panel (Responsive Overlay Drawer on Mobile/Tablet, Docked on Desktop) */}
            {selectedItemIds.length > 0 && !isFullScreen && (
                <>
                    <div 
                        onClick={() => setSelectedItemIds([])}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
                    />
                    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-[92vw] lg:static lg:z-auto lg:w-80 h-full shadow-2xl lg:shadow-none animate-in slide-in-from-right duration-200 flex flex-col">
                        <PropertyPanel 
                            selectedItem={selectedItem}
                            selectedItemIds={selectedItemIds}
                            isAdmin={isAdmin}
                            config={config}
                            onUpdateProperty={updateSelectedProperty}
                            onUpdateJob={updateJobInSelected}
                            onRemoveJob={removeJobFromSelected}
                            onAddJob={addJobToSelected}
                            onDuplicate={duplicateItem}
                            onDelete={requestDeleteItem}
                            onGenerateQR={generateQRCode}
                            qrCodeUrl={qrCodeUrl}
                            onManagePackages={setActivePackageJobId}
                            onUpdateConfig={(field, val) => handleUpdateConfig({ ...config, [field]: val })}
                            onIssuePassport={handleIssuePassport}
                            onClose={() => setSelectedItemIds([])}
                            onLocateWalk={(item) => {
                                setViewMode('2D');
                                setLocateTarget({
                                    itemId: item.id,
                                    timestamp: Date.now(),
                                    warehouseId: config.id,
                                    branch: config.branch,
                                    levelId: config.activeLevelId,
                                    label: item.label || item.id,
                                    isCabin: item.type === 'open_cabin' || item.rackDetails?.enclosureType === 'Close Cabin'
                                });
                            }}
                        />
                    </div>
                </>
            )}
        </main>
      </div>



      {/* --- Package Management Modal (Hoisted) --- */}
      {activePackageJobId && (() => {
          const job = selectedItem?.rackDetails?.jobs?.find(j => j.id === activePackageJobId);
          if (!job) return null;

          const packages = job.packages || [];
          const packageMap = new Map(packages.map(p => [p.number, p]));

          return (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                  {/* ... same modal content from View2D ... */}
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border-4 border-blue-600 overflow-hidden">
                      <div className="p-4 bg-blue-600 text-white flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-3">
                              <Box size={24} className="text-blue-200" />
                              <div>
                                  <h2 className="text-xl font-black uppercase tracking-tighter leading-none">Package Tracking</h2>
                                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Job: {job.jobNumber} | Shipper: {job.shipperName}</p>
                              </div>
                          </div>
                          <button onClick={() => setActivePackageJobId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                              <X size={24} />
                          </button>
                      </div>

                      {/* Filter/History controls */}
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-4 shrink-0">
                          <div className="flex-1 min-w-[200px] relative">
                              <input 
                                  type="text" 
                                  placeholder="Search Package Number (1-10,000)..." 
                                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-all font-bold text-gray-700"
                                  value={packageSearch}
                                  onChange={(e) => setPackageSearch(e.target.value)}
                              />
                              <Grid className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> None</div>
                              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Tagged IN</div>
                              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> Tagged OUT</div>
                          </div>
                      </div>

                      {/* Unified History Log */}
                      {packages.some(p => p.history && p.history.length > 0) && (
                          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex flex-col shrink-0">
                              <details className="group/history">
                                  <summary className="flex items-center justify-between cursor-pointer list-none text-[10px] font-black text-blue-800 uppercase tracking-widest hover:text-blue-600 transition-colors">
                                      <div className="flex items-center gap-2">
                                          <Clock size={12} />
                                          View All Movement History ({packages.reduce((acc, p) => acc + (p.history?.length || 0), 0)})
                                      </div>
                                      <ChevronDown size={12} className="group-open/history:rotate-180 transition-transform" />
                                  </summary>
                                  <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar pb-2">
                                      {packages
                                          .flatMap(p => (p.history || []).map(h => ({ ...h, packageNumber: p.number })))
                                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                          .map((event, eventIdx) => (
                                              <div key={eventIdx} className={`flex justify-between items-center px-3 py-1.5 rounded-md text-[9px] font-bold ${event.status === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                  <div className="flex items-center gap-2">
                                                      <span className="opacity-50">PKG #{event.packageNumber}</span>
                                                      <span className="uppercase">{event.status === 'in' ? 'Moved In' : 'Moved Out'}</span>
                                                  </div>
                                                  <span className="font-mono opacity-60">{event.timestamp}</span>
                                              </div>
                                          ))
                                      }
                                  </div>
                              </details>
                          </div>
                      )}

                      <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-gray-400">Bulk Action:</span>
                              <input 
                                  type="number" 
                                  placeholder="From" 
                                  className="w-20 px-2 py-1 border-2 border-gray-200 rounded text-xs font-bold focus:border-blue-500 outline-none"
                                  value={bulkStart}
                                  onChange={(e) => setBulkStart(e.target.value)}
                              />
                              <span className="text-gray-400">-</span>
                              <input 
                                  type="number" 
                                  placeholder="To" 
                                  className="w-20 px-2 py-1 border-2 border-gray-200 rounded text-xs font-bold focus:border-blue-500 outline-none"
                                  value={bulkEnd}
                                  onChange={(e) => setBulkEnd(e.target.value)}
                              />
                              <button 
                                  onClick={() => bulkUpdatePackages(job.id, 'in')}
                                  className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 transition-colors uppercase"
                              >
                                  Mark IN
                              </button>
                              <button 
                                  onClick={() => bulkUpdatePackages(job.id, 'out')}
                                  className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors uppercase"
                              >
                                  Mark OUT
                              </button>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                              {showResetConfirm ? (
                                  <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-lg border border-red-200">
                                      <input 
                                          type="text" 
                                          placeholder="Type 'proceed'..." 
                                          className="w-28 px-2 py-1 border border-red-300 rounded text-[10px] font-bold outline-none uppercase text-center"
                                          value={resetConfirmText}
                                          onChange={(e) => setResetConfirmText(e.target.value)}
                                          autoFocus
                                      />
                                      <button 
                                          onClick={() => {
                                              if (resetConfirmText.trim().toLowerCase() === 'proceed') {
                                                  resetPackages(job.id);
                                                  setShowResetConfirm(false);
                                                  setResetConfirmText('');
                                              }
                                          }}
                                          disabled={resetConfirmText.trim().toLowerCase() !== 'proceed'}
                                          className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${resetConfirmText.trim().toLowerCase() === 'proceed' ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                      >
                                          Reset All
                                      </button>
                                      <button 
                                          onClick={() => {
                                              setShowResetConfirm(false);
                                              setResetConfirmText('');
                                          }}
                                          className="text-gray-400 hover:text-gray-600"
                                      >
                                          <X size={14} />
                                      </button>
                                  </div>
                              ) : (
                                  <button 
                                      onClick={() => setShowResetConfirm(true)}
                                      className="flex items-center gap-1 px-3 py-1 border-2 border-red-200 text-red-600 text-[10px] font-bold rounded hover:bg-red-50 transition-colors uppercase"
                                  >
                                      <RefreshCw size={12} /> Reset All
                                  </button>
                              )}
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-100">
                          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 pt-10 pb-10">
                              {Array.from({ length: 10000 }, (_, i) => i + 1)
                                  .filter(num => !packageSearch || num.toString().includes(packageSearch))
                                  .slice(0, 500)
                                  .map(num => {
                                      const record = packageMap.get(num);
                                      const status = record?.status || 'none';
                                      const history = record?.history || [];
                                      const latestHistory = [...history].reverse().slice(0, 2);
                                      
                                      return (
                                          <div 
                                              key={num}
                                              className={`
                                                  relative group aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer hover:z-50
                                                  ${status === 'none' ? 'bg-white border-gray-200 hover:border-blue-300' : ''}
                                                  ${status === 'in' ? 'bg-green-50 border-green-500 text-green-700' : ''}
                                                  ${status === 'out' ? 'bg-red-50 border-red-500 text-red-700' : ''}
                                                  ${expandedPackageHistory === num ? 'ring-4 ring-blue-400 z-[100]' : ''}
                                              `}
                                              onClick={() => {
                                                  const nextStatus = status === 'none' ? 'in' : (status === 'in' ? 'out' : 'none');
                                                  updatePackageStatus(job.id, num, nextStatus);
                                              }}
                                          >
                                              <span className="text-sm font-black">{num}</span>
                                              <span className="text-[8px] font-bold uppercase opacity-60">{status}</span>
                                              
                                              {history.length > 0 && (
                                                  <button 
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          setExpandedPackageHistory(expandedPackageHistory === num ? null : num);
                                                      }}
                                                      className="absolute top-0 right-0 p-0.5 bg-gray-100 rounded-bl text-gray-500 hover:bg-blue-500 hover:text-white transition-colors"
                                                  >
                                                      <Clock size={8} />
                                                  </button>
                                              )}

                                              {latestHistory.length > 0 && expandedPackageHistory !== num && (
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white p-2 rounded shadow-xl text-[8px] font-mono opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all z-[100]">
                                                      <div className="font-bold text-blue-400 mb-1 uppercase tracking-widest">Latest Activity:</div>
                                                      {latestHistory.map((h, i) => (
                                                          <div key={i} className={h.status === 'in' ? 'text-green-400' : 'text-red-400'}>
                                                              {h.status.toUpperCase()}: {h.timestamp}
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}

                                              {expandedPackageHistory === num && (
                                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-3 z-[110] cursor-default" onClick={e => e.stopPropagation()}>
                                                      <div className="flex justify-between items-center mb-2 border-b pb-1">
                                                          <span className="text-xs font-black text-blue-600 uppercase">Package {num} History</span>
                                                          <button onClick={() => setExpandedPackageHistory(null)} className="text-gray-400 hover:text-red-500">
                                                              <X size={14} />
                                                          </button>
                                                      </div>
                                                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                          {[...history].reverse().map((h, i) => (
                                                              <div key={i} className={`flex justify-between items-center p-1.5 rounded text-[9px] font-bold ${h.status === 'in' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                                  <span className="uppercase">{h.status}</span>
                                                                  <span className="font-mono text-gray-500">{h.timestamp}</span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                          </div>
                      </div>
                      
                      <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
                          <div className="text-xs font-bold text-gray-500">
                              Total Packages: 10,000 | 
                              <span className="text-green-600 ml-2">IN: {packages.filter(p => p.status === 'in').length}</span> | 
                              <span className="text-red-600 ml-2">OUT: {packages.filter(p => p.status === 'out').length}</span>
                          </div>
                          <button 
                              onClick={() => setActivePackageJobId(null)}
                              className="px-8 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors uppercase tracking-widest text-xs"
                          >
                              Done
                          </button>
                      </div>
                  </div>
              </div>
          );
      })()}

      {/* Financial Summary Modal */}
      {showFinancials && (() => {
          const currentCurrency = currentBranchInfo.currency || 'AED';
          return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                      {/* Header */}
                      <div className="bg-brand-primary p-5 sm:p-6 text-white flex justify-between items-center shrink-0 border-b-4 border-brand-accent">
                          <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-brand-accent rounded-xl text-black shadow-sm">
                                  <Coins size={26} className="text-black" />
                              </div>
                              <div>
                                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">{config.name} Financial Report</h2>
                                  <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.2em] opacity-90">
                                      {currentBranchInfo.name} • Floor-by-Floor Financial Goals & Billing
                                  </p>
                              </div>
                          </div>
                          <button onClick={() => setShowFinancials(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white">
                              <X size={22} />
                          </button>
                      </div>

                      {/* Modal Subnav Tabs */}
                      <div className="bg-gray-50 border-b border-gray-200 px-6 pt-3 flex gap-2 shrink-0 overflow-x-auto text-xs">
                          <button
                              onClick={() => setFinancialModalTab('floors')}
                              className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                  financialModalTab === 'floors'
                                      ? 'border-brand-primary text-brand-primary'
                                      : 'border-transparent text-gray-500 hover:text-gray-900'
                              }`}
                          >
                              <Layers size={14} className="text-amber-600" />
                              <span>Floor-by-Floor Breakdown ({config.levels.length})</span>
                          </button>
                          <button
                              onClick={() => setFinancialModalTab('summary')}
                              className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                  financialModalTab === 'summary'
                                      ? 'border-brand-primary text-brand-primary'
                                      : 'border-transparent text-gray-500 hover:text-gray-900'
                              }`}
                          >
                              <Coins size={14} className="text-brand-primary" />
                              <span>Warehouse Revenue Streams & Cycles</span>
                          </button>
                      </div>

                      <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
                          {/* Top KPIs Summary */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                              <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-xl">
                                  <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Active Shipper Jobs</div>
                                  <div className="text-2xl sm:text-3xl font-serif font-black text-blue-900">{financialTotals.activeJobs}</div>
                                  <div className="text-[10px] text-blue-700 mt-1 font-medium">{config.levels.length} warehouse levels</div>
                              </div>
                              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl">
                                  <div className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1">Total Occupied Volume</div>
                                  <div className="text-2xl sm:text-3xl font-serif font-black text-amber-950 font-mono">{financialTotals.totalCbm.toFixed(1)} <span className="text-sm font-sans">m³</span></div>
                                  <div className="text-[10px] text-amber-800 mt-1 font-medium">All active loads</div>
                              </div>
                              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl">
                                  <div className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Actual Monthly Yield</div>
                                  <div className="text-2xl sm:text-3xl font-serif font-black text-emerald-900 font-mono">
                                      {financialTotals.normalizedTotal.toLocaleString()}
                                      <span className="text-xs font-sans font-bold ml-1 opacity-70 uppercase">{currentCurrency}</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-800 mt-1 font-medium font-mono">{financialTotals.overallAchievement}% of warehouse target</div>
                              </div>
                              <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-xl">
                                  <div className="text-[9px] font-black text-purple-700 uppercase tracking-widest mb-1">Combined Monthly Target</div>
                                  <div className="text-2xl sm:text-3xl font-serif font-black text-purple-900 font-mono">
                                      {financialTotals.totalTargetRevenue.toLocaleString()}
                                      <span className="text-xs font-sans font-bold ml-1 opacity-70 uppercase">{currentCurrency}</span>
                                  </div>
                                  <div className="text-[10px] text-purple-800 mt-1 font-medium">Net Profit Target: {currentCurrency} {financialTotals.totalTargetProfit.toLocaleString()}</div>
                              </div>
                          </div>

                          {/* TAB 1: FLOOR BY FLOOR BREAKDOWN */}
                          {financialModalTab === 'floors' && (
                              <div className="space-y-4 animate-in fade-in">
                                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                      <div>
                                          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">
                                              Floor-Specific Financial Performance
                                          </h3>
                                          <p className="text-[11px] text-gray-500">
                                              Individual rate, target revenue, operating overhead, and actual yields for each floor
                                          </p>
                                      </div>
                                      <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                          Total Goal: {currentCurrency} {financialTotals.totalTargetRevenue.toLocaleString()}
                                      </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {financialTotals.floorBreakdowns.map((floor, idx) => {
                                          const isCanvasActive = config.activeLevelId === floor.levelId;
                                          return (
                                              <div 
                                                  key={floor.levelId} 
                                                  className={`p-4 rounded-2xl border transition-all ${
                                                      isCanvasActive 
                                                          ? 'bg-amber-50/30 border-brand-accent ring-2 ring-brand-accent/30 shadow-md' 
                                                          : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
                                                  }`}
                                              >
                                                  {/* Floor Header */}
                                                  <div className="flex items-center justify-between mb-3">
                                                      <div className="flex items-center gap-2">
                                                          <span className="w-6 h-6 rounded-lg bg-brand-primary text-brand-accent font-mono font-black text-xs flex items-center justify-center">
                                                              {idx + 1}
                                                          </span>
                                                          <div>
                                                              <div className="font-bold text-sm text-gray-900">{floor.levelName}</div>
                                                              <div className="text-[10px] text-gray-400 font-mono">
                                                                  Rate: <span className="font-bold text-gray-700">{currentCurrency} {floor.pricePerCbm}/m³</span> • Capacity: {floor.capacity} m³
                                                              </div>
                                                          </div>
                                                      </div>

                                                      <div className="flex items-center gap-1.5">
                                                          {isCanvasActive ? (
                                                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                  Canvas Active
                                                              </span>
                                                          ) : (
                                                              <button
                                                                  onClick={() => {
                                                                      handleUpdateConfig({ ...config, activeLevelId: floor.levelId });
                                                                  }}
                                                                  className="text-[10px] bg-gray-100 hover:bg-brand-accent hover:text-black font-bold px-2 py-1 rounded-md text-gray-700 transition-colors"
                                                                  title="Switch active canvas floor"
                                                              >
                                                                  View on Canvas
                                                              </button>
                                                          )}
                                                      </div>
                                                  </div>

                                                  {/* Financial Stats Grid */}
                                                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                                          <div className="text-[9px] font-bold text-gray-400 uppercase">Monthly Target Goal</div>
                                                          <div className="text-base font-black text-gray-900 font-mono">
                                                              {currentCurrency} {floor.targetRevenue.toLocaleString()}
                                                          </div>
                                                          <div className="text-[9px] text-gray-400">Yield benchmark</div>
                                                      </div>

                                                      <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                                                          <div className="text-[9px] font-bold text-emerald-700 uppercase">Actual Monthly Revenue</div>
                                                          <div className="text-base font-black text-emerald-800 font-mono">
                                                              {currentCurrency} {floor.normalizedMonthly.toLocaleString()}
                                                          </div>
                                                          <div className="text-[9px] text-emerald-600 font-mono">{floor.activeJobs} active shipper jobs</div>
                                                      </div>

                                                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                                                          <div className="text-[9px] font-bold text-amber-700 uppercase">Operating Budget</div>
                                                          <div className="text-base font-black text-amber-900 font-mono">
                                                              {currentCurrency} {floor.operatingCost.toLocaleString()}
                                                          </div>
                                                          <div className="text-[9px] text-amber-700">Floor overhead</div>
                                                      </div>

                                                      <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                                                          <div className="text-[9px] font-bold text-blue-700 uppercase">Target Net Profit</div>
                                                          <div className="text-base font-black text-blue-900 font-mono">
                                                              {currentCurrency} {floor.targetProfit.toLocaleString()}
                                                          </div>
                                                          <div className="text-[9px] text-blue-600">Net target margin</div>
                                                      </div>
                                                  </div>

                                                  {/* Floor Progress Bars */}
                                                  <div className="space-y-2 pt-2 border-t border-gray-100">
                                                      {/* Revenue Goal Progress */}
                                                      <div>
                                                          <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                                                              <span>Financial Goal Achievement</span>
                                                              <span className={floor.achievementPercent >= 100 ? 'text-emerald-700 font-black' : 'text-amber-800'}>
                                                                  {floor.achievementPercent}%
                                                              </span>
                                                          </div>
                                                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                              <div
                                                                  className={`h-2 rounded-full transition-all duration-300 ${floor.achievementPercent >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`}
                                                                  style={{ width: `${Math.min(100, floor.achievementPercent)}%` }}
                                                              />
                                                          </div>
                                                      </div>

                                                      {/* Physical CBM Occupancy */}
                                                      <div>
                                                          <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                                                              <span>Volume Utilization</span>
                                                              <span>{floor.totalCbm} m³ / {floor.capacity} m³ ({floor.occupancyPercent}%)</span>
                                                          </div>
                                                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                              <div
                                                                  className={`h-1.5 rounded-full transition-all duration-300 ${floor.occupancyPercent > 90 ? 'bg-red-500' : 'bg-brand-accent'}`}
                                                                  style={{ width: `${Math.min(100, floor.occupancyPercent)}%` }}
                                                              />
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}

                          {/* TAB 2: OVERALL BILLING TIERS */}
                          {financialModalTab === 'summary' && (
                              <div className="space-y-4 animate-in fade-in">
                                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Revenue Streams by Billing Cycle</h3>
                                  
                                  <div className="grid grid-cols-1 gap-4">
                                      {/* Monthly */}
                                      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-brand-accent transition-all group">
                                          <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-black text-lg">M</div>
                                              <div>
                                                  <div className="text-lg font-black text-gray-900 uppercase">Monthly Billing</div>
                                                  <div className="text-[10px] font-bold text-gray-400 uppercase">Total collected from monthly contracts</div>
                                              </div>
                                          </div>
                                          <div className="text-center sm:text-right">
                                              <div className="text-3xl font-serif font-black text-green-700">{financialTotals.monthly.toLocaleString()}</div>
                                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentCurrency} / MONTH</div>
                                          </div>
                                      </div>

                                      {/* Quarterly */}
                                      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-brand-accent transition-all group">
                                          <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg">Q</div>
                                              <div>
                                                  <div className="text-lg font-black text-gray-900 uppercase">Quarterly Billing</div>
                                                  <div className="text-[10px] font-bold text-gray-400 uppercase">Total collected per quarter</div>
                                              </div>
                                          </div>
                                          <div className="text-center sm:text-right">
                                              <div className="text-3xl font-serif font-black text-blue-700">{financialTotals.quarterly.toLocaleString()}</div>
                                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentCurrency} / QUARTER</div>
                                          </div>
                                      </div>

                                      {/* Yearly */}
                                      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-brand-accent transition-all group">
                                          <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                              <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center font-black text-lg text-brand-accent border-2 border-brand-accent">Y</div>
                                              <div>
                                                  <div className="text-lg font-black text-gray-900 uppercase">Yearly Billing</div>
                                                  <div className="text-[10px] font-bold text-gray-400 uppercase">Total annual contract values</div>
                                              </div>
                                          </div>
                                          <div className="text-center sm:text-right">
                                              <div className="text-3xl font-serif font-black text-brand-primary">{financialTotals.yearly.toLocaleString()}</div>
                                              <div className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{currentCurrency} / YEAR</div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* Summary Advice */}
                          <div className="bg-gray-900 text-white p-6 rounded-2xl relative overflow-hidden">
                              <div className="relative z-10 text-center sm:text-left">
                                  <h4 className="text-brand-accent font-black text-xs uppercase tracking-widest mb-2 flex items-center justify-center sm:justify-start gap-2">
                                      <Sparkles size={14} /> Financial Insight & Yield Optimization
                                  </h4>
                                  <p className="text-sm font-medium leading-relaxed opacity-90">
                                      Your current warehouse design achieves a normalized monthly revenue of <span className="font-black text-brand-accent">{financialTotals.normalizedTotal.toLocaleString()} {currentCurrency}</span> across {config.levels.length} configured floors. 
                                      You can customize each floor's pricing and revenue targets independently in the <b>Floor Financial Goals</b> sidebar.
                                  </p>
                              </div>
                              <div className="absolute top-0 right-0 p-4 opacity-10 hidden sm:block">
                                  <Coins size={80} />
                              </div>
                          </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                          <div className="text-xs text-gray-500 font-medium">
                              Warehouse Baseline Rate: <span className="font-bold text-gray-800">{currentCurrency} {config.pricePerCbm}/m³</span>
                          </div>
                          <button onClick={() => setShowFinancials(false)} className="w-full sm:w-auto px-10 py-3 bg-brand-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg active:scale-95">
                              Close Report
                          </button>
                      </div>
                  </div>
              </div>
          );
      })()}

      {/* Custom Delete Confirmation Modal */}
      {showJobDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
                  <div className="p-6">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <Trash2 size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Job Record?</h3>
                      <p className="text-gray-500 text-center text-sm mb-6">
                          Warning: Permanent deletion of this shipper job. Type <span className="font-bold text-red-600">proceed</span> to confirm.
                      </p>
                      
                      <div className="space-y-4">
                          <input 
                              type="text"
                              autoFocus
                              placeholder="Type 'proceed' here"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none font-bold text-center transition-colors"
                              value={jobConfirmInput}
                              onChange={(e) => setJobConfirmInput(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && jobConfirmInput.trim().toLowerCase() === 'proceed') confirmRemoveJob();
                              }}
                          />
                          
                          <div className="flex gap-3 mt-6">
                              <button 
                                  onClick={() => setShowJobDeleteConfirm(false)}
                                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={confirmRemoveJob}
                                  disabled={jobConfirmInput.trim().toLowerCase() !== 'proceed'}
                                  className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all ${jobConfirmInput.trim().toLowerCase() === 'proceed' ? 'bg-red-600 text-white shadow-lg hover:bg-red-700' : 'bg-red-200 text-red-400 cursor-not-allowed'}`}
                              >
                                  Confirm Delete
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
                  <div className="p-6">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <Trash2 size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Warehouse?</h3>
                      <p className="text-gray-500 text-center text-sm mb-6">
                          This action cannot be undone. All layout data, levels, and rack details for <span className="font-bold text-gray-800">"{warehouses.find(w => w.id === deleteTargetId)?.name}"</span> will be permanently removed.
                      </p>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Type <span className="text-red-600">proceed</span> to confirm</label>
                              <input 
                                  type="text" 
                                  autoFocus
                                  placeholder="Type 'proceed' here"
                                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none font-bold text-center transition-colors"
                                  value={confirmInput}
                                  onChange={(e) => setConfirmInput(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter' && confirmInput.trim().toLowerCase() === 'proceed') confirmDeleteWarehouse();
                                  }}
                              />
                          </div>
                          
                          <div className="flex gap-3 mt-6">
                              <button 
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={confirmDeleteWarehouse}
                                  disabled={confirmInput.trim().toLowerCase() !== 'proceed'}
                                  className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all ${confirmInput.trim().toLowerCase() === 'proceed' ? 'bg-red-600 text-white shadow-lg hover:bg-red-700' : 'bg-red-200 text-red-400 cursor-not-allowed'}`}
                              >
                                  Delete
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Selected Items Confirmation Modal */}
      <ConfirmProceedModal
          isOpen={showItemDeleteConfirm}
          title={`Delete ${selectedItemIds.length} Selected Unit${selectedItemIds.length > 1 ? 's' : ''}?`}
          message={
              <div>
                  You are about to permanently delete <span className="font-bold text-gray-900">{selectedItemIds.length} layout unit{selectedItemIds.length > 1 ? 's' : ''}</span> (cabins, racks, offices, obstacles) from <span className="font-bold text-gray-900">{config.levels.find(l => l.id === config.activeLevelId)?.name || 'the active floor'}</span>. All associated job assignments and stored volumes will be cleared.
              </div>
          }
          confirmButtonText="Delete Items"
          onConfirm={confirmDeleteItem}
          onCancel={() => setShowItemDeleteConfirm(false)}
      />
    </div>
  );
};

export default App;