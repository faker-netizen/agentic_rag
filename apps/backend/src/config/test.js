class Stack {
    // TODO：内部用数组保存元素
    constructor(){
        this.arr=[]
    }
    pop(){
        if(!this.arr.length)return
        return this.arr.pop()
    }
    push(n){
        this.arr.push(n)
    }
}

/**
 * @param {'letters' | 'numbers'} kind
 */
function runStackScenario(kind) {
    const stack = new Stack();
    if (kind === 'letters') {
        stack.push('a');
        stack.push('b');
        stack.push('c');
        return [stack.pop(), stack.pop(), stack.pop()];
    }
    if (kind === 'numbers') {
        stack.push(1);
        stack.push(2);
        stack.push(3);
        return [stack.pop(), stack.pop(), stack.pop()];
    }
}

console.log(runStackScenario("letters"))