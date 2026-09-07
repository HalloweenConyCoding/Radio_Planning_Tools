(function installDropdownList(global) {
  'use strict';

  var openController = null;
  var instanceCounter = 0;

  function createNode(documentRef, tagName, className, text) {
    var node = documentRef.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function normalizeOptions(options) {
    return (Array.isArray(options) ? options : []).map(function normalizeOption(option) {
      if (typeof option === 'string') return { value: option, label: option, disabled: false };
      return {
        value: String(option && option.value !== undefined ? option.value : ''),
        label: String(option && option.label !== undefined ? option.label : option && option.value !== undefined ? option.value : ''),
        disabled: Boolean(option && option.disabled)
      };
    });
  }

  function mount(host, config) {
    if (!host || !host.ownerDocument) throw new Error('ConyDropdownList.mount() needs a DOM host');
    var options = config || {};
    var documentRef = host.ownerDocument;
    var windowRef = documentRef.defaultView || global;
    var items = normalizeOptions(options.options);
    var value = options.value === undefined || options.value === null ? '' : String(options.value);
    var placeholder = options.placeholder || 'Select an option';
    var onChange = typeof options.onChange === 'function' ? options.onChange : function noop() {};
    var id = 'cony-dropdown-list-' + (++instanceCounter);
    var isOpen = false;
    var highlightedIndex = -1;

    host.innerHTML = '';

    var root = createNode(documentRef, 'div', 'cony-dropdown-list');
    var trigger = createNode(documentRef, 'button', 'cony-dropdown-list-trigger');
    var valueText = createNode(documentRef, 'span', 'cony-dropdown-list-value');
    var arrow = createNode(documentRef, 'span', 'cony-dropdown-list-arrow', '⌄');
    var panel = createNode(documentRef, 'div', 'cony-dropdown-list-panel');
    var listbox = createNode(documentRef, 'div', 'cony-dropdown-list-options');

    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id + '-options');
    if (options.ariaLabel) trigger.setAttribute('aria-label', options.ariaLabel);
    panel.id = id + '-options';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;
    panel.tabIndex = -1;
    root.appendChild(trigger);
    trigger.appendChild(valueText);
    trigger.appendChild(arrow);
    panel.appendChild(listbox);
    host.appendChild(root);
    // The modal uses transform for its entrance animation. Portaling the fixed
    // panel to body keeps viewport coordinates anchored to the trigger instead
    // of being reinterpreted inside that transformed modal.
    documentRef.body.appendChild(panel);

    function selectedIndex() {
      return items.findIndex(function findSelected(item) { return item.value === value; });
    }

    function firstEnabledIndex(direction) {
      var index = direction > 0 ? 0 : items.length - 1;
      while (index >= 0 && index < items.length) {
        if (!items[index].disabled) return index;
        index += direction;
      }
      return -1;
    }

    function nextEnabledIndex(start, direction) {
      var index = start + direction;
      while (index >= 0 && index < items.length) {
        if (!items[index].disabled) return index;
        index += direction;
      }
      return start;
    }

    function updateTrigger() {
      var selected = items.find(function findSelected(item) { return item.value === value; });
      valueText.textContent = selected ? selected.label : placeholder;
      valueText.classList.toggle('is-placeholder', !selected);
    }

    function renderOptions() {
      listbox.innerHTML = '';
      items.forEach(function renderOption(item, index) {
        var option = createNode(documentRef, 'div', 'cony-dropdown-list-option', item.label);
        option.id = id + '-option-' + index;
        option.dataset.index = String(index);
        option.dataset.value = item.value;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', item.value === value ? 'true' : 'false');
        option.tabIndex = -1;
        if (item.disabled) {
          option.setAttribute('aria-disabled', 'true');
          option.tabIndex = -1;
        }
        option.addEventListener('click', function onOptionClick() {
          if (!item.disabled) selectValue(item.value, true);
        });
        option.addEventListener('mouseenter', function onOptionHover() {
          if (!item.disabled) setHighlighted(index, false);
        });
        listbox.appendChild(option);
      });
    }

    function setHighlighted(index, focusOption) {
      if (!items.length) return;
      if (index < 0 || index >= items.length || items[index].disabled) return;
      highlightedIndex = index;
      Array.prototype.forEach.call(listbox.children, function updateHighlight(option, optionIndex) {
        option.classList.toggle('is-highlighted', optionIndex === highlightedIndex);
      });
      if (focusOption && listbox.children[index] && typeof listbox.children[index].focus === 'function') {
        listbox.children[index].focus();
      }
    }

    function positionPanel() {
      if (!isOpen) return;
      var rect = trigger.getBoundingClientRect();
      var viewportWidth = windowRef.innerWidth || documentRef.documentElement.clientWidth || 0;
      var viewportHeight = windowRef.innerHeight || documentRef.documentElement.clientHeight || 0;
      var panelWidth = Math.max(rect.width, panel.offsetWidth || 0);
      var panelHeight = panel.offsetHeight || 0;
      var left = Math.max(8, Math.min(rect.left, viewportWidth - panelWidth - 8));
      var top = rect.bottom + 4;
      if (top + panelHeight > viewportHeight - 8 && rect.top - panelHeight - 4 >= 8) top = rect.top - panelHeight - 4;
      panel.style.left = Math.round(left) + 'px';
      panel.style.top = Math.round(Math.max(8, top)) + 'px';
      panel.style.minWidth = Math.round(rect.width) + 'px';
    }

    function removeOpenListeners() {
      documentRef.removeEventListener('click', onDocumentClick);
      windowRef.removeEventListener('resize', positionPanel);
      windowRef.removeEventListener('scroll', positionPanel, true);
    }

    function close(restoreFocus) {
      if (!isOpen) return;
      isOpen = false;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      removeOpenListeners();
      if (openController === controller) openController = null;
      if (restoreFocus && typeof trigger.focus === 'function') trigger.focus();
    }

    function onDocumentClick(event) {
      if (!root.contains(event.target) && !panel.contains(event.target)) close(false);
    }

    function open() {
      if (openController && openController !== controller) openController.close(false);
      openController = controller;
      isOpen = true;
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      renderOptions();
      var selected = selectedIndex();
      setHighlighted(selected >= 0 && !items[selected].disabled ? selected : firstEnabledIndex(1), false);
      positionPanel();
      documentRef.addEventListener('click', onDocumentClick);
      windowRef.addEventListener('resize', positionPanel);
      windowRef.addEventListener('scroll', positionPanel, true);
    }

    function toggle() {
      if (isOpen) close(true);
      else open();
    }

    function selectValue(nextValue, notify) {
      var next = String(nextValue);
      var selected = items.find(function findOption(item) { return item.value === next; });
      if (!selected || selected.disabled) return;
      value = selected.value;
      updateTrigger();
      renderOptions();
      if (notify) onChange(value, selected);
      close(true);
    }

    function moveHighlight(direction) {
      var start = highlightedIndex >= 0 ? highlightedIndex : firstEnabledIndex(direction);
      setHighlighted(nextEnabledIndex(start, direction), true);
    }

    function onTriggerKeyDown(event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) open();
        else moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    }

    function onPanelKeyDown(event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setHighlighted(firstEnabledIndex(event.key === 'Home' ? 1 : -1), true);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (highlightedIndex >= 0) selectValue(items[highlightedIndex].value, true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab') {
        close(false);
      }
    }

    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', onTriggerKeyDown);
    panel.addEventListener('keydown', onPanelKeyDown);
    updateTrigger();

    var controller = {
      getValue: function getValue() { return value; },
      setValue: function setValue(nextValue) {
        var next = nextValue === undefined || nextValue === null ? '' : String(nextValue);
        if (items.some(function hasValue(item) { return item.value === next && !item.disabled; })) {
          value = next;
          updateTrigger();
          if (isOpen) renderOptions();
        }
      },
      close: close,
      destroy: function destroy() {
        close(false);
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        if (host) host.innerHTML = '';
      }
    };

    return controller;
  }

  global.ConyDropdownList = { mount: mount };
}(typeof window !== 'undefined' ? window : this));
