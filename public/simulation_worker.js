// simulation_worker.js
'use strict';

/**
 * PRODSIM v3 - SIMULATION ENGINE WORKER
 * ======================================
 * ETAP 1.3: INTEGRITY CHECK
 * - Zabezpieczenie przed uruchomieniem symulacji na niespójnych danych.
 */

try {
    importScripts('priority_queue.js');
} catch (e) {
    console.error("Worker: Nie udało się załadować 'priority_queue.js'", e);
    self.postMessage({ type: 'FATAL_ERROR', payload: ["Nie można załadować 'priority_queue.js'. Sprawdź pliki publiczne."] });
}

// === MODELE DANYCH ===

class Part {
    constructor(id, orderId, partType, partCode, size, routing, childrenBOM, creationTime, dueDate = null) {
        this.id = `part_${id}`;
        this.orderId = orderId;
        this.type = partType;
        this.code = partCode;
        this.size = size;
        this.routing = routing || [];
        this.routingStep = 0;
        this.childrenBOM = childrenBOM || [];
        this.attachedChildren = [];
        this.state = 'CREATED';
        this.currentLocation = null;
        this.creationTime = creationTime;
        this.finishTime = null;
        this.lastStateChangeTime = creationTime;
        this.dueDate = dueDate;
        this.materialCost = partType === 'PARENT' ? 100 : 20;
        this.stats = { processingTime: 0, transportTime: 0, waitTime: 0, blockedTime: 0 };
    }

    updateState(newState, currentTime) {
        const duration = Math.max(0, currentTime - this.lastStateChangeTime);
        switch (this.state) {
            case 'PROCESSING': this.stats.processingTime += duration; break;
            case 'IN_TRANSPORT':
            case 'WAITING_FOR_WORKER_TRAVEL': this.stats.transportTime += duration; break;
            case 'IDLE_IN_BUFFER':
            case 'IDLE_AT_STATION':
            case 'WAITING_FOR_WORKER':
            case 'WAITING_FOR_TOOL': this.stats.waitTime += duration; break;
            case 'BLOCKED': this.stats.blockedTime += duration; break;
        }
        this.state = newState;
        this.lastStateChangeTime = currentTime;
        if (newState === 'FINISHED' || newState === 'SCRAPPED') {
            this.finishTime = currentTime;
        }
    }

    getNextOperation() {
        if (this.routingStep < this.routing.length) return this.routing[this.routingStep];
        return null;
    }
}

class ResourcePool {
    constructor(name, capacity, speed, engine, costPerHour) {
        this.name = name;
        this.capacity = capacity;
        this.speed = speed || 1.0;
        this.costPerHour = costPerHour || 0;
        this.available = capacity;
        this.waitQueue = [];
        this.engine = engine;
        this.totalBusyTimeSeconds = 0;
        // Idle Time dodamy w Etapie 2
    }

    request(entity, count) {
        if (count > this.capacity) return false;
        if (this.available >= count) {
            this.available -= count;
            return true;
        } else {
            const exists = this.waitQueue.some(item => item.entity.id === entity.id);
            if (!exists) this.waitQueue.push({ entity, count });
            return false;
        }
    }

    release(entityReleasing, count, busyTimeDuration = 0) {
        this.available += count;
        if (this.available > this.capacity) this.available = this.capacity;
        this.totalBusyTimeSeconds += (busyTimeDuration * 3600 * count);
        if (this.waitQueue.length > 0) {
            const nextInQueue = this.waitQueue[0];
            if (this.available >= nextInQueue.count) {
                this.available -= nextInQueue.count;
                const unblocked = this.waitQueue.shift();
                return unblocked.entity;
            }
        }
        return null;
    }
}

// === SILNIK ===

class SimulationEngine {
    constructor() { this.reset(); }

    reset() {
        this.log = [];
        this.eventQueue = typeof PriorityQueue !== 'undefined' ? new PriorityQueue() : { push:()=>{}, pop:()=>{}, isEmpty:()=>true };
        this.simulationTime = 0;
        this.config = {};
        this.db = {};
        this.mrp = [];
        this.settings = {};
        this.workerPools = {};
        this.toolPools = {};
        this.parts = {};
        this.partCounter = 0;
        this.bufferStates = {};
        this.stationStates = {};
        this.replayEvents = [];
        this.orderMap = {};
        this.stats = { partsProcessed: 0, partsScrapped: 0, cycleTimes: [], workInProcess: [], bottleneckSnapshots: [] };
        this.shiftsConfig = {};
    }

    logMessage(msg) { this.log.push(msg); }

    recordStateChange(stationId, status, meta = {}) {
        this.replayEvents.push({ type: 'STATION_STATE', time: this.simulationTime, stationId, status, meta });
    }

    recordBufferState(bufferId, queue) {
        const contentList = queue.slice(0, 50).map(partId => {
            const p = this.parts[partId];
            return p ? { code: p.code, orderId: p.orderId } : { code: '?', orderId: '?' };
        });
        this.replayEvents.push({ type: 'BUFFER_STATE', time: this.simulationTime, bufferId, count: queue.length, content: contentList });
    }

    recordTransport(part, fromId, toId, startTime, arrivalTime) {
        let subCode = part.code.includes('-') ? part.code.split('-').pop() : part.code;
        this.replayEvents.push({
            type: 'TRANSPORT', startTime, endTime: arrivalTime, from: fromId, to: toId,
            partId: part.id, orderId: part.orderId, partCode: part.code, subCode,
            isAssembled: part.attachedChildren.length > 0, duration: arrivalTime - startTime
        });
    }

