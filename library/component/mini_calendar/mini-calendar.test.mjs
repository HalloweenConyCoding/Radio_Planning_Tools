import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = here;
const sourcePath = path.join(root, 'mini-calendar.js');
const stylePath = path.join(root, 'mini-calendar.css');
const styleSource = fs.readFileSync(stylePath, 'utf8');
const calendarSource = fs.readFileSync(sourcePath, 'utf8');
const TOKEN_NAMES = [
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

function check(label, condition) {
  if (!condition) {
    throw new Error(label);
  }
}

function createEvent(type, target, overrides = {}) {
  return {
    type,
    target,
    currentTarget: null,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    ...overrides
  };
}

function createFakeDom() {
  class FakeStyle {
    setProperty(name, value) {
      this[name] = String(value);
    }

    getPropertyValue(name) {
      return Object.prototype.hasOwnProperty.call(this, name) ? this[name] : '';
    }

    removeProperty(name) {
      delete this[name];
    }
  }

  class FakeClassList {
    constructor(element) {
      this.element = element;
      this.set = new Set();
    }

    _sync() {
      this.element.attributes.class = Array.from(this.set).join(' ');
    }

    setFromString(value) {
      this.set = new Set(String(value || '').split(/\s+/).filter(Boolean));
      this._sync();
    }

    add(...tokens) {
      tokens.forEach((token) => this.set.add(token));
      this._sync();
    }

    remove(...tokens) {
      tokens.forEach((token) => this.set.delete(token));
      this._sync();
    }

    toggle(token, force) {
      if (force === true) {
        this.add(token);
        return true;
      }
      if (force === false) {
        this.remove(token);
        return false;
      }
      if (this.set.has(token)) {
        this.set.delete(token);
        this._sync();
        return false;
      }
      this.set.add(token);
      this._sync();
      return true;
    }

    contains(token) {
      return this.set.has(token);
    }
  }

  class FakeNode {
    constructor(ownerDocument, tagName) {
      this.ownerDocument = ownerDocument;
      this.tagName = String(tagName || '').toUpperCase();
      this.nodeType = tagName === '#document' ? 9 : 1;
      this.parentNode = null;
      this.children = [];
      this.attributes = {};
      this.dataset = {};
      this.style = new FakeStyle();
      this.classList = new FakeClassList(this);
      this.listeners = new Map();
      this.hidden = false;
      this.disabled = false;
      this.textContent = '';
      this.type = '';
      this.scrollTop = 0;
      this.clientHeight = 0;
      this.offsetHeight = 0;
      this.offsetTop = 0;
      this.scrollIntoViewCalls = [];
      this._rect = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
    }

    get className() {
      return this.attributes.class || '';
    }

    set className(value) {
      this.classList.setFromString(value);
    }

    appendChild(child) {
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) {
        this.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    }

    contains(node) {
      if (!node) {
        return false;
      }
      if (node === this) {
        return true;
      }
      return this.children.some((child) => child.contains(node));
    }

    setAttribute(name, value) {
      const nextValue = String(value);
      this.attributes[name] = nextValue;
      if (name === 'class') {
        this.classList.setFromString(nextValue);
      } else if (name === 'hidden') {
        this.hidden = true;
      } else if (name === 'disabled') {
        this.disabled = true;
      } else if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        this.dataset[key] = nextValue;
      } else if (name === 'type') {
        this.type = nextValue;
      }
    }

    getAttribute(name) {
      if (name === 'class') {
        return this.attributes.class || '';
      }
      if (name === 'hidden') {
        return this.hidden ? '' : null;
      }
      if (name === 'disabled') {
        return this.disabled ? '' : null;
      }
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    }

    removeAttribute(name) {
      delete this.attributes[name];
      if (name === 'class') {
        this.classList.setFromString('');
      } else if (name === 'hidden') {
        this.hidden = false;
      } else if (name === 'disabled') {
        this.disabled = false;
      }
    }

    addEventListener(type, listener, options) {
      const capture = !!(options === true || (options && options.capture === true));
      const list = this.listeners.get(type) || [];
      list.push({ listener, capture });
      this.listeners.set(type, list);
    }

    removeEventListener(type, listener, options) {
      const capture = !!(options === true || (options && options.capture === true));
      const list = this.listeners.get(type) || [];
      this.listeners.set(
        type,
        list.filter((entry) => entry.listener !== listener || entry.capture !== capture)
      );
    }

    dispatchEvent(event) {
      return dispatchWithPath(this, event);
    }

    focus() {
      this.ownerDocument.activeElement = this;
    }

    click() {
      const event = createEvent('click', this);
      this.dispatchEvent(event);
    }

    closest(selector) {
      let current = this;
      while (current) {
        if (current.nodeType === 1 && matchesSelector(current, selector)) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
      const results = [];
      walk(this, (node) => {
        if (node !== this && node.nodeType === 1 && matchesSelector(node, selector)) {
          results.push(node);
        }
      });
      return results;
    }

    setBoundingClientRect(rect) {
      this._rect = {
        left: rect.left || 0,
        top: rect.top || 0,
        width: rect.width || 0,
        height: rect.height || 0,
        right: rect.right != null ? rect.right : (rect.left || 0) + (rect.width || 0),
        bottom: rect.bottom != null ? rect.bottom : (rect.top || 0) + (rect.height || 0)
      };
    }

    getBoundingClientRect() {
      return { ...this._rect };
    }

    scrollIntoView(options) {
      this.scrollIntoViewCalls.push(options || null);
    }

    get innerHTML() {
      return '';
    }

    set innerHTML(value) {
      if (value !== '') {
        throw new Error('fake DOM only supports clearing innerHTML');
      }
      this.children.slice().forEach((child) => this.removeChild(child));
      this.textContent = '';
    }
  }

  class FakeDocument extends FakeNode {
    constructor() {
      super(null, '#document');
      this.ownerDocument = this;
      this.documentElement = new FakeNode(this, 'html');
      this.documentElement.clientWidth = 1280;
      this.documentElement.clientHeight = 720;
      this.body = new FakeNode(this, 'body');
      this.activeElement = this.body;
      this.appendChild(this.documentElement);
      this.documentElement.appendChild(this.body);
    }

    createElement(tagName) {
      return new FakeNode(this, tagName);
    }
  }

  function walk(node, visitor) {
    node.children.forEach((child) => {
      visitor(child);
      walk(child, visitor);
    });
  }

  function matchesSelector(node, selector) {
    const parts = selector.split(',').map((part) => part.trim()).filter(Boolean);
    return parts.some((part) => matchesSelectorChain(node, part));
  }

  function matchesSelectorChain(node, selector) {
    const chain = selector.split(/\s+/).filter(Boolean);
    let current = node;
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      if (!current || !matchesSimpleSelector(current, chain[index])) {
        return false;
      }
      if (index === 0) {
        return true;
      }
      current = current.parentNode;
      while (current && current.nodeType === 1 && !matchesSimpleSelector(current, chain[index - 1])) {
        current = current.parentNode;
      }
    }
    return true;
  }

  function matchesSimpleSelector(node, selector) {
    let remaining = selector.trim();
    const notParts = [];
    remaining = remaining.replace(/:not\(([^)]+)\)/g, (_, inner) => {
      notParts.push(inner.trim());
      return '';
    });
    const attrParts = [];
    remaining = remaining.replace(/\[([^\]]+)\]/g, (_, inner) => {
      attrParts.push(inner.trim());
      return '';
    });
    const classParts = [];
    remaining = remaining.replace(/\.([A-Za-z0-9_-]+)/g, (_, inner) => {
      classParts.push(inner);
      return '';
    });
    const tag = remaining.trim();

    if (tag && tag !== '*' && node.tagName.toLowerCase() !== tag.toLowerCase()) {
      return false;
    }
    if (classParts.some((name) => !node.classList.contains(name))) {
      return false;
    }
    if (attrParts.some((part) => !matchesAttribute(node, part))) {
      return false;
    }
    if (notParts.some((part) => matchesSimpleSelector(node, part))) {
      return false;
    }
    return true;
  }

  function matchesAttribute(node, part) {
    const eq = /^([^=]+)=["']?(.+?)["']?$/.exec(part);
    if (!eq) {
      return node.getAttribute(part) !== null;
    }
    return node.getAttribute(eq[1].trim()) === eq[2];
  }

  function dispatchWithPath(target, event) {
    const path = [];
    let current = target;
    while (current) {
      path.push(current);
      current = current.parentNode;
    }

    for (let index = path.length - 1; index >= 0; index -= 1) {
      runListeners(path[index], event, true);
      if (event.propagationStopped) {
        return !event.defaultPrevented;
      }
    }

    for (let index = 0; index < path.length; index += 1) {
      runListeners(path[index], event, false);
      if (event.propagationStopped) {
        return !event.defaultPrevented;
      }
    }

    return !event.defaultPrevented;
  }

  function runListeners(node, event, capture) {
    const list = node.listeners.get(event.type) || [];
    list.forEach(({ listener, capture: listenerCapture }) => {
      if (listenerCapture !== capture) {
        return;
      }
      event.currentTarget = node;
      listener.call(node, event);
    });
  }

  const document = new FakeDocument();
  const window = {
    document,
    innerWidth: 1280,
    innerHeight: 720,
    pageXOffset: 0,
    pageYOffset: 0,
    listeners: new Map(),
    getComputedStyle(node) {
      return {
        getPropertyValue(name) {
          let current = node;
          while (current) {
            const value = current.style && typeof current.style.getPropertyValue === 'function'
              ? current.style.getPropertyValue(name)
              : '';
            if (value) {
              return value;
            }
            current = current.parentNode;
          }
          return '';
        },
        get color() {
          let current = node;
          while (current) {
            if (current.style && current.style.color) {
              return current.style.color;
            }
            current = current.parentNode;
          }
          return '';
        },
        get font() {
          let current = node;
          while (current) {
            if (current.style && current.style.font) {
              return current.style.font;
            }
            current = current.parentNode;
          }
          return '';
        }
      };
    },
    addEventListener(type, listener, options) {
      const capture = !!(options === true || (options && options.capture === true));
      const list = this.listeners.get(type) || [];
      list.push({ listener, capture });
      this.listeners.set(type, list);
    },
    removeEventListener(type, listener, options) {
      const capture = !!(options === true || (options && options.capture === true));
      const list = this.listeners.get(type) || [];
      this.listeners.set(
        type,
        list.filter((entry) => entry.listener !== listener || entry.capture !== capture)
      );
    },
    dispatch(type, overrides = {}) {
      const event = createEvent(type, overrides.target || document, overrides);
      const list = this.listeners.get(type) || [];
      list.forEach(({ listener }) => listener.call(this, event));
    }
  };
  document.defaultView = window;
  return { document, window };
}

