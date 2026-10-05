import React, { useState, useMemo } from 'react';
import { WarehouseConfig, JobEntry, LayoutItem, BranchCode, BRANCH_LIST, BRANCH_MAP } from '../types';
import { Search, MapPin, Calendar, User, Coins, Clock, X, Cuboid as BoxIcon, ChevronDown, Building2, ExternalLink, Globe } from 'lucide-react';

interface Props {
    config: WarehouseConfig;
    warehouses?: WarehouseConfig[];
    activeBranch?: BranchCode;
    onSelectWarehouseAndItem?: (warehouseId: string, itemId: string, branch: BranchCode) => void;
    onClose: () => void;
}

interface SearchResult {
    job: JobEntry;
    item: LayoutItem;
    levelName: string;
    warehouseId: string;
    warehouseName: string;
    branch: BranchCode;
}

const JobSearch: React.FC<Props> = ({ config, warehouses, activeBranch, onSelectWarehouseAndItem, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'SIT' | 'LTS'>('ALL');
    const [branchFilter, setBranchFilter] = useState<'ALL' | BranchCode>(activeBranch || 'ALL');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

    const allWarehouses = useMemo(() => {
        if (warehouses && warehouses.length > 0) return warehouses;
        return [config];
    }, [warehouses, config]);

    // Available warehouses based on branchFilter
    const filteredWarehousesForSelect = useMemo(() => {
        if (branchFilter === 'ALL') return allWarehouses;
        return allWarehouses.filter(w => (w.branch || 'UAE') === branchFilter);
    }, [allWarehouses, branchFilter]);

    const results = useMemo(() => {
        const found: SearchResult[] = [];
        const rawQuery = searchTerm.trim().toLowerCase();
        // Clean prefix if user typed ae, qa, or sa
        let cleanQuery = rawQuery;
        if (rawQuery.startsWith('ae') || rawQuery.startsWith('qa') || rawQuery.startsWith('sa')) {
            cleanQuery = rawQuery.slice(2);
        }

        const targetWarehouses = allWarehouses.filter(wh => {
            const whBranch = wh.branch || 'UAE';
            if (branchFilter !== 'ALL' && whBranch !== branchFilter) return false;
            if (warehouseFilter !== 'ALL' && wh.id !== warehouseFilter) return false;
            return true;
        });

        targetWarehouses.forEach(wh => {
            const whBranch: BranchCode = wh.branch || 'UAE';
            const bInfo = BRANCH_MAP[whBranch] || BRANCH_MAP['UAE'];

            (wh.levels || []).forEach(level => {
                (level.items || []).forEach(item => {
                    const details = item.rackDetails;
                    if (!details) return;

                    // Collect all jobs, including legacy single entries if present
                    const jobsList: JobEntry[] = (details.jobs && details.jobs.length > 0)
                        ? details.jobs
                        : (details.jobNumber || details.shipperName)
                            ? [{
                                id: `legacy-${item.id}`,
                                jobNumber: details.jobNumber || '',
                                shipperName: details.shipperName || '',
                                inDate: details.inDate || '',
                                outDate: details.outDate || '',
                                pricePerMonth: details.price || 0,
                                cbm: details.volumeOccupied || 0,
                                storageType: 'SIT',
                                paymentCycle: 'Monthly',
                                status: details.status === 'occupied' ? 'active' : 'pending'
                            }]
                            : [];

                    jobsList.forEach(job => {
                        const jobNum = (job.jobNumber || '').toLowerCase();
                        const shipper = (job.shipperName || '').toLowerCase();
                        const sales = (details.salesPerson || '').toLowerCase();
                        const unitLabel = (item.label || item.id || '').toLowerCase();
                        const whName = (wh.name || '').toLowerCase();
                        const fullJobNum = `${bInfo.jobPrefix.toLowerCase()}${jobNum}`;

                        const matchesSearch = !rawQuery || 
                            jobNum.includes(rawQuery) || 
                            jobNum.includes(cleanQuery) ||
                            fullJobNum.includes(rawQuery) ||
                            shipper.includes(rawQuery) ||
                            sales.includes(rawQuery) ||
                            unitLabel.includes(rawQuery) ||
                            whName.includes(rawQuery) ||
                            bInfo.country.toLowerCase().includes(rawQuery);

                        const matchesFilter = typeFilter === 'ALL' || job.storageType === typeFilter;

                        if (matchesSearch && matchesFilter) {
                            found.push({
                                job,
                                item,
                                levelName: level.name,
                                warehouseId: wh.id,
                                warehouseName: wh.name,
                                branch: whBranch
                            });
                        }
                    });
                });
            });
        });
        return found;
    }, [allWarehouses, branchFilter, warehouseFilter, searchTerm, typeFilter]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[88vh] border-4 border-brand-primary overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 bg-brand-primary text-white flex justify-between items-center border-b-4 border-brand-accent shrink-0">
                    <div className="flex items-center gap-3">
                        <Search size={22} className="text-brand-accent" />
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-tight leading-tight flex items-center gap-2">
                                <span>Writer Relocations Directory</span>
                            </h2>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                                {results.length} total active records across {allWarehouses.length} facilities
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-hidden flex flex-col flex-1">
                    {/* Branch Switcher Tabs inside Search */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto shrink-0">
                        <button
                            onClick={() => { setBranchFilter('ALL'); setWarehouseFilter('ALL'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                branchFilter === 'ALL'
                                ? 'bg-brand-primary text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                        >
                            <Globe size={14} className={branchFilter === 'ALL' ? 'text-brand-accent' : 'text-gray-400'} />
                            All Branches
                        </button>
                        {BRANCH_LIST.map(b => {
                            const bCount = allWarehouses.filter(w => (w.branch || 'UAE') === b.code).length;
                            return (
                                <button
                                    key={b.code}
                                    onClick={() => { setBranchFilter(b.code); setWarehouseFilter('ALL'); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                        branchFilter === b.code
                                        ? 'bg-brand-primary text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                    }`}
                                >
                                    <span>{b.flag}</span>
                                    <span>{b.name}</span>
                                    <span className="text-[10px] opacity-70">({bCount})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Filters Bar */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by Job # (e.g. 10023, AE..., QA..., SA...), Shipper, Sales, or Unit..." 
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary focus:bg-white focus:ring-0 transition-all text-sm font-medium outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Facility Dropdown */}
                        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 shrink-0">
                            <Building2 size={16} className="text-brand-primary" />
                            <select 
                                value={warehouseFilter} 
                                onChange={(e) => setWarehouseFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-800 border-none outline-none cursor-pointer focus:ring-0 pr-4"
                            >
                                <option value="ALL">All Facilities ({filteredWarehousesForSelect.length})</option>
                                {filteredWarehousesForSelect.map(w => {
                                    const count = (w.levels || []).reduce((sum, l) => sum + (l.items || []).reduce((iSum, i) => iSum + (i.rackDetails?.jobs?.length || 0), 0), 0);
                                    return (
                                        <option key={w.id} value={w.id}>
                                            {w.name} {count > 0 ? `(${count})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Storage Type Buttons */}
                        <div className="flex bg-gray-100 p-1 rounded-xl gap-1 shrink-0">
                            {(['ALL', 'SIT', 'LTS'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTypeFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                        typeFilter === f 
                                        ? 'bg-brand-primary text-white shadow-md' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {results.length > 0 ? (
                            results.map((res, idx) => {
                                const bInfo = BRANCH_MAP[res.branch] || BRANCH_MAP['UAE'];
                                return (
                                    <div key={`${res.job.id}-${idx}`} className="bg-white border-2 border-gray-200 hover:border-brand-primary rounded-xl p-4 transition-all shadow-sm hover:shadow-md group">
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                                        Job
                                                    </span>
                                                    <span className="text-xl font-mono font-bold text-brand-primary">
                                                        {res.job.jobNumber ? `${bInfo.jobPrefix}${res.job.jobNumber}` : '(Unassigned #)'}
                                                    </span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${
                                                        res.job.storageType === 'SIT' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-orange-200 text-orange-600 bg-orange-50'
                                                    }`}>
                                                        {res.job.storageType}
                                                    </span>
                                                    {/* Branch & Facility Badge */}
                                                    <span className="bg-gray-100 text-gray-800 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 border border-gray-200">
                                                        <span>{bInfo.flag}</span>
                                                        <span className="text-brand-primary font-black">{bInfo.code}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span>{res.warehouseName}</span>
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <User size={16} className="text-gray-400" />
                                                    {res.job.shipperName || <span className="text-gray-400 italic">No Shipper Specified</span>}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    res.job.status === 'active' ? 'bg-green-100 text-green-700' : 
                                                    res.job.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {res.job.status}
                                                </span>
                                                {onSelectWarehouseAndItem && (
                                                    <button
                                                        onClick={() => onSelectWarehouseAndItem(res.warehouseId, res.item.id, res.branch)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary hover:bg-black text-brand-accent text-xs font-bold rounded-lg transition-colors shadow-sm active:scale-95"
                                                        title={`Switch to ${bInfo.name} - ${res.warehouseName} and highlight this unit`}
                                                    >
                                                        <ExternalLink size={12} />
                                                        Locate
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <MapPin size={15} className="text-brand-accent shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-bold uppercase text-gray-400">Unit / Rack</p>
                                                    <p className="font-bold text-gray-900 truncate">{res.item.label || res.item.id} ({res.levelName})</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-600">
                                                <BoxIcon size={15} className="text-brand-accent shrink-0" />
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase text-gray-400">Volume</p>
                                                    <p className="font-bold text-gray-900">{res.job.cbm || 0} CBM</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar size={15} className="text-brand-accent shrink-0" />
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase text-gray-400">Timeline</p>
                                                    <p className="font-bold text-gray-900 whitespace-nowrap">{res.job.inDate || 'N/A'} → {res.job.outDate || '...'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Coins size={15} className="text-brand-accent shrink-0" />
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase text-gray-400">Rate</p>
                                                    <p className="font-bold text-gray-900 whitespace-nowrap">{res.job.pricePerMonth} {bInfo.currency} / {res.job.paymentCycle || 'Mo'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Package Movement History Dropdown */}
                                        {res.job.packages && res.job.packages.some(p => p.history && p.history.length > 0) && (
                                            <div className="mt-3 border-t border-gray-100 pt-3">
                                                <details className="group/history">
                                                    <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-black text-brand-primary uppercase tracking-widest hover:text-brand-accent transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={14} />
                                                            Package Movement History ({res.job.packages.filter(p => p.status === 'in').length} in stock)
                                                        </div>
                                                        <ChevronDown size={14} className="group-open/history:rotate-180 transition-transform" />
                                                    </summary>
                                                    <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                        {res.job.packages
                                                            .flatMap(p => (p.history || []).map(h => ({ ...h, packageNumber: p.number })))
                                                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                            .map((event, eventIdx) => (
                                                                <div key={eventIdx} className={`flex justify-between items-center p-2 rounded text-xs border ${event.status === 'in' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-10 text-[10px] font-black opacity-70">#{event.packageNumber}</span>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{event.status === 'in' ? 'Movement IN' : 'Movement OUT'}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono font-medium opacity-70">{event.timestamp}</span>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </details>
                                            </div>
                                        )}

                                        {res.job.notes && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500 italic border-l-4 border-gray-200">
                                                "{res.job.notes}"
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-16 text-gray-400">
                                <Search size={48} className="mx-auto mb-3 opacity-30 text-brand-primary" />
                                <p className="text-base font-bold text-gray-600">
                                    {searchTerm ? `No job records found matching "${searchTerm}"` : 'No job entries found in the selected branch/facility.'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Try switching to "All Branches" or search across other facilities.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest px-6 shrink-0">
                    <span>Writer Relocations - Regional Logistics Network</span>
                    <span>{results.length} Active Records Shown</span>
                </div>
            </div>
        </div>
    );
};

export default JobSearch;