    recordWorkerTravel(poolId, stationId, startTime, arrivalTime) {
        this.replayEvents.push({ type: 'WORKER_TRAVEL', startTime, endTime: arrivalTime, from: poolId, to: stationId });
    }

    recordResourceUsage(poolId, usageType, partId, startTime, endTime, meta = {}) {
        this.replayEvents.push({ type: 'RESOURCE_USAGE', poolId, usageType, startTime, endTime, duration: endTime - startTime, partId, meta });
    }

    isWorkingTime(timeHour) {
        const dayIndex = Math.floor(timeHour / 24);
        const hourOfDay = timeHour % 24;
        if (!this.shiftsConfig) return true;
        let isWorking = false;
        Object.values(this.shiftsConfig).forEach(shift => {
            if (!shift.active) return;
            const currentDayOfWeek = dayIndex % 7;
            if (currentDayOfWeek >= shift.days) return;
            const [sH, sM] = shift.start.split(':').map(Number);
            const [eH, eM] = shift.end.split(':').map(Number);
            const startVal = sH + sM/60;
            const endVal = eH + eM/60;
            if (endVal > startVal) { if (hourOfDay >= startVal && hourOfDay < endVal) isWorking = true; }
            else { if (hourOfDay >= startVal || hourOfDay < endVal) isWorking = true; }
        });
        return isWorking;
    }

    calculateCompletionTime(startTime, durationHours) {
        let remainingWork = durationHours;
        let cursor = startTime;
        const MAX_ITERATIONS = 10000;
        let iterations = 0;
        while (!this.isWorkingTime(cursor) && iterations < 168) {
             const timeToNextHour = Math.ceil(cursor) - cursor;
             cursor += (timeToNextHour === 0 ? 1.0 : timeToNextHour);
             iterations++;
        }
        iterations = 0;
        while (remainingWork > 0.0001 && iterations < MAX_ITERATIONS) {
            iterations++;
            if (this.isWorkingTime(cursor)) {
                const timeToNextHour = Math.ceil(cursor) - cursor;
                const step = (timeToNextHour === 0) ? 1.0 : timeToNextHour;
                const workToDo = Math.min(remainingWork, step);
                cursor += workToDo;
                remainingWork -= workToDo;
            } else {
                const timeToNextHour = Math.ceil(cursor) - cursor;
                cursor += (timeToNextHour === 0 ? 1.0 : timeToNextHour);
            }
        }
        return cursor;
    }
    
    calculateWorkingHoursDuration(totalDuration) {
        let paidHours = 0;
        for (let t = 0; t < totalDuration; t++) { if (this.isWorkingTime(t)) paidHours += 1; }
        return paidHours;
    }

    getHourDifference(startDateStr, endDateStr) {
        try {
            const parseDate = (str) => {
                const parts = str.split('-');
                if (parts[0].length === 2) return new Date(parts[2], parts[1] - 1, parts[0]);
                return new Date(parts[0], parts[1] - 1, parts[2]);
            };
            const diffMs = parseDate(endDateStr) - parseDate(startDateStr);
            return (diffMs / (1000 * 60 * 60));
        } catch (e) { return 0; }
    }

    // --- URUCHAMIANIE SYMULACJI (RUN) ---

