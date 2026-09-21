/**
 * 行业知识页面 - 模块化控制器
 * @module IndustryPage
 */
(function (global) {
  'use strict';

  var Utils = App.Utils;
  var Table = App.Table;
  var Modal = App.Modal;
  var Select = App.Select;
  var Form = App.Form;

  var NEW_LEVEL1_VALUE = '__new__';
  var NEW_LEVEL2_VALUE = '__new_level2__';

  // ====================== 页面状态 ======================
  var state = {
    industries: [],
    currentIndustryId: '',
    editingIndustryId: null,
    editingKnowledgeId: null,
    level1Options: [],
    level2Map: {}
  };

  /** 弹窗控制器（统一开关入口） */
  var modals = {};

  /** 行业表单字段映射（一级下拉的特殊取值在 save 中处理） */
  var industryFields = {
    level1: 'industryFormLevel1',
    level2: 'industryFormLevel2',
    newLevel1: 'industryFormNewLevel1',
    newLevel2: 'industryFormNewLevel2'
  };

  /** 知识表单字段映射 */
  var knowledgeFields = {
    standardQ: 'formStandardQ',
    similarQs: 'formSimilarQ',
    answer: 'formAnswer'
  };

  // ====================== DOM 元素缓存 ======================
  var elements = {};

  function cacheElements() {
    elements = {
      btnAddIndustry: document.getElementById('btnAddIndustry'),
      industryTableBody: document.getElementById('industryTableBody'),
      industrySelect: document.getElementById('industrySelect'),
      btnAddKnowledge: document.getElementById('btnAddKnowledge'),
      knowledgeEmpty: document.getElementById('knowledgeEmpty'),
      knowledgeBlock: document.getElementById('knowledgeBlock'),
      knowledgeTableBody: document.getElementById('knowledgeTableBody'),
      industryModal: document.getElementById('industryModal'),
      industryModalTitle: document.getElementById('industryModalTitle'),
      industryFormLevel1: document.getElementById('industryFormLevel1'),
      industryFormLevel2: document.getElementById('industryFormLevel2'),
      industryFormNewLevel1Wrap: document.getElementById('industryFormNewLevel1Wrap'),
      industryFormNewLevel1: document.getElementById('industryFormNewLevel1'),
      industryFormLevel2Wrap: document.getElementById('industryFormLevel2Wrap'),
      industryFormNewLevel2Wrap: document.getElementById('industryFormNewLevel2Wrap'),
      industryFormNewLevel2: document.getElementById('industryFormNewLevel2'),
      industryModalCancel: document.getElementById('industryModalCancel'),
      industryModalSubmit: document.getElementById('industryModalSubmit'),
      knowledgeModal: document.getElementById('knowledgeModal'),
      knowledgeModalTitle: document.getElementById('knowledgeModalTitle'),
      knowledgeFormIndustryWrap: document.getElementById('knowledgeFormIndustryWrap'),
      knowledgeFormIndustry: document.getElementById('knowledgeFormIndustry'),
      formStandardQ: document.getElementById('formStandardQ'),
      formSimilarQ: document.getElementById('formSimilarQ'),
      formAnswer: document.getElementById('formAnswer'),
      knowledgeModalCancel: document.getElementById('knowledgeModalCancel'),
      knowledgeModalSubmit: document.getElementById('knowledgeModalSubmit')
    };
  }

  // ====================== 行业管理 ======================
  var IndustryManager = {
    render: function () {
      state.industries = MockStore.getIndustries();
      var level1Only = state.industries.filter(function (i) { return !i.level2; });
      var level2List = state.industries.filter(function (i) { return i.level2; });
      
      var level1Order = [];
      level1Only.forEach(function (i) {
        if (level1Order.indexOf(i.level1) === -1) level1Order.push(i.level1);
      });
      level2List.forEach(function (i) {
        if (level1Order.indexOf(i.level1) === -1) level1Order.push(i.level1);
      });
      
      var rows = [];
      level1Order.forEach(function (l1) {
        var parent = level1Only.find(function (i) { return i.level1 === l1; });
        var children = level2List.filter(function (i) { return i.level1 === l1; });
        
        if (parent) {
          rows.push({ type: 'parent', data: parent });
        }
        children.forEach(function (c) {
          rows.push({ type: 'child', data: c, hasParent: !!parent });
        });
      });

      Table.render(elements.industryTableBody, rows, function (row) {
        var i = row.data;
        if (row.type === 'parent') {
          return '<td class="text-slate-900 font-medium">' + Utils.escapeHtml(i.level1) + '</td>' +
            '<td class="text-slate-600">一级</td>' +
            '<td class="text-slate-500">※</td>' +
            '<td class="text-right">' +
              '<button type="button" class="btn-link ind-edit mr-2" data-id="' + i.id + '">编辑</button>' +
              '<button type="button" class="btn-link btn-link-danger ind-delete" data-id="' + i.id + '">删除</button>' +
            '</td>';
        } else {
          return '<td class="' + (row.hasParent ? 'pl-10 ' : '') + 'text-slate-700">' + Utils.escapeHtml(i.level2) + '</td>' +
            '<td class="text-slate-600">二级</td>' +
            '<td class="text-slate-600">' + Utils.escapeHtml(i.level1) + '</td>' +
            '<td class="text-right">' +
              '<button type="button" class="btn-link ind-edit mr-2" data-id="' + i.id + '">编辑</button>' +
              '<button type="button" class="btn-link btn-link-danger ind-delete" data-id="' + i.id + '">删除</button>' +
            '</td>';
        }
      }, this.bindTableEvents.bind(this));
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.ind-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.ind-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Confirm.show('确定删除该行业？其下知识将一并清除。', function () {
            MockStore.deleteIndustry(btn.dataset.id);
            if (state.currentIndustryId === btn.dataset.id) {
              state.currentIndustryId = '';
            }
            self.render();
            self.fillSelect();
            KnowledgeManager.render();
            Toast.show('行业删除成功', 'success');
          });
        });
      });
    },

    fillSelect: function () {
      var byLevel1 = {};
      state.industries.forEach(function (i) {
        if (!byLevel1[i.level1]) byLevel1[i.level1] = [];
        byLevel1[i.level1].push(i);
      });
      
      var level1Order = state.level1Options.filter(function (l1) { return byLevel1[l1]; });
      Object.keys(byLevel1).forEach(function (l1) {
        if (level1Order.indexOf(l1) === -1) level1Order.push(l1);
      });
      
      var groups = {};
      level1Order.forEach(function (l1) {
        groups[l1] = byLevel1[l1].map(function (i) {
          return {
            value: i.id,
            label: i.level2 ? (i.level2 + '（二级）') : '（一级）'
          };
        });
      });
      
      Select.fillGrouped(elements.industrySelect, groups, '全部行业', state.currentIndustryId);
    },

    fillLevel1: function () {
      var existingLevel1 = state.industries.filter(function (i) { return !i.level2; }).map(function (i) { return i.level1; });
      var seen = {};
      var options = [];
      existingLevel1.forEach(function (v) {
        if (seen[v]) return;
        seen[v] = true;
        options.push({ value: v, label: v });
      });
      options.push({ value: NEW_LEVEL1_VALUE, label: '＋ 新建一级行业' });
      Select.fill(elements.industryFormLevel1, options, '请选择一级行业');
    },

    fillLevel2: function (level1) {
      elements.industryFormLevel2.disabled = !level1 || level1 === NEW_LEVEL1_VALUE;
      elements.industryFormNewLevel2Wrap.classList.add('hidden');
      elements.industryFormNewLevel2.value = '';

      var options = [];
      if (level1 && level1 !== NEW_LEVEL1_VALUE) {
        var preset = state.level2Map[level1] || [];
        var existing = state.industries.filter(function (i) {
          return i.level1 === level1 && i.level2;
        }).map(function (i) { return i.level2; });
        var merged = preset.slice();
        existing.forEach(function (v) {
          if (merged.indexOf(v) === -1) merged.push(v);
        });
        merged.forEach(function (v) {
          options.push({ value: v, label: v });
        });
        options.push({ value: NEW_LEVEL2_VALUE, label: '＋ 新建二级行业' });
      }
      // 未选择一级行业时的引导文案仍作为占位项
      Select.fill(elements.industryFormLevel2, options, '不填则新增一级行业');
    },

    openModal: function (id) {
      state.editingIndustryId = id || null;
      elements.industryModalTitle.textContent = id ? '编辑行业' : '新增行业';
      elements.industryFormNewLevel1.value = '';
      this.fillLevel1();

      if (id) {
        var ind = state.industries.find(function (i) { return i.id === id; });
        if (ind) {
          elements.industryFormLevel1.value = ind.level1;
          elements.industryFormNewLevel1Wrap.classList.add('hidden');
          elements.industryFormLevel2Wrap.classList.remove('hidden');
          this.fillLevel2(ind.level1);
          elements.industryFormLevel2.value = ind.level2;
        }
      } else {
        elements.industryFormNewLevel1Wrap.classList.add('hidden');
        elements.industryFormLevel2Wrap.classList.remove('hidden');
        Select.fill(elements.industryFormLevel2, [], '请先选择一级行业');
        elements.industryFormLevel2.disabled = true;
      }

      modals.industry.open();
    },

    closeModal: function () {
      modals.industry.close();
    },

    save: function () {
      var form = Form.getData(industryFields);
      var level1;
      var level2 = form.level2;
      if (level2 === NEW_LEVEL2_VALUE) {
        level2 = form.newLevel2;
      }

      if (form.level1 === NEW_LEVEL1_VALUE) {
        level1 = form.newLevel1;
        level2 = '';
        if (!level1) {
          Toast.show('请输入新一级行业名称', 'error');
          return;
        }
      } else {
        level1 = form.level1;
        if (!level1) {
          Toast.show('请选择一级行业', 'error');
          return;
        }
        if (!state.editingIndustryId && !level2) {
          Toast.show('新增二级时请选择或输入二级行业；若仅新增一级请选择"＋ 新建一级行业"并输入名称', 'error');
          return;
        }
      }

      if (state.editingIndustryId) {
        MockStore.updateIndustry(state.editingIndustryId, level1, level2);
        Toast.show('行业信息更新成功', 'success');
      } else {
        MockStore.createIndustry(level1, level2);
        Toast.show('行业创建成功', 'success');
      }

      this.closeModal();
      this.render();
      this.fillSelect();
    }
  };

  // ====================== 知识管理 ======================
  var KnowledgeManager = {
    render: function () {
      var list = [];
      var allIndustries = MockStore.getIndustries();
      
      if (state.currentIndustryId) {
        allIndustries.forEach(function (i) {
          if (i.id !== state.currentIndustryId) return;
          (MockStore.getIndustryKnowledge(i.id) || []).forEach(function (k) {
            list.push({ industryId: i.id, industryName: i.name, data: k });
          });
        });
      } else {
        allIndustries.forEach(function (i) {
          (MockStore.getIndustryKnowledge(i.id) || []).forEach(function (k) {
            list.push({ industryId: i.id, industryName: i.name, data: k });
          });
        });
      }

      Table.renderOrEmpty({
        tbody: elements.knowledgeTableBody,
        data: list,
        emptyEl: elements.knowledgeEmpty,
        blockEl: elements.knowledgeBlock,
        rowRenderer: function (row) {
          var k = row.data;
          return '<td class="text-subtle text-sm">' + Utils.escapeHtml(row.industryName) + '</td>' +
            '<td class="text-obsidian">' + Utils.escapeHtml(k.standardQ || '') + '</td>' +
            '<td class="text-subtle">' + Utils.escapeHtml((k.similarQs || []).join('；')) + '</td>' +
            '<td class="text-charcoal max-w-xs truncate">' + Utils.escapeHtml(k.answer || '') + '</td>' +
            '<td class="text-right">' +
              '<button type="button" class="btn-link k-edit mr-2" data-id="' + k.id + '" data-iid="' + row.industryId + '">编辑</button>' +
              '<button type="button" class="btn-link btn-link-danger k-delete" data-id="' + k.id + '" data-iid="' + row.industryId + '">删除</button>' +
            '</td>';
        },
        bindEvents: this.bindTableEvents.bind(this)
      });
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.k-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var iid = btn.dataset.iid || state.currentIndustryId;
          if (iid) {
            state.currentIndustryId = iid;
            elements.industrySelect.value = iid;
          }
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.k-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var iid = btn.dataset.iid || state.currentIndustryId;
          Confirm.show('确定删除这条知识？', function () {
            MockStore.deleteIndustryKnowledge(iid, btn.dataset.id);
            self.render();
            Toast.show('知识删除成功', 'success');
          });
        });
      });
    },

    fillFormSelect: function () {
      var byLevel1 = {};
      state.industries.forEach(function (i) {
        if (!byLevel1[i.level1]) byLevel1[i.level1] = [];
        byLevel1[i.level1].push(i);
      });
      
      var level1Order = state.level1Options.filter(function (l1) { return byLevel1[l1]; });
      Object.keys(byLevel1).forEach(function (l1) {
        if (level1Order.indexOf(l1) === -1) level1Order.push(l1);
      });
      
      var groups = {};
      level1Order.forEach(function (l1) {
        groups[l1] = byLevel1[l1].map(function (i) {
          return {
            value: i.id,
            label: i.level2 ? (i.level2 + '（二级）') : '（一级）'
          };
        });
      });
      
      Select.fillGrouped(elements.knowledgeFormIndustry, groups, '请选择要添加知识的行业');
    },

    openModal: function (id) {
      state.editingKnowledgeId = id || null;
      elements.knowledgeModalTitle.textContent = id ? '编辑知识' : '新增知识';

      if (id) {
        elements.knowledgeFormIndustryWrap.style.display = 'none';
        var list = MockStore.getIndustryKnowledge(state.currentIndustryId);
        var k = list.find(function (x) { return x.id === id; });
        Form.setData(knowledgeFields, {
          standardQ: k ? (k.standardQ || '') : '',
          similarQs: k ? (k.similarQs || []).join('\n') : '',
          answer: k ? (k.answer || '') : ''
        });
      } else {
        elements.knowledgeFormIndustryWrap.style.display = 'block';
        this.fillFormSelect();
        elements.knowledgeFormIndustry.value = '';
        Form.reset(knowledgeFields);
      }

      modals.knowledge.open();
    },

    closeModal: function () {
      modals.knowledge.close();
    },

    save: function () {
      var data = Form.getData(knowledgeFields);
      var similarQs = Utils.splitLines(data.similarQs);

      var check = Form.validate(data, ['standardQ'], { standardQ: '标准问' });
      if (!check.valid) {
        Toast.show(check.message, 'error');
        return;
      }

      var industryId = state.editingKnowledgeId
        ? state.currentIndustryId
        : (elements.knowledgeFormIndustry.value || '').trim();

      if (!industryId) {
        Toast.show('请选择要添加知识的行业', 'error');
        return;
      }

      if (state.editingKnowledgeId) {
        MockStore.updateIndustryKnowledge(industryId, state.editingKnowledgeId, {
          standardQ: data.standardQ,
          similarQs: similarQs,
          answer: data.answer
        });
        Toast.show('知识更新成功', 'success');
      } else {
        MockStore.addIndustryKnowledge(industryId, {
          standardQ: data.standardQ,
          similarQs: similarQs,
          answer: data.answer
        });
        Toast.show('知识创建成功', 'success');
      }

      this.closeModal();
      this.render();
    }
  };

  // ====================== 事件绑定 ======================
  function bindEvents() {
    modals.industry = Modal.create(elements.industryModal, {
      onClose: function () { state.editingIndustryId = null; }
    });
    modals.knowledge = Modal.create(elements.knowledgeModal, {
      onClose: function () { state.editingKnowledgeId = null; }
    });

    elements.btnAddIndustry.addEventListener('click', function () {
      IndustryManager.openModal();
    });
    elements.industryModalCancel.addEventListener('click', function () {
      IndustryManager.closeModal();
    });
    elements.industryModalSubmit.addEventListener('click', function () {
      IndustryManager.save();
    });

    elements.industryFormLevel1.addEventListener('change', function () {
      var val = elements.industryFormLevel1.value;
      if (val === NEW_LEVEL1_VALUE) {
        elements.industryFormNewLevel1Wrap.classList.remove('hidden');
        elements.industryFormLevel2Wrap.classList.add('hidden');
        elements.industryFormNewLevel1.focus();
      } else {
        elements.industryFormNewLevel1Wrap.classList.add('hidden');
        elements.industryFormLevel2Wrap.classList.remove('hidden');
        IndustryManager.fillLevel2(val);
      }
    });

    elements.industryFormLevel2.addEventListener('change', function () {
      if (elements.industryFormLevel2.value === NEW_LEVEL2_VALUE) {
        elements.industryFormNewLevel2Wrap.classList.remove('hidden');
        elements.industryFormNewLevel2.focus();
      } else {
        elements.industryFormNewLevel2Wrap.classList.add('hidden');
        elements.industryFormNewLevel2.value = '';
      }
    });

    elements.industrySelect.addEventListener('change', function () {
      state.currentIndustryId = elements.industrySelect.value || '';
      KnowledgeManager.render();
    });
    elements.btnAddKnowledge.addEventListener('click', function () {
      KnowledgeManager.openModal();
    });
    elements.knowledgeModalCancel.addEventListener('click', function () {
      KnowledgeManager.closeModal();
    });
    elements.knowledgeModalSubmit.addEventListener('click', function () {
      KnowledgeManager.save();
    });
  }

  // ====================== 初始化 ======================
  function init() {
    state.level1Options = MockStore.industryLevel1Options;
    state.level2Map = MockStore.industryLevel2Map;
    
    cacheElements();
    bindEvents();
    IndustryManager.render();
    IndustryManager.fillSelect();
    KnowledgeManager.render();
  }

  // ====================== 导出模块 ======================
  global.IndustryPage = {
    init: init,
    state: state,
    IndustryManager: IndustryManager,
    KnowledgeManager: KnowledgeManager
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
