import React from 'react';
import MainLayout from './layout/MainLayout';
import { AppProvider, useApp } from './context/AppContext'; // Importujemy Provider

// Importy modułów
import ModuleImport from './components/ModuleImport';
import ModuleSimulation from './components/ModuleSimulation';
import ModuleVisualization from './components/ModuleVisualization';
import ModuleResults from './components/ModuleResults';
import ModuleRouting from './components/ModuleRouting';

// 1. Komponent "Wewnętrzny" - on ma dostęp do useApp(), bo jest w środku Providera
const AppContent = () => {
  const { activeModule } = useApp();

  const renderContent = () => {
    switch (activeModule) {
      case 'import':
        return <ModuleImport />;
      case 'simulation': // Konfiguracja Globalna
        return <ModuleSimulation />;
      case 'canvas': // Wizualizacja i Edycja Linii
        return <ModuleVisualization />;
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
      <div className="p-6 h-full w-full overflow-hidden flex flex-col">
        {renderContent()}
      </div>
    </MainLayout>
  );
};

// 2. Główny Komponent - on "otula" wszystko w AppProvider
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;