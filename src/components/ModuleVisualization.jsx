import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AccordionItem, DualListBox } from './SharedComponents';
import { VisualizationCanvas } from './VisualizationCanvas';
import { Plus, Trash2, Save, X, Box, Settings, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

// --- Lokalne Style (można przenieść do Shared w przyszłości) ---
const StyledInput = (props) => (
    <input {...props} className={clsx("w-full bg-slate-50 border border-border text-slate-800 text-xs rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary block p-2 transition-all outline-none", props.className)} />
);

const StyledSelect = (props) => (
    <select {...props} className={clsx("w-full bg-slate-50 border border-border text-slate-800 text-xs rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary block p-2 transition-all outline-none", props.className)} />
);

const ActionButton = ({ children, variant = 'primary', onClick, className }) => {
    const styles = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
        danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
        success: "bg-emerald-500 hover:bg-emerald-600 text-white",
        outline: "bg-white border border-border hover:bg-slate-50 text-slate-700"
    };
    return (
        <button type="button" onClick={onClick} className={clsx("px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1", styles[variant], className)}>
            {children}
        </button>
    );
};

// --- SUB-KOMPONENTY ---

const ModuleStation = () => {
    const { simulationConfig, addConfigItem, deleteConfigItem, updateConfigItem, db } = useApp();
    const { stations } = simulationConfig; const { functions, casings } = db;
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [name, setName] = useState(""); 
    const stationTypes = ["podmontaz", "montaz", "jakosci", "pakowanie"]; 
    const [type, setType] = useState(stationTypes[0]); 
    const [capacity, setCapacity] = useState(1);
    const [variance, setVariance] = useState(0);
    const [failureProb, setFailureProb] = useState(0);
    const [allowedOps, setAllowedOps] = useState([]);
    const [filterSourceType, setFilterSourceType] = useState('functions'); 
    const [filterSelectedSize, setFilterSelectedSize] = useState(''); 
    const [filterSelectedKey, setFilterSelectedKey] = useState('');
    const isEditing = selectedStationId !== null;
    
    const resetForm = () => { setSelectedStationId(null); setName(""); setType(stationTypes[0]); setCapacity(1); setAllowedOps([]); setVariance(0); setFailureProb(0); };
    
    useEffect(() => { 
        if (isEditing) { 
            const station = stations.find(s => s.id === selectedStationId); 
            if (station) { 
                setName(station.name); setType(station.type); setCapacity(station.capacity || 1);
                setAllowedOps(station.allowedOps || []); setVariance(station.variance || 0); setFailureProb(station.failureProb || 0);
            } 
        } else { resetForm(); } 
    }, [selectedStationId, stations]);
    
    const filterSizes = useMemo(() => { const funcSizes = Object.keys(functions); const caseSizes = Object.keys(casings); return [...new Set([...funcSizes, ...caseSizes])].sort(); }, [functions, casings]);
    const filterKeys = useMemo(() => { if (!filterSelectedSize) return []; const source = (filterSourceType === 'functions') ? functions : casings; return Object.keys(source[filterSelectedSize] || {}).sort(); }, [filterSelectedSize, filterSourceType, functions, casings]);
    const availableOpsForFilter = useMemo(() => { if (!filterSelectedSize || !filterSelectedKey) return []; const source = (filterSourceType === 'functions') ? functions : casings; return source[filterSelectedSize]?.[filterSelectedKey] || []; }, [filterSelectedSize, filterSelectedKey, filterSourceType, functions, casings]);
    
    const handleAllowedOpsChange = (newOpsList) => { setAllowedOps(newOpsList); if (isEditing) { updateConfigItem("station", selectedStationId, { allowedOps: newOpsList }); } };
    const handleSubmit = (e) => { e.preventDefault(); if (!name || !type) return; const stationData = { name, type, capacity: parseInt(capacity) || 1, variance: parseFloat(variance) || 0, failureProb: parseFloat(failureProb) || 0, allowedOps }; if (isEditing) { updateConfigItem("station", selectedStationId, stationData); } else { const newId = addConfigItem("station", stationData); if (newId) { setSelectedStationId(newId); } } };
    const handleDelete = () => { if (isEditing) { if (confirm(`Czy na pewno chcesz usunąć stację "${name}"?`)) { deleteConfigItem("station", selectedStationId); resetForm(); } } };

    return (
        <div className="space-y-4">
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {stations.length === 0 ? (<p className="text-xs text-slate-400 text-center py-4 italic">Brak stacji w konfiguracji</p>) : (
                    stations.map(station => (
                        <button key={station.id} onClick={() => setSelectedStationId(station.id)} className={clsx("w-full flex justify-between items-center p-2.5 rounded-lg border text-xs text-left transition-all", selectedStationId === station.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-border hover:bg-slate-50')}>
                            <div><span className="font-semibold block">{station.name}</span><span className="text-[10px] text-slate-500 uppercase">{station.type} • Cap: {station.capacity || 1}</span></div>
                            {selectedStationId === station.id && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        </button>
                    ))
                )}
            </div>
            
            <ActionButton variant="outline" onClick={resetForm} className="w-full text-blue-600 border-dashed border-blue-200 hover:border-blue-300 bg-blue-50/50 hover:bg-blue-50">
                <Plus size={14} /> Dodaj Nową Stację
            </ActionButton>
            
            <div className="bg-slate-50/50 p-4 rounded-xl border border-border mt-4">
                <h4 className="font-semibold mb-3 text-slate-700 text-xs uppercase flex items-center gap-2">
                    {isEditing ? <><Settings size={14}/> Edycja Stacji</> : <><Plus size={14}/> Nowa Stacja</>}
                </h4>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div><label className="text-xs font-medium text-slate-600">Nazwa Stacji</label><StyledInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Montaż Wstępny A" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-medium text-slate-600">Typ</label><StyledSelect value={type} onChange={(e) => setType(e.target.value)}>{stationTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</StyledSelect></div>
                        <div><label className="text-xs font-medium text-slate-600">Pojemność</label><StyledInput type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-2 bg-orange-50/50 rounded-lg border border-orange-100">
                        <div><label className="text-[10px] font-bold text-orange-700">Zmienność (%)</label><StyledInput type="number" min="0" max="100" value={variance} onChange={(e) => setVariance(e.target.value)} className="bg-white" /></div>
                        <div><label className="text-[10px] font-bold text-orange-700">Awaryjność (%)</label><StyledInput type="number" min="0" max="100" value={failureProb} onChange={(e) => setFailureProb(e.target.value)} className="bg-white" /></div>
                    </div>
                    
                    <div className="pt-2 border-t border-border">
                         <label className="text-xs font-medium text-slate-600 block mb-2">Przydziel Operacje</label>
                         <div className="grid grid-cols-3 gap-1 mb-2">
                            <StyledSelect value={filterSourceType} onChange={e => { setFilterSelectedSize(''); setFilterSelectedKey(''); setFilterSourceType(e.target.value); }}><option value="functions">Funkcje</option><option value="casings">Obudowy</option></StyledSelect>
                            <StyledSelect value={filterSelectedSize} onChange={e => { setFilterSelectedSize(e.target.value); setFilterSelectedKey(''); }}><option value="">Rozmiar</option>{filterSizes.map(s => <option key={s} value={s}>{s}</option>)}</StyledSelect>
                            <StyledSelect value={filterSelectedKey} onChange={e => setFilterSelectedKey(e.target.value)} disabled={!filterSelectedSize}><option value="">Klucz</option>{filterKeys.map(k => <option key={k} value={k}>{k}</option>)}</StyledSelect>
                        </div>
                        <DualListBox title="Operacje" options={availableOpsForFilter} selectedItems={allowedOps} onSelectionChange={handleAllowedOpsChange} height="120px" renderItem={(op) => `${op.name} (${op.time}h)`}/>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <ActionButton type="submit" variant="primary" onClick={handleSubmit} className="flex-1">
                            {isEditing ? <><Save size={14}/> Zapisz Zmiany</> : <><Plus size={14}/> Dodaj</>}
                        </ActionButton>
                        {isEditing && (
                             <ActionButton variant="danger" onClick={handleDelete}>
                                <Trash2 size={14}/>
                             </ActionButton>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

const ModuleBuffer = () => {
    const { simulationConfig, addConfigItem, deleteConfigItem, updateConfigItem, db } = useApp();
    const { buffers } = simulationConfig;
    const [selectedBufferId, setSelectedBufferId] = useState(null);
    const [name, setName] = useState("");
    const [capacity, setCapacity] = useState(10);
    const [isStartBuffer, setIsStartBuffer] = useState(false);
    const [isEndBuffer, setIsEndBuffer] = useState(false);
    const [allowedProductTypes, setAllowedProductTypes] = useState([]);
    const [filterSize, setFilterSize] = useState('');
    const isEditing = selectedBufferId !== null;
    
    // Logika memo (bez zmian)
    const allProductTypesMemo = useMemo(() => {
        const allTypes = [];
        if (db.functions) Object.keys(db.functions).forEach(size => Object.keys(db.functions[size]).forEach(key => allTypes.push({ id: `functions_${size}_${key}`, name: `Funkcja: ${size}-${key}`, size: size })));
        if (db.casings) Object.keys(db.casings).forEach(size => Object.keys(db.casings[size]).forEach(key => allTypes.push({ id: `casings_${size}_${key}`, name: `Obudowa: ${size}-${key}`, size: size })));
        return allTypes.sort((a,b) => a.name.localeCompare(b.name));
    }, [db.functions, db.casings]);
    
    const allSizesMemo = useMemo(() => { const sizes = new Set(allProductTypesMemo.map(p => p.size)); return Array.from(sizes).sort(); }, [allProductTypesMemo]);
    const filteredProductTypesMemo = useMemo(() => { if (!filterSize) { return allProductTypesMemo; } return allProductTypesMemo.filter(p => p.size === filterSize); }, [allProductTypesMemo, filterSize]);
    const resetForm = () => { setSelectedBufferId(null); setName(""); setCapacity(10); setIsStartBuffer(false); setIsEndBuffer(false); setAllowedProductTypes([]); setFilterSize(''); };
    useEffect(() => { if (isEditing) { const buffer = buffers.find(b => b.id === selectedBufferId); if (buffer) { setName(buffer.name); setCapacity(buffer.capacity); setIsStartBuffer(buffer.isStartBuffer || false); setIsEndBuffer(buffer.isEndBuffer || false); setAllowedProductTypes(buffer.allowedProductTypes || []); } } else { resetForm(); } }, [selectedBufferId, buffers]);
    
    const handleSubmit = (e) => { e.preventDefault(); if (!name) return; const bufferData = { name, capacity: parseInt(capacity, 10) || 1, isStartBuffer, isEndBuffer, allowedProductTypes }; if (isEditing) { updateConfigItem("buffer", selectedBufferId, bufferData); } else { const newId = addConfigItem("buffer", bufferData); if (newId) { setSelectedBufferId(newId); } } };
    const handleDelete = () => { if (isEditing) { if (confirm(`Czy na pewno chcesz usunąć bufor "${name}"?`)) { deleteConfigItem("buffer", selectedBufferId); resetForm(); } } };
    const handleAllowedTypesChange = (newSelectedItems) => { const newIds = newSelectedItems.map(item => item.id); const otherIds = allowedProductTypes.filter(id => { const item = allProductTypesMemo.find(p => p.id === id); return item && item.size !== filterSize; }); setAllowedProductTypes([...new Set([...otherIds, ...newIds])]); if (isEditing) { updateConfigItem("buffer", selectedBufferId, { allowedProductTypes: [...new Set([...otherIds, ...newIds])] }); } };
    const selectedItemsForDualList = useMemo(() => { const selectedIds = new Set(allowedProductTypes); return allProductTypesMemo.filter(p => selectedIds.has(p.id)); }, [allProductTypesMemo, allowedProductTypes]);

    return (
        <div className="space-y-4">
             <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {buffers.map(buffer => (
                    <button key={buffer.id} onClick={() => setSelectedBufferId(buffer.id)} className={clsx("w-full flex justify-between items-center p-2.5 rounded-lg border text-xs text-left transition-all", selectedBufferId === buffer.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-border hover:bg-slate-50')}>
                        <div>
                            <span className="font-semibold block">{buffer.name}</span>
                            <span className="text-[10px] text-slate-500">Cap: {buffer.capacity}</span>
                            {buffer.isStartBuffer && <span className="ml-2 text-[9px] text-green-600 bg-green-100 px-1 py-0.5 rounded border border-green-200">START</span>}
                            {buffer.isEndBuffer && <span className="ml-2 text-[9px] text-red-600 bg-red-100 px-1 py-0.5 rounded border border-red-200">KONIEC</span>}
                        </div>
                    </button>
                ))}
            </div>
            <ActionButton variant="outline" onClick={resetForm} className="w-full text-blue-600 border-dashed border-blue-200 hover:border-blue-300 bg-blue-50/50 hover:bg-blue-50"><Plus size={14} /> Nowy Bufor</ActionButton>
            
            <div className="bg-slate-50/50 p-4 rounded-xl border border-border mt-4">
                 <h4 className="font-semibold mb-3 text-slate-700 text-xs uppercase flex items-center gap-2">
                    {isEditing ? <><Settings size={14}/> Edycja Bufora</> : <><Plus size={14}/> Nowy Bufor</>}
                </h4>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div><label className="text-xs font-medium text-slate-600">Nazwa</label><StyledInput value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-600">Pojemność</label><StyledInput type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
                    <div className="space-y-2">
                         <label className="text-xs font-medium text-slate-600">Dozwolone Typy</label>
                         <StyledSelect value={filterSize} onChange={(e) => setFilterSize(e.target.value)}><option value="">-- Filtr Rozmiaru --</option>{allSizesMemo.map(size => (<option key={size} value={size}>{size}</option>))}</StyledSelect>
                        <DualListBox title="" options={filteredProductTypesMemo} selectedItems={selectedItemsForDualList} onSelectionChange={handleAllowedTypesChange} height="120px" renderItem={(item) => item.name}/>
                    </div>
                    <div className="flex gap-4 p-2 bg-white rounded border border-border">
                        <label className="flex items-center text-xs cursor-pointer"><input type="checkbox" checked={isStartBuffer} onChange={e => { setIsStartBuffer(e.target.checked); if(e.target.checked) setIsEndBuffer(false); }} className="mr-2 accent-blue-600"/> Startowy</label>
                        <label className="flex items-center text-xs cursor-pointer"><input type="checkbox" checked={isEndBuffer} onChange={e => { setIsEndBuffer(e.target.checked); if(e.target.checked) setIsStartBuffer(false); }} className="mr-2 accent-blue-600"/> Kończący</label>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <ActionButton type="submit" variant="primary" onClick={handleSubmit} className="flex-1">{isEditing ? "Zapisz" : "Dodaj"}</ActionButton>
                        {isEditing && <ActionButton variant="danger" onClick={handleDelete}><Trash2 size={14}/></ActionButton>}
                    </div>
                </form>
            </div>
        </div>
    );
};

const ModuleResources = () => {
    // Skrócona wersja dla oszczędności miejsca (struktura ta sama)
    const { simulationConfig, addConfigItem, deleteConfigItem, updateConfigItem } = useApp();
    const { workerPools, toolPools } = simulationConfig;
    const [selectedWorkerPoolId, setSelectedWorkerPoolId] = useState(null);
    const [workerName, setWorkerName] = useState("");
    const [workerCapacity, setWorkerCapacity] = useState(5);
    const [workerSpeed, setWorkerSpeed] = useState(1.2);
    const [workerCost, setWorkerCost] = useState(50);
    const isEditingWorker = selectedWorkerPoolId !== null;
    
    // ... logika resetWorkerForm, useEffect, handleSubmit (bez zmian) ...
    const resetWorkerForm = () => { setSelectedWorkerPoolId(null); setWorkerName(""); setWorkerCapacity(5); setWorkerSpeed(1.2); setWorkerCost(50); };
    useEffect(() => { if (isEditingWorker) { const pool = workerPools.find(p => p.id === selectedWorkerPoolId); if (pool) { setWorkerName(pool.name); setWorkerCapacity(pool.capacity); setWorkerSpeed(pool.speed); setWorkerCost(pool.costPerHour || 50); } } else { resetWorkerForm(); } }, [selectedWorkerPoolId, workerPools]);
    const handleWorkerSubmit = (e) => { e.preventDefault(); if (!workerName) return; const poolData = { name: workerName, capacity: parseInt(workerCapacity) || 1, speed: parseFloat(workerSpeed) || 1, costPerHour: parseFloat(workerCost) || 0 }; if (isEditingWorker) { updateConfigItem("workerPool", selectedWorkerPoolId, poolData); } else { const newId = addConfigItem("workerPool", poolData); if (newId) setSelectedWorkerPoolId(newId); } };
    const handleWorkerDelete = () => { if (isEditingWorker) { if (confirm(`Usuń?`)) { deleteConfigItem("workerPool", selectedWorkerPoolId); resetWorkerForm(); } } };

    return (
        <div className="space-y-6">
            <div>
                 <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Pracownicy</h5>
                 <div className="space-y-1 mb-3">
                    {workerPools.map(pool => (
                         <button key={pool.id} onClick={() => setSelectedWorkerPoolId(pool.id)} className={clsx("w-full flex justify-between p-2 rounded border text-xs", selectedWorkerPoolId === pool.id ? "bg-blue-50 border-blue-300" : "bg-white border-border")}>
                            <span>{pool.name}</span><span className="text-slate-500">x{pool.capacity}</span>
                         </button>
                    ))}
                 </div>
                 <form onSubmit={handleWorkerSubmit} className="p-3 bg-slate-50 border border-border rounded-xl space-y-2">
                     <div className="grid grid-cols-2 gap-2">
                         <StyledInput value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="Nazwa Puli" />
                         <StyledInput type="number" value={workerCapacity} onChange={e => setWorkerCapacity(e.target.value)} placeholder="Ilość" />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <StyledInput type="number" step="0.1" value={workerSpeed} onChange={e => setWorkerSpeed(e.target.value)} placeholder="Prędkość" />
                         <StyledInput type="number" value={workerCost} onChange={e => setWorkerCost(e.target.value)} placeholder="Koszt/h" />
                     </div>
                     <div className="flex gap-2">
                         <ActionButton type="submit" variant="primary" onClick={handleWorkerSubmit} className="flex-1">{isEditingWorker ? "Aktualizuj" : "Dodaj"}</ActionButton>
                         {isEditingWorker && <ActionButton variant="danger" onClick={handleWorkerDelete}><Trash2 size={14}/></ActionButton>}
                         {isEditingWorker && <ActionButton variant="outline" onClick={resetWorkerForm}><X size={14}/></ActionButton>}
                     </div>
                 </form>
            </div>
            {/* Tutaj można dodać sekcję Narzędzi analogicznie */}
        </div>
    );
};

const ModuleFlows = () => {
    // Analogiczna refaktoryzacja dla Flows - używam StyledInput i ActionButton
    const { simulationConfig, addConfigItem, deleteConfigItem, updateConfigItem } = useApp();
    const { stations, buffers, flows } = simulationConfig;
    const [selectedFlowId, setSelectedFlowId] = useState(null);
    const [fromNode, setFromNode] = useState(""); 
    const [toNode, setToNode] = useState(""); 
    const [distance, setDistance] = useState(1);
    const isEditingFlow = selectedFlowId !== null;
    const allProductNodes = useMemo(() => {
        const s = stations.map(n => ({ id: n.id, name: `${n.name} (Stacja)` }));
        const b = buffers.map(n => ({ id: n.id, name: `${n.name} (Bufor)` }));
        return [...s, ...b].sort((a,b) => a.name.localeCompare(b.name));
    }, [stations, buffers]);
    const resetFlowForm = () => { setSelectedFlowId(null); setFromNode(""); setToNode(""); setDistance(1); };
    useEffect(() => { if (isEditingFlow) { const flow = flows.find(f => f.id === selectedFlowId); if (flow) { setFromNode(flow.from); setToNode(flow.to); setDistance(flow.distance); } } else { resetFlowForm(); } }, [selectedFlowId, flows]);
    const handleFlowSubmit = (e) => { e.preventDefault(); if (!fromNode || !toNode || fromNode === toNode) return; const fromName = allProductNodes.find(n => n.id === fromNode).name; const toName = allProductNodes.find(n => n.id === toNode).name; const flowData = { from: fromNode, to: toNode, name: `${fromName} -> ${toName}`, distance: parseFloat(distance) || 1 }; if (isEditingFlow) { updateConfigItem("flow", selectedFlowId, flowData); } else { addConfigItem("flow", flowData); } resetFlowForm(); };

    return (
        <div className="space-y-4">
             <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {flows.map(flow => (
                     <button key={flow.id} onClick={() => setSelectedFlowId(flow.id)} className={clsx("w-full flex justify-between items-center p-2 rounded border text-xs text-left", selectedFlowId === flow.id ? "bg-blue-50 border-blue-300" : "bg-white border-border")}>
                        <span className="truncate flex-1">{flow.name}</span>
                        <span className="ml-2 font-mono text-slate-500">{flow.distance}m</span>
                    </button>
                ))}
            </div>
            <form onSubmit={handleFlowSubmit} className="p-3 bg-slate-50 border border-border rounded-xl space-y-2">
                 <div className="flex flex-col gap-2">
                    <StyledSelect value={fromNode} onChange={(e) => setFromNode(e.target.value)}><option value="">-- Z --</option>{allProductNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</StyledSelect>
                    <div className="flex justify-center text-slate-400"><ArrowRight size={14}/></div>
                    <StyledSelect value={toNode} onChange={(e) => setToNode(e.target.value)}><option value="">-- DO --</option>{allProductNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</StyledSelect>
                 </div>
                 <StyledInput type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="Odległość (m)" />
                 <div className="flex gap-2">
                     <ActionButton type="submit" variant="primary" onClick={handleFlowSubmit} className="flex-1">{isEditingFlow ? "Zapisz" : "Dodaj"}</ActionButton>
                     {isEditingFlow && <ActionButton variant="danger" onClick={() => deleteConfigItem("flow", selectedFlowId)}><Trash2 size={14}/></ActionButton>}
                 </div>
            </form>
        </div>
    );
};

// --- GŁÓWNY KOMPONENT WIDOKU ---

export default function ModuleVisualization() { 
    const [openAccordion, setOpenAccordion] = useState('stations'); 
    
    return ( 
        <div className="flex flex-col md:flex-row h-full w-full gap-4 overflow-hidden p-1"> 
            {/* Panel Boczny (Edytor) */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col gap-3 bg-white rounded-2xl shadow-card border border-border overflow-hidden shrink-0 h-full"> 
                <div className="p-4 border-b border-border bg-slate-50/50 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Settings size={16} className="text-primary"/> Edytor Linii
                    </h3> 
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    <AccordionItem title="🏭 Stacje Robocze" id="stations" open={openAccordion} setOpen={setOpenAccordion}><ModuleStation /></AccordionItem> 
                    <AccordionItem title="📦 Bufory Magazynowe" id="buffers" open={openAccordion} setOpen={setOpenAccordion}><ModuleBuffer /></AccordionItem> 
                    <AccordionItem title="👥 Zasoby Ludzkie" id="resources" open={openAccordion} setOpen={setOpenAccordion}><ModuleResources /></AccordionItem> 
                    <AccordionItem title="➡️ Logistyka (Trasy)" id="flows" open={openAccordion} setOpen={setOpenAccordion}><ModuleFlows /></AccordionItem> 
                </div>
            </div> 
            
            {/* Obszar Główny (Canvas) */}
            <div className="flex-1 bg-white rounded-2xl shadow-card border border-border flex flex-col overflow-hidden relative"> 
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
                     <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Box size={16} className="text-blue-500"/> Podgląd 2D</h3>
                </div>
                <div className="flex-1 bg-slate-50 relative"> 
                    {/* Tło kropek jest już w MainLayout, więc tutaj dajemy transparent, ale Canvas ma swoją obsługę */}
                    <VisualizationCanvas /> 
                </div> 
                <div className="p-2 border-t border-border bg-white text-[10px] text-slate-400 flex justify-between px-4">
                    <span>LPM: Przesuwanie węzłów</span>
                    <span>LPM na tło: Przesuwanie mapy</span>
                    <span>Scroll: Zoom</span>
                </div>
            </div> 
        </div> 
    ); 
};