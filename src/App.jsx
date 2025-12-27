import React from 'react';
import MainLayout from './layout/MainLayout';
import { AppProvider, useApp } from './context/AppContext';

// Importy modułów
import ModuleImport from './components/ModuleImport';
import ModuleSimulation from './components/ModuleSimulation';
import ModuleVisualization from './components/ModuleVisualization'; // (W środku jest Twój nowy LineEditor)
import ModuleResults from './components/ModuleResults';
import ModuleRouting from './components/ModuleRouting';

// 1. IMPORTUJEMY ODTWARZACZ (Zwróć uwagę na nawiasy klamrowe, bo export jest nazwany)
import { RealTimeViewer } from './components/RealTimeViewer'; 

const AppContent = () => {
  // 2. POBIERAMY DANE Z CONTEXTU
  // activeModule - do nawigacji
  // db - to jest Twoja konfiguracja (stacje, bufory itp.)
  // simulationResults - to są wyniki z workera (eventy do odtworzenia)
  const { activeModule, db, simulationResults } = useApp();

  const renderContent = () => {
    switch (activeModule) {
      case 'import':
        return <ModuleImport />;
      case 'simulation':
        return <ModuleSimulation />;
      case 'canvas': 
        return <ModuleVisualization />;
      
      // 3. DODAJEMY OBSŁUGĘ NOWEGO WIDOKU
      case 'realtime':
        return (
            <RealTimeViewer 
                config={db}                // Przekazujemy strukturę fabryki
                simulationData={simulationResults} // Przekazujemy wyniki symulacji
            />
        );

      case 'wyniki':
        return <ModuleResults />;
      case 'routing':
        return <ModuleRouting />;
      default:
        return <ModuleVisualization />;
    }
  };

  return (
    <MainLayout>
      {/* RealTimeViewer ma własny layout (pełnoekranowy bg-gray-900), 
          więc usuwamy padding 'p-6' dla tego konkretnego przypadku, 
          aby wyglądał jak dashboard kinowy */}
      <div className={`h-full w-full overflow-hidden flex flex-col ${activeModule === 'realtime' ? 'p-0' : 'p-6'}`}>
        {renderContent()}
      </div>
    </MainLayout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;