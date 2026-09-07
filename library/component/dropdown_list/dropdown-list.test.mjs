import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const script = fs.readFileSync(path.join(root, 'dropdown-list.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'dropdown-list.css'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const activeRoot = path.join(root, '..', '..', '..', 'VERSION', 'ACTIVE');
const tasksHtml = fs.readFileSync(path.join(activeRoot, 'tasks.html'), 'utf8');
const tasksJs = fs.readFileSync(path.join(activeRoot, 'tasks.js'), 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(script.includes('global.ConyDropdownList'), 'dropdown list should expose a browser global');
expect(script.includes("setAttribute('role', 'listbox')") && script.includes("setAttribute('role', 'option')"), 'dropdown list should expose listbox semantics');
expect(script.includes("event.key === 'ArrowDown'") && script.includes("event.key === 'Escape'"), 'dropdown list should support keyboard navigation and Escape');
expect(script.includes('onDocumentClick') && script.includes('root.contains(event.target)'), 'dropdown list should close on outside click');
expect(script.includes('documentRef.body.appendChild(panel)'), 'dropdown list panel should be portaled outside transformed containers');
expect(script.includes('panel.parentNode.removeChild(panel)'), 'dropdown list destroy should remove its portaled panel');
expect(style.includes('--cony-dropdown-list-surface-2') && style.includes('position: fixed'), 'dropdown list should use shared dark panel styling');
expect(style.includes('.cony-dropdown-list-option[aria-selected="true"]'), 'dropdown list should style the selected option');
expect(readme.includes('ConyDropdownList.mount'), 'dropdown list README should document the API');
expect(tasksHtml.includes('../../library/component/dropdown_list/dropdown-list.css'), 'tasks.html should load dropdown list CSS');
expect(tasksHtml.includes('../../library/component/dropdown_list/dropdown-list.js'), 'tasks.html should load dropdown list JS');
expect(tasksHtml.includes('id="task-edit-col"') && tasksHtml.includes('task-status-dropdown'), 'tasks.html should provide a status dropdown host');
expect(tasksJs.includes('ConyDropdownList.mount') && tasksJs.includes('getTaskStatus()'), 'tasks.js should use the shared status dropdown');

console.log('dropdown-list contract ok');
