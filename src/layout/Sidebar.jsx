import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Play, 
  ChevronLeft, 
  ChevronRight,
  Database,
  FileBarChart,
  Route,
  Share2 // Zamiennik dla network (opcjonalny, używany jako ikona sieci)
} from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { activeModule, setActiveModule, runSimulation } = useApp();

  const menuItems = [
    { id: 'canvas', icon: LayoutDashboard, label: 'Wizualizacja' },
    { id: 'import', icon: Database, label: 'Dane / Import' },
    { id: 'simulation', icon: Settings, label: 'Konfiguracja' },
    { id: 'routing', icon: Route, label: 'Marszruty' },
    { id: 'wyniki', icon: FileBarChart, label: 'Wyniki i Raporty' },
  ];

  return (
    <aside 
      className={clsx(
        "h-screen bg-white border-r border-border transition-all duration-300 flex flex-col z-20 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center border-b border-border bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            DT
          </div>
          {!isCollapsed && <span>Prod<span className="text-blue-600">Sim</span><span className="text-slate-400 font-light text-sm ml-1">v3</span></span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
              activeModule === item.id 
                ? "bg-blue-50/80 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon 
                size={22} 
                strokeWidth={1.5} 
                className={clsx("transition-colors", activeModule === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}
            />
            
            {!isCollapsed && (
                <span className="font-medium tracking-wide text-sm">{item.label}</span>
            )}

             {/* Wskaźnik aktywności */}
             {activeModule === item.id && !isCollapsed && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
             )}
            
            {/* Tooltip dla zwiniętego menu */}
            {isCollapsed && (
              <div className="absolute left-16 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Simulation Controls */}
      <div className="p-4 border-t border-border bg-slate-50/50">
        {!isCollapsed && <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest pl-1">Silnik Symulacji</p>}
        <div className={clsx("flex gap-2", isCollapsed ? "flex-col items-center" : "flex-row")}>
           <button 
                onClick={runSimulation}
                className={clsx(
                    "flex-1 p-2.5 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95",
                    "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                )} 
                title="Uruchom Symulację"
            >
             <Play size={20} fill="currentColor" />
             {!isCollapsed && <span className="ml-2 font-semibold text-sm">Start</span>}
           </button>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 bg-white border border-border p-1.5 rounded-full shadow-md text-slate-400 hover:text-blue-600 transition-colors z-30"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

export default Sidebar;