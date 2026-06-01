export interface DLinkedListNodeView<T> {
    readonly value: T;
    readonly prev: DLinkedListNodeView<T> | null;
    readonly next: DLinkedListNodeView<T> | null;
}
class Node<T> implements DLinkedListNodeView<T> {
    value: T;
    prev: Node<T> | null = null;
    next: Node<T> | null = null;
    constructor(value: T) {
        this.value = value;
    }
}

export class DLinkedList<T> implements Iterable<T> {
    #head: Node<T> | null = null;
    #tail: Node<T> | null = null;
    #size = 0;

    get size() {
        return this.#size;
    }

    get head(): DLinkedListNodeView<T> | null {
        return this.#head;
    }

    get tail(): DLinkedListNodeView<T> | null {
        return this.#tail;
    }

    get isEmpty() {
        return this.#size === 0;
    }

    clear() {
        // 断开引用，帮助 GC（尤其是大链表）
        let cur = this.#head;
        while (cur) {
            const next = cur.next;
            cur.prev = null;
            cur.next = null;
            cur = next;
        }
        this.#head = this.#tail = null;
        this.#size = 0;
    }

    toArray(): T[] {
        const out: T[] = [];
        for (const v of this) out.push(v);
        return out;
    }

    *values(): IterableIterator<T> {
        let cur = this.#head;
        while (cur) {
            yield cur.value;
            cur = cur.next;
        }
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    *nodes(): IterableIterator<DLinkedListNodeView<T>> {
        let cur = this.#head;
        while (cur) {
            yield cur;
            cur = cur.next;
        }
    }

    push(value: T): this {
        const node = new Node(value);

        if (!this.#tail) {
            this.#head = this.#tail = node;
            this.#size = 1;
            return this;
        }

        node.prev = this.#tail;
        this.#tail.next = node;
        this.#tail = node;
        this.#size++;
        return this;
    }

    pop(): T | undefined {
        if (!this.#tail) return undefined;

        const tail = this.#tail;
        const prev = tail.prev;

        if (!prev) {
            // 只有一个节点
            this.#head = this.#tail = null;
        } else {
            prev.next = null;
            this.#tail = prev;
        }

        tail.prev = null;
        this.#size--;
        return tail.value;
    }

    unshift(value: T): this {
        const node = new Node(value);

        if (!this.#head) {
            this.#head = this.#tail = node;
            this.#size = 1;
            return this;
        }

        node.next = this.#head;
        this.#head.prev = node;
        this.#head = node;
        this.#size++;
        return this;
    }

    shift(): T | undefined {
        if (!this.#head) return undefined;

        const head = this.#head;
        const next = head.next;

        if (!next) {
            this.#head = this.#tail = null;
        } else {
            next.prev = null;
            this.#head = next;
        }

        head.next = null;
        this.#size--;
        return head.value;
    }

    /** 0-based。index == size 等价于 push */
    insertAt(index: number, value: T): boolean {
        if (!Number.isInteger(index) || index < 0 || index > this.#size) return false;
        if (index === 0) {
            this.unshift(value);
            return true;
        }
        if (index === this.#size) {
            this.push(value);
            return true;
        }

        const at = this.#nodeAt(index);
        if (!at) return false;

        const node = new Node(value);
        const prev = at.prev; // 一定存在（因为 index != 0）

        node.prev = prev;
        node.next = at;

        if (prev) prev.next = node;
        at.prev = node;

        this.#size++;
        return true;
    }

    /** 0-based */
    removeAt(index: number): T | undefined {
        if (!Number.isInteger(index) || index < 0 || index >= this.#size) return undefined;
        if (index === 0) return this.shift();
        if (index === this.#size - 1) return this.pop();

        const node = this.#nodeAt(index);
        if (!node) return undefined;

        return this.#unlink(node).value;
    }

    /**
     * 删除第一个匹配项（默认用 Object.is）。
     * 返回是否删除成功。
     */
    remove(value: T, equals: (a: T, b: T) => boolean = Object.is): boolean {
        let cur = this.#head;
        while (cur) {
            if (equals(cur.value, value)) {
                this.#unlink(cur);
                return true;
            }
            cur = cur.next;
        }
        return false;
    }

    find(predicate: (value: T, index: number) => boolean): T | undefined {
        let i = 0;
        let cur = this.#head;
        while (cur) {
            if (predicate(cur.value, i)) return cur.value;
            cur = cur.next;
            i++;
        }
        return undefined;
    }

    /** 返回首个匹配节点（只读视图） */
    findNode(predicate: (value: T, index: number) => boolean): DLinkedListNodeView<T> | null {
        let i = 0;
        let cur = this.#head;
        while (cur) {
            if (predicate(cur.value, i)) return cur;
            cur = cur.next;
            i++;
        }
        return null;
    }

    /** 从头/尾择近查找，提升 insertAt/removeAt 的性能 */
    #nodeAt(index: number): Node<T> | null {
        if (index < 0 || index >= this.#size) return null;

        if (index <= (this.#size >> 1)) {
            let i = 0;
            let cur = this.#head;
            while (cur && i < index) {
                cur = cur.next;
                i++;
            }
            return cur ?? null;
        } else {
            let i = this.#size - 1;
            let cur = this.#tail;
            while (cur && i > index) {
                cur = cur.prev;
                i--;
            }
            return cur ?? null;
        }
    }

    #unlink(node: Node<T>): Node<T> {
        const prev = node.prev;
        const next = node.next;

        if (!prev) {
            // node 是 head
            this.#head = next;
        } else {
            prev.next = next;
        }

        if (!next) {
            // node 是 tail
            this.#tail = prev;
        } else {
            next.prev = prev;
        }

        node.prev = null;
        node.next = null;
        this.#size--;
        return node;
    }
}