const compileUtil = {
  getValue(expr, vm) {
    //分割且遍历数组，从vm.data中寻找值
    return expr.split('.').reduce((calcData, currentValue) => {
      return calcData[currentValue]
    }, vm.$data)
  },
  text(node, expr, vm) {
    let value
    if (expr.indexOf('{{') !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        //循环参数为args[0]为匹配正则得字符串，arg[1]为匹配得正则括号内容
        new Watcher(vm, args[1], () => {
          this.updater.textUpdater(node, this.getContentVal(expr, vm))
        })
        return this.getValue(args[1], vm)
      })
    } else {
      value = this.getValue(expr, vm)
    }
    this.updater.textUpdater(node, value)
  },
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      //循环参数为args[0]为匹配正则得字符串，arg[1]为匹配得正则括号内容
      return this.getValue(args[1], vm)
    })
  },
  html(node, expr, vm) {
    const value = this.getValue(expr, vm)
    new Watcher(vm, expr, newValue => {
      this.updater.htmlUpdater(node, newValue)
    })
    this.updater.htmlUpdater(node, value)
  },
  //双向绑定
  model(node, expr, vm) {
    const value = this.getValue(expr, vm)
    //绑定数据， 数据影响视图
    new Watcher(vm, expr, newValue => {
      this.updater.modeUpdater(node, newValue)
    })
    //视图影响数据从而影响视图
    node.addEventListener('input', e => {
      this.setVal(expr, vm, e.target.value)
    })
    this.updater.modeUpdater(node, value)
  },
  setVal(expr, vm, inputValue) {
    let exprArr = expr.split('.')
    return expr.split('.').reduce((calcData, currentValue, Index) => {
      if (Index === exprArr.length - 1) {
        calcData[currentValue] = inputValue
      }
      return calcData[currentValue]
    }, vm.$data)
  },
  on(node, expr, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expr]
    node.addEventListener(eventName, fn.bind(vm), false)
  },
  //类似v-bind:src
  bind(node, expr, vm, attrName) {
    const value = this.getValue(expr, vm)
    new Watcher(vm, expr, newValue => {
      this.updater.bindUpdatter(node, attrName, newValue)
    })
    this.updater.bindUpdatter(node, attrName, value)
  },
  updater: {
    textUpdater(node, value) {
      node.textContent = value
    },
    htmlUpdater(node, value) {
      node.innerHTML = value
    },
    modeUpdater(node, value) {
      node.value = value
    },
    bindUpdatter(node, attrName, value) {
      node[attrName] = value
    }
  }
}
class Complie {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    //1.获取文档对象,放入内存中处理,性能优化
    const fragment = this.node2Fragment(this.el)
    //2.编译处理
    this.compile(fragment)
    //3.把节点放回根元素
    this.el.appendChild(fragment)
  }
  // 判断是否元素节点
  //TIPS:1元素节点2属性节点（准备废弃）3文本节点
  isElementNode(node) {
    return node.nodeType === 1
  }
  node2Fragment(el) {
    //创建文档碎片
    const fragment = document.createDocumentFragment()
    let firstChild
    //这一步会将页面所有dom移到内存碎片中，所以页面会空白
    while ((firstChild = el.firstChild)) {
      fragment.appendChild(firstChild)
    }
    return fragment
  }
  compile(fragment) {
    //1.获取子节点
    const childNodes = fragment.childNodes //childNodes返回类数组，集合，所以后面要转化为数组
    const ArrayType = [...childNodes]
    ArrayType.forEach(child => {
      //元素节点
      if (this.isElementNode(child)) {
        this.compileElement(child)
      } else {
        this.compileText(child)
      }
      //如果有子元素
      if (child.childNodes && childNodes.length) {
        this.compile(child)
      }
    })
  }
  compileElement(node) {
    //编译带指令元素
    const attributes = node.attributes
    let attrArray = [...attributes]
    attrArray.forEach(attr => {
      const { name, value } = attr
      if (this.isDirective(name)) {
        const [, directive] = name.split('-')
        const [dirname, eventName] = directive.split(':') //v-on:click  v-bind:src
        // 根据指令更新数据
        compileUtil[dirname](node, value, this.vm, eventName)
        //删除指令
        node.removeAttribute('v-' + directive)
      } else if (this.isEventName(name)) {
        //处理@click等等事件
        let [, eventName] = name.split('@')
        compileUtil['on'](node, value, this.vm, eventName)
      }
    })
  }
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  isEventName(attrName) {
    return attrName.startsWith('@')
  }
  compileText(node) {
    //编译{{}}
    const content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      compileUtil['text'](node, content, this.vm)
    }
  }
}

class Vue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    if (this.$el) {
      //1.实现数据观察者
      new Observer(this.$data)
      //2.实现解析器
      new Complie(this.$el, this)
      this.proxyData(this.$data)
    }
  }
  //数据代理
  proxyData(data) {
    for (const key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key]
        },
        set(newValue) {
          data[key] = newValue
        }
      })
    }
  }
}
