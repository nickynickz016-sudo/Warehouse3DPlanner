import React, { useState } from 'react';
import { WarehouseConfig, JobEntry, LayoutItem } from '../types';
import { Search, MapPin, Calendar, User, DollarSign, Clock, X } from 'lucide-react';

interface Props {
    config: WarehouseConfig;
    onClose: () => void;
}

interface SearchResult {
    job: JobEntry;
    item: LayoutItem;
    levelName: string;
}

const JobSearch: React.FC<Props> = ({ config, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setResults([]);
            return;
        }

        const found: SearchResult[] = [];
        config.levels.forEach(level => {
            level.items.forEach(item => {
                if (item.rackDetails?.jobs) {
                    item.rackDetails.jobs.forEach(job => {
                        if (job.jobNumber.toLowerCase().includes(term.toLowerCase()) || 
                            job.shipperName.toLowerCase().includes(term.toLowerCase())) {
                            found.push({ job, item, levelName: level.name });
                        }
                    });
                }
            });
        });
        setResults(found);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] border-4 border-brand-primary">
                <div className="p-4 bg-brand-primary text-white flex justify-between items-center border-b-4 border-brand-accent">
                    <div className="flex items-center gap-2">
                        <Search size={20} className="text-brand-accent" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">Job & Shipper Search</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-hidden flex flex-col">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by Job Number (e.g. 0001) or Shipper Name..." 
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary focus:ring-0 transition-all text-lg font-medium"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {results.length > 0 ? (
                            results.map((res, idx) => (
                                <div key={`${res.job.id}-${idx}`} className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:border-brand-accent transition-all shadow-sm hover:shadow-md group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Job</span>
                                                <span className="text-xl font-mono font-bold text-brand-primary">AE{res.job.jobNumber}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                <User size={16} className="text-gray-400" />
                                                {res.job.shipperName}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                res.job.status === 'active' ? 'bg-green-100 text-green-700' : 
                                                res.job.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {res.job.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <MapPin size={16} className="text-brand-accent" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-gray-400">Location</p>
                                                <p className="font-bold">{res.levelName} - {res.item.label || res.item.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar size={16} className="text-brand-accent" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-gray-400">Timeline</p>
                                                <p className="font-bold">{res.job.inDate || 'N/A'} → {res.job.outDate || 'Present'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <DollarSign size={16} className="text-brand-accent" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-gray-400">Financials</p>
                                                <p className="font-bold">{res.job.pricePerMonth} AED / {res.job.paymentCycle}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {res.job.notes && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 italic border-l-4 border-gray-200">
                                            "{res.job.notes}"
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : searchTerm.length >= 2 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">No jobs or shippers found matching "{searchTerm}"</p>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">Start typing to search for jobs...</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-200 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Warehouse Management System v2.0</p>
                </div>
            </div>
        </div>
    );
};

export default JobSearch;
