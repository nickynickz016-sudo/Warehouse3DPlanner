import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { WarehouseConfig, LayoutItem, RackDetails, JobEntry } from '../types';
import { PALLET_WIDTH, PALLET_DEPTH } from '../constants';
import { 
    Move, Grid, Square, Box, 
    DoorOpen, Wind, Video, Footprints, Droplet, Flame,
    X, User, FileText, Activity, RotateCw, AlignJustify, Warehouse, DollarSign, Calendar, Calculator, Database, Shield, Lock, Monitor, Scan, QrCode, Download, Factory, ZoomIn, ZoomOut, Maximize, Copy, Minus,
    Plus, Trash2, Clock
} from 'lucide-react';

interface Props {
  config: WarehouseConfig;
  onUpdateItems: (levelId: string, items: LayoutItem[]) => void;
  activeLevelId: string;
  isAdmin: boolean;
}

type Tool = 'select' | 'rack' | 'office' | 'obstacle' | 'passageway' | 'fire_exit' | 'washroom' | 'entrance' | 'camera' | 'ac' | 'stairs' | 'store' | 'open_cabin' | 'open_space_storage' | 'warehouse';

// --- Helper: Default Dimensions & Properties for Tools ---
const getItemDefaults = (tool: Tool): Partial<LayoutItem> => {
    const defaults: Partial<LayoutItem> = {
        width: 100, height: 100, depth: 300, rotation: 0, label: '', color: '#ccc'
    };

    switch(tool) {
        case 'rack':
            return { ...defaults, width: PALLET_WIDTH, height: PALLET_DEPTH, depth: 400, color: '#FFCC00', 
                rackDetails: {
                    status: 'available', jobs: [],
                    volumeOccupied: 0, enclosureType: 'Open Space'
                } 
            };
        case 'office': return { ...defaults, width: 500, height: 400, depth: 300, label: 'OFFICE', color: '#dbeafe' };
        case 'warehouse': return { ...defaults, width: 800, height: 600, depth: 400, label: 'WAREHOUSE', color: '#e5e7eb' };
        case 'open_cabin': return { ...defaults, width: 300, height: 300, depth: 150, label: 'CABIN', color: '#ccfbf1',
            rackDetails: {
                status: 'available', jobs: [],
                volumeOccupied: 0, enclosureType: 'Close Cabin'
            }
        };
        case 'open_space_storage': return { ...defaults, width: 400, height: 400, depth: 200, label: 'OPEN AREA', color: '#fed7aa' };
        case 'store': return { ...defaults, width: 400, height: 300, depth: 300, label: 'STORE', color: '#e2e8f0' };
        case 'passageway': return { ...defaults, width: 600, height: 200, depth: 10, color: '#f1f5f9' };
        case 'stairs': return { ...defaults, width: 200, height: 400, depth: 400, color: '#cbd5e1' };
        case 'fire_exit': return { ...defaults, width: 120, height: 50, depth: 220, label: 'EXIT', color: '#fca5a5' };
        case 'washroom': return { ...defaults, width: 250, height: 250, depth: 300, label: 'WC', color: '#e0f2fe' };
        case 'entrance': return { ...defaults, width: 300, height: 50, depth: 300, label: 'ENTRY', color: '#cbd5e1' };
        case 'camera': return { ...defaults, width: 50, height: 50, depth: 30, color: '#333' };
        case 'ac': return { ...defaults, width: 80, height: 80, depth: 60, color: '#fff' };
        case 'obstacle': return { ...defaults, width: 60, height: 60, depth: 600, color: '#94a3b8' };
        default: return defaults;
    }
};