    runSimulation(config, db, mrp, settings) {
        this.reset();
        this.config = config;
        this.db = db;
        this.mrp = mrp;
        this.settings = settings || { startDate: '18-11-2025' };
        this.shiftsConfig = this.settings.shifts || {};

        // === ETAP 1.3: INTEGRITY CHECK (WALIDACJA DANYCH) ===
        // To jest kluczowy moment. Zanim puścimy pętlę, sprawdzamy czy mamy komplet danych.
        // Jeśli brakuje marszruty dla produktu z MRP, silnik zatrzyma się z błędem.
        
        const validationErrors = [];
        
        // Iterujemy po wszystkich zleceniach
        this.mrp.forEach(order => {
            if (!order['Sekcje'] || !order['Rozmiar']) return; // Pomiń puste wiersze
            
            // Parsujemy strukturę produktu, żeby wiedzieć czego szukać w bazie marszrut
            const bom = this.parseOrderString(order['Sekcje'], order['Rozmiar']);
            
            bom.forEach(parentBOM => {
                // Generujemy klucz marszruty dla głównego komponentu (obudowy)
                // Format klucza musi zgadzać się z tym w ModuleRouting / config.routings
                const routingKey = `casings_${parentBOM.size}_${parentBOM.code}_phase0`;
                
                if (!this.config.routings[routingKey]) {
                    validationErrors.push(
                        `BŁĄD DANYCH: Brak zdefiniowanej marszruty dla "${routingKey}" (Zlecenie: ${order['Zlecenie'] || '?'})`
                    );
                }
                
                // Opcjonalnie: można też sprawdzać marszruty montażowe (phase1)
                // const assemblyKey = `casings_${parentBOM.size}_${parentBOM.code}_phase1`;
                // if (!this.config.routings[assemblyKey]) validationErrors.push(`Ostrzeżenie: Brak montażu dla ${assemblyKey}`);
            });
        });

        if (validationErrors.length > 0) {
            this.logMessage("!!! PRZERWANO: Wykryto błędy integralności danych:");
            // Pokaż pierwsze 10 błędów, żeby nie zaspamować logu
            validationErrors.slice(0, 10).forEach(e => this.logMessage(e));
            if (validationErrors.length > 10) {
                this.logMessage(`...oraz ${validationErrors.length - 10} innych błędów.`);
            }
            this.logMessage("Napraw konfigurację marszrut lub plik MRP i spróbuj ponownie.");
            
            // Zwracamy tablicę z komunikatem błędu, co zatrzyma worker
            return ["FATAL: Błędy danych. Sprawdź log symulacji."];
        }
        // === KONIEC WALIDACJI ===

        this.config.buffers.forEach(buffer => { 
            this.bufferStates[buffer.id] = { queue: [], maxQueue: 0, sumQueue: 0, queueSamples: 0 }; 
        });
        this.config.stations.forEach(station => { 
            this.stationStates[station.id] = { 
                queue: [], busySlots: 0, totalBusyTime: 0, totalStarvedTime: 0, 
                maxQueue: 0, sumQueue: 0, queueSamples: 0, breakdowns: [], incoming: 0 
            }; 
        });
        if (this.config.workerPools) {
            this.config.workerPools.forEach(pool => {
                this.workerPools[pool.id] = new ResourcePool(pool.name, pool.capacity, pool.speed, this, pool.costPerHour);
            });
        }
        if (this.config.toolPools) {
            this.config.toolPools.forEach(pool => {
                this.toolPools[pool.id] = new ResourcePool(pool.name, pool.capacity, pool.speed, this, 0);
            });
        }

        this.mrp.forEach((order, index) => {
            const orderDate = order['Data  zlecenia'] || order['Data zlecenia'];
            const orderDueDate = order['Termin'] || order['Data realizacji'] || null;
            let orderId = order['Zlecenie'] || `${index + 1}. ${order['Rozmiar'] || '?'}`;
            const orderString = order['Sekcje'];
            const orderSize = order['Rozmiar'];
            
            if (!orderDate || !orderString || !orderSize) return;
            
            const arrivalTime = Math.max(0, this.getHourDifference(this.settings.startDate, orderDate));
            const dueTime = orderDueDate ? Math.max(arrivalTime + 24, this.getHourDifference(this.settings.startDate, orderDueDate)) : null;
            const workStartArrivalTime = this.calculateCompletionTime(arrivalTime, 0);

            this.scheduleEvent(workStartArrivalTime, 'ORDER_ARRIVAL', { order: { orderId, orderString, orderSize, dueDate: dueTime } });
        });

        if (!this.eventQueue || this.eventQueue.isEmpty()) {
            this.logMessage("Brak zleceń.");
        } else {
            this.run();
        }
        return this.log;
    }

    run() {
        const anyShiftActive = Object.values(this.shiftsConfig).some(s => s.active);
        if (!anyShiftActive) {
            self.postMessage({ type: 'SIMULATION_RESULTS', payload: { error: "Brak aktywnych zmian." } });
            return;
        }

        this.logMessage(`[Engine] Start symulacji.`);
        let steps = 0;
        const MAX_STEPS = 800000;
        let nextWipSample = 0.0;

        while (!this.eventQueue.isEmpty()) {
            steps++;
            if (steps > MAX_STEPS) { this.logMessage(`! Limit kroków.`); break; }
            
            const event = this.eventQueue.pop();
            const timeDelta = event.time - this.simulationTime;
            
            if (timeDelta > 0 && this.isWorkingTime(this.simulationTime)) {
                 this.updateStarvationStats(timeDelta);
            }
            
            this.simulationTime = event.time;
            
            if (this.simulationTime >= nextWipSample) {
                const activeParts = Object.values(this.parts).filter(p => p.state !== 'FINISHED' && p.state !== 'SCRAPPED');
                this.stats.workInProcess.push({ 
                    time: this.simulationTime, 
                    count: activeParts.length,
                    value: activeParts.reduce((sum, p) => sum + p.materialCost, 0) 
                });
                
                let maxLoad = -1, bottleNeckId = null;
                Object.keys(this.stationStates).forEach(sId => {
                    const st = this.stationStates[sId];
                    const def = this.config.stations.find(s => s.id === sId);
                    const currentLoad = st.busySlots / (def.capacity || 1);
                    if (currentLoad > maxLoad) { maxLoad = currentLoad; bottleNeckId = sId; }
                });
                if (bottleNeckId && maxLoad > 0) this.stats.bottleneckSnapshots.push({ time: this.simulationTime, stationId: bottleNeckId, load: maxLoad });
                
                nextWipSample += 1.0; 
            }

            this.handleEvent(event);
        }
        this.finalizeSimulation();
    }
    
    updateStarvationStats(timeDelta) {
        if (timeDelta <= 0) return;
        Object.keys(this.stationStates).forEach(stationId => {
            const state = this.stationStates[stationId];
            const stationDef = this.config.stations.find(s => s.id === stationId);
            const capacity = stationDef.capacity || 1;
            if (state.queue.length === 0 && state.busySlots < capacity) {
                state.totalStarvedTime += (timeDelta * (capacity - state.busySlots));
            }
        });
    }

