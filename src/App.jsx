import React from 'react';
import MainLayout from './layout/MainLayout';

function App() {
  return (
    <MainLayout>
      {/* TUTAJ BĘDZIE TWOJA GŁÓWNA KOMPONENTA SYMULATORA (Canvas)
        Na razie wstawiamy mock-up węzłów, abyś zobaczył styl.
      */}
      
      <div className="p-10 w-[2000px] h-[2000px] relative">
        {/* Przykładowy Węzeł (Node) w nowym stylu - do wdrożenia później w kodzie JS */}
        <div className="absolute top-20 left-20 w-64 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow border border-slate-100 p-4 cursor-pointer group">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wide">Stacja</span>
              <h3 className="font-bold text-slate-800 mt-1">Montaż Obudowy</h3>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Wydajność</span>
              <span className="font-semibold text-slate-700">85%</span>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[85%] rounded-full"></div>
            </div>
            
            <div className="pt-3 border-t border-slate-100 flex gap-2">
               <span className="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-200">Op: 1</span>
               <span className="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-200">Cykl: 0.25s</span>
            </div>
          </div>
        </div>

         {/* Przykładowy Bufor */}
         <div className="absolute top-20 left-[400px] w-48 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border-2 border-dashed border-slate-300 p-4 flex flex-col items-center justify-center text-center">
            <h4 className="text-sm font-semibold text-slate-600 mb-1">Bufor Startowy</h4>
            <p className="text-2xl font-bold text-slate-800">12<span className="text-xs text-slate-400 font-normal">/50</span></p>
         </div>

      </div>
    </MainLayout>
  );
}

export default App;