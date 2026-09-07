(function initConyMiniCalendar(global) {
  'use strict';

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const THEME_VARIABLES = [
    '--cony-mini-calendar-surface',
    '--cony-mini-calendar-surface-2',
    '--cony-mini-calendar-surface-3',
    '--cony-mini-calendar-border',
    '--cony-mini-calendar-border-2',
    '--cony-mini-calendar-text',
    '--cony-mini-calendar-text-2',
    '--cony-mini-calendar-text-3',
    '--cony-mini-calendar-accent',
    '--cony-mini-calendar-shadow',
    '--cony-mini-calendar-radius',
    '--cony-mini-calendar-font-mono'
  ];

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function normalizeDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return '';
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return '';
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() !== year
      || candidate.getMonth() !== month - 1
      || candidate.getDate() !== day
    ) {
      return '';
    }
    return value;
  }

  function normalizeTime(value) {
    if (typeof value !== 'string') {
      return '';
    }
    const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) {
      return '';
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return '';
    }
    return pad(hour) + ':' + pad(minute);
  }

  function toTimestamp(date, time) {
    const normalizedDate = normalizeDate(date);
    const normalizedTime = normalizeTime(time);
    if (!normalizedDate || !normalizedTime) {
      return null;
    }
    const dateParts = normalizedDate.split('-').map(Number);
    const timeParts = normalizedTime.split(':').map(Number);
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]).getTime();
  }

  function clampTimestamp(timestamp, min, max) {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return false;
    }
    if (typeof min === 'number' && timestamp < min) {
      return false;
    }
    if (typeof max === 'number' && timestamp > max) {
      return false;
    }
    return true;
  }

  function localDateLabel(date) {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return 'Pick date';
    }
    const value = keyToDate(normalizedDate);
    return pad(value.getDate()) + ' ' + SHORT_MONTHS[value.getMonth()] + ' ' + value.getFullYear();
  }

  function keyToDate(key) {
    const parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateToKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function buildCalendarCells(year, month) {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const cells = [];
    let index;
    for (index = 0; index < 42; index += 1) {
      const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      cells.push({
        key: dateToKey(current),
        label: String(current.getDate()),
        isOtherMonth: current.getMonth() !== month
      });
    }
    return cells;
  }

  function hasValidTimeInDay(date, min, max) {
    if (!normalizeDate(date)) {
      return false;
    }
    const start = new Date(date + 'T00:00:00').getTime();
    const end = new Date(date + 'T23:59:00').getTime();
    if (typeof min === 'number' && end < min) {
      return false;
    }
    if (typeof max === 'number' && start > max) {
      return false;
    }
    return true;
  }

  function isTimeAllowed(date, time, min, max) {
    const timestamp = toTimestamp(date, time);
    return timestamp !== null && clampTimestamp(timestamp, min, max);
  }

  function resolveInitialViewDate(date) {
    const normalizedDate = normalizeDate(date);
    if (normalizedDate) {
      return keyToDate(normalizedDate);
    }
    return new Date();
  }

  function createNode(tagName, className, textContent) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (typeof textContent === 'string') {
      node.textContent = textContent;
    }
    return node;
  }

  function syncPanelTheme(root, panels) {
    if (
      !root
      || !Array.isArray(panels)
      || typeof window === 'undefined'
      || typeof window.getComputedStyle !== 'function'
    ) {
      return;
    }

    let computed;
    try {
      computed = window.getComputedStyle(root);
    } catch (error) {
      return;
    }
    if (!computed) {
      return;
    }

    panels.forEach(function eachPanel(panel) {
      if (!panel || !panel.style) {
        return;
      }
      THEME_VARIABLES.forEach(function eachVariable(name) {
        const value = typeof computed.getPropertyValue === 'function'
          ? computed.getPropertyValue(name).trim()
          : '';
        if (value) {
          panel.style.setProperty(name, value);
        } else if (typeof panel.style.removeProperty === 'function') {
          panel.style.removeProperty(name);
        }
      });
      if (typeof computed.font === 'string' && computed.font) {
        panel.style.font = computed.font;
      }
      if (typeof computed.color === 'string' && computed.color) {
        panel.style.color = computed.color;
      }
    });
  }

  function mount(host, options) {
    if (!host || typeof host.appendChild !== 'function' || typeof document === 'undefined') {
      throw new Error('ConyMiniCalendar.mount requires a DOM host element');
    }

    const settings = options && typeof options === 'object' ? options : {};
    const onChange = typeof settings.onChange === 'function' ? settings.onChange : function noop() {};
    let state = {
      date: normalizeDate(settings.date),
      time: normalizeTime(settings.time),
      min: typeof settings.min === 'number' ? settings.min : null,
      max: typeof settings.max === 'number' ? settings.max : null
    };
    let viewDate = resolveInitialViewDate(state.date);
    let destroyed = false;
    let openPanelName = '';
    let openTrigger = null;

    host.innerHTML = '';

    const root = createNode('div', 'cony-mini-calendar');
    root.setAttribute('data-cony-mini-calendar', '');

    const fields = createNode('div', 'cony-mini-calendar-fields');
    root.appendChild(fields);

    const dateField = createNode('div', 'cony-mini-calendar-field cony-mini-calendar-date');
    const timeField = createNode('div', 'cony-mini-calendar-field cony-mini-calendar-time');
    fields.appendChild(dateField);
    fields.appendChild(timeField);

    const dateLabel = createNode('label', 'cony-mini-calendar-label', 'Date');
    const timeLabel = createNode('label', 'cony-mini-calendar-label', 'Time');
    dateField.appendChild(dateLabel);
    timeField.appendChild(timeLabel);

    const dateControl = createNode('div', 'cony-mini-calendar-control');
    const timeControl = createNode('div', 'cony-mini-calendar-control');
    dateField.appendChild(dateControl);
    timeField.appendChild(timeControl);

    const dateTrigger = createNode('button', 'cony-mini-calendar-trigger cony-mini-calendar-date-trigger');
    dateTrigger.type = 'button';
    dateTrigger.setAttribute('aria-haspopup', 'dialog');
    dateTrigger.setAttribute('aria-expanded', 'false');
    dateControl.appendChild(dateTrigger);

    const dateDisplay = createNode('span', 'cony-mini-calendar-trigger-text', 'Pick date');
    dateTrigger.appendChild(dateDisplay);

    const datePanel = createNode('div', 'cony-mini-calendar-panel cony-mini-calendar-date-panel');
    datePanel.hidden = true;

    const dateHead = createNode('div', 'cony-mini-calendar-date-head');
    datePanel.appendChild(dateHead);

    const prevButton = createNode('button', 'cony-mini-calendar-nav', '<');
    prevButton.type = 'button';
    prevButton.setAttribute('aria-label', 'Previous month');
    const title = createNode('div', 'cony-mini-calendar-title');
    const nextButton = createNode('button', 'cony-mini-calendar-nav', '>');
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', 'Next month');
    dateHead.appendChild(prevButton);
    dateHead.appendChild(title);
    dateHead.appendChild(nextButton);

    const weekdays = createNode('div', 'cony-mini-calendar-weekdays');
    DAY_NAMES.forEach(function eachDay(day) {
      weekdays.appendChild(createNode('span', '', day.slice(0, 1)));
    });
    datePanel.appendChild(weekdays);

    const grid = createNode('div', 'cony-mini-calendar-grid');
    datePanel.appendChild(grid);

    const timeActions = createNode('div', 'cony-mini-calendar-time-actions');
    timeControl.appendChild(timeActions);

    const timeTrigger = createNode('button', 'cony-mini-calendar-trigger cony-mini-calendar-time-trigger');
    timeTrigger.type = 'button';
    timeTrigger.setAttribute('aria-haspopup', 'listbox');
    timeTrigger.setAttribute('aria-expanded', 'false');
    timeActions.appendChild(timeTrigger);

    const timeDisplay = createNode('span', 'cony-mini-calendar-trigger-text', 'Set time');
    timeTrigger.appendChild(timeDisplay);

    const timeClear = createNode('button', 'cony-mini-calendar-clear', 'x');
    timeClear.type = 'button';
    timeClear.setAttribute('aria-label', 'Clear time');
    timeActions.appendChild(timeClear);

    const timePanel = createNode('div', 'cony-mini-calendar-panel cony-mini-calendar-time-panel');
    timePanel.hidden = true;

    const hoursCol = createNode('div', 'cony-mini-calendar-timecol');
    hoursCol.setAttribute('role', 'listbox');
    hoursCol.setAttribute('aria-label', 'Hour');
    const sep = createNode('div', 'cony-mini-calendar-separator', ':');
    const minutesCol = createNode('div', 'cony-mini-calendar-timecol');
    minutesCol.setAttribute('role', 'listbox');
    minutesCol.setAttribute('aria-label', 'Minute');
    timePanel.appendChild(hoursCol);
    timePanel.appendChild(sep);
    timePanel.appendChild(minutesCol);

    host.appendChild(root);
    document.body.appendChild(datePanel);
    document.body.appendChild(timePanel);
    syncPanelTheme(root, [datePanel, timePanel]);

    function getPanelConfig(name) {
      if (name === 'date') {
        return {
          panel: datePanel,
          trigger: dateTrigger,
          width: 236,
          height: 276
        };
      }
      return {
        panel: timePanel,
        trigger: timeTrigger,
        width: 132,
        height: 180
      };
    }

    function removeNode(node) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    function emitChange() {
      const timestamp = toTimestamp(state.date, state.time);
      const payload = {
        date: state.date,
        time: state.time,
        timestamp: clampTimestamp(timestamp, state.min, state.max) ? timestamp : null
      };
      onChange(payload);
      return payload;
    }

    function isInsideComponent(target) {
      return !!(
        target
        && (
          root.contains(target)
          || datePanel.contains(target)
          || timePanel.contains(target)
        )
      );
    }

    function positionPanel(name) {
      const config = getPanelConfig(name);
      const rect = config.trigger.getBoundingClientRect();
      const panelRect = config.panel.getBoundingClientRect();
      const viewportWidth = (window && window.innerWidth) || document.documentElement.clientWidth || 0;
      const viewportHeight = (window && window.innerHeight) || document.documentElement.clientHeight || 0;
      const width = panelRect.width || config.width;
      const height = panelRect.height || config.height;
      const margin = 12;
      const left = Math.min(
        Math.max(margin, rect.left),
        Math.max(margin, viewportWidth - width - margin)
      );
      const belowTop = rect.bottom + 6;
      const aboveTop = rect.top - height - 6;
      const preferredTop = belowTop + height <= viewportHeight - margin ? belowTop : aboveTop;
      const top = Math.min(
        Math.max(margin, preferredTop),
        Math.max(margin, viewportHeight - height - margin)
      );
      config.panel.style.position = 'fixed';
      config.panel.style.left = left + 'px';
      config.panel.style.top = top + 'px';
      config.panel.style.zIndex = '1400';
    }

    function positionOpenPanel() {
      if (!openPanelName) {
        return;
      }
      positionPanel(openPanelName);
    }

    function hidePanel(name) {
      const config = getPanelConfig(name);
      config.panel.hidden = true;
      config.trigger.setAttribute('aria-expanded', 'false');
      if (openPanelName === name) {
        openPanelName = '';
        openTrigger = null;
      }
    }

    function hideAllPanels() {
      hidePanel('date');
      hidePanel('time');
    }

    function closeOpenPanel(restoreFocus) {
      const trigger = restoreFocus ? openTrigger : null;
      hideAllPanels();
      if (restoreFocus && trigger && typeof trigger.focus === 'function') {
        trigger.focus();
      }
    }

    function showPanel(name, trigger) {
      hideAllPanels();
      syncPanelTheme(root, [datePanel, timePanel]);
      const config = getPanelConfig(name);
      config.panel.hidden = false;
      config.trigger.setAttribute('aria-expanded', 'true');
      openPanelName = name;
      openTrigger = trigger;
      positionPanel(name);
    }

    function focusSelectedDate() {
      const selector = state.date
        ? '.cony-mini-calendar-day.is-selected:not([disabled])'
        : '.cony-mini-calendar-day:not(.is-other):not([disabled])';
      const target = grid.querySelector(selector);
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    }

    function centerTimeOption(container, option) {
      if (!container || !option) {
        return;
      }
      if (typeof option.scrollIntoView === 'function') {
        option.scrollIntoView({ block: 'center' });
        return;
      }
      container.scrollTop = Math.max(
        0,
        option.offsetTop - Math.max(0, (container.clientHeight - option.offsetHeight) / 2)
      );
    }

    function focusSelectedTime() {
      const normalizedTime = normalizeTime(state.time);
      const hour = normalizedTime ? normalizedTime.slice(0, 2) : '00';
      const minute = normalizedTime ? normalizedTime.slice(3, 5) : '00';
      const hourTarget = hoursCol.querySelector('[data-val="' + hour + '"]:not([disabled])');
      const minuteTarget = minutesCol.querySelector('[data-val="' + minute + '"]:not([disabled])');
      centerTimeOption(hoursCol, hourTarget);
      centerTimeOption(minutesCol, minuteTarget);
      if (hourTarget && typeof hourTarget.focus === 'function') {
        hourTarget.focus();
        return;
      }
      if (minuteTarget && typeof minuteTarget.focus === 'function') {
        minuteTarget.focus();
      }
    }

    function renderDateGrid() {
      title.textContent = MONTH_NAMES[viewDate.getMonth()] + ' ' + viewDate.getFullYear();
      grid.innerHTML = '';
      const todayKey = dateToKey(new Date());
      buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth()).forEach(function eachCell(cell) {
        const button = createNode('button', 'cony-mini-calendar-day', cell.label);
        button.type = 'button';
        button.setAttribute('data-key', cell.key);
        button.dataset.key = cell.key;
        button.setAttribute('aria-label', cell.key);
        if (cell.isOtherMonth) {
          button.classList.add('is-other');
        }
        if (cell.key === todayKey) {
          button.classList.add('is-today');
        }
        if (cell.key === state.date) {
          button.classList.add('is-selected');
          button.setAttribute('aria-current', 'date');
        }
        if (!hasValidTimeInDay(cell.key, state.min, state.max)) {
          button.disabled = true;
        }
        grid.appendChild(button);
      });
      dateDisplay.textContent = localDateLabel(state.date);
      dateTrigger.classList.toggle('is-empty', !state.date);
      if (openPanelName === 'date') {
        positionPanel('date');
      }
    }

    function buildTimeColumn(container, max) {
      container.innerHTML = '';
      let value;
      for (value = 0; value <= max; value += 1) {
        const text = pad(value);
        const button = createNode('button', 'cony-mini-calendar-timeopt', text);
        button.type = 'button';
        button.setAttribute('data-val', text);
        button.dataset.val = text;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', 'false');
        container.appendChild(button);
      }
    }

    function paintTimeColumn(container, selectedValue, makeTime) {
      const optionsList = container.querySelectorAll('.cony-mini-calendar-timeopt');
      optionsList.forEach(function eachOption(option) {
        const active = option.dataset.val === selectedValue;
        option.classList.toggle('is-selected', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
        const candidate = makeTime(option.dataset.val);
        const allowed = state.date ? isTimeAllowed(state.date, candidate, state.min, state.max) : true;
        option.disabled = !allowed;
      });
    }

    function renderTime() {
      const normalizedTime = normalizeTime(state.time);
      const hour = normalizedTime ? normalizedTime.slice(0, 2) : null;
      const minute = normalizedTime ? normalizedTime.slice(3, 5) : null;
      paintTimeColumn(hoursCol, hour, function makeHourTime(nextHour) {
        return (nextHour || '00') + ':' + (minute || '00');
      });
      paintTimeColumn(minutesCol, minute, function makeMinuteTime(nextMinute) {
        return (hour || '00') + ':' + (nextMinute || '00');
      });
      timeDisplay.textContent = normalizedTime || 'Set time';
      timeTrigger.classList.toggle('is-empty', !normalizedTime);
      timeClear.hidden = !normalizedTime;
      if (openPanelName === 'time') {
        positionPanel('time');
      }
    }

    function setDate(date) {
      const normalized = normalizeDate(date);
      if (normalized && !hasValidTimeInDay(normalized, state.min, state.max)) {
        return;
      }
      state.date = normalized;
      if (normalized) {
        viewDate = keyToDate(normalized);
      }
      renderDateGrid();
      renderTime();
      emitChange();
    }

    function setTime(time) {
      const normalized = normalizeTime(time);
      if (normalized && state.date && !isTimeAllowed(state.date, normalized, state.min, state.max)) {
        return;
      }
      state.time = normalized;
      renderTime();
      emitChange();
    }

    function moveGridFocus(current, step) {
      const buttons = Array.prototype.slice.call(grid.querySelectorAll('.cony-mini-calendar-day'));
      const index = buttons.indexOf(current);
      if (index === -1) {
        return;
      }
      let nextIndex = index + step;
      while (buttons[nextIndex]) {
        if (!buttons[nextIndex].disabled && typeof buttons[nextIndex].focus === 'function') {
          buttons[nextIndex].focus();
          return;
        }
        nextIndex += step;
      }
    }

    function moveTimeFocus(container, current, step) {
      const buttons = Array.prototype.slice.call(container.querySelectorAll('.cony-mini-calendar-timeopt:not([disabled])'));
      const index = buttons.indexOf(current);
      if (index === -1) {
        return;
      }
      const nextIndex = index + step;
      if (buttons[nextIndex] && typeof buttons[nextIndex].focus === 'function') {
        buttons[nextIndex].focus();
      }
    }

    function onDocumentPointerDown(event) {
      if (destroyed || !openPanelName) {
        return;
      }
      if (!isInsideComponent(event.target)) {
        closeOpenPanel(false);
      }
    }

    function onDocumentKeyDown(event) {
      if (destroyed) {
        return;
      }
      if (event.key === 'Escape' && openPanelName) {
        event.preventDefault();
        closeOpenPanel(true);
      }
    }

    function onViewportChange() {
      if (destroyed || !openPanelName) {
        return;
      }
      positionOpenPanel();
    }

    dateTrigger.addEventListener('click', function onDateTrigger(event) {
      event.stopPropagation();
      if (!datePanel.hidden) {
        closeOpenPanel(true);
        return;
      }
      renderDateGrid();
      showPanel('date', dateTrigger);
      focusSelectedDate();
    });

    prevButton.addEventListener('click', function onPrevClick(event) {
      event.stopPropagation();
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
      renderDateGrid();
      focusSelectedDate();
    });

    nextButton.addEventListener('click', function onNextClick(event) {
      event.stopPropagation();
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      renderDateGrid();
      focusSelectedDate();
    });

    grid.addEventListener('click', function onGridClick(event) {
      const target = event.target.closest('.cony-mini-calendar-day');
      if (!target || target.disabled) {
        return;
      }
      setDate(target.dataset.key);
      closeOpenPanel(true);
    });

    grid.addEventListener('keydown', function onGridKeyDown(event) {
      const target = event.target.closest('.cony-mini-calendar-day');
      if (!target) {
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveGridFocus(target, 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveGridFocus(target, -1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveGridFocus(target, 7);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveGridFocus(target, -7);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        target.click();
      }
    });

    timeTrigger.addEventListener('click', function onTimeTrigger(event) {
      event.stopPropagation();
      if (!timePanel.hidden) {
        closeOpenPanel(true);
        return;
      }
      showPanel('time', timeTrigger);
      focusSelectedTime();
    });

    timeClear.addEventListener('click', function onClearTime(event) {
      event.stopPropagation();
      setTime('');
    });

    timeClear.addEventListener('keydown', function onClearTimeKeyDown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        setTime('');
      }
    });

    hoursCol.addEventListener('click', function onHoursClick(event) {
      const target = event.target.closest('.cony-mini-calendar-timeopt');
      if (!target || target.disabled) {
        return;
      }
      const normalizedTime = normalizeTime(state.time);
      const minute = normalizedTime ? normalizedTime.slice(3, 5) : '00';
      setTime(target.dataset.val + ':' + minute);
    });

    minutesCol.addEventListener('click', function onMinutesClick(event) {
      const target = event.target.closest('.cony-mini-calendar-timeopt');
      if (!target || target.disabled) {
        return;
      }
      const normalizedTime = normalizeTime(state.time);
      const hour = normalizedTime ? normalizedTime.slice(0, 2) : '00';
      setTime(hour + ':' + target.dataset.val);
    });

    [hoursCol, minutesCol].forEach(function eachColumn(column) {
      column.addEventListener('keydown', function onTimeKeyDown(event) {
        const target = event.target.closest('.cony-mini-calendar-timeopt');
        if (!target) {
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveTimeFocus(column, target, 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveTimeFocus(column, target, -1);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          target.click();
        }
      });
    });

    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    window.addEventListener('resize', onViewportChange, true);
    window.addEventListener('scroll', onViewportChange, true);

    buildTimeColumn(hoursCol, 23);
    buildTimeColumn(minutesCol, 59);
    renderDateGrid();
    renderTime();
    emitChange();

    return {
      getValue: function getValue() {
        const timestamp = toTimestamp(state.date, state.time);
        return {
          date: state.date,
          time: state.time,
          timestamp: clampTimestamp(timestamp, state.min, state.max) ? timestamp : null
        };
      },
      setValue: function setValue(nextValue) {
        const value = nextValue && typeof nextValue === 'object' ? nextValue : {};
        const nextDate = normalizeDate(value.date);
        const nextTime = normalizeTime(value.time);
        if (nextDate && !hasValidTimeInDay(nextDate, state.min, state.max)) {
          return;
        }
        if (nextDate && nextTime && !isTimeAllowed(nextDate, nextTime, state.min, state.max)) {
          return;
        }
        state.date = nextDate;
        state.time = nextTime;
        viewDate = resolveInitialViewDate(state.date);
        renderDateGrid();
        renderTime();
        positionOpenPanel();
        emitChange();
      },
      destroy: function destroy() {
        if (destroyed) {
          return;
        }
        destroyed = true;
        document.removeEventListener('pointerdown', onDocumentPointerDown, true);
        document.removeEventListener('keydown', onDocumentKeyDown, true);
        window.removeEventListener('resize', onViewportChange, true);
        window.removeEventListener('scroll', onViewportChange, true);
        hideAllPanels();
        removeNode(datePanel);
        removeNode(timePanel);
        host.innerHTML = '';
      }
    };
  }

  global.ConyMiniCalendar = {
    mount: mount,
    testing: {
      buildCalendarCells: buildCalendarCells,
      normalizeDate: normalizeDate,
      normalizeTime: normalizeTime,
      toTimestamp: toTimestamp
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
