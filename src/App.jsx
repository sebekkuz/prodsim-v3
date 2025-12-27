import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';

// Importy Modułów (Teraz pliki istnieją, więc błąd zniknie)
import ModuleImport from './components/ModuleImport';
import ModuleRouting from './components/ModuleRouting';
import ModuleSimulation from './components/ModuleSimulation';
import ModuleResults from './components/ModuleResults';
import ModuleValidator from './components/ModuleValidator';

// Import ikon
import { 
  LayoutDashboard, 
  Settings, 
  FileInput, 
  Network, 
  Activity, 
  BarChart3, 
  CheckCircle, 
  Menu, 
  ChevronLeft,
  Search,
  User,
  Box
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('import');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'import', label: 'Konfiguracja', icon: FileInput },
    { id: 'routing', label: 'Marszruty', icon: Network },
    { id: 'simulation', label: 'Symulacja', icon: Activity },
    { id: 'results', label: 'Wyniki', icon: BarChart3 },
    { id: 'validator', label: 'Walidator', icon: CheckCircle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'import':
        return <ModuleImport />;
      case 'routing':
        return <ModuleRouting />;
      case 'simulation':
        return <ModuleSimulation />;
      case 'results':
        return <ModuleResults />;
      case 'validator':
        return <ModuleValidator />;
      default:
        return <ModuleImport />;
    }
  };

  return (
    <AppProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-600 font-sans">
        
        {/* LEWY SIDEBAR */}
        <aside 
          className={`
            flex-shrink-0 bg-white border-r border-slate-200 z-20 transition-all duration-300 flex flex-col
            ${sidebarOpen ? 'w-64' : 'w-20'}
          `}
        >
          <div className="h-16 flex items-center justify-center border-b border-slate-100">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Box size={24} />
              </div>
              {sidebarOpen && (
                <span className="font-bold text-xl tracking-tight text-slate-800">
                  ProdSim<span className="text-blue-600">V3</span>
                </span>
              )}
            </div>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={!sidebarOpen ? item.label : ''}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${activeTab === item.id 
                    ? 'bg-blue-50 text-blue-700 shadow-sm font-medium' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                `}
              >
                <item.icon 
                  size={20} 
                  className={activeTab === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} 
                />
                
                {sidebarOpen && <span>{item.label}</span>}
                
                {activeTab === item.id && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            >
              {sidebarOpen ? (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ChevronLeft size={18} />
                  <span>Zwiń panel</span>
                </div>
              ) : (
                <Menu size={20} />
              )}
            </button>
          </div>
        </aside>

        {/* GŁÓWNY OBSZAR ROBOCZY */}
        <main className="flex-1 flex flex-col relative min-w-0">
          
          <header className="h-16 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="text-slate-400">Aplikacja</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                {navItems.find(i => i.id === activeTab)?.label}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block group">
                 <input 
                   type="text" 
                   placeholder="Szukaj w projekcie..." 
                   className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 w-48 transition-all focus:w-64 focus:bg-white border-transparent focus:border-slate-200" 
                 />
                 <div className="absolute left-2.5 top-1.5 text-slate-400">
                   <Search size={16} />
                 </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 transition-transform">
                <User size={16} />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-slate-50 bg-dot-pattern relative">
            <div className="p-6 max-w-[1920px] mx-auto min-h-full">
              {renderContent()}
            </div>
          </div>

        </main>
      </div>
    </AppProvider>
  );
}

export default App;