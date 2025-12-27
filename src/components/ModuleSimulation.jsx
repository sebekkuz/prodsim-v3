import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Upload, Play, Clock, Calendar, CheckSquare, Layers, Box, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';

// --- STYLOWE KOMPONENTY UI ---
const Card = ({ children, title, icon: Icon, className }) => (
    <div className={clsx("bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden", className)}>
        {(title || Icon) && (
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                {Icon && <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Icon size={18} /></div>}
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const InputGroup = ({ label, children }) => (
    <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
        {children}
    </div>
);

const StyledInput = (props) => (
    <input 
        {...props} 
        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-2.5 transition-all outline-none hover:border-slate-300"
    />
);

const StyledButton = ({ children, variant = 'primary', ...props }) => {
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30",
        secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200",
        success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30"
    };
    return (
        <button 
            className={clsx("px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2 justify-center", variants[variant])}
            {...props}
        >
            {children}
        </button>
    );
};

// --- SUB-KOMPONENTY LOGIKI ---

const ModuleAssemblySettings = () => {
    const { simulationSettings, setSimulationSettings, db } = useApp();
    
    // Logika bez zmian
    const allCodes = useMemo(() => {
        const codes = new Set();
        if (db.functions) Object.values(db.functions).forEach(sizeGroup => Object.keys(sizeGroup).forEach(key => codes.add(key)));
        if (db.casings) Object.values(db.casings).forEach(sizeGroup => Object.keys(sizeGroup).forEach(key => codes.add(key)));
        return Array.from(codes).sort();
    }, [db]);

    const [availableCodes, setAvailableCodes] = useState([]);
    const [sequence, setSequence] = useState([]);

    useEffect(() => {
        const currentSequence = simulationSettings.assemblySequence || [];
        setSequence(currentSequence);
        setAvailableCodes(allCodes.filter(c => !currentSequence.includes(c)));
    }, [simulationSettings.assemblySequence, allCodes]);

    const addToSequence = (code) => { setSimulationSettings(prev => ({ ...prev, assemblySequence: [...sequence, code] })); };
    const removeFromSequence = (code) => { setSimulationSettings(prev => ({ ...prev, assemblySequence: sequence.filter(c => c !== code) })); };
    const moveItem = (index, direction) => { 
        const newSeq = [...sequence]; 
        if (index + direction < 0 || index + direction >= newSeq.length) return; 
        [newSeq[index], newSeq[index + direction]] = [newSeq[index + direction], newSeq[index]]; 
        setSimulationSettings(prev => ({ ...prev, assemblySequence: newSeq })); 
    };

    return (
        <Card title="Kolejność Montażu" icon={Layers}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                         Dostępne Elementy <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">{availableCodes.length}</span>
                    </h4>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {availableCodes.map(code => (
                            <button key={code} onClick={() => addToSequence(code)} className="w-full text-left px-3 py-2 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-sm border border-slate-100 hover:border-blue-200 transition-all flex justify-between group"> 
                                <span>{code}</span>
                                <span className="opacity-0 group-hover:opacity-100 text-blue-500">+</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                        Sekwencja Wykonania
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {sequence.map((code, idx) => (
                            <div key={code} className="flex items-center justify-between bg-white p-2.5 rounded-lg shadow-sm border border-blue-100/50 group">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-md text-xs font-bold">{idx + 1}</span>
                                    <span className="font-medium text-slate-700 text-sm">{code}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveItem(idx, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-500">▲</button>
                                    <button onClick={() => moveItem(idx, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-500">▼</button>
                                    <button onClick={() => removeFromSequence(code)} className="p-1 hover:bg-red-50 rounded text-red-500 ml-1">×</button>
                                </div>
                            </div>
                        ))}
                        {sequence.length === 0 && <div className="text-center text-xs text-blue-400 py-4 italic">Lista pusta. Dodaj elementy z lewej strony.</div>}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const TimeRuleEditor = ({ type, settings, setSimulationSettings, allSizes, selectedSize, setSelectedSize, db }) => { 
    // Logika bez zmian
    const { functions } = db; 
    const functionsForSize = useMemo(() => { if (!selectedSize || !functions) return []; return Object.keys(functions[selectedSize] || {}).sort(); }, [selectedSize, functions]); 
    const handleRuleChange = (size, key, value, functionCode = null) => { 
        const settingsKey = type === 'quality' ? 'qualitySettings' : 'packingSettings'; 
        setSimulationSettings(prev => { 
            const newSettings = { ...prev[settingsKey] }; 
            if (!newSettings[size]) { newSettings[size] = { baseTime: 0, functionTimes: {} }; } 
            if (key === 'baseTime') { newSettings[size] = { ...newSettings[size], baseTime: parseFloat(value) || 0 }; } 
            else if (key === 'functionTime' && functionCode) { newSettings[size] = { ...newSettings[size], functionTimes: { ...newSettings[size].functionTimes, [functionCode]: parseFloat(value) || 0 } }; } 
            return { ...prev, [settingsKey]: newSettings }; 
        }); 
    }; 
    const getRuleValue = (size, key, functionCode = null) => { 
        const rule = settings[size]; if (!rule) return 0; 
        if (key === 'baseTime') return rule.baseTime || 0; 
        if (key === 'functionTime' && functionCode) { return rule.functionTimes?.[functionCode] || 0; } 
        return 0; 
    }; 
    
    return ( 
        <div className="space-y-4"> 
            <InputGroup label="Wybierz Rozmiar">
                <select 
                    value={selectedSize} 
                    onChange={(e) => setSelectedSize(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-2.5 outline-none"
                > 
                    <option value="">-- Wybierz z bazy --</option>
                    {allSizes.map(s => <option key={s} value={s}>{s}</option>)} 
                </select> 
            </InputGroup>

            {selectedSize && ( 
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300"> 
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                        <SettingsIcon size={14} className="text-slate-400"/>
                        <h5 className="font-semibold text-slate-700 text-sm">Konfiguracja: <span className="text-blue-600">{selectedSize}</span></h5> 
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <label className="text-xs font-medium text-slate-600">Czas Bazowy (h)</label> 
                            <StyledInput 
                                type="number" 
                                value={getRuleValue(selectedSize, 'baseTime')} 
                                onChange={(e) => handleRuleChange(selectedSize, 'baseTime', e.target.value)} 
                                min="0" step="0.01" 
                            /> 
                        </div>

                        {functionsForSize.length > 0 && ( 
                            <div className="space-y-3 pt-3 border-t border-slate-200/60"> 
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Czasy Dodatkowe (Funkcje)</label> 
                                {functionsForSize.map(funcCode => ( 
                                    <div key={funcCode} className="grid grid-cols-2 gap-4 items-center"> 
                                        <label className="text-xs text-slate-600 truncate" title={funcCode}>{funcCode}</label> 
                                        <StyledInput 
                                            type="number" 
                                            value={getRuleValue(selectedSize, 'functionTime', funcCode)} 
                                            onChange={(e) => handleRuleChange(selectedSize, 'functionTime', e.target.value, funcCode)} 
                                            min="0" step="0.01" 
                                        /> 
                                    </div> 
                                ))} 
                            </div> 
                        )} 
                    </div>
                </div> 
            )} 
        </div> 
    ); 
};

// --- GŁÓWNY KOMPONENT ---

export default function ModuleSimulation() {
    const { simulationSettings, setSimulationSettings, runSimulation, db, exportSettingsOnly, importData } = useApp();
    const { qualitySettings, packingSettings, shifts = {} } = simulationSettings;
    const [selectedQualitySize, setSelectedQualitySize] = useState("");
    const [selectedPackingSize, setSelectedPackingSize] = useState("");
    
    // Memos
    const allSizesMemo = useMemo(() => { const funcSizes = db.functions ? Object.keys(db.functions) : []; const caseSizes = db.casings ? Object.keys(db.casings) : []; return [...new Set([...funcSizes, ...caseSizes])].sort(); }, [db]);
    
    // Handlers
    const handleDateChange = (e) => { setSimulationSettings(prev => ({ ...prev, startDate: e.target.value })); };
    const handleImportSettings = (e) => { const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target.result); importData(data, 'settings'); } catch(err) { alert("Błąd pliku ustawień: " + err.message); } }; reader.readAsText(file); };

    const updateShift = (shiftId, field, value) => {
        setSimulationSettings(prev => ({
            ...prev,
            shifts: { ...(prev.shifts || {}), [shiftId]: { ...(prev.shifts?.[shiftId] || {}), [field]: value } }
        }));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header Sekcji */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">Ustawienia Symulacji</h2>
                    <p className="text-slate-500 text-sm">Zarządzaj czasem pracy, regułami i parametrami globalnymi.</p>
                 </div>
                 <div className="flex items-center gap-2">
                     <StyledButton variant="secondary" onClick={exportSettingsOnly}><Save size={16}/> Eksport</StyledButton>
                     <label className="cursor-pointer">
                        <StyledButton variant="secondary" as="span"><Upload size={16}/> Import</StyledButton>
                        <input type="file" accept=".json" className="hidden" onChange={handleImportSettings}/>
                     </label>
                 </div>
            </div>

            {/* Global Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Parametry Globalne" icon={SettingsIcon} className="md:col-span-1">
                    <InputGroup label="Data Rozpoczęcia">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <StyledInput 
                                type="text" 
                                value={simulationSettings.startDate} 
                                onChange={handleDateChange} 
                                placeholder="DD-MM-YYYY" 
                                className="pl-10" // override padding
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </InputGroup>
                    <InputGroup label="Wymagany Takt (min)">
                        <div className="relative">
                            <Clock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <StyledInput 
                                type="number" 
                                min="0" step="0.1" 
                                value={simulationSettings.targetTakt || ''} 
                                onChange={(e) => setSimulationSettings(prev => ({...prev, targetTakt: parseFloat(e.target.value) || 0}))} 
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </InputGroup>
                    
                    <div className="mt-8">
                        <StyledButton variant="success" onClick={runSimulation} className="w-full py-3 justify-center text-lg shadow-lg shadow-emerald-500/20">
                            <Play size={20} fill="currentColor"/> Uruchom Symulację
                        </StyledButton>
                    </div>
                </Card>

                <Card title="Harmonogram Pracy" icon={Calendar} className="md:col-span-2">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-slate-500 border-b border-slate-100">
                                    <th className="p-3 font-semibold uppercase">Zmiana</th>
                                    <th className="p-3 font-semibold uppercase text-center">Status</th>
                                    <th className="p-3 font-semibold uppercase text-center">Dni Robocze</th>
                                    <th className="p-3 font-semibold uppercase text-center">Godziny Pracy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[1, 2, 3, 4].map(shiftId => {
                                    const shift = shifts[shiftId] || {};
                                    return (
                                        <tr key={shiftId} className={clsx("transition-colors", shift.active ? "bg-blue-50/30" : "hover:bg-slate-50")}>
                                            <td className="p-3 font-bold text-slate-700">Zmiana {shiftId}</td>
                                            <td className="p-3 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={shift.active || false} onChange={(e) => updateShift(shiftId, 'active', e.target.checked)} className="sr-only peer"/>
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </td>
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="number" min="0" max="7" 
                                                    value={shift.days || 0} 
                                                    onChange={(e) => updateShift(shiftId, 'days', parseInt(e.target.value))} 
                                                    className="w-16 p-1.5 border border-slate-200 rounded-lg text-center bg-white disabled:bg-slate-50 disabled:text-slate-400" 
                                                    disabled={!shift.active}
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input type="time" value={shift.start || "00:00"} onChange={(e) => updateShift(shiftId, 'start', e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:text-slate-400" disabled={!shift.active}/>
                                                    <span className="text-slate-400">-</span>
                                                    <input type="time" value={shift.end || "00:00"} onChange={(e) => updateShift(shiftId, 'end', e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:text-slate-400" disabled={!shift.active}/>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <ModuleAssemblySettings />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Czasy Kontroli Jakości" icon={CheckSquare}>
                     <TimeRuleEditor type="quality" settings={qualitySettings} setSimulationSettings={setSimulationSettings} allSizes={allSizesMemo} selectedSize={selectedQualitySize} setSelectedSize={setSelectedQualitySize} db={db}/>
                </Card>
                
                <Card title="Czasy Pakowania" icon={Box}>
                     <TimeRuleEditor type="packing" settings={packingSettings} setSimulationSettings={setSimulationSettings} allSizes={allSizesMemo} selectedSize={selectedPackingSize} setSelectedSize={setSelectedPackingSize} db={db}/>
                </Card>
            </div>
        </div>
    );
};