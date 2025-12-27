import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Plus, 
  Minus, 
  FileText, 
  Save, 
  Terminal, 
  AlertCircle, 
  CheckCircle, 
  Info,
  XCircle
} from 'lucide-react';
import clsx from 'clsx'; // Zakładam, że zainstalowałeś clsx, jeśli nie - standardowe łączenie stringów też zadziała, ale clsx jest czytelniejszy

// === Wyświetlanie Logów ===
export const SimulationLogViewer = ({ log }) => {
    const logEndRef = useRef(null);
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [log]);

    return (
        <div className="rounded-xl overflow-hidden border border-border shadow-card bg-white flex flex-col h-64">
             {/* Header symulujący terminal */}
            <div className="bg-slate-50 border-b border-border px-4 py-2 flex items-center gap-2">
                <Terminal size={16} className="text-primary" />
                <h4 className="font-semibold text-xs uppercase tracking-wider text-text-body">Dziennik Zdarzeń Silnika</h4>
            </div>
            
            {/* Obszar logów */}
            <div className="flex-1 bg-[#0f172a] p-4 overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {log.length === 0 && (
                    <span className="text-slate-600 italic">Oczekiwanie na uruchomienie symulacji...</span>
                )}
                {log.map((line, index) => {
                    let colorClass = "text-slate-300";
                    let Icon = null;

                    if (line.includes("BŁĄD")) { colorClass = "text-red-400 font-medium"; Icon = XCircle; }
                    else if (line.includes("OSTRZEŻENIE")) { colorClass = "text-orange-400"; Icon = AlertCircle; }
                    else if (line.includes("SUKCES") || line.includes("ODBLOKOWANO")) { colorClass = "text-emerald-400"; Icon = CheckCircle; }
                    else if (line.includes("AWARIA")) { colorClass = "text-orange-500 font-bold bg-orange-500/10 py-0.5 px-1 rounded"; }
                    else if (line.includes("PODSUMOWANIE")) { colorClass = "text-yellow-300 font-bold border-t border-b border-yellow-300/30 py-2 my-2 block"; }
                    else if (line.startsWith('[T=')) { colorClass = "text-blue-300"; }

                    return (
                        <div key={index} className={`flex items-start gap-2 break-all ${colorClass}`}>
                            {Icon && <Icon size={12} className="mt-0.5 shrink-0" />}
                            <span>{line}</span>
                        </div>
                    );
                })}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

