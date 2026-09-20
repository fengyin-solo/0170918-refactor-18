/**
 * 知识配置平台 - 应用框架
 * 模块化命名空间结构，提供统一的工具方法和组件
 */
(function (global) {
  'use strict';

  // ====================== 应用命名空间 ======================
  var App = global.App || {};

  // ====================== 工具模块 ======================
  App.Utils = {
    /**
     * HTML 转义，防止 XSS
     * @param {string} str 原始字符串
     * @returns {string} 转义后的字符串
     */
    escapeHtml: function (str) {
      var div = document.createElement('div');
      div.textContent = str == null ? '' : str;
      return div.innerHTML;
    },

    /**
     * 生成唯一 ID
     * @param {string} prefix ID 前缀
     * @returns {string} 唯一 ID
     */
    generateId: function (prefix) {
      return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    },

    /**
     * 深拷贝对象
     * @param {*} obj 要拷贝的对象
     * @returns {*} 拷贝后的对象
     */
    deepClone: function (obj) {
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (_) {
        return obj;
      }
    },

    /**
     * 节流函数
     * @param {Function} fn 要执行的函数
     * @param {number} delay 延迟时间（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle: function (fn, delay) {
      var lastTime = 0;
      return function () {
        var now = Date.now();
        if (now - lastTime >= delay) {
          lastTime = now;
          fn.apply(this, arguments);
        }
      };
    },

    /**
     * 防抖函数
     * @param {Function} fn 要执行的函数
     * @param {number} delay 延迟时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce: function (fn, delay) {
      var timer = null;
      return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
          fn.apply(context, args);
        }, delay);
      };
    }
  };

  // ====================== 表格渲染模块 ======================
  App.Table = {
    /**
     * 渲染表格行
     * @param {HTMLElement} tbody 表格 tbody 元素
     * @param {Array} data 数据数组
     * @param {Function} rowRenderer 行渲染函数，返回 HTML 字符串
     * @param {Function} bindEvents 事件绑定函数（可选）
     * @param {Function} rowClassGetter 行 class 生成函数（可选），返回字符串
     */
    render: function (tbody, data, rowRenderer, bindEvents, rowClassGetter) {
      if (!tbody) return;
      tbody.innerHTML = '';

      data.forEach(function (item, index) {
        var tr = document.createElement('tr');
        if (typeof rowClassGetter === 'function') {
          var cls = rowClassGetter(item, index);
          if (cls) tr.className = cls;
        }
        tr.innerHTML = rowRenderer(item, index);
        tbody.appendChild(tr);
      });

      if (typeof bindEvents === 'function') {
        bindEvents(tbody);
      }
    },

    /**
     * 空数据切换：显示空态并隐藏内容块（或最近的 .table-wrap）
     * @param {HTMLElement} emptyEl 空状态元素
     * @param {HTMLElement} blockEl 内容块元素（可选）
     * @param {boolean} isEmpty 是否为空
     */
    toggleEmpty: function (emptyEl, blockEl, isEmpty) {
      if (isEmpty) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (blockEl) blockEl.classList.add('hidden');
      } else {
        if (emptyEl) emptyEl.classList.add('hidden');
        if (blockEl) blockEl.classList.remove('hidden');
      }
    },

    /**
     * 空态 + 表格一体渲染：空数据时清空表格、展示空态；
     * 有数据时隐藏空态、恢复内容块/表格容器并渲染行。
     * @param {Object} opts
     *   tbody        表格 tbody（必填）
     *   data         数据数组
     *   rowRenderer  行渲染函数
     *   bindEvents   事件绑定函数（可选）
     *   rowClassGetter 行 class 生成函数（可选）
     *   emptyEl      空状态元素（可选）
     *   blockEl      有数据时恢复显示的内容块（可选）
     *   wrapEl       空态在卡片内时需一起隐藏的 .table-wrap（可选）；
     *                传 'closest' 表示取 tbody 最近的 .table-wrap（如黑名单）
     */
    renderWithEmpty: function (opts) {
      var tbody = opts.tbody;
      if (!tbody) return;
      var data = opts.data || [];
      var isEmpty = data.length === 0;
      var wrapEl = opts.wrapEl === 'closest' ? tbody.closest('.table-wrap') : opts.wrapEl;

      this.toggleEmpty(opts.emptyEl, opts.blockEl, isEmpty);
      if (wrapEl) wrapEl.style.display = isEmpty ? 'none' : '';

      if (isEmpty) {
        tbody.innerHTML = '';
        return;
      }
      this.render(tbody, data, opts.rowRenderer, opts.bindEvents, opts.rowClassGetter);
    }
  };

  // ====================== 弹窗模块 ======================
  App.Modal = {
    /**
     * 创建弹窗控制器
     * @param {HTMLElement} modalEl 弹窗元素
     * @param {Function} onClose 点击遮罩层关闭时的回调（可选），传入即自动绑定
     * @returns {Object} 弹窗控制器
     */
    create: function (modalEl, onClose) {
      var controller = {
        el: modalEl,
        open: function () {
          if (modalEl) modalEl.style.display = 'flex';
        },
        close: function () {
          if (modalEl) modalEl.style.display = 'none';
        },
        isOpen: function () {
          return modalEl && modalEl.style.display === 'flex';
        }
      };
      if (typeof onClose === 'function') {
        App.Modal.bindOverlayClose(modalEl, function () {
          onClose(controller);
        });
      }
      return controller;
    },

    /**
     * 绑定弹窗关闭事件（点击遮罩层关闭）
     * @param {HTMLElement} modalEl 弹窗元素
     * @param {Function} onClose 关闭回调
     */
    bindOverlayClose: function (modalEl, onClose) {
      if (!modalEl) return;
      modalEl.addEventListener('click', function (e) {
        if (e.target === modalEl) {
          if (typeof onClose === 'function') onClose();
        }
      });
    }
  };

  // ====================== 表单模块 ======================
  App.Form = {
    /**
     * 读取单个控件的字符串值（去掉首尾空白；checkbox 返回勾选状态）
     * @param {string|HTMLElement} el 元素或元素 id
     */
    value: function (el) {
      el = typeof el === 'string' ? document.getElementById(el) : el;
      if (!el) return '';
      if (el.type === 'checkbox') return el.checked;
      return (el.value || '').trim();
    },

    /**
     * 按 [{ id }] / [{ el }] 配置批量读取字符串值
     * @param {Array} fields 元素、id 字符串或 { id/el, name } 配置
     * @returns {Object} 以 name（缺省取 id）为键的值对象
     */
    getValues: function (fields) {
      var data = {};
      (fields || []).forEach(function (field) {
        var el = App.Form._resolve(field);
        if (!el) return;
        var key = (field && (field.name || field.id)) || el.id;
        data[key] = App.Form.value(el);
      });
      return data;
    },

    /**
     * 批量回填控件值，配置同 getValues，值取自 data[name]
     */
    setValues: function (fields, data) {
      data = data || {};
      (fields || []).forEach(function (field) {
        var el = App.Form._resolve(field);
        if (!el) return;
        var key = (field && (field.name || field.id)) || el.id;
        if (data[key] === undefined || data[key] === null) return;
        if (el.type === 'checkbox') el.checked = !!data[key];
        else el.value = data[key];
      });
    },

    /**
     * 批量清空控件（文本类置空，checkbox 取消勾选）
     */
    clear: function (fields) {
      (fields || []).forEach(function (field) {
        var el = App.Form._resolve(field);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });
    },

    /**
     * 读取一组 checkbox 当前勾选的 value 列表
     * @param {string|HTMLElement} container checkbox 的共同容器或选择器起点
     * @param {string} selector checkbox 选择器，默认 'input[type="checkbox"]:checked'
     */
    checkedValues: function (container, selector) {
      if (typeof container === 'string') container = document.getElementById(container) || document.querySelector(container);
      if (!container) return [];
      var ids = [];
      container.querySelectorAll(selector || 'input[type="checkbox"]:checked').forEach(function (cb) {
        ids.push(cb.value);
      });
      return ids;
    },

    /**
     * 多行文本拆分为去空白、去空行后的数组
     */
    lines: function (text) {
      return String(text == null ? '' : text).trim().split(/\n/).map(function (s) {
        return s.trim();
      }).filter(Boolean);
    },

    /**
     * 必填校验：
     *   新签名 validate(values, rules)  rules: [{ name, label, message? }]
     *   旧签名 validate(data, requiredFields, labels) 继续兼容
     * @returns {{ valid: boolean, message: string }}
     */
    validate: function (values, requiredFields, labels) {
      var rules;
      if (Array.isArray(requiredFields) && requiredFields.length && typeof requiredFields[0] === 'object') {
        rules = requiredFields;
      } else {
        labels = labels || {};
        rules = (requiredFields || []).map(function (name) {
          return { name: name, label: labels[name] || name, message: '请填写' + (labels[name] || name) };
        });
      }
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var val = values[rule.name];
        if (val === undefined || val === null || val === '' || val === false ||
            (Array.isArray(val) && val.length === 0)) {
          return { valid: false, message: rule.message || '请填写' + (rule.label || rule.name), rule: rule };
        }
      }
      return { valid: true };
    },

    /** 内部：把元素/id/配置解析为 DOM 元素 */
    _resolve: function (field) {
      if (!field) return null;
      if (typeof field === 'string') return document.getElementById(field);
      if (field.nodeType) return field;
      return field.el ? (typeof field.el === 'string' ? document.getElementById(field.el) : field.el)
        : document.getElementById(field.id);
    },

    // ---- 以下为早期接口，继续保留以兼容既有调用 ----
    /**
     * 获取表单数据
     * @param {Object} fields 字段配置 { fieldName: elementId }
     * @returns {Object} 表单数据
     */
    getData: function (fields) {
      var data = {};
      Object.keys(fields).forEach(function (key) {
        var el = document.getElementById(fields[key]);
        if (el) {
          if (el.type === 'checkbox') {
            data[key] = el.checked;
          } else {
            data[key] = el.value.trim();
          }
        }
      });
      return data;
    },

    /**
     * 设置表单数据
     * @param {Object} fields 字段配置 { fieldName: elementId }
     * @param {Object} data 表单数据
     */
    setData: function (fields, data) {
      Object.keys(fields).forEach(function (key) {
        var el = document.getElementById(fields[key]);
        if (el && data[key] !== undefined) {
          if (el.type === 'checkbox') {
            el.checked = !!data[key];
          } else {
            el.value = data[key];
          }
        }
      });
    },

    /**
     * 重置表单
     * @param {Object} fields 字段配置 { fieldName: elementId }
     */
    reset: function (fields) {
      Object.keys(fields).forEach(function (key) {
        var el = document.getElementById(fields[key]);
        if (el) {
          if (el.type === 'checkbox') {
            el.checked = false;
          } else {
            el.value = '';
          }
        }
      });
    }
  };

  // ====================== 知识表单助手 ======================
  // 四个页面共用的「标准问 / 相似问（多行）/ 答案」取值、回填、清空
  App.KnowledgeForm = {
    IDS: { standardQ: 'formStandardQ', similarQ: 'formSimilarQ', answer: 'formAnswer' },

    /** 读取知识表单：相似问按行拆分、去空白去空行，其余 trim */
    read: function () {
      return {
        standardQ: App.Form.value(this.IDS.standardQ),
        similarQs: App.Form.lines(document.getElementById(this.IDS.similarQ).value),
        answer: App.Form.value(this.IDS.answer)
      };
    },

    /** 用知识条目回填弹窗（编辑场景） */
    fill: function (k) {
      k = k || {};
      document.getElementById(this.IDS.standardQ).value = k.standardQ || '';
      document.getElementById(this.IDS.similarQ).value = (k.similarQs || []).join('\n');
      document.getElementById(this.IDS.answer).value = k.answer || '';
    },

    /** 清空三个字段（新增场景） */
    clear: function () {
      document.getElementById(this.IDS.standardQ).value = '';
      document.getElementById(this.IDS.similarQ).value = '';
      document.getElementById(this.IDS.answer).value = '';
    }
  };

  // ====================== 下拉框模块 ======================
  App.Select = {
    /**
     * 把数据列表映射为 { value, label } 选项数组
     * @param {Array} list 源数据
     * @param {Function|string} labelFn 标签生成函数 (item)=>label，或取该字段名
     * @param {string} valueKey 值字段名，默认 'id'
     */
    mapOptions: function (list, labelFn, valueKey) {
      valueKey = valueKey || 'id';
      return (list || []).map(function (item) {
        var label = typeof labelFn === 'function'
          ? labelFn(item)
          : (item[labelFn] != null ? item[labelFn] : item.name);
        return { value: item[valueKey], label: label };
      });
    },

    /**
     * 填充下拉选项
     * @param {HTMLElement} selectEl 下拉框元素
     * @param {Array} options 选项数组 [{ value, label }]
     * @param {string} placeholder 占位提示
     * @param {string} selectedValue 选中值
     */
    fill: function (selectEl, options, placeholder, selectedValue) {
      if (!selectEl) return;
      selectEl.innerHTML = '';

      if (placeholder) {
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = placeholder;
        selectEl.appendChild(opt0);
      }

      options.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = item.label;
        selectEl.appendChild(opt);
      });

      if (selectedValue !== undefined) {
        selectEl.value = selectedValue;
      }
    },
    /**
     * 填充分组下拉选项
     * @param {HTMLElement} selectEl 下拉框元素
     * @param {Object} groups 分组数据 { groupLabel: [{ value, label }] }
     * @param {string} placeholder 占位提示
     * @param {string} selectedValue 选中值
     */
    fillGrouped: function (selectEl, groups, placeholder, selectedValue) {
      if (!selectEl) return;
      selectEl.innerHTML = '';
      
      if (placeholder) {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = placeholder;
        selectEl.appendChild(opt);
      }
      
      Object.keys(groups).forEach(function (groupLabel) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = groupLabel;
        
        groups[groupLabel].forEach(function (item) {
          var opt = document.createElement('option');
          opt.value = item.value;
          opt.textContent = item.label;
          optgroup.appendChild(opt);
        });
        
        selectEl.appendChild(optgroup);
      });
      
      if (selectedValue !== undefined) {
        selectEl.value = selectedValue;
      }
    }
  };

  // ====================== 页面控制器基类 ======================
  App.PageController = {
    /**
     * 创建页面控制器
     * @param {Object} config 配置项
     * @returns {Object} 页面控制器实例
     */
    create: function (config) {
      var controller = {
        name: config.name || 'Page',
        state: config.initialState || {},
        
        // 初始化
        init: function () {
          if (typeof config.init === 'function') {
            config.init.call(this);
          }
        },
        
        // 更新状态
        setState: function (newState) {
          Object.assign(this.state, newState);
          if (typeof config.onStateChange === 'function') {
            config.onStateChange.call(this, this.state);
          }
        },
        
        // 获取状态
        getState: function (key) {
          return key ? this.state[key] : this.state;
        },
        
        // 渲染
        render: function () {
          if (typeof config.render === 'function') {
            config.render.call(this);
          }
        },
        
        // 绑定事件
        bindEvents: function () {
          if (typeof config.bindEvents === 'function') {
            config.bindEvents.call(this);
          }
        }
      };
      
      return controller;
    }
  };

  // ====================== 导出到全局 ======================
  global.App = App;

})(typeof window !== 'undefined' ? window : this);
