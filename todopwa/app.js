// --- Helpers & Constants ---
const treeContainer = document.getElementById('tree');
const doneContainer = document.getElementById('done');
const timerSelect = document.getElementById('timer');
const startTimerBtn = document.getElementById('start-timer');
const toggleThemeBtn = document.getElementById('toggle-theme');

let treeData = JSON.parse(localStorage.getItem('mindtree-data')) || [];
let doneTasks = JSON.parse(localStorage.getItem('mindtree-done')) || [];

const save = () => {
  localStorage.setItem('mindtree-data', JSON.stringify(treeData));
  localStorage.setItem('mindtree-done', JSON.stringify(doneTasks));
};

// --- Tree Node Constructor ---
const createNode = (text = '', children = []) => ({
  id: crypto.randomUUID(),
  text,
  collapsed: false,
  children
});

// --- Render Functions ---
const renderTree = () => {
  treeContainer.innerHTML = '';
  doneContainer.innerHTML = '';
  const render = (node, depth = 0, parentEl = treeContainer) => {
    const div = document.createElement('div');
    div.className = `ml-${depth * 4} group flex items-center space-x-2`;
    div.dataset.id = node.id;

    const toggle = document.createElement('button');
    toggle.textContent = node.children.length ? (node.collapsed ? '+' : '-') : '';
    toggle.className = 'w-4 text-sm';
    toggle.onclick = () => {
      node.collapsed = !node.collapsed;
      save();
      renderTree();
    };

    const input = document.createElement('input');
    input.value = node.text;
    input.className = 'bg-transparent focus:outline-none flex-1';
    input.oninput = () => {
      node.text = input.value;
      save();
    };
    input.onkeydown = e => handleKey(e, node, input);

    div.append(toggle, input);
    parentEl.appendChild(div);

    if (!node.collapsed) {
      node.children.forEach(child => render(child, depth + 1, parentEl));
    }
  };

  treeData.forEach(node => render(node));
  doneTasks.forEach(text => {
    const doneEl = document.createElement('div');
    doneEl.textContent = text;
    doneEl.className = 'line-through text-gray-400';
    doneContainer.appendChild(doneEl);
  });
};

// --- Keyboard Navigation ---
const handleKey = (e, node, input) => {
  e.stopPropagation();
  const parentList = findParentList(treeData, node.id);

  if (e.key === 'Enter' && !e.ctrlKey) {
    e.preventDefault();
    const sibling = createNode('');
    parentList.splice(parentList.indexOf(node) + 1, 0, sibling);
    save(); renderTree();
    setTimeout(() => focusNode(sibling.id), 0);
  }

  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    const idx = parentList.indexOf(node);
    if (idx > 0) {
      const prev = parentList[idx - 1];
      prev.children.push(node);
      parentList.splice(idx, 1);
      save(); renderTree();
      setTimeout(() => focusNode(node.id), 0);
    }
  }

  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    const [parent, list] = findParent(treeData, node.id);
    if (parent) {
      const idx = list.indexOf(node);
      parentList.splice(parentList.indexOf(parent) + 1, 0, node);
      list.splice(idx, 1);
      save(); renderTree();
      setTimeout(() => focusNode(node.id), 0);
    }
  }

  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    doneTasks.push(node.text);
    parentList.splice(parentList.indexOf(node), 1);
    save(); renderTree();
  }

  if (e.key === ' ' && !e.ctrlKey) {
    e.preventDefault();
    node.collapsed = !node.collapsed;
    save(); renderTree();
  }

  // Arrow keys can be extended here for more
};

// --- Utility to Focus Node ---
const focusNode = id => {
  const el = document.querySelector(`[data-id="${id}"] input`);
  if (el) el.focus();
};

// --- Find Parent Node ---
const findParentList = (list, id) => {
  for (let node of list) {
    if (node.id === id) return list;
    const result = findParentList(node.children, id);
    if (result) return result;
  }
  return null;
};

const findParent = (list, id, parent = null) => {
  for (let node of list) {
    if (node.id === id) return [parent, list];
    const result = findParent(node.children, id, node);
    if (result) return result;
  }
  return [null, null];
};

// --- Timer & Notifications ---
startTimerBtn.onclick = () => {
  const mins = parseInt(timerSelect.value);
  const ms = mins * 60 * 1000;
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  setTimeout(() => {
    new Notification("⏰ Time's up!", {
      body: `Extend your session for another ${mins} minutes?`,
    });
  }, ms);
};

// --- Theme Toggle ---
toggleThemeBtn.onclick = () => {
  document.documentElement.classList.toggle('dark');
};

// --- Initial State ---
if (treeData.length === 0) {
  treeData.push(createNode('New Task'));
}
renderTree();