// --- Helper: Render Visuals (Pure Function) ---
const renderItemVisuals = (item: LayoutItem, isSelected: boolean) => {
    const strokeColor = isSelected ? '#ef4444' : '#64748b';
    const strokeWidth = isSelected ? 5 : 2;

    switch(item.type) {
        case 'rack':
            const type = item.rackDetails?.enclosureType || 'Open Space';
            let fillOpacity = 1;
            let fill = item.color;
            let strokeDashArray = '';
            let innerElement = null;

            if (type === 'Open Space') {
                fillOpacity = 0.3;
                strokeDashArray = '5,5';
            } else if (type === 'Shuttered Warehouse') {
                fill = 'url(#diagonalHatch)';
            } else if (type === 'Close Cabin') {
                fillOpacity = 1;
                innerElement = <rect x={item.width-30} y={item.height-30} width={20} height={20} rx={2} fill="none" stroke="black" strokeWidth="2" />;
            }

            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={fill} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={type === 'Close Cabin' ? strokeWidth + 2 : strokeWidth} strokeDasharray={strokeDashArray} />
                    {type !== 'Open Space' && (
                    <>
                        <line x1={0} y1={0} x2={item.width} y2={item.height} stroke="#111111" strokeWidth="2" opacity="0.3" />
                        <line x1={item.width} y1={0} x2={0} y2={item.height} stroke="#111111" strokeWidth="2" opacity="0.3" />
                    </>
                    )}
                    {innerElement}
                    {item.rackDetails?.status === 'occupied' && <circle cx={item.width-20} cy={20} r={10} fill="red" />}
                    {item.rackDetails?.status === 'reserved' && <circle cx={item.width-20} cy={20} r={10} fill="orange" />}
                </g>
            );
        case 'stairs':
            const steps = Math.floor(item.height / 30);
            const stepLines = [];
            for(let i=1; i<steps; i++) stepLines.push(<line key={i} x1={0} y1={i*30} x2={item.width} y2={i*30} stroke="#64748b" strokeWidth="2" />);
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill="#f1f5f9" stroke={strokeColor} strokeWidth={strokeWidth} />
                    {stepLines}
                    <line x1={item.width/2} y1={20} x2={item.width/2} y2={item.height-20} stroke="#334155" strokeWidth="3" markerEnd="url(#arrow)" />
                </g>
            );
        case 'office':
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth} />
                    <path d={`M ${item.width-60} ${item.height} L ${item.width-10} ${item.height-50}`} stroke="black" strokeWidth="2" fill="none" />
                    <path d={`M ${item.width-60} ${item.height} Q ${item.width-10} ${item.height} ${item.width-10} ${item.height-50}`} stroke="black" strokeWidth="1" fill="none" strokeDasharray="5,5" />
                    <rect x={20} y={20} width={120} height={60} fill="#bfdbfe" stroke="#60a5fa" />
                    <circle cx={80} cy={100} r={20} fill="#60a5fa" />
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" fontSize={Math.min(item.width, item.height)/5} fill="#1e3a8a" opacity="0.3" fontWeight="bold">OFFICE</text>
                </g>
            );
        case 'warehouse':
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x={item.width/2 - 50} y={item.height-10} width={100} height={10} fill="#6b7280" />
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" fontSize={Math.min(item.width, item.height)/6} fill="#374151" opacity="0.5" fontWeight="bold">WAREHOUSE</text>
                </g>
            );
        case 'open_cabin':
            const status = item.rackDetails?.status || 'available';
            let cabinFill = item.color;
            let statusStroke = "#0f766e";
            let statusText = "OPEN CABIN";
            if (status === 'occupied') { cabinFill = '#fee2e2'; statusStroke = '#b91c1c'; statusText = "OCCUPIED"; }
            else if (status === 'reserved') { cabinFill = '#ffedd5'; statusStroke = '#c2410c'; statusText = "RESERVED"; }
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={cabinFill} stroke={isSelected ? '#ef4444' : statusStroke} strokeWidth={isSelected ? 5 : 2} />
                    <rect x={10} y={10} width={item.width-20} height={item.height-20} fill="none" stroke={statusStroke} strokeWidth="2" strokeDasharray="5,5" />
                    <rect x={30} y={30} width={60} height={40} fill={status === 'available' ? '#5eead4' : 'white'} stroke={statusStroke} />
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" fontSize={Math.min(item.width, item.height)/6} fill={statusStroke} opacity="0.7" fontWeight="bold">{statusText}</text>
                    {status === 'occupied' && <circle cx={item.width-20} cy={20} r={10} fill="red" />}
                    {status === 'reserved' && <circle cx={item.width-20} cy={20} r={10} fill="orange" />}
                </g>
            );
        case 'open_space_storage':
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={item.color} fillOpacity={0.4} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray="10,5" />
                    <line x1={0} y1={0} x2={item.width} y2={item.height} stroke={strokeColor} strokeWidth="1" opacity="0.2" />
                    <line x1={item.width} y1={0} x2={0} y2={item.height} stroke={strokeColor} strokeWidth="1" opacity="0.2" />
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" fontSize={Math.min(item.width, item.height)/6} fill="#c2410c" fontWeight="bold">OPEN SPACE</text>
                </g>
            );
        case 'store':
                return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill="#e2e8f0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x={10} y={10} width={item.width-20} height={30} fill="#cbd5e1" />
                    <rect x={10} y={item.height-40} width={item.width-20} height={30} fill="#cbd5e1" />
                    <rect x={10} y={10} width={30} height={item.height-20} fill="#cbd5e1" />
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" fontSize={Math.min(item.width, item.height)/5} fill="#475569" opacity="0.3" fontWeight="bold">STORE</text>
                </g>
            );
        case 'camera':
            return (
                <g>
                    <path d={`M 0 10 L 10 0 L 40 0 L 50 10 L 50 40 L 40 50 L 10 50 L 0 40 Z`} fill="#333" />
                    <circle cx={25} cy={25} r={10} fill="white" stroke="red" strokeWidth="2" />
                    <path d={`M 25 25 L 100 0 L 100 50 Z`} fill="yellow" opacity="0.2" />
                </g>
            );
        case 'ac':
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill="white" stroke="blue" strokeWidth="2" />
                    <circle cx={item.width/2} cy={item.height/2} r={item.width/2 - 5} stroke="blue" strokeWidth="1" fill="none" />
                    <line x1={5} y1={5} x2={item.width-5} y2={item.height-5} stroke="blue" strokeWidth="2" />
                    <line x1={item.width-5} y1={5} x2={5} y2={item.height-5} stroke="blue" strokeWidth="2" />
                </g>
            );
        case 'washroom':
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" fontSize={40} fill="#0ea5e9">WC</text>
                </g>
            );
        default:
            return (
                <g>
                <rect x={0} y={0} width={item.width} height={item.height} fill={item.color || '#ccc'} stroke={strokeColor} strokeWidth={strokeWidth} />
                {item.label && (
                    <text x={item.width/2} y={item.height/2} textAnchor="middle" dy=".3em" fontSize={Math.min(item.width, item.height)/4} fill="#333">{item.label}</text>
                )}
                </g>
            );
    }
};

