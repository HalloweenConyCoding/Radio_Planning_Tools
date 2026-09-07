# Cony Dropdown List

Reusable framework-free single-select dropdown for local `file:///` pages.

```js
const controller = window.ConyDropdownList.mount(host, {
  value: 'todo',
  placeholder: 'Select an option',
  ariaLabel: 'Status',
  options: [
    { value: 'todo', label: 'To Do' },
    { value: 'progress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ],
  onChange(value, option) {
    console.log(value, option.label);
  }
});
```

The controller exposes `getValue()`, `setValue(value)`, `close(focusTrigger)`, and `destroy()`.
It supports mouse selection, Arrow keys, Home/End, Enter/Space, Escape, and outside-click close.
