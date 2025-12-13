// priority_queue.js
// Klasyczna implementacja Min-Heap (Kopiec Minimalny)
// Używana do zarządzania zdarzeniami w symulacji Discrete Event Simulation (DES).

class PriorityQueue {
    /**
     * @param {function} comparator - Funkcja porównująca (domyślnie a.time < b.time)
     */
    constructor(comparator = (a, b) => a.time < b.time) {
        this.heap = [];
        this.comparator = comparator;
        // Licznik sekwencyjny dla zapewnienia determinizmu (stabilności) kolejki
        // Jeśli czasy są identyczne, decyduje kolejność dodania.
        this.sequenceCounter = 0;
    }

    size() {
        return this.heap.length;
    }

    isEmpty() {
        return this.size() === 0;
    }

    peek() {
        return this.heap[0]?.value || null;
    }

    /**
     * Dodaje element do kolejki.
     * @param {any} value - Wartość (np. obiekt zdarzenia)
     */
    push(value) {
        this.sequenceCounter++;
        // Pakujemy wartość w obiekt węzła z unikalnym ID sekwencyjnym
        const node = { 
            value, 
            seq: this.sequenceCounter 
        };
        this.heap.push(node);
        this.siftUp(this.heap.length - 1);
    }

    /**
     * Usuwa i zwraca element o najwyższym priorytecie (najmniejszym czasie).
     * @returns {any}
     */
    pop() {
        if (this.isEmpty()) return null;
        
        // Jeśli tylko jeden element, po prostu go usuń
        if (this.size() === 1) {
            return this.heap.pop().value;
        }

        const poppedNode = this.heap[0];
        // Przenieś ostatni element na szczyt
        this.heap[0] = this.heap.pop();
        // Przywróć własność kopca
        this.siftDown(0);
        
        return poppedNode.value;
    }

    /**
     * Wewnętrzna metoda porównująca dwa węzły (Node).
     * Uwzględnia logikę biznesową (czas) ORAZ determinizm (seq).
     */
    compareNodes(nodeA, nodeB) {
        const valA = nodeA.value;
        const valB = nodeB.value;

        // 1. Sprawdź główny warunek (np. czas) używając przekazanego komparatora
        // Uwaga: Komparator zwraca true jeśli A ma wyższy priorytet (jest mniejszy) niż B
        // Musimy to obsłużyć ostrożnie. Standardowy komparator to (a,b) => a.time < b.time
        
        // Pobieramy czasy bezpośrednio dla pewności (zakładamy strukturę {time: ...})
        const timeA = valA.time;
        const timeB = valB.time;

        if (timeA !== timeB) {
            return timeA < timeB;
        }

        // 2. Tie-breaker: Jeśli czasy są równe, decyduje kolejność dodania (FIFO)
        // Mniejszy numer sekwencyjny = dodany wcześniej = wyższy priorytet
        return nodeA.seq < nodeB.seq;
    }

    parent(i) { return Math.floor((i - 1) / 2); }
    leftChild(i) { return 2 * i + 1; }
    rightChild(i) { return 2 * i + 2; }
    
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    siftUp(i) {
        while (i > 0 && this.compareNodes(this.heap[i], this.heap[this.parent(i)])) {
            this.swap(i, this.parent(i));
            i = this.parent(i);
        }
    }

    siftDown(i) {
        let maxIndex = i;
        const left = this.leftChild(i);
        const right = this.rightChild(i);

        if (left < this.size() && this.compareNodes(this.heap[left], this.heap[maxIndex])) {
            maxIndex = left;
        }
        if (right < this.size() && this.compareNodes(this.heap[right], this.heap[maxIndex])) {
            maxIndex = right;
        }

        if (i !== maxIndex) {
            this.swap(i, maxIndex);
            this.siftDown(maxIndex);
        }
    }
}