// --- Component: Items Layer (Memoized for Performance) ---
const ItemsLayer = React.memo(({ items, selectedItemId, onMouseDown }: { items: LayoutItem[], selectedItemId: string | null, onMouseDown: (e: any, id: string) => void }) => {
    return (
        <>
            {items.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                    <g 
                        key={item.id}
                        onMouseDown={(e) => onMouseDown(e, item.id)}
                        className="cursor-pointer"
                        transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation || 0}, ${item.width/2}, ${item.height/2})`}
                    >
                        {renderItemVisuals(item, isSelected)}
                        
                        {item.type === 'rack' && (
                            <text x={item.width/2} y={item.height/2} fontSize="20" textAnchor="middle" fill="#000" fontWeight="bold" transform={`rotate(${-item.rotation}, ${item.width/2}, ${item.height/2})`}>
                                {item.rackDetails?.jobs && item.rackDetails.jobs.length > 0 
                                    ? (item.rackDetails.jobs.length === 1 ? item.rackDetails.jobs[0].shipperName : `${item.rackDetails.jobs.length} Jobs`)
                                    : (item.rackDetails?.shipperName || '')}
                            </text>
                        )}
                        {item.type === 'open_cabin' && (
                            <text x={item.width/2} y={item.height/2 + 30} fontSize="16" textAnchor="middle" fill="#000" fontWeight="bold" transform={`rotate(${-item.rotation}, ${item.width/2}, ${item.height/2})`}>
                                {item.rackDetails?.jobs && item.rackDetails.jobs.length > 0 
                                    ? (item.rackDetails.jobs.length === 1 ? item.rackDetails.jobs[0].shipperName : `${item.rackDetails.jobs.length} Jobs`)
                                    : (item.rackDetails?.shipperName || '')}
                            </text>
                        )}
                    </g>
                );
            })}
        </>
    );
}, (prev, next) => {
    return prev.items === next.items && prev.selectedItemId === next.selectedItemId;
});


const View2D: React.FC<Props> = ({ config, onUpdateItems, activeLevelId, isAdmin }) => {
  const { dimensions } = config;
  const activeLevel = config.levels.find(l => l.id === activeLevelId);
  const items = activeLevel?.items || [];
  
  const levelVolumeCapacity = activeLevel?.totalVolumeCapacity || 0;
  const usedVolume = items.reduce((sum, item) => sum + (item.rackDetails?.volumeOccupied || 0), 0);
  const remainingVolume = levelVolumeCapacity - usedVolume;
  const volumePercentage = levelVolumeCapacity > 0 ? (usedVolume / levelVolumeCapacity) * 100 : 0;

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  
  // Hover state for Ghost Preview
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  
  // Zoom State
  const [zoom, setZoom] = useState(1);
  const [isPropertiesMinimized, setIsPropertiesMinimized] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset minimize state when selecting a new item
  useEffect(() => {
    if (selectedItemId) {
        setIsPropertiesMinimized(false);
    }
  }, [selectedItemId]);

  const getMousePos = (evt: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in evt) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    } else {
        clientX = (evt as React.MouseEvent).clientX;
        clientY = (evt as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - CTM.e) / CTM.a,
      y: (clientY - CTM.f) / CTM.d
    };
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.4));
  const handleResetZoom = () => setZoom(1);

  // Keyboard controls for fine-tuning position
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!selectedItemId || !isAdmin) return;
          
          // Avoid moving items when typing in input fields
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;

          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;

          switch (e.key) {
              case 'ArrowUp': dy = -step; break;
              case 'ArrowDown': dy = step; break;
              case 'ArrowLeft': dx = -step; break;
              case 'ArrowRight': dx = step; break;
              default: return;
          }

          e.preventDefault();

          const updatedItems = items.map(item => {
              if (item.id === selectedItemId) {
                  return { ...item, x: Math.round(item.x + dx), y: Math.round(item.y + dy) };
              }
              return item;
          });
          onUpdateItems(activeLevelId, updatedItems);
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, isAdmin, items, activeLevelId, onUpdateItems]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, itemId?: string) => {
      e.stopPropagation();
      const pos = getMousePos(e);
      setQrCodeUrl(null);

      if (activeTool === 'select' || !isAdmin) {
          if (itemId) {
              setSelectedItemId(itemId);
              const item = items.find(i => i.id === itemId);
              if (item && isAdmin) {
                  setDraggingId(itemId);
                  setDragOffset({ x: pos.x - item.x, y: pos.y - item.y });
              }
          } else {
              setSelectedItemId(null);
          }
      } else if (isAdmin) {
          // Centered addition
          addItem(pos.x, pos.y);
      }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getMousePos(e);
      // Update Ghost Position
      setHoverPos(pos);

      if (draggingId && (activeTool === 'select') && isAdmin) {
          e.preventDefault();
          const newX = pos.x - dragOffset.x;
          const newY = pos.y - dragOffset.y;
          const snappedX = Math.round(newX / 10) * 10;
          const snappedY = Math.round(newY / 10) * 10;

          const updatedItems = items.map(item => 
              item.id === draggingId ? { ...item, x: snappedX, y: snappedY } : item
          );
          onUpdateItems(activeLevelId, updatedItems);
      }
  };

  const handleMouseUp = () => {
      setDraggingId(null);
  };
  
  const handleMouseLeave = () => {
      setHoverPos(null);
      setDraggingId(null);
  };

  const addItem = (mouseX: number, mouseY: number) => {
      if (!isAdmin) return;

      const baseId = `${activeTool}-${Date.now()}`;
      const defaults = getItemDefaults(activeTool);
      
      // Center item on mouse cursor
      const width = defaults.width || 100;
      const height = defaults.height || 100;
      const x = mouseX - (width / 2);
      const y = mouseY - (height / 2);

      const newItem: LayoutItem = {
          id: baseId,
          type: activeTool,
          x, y,
          ...defaults
      } as LayoutItem;

      onUpdateItems(activeLevelId, [...items, newItem]);
      setActiveTool('select');
      setSelectedItemId(newItem.id);
  };

  const duplicateItem = (id: string) => {
      if (!isAdmin) return;
      const itemToClone = items.find(i => i.id === id);
      if (!itemToClone) return;

      const newItem: LayoutItem = {
          ...itemToClone,
          id: `${itemToClone.type}-${Date.now()}`,
          x: itemToClone.x + 20, // Offset slightly
          y: itemToClone.y + 20,
          label: itemToClone.label ? `${itemToClone.label} (Copy)` : ''
      };

      onUpdateItems(activeLevelId, [...items, newItem]);
      setSelectedItemId(newItem.id);
  };

  const deleteItem = (id: string) => {
      if (!isAdmin) return;
      onUpdateItems(activeLevelId, items.filter(i => i.id !== id));
      setSelectedItemId(null);
  };

  const updateSelectedProperty = (field: keyof LayoutItem | keyof RackDetails, value: any, isRackDetail = false) => {
      if (!selectedItemId || !isAdmin) return;
      const updatedItems: LayoutItem[] = items.map(item => {
          if (item.id === selectedItemId) {
              if (isRackDetail && (item.type === 'rack' || item.type === 'open_cabin')) {
                  const currentDetails = item.rackDetails || { status: 'available' as const, jobs: [], volumeOccupied: 0, enclosureType: 'Open Space' as const };
                  return { ...item, rackDetails: { ...currentDetails, [field]: value } as RackDetails };
              }
              return { ...item, [field]: value } as LayoutItem;
          }
          return item;
      });
      onUpdateItems(activeLevelId, updatedItems);
  };

  const addJobToSelected = () => {
      if (!selectedItemId || !isAdmin) return;
      const newJob: JobEntry = {
          id: `job-${Date.now()}`,
          jobNumber: '',
          shipperName: '',
          inDate: new Date().toISOString().split('T')[0],
          outDate: '',
          pricePerMonth: 0,
          paymentCycle: 'Monthly',
          status: 'active'
      };
      
      const updatedItems: LayoutItem[] = items.map(item => {
          if (item.id === selectedItemId && (item.type === 'rack' || item.type === 'open_cabin')) {
              const currentJobs = item.rackDetails?.jobs || [];
              return { 
                  ...item, 
                  rackDetails: { 
                      ...item.rackDetails!, 
                      jobs: [...currentJobs, newJob],
                      status: 'occupied' as const
                  } 
              };
          }
          return item;
      });
      onUpdateItems(activeLevelId, updatedItems);
  };

  const updateJobInSelected = (jobId: string, field: keyof JobEntry, value: any) => {
      if (!selectedItemId || !isAdmin) return;
      const updatedItems: LayoutItem[] = items.map(item => {
          if (item.id === selectedItemId && (item.type === 'rack' || item.type === 'open_cabin')) {
              const currentJobs = item.rackDetails?.jobs || [];
              const updatedJobs = currentJobs.map(job => 
                  job.id === jobId ? { ...job, [field]: value } : job
              );
              return { ...item, rackDetails: { ...item.rackDetails!, jobs: updatedJobs } };
          }
          return item;
      });
      onUpdateItems(activeLevelId, updatedItems);
  };

  const removeJobFromSelected = (jobId: string) => {
      if (!selectedItemId || !isAdmin) return;
      const updatedItems: LayoutItem[] = items.map(item => {
          if (item.id === selectedItemId && (item.type === 'rack' || item.type === 'open_cabin')) {
              const currentJobs = item.rackDetails?.jobs || [];
              const updatedJobs = currentJobs.filter(job => job.id !== jobId);
              const newStatus = updatedJobs.length === 0 ? 'available' as const : item.rackDetails!.status;
              return { ...item, rackDetails: { ...item.rackDetails!, jobs: updatedJobs, status: newStatus } };
          }
          return item;
      });
      onUpdateItems(activeLevelId, updatedItems);
  };

  const generateQRCode = async (item: LayoutItem) => {
      const data = { id: item.id, type: item.type, label: item.label, dimensions: `${item.width}x${item.height}`, ...item.rackDetails };
      try {
          const url = await QRCode.toDataURL(JSON.stringify(data), { width: 300, margin: 2 });
          setQrCodeUrl(url);
      } catch (err) { console.error(err); }
  };

  const selectedItem = items.find(i => i.id === selectedItemId);
  const supportsQR = selectedItem && ['rack', 'open_cabin', 'open_space_storage'].includes(selectedItem.type);

  // --- Toolbar Component ---
  const ToolButton = ({ tool, icon: Icon, label }: { tool: Tool, icon: any, label: string }) => (
      <button 
        onClick={() => setActiveTool(tool)}
        className={`p-2 rounded flex flex-col items-center justify-center gap-1 w-full text-[10px] 
            ${activeTool === tool ? 'bg-brand-accent text-black border-black shadow-inner' : 'hover:bg-gray-100 text-gray-600 bg-white border shadow-sm'}`}
        title={label}
      >
          <Icon size={16} />
          <span className="hidden xl:inline">{label}</span>
      </button>
  );

  return (
    <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden relative">
      
      {/* --- Toolbar --- */}
      {isAdmin && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 w-12 xl:w-24 max-h-[90vh] overflow-y-auto pb-2 custom-scrollbar bg-white/50 backdrop-blur rounded p-1 border border-gray-200 shadow">
            <ToolButton tool="select" icon={Move} label="Select" />
            <div className="h-px bg-gray-300 w-full my-1"></div>
            <ToolButton tool="warehouse" icon={Factory} label="Whouse" />
            <ToolButton tool="rack" icon={Grid} label="Rack" />
            <ToolButton tool="store" icon={Warehouse} label="Store" />
            <ToolButton tool="open_space_storage" icon={Scan} label="Open Spc" />
            <ToolButton tool="passageway" icon={Footprints} label="Passage" />
            <ToolButton tool="stairs" icon={AlignJustify} label="Stairs" />
            <ToolButton tool="office" icon={Square} label="Office" />
            <ToolButton tool="open_cabin" icon={Monitor} label="Cabin" />
            <div className="h-px bg-gray-300 w-full my-1"></div>
            <ToolButton tool="fire_exit" icon={Flame} label="Exit" />
            <ToolButton tool="entrance" icon={DoorOpen} label="Entry" />
            <ToolButton tool="washroom" icon={Droplet} label="WC" />
            <div className="h-px bg-gray-300 w-full my-1"></div>
            <ToolButton tool="camera" icon={Video} label="Cam" />
            <ToolButton tool="ac" icon={Wind} label="AC" />
            <ToolButton tool="obstacle" icon={Box} label="Block" />
        </div>
      )}

      {/* --- Top Info Bar --- */}
      <div className="absolute top-4 right-1/2 transform translate-x-1/2 bg-white/80 p-2 rounded text-sm font-bold text-gray-700 z-10 border border-gray-300 shadow-sm pointer-events-none backdrop-blur flex items-center gap-4">
        <span>Floor: {activeLevel?.name}</span>
        {!isAdmin && <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1"><Lock size={8}/> View Only</span>}
      </div>

      {/* --- Zoom Controls --- */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-white shadow-md rounded border border-gray-300 p-2">
         <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Zoom In"><ZoomIn size={20} /></button>
         <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Reset Zoom"><Maximize size={20} /></button>
         <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-700" title="Zoom Out"><ZoomOut size={20} /></button>
         <span className="text-[10px] text-center font-bold text-gray-500">{Math.round(zoom * 100)}%</span>
      </div>

      {/* --- Volume Tracker Widget --- */}
      <div className="absolute top-4 right-[25%] z-10 bg-white p-3 rounded shadow-md border border-gray-200 w-48 hidden xl:block">
            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2">
                <Database size={12} /> Volume (m³)
            </h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                <div className={`h-2.5 rounded-full ${volumePercentage > 90 ? 'bg-red-500' : 'bg-brand-accent'}`} style={{width: `${Math.min(100, volumePercentage)}%`}}></div>
            </div>
            <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-600">Used: {usedVolume}</span>
                <span className={`font-bold ${remainingVolume < 0 ? 'text-red-600' : 'text-green-600'}`}>Left: {remainingVolume}</span>
            </div>
      </div>
      
      {/* --- Properties Panel --- */}
      {selectedItem && (
          <div className={`absolute top-4 right-4 w-96 bg-white rounded-lg shadow-xl z-20 border border-gray-300 flex flex-col transition-all duration-300 ${isPropertiesMinimized ? 'h-auto' : 'bottom-4 max-h-[85vh]'}`}>
              <div className="p-3 bg-brand-primary text-white rounded-t-lg flex justify-between items-center border-b-4 border-brand-accent shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm uppercase text-brand-accent">{selectedItem.type.replace(/_/g, ' ')} Properties</span>
                    {!isAdmin && <Lock size={12} className="text-gray-400"/>}
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsPropertiesMinimized(!isPropertiesMinimized)} 
                        className="text-white hover:text-gray-300"
                        title={isPropertiesMinimized ? "Expand" : "Minimize"}
                      >
                          {isPropertiesMinimized ? <Maximize size={16} /> : <Minus size={16} />}
                      </button>
                      <button onClick={() => duplicateItem(selectedItem.id)} className={`text-white ${isAdmin ? 'hover:text-blue-300' : 'opacity-50 cursor-not-allowed'}`} disabled={!isAdmin} title="Duplicate Item"><Copy size={16} /></button>
                      <button onClick={() => deleteItem(selectedItem.id)} className={`text-white ${isAdmin ? 'hover:text-red-300' : 'opacity-50 cursor-not-allowed'}`} disabled={!isAdmin} title="Delete Item"><Trash2 size={16} /></button>
                      <button onClick={() => setSelectedItemId(null)} className="text-white hover:text-gray-300" title="Close Properties"><X size={16} /></button>
                  </div>
              </div>
              
              {!isPropertiesMinimized && (
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-4">
                  {/* Dimensions */}
                  <div className="bg-white p-3 rounded border border-gray-300 shadow-sm">
                      <h5 className="font-bold text-black mb-2 border-b border-gray-200 pb-1">Dimensions & Position</h5>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-black mb-1 font-bold">Width (cm)</label>
                              <input type="number" value={selectedItem.width} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('width', Number(e.target.value))} className="w-full border border-gray-400 p-2 rounded bg-white text-black disabled:bg-gray-100 placeholder-gray-400" />
                          </div>
                          <div>
                              <label className="block text-black mb-1 font-bold">Length (cm)</label>
                              <input type="number" value={selectedItem.height} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('height', Number(e.target.value))} className="w-full border border-gray-400 p-2 rounded bg-white text-black disabled:bg-gray-100 placeholder-gray-400" />
                          </div>
                          <div>
                              <label className="block text-black mb-1 font-bold">Height (cm)</label>
                              <input type="number" value={selectedItem.depth || 0} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('depth', Number(e.target.value))} className="w-full border border-gray-400 p-2 rounded bg-white text-black disabled:bg-gray-100 placeholder-gray-400" />
                          </div>
                          <div>
                            <label className="block text-black mb-1 font-bold flex items-center gap-1"><RotateCw size={10}/> Rotation</label>
                            <div className="flex gap-2">
                                <input type="range" min="0" max="360" step="15" value={selectedItem.rotation} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('rotation', Number(e.target.value))} className="w-full accent-brand-accent"/>
                                <span className="w-8 text-center bg-white border border-gray-400 rounded p-1 text-black font-mono">{selectedItem.rotation}°</span>
                            </div>
                          </div>
                      </div>
                      <div className="mt-2">
                          <label className="block text-black mb-1 font-bold">Label</label>
                          <input type="text" value={selectedItem.label || ''} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('label', e.target.value)} className="w-full border border-gray-400 p-2 rounded bg-white disabled:bg-gray-100 font-bold text-black placeholder-gray-400" />
                      </div>
                  </div>
                  
                  {/* QR Code */}
                  {supportsQR && (
                     <div className="bg-white p-3 rounded border border-gray-300 shadow-sm">
                         <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-1">
                             <h4 className="font-bold text-black flex items-center gap-2"><QrCode size={14}/> Quick Response Code</h4>
                         </div>
                         {!qrCodeUrl ? (
                             <button onClick={() => generateQRCode(selectedItem)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded border border-gray-300 text-xs transition-colors flex items-center justify-center gap-2"><QrCode size={14} /> Generate QR Code</button>
                         ) : (
                             <div className="flex flex-col items-center gap-2">
                                 <img src={qrCodeUrl} alt="Item QR Code" className="w-32 h-32 border border-gray-200 rounded p-1" />
                                 <a href={qrCodeUrl} download={`QR-${selectedItem.label || selectedItem.id}.png`} className="w-full py-1.5 bg-brand-accent hover:bg-yellow-400 text-black font-bold rounded text-xs transition-colors flex items-center justify-center gap-2"><Download size={14} /> Download QR Image</a>
                             </div>
                         )}
                     </div>
                  )}

                  {/* Rack Details */}
                  {(selectedItem.type === 'rack' || selectedItem.type === 'open_cabin') && selectedItem.rackDetails && (
                      <div className="space-y-4">
                          <div className="bg-white p-3 rounded border border-gray-300 shadow-sm">
                                <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-1">
                                    <h4 className="font-bold text-black flex items-center gap-2"><Activity size={14}/> Rack Configuration</h4>
                                    <div className="flex gap-2">
                                        <select value={selectedItem.rackDetails.status} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('status', e.target.value, true)} className="border border-gray-400 p-1 rounded font-bold uppercase text-[10px] tracking-wider text-black bg-white">
                                            <option value="available">Available</option>
                                            <option value="occupied">Occupied</option>
                                            <option value="reserved">Reserved</option>
                                        </select>
                                        <select value={selectedItem.rackDetails.enclosureType} disabled={!isAdmin} onChange={(e) => updateSelectedProperty('enclosureType', e.target.value, true)} className="border border-gray-400 p-1 rounded bg-white text-black text-[10px] font-bold">
                                            <option value="Open Space">Open Space</option>
                                            <option value="Shuttered Warehouse">Shuttered</option>
                                            <option value="Close Cabin">Close Cabin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Jobs ({selectedItem.rackDetails.jobs?.length || 0})</h5>
                                    {isAdmin && (
                                        <button onClick={addJobToSelected} className="flex items-center gap-1 text-[10px] font-bold bg-brand-accent px-2 py-1 rounded hover:bg-yellow-400 transition-colors">
                                            <Plus size={12}/> Add Job
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {(!selectedItem.rackDetails.jobs || selectedItem.rackDetails.jobs.length === 0) && (
                                        <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded text-gray-400 text-xs">
                                            No jobs assigned to this {selectedItem.type}
                                        </div>
                                    )}
                                    {selectedItem.rackDetails.jobs?.map((job, idx) => (
                                        <div key={job.id} className="p-3 border border-gray-200 rounded-md bg-gray-50 relative group">
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => removeJobFromSelected(job.id)}
                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            )}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Job Number</label>
                                                    <div className="flex">
                                                        <span className="inline-flex items-center px-2 text-black bg-gray-200 border border-r-0 border-gray-400 rounded-l-md text-[10px] font-bold">AE</span>
                                                        <input 
                                                            type="text" 
                                                            value={job.jobNumber} 
                                                            disabled={!isAdmin} 
                                                            onChange={(e) => updateJobInSelected(job.id, 'jobNumber', e.target.value)} 
                                                            className="rounded-none rounded-r-md border border-gray-400 w-full p-1.5 disabled:bg-white font-mono text-xs text-black" 
                                                            placeholder="0001"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Shipper Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={job.shipperName} 
                                                        disabled={!isAdmin} 
                                                        onChange={(e) => updateJobInSelected(job.id, 'shipperName', e.target.value)} 
                                                        className="w-full border border-gray-400 p-1.5 rounded bg-white font-bold text-black text-xs" 
                                                        placeholder="Enter shipper name..." 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price (AED/mo)</label>
                                                    <input 
                                                        type="number" 
                                                        value={job.pricePerMonth} 
                                                        disabled={!isAdmin} 
                                                        onChange={(e) => updateJobInSelected(job.id, 'pricePerMonth', Number(e.target.value))} 
                                                        className="w-full border border-gray-400 p-1.5 rounded bg-white text-black text-xs" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cycle</label>
                                                    <select 
                                                        value={job.paymentCycle} 
                                                        disabled={!isAdmin} 
                                                        onChange={(e) => updateJobInSelected(job.id, 'paymentCycle', e.target.value)} 
                                                        className="w-full border border-gray-400 p-1.5 rounded bg-white text-black text-xs"
                                                    >
                                                        <option value="Monthly">Monthly</option>
                                                        <option value="Quarterly">Quarterly</option>
                                                        <option value="Yearly">Yearly</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date IN</label>
                                                    <input 
                                                        type="date" 
                                                        value={job.inDate} 
                                                        disabled={!isAdmin} 
                                                        onChange={(e) => updateJobInSelected(job.id, 'inDate', e.target.value)} 
                                                        className="w-full border border-gray-400 p-1.5 rounded bg-white text-black text-xs" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date OUT</label>
                                                    <input 
                                                        type="date" 
                                                        value={job.outDate} 
                                                        disabled={!isAdmin} 
                                                        onChange={(e) => updateJobInSelected(job.id, 'outDate', e.target.value)} 
                                                        className="w-full border border-gray-400 p-1.5 rounded bg-white text-black text-xs" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                          </div>
                      </div>
                  )}
              </div>
              )}
          </div>
      )}

      {/* --- Main SVG Canvas with Zoom & Scroll --- */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-auto bg-gray-200 custom-scrollbar flex items-center justify-center p-10"
      >
        <div 
            style={{ 
                width: `${Math.max(dimensions.length, 1000) * zoom}px`, 
                height: `${Math.max(dimensions.width, 800) * zoom}px`,
                transition: 'width 0.2s, height 0.2s',
                position: 'relative'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
        >
            <svg 
                ref={svgRef}
                viewBox={`-500 -500 ${dimensions.length + 1000} ${dimensions.width + 1000}`} 
                preserveAspectRatio="xMidYMid meet"
                className={`w-full h-full shadow-2xl bg-white border-4 border-gray-300 ${activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={(e) => handleMouseDown(e)}
            >
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#334155" /></marker>
                    <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)"><path d="M 0,0 L 0,10 M 10,0 L 10,10" stroke="#FFCC00" strokeWidth="2" strokeOpacity="0.5" /></pattern>
                </defs>
                
                {/* Background Floor Area */}
                <rect x="0" y="0" width={dimensions.length} height={dimensions.width} fill="#f8fafc" stroke="#333" strokeWidth="2" />
                
                {/* Reference Grid */}
                <pattern id="grid" width={config.columnSpacing} height={config.columnSpacing} patternUnits="userSpaceOnUse">
                    <path d={`M ${config.columnSpacing} 0 L 0 0 0 ${config.columnSpacing}`} fill="none" stroke="#e2e8f0" strokeWidth="2"/>
                </pattern>
                <rect width={dimensions.length} height={dimensions.width} fill="url(#grid)" pointerEvents="none" />

                {/* --- Render Items (Memoized) --- */}
                <ItemsLayer items={items} selectedItemId={selectedItemId} onMouseDown={handleMouseDown} />

                {/* --- Ghost Preview Item --- */}
                {isAdmin && activeTool !== 'select' && hoverPos && (
                   <g transform={`translate(${hoverPos.x}, ${hoverPos.y})`} style={{ opacity: 0.6, pointerEvents: 'none' }}>
                       {(() => {
                           const defaults = getItemDefaults(activeTool);
                           // Center the ghost on cursor
                           const ghostX = -(defaults.width || 100) / 2;
                           const ghostY = -(defaults.height || 100) / 2;
                           
                           const ghostItem: LayoutItem = {
                               id: 'ghost',
                               type: activeTool,
                               x: ghostX,
                               y: ghostY,
                               width: defaults.width || 100,
                               height: defaults.height || 100,
                               depth: defaults.depth || 100,
                               color: defaults.color,
                               label: defaults.label,
                               rotation: 0
                           } as LayoutItem;
                           
                           return (
                             <g transform={`translate(${ghostX}, ${ghostY})`}>
                               {renderItemVisuals(ghostItem, false)}
                             </g>
                           );
                       })()}
                   </g>
                )}

                {/* Labels */}
                <text x={dimensions.length / 2} y={dimensions.width + 100} fontSize="50" textAnchor="middle" fill="#64748b">{dimensions.length} cm</text>
                <text x={-100} y={dimensions.width / 2} fontSize="50" textAnchor="middle" fill="#64748b" transform={`rotate(-90, -100, ${dimensions.width/2})`}>{dimensions.width} cm</text>

            </svg>
        </div>
      </div>
    </div>
  );
};

export default View2D;