    finalizeSimulation() {
        const duration = this.simulationTime;
        const workingHoursTotal = this.calculateWorkingHoursDuration(duration);
        
        const processedParts = Object.values(this.parts).filter(p => p.state === 'FINISHED');
        const count = processedParts.length;
        
        let avgLeadTime = 0, avgFlowEfficiency = 0;
        let leadTimeBreakdown = { processing: 0, transport: 0, wait: 0, blocked: 0 };
        
        if (count > 0) {
            const totalLead = processedParts.reduce((sum, p) => sum + (p.stats.processingTime + p.stats.transportTime + p.stats.waitTime + p.stats.blockedTime), 0);
            const totalProcess = processedParts.reduce((sum, p) => sum + p.stats.processingTime, 0);
            avgLeadTime = totalLead / count;
            avgFlowEfficiency = (totalProcess / totalLead) * 100;
            
            leadTimeBreakdown = {
                processing: totalProcess / count,
                transport: processedParts.reduce((s,p) => s + p.stats.transportTime, 0) / count,
                wait: processedParts.reduce((s,p) => s + p.stats.waitTime, 0) / count,
                blocked: processedParts.reduce((s,p) => s + p.stats.blockedTime, 0) / count
            };
        }
        
        const materialConsumedParts = Object.values(this.parts).filter(p => p.state === 'FINISHED' || p.state === 'SCRAPPED');
        const totalMaterialCost = materialConsumedParts.reduce((sum, p) => sum + p.materialCost, 0);

        let totalLaborCost = 0, totalEnergyCost = 0;
        const workerStats = [];

        [...Object.values(this.workerPools), ...Object.values(this.toolPools)].forEach(pool => {
            const rate = pool.costPerHour || 0;
            const paidHours = workingHoursTotal * pool.capacity;
            const attendanceCost = paidHours * rate;
            const hoursWorked = pool.totalBusyTimeSeconds / 3600;
            const utilizedCost = hoursWorked * rate;
            
            totalLaborCost += utilizedCost; 
            
            workerStats.push({
                id: pool.name,
                type: pool.costPerHour > 0 ? 'Pracownik' : 'Narzędzie',
                capacity: pool.capacity,
                utilization: paidHours > 0 ? (hoursWorked / paidHours * 100).toFixed(1) : 0,
                hoursWorked: hoursWorked.toFixed(1),
                attendanceCost: attendanceCost.toFixed(2)
            });
        });
        
        const totalLaborCostReal = workerStats.reduce((sum, w) => sum + parseFloat(w.attendanceCost), 0);

        const stationStats = [];
        const ENERGY_COST_PER_H = 0.5;
        Object.keys(this.stationStates).forEach(stationId => {
            const state = this.stationStates[stationId];
            const def = this.config.stations.find(s => s.id === stationId);
            const capacity = def.capacity || 1;
            const totalCapacityTime = workingHoursTotal * capacity;
            
            const totalBusy = state.totalBusyTime; 
            totalEnergyCost += totalBusy * ENERGY_COST_PER_H;

            const utilization = totalCapacityTime > 0 ? (totalBusy / totalCapacityTime * 100) : 0;
            const starvation = totalCapacityTime > 0 ? (state.totalStarvedTime / totalCapacityTime * 100) : 0;
            
            const downtime = state.breakdowns.reduce((s,b) => s+b.duration, 0);
            let blocked = 100 - utilization - starvation - ((downtime/totalCapacityTime)*100);
            if(blocked < 0) blocked = 0;

            stationStats.push({
                id: stationId, name: def.name,
                utilization: utilization.toFixed(1),
                starvation: starvation.toFixed(1),
                blocked: blocked.toFixed(1),
                breakdownPct: totalCapacityTime > 0 ? (downtime/totalCapacityTime*100).toFixed(1) : 0,
                failures: state.breakdowns.length,
                maxQueue: state.maxQueue
            });
        });

        const totalProductionCost = totalLaborCostReal + totalEnergyCost + totalMaterialCost;
        const cpu = count > 0 ? (totalProductionCost / count) : 0;

        const detailedReports = this.calculateDetailedStats();
        const otif = detailedReports.orders.filter(o => o.status !== 'BEZ TERMINU').length > 0 
            ? (detailedReports.orders.filter(o => o.status !== 'BEZ TERMINU' && o.onTime).length / detailedReports.orders.filter(o => o.status !== 'BEZ TERMINU').length * 100) 
            : 100;

        const bMap = {};
        this.stats.bottleneckSnapshots.forEach(s => bMap[s.stationId] = (bMap[s.stationId] || 0) + 1);
        const dynamicBottlenecks = Object.entries(bMap).map(([id, val]) => ({
            id, name: this.config.stations.find(s => s.id === id)?.name || id, hours: val
        })).sort((a,b) => b.hours - a.hours);

        const results = {
            duration, workingHoursTotal, produced: this.stats.partsProcessed, scrapped: this.stats.partsScrapped,
            avgLeadTime, avgFlowEfficiency, leadTimeBreakdown,
            actualTakt: this.stats.partsProcessed > 0 ? workingHoursTotal / this.stats.partsProcessed : 0,
            targetTakt: parseFloat(this.settings.targetTakt || 0)/60,
            otif: otif.toFixed(1),
            cpu: cpu.toFixed(2),
            totalLaborCost: totalLaborCostReal,
            totalEnergyCost,
            totalMaterialCost, 
            stationStats,
            bufferStats: Object.keys(this.bufferStates).map(bid => ({
                id: bid, name: this.config.buffers.find(b => b.id === bid).name,
                maxQueue: this.bufferStates[bid].maxQueue,
                utilization: (this.bufferStates[bid].maxQueue / this.config.buffers.find(b => b.id === bid).capacity * 100).toFixed(1)
            })),
            workerStats,
            dynamicBottlenecks,
            orderReports: detailedReports.orders,
            productReports: detailedReports.products,
            wipHistory: this.stats.workInProcess,
            replayEvents: this.replayEvents,
            shiftSettings: this.settings.shifts
        };

        this.logMessage(`Symulacja zakończona. CPU: ${cpu.toFixed(2)} PLN.`);
        self.postMessage({ type: 'SIMULATION_RESULTS', payload: results });
    }