// === Akordeon (Rozwijana lista) ===
export const AccordionItem = ({ title, id, open, setOpen, children }) => { 
    const isOpen = open === id; 
    return ( 
        <div className="mb-2 border border-border rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-card"> 
            <button 
                onClick={() => setOpen(isOpen ? null : id)} 
                className={clsx(
                    "w-full flex justify-between items-center p-4 text-left font-medium transition-colors",
                    isOpen ? "bg-slate-50 text-primary" : "text-text-main hover:bg-slate-50"
                )}
            > 
                <span className="flex items-center gap-2">
                    {title}
                </span>
                {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />} 
            </button> 
            
            <div 
                className={clsx(
                    "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
                    isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="p-4 border-t border-border bg-white text-sm text-text-body">
                    {children}
                </div>
            </div> 
        </div> 
    ); 
};

// === Lista Dwukolumnowa (DualListBox) ===
export const DualListBox = ({ title, options, selectedItems, onSelectionChange, renderItem, height = '200px' }) => { 
    const [leftSearch, setLeftSearch] = useState(''); 
    const [rightSearch, setRightSearch] = useState(''); 
    
    const availableItems = options
        .filter(opt => !selectedItems.some(sel => sel.id === opt.id))
        .filter(opt => !leftSearch || (renderItem(opt).toLowerCase().includes(leftSearch.toLowerCase()))); 
    
    const assignedItems = selectedItems
        .filter(opt => !rightSearch || (renderItem(opt).toLowerCase().includes(rightSearch.toLowerCase()))); 
    
    // Wspólny komponent dla listy
    const ListContainer = ({ items, searchValue, setSearchValue, onItemClick, type, placeholder }) => (
        <div className="flex-1 flex flex-col gap-2">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={placeholder} 
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    value={searchValue} 
                    onChange={e => setSearchValue(e.target.value)}
                />
            </div>
            <div 
                className="flex-1 border border-border bg-slate-50/50 rounded-lg overflow-y-auto p-1 custom-scrollbar" 
                style={{ height: height }}
            > 
                {items.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-text-muted italic">Brak elementów</div>
                ) : (
                    items.map(item => ( 
                        <div 
                            key={item.id} 
                            onClick={() => onItemClick(item)} 
                            className={clsx(
                                "cursor-pointer p-2 mb-1 rounded-md text-xs flex items-center justify-between group transition-all",
                                type === 'available' 
                                    ? "hover:bg-blue-50 text-slate-600 hover:text-blue-700 hover:border-blue-100 border border-transparent" 
                                    : "bg-white border border-border hover:border-red-200 hover:bg-red-50 hover:text-red-700 shadow-sm"
                            )}
                        > 
                            <span className="truncate flex-1 font-medium">{renderItem(item)}</span>
                            {type === 'available' ? (
                                <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <Minus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div> 
                    ))
                )}
            </div> 
        </div>
    );

    return ( 
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm"> 
            <p className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                {title}
                <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                    Wybrano: {selectedItems.length}
                </span>
            </p> 
            <div className="flex gap-4 h-full"> 
                <ListContainer 
                    items={availableItems} 
                    searchValue={leftSearch} 
                    setSearchValue={setLeftSearch}
                    onItemClick={(item) => onSelectionChange([...selectedItems, item])}
                    type="available"
                    placeholder="Dostępne..."
                />
                
                {/* Separator / Strzałka wizualna (opcjonalnie) */}
                <div className="hidden md:flex flex-col justify-center items-center text-border">
                    <div className="h-full w-px bg-border/50"></div>
                </div>

                <ListContainer 
                    items={assignedItems} 
                    searchValue={rightSearch} 
                    setSearchValue={setRightSearch}
                    onItemClick={(item) => onSelectionChange(selectedItems.filter(i => i.id !== item.id))}
                    type="assigned"
                    placeholder="Przypisane..."
                />
            </div> 
        </div> 
    ); 
};

// === Input Pliku ===
export const FileInput = ({ label, type, onFileSelected, accept = ".csv" }) => ( 
    <div className="bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
        <label className="flex items-center gap-2 text-sm font-semibold text-text-main mb-3">
            <FileText size={16} className="text-primary" />
            {label}
        </label>
        <div className="relative group">
            <input 
                type="file" 
                accept={accept} 
                onChange={(e) => onFileSelected(e.target.files[0], type)} 
                className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-xs file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer
                file:cursor-pointer
                file:transition-colors"
            />
        </div>
        <p className="mt-2 text-[10px] text-text-muted">Obsługiwane formaty: {accept}</p>
    </div> 
);

// === Karta Statystyk ===
export const StatCard = ({ title, stats, onExport }) => ( 
    <div className="bg-white p-5 rounded-2xl shadow-card border border-border flex flex-col h-full hover:shadow-card-hover transition-shadow duration-300">
        <div className="flex justify-between items-start mb-4">
            <h4 className="text-sm font-bold text-text-muted uppercase tracking-wide">{title}</h4>
            {onExport && (
                <button 
                    onClick={onExport} 
                    className="flex items-center gap-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-border transition-all active:scale-95"
                    title="Eksportuj dane"
                >
                    <Save size={14} />
                    <span>Zapisz</span>
                </button>
            )}
        </div>
        
        <div className="mt-auto space-y-3">
             {/* Główny licznik */}
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-text-main">{stats.count}</span>
                <span className="text-xs text-text-muted">rekordów</span>
            </div>

            {/* Dodatkowe info (Rozmiary) */}
            {stats.sizes !== undefined && (
                 <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-primary" />
                        <span className="text-xs text-text-body font-medium">Rozmiary:</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{stats.sizes}</p>
                </div>
            )}
        </div>
    </div> 
);