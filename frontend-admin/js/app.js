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
    },

    /**
     * 将多行文本拆分为非空行（去除首尾空白，过滤空行）
     * @param {string} text 原始多行文本
     * @returns {string[]} 非空行数组
     */
    splitLines: function (text) {
      return (text || '').trim().split(/\n/).map(function (s) {
        return s.trim();
      }).filter(Boolean);
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
     * @param {Function|string} rowClass 行类名：字符串或 (item, index) => string（可选）
     */
    render: function (tbody, data, rowRenderer, bindEvents, rowClass) {
      if (!tbody) return;
      data = data || [];
      tbody.innerHTML = '';

      data.forEach(function (item, index) {
        var tr = document.createElement('tr');
        var cls = typeof rowClass === 'function' ? rowClass(item, index) : rowClass;
        if (cls) tr.className = cls;
        tr.innerHTML = rowRenderer(item, index);
        tbody.appendChild(tr);
      });

      if (typeof bindEvents === 'function') {
        bindEvents(tbody);
      }
    },

    /**
     * 渲染表格并统一切换空状态（空数据/单条/多条渲染结果一致）
     * 空数据时：清空 tbody、展示空状态元素、隐藏内容块；不执行 bindEvents
     * @param {Object} opts
     *   tbody: 表格 tbody 元素
     *   data: 数据数组
     *   rowRenderer: 行渲染函数，返回 HTML 字符串
     *   emptyEl: 空状态元素（可选，默认仅清空 tbody）
     *   blockEl: 有数据时展示的内容块（可选）
     *   bindEvents: 事件绑定函数（可选）
     *   rowClass: 行类名，字符串或函数（可选）
     */
    renderOrEmpty: function (opts) {
      var data = opts.data || [];
      if (opts.emptyEl || opts.blockEl) {
        this.toggleEmpty(opts.emptyEl || null, opts.blockEl || null, data.length === 0);
      }
      if (data.length === 0) {
        if (opts.tbody) opts.tbody.innerHTML = '';
        return;
      }
      this.render(opts.tbody, data, opts.rowRenderer, opts.bindEvents, opts.rowClass);
    },

    /**
     * 显示空状态
     * @param {HTMLElement} emptyEl 空状态元素
     * @param {HTMLElement} blockEl 内容块元素
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
    }
  };

  // ====================== 弹窗模块 ======================
  App.Modal = {
    /**
     * 创建弹窗控制器（弹窗开关的统一入口）
     * @param {HTMLElement} modalEl 弹窗元素
     * @param {Object} options 配置项（可选）
     *   onClose: 任意方式关闭（取消/遮罩/close）时的回调
     *   overlayClose: 是否绑定点击遮罩关闭，默认 true
     * @returns {Object} 弹窗控制器
     */
    create: function (modalEl, options) {
      options = options || {};
      var overlayBound = false;
      var controller = {
        el: modalEl,
        open: function () {
          if (modalEl) modalEl.style.display = 'flex';
        },
        close: function () {
          if (modalEl) modalEl.style.display = 'none';
          if (typeof options.onClose === 'function') options.onClose();
        },
        isOpen: function () {
          return !!modalEl && modalEl.style.display === 'flex';
        }
      };
      if (options.overlayClose !== false && modalEl && !overlayBound) {
        this.bindOverlayClose(modalEl, function () {
          controller.close();
        });
        overlayBound = true;
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
    },

    /**
     * 验证必填字段
     * 两种用法（向后兼容）：
     *   validate(data, ['fieldA'], { fieldA: '字段A' })
     *   validate(data, [{ field: 'fieldA', label: '字段A', message: '请选择字段A' }])
     * 规则为对象时：message 优先，其次「请填写 + label/字段名」
     * @param {Object} data 表单数据
     * @param {Array} requiredFields 必填规则：字段名或 { field, label, message }
     * @param {Object} labels 字段标签映射（字段名形式时生效）
     * @returns {Object} { valid: boolean, message: string }
     */
    validate: function (data, requiredFields, labels) {
      labels = labels || {};
      for (var i = 0; i < requiredFields.length; i++) {
        var rule = requiredFields[i];
        var field, message;
        if (rule && typeof rule === 'object') {
          field = rule.field;
          message = rule.message || ('请填写' + (rule.label || field));
        } else {
          field = rule;
          message = '请填写' + (labels[field] || field);
        }
        if (!data[field]) {
          return {
            valid: false,
            message: message
          };
        }
      }
      return { valid: true };
    }
  };

  // ====================== 下拉框模块 ======================
  App.Select = {
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
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = placeholder;
        selectEl.appendChild(opt);
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
