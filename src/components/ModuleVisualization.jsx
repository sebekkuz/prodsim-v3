import React from 'react';
// Importujemy nowy komponent edytora (upewnij się, że plik LineEditor.jsx istnieje w folderze components)
import LineEditor from './LineEditor';
// Importujemy istniejący komponent wizualizacji (Canvas)
// Jeśli Twój VisualizationCanvas był exportowany jako 'default', usuń nawiasy klamrowe { }
import { VisualizationCanvas } from './VisualizationCanvas';

const ModuleVisualization = () => {
  return (
    // Główny kontener - dzieli ekran w poziomie (flex-row)
    <div className="flex flex-row h-full w-full overflow-hidden bg-slate-100">
      
      {/* --- LEWY PANEL: EDYTOR LINII --- */}
      {/* 'w-[550px]' ustawia stałą szerokość panelu edycji. Możesz to zmienić np. na w-[450px] lub w-1/3 */}
      {/* 'shrink-0' zapobiega zwężaniu się panelu, gdy okno przeglądarki jest małe */}
      <div className="w-[550px] shrink-0 h-full border-r border-slate-200 bg-white shadow-xl z-20 flex flex-col">
         
         {/* Wrapper dla LineEditora - zapewnia, że wypełnia on 100% wysokości panelu */}
         <div className="h-full w-full overflow-hidden">
            <LineEditor />
         </div>
      </div>

      {/* --- PRAWY PANEL: MAPA / PODGLĄD 2D --- */}
      {/* 'flex-1' sprawia, że ten obszar zajmuje całą pozostałą dostępną przestrzeń */}
      <div className="flex-1 h-full relative z-10 overflow-hidden bg-slate-50">
        {/* Tu renderuje się Twoja mapa linii produkcyjnej */}
        <VisualizationCanvas />
      </div>

    </div>
  );
};

export default ModuleVisualization;