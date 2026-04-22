type Key = string | number | symbol;
class LruNode<K, V> {
    key: K;
    value: V;
    prev: LruNode<K, V> | null = null;
    next: LruNode<K, V> | null = null;
    constructor(key: K, value: V) {
        this.key = key;
        this.value = value;
    }
}

class InternalList<K, V> {
    head: LruNode<K, V> | null = null;
    tail: LruNode<K, V> | null = null;

    unshift(node: LruNode<K, V>) {
        node.prev = null;
        node.next = this.head;
        if (this.head) this.head.prev = node;
        else this.tail = node;
        this.head = node;
    }

    unlink(node: LruNode<K, V>) {
        const { prev, next } = node;
        if (prev) prev.next = next; else this.head = next;
        if (next) next.prev = prev; else this.tail = prev;
        node.prev = node.next = null;
    }

    moveToFront(node: LruNode<K, V>) {
        if (node === this.head) return;
        this.unlink(node);
        this.unshift(node);
    }

    removeTail(): LruNode<K, V> | null {
        const t = this.tail;
        if (!t) return null;
        this.unlink(t);
        return t;
    }
}
export class LRUCache<K extends Key=number, V=unknown> {
    #cap: number;
    #map = new Map<K, LruNode<K, V>>();
    #list = new InternalList<K, V>();

    constructor(capacity: number) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error("capacity must be a positive integer");
        }
        this.#cap = capacity;
    }

    get size() {
        return this.#map.size;
    }

    get(key: K): V | undefined {
        const node = this.#map.get(key);
        if (!node) return undefined;
        this.#list.moveToFront(node);
        return node.value;
    }

    set(key: K, value: V): void {
        const existing = this.#map.get(key);
        if (existing) {
            existing.value = value;
            this.#list.moveToFront(existing);
            return;
        }

        const node = new LruNode(key, value);
        this.#list.unshift(node);
        this.#map.set(key, node);

        if (this.#map.size > this.#cap) {
            const tail = this.#list.removeTail();
            if (tail) this.#map.delete(tail.key);
        }
    }

    has(key: K): boolean {
        return this.#map.has(key);
    }

    delete(key: K): boolean {
        const node = this.#map.get(key);
        if (!node) return false;
        this.#list.unlink(node);
        this.#map.delete(key);
        return true;
    }

    clear(): void {
        this.#map.clear();
        this.#list.head = this.#list.tail = null;
    }
}