    scheduleEvent(time, type, payload = {}) {
        this.eventQueue.push({ time, type, payload });
    }

    handleEvent(event) {
        switch(event.type) {
            case 'ORDER_ARRIVAL': this.handleOrderArrival(event.payload); break;
            case 'PART_ARRIVES_AT_NODE': this.handlePartArrivalAtNode(event.payload); break;
            case 'WORKER_ARRIVES_AT_STATION': this.handleWorkerArrives(event.payload); break;
            case 'OPERATION_COMPLETE': this.handleOperationComplete(event.payload); break;
            case 'TRANSPORT_COMPLETE': this.handleTransportComplete(event.payload); break;
        }
    }

    handleOrderArrival(payload) {
        const { order } = payload;
        this.orderMap[order.orderId] = order.orderString;
        try {
            const bom = this.parseOrderString(order.orderString, order.orderSize);
            let stagger = 0;
            bom.forEach(parentBOM => {
                this.createAndSendPart(order, parentBOM, 'casings', order.dueDate, stagger);
                parentBOM.childrenBOM.forEach(childBOM => {
                    this.createAndSendPart(order, childBOM, 'functions', order.dueDate, stagger);
                });
                stagger += 0.05;
            });
        } catch (e) { this.logMessage(`Błąd zlecenia: ${e.message}`); }
    }

    handlePartArrivalAtNode(payload) {
        const { partId, nodeId } = payload;
        const part = this.parts[partId];
        if(!part) return;
        part.currentLocation = nodeId;

        const bufferNode = this.config.buffers.find(n => n.id === nodeId);
        if (bufferNode) {
            part.updateState('IDLE_IN_BUFFER', this.simulationTime);
            this.bufferStates[nodeId].queue.push(part.id);
            if(this.bufferStates[nodeId].queue.length > this.bufferStates[nodeId].maxQueue) 
                this.bufferStates[nodeId].maxQueue = this.bufferStates[nodeId].queue.length;
            this.recordBufferState(nodeId, this.bufferStates[nodeId].queue);

            if(bufferNode.isEndBuffer) {
                part.updateState('FINISHED', this.simulationTime);
                this.stats.partsProcessed++;
                this.stats.cycleTimes.push(this.simulationTime - part.creationTime);
                return;
            }
            this.tryPushFromBuffer(nodeId);
            const montazFlow = this.config.flows.find(f => f.from === nodeId && this.config.stations.find(s => s.id === f.to && s.type === 'montaz'));
            if(montazFlow) this.tryStartMontaz(montazFlow.to);
            return;
        }

        const stationNode = this.config.stations.find(n => n.id === nodeId);
        if (stationNode) {
            if(this.stationStates[nodeId].incoming > 0) this.stationStates[nodeId].incoming--;
            part.updateState('IDLE_AT_STATION', this.simulationTime);
            this.stationStates[nodeId].queue.push(part.id);
            if(this.stationStates[nodeId].queue.length > this.stationStates[nodeId].maxQueue)
                this.stationStates[nodeId].maxQueue = this.stationStates[nodeId].queue.length;
            this.tryStartOperation(nodeId);
        }
    }

    tryPushFromBuffer(bufferId) {
        if (!this.isWorkingTime(this.simulationTime)) return;
        const bufferState = this.bufferStates[bufferId];
        if (bufferState.queue.length === 0) return;
        
        const partId = bufferState.queue[0];
        const part = this.parts[partId];
        const nextOp = part.getNextOperation();
        if (!nextOp) return;

        const targetStation = this.config.stations.find(s => s.allowedOps.some(op => op.id === nextOp.id));
        if (!targetStation) return;

        const flow = this.config.flows.find(f => f.from === bufferId && f.to === targetStation.id);
        if (!flow) return;

        const stState = this.stationStates[targetStation.id];
        const limit = (targetStation.capacity || 1) + 2; 
        if ((stState.queue.length + stState.incoming) < limit) {
            bufferState.queue.shift();
            this.recordBufferState(bufferId, bufferState.queue);
            this.initiateTransport(part, bufferId, targetStation.id, 1);
        }
    }

