import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WarehouseConfig, LayoutItem, RackDetails, JobEntry, PackageRecord, BRANCH_MAP } from '../types';
import { PALLET_WIDTH, PALLET_DEPTH } from '../constants';
import { getLevelOccupiedCbm } from '../services/warehouseLogic';
import { 
    Move, Grid, Square, Box, 
    DoorOpen, Wind, Video, Footprints, Droplet, Flame,
    X, User, FileText, Activity, RotateCw, AlignJustify, Warehouse, Coins, Calendar, Calculator, Database, Shield, Lock, Monitor, Scan, QrCode, Download, Factory, ZoomIn, ZoomOut, Maximize, Minimize, Copy, Minus,
    Plus, Trash2, Clock, FileDown, Package
} from 'lucide-react';

interface Props {
  config: WarehouseConfig;
  onUpdateItems: (levelId: string, items: LayoutItem[]) => void;
  activeLevelId: string;
  isAdmin: boolean;
  onUpdateConfig?: (newConfig: WarehouseConfig) => void;
  selectedItemIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDeleteSelected?: () => void;
}

type Tool = 'select' | 'rack' | 'office' | 'obstacle' | 'passageway' | 'fire_exit' | 'washroom' | 'entrance' | 'camera' | 'ac' | 'stairs' | 'store' | 'open_cabin' | 'open_space_storage' | 'warehouse' | 'temp_storage';

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
        case 'temp_storage': return { ...defaults, width: 120, height: 120, depth: 100, label: 'TEMP_S', color: '#99f6e4',
            rackDetails: {
                status: 'available', jobs: [],
                volumeOccupied: 0, enclosureType: 'Open Space'
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
                </g>
            );
        case 'warehouse':
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x={item.width/2 - 50} y={item.height-10} width={100} height={10} fill="#6b7280" />
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
                </g>
            );
        case 'temp_storage':
            const tStatus = item.rackDetails?.status || 'available';
            let tFill = item.color;
            if (tStatus === 'occupied') tFill = '#fee2e2';
            else if (tStatus === 'reserved') tFill = '#ffedd5';
            return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill={tFill} stroke={isSelected ? '#ef4444' : '#0d9488'} strokeWidth={isSelected ? 5 : 2} />
                    <rect x={item.width*0.2} y={item.width*0.2} width={item.width*0.6} height={item.height*0.6} fill="none" stroke="#0d9488" strokeWidth="1" />
                    <line x1={0} y1={0} x2={item.width} y2={item.height} stroke="#0d9488" strokeWidth="1" opacity="0.4" />
                    <line x1={item.width} y1={0} x2={0} y2={item.height} stroke="#0d9488" strokeWidth="1" opacity="0.4" />
                    {tStatus === 'occupied' && <circle cx={item.width-15} cy={15} r={8} fill="red" />}
                    {tStatus === 'reserved' && <circle cx={item.width-15} cy={15} r={8} fill="orange" />}
                </g>
            );
        case 'store':
                return (
                <g>
                    <rect x={0} y={0} width={item.width} height={item.height} fill="#e2e8f0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x={10} y={10} width={item.width-20} height={30} fill="#cbd5e1" />
                    <rect x={10} y={item.height-40} width={item.width-20} height={30} fill="#cbd5e1" />
                    <rect x={10} y={10} width={30} height={item.height-20} fill="#cbd5e1" />
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
                </g>
            );
    }
};

