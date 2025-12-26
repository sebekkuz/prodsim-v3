import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { SimulationLogViewer } from './components/SharedComponents';

// Import Modułów
import ModuleImport from './components/ModuleImport';
import ModuleRouting from './components/ModuleRouting';
import ModuleVisualization from './components/ModuleVisualization';
import ModuleValidator from './components/ModuleValidator';
import ModuleSimulation from './components/ModuleSimulation';
import ModuleResults from './components/ModuleResults';
import { RealTimeViewer } from './components/RealTimeViewer';
import { GanttViewer } from './components/GanttViewer';

// Ikony Lucide
import { 
  FolderInput, Map, Factory, FileSearch, Settings, 
  BarChart3, Activity, CalendarDays, Menu, Bell, User, Search, ChevronRight 
} from 'lucide-react';

const AppContent = () => {
    const { activeModule, setActiveModule, simulationLog, simulationConfig, simulationResults } = useApp();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    const modules = [ 
        { id: 'import', name: 'Import/Eksport', icon: <FolderInput size={20} /> }, 
        { id: 'marszruty', name: 'Marszruty', icon: <Map size={20} /> }, 
        { id: 'wizualizacja', name: 'Konfiguracja Linii', icon: <Factory size={20} /> }, 
        { id: 'validator', name: 'Audyt Gemini', icon: <FileSearch size={20} /> }, 
        { id: 'symulacja', name: 'Ustawienia Symulacji', icon: <Settings size={20} /> }, 
        { id: 'wyniki', name: 'Wyniki i KPI', icon: <BarChart3 size={20} /> }, 
        { id: 'realtime', name: 'Real-time Flow', icon: <Activity size={20} /> }, 
        { id: 'gantt', name: 'Harmonogram', icon: <CalendarDays size={20} /> },
    ];
    
    const renderModule = () => {
        const ModuleWrapper = ({ children }) => (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6 h-full overflow-auto">
                {children}
            </div>
        );

        switch (activeModule) {
            case 'import': return <ModuleWrapper><ModuleImport /></ModuleWrapper>;
            case 'marszruty': return <ModuleWrapper><ModuleRouting /></ModuleWrapper>;
            case 'wizualizacja': return <ModuleVisualization />; // Canvas ma własny kontener
            case 'validator': return <ModuleWrapper><ModuleValidator /></ModuleWrapper>; 
            case 'symulacja': return <ModuleWrapper><ModuleSimulation /></ModuleWrapper>;
            case 'wyniki': return <ModuleWrapper><ModuleResults /></ModuleWrapper>;
            case 'realtime': return <RealTimeViewer config={simulationConfig} simulationData={simulationResults} />;
            case 'gantt': return <GanttViewer config={simulationConfig} simulationData={simulationResults} />;
            default: return <div className="flex items-center justify-center h-full text-slate-400">Wybierz moduł z menu</div>;
        }
    };

    const activeModuleName = modules.find(m => m.id === activeModule)?.name;
    
    return (
        <div className="flex h-screen bg-slate-50 text-slate-600 font-sans overflow-hidden">
            {/* LEWY SIDEBAR */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30 shadow-lg`}>
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
                    {sidebarOpen && <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ProdSim v3</h1>}
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <Menu size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {modules.map(mod => ( 
                        <button 
                            key={mod.id} 
                            onClick={() => setActiveModule(mod.id)} 
                            className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 group
                                ${activeModule === mod.id 
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        > 
                            <span className={`${activeModule === mod.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {mod.icon}
                            </span> 
                            {sidebarOpen && <span className="ml-3 text-sm font-medium whitespace-nowrap">{mod.name}</span>}
                            {activeModule === mod.id && sidebarOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </button> 
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            JS
                        </div>
                        {sidebarOpen && (
                            <div className="ml-3">
                                <p className="text-sm font-medium text-slate-900">Jan Szczepanik</p>
                                <p className="text-xs text-slate-400">Inżynier Procesu</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* GŁÓWNA ZAWARTOŚĆ */}
            <div className="flex-1 flex flex-col min-w-0 bg-dot-pattern">
                {/* TOP HEADER */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
                    <div className="flex items-center text-sm text-slate-500">
                        <span>Symulacja</span>
                        <ChevronRight size={14} className="mx-2" />
                        <span className="font-medium text-slate-900">{activeModuleName}</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-1.5">
                            <Search size={16} className="text-slate-400 mr-2" />
                            <input type="text" placeholder="Szukaj..." className="bg-transparent border-none focus:ring-0 text-sm w-48 text-slate-700 placeholder:text-slate-400" />
                        </div>
                        <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* OBSZAR ROBOCZY */}
                <main className="flex-1 overflow-hidden relative p-4 md:p-6 flex flex-col">
                    {renderModule()}
                </main>
                
                {/* FOOTER / TIMELINE */}
                {(activeModule !== 'realtime' && activeModule !== 'gantt') && (
                    <div className="h-48 bg-white border-t border-slate-200 shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="h-full overflow-hidden flex flex-col">
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logi Systemowe</span>
                            </div>
                            <div className="flex-1 overflow-auto p-0">
                                <SimulationLogViewer log={simulationLog} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}