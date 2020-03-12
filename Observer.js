class Dep {
  constructor() {
    this.subs = []
  }
  //收集观察者
  addSub(watcher) {
    this.subs.push(watcher)
  }
  //通知观察者
  notify() {
    this.subs.forEach(watcher => {
      watcher.update()
    })
  }
}
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    //获取旧值保存起来，与新值比较变化
    this.oldVal = this.getOldValue()
  }
  getOldValue() {
    //target为的是让Dep与Watcher建立联系
    Dep.target = this
    let oldValue = compileUtil.getValue(this.expr, this.vm)
    Dep.target = null
    return oldValue
  }
  update() {
    let newValue = compileUtil.getValue(this.expr, this.vm)
    if (newValue !== this.oldVal) {
      this.cb(newValue)
    }
  }
}
class Observer {
  constructor(data) {
    this.observer(data)
  }
  observer(data) {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key])
      })
    }
  }
  defineReactive(data, key, value) {
    //解决SET时this指向问题
    let self = this
    //递归
    this.observer(value)
    const dep = new Dep()
    // arg1:obj,要在其上定义属性的对象。
    // arg2:prop,要定义或修改的属性的名称。
    // arg3:descriptor,将被定义或修改的属性描述符。
    //劫持数据
    Object.defineProperty(data, key, {
      enumerable: true,
      configurable: false,
      get() {
        //一开始时就应该创建观察者，放入订阅数组中
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set(newValue) {
        self.observer(newValue)
        if (newValue !== value) {
          value = newValue
        }
        //通知Dep变化
        dep.notify()
      }
    })
  }
}