// --- Component: Items Layer (Memoized for Performance) ---
const ItemsLayer = React.memo(({ items, selectedItemIds, onMouseDown, labelFontSize, jobPrefix }: { items: LayoutItem[], selectedItemIds: string[], onMouseDown: (e: any, id: string) => void, labelFontSize: number, jobPrefix: string }) => {
    return (
        <>
            {items.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                    <g 
                        key={item.id}
                        onMouseDown={(e) => onMouseDown(e, item.id)}
                        className="cursor-pointer"
                        transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation || 0}, ${item.width/2}, ${item.height/2})`}
                    >
                        {renderItemVisuals(item, isSelected)}
                        
                        {/* High visibility blue highlight for selected items */}
                        {isSelected && (
                            <rect 
                                x={-4} 
                                y={-4} 
                                width={item.width + 8} 
                                height={item.height + 8} 
                                fill="rgba(37, 99, 235, 0.15)" 
                                stroke="#2563eb" 
                                strokeWidth={3} 
                                strokeDasharray="6,4" 
                                rx={4} 
                                pointerEvents="none" 
                            />
                        )}
                        
                        {/* Labels & Details Layer */}
                        {(item.type === 'rack' || item.type === 'open_cabin' || item.type === 'temp_storage') ? (
                            <foreignObject 
                                x={5} 
                                y={5} 
                                width={Math.max(1, item.width - 10)} 
                                height={Math.max(1, item.height - 10)} 
                                transform={`rotate(${-item.rotation}, ${item.width/2}, ${item.height/2})`}
                                style={{ pointerEvents: 'none' }}
                            >
                                <div className="w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
                                    <span 
                                        className="font-bold text-black leading-tight break-words px-1"
                                        style={{ fontSize: `${labelFontSize}px` }}
                                    >
                                        {item.type === 'open_cabin'
                                            ? (item.label || 'CABIN')
                                            : (item.rackDetails?.jobs && item.rackDetails.jobs.length > 0 
                                                ? (item.rackDetails.jobs.length === 1 
                                                    ? (item.rackDetails.jobs[0].shipperName 
                                                        || (item.rackDetails.jobs[0].jobNumber ? `${jobPrefix}${item.rackDetails.jobs[0].jobNumber}` : '')
                                                        || (item.rackDetails.status === 'occupied' ? `${item.label || 'Unit'} [Job]` : (item.label || ''))) 
                                                    : `${item.rackDetails.jobs.length} Jobs`)
                                                : (item.rackDetails?.shipperName 
                                                    || (item.rackDetails?.jobNumber ? `${jobPrefix}${item.rackDetails.jobNumber}` : '')
                                                    || (item.rackDetails.status === 'occupied' ? `${item.label || 'Unit'} [Occupied]` : (item.label || ''))))}
                                    </span>
                                    {(item.type === 'rack' || item.type === 'temp_storage') && item.rackDetails?.salesPerson && (
                                        <span 
                                            className="text-blue-700 font-bold mt-1 truncate w-full"
                                            style={{ fontSize: `${Math.max(6, labelFontSize - 2)}px` }}
                                        >
                                            {item.rackDetails.salesPerson}
                                        </span>
                                    )}
                                </div>
                            </foreignObject>
                        ) : (
                            item.label && (
                                <foreignObject 
                                    x={5} 
                                    y={5} 
                                    width={Math.max(1, item.width - 10)} 
                                    height={Math.max(1, item.height - 10)} 
                                    transform={`rotate(${-item.rotation}, ${item.width/2}, ${item.height/2})`}
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <div className="w-full h-full flex items-center justify-center text-center overflow-hidden">
                                        <span 
                                            className="font-bold text-gray-700 leading-tight break-words px-1 uppercase opacity-70"
                                            style={{ fontSize: `${labelFontSize}px` }}
                                        >
                                            {item.label}
                                        </span>
                                    </div>
                                </foreignObject>
                            )
                        )}
                    </g>
                );
            })}
        </>
    );
}, (prev, next) => {
    return prev.items === next.items && 
           JSON.stringify(prev.selectedItemIds) === JSON.stringify(next.selectedItemIds) && 
           prev.labelFontSize === next.labelFontSize;
});


const View2D: React.FC<Props> = ({ 
  config, onUpdateItems, activeLevelId, isAdmin, onUpdateConfig,
  selectedItemIds, onSelectionChange, onDeleteSelected 
}) => {
  const { dimensions } = config;
  const activeLevel = config.levels.find(l => l.id === activeLevelId);
  const items = activeLevel?.items || [];
  
  const levelVolumeCapacity = activeLevel?.totalVolumeCapacity || 0;
  const usedVolume = activeLevel ? getLevelOccupiedCbm(activeLevel) : 0;
  const remainingVolume = Math.round((levelVolumeCapacity - usedVolume) * 100) / 100;
  const volumePercentage = levelVolumeCapacity > 0 ? (usedVolume / levelVolumeCapacity) * 100 : 0;

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isDragging, setIsDragging] = useState(false);
  const setSelectedItemIds = (ids: string[]) => onSelectionChange(ids);
  const [dragOffsets, setDragOffsets] = useState<Map<string, { x: number, y: number }>>(new Map());

  // Category counts for quick selection
  const cabinCount = useMemo(() => items.filter(i => i.type === 'open_cabin').length, [items]);
  const officeCount = useMemo(() => items.filter(i => i.type === 'office').length, [items]);
  const rackCount = useMemo(() => items.filter(i => i.type === 'rack').length, [items]);

  // Selected item breakdown summary
  const selectedBreakdown = useMemo(() => {
    const selItems = items.filter(i => selectedItemIds.includes(i.id));
    const cabins = selItems.filter(i => i.type === 'open_cabin').length;
    const offices = selItems.filter(i => i.type === 'office').length;
    const racks = selItems.filter(i => i.type === 'rack').length;
    const others = selItems.length - cabins - offices - racks;
    const parts: string[] = [];
    if (cabins > 0) parts.push(`${cabins} ${cabins === 1 ? 'Cabin' : 'Cabins'}`);
    if (offices > 0) parts.push(`${offices} ${offices === 1 ? 'Office' : 'Offices'}`);
    if (racks > 0) parts.push(`${racks} ${racks === 1 ? 'Rack' : 'Racks'}`);
    if (others > 0) parts.push(`${others} other`);
    return parts.join(', ');
  }, [items, selectedItemIds]);

  const executeDeleteSelected = () => {
    if (selectedItemIds.length === 0 || !isAdmin) return;
    if (onDeleteSelected) {
      onDeleteSelected();
    } else {
      const remainingItems = items.filter(item => !selectedItemIds.includes(item.id));
      onUpdateItems(activeLevelId, remainingItems);
      setSelectedItemIds([]);
    }
  };

  // Marquee / Box Selection State
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const [initialSelectedOnBoxStart, setInitialSelectedOnBoxStart] = useState<string[]>([]);
  
  // Hover state for Ghost Preview
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  
  // Zoom State
  const [zoom, setZoom] = useState(0.4);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Keyboard controls for fine-tuning position and instant single-press deletion
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Avoid triggering when typing in input fields or textareas
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;

          // Single press Delete / Backspace to instantly delete all selected cabins, offices, racks, or any items
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedItemIds.length === 0 || !isAdmin) return;
              e.preventDefault();
              e.stopPropagation();
              executeDeleteSelected();
              return;
          }

          // Ctrl+A / Cmd+A to select all items on current level
          if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
              e.preventDefault();
              setSelectedItemIds(items.map(i => i.id));
              return;
          }

          // Escape to deselect all
          if (e.key === 'Escape') {
              e.preventDefault();
              setSelectedItemIds([]);
              return;
          }

          // Arrow keys to nudge items
          if (selectedItemIds.length > 0 && isAdmin) {
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
                  if (selectedItemIds.includes(item.id)) {
                      return { ...item, x: Math.round(item.x + dx), y: Math.round(item.y + dy) };
                  }
                  return item;
              });
              onUpdateItems(activeLevelId, updatedItems);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, isAdmin, items, activeLevelId, onUpdateItems]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, itemId?: string) => {
      e.stopPropagation();
      const pos = getMousePos(e);

      const isShiftPressed = ('shiftKey' in e) && Boolean((e as React.MouseEvent).shiftKey);

      if (activeTool === 'select' || !isAdmin) {
          if (itemId) {
              let newSelectedIds = [...selectedItemIds];
              
              if (isShiftPressed) {
                  if (newSelectedIds.includes(itemId)) {
                      newSelectedIds = newSelectedIds.filter(id => id !== itemId);
                  } else {
                      newSelectedIds.push(itemId);
                  }
              } else {
                  // If clicking an item that's already part of a multi-selection, keep the selection to allow dragging the group
                  if (!newSelectedIds.includes(itemId)) {
                      newSelectedIds = [itemId];
                  }
              }
              
              setSelectedItemIds(newSelectedIds);

              if (isAdmin) {
                  setIsDragging(true);
                  const newOffsets = new Map();
                  newSelectedIds.forEach(id => {
                      const item = items.find(i => i.id === id);
                      if (item) {
                          newOffsets.set(id, { x: pos.x - item.x, y: pos.y - item.y });
                      }
                  });
                  setDragOffsets(newOffsets);
              }
          } else {
              // Clicked on empty canvas -> Start Marquee Rubberband Box Selection
              setIsSelectingBox(true);
              const initial = isShiftPressed ? [...selectedItemIds] : [];
              setInitialSelectedOnBoxStart(initial);
              setSelectionBox({
                  startX: pos.x,
                  startY: pos.y,
                  currentX: pos.x,
                  currentY: pos.y
              });
              if (!isShiftPressed) {
                  setSelectedItemIds([]);
              }
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

      // Box/Marquee selection dragging
      if (isSelectingBox && selectionBox) {
          e.preventDefault();
          const currentBox = {
              ...selectionBox,
              currentX: pos.x,
              currentY: pos.y
          };
          setSelectionBox(currentBox);

          const minX = Math.min(currentBox.startX, currentBox.currentX);
          const maxX = Math.max(currentBox.startX, currentBox.currentX);
          const minY = Math.min(currentBox.startY, currentBox.currentY);
          const maxY = Math.max(currentBox.startY, currentBox.currentY);

          // Find all items whose bounding box intersects with the marquee box
          const intersectedIds = items.filter(item => {
              const itemMinX = item.x;
              const itemMaxX = item.x + item.width;
              const itemMinY = item.y;
              const itemMaxY = item.y + item.height;
              return itemMinX < maxX && itemMaxX > minX && itemMinY < maxY && itemMaxY > minY;
          }).map(i => i.id);

          const combined = Array.from(new Set([...initialSelectedOnBoxStart, ...intersectedIds]));
          setSelectedItemIds(combined);
          return;
      }

      if (isDragging && (activeTool === 'select') && isAdmin) {
          e.preventDefault();
          
          const updatedItems = items.map(item => {
              if (selectedItemIds.includes(item.id)) {
                  const offset = dragOffsets.get(item.id);
                  if (offset) {
                      const newX = pos.x - offset.x;
                      const newY = pos.y - offset.y;
                      const snappedX = Math.round(newX / 10) * 10;
                      const snappedY = Math.round(newY / 10) * 10;
                      return { ...item, x: snappedX, y: snappedY };
                  }
              }
              return item;
          });
          onUpdateItems(activeLevelId, updatedItems);
      }
  };

  const handleMouseUp = () => {
      if (isSelectingBox) {
          setIsSelectingBox(false);
          setSelectionBox(null);
      }
      setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
      if (isSelectingBox) {
          setIsSelectingBox(false);
          setSelectionBox(null);
      }
      setHoverPos(null);
      setIsDragging(false);
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
      setSelectedItemIds([newItem.id]);
  };

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) : null;

  const handleConfigChange = (field: string, value: any) => {
    if (!isAdmin || !onUpdateConfig) return;
    const newConfig = { ...config, [field]: value };
    onUpdateConfig(newConfig);
  };

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
            <ToolButton tool="temp_storage" icon={Package} label="Temp S" />
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

      {/* --- Top Info & Quick Selection Bar --- */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 z-20 border border-gray-300 shadow-md flex items-center gap-2 max-w-[90vw] overflow-x-auto custom-scrollbar">
        <div className="font-bold text-gray-800 shrink-0 px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200 flex items-center gap-1.5">
          <span>Floor: {activeLevel?.name}</span>
          <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-200" title="Active Floor Target Price per CBM">
            {config.branch ? (BRANCH_MAP[config.branch]?.currency || 'AED') : 'AED'} {activeLevel?.pricePerCbm ?? config.pricePerCbm ?? 25}/m³
          </span>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 ml-1 shrink-0">Quick Select:</span>
            
            <button
              onClick={() => setSelectedItemIds(items.map(i => i.id))}
              className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-bold transition-colors shrink-0"
              title="Select all items on this floor (Ctrl+A)"
            >
              All ({items.length})
            </button>

            {cabinCount > 0 && (
              <button
                onClick={() => setSelectedItemIds(items.filter(i => i.type === 'open_cabin').map(i => i.id))}
                className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1"
                title="Select all Cabins on this floor"
              >
                <span>Cabins</span>
                <span className="bg-teal-200/80 px-1 rounded-full text-[10px]">{cabinCount}</span>
              </button>
            )}

            {officeCount > 0 && (
              <button
                onClick={() => setSelectedItemIds(items.filter(i => i.type === 'office').map(i => i.id))}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1"
                title="Select all Offices on this floor"
              >
                <span>Offices</span>
                <span className="bg-blue-200/80 px-1 rounded-full text-[10px]">{officeCount}</span>
              </button>
            )}

            {rackCount > 0 && (
              <button
                onClick={() => setSelectedItemIds(items.filter(i => i.type === 'rack').map(i => i.id))}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1"
                title="Select all Racks on this floor"
              >
                <span>Racks</span>
                <span className="bg-amber-200/80 px-1 rounded-full text-[10px]">{rackCount}</span>
              </button>
            )}

            {selectedItemIds.length > 0 && (
              <>
                <div className="h-3 w-px bg-gray-300 mx-1 shrink-0"></div>
                <button
                  onClick={executeDeleteSelected}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                  title="Single press Delete / Backspace on keyboard or click to delete"
                >
                  <Trash2 size={11} />
                  <span>Delete Selected ({selectedItemIds.length})</span>
                  <kbd className="text-[9px] bg-red-800 text-white px-1 rounded font-mono">Del</kbd>
                </button>
                <button
                  onClick={() => setSelectedItemIds([])}
                  className="px-1.5 py-0.5 text-gray-500 hover:text-gray-800 text-[11px] font-semibold transition-colors shrink-0"
                  title="Deselect All (Esc)"
                >
                  Clear (Esc)
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
            <Lock size={8}/> View Only
          </span>
        )}
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
                <ItemsLayer 
                    items={items} 
                    selectedItemIds={selectedItemIds} 
                    onMouseDown={handleMouseDown} 
                    labelFontSize={config.labelFontSize || 10} 
                    jobPrefix={(BRANCH_MAP[config.branch || 'UAE'] || BRANCH_MAP['UAE']).jobPrefix}
                />

                {/* --- Rubberband Marquee Selection Box --- */}
                {selectionBox && (
                    <g pointerEvents="none">
                        <rect 
                            x={Math.min(selectionBox.startX, selectionBox.currentX)} 
                            y={Math.min(selectionBox.startY, selectionBox.currentY)} 
                            width={Math.max(1, Math.abs(selectionBox.currentX - selectionBox.startX))} 
                            height={Math.max(1, Math.abs(selectionBox.currentY - selectionBox.startY))} 
                            fill="rgba(59, 130, 246, 0.16)" 
                            stroke="#2563eb" 
                            strokeWidth={2} 
                            strokeDasharray="6,4" 
                            rx={3}
                        />
                    </g>
                )}

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

      {/* --- Multi-Selection Quick Floating Action Bar --- */}
      {selectedItemIds.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-gray-700/80 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow">
                      {selectedItemIds.length}
                  </span>
                  <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-200 whitespace-nowrap">
                          {selectedItemIds.length === 1 ? '1 Unit Selected' : `${selectedItemIds.length} Units Selected`}
                      </span>
                      {selectedBreakdown && selectedItemIds.length > 1 && (
                          <span className="text-[10px] text-blue-300 font-semibold whitespace-nowrap">
                              {selectedBreakdown}
                          </span>
                      )}
                  </div>
              </div>

              <div className="h-5 w-px bg-gray-700 mx-1"></div>

              {isAdmin && (
                  <>
                      <button
                          onClick={executeDeleteSelected}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 whitespace-nowrap"
                          title="Delete Selected (Press Delete or Backspace on keyboard)"
                      >
                          <Trash2 size={14} />
                          <span>Delete All</span>
                          <kbd className="ml-1 text-[9px] bg-red-800 text-red-100 px-1.5 py-0.5 rounded font-mono font-bold">Del</kbd>
                      </button>

                      <button
                          onClick={() => {
                              const newItems: LayoutItem[] = [];
                              const newIds: string[] = [];
                              selectedItemIds.forEach(id => {
                                  const item = items.find(i => i.id === id);
                                  if (!item) return;
                                  const newId = `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                                  newItems.push({
                                      ...item,
                                      id: newId,
                                      x: item.x + 30,
                                      y: item.y + 30,
                                      label: item.label ? `${item.label} (Copy)` : ''
                                  });
                                  newIds.push(newId);
                              });
                              onUpdateItems(activeLevelId, [...items, ...newItems]);
                              setSelectedItemIds(newIds);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-gray-700 active:scale-95 whitespace-nowrap"
                          title="Duplicate Selected"
                      >
                          <Copy size={13} />
                          <span>Duplicate</span>
                      </button>
                  </>
              )}

              <button
                  onClick={() => setSelectedItemIds([])}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors p-1"
                  title="Deselect All (Esc)"
              >
                  <X size={15} />
              </button>
          </div>
      )}
    </div>
  );
};

export default View2D;