    tryStartMontaz(stationId) {
        if (!this.isWorkingTime(this.simulationTime)) return;
        const stState = this.stationStates[stationId];
        const stDef = this.config.stations.find(s => s.id === stationId);
        if (stState.busySlots >= (stDef.capacity || 1)) return;
        if (stState.queue.length > 0) { this.tryStartOperation(stationId); return; }

        const inputFlows = this.config.flows.filter(f => f.to === stationId);
        let parentPart = null;
        let parentBufferId = null;

        for (const flow of inputFlows) {
            const bState = this.bufferStates[flow.from];
            if (!bState || bState.queue.length === 0) continue;
            const p = this.parts[bState.queue[0]];
            if (p.type === 'PARENT' && p.getNextOperation() === null) {
                parentPart = p;
                parentBufferId = flow.from;
                break; 
            }
        }

        if (!parentPart) return;

        const requiredChildren = parentPart.childrenBOM;
        let childrenFound = [];

        for (const childBOM of requiredChildren) {
            const typeId = `functions_${childBOM.size}_${childBOM.code}`;
            const targetFlow = inputFlows.find(f => {
                const b = this.config.buffers.find(bf => bf.id === f.from);
                return b && b.allowedProductTypes.includes(typeId);
            });

            if (!targetFlow) { childrenFound = null; break; }
            const cbState = this.bufferStates[targetFlow.from];
            if (cbState.queue.length === 0) { childrenFound = null; break; }
            
            const candidate = this.parts[cbState.queue[0]];
            if (candidate.code === childBOM.code && candidate.size === childBOM.size) {
                childrenFound.push({ partId: cbState.queue[0], bufferId: targetFlow.from });
            } else {
                childrenFound = null; break;
            }
        }

        if (!childrenFound) return;

        childrenFound.forEach(item => {
            const q = this.bufferStates[item.bufferId].queue;
            q.shift();
            this.recordBufferState(item.bufferId, q);
            const child = this.parts[item.partId];
            child.updateState('ASSEMBLED', this.simulationTime);
            parentPart.attachedChildren.push(child);
        });

        const pq = this.bufferStates[parentBufferId].queue;
        pq.shift();
        this.recordBufferState(parentBufferId, pq);

        parentPart.currentLocation = stationId;
        stState.queue.push(parentPart.id);

        let assemblyOps = [];
        const seq = this.settings.assemblySequence || [];
        const getOps = (p) => {
            const tKey = p.type === 'PARENT' ? 'casings' : 'functions';
            return this.config.routings[`${tKey}_${p.size}_${p.code}_phase1`] || [];
        };
        seq.forEach(code => {
            if (parentPart.code === code) assemblyOps = assemblyOps.concat(getOps(parentPart));
            const ch = parentPart.attachedChildren.find(c => c.code === code);
            if (ch) assemblyOps = assemblyOps.concat(getOps(ch));
        });
        if(assemblyOps.length === 0) {
            parentPart.attachedChildren.forEach(c => assemblyOps = assemblyOps.concat(getOps(c)));
            assemblyOps = assemblyOps.concat(getOps(parentPart));
        }
        parentPart.routing = assemblyOps;
        parentPart.routingStep = 0;

        this.tryStartOperation(stationId);
    }

    tryStartOperation(stationId) {
        if (!this.isWorkingTime(this.simulationTime)) return;
        const stState = this.stationStates[stationId];
        const stDef = this.config.stations.find(s => s.id === stationId);
        if (stState.queue.length === 0 || stState.busySlots >= (stDef.capacity || 1)) return;

        const partId = stState.queue[0];
        const part = this.parts[partId];
        let requiredOps = 1;
        let opTime = 0.1;

        if (stDef.type === 'podmontaz' || stDef.type === 'montaz') {
            const op = part.getNextOperation();
            if (!op) {
                stState.queue.shift();
                this.handleOperationComplete({ partId, stationId, poolId: null, requiredOperators: 0, duration: 0 });
                return;
            }
            requiredOps = op.operators || 1;
            opTime = op.time || 0.1;
        } else {
            const setKey = stDef.type === 'jakosci' ? 'qualitySettings' : 'packingSettings';
            const rule = (this.settings[setKey] || {})[part.size];
            if (rule) {
                opTime = rule.baseTime || 0;
                part.attachedChildren.forEach(c => { opTime += (rule.functionTimes?.[c.code] || 0); });
            }
        }

        if (stDef.variance > 0) opTime *= (1 + (Math.random()*2-1)*(stDef.variance/100));

        const wFlow = this.config.workerFlows.find(wf => wf.to === stationId);
        if (!wFlow) {
            stState.queue.shift(); stState.busySlots++;
            this.notifyUpstreamBuffers(stationId);
            const doneTime = this.calculateCompletionTime(this.simulationTime, opTime);
            this.recordStateChange(stationId, 'RUN', { part: part.code, startTime: this.simulationTime, endTime: doneTime, duration: doneTime - this.simulationTime, slotIndex: stState.busySlots - 1 });
            this.scheduleEvent(doneTime, 'OPERATION_COMPLETE', { partId, stationId, poolId: null, requiredOperators: 0, duration: opTime });
            return;
        }

        const pool = this.workerPools[wFlow.from];
        if (pool.request(part, requiredOps)) {
            stState.queue.shift(); stState.busySlots++;
            this.notifyUpstreamBuffers(stationId);
            part.updateState('WAITING_FOR_WORKER_TRAVEL', this.simulationTime);
            const travelT = (wFlow.distance / pool.speed) / 3600;
            const arrivalT = this.calculateCompletionTime(this.simulationTime, travelT);
            this.recordWorkerTravel(wFlow.from, stationId, this.simulationTime, arrivalT);
            this.recordStateChange(stationId, 'WAITING_FOR_WORKER', { startTime: this.simulationTime, endTime: arrivalT, slotIndex: stState.busySlots - 1 });
            this.scheduleEvent(arrivalT, 'WORKER_ARRIVES_AT_STATION', { partId, stationId, poolId: wFlow.from, requiredOperators: requiredOps });
        } else {
            part.updateState('WAITING_FOR_WORKER', this.simulationTime);
            this.recordStateChange(stationId, 'WAITING_FOR_WORKER', { startTime: this.simulationTime, slotIndex: stState.queue.length });
        }
    }

