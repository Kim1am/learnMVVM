function Mvvm(options = {}) {
  this.$options = options
  let data = (this._data = this.$options.data)
  // 数据代理
  for (let key in data) {
    Object.defineProperty(this, key, {
      configurable: true,
      enumerable: true,
      get() {
        return this._data[key]
      },
      set(newValue) {
        this._data[key] = newValue
      }
    })
  }
  observe(data)
  new Compile(options.el, this)
}

// 数据劫持
function Observe(data) {
  let dep = new Dep()
  for (let key in data) {
    let val = data[key]
    observe(val)
    Object.defineProperty(data, key, {
      configurable: true,
      enumerable: true,
      get() {
        Dep.target && dep.addSub(Dep.target)
        console.log(Dep.target)
        return val
      },
      set(newValue) {
        if (val === newValue) {
          return
        }
        val = newValue
        observe(newValue)
        dep.notify()
      }
    })
  }
}

function observe(data) {
  if (!data || typeof data !== 'object') {
    return
  }
  return new Observe(data)
}

// 创建Compile构造函数
function Compile(el, vm) {
  // 将el挂载到实例上方便调用
  vm.$el = document.querySelector(el)
  // 在el范围里将内容都拿到，当然不能一个一个的拿
  // 可以选择移到内存中去然后放入文档碎片中，节省开销
  let fragment = document.createDocumentFragment()

  while ((child = vm.$el.firstChild)) {
    fragment.appendChild(child) // 此时将el中的内容放入内存中
  }
  // 对el里面的内容进行替换
  function replace(frag) {
    Array.from(frag.childNodes).forEach(node => {
      let txt = node.textContent
      let reg = /\{\{(.*?)\}\}/g // 正则匹配{{}}

      if (node.nodeType === 3 && reg.test(txt)) {
        // 即是文本节点又有大括号的情况{{}}
        function replaceTxt() {
          // replace 使用第二参数函数替换所有匹配正则表达式
          // match 为匹配正则的字符串   "{{A.B}}"
          // palceholder匹配的第n个括号字符串   A.B
          node.textContent = txt.replace(reg, (matched, placeholder) => {
            // vm为初始值，val为上一次return的值，key为当前值
            new Watcher(vm, placeholder, replaceTxt)
            return placeholder.split('.').reduce((val, key) => {
              return val[key.trim()]
            }, vm)
          })
        }
        // 替换
        replaceTxt()
      }
      // 如果还有子节点，继续递归replace
      if (node.childNodes && node.childNodes.length) {
        replace(node)
      }
    })
  }

  replace(fragment) // 替换内容

  vm.$el.appendChild(fragment) // 再将文档碎片放入el中
}

// 发布和订阅模式
function Dep() {
  this.subs = []
}

Dep.prototype = {
  addSub(sub) {
    this.subs.push(sub)
  },
  notify() {
    this.subs.forEach(sub => {
      sub.update()
    })
  }
}

// 监听
function Watcher(vm, exp, fn) {
  this.vm = vm
  this.exp = exp
  this.fn = fn
  console.log(this)
  Dep.target = this
  let arr = exp.split('.')
  let val = vm
  arr.forEach(key => {
    // 取值
    val = val[key.trim()] // 获取到this.a.b，默认就会调用get方法
  })
  Dep.target = null
}

Watcher.prototype.update = function() {
  this.fn()
}
