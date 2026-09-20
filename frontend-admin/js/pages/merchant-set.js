/**
 * 商家集合知识页面 - 模块化控制器
 * @module MerchantSetPage
 */
(function (global) {
  'use strict';

  var Utils = App.Utils;
  var Table = App.Table;
  var Modal = App.Modal;
  var Select = App.Select;
  var Form = App.Form;
  var KnowledgeForm = App.KnowledgeForm;

  // ====================== 页面状态 ======================
  var state = {
    sets: [],
    currentSetId: '',
    editingSetId: null,
    editingKnowledgeId: null
  };

  // ====================== 弹窗控制器（统一开关） ======================
  var modals = {};

  // ====================== DOM 元素缓存 ======================
  var elements = {};

  function cacheElements() {
    elements = {
      btnAddSet: document.getElementById('btnAddSet'),
      setTableBody: document.getElementById('setTableBody'),
      setSelect: document.getElementById('setSelect'),
      btnAddKnowledge: document.getElementById('btnAddKnowledge'),
      knowledgeEmpty: document.getElementById('knowledgeEmpty'),
      knowledgeBlock: document.getElementById('knowledgeBlock'),
      knowledgeTableBody: document.getElementById('knowledgeTableBody'),
      setModal: document.getElementById('setModal'),
      setModalTitle: document.getElementById('setModalTitle'),
      setFormName: document.getElementById('setFormName'),
      setFormMerchants: document.getElementById('setFormMerchants'),
      setModalCancel: document.getElementById('setModalCancel'),
      setModalSubmit: document.getElementById('setModalSubmit'),
      knowledgeModal: document.getElementById('knowledgeModal'),
      knowledgeModalTitle: document.getElementById('knowledgeModalTitle'),
      knowledgeFormSetWrap: document.getElementById('knowledgeFormSetWrap'),
      knowledgeFormSet: document.getElementById('knowledgeFormSet'),
      knowledgeModalCancel: document.getElementById('knowledgeModalCancel'),
      knowledgeModalSubmit: document.getElementById('knowledgeModalSubmit')
    };

    modals.set = Modal.create(elements.setModal, function () {
      SetManager.closeModal();
    });
    modals.knowledge = Modal.create(elements.knowledgeModal, function () {
      KnowledgeManager.closeModal();
    });
  }

  // ====================== 商家集合管理 ======================
  var SetManager = {
    render: function () {
      state.sets = MockStore.getMerchantSets();

      Table.render(elements.setTableBody, state.sets, function (s) {
        return '<td class="text-obsidian font-medium">' + Utils.escapeHtml(s.name) + '</td>' +
          '<td class="text-subtle">' + (s.merchantIds ? s.merchantIds.length : 0) + '</td>' +
          '<td class="text-right">' +
            '<button type="button" class="btn-link set-edit mr-2" data-id="' + s.id + '">编辑</button>' +
            '<button type="button" class="btn-link btn-link-danger set-delete" data-id="' + s.id + '">删除</button>' +
          '</td>';
      }, this.bindTableEvents.bind(this));
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.set-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.set-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Confirm.show('确定删除该商家集合？其下知识将一并清除。', function () {
            MockStore.deleteMerchantSet(btn.dataset.id);
            if (state.currentSetId === btn.dataset.id) {
              state.currentSetId = '';
            }
            self.render();
            self.fillSelect();
            KnowledgeManager.render();
            Toast.show('商家集合删除成功', 'success');
          });
        });
      });
    },

    fillSelect: function () {
      Select.fill(elements.setSelect, Select.mapOptions(state.sets, 'name'), '全部集合', state.currentSetId);
    },

    openModal: function (id) {
      state.editingSetId = id || null;
      elements.setModalTitle.textContent = id ? '编辑商家集合' : '新建商家集合';

      var merchants = MockStore.getMerchants();
      var set = id ? state.sets.find(function (s) { return s.id === id; }) : null;
      elements.setFormMerchants.innerHTML = '';

      merchants.forEach(function (m) {
        var label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer';
        var checked = set && set.merchantIds && set.merchantIds.indexOf(m.id) !== -1;
        label.innerHTML = '<input type="checkbox" class="set-merchant-cb" value="' + m.id + '"' + (checked ? ' checked' : '') + ' />' +
          '<span class="text-sm">' + Utils.escapeHtml(m.name) + '（' + m.id + '）</span>';
        elements.setFormMerchants.appendChild(label);
      });

      elements.setFormName.value = set ? set.name : '';
      modals.set.open();
    },

    closeModal: function () {
      modals.set.close();
      state.editingSetId = null;
    },

    save: function () {
      var name = Form.value(elements.setFormName);
      var check = Form.validate({ name: name }, [{ name: 'name', label: '集合名称', message: '请填写集合名称' }]);
      if (!check.valid) {
        Toast.show(check.message, 'error');
        return;
      }

      var ids = Form.checkedValues(elements.setFormMerchants, '.set-merchant-cb:checked');

      if (state.editingSetId) {
        MockStore.updateMerchantSet(state.editingSetId, name, ids);
        Toast.show('商家集合更新成功', 'success');
      } else {
        MockStore.createMerchantSet(name, ids);
        Toast.show('商家集合创建成功', 'success');
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

      MockStore.getMerchantSets().forEach(function (s) {
        if (state.currentSetId && s.id !== state.currentSetId) return;
        (MockStore.getMerchantSetKnowledge(s.id) || []).forEach(function (k) {
          list.push({ setId: s.id, setName: s.name, data: k });
        });
      });

      Table.renderWithEmpty({
        tbody: elements.knowledgeTableBody,
        emptyEl: elements.knowledgeEmpty,
        blockEl: elements.knowledgeBlock,
        data: list,
        rowRenderer: function (row) {
          var k = row.data;
          return '<td class="text-subtle text-sm">' + Utils.escapeHtml(row.setName) + '</td>' +
            '<td class="text-obsidian">' + Utils.escapeHtml(k.standardQ || '') + '</td>' +
            '<td class="text-subtle">' + Utils.escapeHtml((k.similarQs || []).join('；')) + '</td>' +
            '<td class="text-charcoal max-w-xs truncate">' + Utils.escapeHtml(k.answer || '') + '</td>' +
            '<td class="text-right">' +
              '<button type="button" class="btn-link k-edit mr-2" data-id="' + k.id + '" data-sid="' + row.setId + '">编辑</button>' +
              '<button type="button" class="btn-link btn-link-danger k-delete" data-id="' + k.id + '" data-sid="' + row.setId + '">删除</button>' +
            '</td>';
        },
        bindEvents: this.bindTableEvents.bind(this)
      });
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.k-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var sid = btn.dataset.sid || state.currentSetId;
          if (sid) {
            state.currentSetId = sid;
            elements.setSelect.value = sid;
          }
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.k-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var sid = btn.dataset.sid || state.currentSetId;
          Confirm.show('确定删除这条知识？', function () {
            MockStore.deleteMerchantSetKnowledge(sid, btn.dataset.id);
            self.render();
            Toast.show('知识删除成功', 'success');
          });
        });
      });
    },

    fillFormSelect: function () {
      Select.fill(elements.knowledgeFormSet, Select.mapOptions(state.sets, 'name'), '请选择要添加知识的商家集合');
    },

    openModal: function (id) {
      state.editingKnowledgeId = id || null;
      elements.knowledgeModalTitle.textContent = id ? '编辑知识' : '新增知识';

      if (id) {
        elements.knowledgeFormSetWrap.style.display = 'none';
        var k = MockStore.getMerchantSetKnowledge(state.currentSetId).find(function (x) { return x.id === id; });
        KnowledgeForm.fill(k);
      } else {
        elements.knowledgeFormSetWrap.style.display = 'block';
        this.fillFormSelect();
        elements.knowledgeFormSet.value = '';
        KnowledgeForm.clear();
      }

      modals.knowledge.open();
    },

    closeModal: function () {
      modals.knowledge.close();
      state.editingKnowledgeId = null;
    },

    save: function () {
      var data = KnowledgeForm.read();

      var check = Form.validate(data, [
        { name: 'standardQ', label: '标准问', message: '请填写标准问' }
      ]);
      if (!check.valid) {
        Toast.show(check.message, 'error');
        return;
      }

      var setId = state.editingKnowledgeId
        ? state.currentSetId
        : (elements.knowledgeFormSet.value || '').trim();

      check = Form.validate({ setId: setId }, [{ name: 'setId', message: '请选择要添加知识的商家集合' }]);
      if (!check.valid) {
        Toast.show(check.message, 'error');
        return;
      }

      if (state.editingKnowledgeId) {
        MockStore.updateMerchantSetKnowledge(setId, state.editingKnowledgeId, data);
        Toast.show('知识更新成功', 'success');
      } else {
        MockStore.addMerchantSetKnowledge(setId, data);
        Toast.show('知识创建成功', 'success');
      }

      this.closeModal();
      this.render();
    }
  };

  // ====================== 事件绑定 ======================
  function bindEvents() {
    elements.btnAddSet.addEventListener('click', function () {
      SetManager.openModal();
    });
    elements.setModalCancel.addEventListener('click', function () {
      SetManager.closeModal();
    });
    elements.setModalSubmit.addEventListener('click', function () {
      SetManager.save();
    });

    elements.setSelect.addEventListener('change', function () {
      state.currentSetId = elements.setSelect.value || '';
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
    cacheElements();
    bindEvents();
    SetManager.render();
    SetManager.fillSelect();
    KnowledgeManager.render();
  }

  // ====================== 导出模块 ======================
  global.MerchantSetPage = {
    init: init,
    state: state,
    SetManager: SetManager,
    KnowledgeManager: KnowledgeManager
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