    handleWorkerArrives(payload) {
        const { partId, stationId, poolId, requiredOperators } = payload;
        const part = this.parts[partId];
        const stDef = this.config.stations.find(s => s.id === stationId);
        const stState = this.stationStates[stationId];

        part.updateState('PROCESSING', this.simulationTime);
        let opTime = 0.1;
        if (stDef.type === 'podmontaz' || stDef.type === 'montaz') {
            const op = part.getNextOperation();
            opTime = op ? (op.time || 0.1) : 0.1;
        }
        if (stDef.variance > 0) opTime *= (1 + (Math.random()*2-1)*(stDef.variance/100));

        if (stDef.failureProb > 0 && Math.random()*100 < stDef.failureProb) {
            const repair = 1 + Math.random()*2; opTime += repair;
            stState.breakdowns.push({ startTime: this.simulationTime, duration: repair });
            this.logMessage(`! AWARIA ${stDef.name}`);
            this.recordStateChange(stationId, 'STOP', { reason: 'AWARIA', startTime: this.simulationTime, endTime: this.simulationTime + repair });
        }

        const doneTime = this.calculateCompletionTime(this.simulationTime, opTime);
        this.recordStateChange(stationId, 'RUN', { 
            part: part.code, order: part.orderId, subCode: part.code.includes('-') ? part.code.split('-').pop() : part.code,
            isAssembled: part.attachedChildren.length > 0, startTime: this.simulationTime, endTime: doneTime, duration: doneTime - this.simulationTime,
            slotIndex: stState.busySlots - 1, totalOps: part.routing.length, currentOp: part.routingStep + 1
        });
        this.scheduleEvent(doneTime, 'OPERATION_COMPLETE', { partId, stationId, poolId, requiredOperators, duration: opTime });
    }

    handleOperationComplete(payload) {
        const { partId, stationId, poolId, requiredOperators, duration } = payload;
        const part = this.parts[partId];
        const stState = this.stationStates[stationId];
        const stDef = this.config.stations.find(s => s.id === stationId);

        if (duration > 0) stState.totalBusyTime += duration;
        stState.busySlots--;
        this.recordStateChange(stationId, 'IDLE');

        if (poolId) {
            this.recordResourceUsage(poolId, 'PROCESSING', partId, this.simulationTime - duration, this.simulationTime, { stationId });
            const unblocked = this.workerPools[poolId].release(part, requiredOperators, duration);
            if (unblocked && unblocked.state === 'WAITING_FOR_WORKER') this.tryStartOperation(unblocked.currentLocation);
        }

        if (stDef.type === 'jakosci' && Math.random() < ((stDef.failureProb||0)/1000 + 0.01)) {
            part.updateState('SCRAPPED', this.simulationTime);
            this.stats.partsScrapped++;
            this.notifyUpstreamBuffers(stationId);
            return;
        }

        part.routingStep++;
        const nextOp = part.getNextOperation();
        if (nextOp && stDef.allowedOps.some(op => op.id === nextOp.id)) {
            stState.queue.unshift(partId); this.tryStartOperation(stationId); return;
        }

        this.tryStartOperation(stationId);
        this.notifyUpstreamBuffers(stationId);

        const flow = this.config.flows.find(f => f.from === stationId);
        if (flow) {
            part.updateState('WAITING_FOR_TOOL', this.simulationTime);
            this.recordStateChange(stationId, 'BLOCKED', { part: part.code });
            this.initiateTransport(part, stationId, flow.to, 1);
        } else {
            if(part.state !== 'FINISHED' && part.state !== 'SCRAPPED') {
                part.updateState('FINISHED', this.simulationTime);
                this.stats.partsProcessed++;
            }
        }
    }

    initiateTransport(part, fromId, toId, reqTools) {
        const flow = this.config.flows.find(f => f.from === fromId && f.to === toId);
        if(!flow) return;
        if(this.config.stations.find(s => s.id === toId)) this.stationStates[toId].incoming++;

        const toolId = this.config.toolPools.find(p => p.assignedFlows?.includes(flow.id))?.id;
        const startTime = this.simulationTime;

        if(!toolId) {
            part.updateState('IN_TRANSPORT', this.simulationTime);
            const tTime = flow.distance / 1.0 / 3600;
            const arrTime = this.calculateCompletionTime(this.simulationTime, tTime);
            this.recordTransport(part, fromId, toId, startTime, arrTime);
            this.scheduleEvent(arrTime, 'PART_ARRIVES_AT_NODE', { partId: part.id, nodeId: toId });
            return;
        }

        const pool = this.toolPools[toolId];
        if (pool.request(part, reqTools)) {
            part.updateState('IN_TRANSPORT', this.simulationTime);
            const tTime = flow.distance / pool.speed / 3600;
            const arrTime = this.calculateCompletionTime(this.simulationTime, tTime);
            this.scheduleEvent(arrTime, 'TRANSPORT_COMPLETE', { partId: part.id, toNodeId: toId, poolId: toolId, requiredTools: reqTools, fromNodeId: fromId, startTime });
        } else {
            part.updateState('WAITING_FOR_TOOL', this.simulationTime);
        }
    }

    handleTransportComplete(payload) {
        const { partId, toNodeId, poolId, requiredTools, startTime } = payload;
        const part = this.parts[partId];
        this.recordTransport(part, payload.fromNodeId, toNodeId, startTime, this.simulationTime);
        this.scheduleEvent(this.simulationTime, 'PART_ARRIVES_AT_NODE', { partId, nodeId: toNodeId });
        this.recordResourceUsage(poolId, 'TRANSPORT', partId, startTime, this.simulationTime);
        const unblocked = this.toolPools[poolId].release(part, requiredTools, 0);
        if (unblocked && unblocked.state === 'WAITING_FOR_TOOL') {
            const loc = unblocked.currentLocation;
            if(loc.startsWith('buf_')) this.tryPushFromBuffer(loc);
            else if(loc.startsWith('sta_')) {
                const f = this.config.flows.find(fl => fl.from === loc);
                if(f) this.initiateTransport(unblocked, loc, f.to, 1);
            }
        }
    }

