import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export const VisualizationCanvas = () => {
    const canvasRef = useRef(null);
    const { simulationConfig, updateConfigItem } = useApp();
    const { stations, buffers, flows, workerPools, workerFlows } = simulationConfig;
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [draggingNode, setDraggingNode] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    
    // Zwiększamy nieco węzły, aby pasowały do stylu "Card"
    const nodeWidth = 140;
    const nodeHeight = 80;

    const getIcon = (type, isBuffer = false) => {
        if (isBuffer) return "📥";
        switch (type) {
            case "podmontaz": return "🔧";
            case "montaz": return "🛠️";
            case "pakowanie": return "📦";
            case "jakosci": return "🔍";
            default: return "🏭";
        }
    };

    const allNodes = useMemo(() => {
        return [
            ...stations.map(s => ({ ...s, type: 'station', icon: getIcon(s.type) })),
            ...buffers.map(b => ({ ...b, type: 'buffer', icon: getIcon(null, true) })),
            ...workerPools.map(wp => ({ ...wp, type: 'workerPool', icon: "👷" }))
        ];
    }, [stations, buffers, workerPools]);

    const drawCanvas = (ctx, canvas) => {
        const width = canvas.width;
        const height = canvas.height;
        
        // Tło Canvasu - przezroczyste, bo mamy tło w kropki w MainLayout
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(viewOffset.x, viewOffset.y);
        ctx.scale(zoom, zoom);
        
        // Rysowanie Gridu (siatki) - delikatniejszy
        ctx.beginPath();
        ctx.strokeStyle = "rgba(203, 213, 225, 0.4)"; // slate-300 z alpha
        ctx.lineWidth = 1;
        const gridSize = 50;
        const startX = Math.floor(-viewOffset.x / zoom / gridSize) * gridSize;
        const startY = Math.floor(-viewOffset.y / zoom / gridSize) * gridSize;
        const endX = startX + (width / zoom) + gridSize;
        const endY = startY + (height / zoom) + gridSize;
        
        // Opcjonalnie: kropki zamiast linii dla lżejszego wyglądu
        for (let x = startX; x < endX; x += gridSize) { ctx.moveTo(x, -10000); ctx.lineTo(x, 10000); }
        for (let y = startY; y < endY; y += gridSize) { ctx.moveTo(-10000, y); ctx.lineTo(10000, y); }
        ctx.stroke();

        const nodePositions = new Map();
        allNodes.forEach(n => nodePositions.set(n.id, n));

        const drawOrthogonalArrow = (fromX, fromY, toX, toY, color, dash, label) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash(dash || []);
            const midX = fromX + (toX - fromX) / 2;
            
            // Rysowanie linii łamanej
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(midX, fromY);
            ctx.lineTo(midX, toY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
            
            // Grot strzałki
            const headlen = 8;
            ctx.beginPath();
            ctx.moveTo(toX, toY);
            if (fromX < toX) { ctx.lineTo(toX - headlen, toY - headlen/2); ctx.lineTo(toX - headlen, toY + headlen/2); } else { ctx.lineTo(toX + headlen, toY - headlen/2); ctx.lineTo(toX + headlen, toY + headlen/2); }
            ctx.fill();
            
            // Etykieta na linii
            if (label) {
                const labelX = midX;
                const labelY = fromY + (toY - fromY) / 2;
                ctx.font = "10px Inter, sans-serif";
                const textWidth = ctx.measureText(label).width + 8;
                const textHeight = 16;
                
                // Tło etykiety (Pill shape)
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.roundRect(labelX - textWidth/2, labelY - textHeight/2, textWidth, textHeight, 4);
                ctx.fill();
                ctx.strokeStyle = "#e2e8f0";
                ctx.stroke();
                
                ctx.fillStyle = "#64748b"; // slate-500
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, labelX, labelY);
            }
        };

        // Rysowanie przepływów (Flows)
        flows.forEach(flow => {
            const fromNode = nodePositions.get(flow.from); const toNode = nodePositions.get(flow.to); if (!fromNode || !toNode) return;
            const startX = fromNode.x + nodeWidth; const startY = fromNode.y + nodeHeight / 2; const endX = toNode.x; const endY = toNode.y + nodeHeight / 2;
            drawOrthogonalArrow(startX, startY, endX, endY, "#94a3b8", [], `${flow.distance}m`); // slate-400
        });

        // Rysowanie ścieżek pracowników
        workerFlows.forEach(flow => {
            const fromNode = nodePositions.get(flow.from); const toNode = nodePositions.get(flow.to); if (!fromNode || !toNode) return;
            const startX = fromNode.x + nodeWidth / 2; const startY = fromNode.y + nodeHeight; const endX = toNode.x + nodeWidth / 2; const endY = toNode.y;
            ctx.beginPath(); ctx.strokeStyle = "#f59e0b"; ctx.setLineDash([5, 5]); // amber-500
            const midY = startY + (endY - startY) / 2; ctx.moveTo(startX, startY); ctx.lineTo(startX, midY); ctx.lineTo(endX, midY); ctx.lineTo(endX, endY); ctx.stroke();
            // Mała etykieta
            ctx.fillStyle = "#fffbeb"; // amber-50
            ctx.fillRect(endX + 5, midY - 7, 30, 14); 
            ctx.fillStyle = "#d97706"; ctx.font = "9px Inter, sans-serif"; ctx.fillText(`${flow.distance}m`, endX + 20, midY);
        });

        // Funkcja pomocnicza do zawijania tekstu
        const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
            const words = text.split(' '); let line = ''; let lineArray = [];
            for(let n = 0; n < words.length; n++) { 
                const testLine = line + words[n] + ' '; 
                const metrics = ctx.measureText(testLine); 
                const testWidth = metrics.width; 
                if (testWidth > maxWidth && n > 0) { lineArray.push(line); line = words[n] + ' '; } else { line = testLine; } 
            }
            lineArray.push(line);
            const totalHeight = lineArray.length * lineHeight; let startY = y - (totalHeight / 2) + (lineHeight / 1.5); 
            lineArray.forEach((l, i) => { ctx.fillText(l, x, startY + (i * lineHeight)); });
        };

        // Rysowanie Węzłów (Nodes)
        ctx.setLineDash([]);
        allNodes.forEach(node => {
            // Shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 4;

            // Ustalenie kolorów stylu Digital Twin
            let strokeStyle = "#e2e8f0"; // slate-200 default
            let headerColor = "#f8fafc"; // slate-50
            let badgeColor = "#e2e8f0";

            if (node.type === 'station') { strokeStyle = "#3b82f6"; headerColor = "#eff6ff"; badgeColor = "#dbeafe"; } // blue-500/50
            else if (node.type === 'buffer') { strokeStyle = "#cbd5e1"; headerColor = "#f8fafc"; badgeColor = "#f1f5f9"; }
            else if (node.type === 'workerPool') { strokeStyle = "#f59e0b"; headerColor = "#fffbeb"; badgeColor = "#fef3c7"; }

            // Główny prostokąt (Karta)
            ctx.fillStyle = "white";
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(node.x, node.y, nodeWidth, nodeHeight, 12); // Rounded corners 12px
                ctx.fill();
                ctx.shadowColor = "transparent"; // Reset shadow for stroke
                ctx.lineWidth = 2;
                ctx.strokeStyle = strokeStyle;
                ctx.stroke();
            } else {
                ctx.fillRect(node.x, node.y, nodeWidth, nodeHeight);
                ctx.strokeRect(node.x, node.y, nodeWidth, nodeHeight);
            }

            // Header pasek (opcjonalny, np. dla Stacji)
            /* ctx.fillStyle = headerColor;
            ctx.beginPath();
            ctx.roundRect(node.x + 2, node.y + 2, nodeWidth - 4, 24, {upperLeft: 10, upperRight: 10});
            ctx.fill();
            */

            // Ikona
            ctx.font = "20px Arial"; 
            ctx.fillStyle = "black"; 
            ctx.textAlign = "left"; 
            ctx.fillText(node.icon, node.x + 12, node.y + 30);
            
            // Typ (Badge w prawym górnym rogu)
            ctx.font = "bold 9px Inter, sans-serif"; 
            ctx.fillStyle = strokeStyle; 
            ctx.textAlign = "right";
            const typeLabel = node.type === 'station' ? node.type.toUpperCase() : (node.type === 'workerPool' ? "ZASÓB" : "BUFOR");
            ctx.fillText(typeLabel, node.x + nodeWidth - 12, node.y + 20);

            // Nazwa
            ctx.fillStyle = "#1e293b"; // slate-800
            ctx.font = "bold 11px Inter, sans-serif"; 
            ctx.textAlign = "center";
            wrapText(ctx, node.name, node.x + nodeWidth / 2, node.y + nodeHeight / 2 + 5, nodeWidth - 20, 14);

            // Capacity (Stopka)
            ctx.font = "10px Inter, sans-serif"; 
            ctx.fillStyle = "#64748b"; // slate-500
            const capText = `Cap: ${node.capacity}`; 
            ctx.fillText(capText, node.x + nodeWidth / 2, node.y + nodeHeight - 10);
        });
        ctx.restore();
    };

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth; canvas.height = parent.clientHeight;
        drawCanvas(ctx, canvas);
    }, [allNodes, flows, workerFlows, viewOffset, zoom]);

    // Obsługa myszy (bez zmian w logice, tylko podpięcie)
    const getMousePos = (e) => { const rect = canvasRef.current.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (clientX - rect.left), y: (clientY - rect.top) }; };
    const getWorldPos = (screenPos) => { return { x: (screenPos.x - viewOffset.x) / zoom, y: (screenPos.y - viewOffset.y) / zoom }; };
    const isHittingNode = (worldPos, node) => { return worldPos.x > node.x && worldPos.x < node.x + nodeWidth && worldPos.y > node.y && worldPos.y < node.y + nodeHeight; };
    const handleMouseDown = (e) => { e.preventDefault(); const screenPos = getMousePos(e); const worldPos = getWorldPos(screenPos); const hitNode = [...allNodes].reverse().find(node => isHittingNode(worldPos, node)); if (hitNode) { setDraggingNode(hitNode); setDragOffset({ x: worldPos.x - hitNode.x, y: worldPos.y - hitNode.y }); } else { setIsPanning(true); } setLastMousePos(screenPos); };
    const handleMouseMove = (e) => { e.preventDefault(); const screenPos = getMousePos(e); if (draggingNode) { const worldPos = getWorldPos(screenPos); const newX = worldPos.x - dragOffset.x; const newY = worldPos.y - dragOffset.y; updateConfigItem(draggingNode.type, draggingNode.id, { x: newX, y: newY }); } else if (isPanning) { const dx = screenPos.x - lastMousePos.x; const dy = screenPos.y - lastMousePos.y; setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy })); } setLastMousePos(screenPos); };
    const handleMouseUp = (e) => { e.preventDefault(); setDraggingNode(null); setIsPanning(false); };
    const handleWheel = (e) => { e.preventDefault(); const scaleAmount = -e.deltaY * 0.001; const newZoom = Math.min(Math.max(0.5, zoom + scaleAmount), 3); setZoom(newZoom); };
    
    return ( <canvas id="visualization-canvas" ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} className="cursor-grab active:cursor-grabbing"></canvas> );
};

// Aby zachować kompatybilność, jeśli gdzieś jest importowane jako default
export default VisualizationCanvas;