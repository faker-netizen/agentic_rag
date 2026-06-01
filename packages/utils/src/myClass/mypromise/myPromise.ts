const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";
type promiseStatus = 'pending' | 'fulfilled' | 'rejected'

class myPromise {
    state: promiseStatus = 'pending'
    value: unknown = undefined
    handlers: Function[] = []

    /**
     * @param {Function} executor
     */
    constructor(executor: Function) {
        this.state = 'pending'
        this.value = undefined
        this.handlers = []
        try {
            executor(this.resolve.bind(this), this.reject.bind(this))
        } catch (err) {
            this.reject(err)
            console.error(err)
        }
    }

    changeState(state: promiseStatus, data:unknown) {
        if (this.state === 'fulfilled') return
        this.state = state
        this.value = data
        this.runHandlers()

    }

    runHandlers() {
        if(this.state==='pending'){
            return
        }
        while(this.handlers.length){
            this.runHandlers()
        }
    }
    runHandleHandler(){
        
    }

    resolve(data: unknown) {
        this.changeState('fulfilled', data)
    }

    reject(data: unknown) {
        this.changeState('rejected', data)
    }
}