function createFixedDate(isoString) {
  const realDate = Date;
  const fixedInstant = new realDate(isoString);
  function FakeDate(...args) {
    if (!(this instanceof FakeDate)) {
      return realDate(...args);
    }
    if (args.length === 0) {
      return new realDate(fixedInstant.getTime());
    }
    return new realDate(...args);
  }
  FakeDate.UTC = realDate.UTC;
  FakeDate.parse = realDate.parse;
  FakeDate.now = () => fixedInstant.getTime();
  FakeDate.prototype = realDate.prototype;
  return FakeDate;
}

function loadApi(fakeDom = null, injectedDate = Date) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const context = {
    console,
    Date: injectedDate,
    setTimeout,
    clearTimeout
  };
  if (fakeDom) {
    context.window = fakeDom.window;
    context.document = fakeDom.document;
    fakeDom.window.window = fakeDom.window;
  } else {
    context.window = {};
  }
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'mini-calendar.js' });
  return fakeDom ? fakeDom.window.ConyMiniCalendar : context.window.ConyMiniCalendar;
}

function openPanel(trigger) {
  trigger.click();
}

function pressKey(target, key) {
  const event = createEvent('keydown', target, { key });
  target.dispatchEvent(event);
  return event;
}

function findAll(rootNode, selector) {
  return rootNode.querySelectorAll(selector);
}