    createAndSendPart(order, partBOM, typeKey, dueDate, delay) {
        const rKey = `${typeKey}_${partBOM.size}_${partBOM.code}_phase0`;
        const routing = this.config.routings[rKey] || [];
        const typeId = `${typeKey}_${partBOM.size}_${partBOM.code}`;
        const startBuf = this.config.buffers.find(b => b.isStartBuffer && b.allowedProductTypes.includes(typeId));
        if(!startBuf) return;

        this.partCounter++;
        const p = new Part(this.partCounter, order.orderId, partBOM.type, partBOM.code, partBOM.size, routing, partBOM.childrenBOM, this.simulationTime+delay, dueDate);
        p.currentLocation = startBuf.id;
        p.updateState('IDLE_IN_BUFFER', this.simulationTime + delay);
        this.parts[p.id] = p;
        this.scheduleEvent(this.simulationTime + delay, 'PART_ARRIVES_AT_NODE', { partId: p.id, nodeId: startBuf.id });
    }

    parseOrderString(str, size) {
        const parts = str.split('-');
        const bom = [];
        let secCounter = 0;
        for(let i=0; i<parts.length; i++) {
            const code = parts[i];
            if(code.startsWith('M')) {
                secCounter++;
                const parent = { partId: `SEC${secCounter}`, type: 'PARENT', size, code, sectionId: secCounter, childrenBOM: [] };
                if(i+1 < parts.length && !parts[i+1].startsWith('M')) {
                    const children = parts[i+1].split('');
                    children.forEach(c => parent.childrenBOM.push({ partId: `CHILD`, type: 'CHILD', size, code: c }));
                    i++;
                }
                bom.push(parent);
            }
        }
        return bom;
    }

    calculateDetailedStats() {
        const orderStats = {}; const productStats = {};
        Object.values(this.parts).forEach(part => {
            if (!orderStats[part.orderId]) {
                orderStats[part.orderId] = {
                    id: part.orderId, code: this.orderMap[part.orderId] || '', size: part.size, 
                    dueDate: part.dueDate, startTime: part.creationTime, endTime: part.finishTime || this.simulationTime,
                    totalParts: 0, finishedParts: 0, scrappedParts: 0, componentsStatus: { processing: [], ready: [], todo: [] }
                };
            }
            const order = orderStats[part.orderId];
            if (part.creationTime < order.startTime) order.startTime = part.creationTime;
            if (part.finishTime && part.finishTime > order.endTime) order.endTime = part.finishTime;
            order.totalParts++;
            if (part.state === 'FINISHED') order.finishedParts++;
            if (part.state === 'SCRAPPED') order.scrappedParts++;
            let subCode = part.code.includes('-') ? part.code.split('-').pop() : part.code;
            if (['PROCESSING','IN_TRANSPORT'].includes(part.state)) order.componentsStatus.processing.push(subCode);
            else if (['IDLE_IN_BUFFER','ASSEMBLED','FINISHED'].includes(part.state)) order.componentsStatus.ready.push(subCode);
            else order.componentsStatus.todo.push(subCode);

            if (['FINISHED', 'ASSEMBLED', 'SCRAPPED'].includes(part.state)) {
                const key = `${part.type}_${part.code}`;
                if (!productStats[key]) productStats[key] = { type: part.type === 'CHILD'?'Funkcja':'Obudowa', code: part.code, count: 0, scraps: 0, processingTimes: [], waitTimes: [], otherTimes: [] };
                const pStat = productStats[key]; pStat.count++;
                if (part.state === 'SCRAPPED') pStat.scraps++;
                pStat.processingTimes.push(part.stats.processingTime); pStat.waitTimes.push(part.stats.waitTime); pStat.otherTimes.push(part.stats.transportTime + part.stats.blockedTime);
            }
        });
        const getStats = (arr) => arr.length ? { min: Math.min(...arr).toFixed(2), max: Math.max(...arr).toFixed(2), avg: (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) } : { min:0, max:0, avg:0 };
        return {
            orders: Object.values(orderStats).map(o => {
                const dur = o.endTime - o.startTime;
                let status = 'OK'; if (o.scrappedParts > 0) status = 'BRAKI';
                let onTime = true; if (o.dueDate && o.endTime > o.dueDate) { status = 'OPÓŹNIONE'; onTime = false; } else if (!o.dueDate) status = 'BEZ TERMINU';
                return { id: o.id, code: o.code, size: o.size, duration: dur.toFixed(2), progress: `${o.finishedParts}/${o.totalParts}`, scraps: o.scrappedParts, onTime, status, startTime: o.startTime, endTime: o.endTime, componentsStatus: o.componentsStatus };
            }),
            products: Object.values(productStats).map(p => ({ type: p.type, code: p.code, count: p.count, scrapRate: ((p.scraps/p.count)*100).toFixed(1)+'%', process: getStats(p.processingTimes), wait: getStats(p.waitTimes), other: getStats(p.otherTimes) }))
        };
    }

    notifyUpstreamBuffers(stationId) {
        this.config.flows.filter(f => f.to === stationId && f.from.startsWith('buf_')).forEach(f => this.tryPushFromBuffer(f.from));
    }
}

let engine;
self.onmessage = (e) => {
    const { type, payload } = e.data;
    if (!engine) engine = new SimulationEngine();
    if (type === 'START_SIMULATION') {
        const log = engine.runSimulation(payload.config, payload.db, payload.mrp, payload.settings);
        self.postMessage({ type: 'SIMULATION_LOG', payload: log });
    }
};