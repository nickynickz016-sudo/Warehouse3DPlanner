import React, { useState } from 'react';
import { LayoutItem, WarehouseConfig, RackDetails, JobEntry, BRANCH_MAP } from '../types';
import { 
    RotateCw, AlignJustify, QrCode, Download, Activity, 
    User, Plus, FileDown, Trash2, Box, Clock, X, Package, Maximize, Copy, Calendar, Check
} from 'lucide-react';
import { generateShipperPassport } from '../services/pdfService';

interface Props {
    selectedItem: LayoutItem | null;
    selectedItemIds: string[];
    isAdmin: boolean;
    config: WarehouseConfig;
    onUpdateProperty: (field: string, value: any, isRackDetail?: boolean) => void;
    onUpdateJob: (jobId: string, field: keyof JobEntry, value: any) => void;
    onRemoveJob: (jobId: string) => void;
    onAddJob: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onGenerateQR: (item: LayoutItem) => void;
    qrCodeUrl: string | null;
    onManagePackages: (jobId: string) => void;
    onUpdateConfig: (field: string, value: any) => void;
    onIssuePassport: (item: LayoutItem) => void;
    onClose: () => void;
}

const PropertyPanel: React.FC<Props> = ({ 
    selectedItem, selectedItemIds, isAdmin, config, 
    onUpdateProperty, onUpdateJob, onRemoveJob, onAddJob, 
    onDuplicate, onDelete,
    onGenerateQR, qrCodeUrl, onManagePackages, onUpdateConfig,
    onIssuePassport,
    onClose
}) => {
    if (selectedItemIds.length === 0) return null;

    const [copiedLink, setCopiedLink] = useState(false);
    const branchInfo = config.branch ? (BRANCH_MAP[config.branch] || BRANCH_MAP['UAE']) : BRANCH_MAP['UAE'];
    const currency = branchInfo.currency;
    const jobPrefix = branchInfo.jobPrefix;

    const supportsQR = selectedItem && ['rack', 'open_cabin', 'open_space_storage', 'temp_storage'].includes(selectedItem.type);

    return (
        <div className="w-80 h-full bg-gray-50 border-l border-gray-200 overflow-y-auto custom-scrollbar flex flex-col shadow-xl z-30">
            <div className="bg-brand-primary text-white p-4 flex justify-between items-center shrink-0 border-b-2 border-brand-accent">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-brand-accent" />
                    <h3 className="font-bold uppercase tracking-widest text-sm">
                        {selectedItemIds.length > 1 ? `${selectedItemIds.length} Items` : selectedItem?.type.replace(/_/g, ' ')} Properties
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <>
                            <button onClick={onDuplicate} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Duplicate">
                                <Copy size={16} />
                            </button>
                            <button 
                                onClick={onDelete} 
                                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-red-300 hover:text-red-500" 
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Close">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6 pb-24">
                {selectedItemIds.length > 1 ? (
                    <div className="space-y-4">
                        {/* Multi Selection Summary Card */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Multi-Selection Active</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-black rounded-full">
                                    {selectedItemIds.length} Total
                                </span>
                            </div>

                            {/* Item Category Breakdown */}
                            {(() => {
                                const activeLevel = config.levels.find(l => l.id === config.activeLevelId);
                                const selectedItems = activeLevel ? activeLevel.items.filter(i => selectedItemIds.includes(i.id)) : [];
                                const cabinCount = selectedItems.filter(i => i.type === 'open_cabin').length;
                                const officeCount = selectedItems.filter(i => i.type === 'office').length;
                                const rackCount = selectedItems.filter(i => i.type === 'rack').length;
                                const otherCount = selectedItems.length - cabinCount - officeCount - rackCount;

                                return (
                                    <div className="space-y-1.5 text-xs">
                                        {cabinCount > 0 && (
                                            <div className="flex justify-between items-center px-2.5 py-1.5 bg-teal-50 rounded-lg text-teal-800 font-bold border border-teal-100">
                                                <span>Cabins</span>
                                                <span className="font-mono bg-teal-200/80 px-2 py-0.5 rounded-full text-xs">{cabinCount}</span>
                                            </div>
                                        )}
                                        {officeCount > 0 && (
                                            <div className="flex justify-between items-center px-2.5 py-1.5 bg-blue-50 rounded-lg text-blue-800 font-bold border border-blue-100">
                                                <span>Offices</span>
                                                <span className="font-mono bg-blue-200/80 px-2 py-0.5 rounded-full text-xs">{officeCount}</span>
                                            </div>
                                        )}
                                        {rackCount > 0 && (
                                            <div className="flex justify-between items-center px-2.5 py-1.5 bg-amber-50 rounded-lg text-amber-800 font-bold border border-amber-100">
                                                <span>Racks</span>
                                                <span className="font-mono bg-amber-200/80 px-2 py-0.5 rounded-full text-xs">{rackCount}</span>
                                            </div>
                                        )}
                                        {otherCount > 0 && (
                                            <div className="flex justify-between items-center px-2.5 py-1.5 bg-gray-50 rounded-lg text-gray-700 font-bold border border-gray-200">
                                                <span>Other Units</span>
                                                <span className="font-mono bg-gray-200 px-2 py-0.5 rounded-full text-xs">{otherCount}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Keyboard Delete Notice */}
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                                <span className="text-base shrink-0">⌨️</span>
                                <div className="leading-snug">
                                    <span className="font-bold">Keyboard Quick Action:</span> Single press <kbd className="px-1.5 py-0.5 bg-amber-200 text-amber-900 font-mono font-bold rounded text-[10px] mx-0.5">Delete</kbd> or <kbd className="px-1.5 py-0.5 bg-amber-200 text-amber-900 font-mono font-bold rounded text-[10px] mx-0.5">Backspace</kbd> on your keyboard to instantly remove all selected items.
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {isAdmin && (
                                <div className="space-y-2 pt-1">
                                    <button
                                        onClick={onDelete}
                                        className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                                        title="Delete all selected units"
                                    >
                                        <Trash2 size={15} />
                                        <span>Delete All Selected ({selectedItemIds.length})</span>
                                    </button>

                                    <button
                                        onClick={onDuplicate}
                                        className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                                    >
                                        <Copy size={14} />
                                        <span>Duplicate All Selected</span>
                                    </button>

                                    <button
                                        onClick={onClose}
                                        className="w-full py-2 px-4 text-gray-500 hover:text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <X size={14} />
                                        <span>Deselect All (Esc)</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Batch Color Action */}
                        {isAdmin && (
                            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Batch Color Tint</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    {['#FFCC00', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ccfbf1', '#fed7aa', '#cbd5e1'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => onUpdateProperty('color', color)}
                                            style={{ backgroundColor: color }}
                                            className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                                            title={`Set color ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : selectedItem && (
                    <>
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                                <Box size={14} className="text-brand-primary" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dimension Profile</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">Width (cm)</label>
                                    <input type="number" value={selectedItem.width} disabled={!isAdmin} onChange={(e) => onUpdateProperty('width', Number(e.target.value))} className="w-full text-lg font-mono font-black text-brand-primary bg-transparent outline-none" />
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">Length (cm)</label>
                                    <input type="number" value={selectedItem.height} disabled={!isAdmin} onChange={(e) => onUpdateProperty('height', Number(e.target.value))} className="w-full text-lg font-mono font-black text-brand-primary bg-transparent outline-none" />
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">Height (cm)</label>
                                    <input type="number" value={selectedItem.depth || 0} disabled={!isAdmin} onChange={(e) => onUpdateProperty('depth', Number(e.target.value))} className="w-full text-lg font-mono font-black text-brand-primary bg-transparent outline-none" />
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-2 flex items-center gap-1"><RotateCw size={10}/> Orientation</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="range" min="0" max="360" step="15" value={selectedItem.rotation} disabled={!isAdmin} onChange={(e) => onUpdateProperty('rotation', Number(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                                        <span className="text-[10px] font-mono font-black text-brand-primary w-8 text-right">{selectedItem.rotation}°</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">Unit Label / Name</label>
                                <input type="text" value={selectedItem.label || ''} disabled={!isAdmin} onChange={(e) => onUpdateProperty('label', e.target.value)} className="w-full text-sm font-black text-gray-900 bg-transparent outline-none placeholder:text-gray-200" placeholder="ENTER LABEL..." />
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1.5">Asset Color / Tag</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {['#FFCC00', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#64748b', '#cbd5e1'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            disabled={!isAdmin}
                                            onClick={() => onUpdateProperty('color', c)}
                                            className={`w-5 h-5 rounded-full border-2 transition-transform ${selectedItem.color === c ? 'scale-125 border-black shadow' : 'border-white hover:scale-110'}`}
                                            style={{ backgroundColor: c }}
                                            title={c}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={selectedItem.color || '#cccccc'}
                                        disabled={!isAdmin}
                                        onChange={(e) => onUpdateProperty('color', e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 ml-1"
                                        title="Custom color"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rack Details */}
                        {(selectedItem.type === 'rack' || selectedItem.type === 'open_cabin' || selectedItem.type === 'temp_storage') && selectedItem.rackDetails && (
                            <div className="space-y-4">
                                <section className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuration</h4>
                                        <select value={selectedItem.rackDetails.status} disabled={!isAdmin} onChange={(e) => onUpdateProperty('status', e.target.value, true)} className="border border-gray-200 p-1 rounded text-[10px] font-bold uppercase text-brand-primary bg-gray-50">
                                            <option value="available">Available</option>
                                            <option value="occupied">Occupied</option>
                                            <option value="reserved">Reserved</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Levels</label>
                                            <input type="number" value={selectedItem.rackDetails.levels} disabled={!isAdmin} onChange={(e) => onUpdateProperty('levels', Number(e.target.value), true)} className="w-full border border-gray-200 p-1.5 rounded text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-400 uppercase">Load (CBM)</label>
                                            <input type="number" value={selectedItem.rackDetails.capacityPerLevel} disabled={!isAdmin} onChange={(e) => onUpdateProperty('capacityPerLevel', Number(e.target.value), true)} className="w-full border border-gray-200 p-1.5 rounded text-xs" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Enclosure</label>
                                        <select value={selectedItem.rackDetails.enclosureType} disabled={!isAdmin} onChange={(e) => onUpdateProperty('enclosureType', e.target.value, true)} className="w-full border border-gray-200 p-1.5 rounded text-xs text-gray-700">
                                            <option value="Open Space">Open Space</option>
                                            <option value="Shuttered Warehouse">Shuttered</option>
                                            <option value="Close Cabin">Close Cabin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Account Manager / Sales Person</label>
                                        <input 
                                            type="text" 
                                            value={selectedItem.rackDetails.salesPerson || ''} 
                                            disabled={!isAdmin} 
                                            onChange={(e) => onUpdateProperty('salesPerson', e.target.value, true)} 
                                            placeholder="e.g. Internal Admin / Logistics Manager" 
                                            className="w-full border border-gray-200 p-1.5 rounded text-xs text-gray-700 bg-white" 
                                        />
                                    </div>
                                </section>

                                {/* Jobs Section */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Jobs ({selectedItem.rackDetails.jobs?.length || 0})</h4>
                                        {isAdmin && (
                                            <button onClick={onAddJob} className="flex items-center gap-1 text-[9px] font-bold text-white bg-blue-600 px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                                                <Plus size={10}/> ADD JOB
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {selectedItem.rackDetails.jobs?.map((job) => (
                                            <div key={job.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm relative group animate-in slide-in-from-right-2 duration-200">
                                                {isAdmin && (
                                                    <div className="absolute top-2 right-2 flex items-center gap-2">
                                                        <button 
                                                            onClick={() => generateShipperPassport(job, config.name)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-brand-accent hover:bg-black rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95"
                                                            title="Download Shipper Passport Archive"
                                                        >
                                                            <FileDown size={14}/> ARCHIVE PASSPORT
                                                        </button>
                                                        <button 
                                                            onClick={() => onRemoveJob(job.id)}
                                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                            title="Delete Job"
                                                        >
                                                            <Trash2 size={12}/>
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Job #</label>
                                                        <div className="flex">
                                                            <span className="inline-flex items-center px-1.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l text-[9px] font-bold text-gray-500">{jobPrefix}</span>
                                                            <input type="text" value={job.jobNumber} disabled={!isAdmin} onChange={(e) => onUpdateJob(job.id, 'jobNumber', e.target.value)} className="w-full border border-gray-200 rounded-r p-1 text-xs font-mono" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Shipper</label>
                                                        <input type="text" value={job.shipperName} disabled={!isAdmin} onChange={(e) => onUpdateJob(job.id, 'shipperName', e.target.value)} className="w-full border border-gray-200 rounded p-1 text-xs font-bold" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Billing Cycle</label>
                                                            <select 
                                                                value={job.paymentCycle || 'Monthly'} 
                                                                disabled={!isAdmin} 
                                                                onChange={(e) => onUpdateJob(job.id, 'paymentCycle', e.target.value)} 
                                                                className="w-full border border-gray-200 rounded p-1 text-xs bg-gray-50 font-bold"
                                                            >
                                                                <option value="Monthly">Monthly</option>
                                                                <option value="Quarterly">Quarterly</option>
                                                                <option value="Yearly">Yearly</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">
                                                                Price ({job.paymentCycle || 'Monthly'})
                                                            </label>
                                                            <div className="relative">
                                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-400">{currency}</span>
                                                                <input type="number" value={job.pricePerMonth} disabled={!isAdmin} onChange={(e) => onUpdateJob(job.id, 'pricePerMonth', Number(e.target.value))} className="w-full border border-gray-200 rounded p-1 pl-7 text-xs" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">Storage Class</span>
                                                            <div className="flex bg-white rounded border border-gray-200 p-0.5 w-fit">
                                                                <button 
                                                                    onClick={() => onUpdateJob(job.id, 'storageType', 'SIT')}
                                                                    className={`px-3 py-1 text-[9px] font-black rounded transition-all ${job.storageType === 'SIT' ? 'bg-brand-primary text-brand-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                    title="Short Term Items"
                                                                >
                                                                    SIT
                                                                </button>
                                                                <button 
                                                                    onClick={() => onUpdateJob(job.id, 'storageType', 'LTS')}
                                                                    className={`px-3 py-1 text-[9px] font-black rounded transition-all ${job.storageType === 'LTS' ? 'bg-brand-primary text-brand-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                    title="Long Term Storage"
                                                                >
                                                                    LTS
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1 block">Job Status</span>
                                                            <select
                                                                value={job.status || 'active'}
                                                                disabled={!isAdmin}
                                                                onChange={(e) => onUpdateJob(job.id, 'status', e.target.value)}
                                                                className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold uppercase tracking-tighter text-gray-800 outline-none cursor-pointer focus:border-brand-primary"
                                                            >
                                                                <option value="active">Active</option>
                                                                <option value="pending">Pending</option>
                                                                <option value="completed">Completed</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                <Calendar size={10} className="text-brand-primary" /> 
                                                                <span>Date IN</span>
                                                            </div>
                                                            <div className="relative group/date">
                                                                <input 
                                                                    type="date" 
                                                                    value={job.inDate} 
                                                                    disabled={!isAdmin} 
                                                                    onChange={(e) => onUpdateJob(job.id, 'inDate', e.target.value)} 
                                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-brand-primary focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none transition-all cursor-pointer" 
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                <Calendar size={10} className="text-red-500" /> 
                                                                <span>Date OUT</span>
                                                            </div>
                                                            <div className="relative group/date">
                                                                <input 
                                                                    type="date" 
                                                                    value={job.outDate} 
                                                                    disabled={!isAdmin} 
                                                                    onChange={(e) => onUpdateJob(job.id, 'outDate', e.target.value)} 
                                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-red-600 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all cursor-pointer" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-2 bg-brand-primary/5 rounded border border-dashed border-brand-primary/20">
                                                        <label className="block text-[9px] font-black text-brand-primary uppercase mb-1 flex items-center justify-between">
                                                            CBM Capacity Utilization
                                                            <span className="text-[10px] font-mono">{(job.cbm || 0).toFixed(2)} m³</span>
                                                        </label>
                                                        <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="absolute top-0 left-0 h-full bg-brand-primary transition-all duration-500" 
                                                                style={{ width: `${Math.min(100, ((job.cbm || 0) / (selectedItem.rackDetails.capacityPerLevel || 10)) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <input 
                                                            type="number" 
                                                            step="0.01" 
                                                            value={job.cbm || 0} 
                                                            disabled={!isAdmin} 
                                                            onChange={(e) => onUpdateJob(job.id, 'cbm', Number(e.target.value))} 
                                                            className="mt-2 w-full border border-gray-200 rounded p-1 text-[10px] font-bold text-center bg-white" 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter">Consignment Notes / Details</label>
                                                        <textarea 
                                                            value={job.notes || ''} 
                                                            disabled={!isAdmin} 
                                                            onChange={(e) => onUpdateJob(job.id, 'notes', e.target.value)} 
                                                            rows={2} 
                                                            placeholder="Add consignment or storage notes..." 
                                                            className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-800 bg-white outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent resize-none font-medium" 
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => onManagePackages(job.id)}
                                                        className="w-full py-1.5 bg-brand-primary/5 text-brand-primary border border-brand-primary/20 rounded text-[9px] font-bold uppercase hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Box size={10} /> Packages Tracking
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* QR Code Section */}
                        {supportsQR && (
                            <section className="bg-brand-primary/5 p-5 rounded-2xl border-2 border-dashed border-brand-primary/20 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
                                        <QrCode size={16} /> Asset Digital Identity
                                    </h4>
                                    <div className="px-2 py-0.5 bg-brand-primary text-brand-accent text-[8px] font-black rounded-full uppercase tracking-tighter">Secure</div>
                                </div>
                                
                                {!qrCodeUrl ? (
                                    <div className="space-y-2">
                                        <button onClick={() => onGenerateQR(selectedItem)} className="w-full py-3 bg-white hover:bg-brand-primary hover:text-white text-brand-primary font-black rounded-xl border border-brand-primary/20 text-[10px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 shadow-sm">
                                            Generate Unit ID
                                        </button>
                                        {isAdmin && (
                                            <button onClick={() => onIssuePassport(selectedItem)} className="w-full py-3 bg-brand-primary text-brand-accent font-black rounded-xl border border-brand-primary/20 text-[10px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 shadow-lg shadow-brand-primary/20">
                                                Issue Passport
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                                        <div className="bg-white p-4 rounded-2xl border-2 border-brand-primary/10 shadow-xl">
                                            <img src={qrCodeUrl} alt="QR" className="w-36 h-36" />
                                        </div>
                                        <div className="w-full space-y-2">
                                            <a href={qrCodeUrl} download={`QR-${selectedItem.label || selectedItem.id}.png`} className="w-full py-3 bg-brand-accent text-brand-primary font-black rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-400/20">
                                                <Download size={14} /> Download Tag
                                            </a>
                                            <button 
                                                onClick={() => {
                                                    const publicUrl = `${window.location.origin}/?unitId=${selectedItem.id}&warehouseId=${config.id}&branch=${config.branch || 'UAE'}`;
                                                    navigator.clipboard.writeText(publicUrl);
                                                    setCopiedLink(true);
                                                    setTimeout(() => setCopiedLink(false), 2500);
                                                }}
                                                className={`w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border rounded-xl ${copiedLink ? 'bg-green-600 text-white border-green-600 shadow' : 'bg-white text-gray-600 hover:text-brand-primary border-gray-200'}`}
                                            >
                                                {copiedLink ? <><Check size={12} /> Link Copied!</> : <><Copy size={12} /> Share Identity Link</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PropertyPanel;