function find(rootNode, selector) {
  const match = rootNode.querySelector(selector);
  check(`missing selector ${selector}`, !!match);
  return match;
}

function buildMounted(options = {}) {
  const fakeDom = createFakeDom();
  const api = loadApi(fakeDom, options.Date || Date);
  const host = fakeDom.document.createElement('div');
  fakeDom.document.body.appendChild(host);
  const changes = [];
  const controller = api.mount(host, {
    date: options.date || '',
    time: options.time || '',
    min: options.min ?? null,
    max: options.max ?? null,
    onChange(value) {
      changes.push(value);
    }
  });
  return { api, fakeDom, host, controller, changes };
}

function countDocumentListeners(fakeDom, type) {
  return (fakeDom.document.listeners.get(type) || []).length;
}

function countWindowListeners(fakeDom, type) {
  return (fakeDom.window.listeners.get(type) || []).length;
}

const helperApi = loadApi();

check('shared mini calendar exposes mount API', typeof helperApi?.mount === 'function');
check(
  'shared CSS hides portaled panels when hidden',
  /\.cony-mini-calendar-panel\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/s.test(styleSource)
);
check(
  'shared CSS gives portaled panels fallback theme tokens',
  /\.cony-mini-calendar-panel\s*\{[\s\S]*--cony-mini-calendar-surface:\s*#171717;[\s\S]*--cony-mini-calendar-font-mono:\s*"Cascadia Code",\s*Consolas,\s*monospace;[\s\S]*color:\s*var\(--cony-mini-calendar-text\);[\s\S]*font:\s*13px\/1\.4\s*"Segoe UI",\s*sans-serif;/s.test(styleSource)
);
check(
  'shared CSS keeps time columns vertically scrollable',
  /\.cony-mini-calendar-timecol\s*\{[\s\S]*overflow-y:\s*auto;[\s\S]*\}/s.test(styleSource)
);
check(
  'shared CSS hides Firefox time-wheel scrollbars',
  /\.cony-mini-calendar-timecol\s*\{[\s\S]*scrollbar-width:\s*none;[\s\S]*\}/s.test(styleSource)
);
check(
  'shared CSS hides legacy Microsoft time-wheel scrollbars',
  /\.cony-mini-calendar-timecol\s*\{[\s\S]*-ms-overflow-style:\s*none;[\s\S]*\}/s.test(styleSource)
);
check(
  'shared CSS hides WebKit time-wheel scrollbars',
  /\.cony-mini-calendar-timecol::\-webkit-scrollbar\s*\{\s*display:\s*none;\s*\}/s.test(styleSource)
);
check('shared mini calendar keeps 24-hour values', helperApi.testing.normalizeTime('23:59') === '23:59');
check('shared mini calendar rejects 12-hour values', helperApi.testing.normalizeTime('11:59 PM') === '');
check(
  'shared mini calendar combines local date and time',
  helperApi.testing.toTimestamp('2026-07-16', '23:59') === new Date(2026, 6, 16, 23, 59).getTime()
);
check(
  'shared mini calendar exposes 42-day grid helper',
  typeof helperApi.testing.buildCalendarCells === 'function'
);
check(
  'shared mini calendar builds a fixed 42-day grid',
  helperApi.testing.buildCalendarCells(2026, 6).length === 42
);

{
  const { fakeDom, host } = buildMounted({ date: '2026-07-16', time: '23:59' });
  check('date trigger renders into host', !!host.querySelector('.cony-mini-calendar-date-trigger'));
  check('time trigger renders into host', !!host.querySelector('.cony-mini-calendar-time-trigger'));
  check('mount builds 24 hour options', findAll(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Hour"] .cony-mini-calendar-timeopt').length === 24);
  check('mount builds 60 minute options', findAll(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Minute"] .cony-mini-calendar-timeopt').length === 60);
  check('selected hour advertises role option', find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Hour"] .cony-mini-calendar-timeopt.is-selected').getAttribute('role') === 'option');
  check('selected minute advertises role option', find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Minute"] .cony-mini-calendar-timeopt.is-selected').getAttribute('role') === 'option');
  check('selected hour exposes aria-selected true', find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Hour"] .cony-mini-calendar-timeopt.is-selected').getAttribute('aria-selected') === 'true');
  check('selected minute exposes aria-selected true', find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Minute"] .cony-mini-calendar-timeopt.is-selected').getAttribute('aria-selected') === 'true');
  check('time clear control is a sibling button', !!host.querySelector('.cony-mini-calendar-time-actions .cony-mini-calendar-clear'));
  check('time clear control is not nested inside the trigger', !find(host, '.cony-mini-calendar-time-actions').querySelector('.cony-mini-calendar-time-trigger .cony-mini-calendar-clear'));
  check('time clear control uses button type', find(host, '.cony-mini-calendar-clear').tagName === 'BUTTON');
  check('time clear control has aria-label', find(host, '.cony-mini-calendar-clear').getAttribute('aria-label') === 'Clear time');
  check('time clear control is outside the trigger subtree', !find(host, '.cony-mini-calendar-time-trigger').contains(find(host, '.cony-mini-calendar-clear')));
  void fakeDom;
}

{
  const fakeDom = createFakeDom();
  const host = fakeDom.document.createElement('div');
  host.style.setProperty('--cony-mini-calendar-surface', '#101010');
  host.style.setProperty('--cony-mini-calendar-text', '#fefefe');
  host.style.setProperty('--cony-mini-calendar-radius', '18px');
  host.style.setProperty('--cony-mini-calendar-font-mono', '"Fira Code", monospace');
  host.style.font = '14px/1.5 "Segoe UI", sans-serif';
  host.style.color = 'rgb(254, 254, 254)';
  fakeDom.document.body.appendChild(host);
  const api = loadApi(fakeDom, Date);
  api.mount(host, { date: '2026-07-16', time: '23:59' });
  const datePanel = find(fakeDom.document.body, '.cony-mini-calendar-date-panel');
  const timePanel = find(fakeDom.document.body, '.cony-mini-calendar-time-panel');
  TOKEN_NAMES.forEach((name) => {
    const expected = name === '--cony-mini-calendar-surface'
      ? '#101010'
      : name === '--cony-mini-calendar-text'
        ? '#fefefe'
        : name === '--cony-mini-calendar-radius'
          ? '18px'
          : name === '--cony-mini-calendar-font-mono'
            ? '"Fira Code", monospace'
            : '';
    if (expected) {
      check(`date panel syncs ${name}`, datePanel.style.getPropertyValue(name) === expected);
      check(`time panel syncs ${name}`, timePanel.style.getPropertyValue(name) === expected);
    }
  });
  check('date panel syncs inherited font', datePanel.style.font === '14px/1.5 "Segoe UI", sans-serif');
  check('time panel syncs inherited font', timePanel.style.font === '14px/1.5 "Segoe UI", sans-serif');
  check('date panel syncs inherited color', datePanel.style.color === 'rgb(254, 254, 254)');
  check('time panel syncs inherited color', timePanel.style.color === 'rgb(254, 254, 254)');

  host.style.setProperty('--cony-mini-calendar-surface', '#202020');
  find(host, '.cony-mini-calendar-date-trigger').click();
  check('date panel resyncs host tokens when opening', datePanel.style.getPropertyValue('--cony-mini-calendar-surface') === '#202020');
  check('time panel resyncs host tokens when opening', timePanel.style.getPropertyValue('--cony-mini-calendar-surface') === '#202020');
}

{
  const fixedDate = createFixedDate('2026-07-16T09:10:00');
  const { fakeDom, host, changes } = buildMounted({ Date: fixedDate });
  check('empty mount emits an empty date payload', changes[0]?.date === '');
  check('empty mount emits an empty time payload', changes[0]?.time === '');
  check('empty mount keeps timestamp null until both values are set', changes[0]?.timestamp === null);
  check('empty mount keeps date trigger in empty state', find(host, '.cony-mini-calendar-date-trigger').classList.contains('is-empty'));
  check('empty mount keeps time trigger in empty state', find(host, '.cony-mini-calendar-time-trigger').classList.contains('is-empty'));
  check('empty mount hides the clear time control', find(host, '.cony-mini-calendar-clear').hidden === true);

  const dateTrigger = find(host, '.cony-mini-calendar-date-trigger');
  openPanel(dateTrigger);
  check('empty mount opens on the live month title', find(fakeDom.document.body, '.cony-mini-calendar-title').textContent === 'July 2026');
  check('empty mount marks today from the live clock path', !!fakeDom.document.body.querySelector('.cony-mini-calendar-day.is-today[data-key="2026-07-16"]'));
}

{
  const mounted = buildMounted({ date: '2026-07-16', time: '23:59' });
  const { fakeDom, host } = mounted;
  const dateTrigger = find(host, '.cony-mini-calendar-date-trigger');
  const timeTrigger = find(host, '.cony-mini-calendar-time-trigger');
  dateTrigger.setBoundingClientRect({ left: 1180, top: 680, width: 96, height: 38 });
  timeTrigger.setBoundingClientRect({ left: 1188, top: 680, width: 88, height: 38 });

  openPanel(dateTrigger);
  const datePanel = find(fakeDom.document.body, '.cony-mini-calendar-date-panel');
  check('date panel portals to document.body', datePanel.parentNode === fakeDom.document.body);
  check('date panel uses fixed positioning', datePanel.style.position === 'fixed');
  check('date panel clamps to viewport right edge', Number.parseFloat(datePanel.style.left) <= fakeDom.window.innerWidth);
  check('date panel clamps to viewport bottom edge', Number.parseFloat(datePanel.style.top) <= fakeDom.window.innerHeight);

  openPanel(timeTrigger);
  const timePanel = find(fakeDom.document.body, '.cony-mini-calendar-time-panel');
  check('time panel portals to document.body', timePanel.parentNode === fakeDom.document.body);
  check('time panel uses fixed positioning', timePanel.style.position === 'fixed');

  timeTrigger.setBoundingClientRect({ left: 12, top: 12, width: 88, height: 38 });
  fakeDom.window.dispatch('resize');
  check('reposition updates left on resize', Number.parseFloat(timePanel.style.left) >= 0);
  check('reposition updates top on resize', Number.parseFloat(timePanel.style.top) >= 0);
}

{
  const { fakeDom, host } = buildMounted({ date: '2026-07-16', time: '23:59' });
  const timeTrigger = find(host, '.cony-mini-calendar-time-trigger');
  openPanel(timeTrigger);
  const timePanel = find(fakeDom.document.body, '.cony-mini-calendar-time-panel');
  const panelOption = find(timePanel, '.cony-mini-calendar-timeopt.is-selected');
  fakeDom.document.dispatchEvent(createEvent('pointerdown', panelOption));
  check('clicking inside the portaled panel keeps it open', timeTrigger.getAttribute('aria-expanded') === 'true');
  fakeDom.document.dispatchEvent(createEvent('pointerdown', fakeDom.document.body));
  check('clicking outside closes the portaled panel', timeTrigger.getAttribute('aria-expanded') === 'false');
}

{
  const { fakeDom, host } = buildMounted({ date: '2026-07-16', time: '23:59' });
  const dateTrigger = find(host, '.cony-mini-calendar-date-trigger');
  const timeTrigger = find(host, '.cony-mini-calendar-time-trigger');

  openPanel(dateTrigger);
  fakeDom.document.dispatchEvent(createEvent('keydown', fakeDom.document.body, { key: 'Escape' }));
  check('escape returns focus to date trigger', fakeDom.document.activeElement === dateTrigger);

  openPanel(timeTrigger);
  fakeDom.document.dispatchEvent(createEvent('keydown', fakeDom.document.body, { key: 'Escape' }));
  check('escape returns focus to time trigger', fakeDom.document.activeElement === timeTrigger);
}

{
  const { fakeDom, host, controller } = buildMounted({ date: '2026-07-16', time: '23:59' });
  const timeTrigger = find(host, '.cony-mini-calendar-time-trigger');
  openPanel(timeTrigger);
  const selectedHour = find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Hour"] .cony-mini-calendar-timeopt.is-selected');
  const selectedMinute = find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Minute"] .cony-mini-calendar-timeopt.is-selected');
  check('opening the time panel scrolls the selected hour into view', selectedHour.scrollIntoViewCalls.length > 0);
  check('opening the time panel scrolls the selected minute into view', selectedMinute.scrollIntoViewCalls.length > 0);

  controller.setValue({ date: '2026-07-16', time: '21:45' });
  openPanel(timeTrigger);
  const fallbackHour = find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Hour"] .cony-mini-calendar-timeopt.is-selected');
  const fallbackMinute = find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Minute"] .cony-mini-calendar-timeopt.is-selected');
  fallbackHour.scrollIntoView = undefined;
  fallbackMinute.scrollIntoView = undefined;
  fallbackHour.offsetTop = 220;
  fallbackHour.offsetHeight = 20;
  fallbackMinute.offsetTop = 310;
  fallbackMinute.offsetHeight = 20;
  const hourCol = find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Hour"]');
  const minuteCol = find(fakeDom.document.body, '.cony-mini-calendar-timecol[aria-label="Minute"]');
  hourCol.clientHeight = 100;
  minuteCol.clientHeight = 100;
  openPanel(timeTrigger);
  check('opening the time panel falls back to centered hour scrolling', hourCol.scrollTop > 0);
  check('opening the time panel falls back to centered minute scrolling', minuteCol.scrollTop > 0);
}

{
  const { fakeDom, host } = buildMounted({
    date: '2026-07-08',
    time: '12:00',
    min: new Date(2026, 6, 8, 0, 0).getTime(),
    max: new Date(2026, 6, 20, 23, 59).getTime()
  });
  const dateTrigger = find(host, '.cony-mini-calendar-date-trigger');
  openPanel(dateTrigger);
  const selected = find(fakeDom.document.body, '.cony-mini-calendar-day.is-selected');
  pressKey(selected, 'ArrowDown');
  check('date grid arrow navigation preserves 7-column movement across disabled boundaries', selected.ownerDocument.activeElement?.dataset?.key === '2026-07-15');
}

{
  const mounted = buildMounted({ date: '2026-07-16', time: '23:59' });
  const { fakeDom, host, controller } = mounted;
  const clearButton = find(host, '.cony-mini-calendar-clear');
  clearButton.click();
  check('clear button clears the selected time value', controller.getValue().time === '');
  controller.setValue({ date: '2026-07-16', time: '23:59' });
  pressKey(clearButton, 'Enter');
  check('clear button keyboard interaction clears the selected time value', controller.getValue().time === '');

  const dateTrigger = find(host, '.cony-mini-calendar-date-trigger');
  openPanel(dateTrigger);
  check('document pointer listener exists before destroy', countDocumentListeners(fakeDom, 'pointerdown') > 0);
  check('window resize listener exists before destroy', countWindowListeners(fakeDom, 'resize') > 0);
  controller.destroy();
  check('destroy empties host content', host.children.length === 0);
  check('destroy removes portaled panels', !fakeDom.document.body.querySelector('.cony-mini-calendar-panel'));
  check('destroy removes document pointer listener', countDocumentListeners(fakeDom, 'pointerdown') === 0);
  check('destroy removes document key listener', countDocumentListeners(fakeDom, 'keydown') === 0);
  check('destroy removes window resize listener', countWindowListeners(fakeDom, 'resize') === 0);
  check('destroy removes window scroll listener', countWindowListeners(fakeDom, 'scroll') === 0);
}

check(
  'shared calendar panels sit above app drawers',
  /\.cony-mini-calendar-panel\s*\{[\s\S]*z-index:\s*1400;/s.test(styleSource) && !/style\.zIndex\s*=\s*['"]999['"]/.test(calendarSource)
);

console.log('mini-calendar contract ok');
