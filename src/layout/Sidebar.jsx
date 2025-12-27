import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // To są przykładowe elementy menu - w przyszłości podepniemy tu Twoje funkcje
  const menuItems = [
    { icon: LayoutDashboard, label: 'Symulacja', active: true },
    { icon: Database, label: 'Dane Scenariusza', active: false },
    { icon: Users, label: 'Zasoby', active: false },
    { icon: Settings, label: 'Ustawienia', active: false },
  ];

  return (
    <aside 
      className={clsx(
        "h-screen bg-white border-r border-border transition-all duration-300 flex flex-col z-20 relative",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center border-b border-border">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
            DT
          </div>
          {!isCollapsed && <span className="text-slate-800">ProdSim<span className="text-indigo-500">V3</span></span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
              item.active 
                ? "bg-blue-50 text-blue-600" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon size={22} strokeWidth={1.5} />
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
            
            {/* Tooltip dla zwiniętego menu */}
            {isCollapsed && (
              <div className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Simulation Controls Preview (Miejsce na Twoje przyciski sterowania) */}
      <div className="p-4 border-t border-border bg-slate-50/50">
        {!isCollapsed && <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Sterowanie</p>}
        <div className={clsx("flex gap-2", isCollapsed ? "flex-col items-center" : "flex-row justify-center")}>
           <button className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title="Start">
             <Play size={20} fill="currentColor" />
           </button>
           <button className="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors" title="Pauza">
             <Pause size={20} fill="currentColor" />
           </button>
           <button className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors" title="Reset">
             <RotateCcw size={20} />
           </button>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-border p-1 rounded-full shadow-md text-slate-400 hover:text-primary transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

export default Sidebar;