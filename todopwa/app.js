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

const createNode = (text = '', children = []) => ({
  id: crypto.randomUUID(),
  text,
  collapsed: false,
  children
});

const renderTree = () => {
  treeContainer.innerHTML = '';
  doneContainer.innerHTML = '';

  const render = (node, depth = 0, parentEl = treeContainer) => {
    const div = document.createElement('div');
    div.className = `ml-${depth * 4} group flex items-center space-x-2`;
    div.dataset.id = node.id;

    // --- Drag & Drop ---
    div.setAttribute('draggable', true);
    div.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', node.id);
      e.stopPropagation();
    });
    div.addEventListener('dragover', e => {
      e.preventDefault();
      div.classList.add('bg-yellow-100', 'dark:bg-yellow-800');
    });
    div.addEventListener('dragleave', () => {
      div.classList.remove('bg-yellow-100', 'dark:bg-yellow-800');
    });
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('bg-yellow-100', 'dark:bg-yellow-800');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId === node.id) return;
      const [draggedNode, draggedList] = removeNode(treeData, draggedId);
      node.children.push(draggedNode);
      draggedNode.collapsed = false;
      save(); renderTree();
    });

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

  if (e.key === 'Tab' && !e.shiftKey || (e.ctrlKey && e.key === 'ArrowRight')) {
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

  if (e.key === 'Tab' && e.shiftKey || (e.ctrlKey && e.key === 'ArrowLeft')) {
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

  if (e.ctrlKey && e.key === 'ArrowUp') {
    e.preventDefault();
    const idx = parentList.indexOf(node);
    if (idx > 0) {
      [parentList[idx], parentList[idx - 1]] = [parentList[idx - 1], parentList[idx]];
      save(); renderTree();
      setTimeout(() => focusNode(node.id), 0);
    }
  }

  if (e.ctrlKey && e.key === 'ArrowDown') {
    e.preventDefault();
    const idx = parentList.indexOf(node);
    if (idx < parentList.length - 1) {
      [parentList[idx], parentList[idx + 1]] = [parentList[idx + 1], parentList[idx]];
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
};

const focusNode = id => {
  const el = document.querySelector(`[data-id="${id}"] input`);
  if (el) el.focus();
};

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

const removeNode = (list, id) => {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return [list.splice(i, 1)[0], list];
    } else {
      const [found, sublist] = removeNode(list[i].children, id);
      if (found) return [found, sublist];
    }
  }
  return [null, null];
};

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

toggleThemeBtn.onclick = () => {
  document.documentElement.classList.toggle('dark');
};

if (treeData.length === 0) {
  treeData.push(createNode('New Task'));
}
renderTree();
