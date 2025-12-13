// priority_queue.js
// Deterministyczna Kolejka Priorytetowa (Min-Heap)
// Gwarantuje kolejność FIFO dla zdarzeń o tym samym czasie.

class PriorityQueue {
    constructor(comparator = (a, b) => a.time < b.time) {
        this.heap = [];
        this.comparator = comparator;
        this.sequenceCounter = 0; // Licznik sekwencyjny dla stabilności
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

    push(value) {
        this.sequenceCounter++;
        const node = { value, seq: this.sequenceCounter };
        this.heap.push(node);
        this.siftUp(this.heap.length - 1);
    }

    pop() {
        if (this.isEmpty()) return null;
        if (this.size() === 1) return this.heap.pop().value;

        const poppedNode = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.siftDown(0);
        return poppedNode.value;
    }

    compareNodes(nodeA, nodeB) {
        const timeA = nodeA.value.time;
        const timeB = nodeB.value.time;
        
        if (timeA !== timeB) {
            return timeA < timeB;
        }
        // Jeśli czasy równe, decyduje kolejność dodania
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