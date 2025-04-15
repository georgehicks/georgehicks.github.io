const VERSION = '1.2.0';
console.log(`MindTree Focus app.js v${VERSION}`);

const treeContainer = document.getElementById('tree');
const doneContainer = document.getElementById('done');
const timerSelect = document.getElementById('timer');
const startTimerBtn = document.getElementById('start-timer');
const toggleThemeBtn = document.getElementById('toggle-theme');
const selectedPanel = document.getElementById('selected-panel');
const selectedTitle = document.getElementById('selected-title');
const countdownEl = document.getElementById('countdown');
const selectedNotes = document.getElementById('selected-notes');

let treeData = JSON.parse(localStorage.getItem('mindtree-data')) || [];
let doneTasks = JSON.parse(localStorage.getItem('mindtree-done')) || [];
let notesMap = JSON.parse(localStorage.getItem('mindtree-notes')) || {};
let activeNodeId = null;
let timer = null;
let timerEnd = null;

const save = () => {
  localStorage.setItem('mindtree-data', JSON.stringify(treeData));
  localStorage.setItem('mindtree-done', JSON.stringify(doneTasks));
  localStorage.setItem('mindtree-notes', JSON.stringify(notesMap));
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

  const render = (node, depth = 0, parentEl = treeContainer, isLast = false) => {
    const div = document.createElement('div');
    div.className = `
      group flex items-center gap-2 px-3 py-1 rounded transition-all
      border dark:border-gray-700 border-gray-300 
      bg-white dark:bg-gray-800
      shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-400
      ml-${depth * 4} relative
      ${isLast ? 'last-node' : ''}
    `;
    div.dataset.id = node.id;
    div.setAttribute('draggable', true);

    div.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', node.id);
      e.stopPropagation();
    });
    div.addEventListener('dragover', e => {
      e.preventDefault();
      div.classList.add('ring-2', 'ring-indigo-400');
    });
    div.addEventListener('dragleave', () => {
      div.classList.remove('ring-2', 'ring-indigo-400');
    });
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('ring-2', 'ring-indigo-400');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId === node.id) return;
      const [draggedNode] = removeNode(treeData, draggedId);
      node.children.push(draggedNode);
      draggedNode.collapsed = false;
      save(); renderTree();
    });

    const toggle = document.createElement('button');
    toggle.textContent = node.children.length ? (node.collapsed ? '▶' : '▼') : '';
    toggle.className = 'text-gray-500 text-sm w-4 focus:outline-none';
    toggle.onclick = () => {
      node.collapsed = !node.collapsed;
      save();
      renderTree();
    };

    const input = document.createElement('input');
    input.value = node.text;
    input.className = `
      bg-transparent flex-1 text-sm font-medium
      text-gray-900 dark:text-gray-100 focus:outline-none
      placeholder:text-gray-400
    `;
    input.placeholder = "New task...";
    input.onkeydown = e => handleKey(e, node, input);
    input.oninput = () => {
      node.text = input.value;
      save();
    };
    input.onfocus = () => {
      activeNodeId = node.id;
      showSelectedPanel(node);
    };
    input.onblur = () => {
      if (activeNodeId === node.id) {
        focusNode(node.id); // Reapply highlight after blur
      }
    };

    div.append(toggle, input);
    parentEl.appendChild(div);

    if (!node.collapsed) {
      node.children.forEach((child, idx) => render(child, depth + 1, parentEl, idx === node.children.length - 1));
    }
  };

  treeData.forEach((node, idx) => render(node, 0, treeContainer, idx === treeData.length - 1));
  doneTasks.forEach(text => {
    const doneEl = document.createElement('div');
    doneEl.textContent = text;
    doneEl.className = 'line-through text-gray-400';
    doneContainer.appendChild(doneEl);
  });
};

let keyTimeout;
const handleKey = (e, node, input) => {
  clearTimeout(keyTimeout);
  keyTimeout = setTimeout(() => {
    const parentList = findParentList(treeData, node.id);

    const blurKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (blurKeys.includes(e.key) || (e.ctrlKey && blurKeys.includes(e.key)) || (e.ctrlKey && e.key === 'Enter')) {
      input.blur();
    }

    if (!e.ctrlKey && e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocusRelative(-1, node.id);
    }

    if (!e.ctrlKey && e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocusRelative(1, node.id);
    }

    if (!e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      node.collapsed = true;
      save(); renderTree(); focusNode(node.id);
    }

    if (!e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      node.collapsed = false;
      save(); renderTree(); focusNode(node.id);
    }

    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      const sibling = createNode('');
      parentList.splice(parentList.indexOf(node) + 1, 0, sibling);
      save(); renderTree(); focusNode(sibling.id);
    }

    if ((e.key === 'Tab' && !e.shiftKey) || (e.ctrlKey && e.key === 'ArrowRight')) {
      e.preventDefault();
      const idx = parentList.indexOf(node);
      if (idx > 0) {
        const prev = parentList[idx - 1];
        prev.children.push(node);
        parentList.splice(idx, 1);
        save(); renderTree(); focusNode(node.id);
      }
    }

    if ((e.key === 'Tab' && e.shiftKey) || (e.ctrlKey && e.key === 'ArrowLeft')) {
      e.preventDefault();
      const [parent, list] = findParent(treeData, node.id);
      if (parent) {
        const idx = list.indexOf(node);
        parentList.splice(parentList.indexOf(parent) + 1, 0, node);
        list.splice(idx, 1);
        save(); renderTree(); focusNode(node.id);
      }
    }

    if (e.ctrlKey && e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = parentList.indexOf(node);
      if (idx > 0) {
        [parentList[idx], parentList[idx - 1]] = [parentList[idx - 1], parentList[idx]];
        save(); renderTree(); focusNode(node.id);
      }
    }

    if (e.ctrlKey && e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = parentList.indexOf(node);
      if (idx < parentList.length - 1) {
        [parentList[idx], parentList[idx + 1]] = [parentList[idx + 1], parentList[idx]];
        save(); renderTree(); focusNode(node.id);
      }
    }

    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      doneTasks.push(node.text);
      parentList.splice(parentList.indexOf(node), 1);
      save(); renderTree();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      input.blur();
      activeNodeId = null;
      selectedPanel.classList.add('hidden');
      save();
    }
  }, 50);
};

const getAllVisibleNodes = (list = treeData) => {
  const result = [];
  const recurse = (nodes) => {
    for (let node of nodes) {
      result.push(node);
      if (!node.collapsed) recurse(node.children);
    }
  };
  recurse(list);
  return result;
};

const moveFocusRelative = (direction, currentId) => {
  const nodes = getAllVisibleNodes();
  const idx = nodes.findIndex(n => n.id === currentId);
  const target = nodes[idx + direction];
  if (target) focusNode(target.id);
};

const focusNode = id => {
  setTimeout(() => {
    document.querySelectorAll('.node-highlight').forEach(el => el.classList.remove('node-highlight'));
    const el = document.querySelector(`[data-id="${id}"] input`);
    const parentDiv = document.querySelector(`[data-id="${id}"]`);
    if (el && parentDiv) {
      parentDiv.classList.add('node-highlight');
      el.focus();
    }
  }, 10);
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
    if (list[i].id === id) return [list.splice(i, 1)[0], list];
    const [found, sublist] = removeNode(list[i].children, id);
    if (found) return [found, sublist];
  }
  return [null, null];
};

const showSelectedPanel = (node) => {
  selectedPanel.classList.remove('hidden');
  selectedTitle.textContent = node.text || '(untitled)';
  selectedNotes.innerText = notesMap[node.id] || '';
  selectedNotes.oninput = () => {
    notesMap[node.id] = selectedNotes.innerText;
    save();
  };
};

startTimerBtn.onclick = () => {
  if (!activeNodeId) return;
  const mins = parseInt(timerSelect.value);
  timerEnd = Date.now() + mins * 60000;
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
};

const updateCountdown = () => {
  if (!timerEnd) return;
  const diff = timerEnd - Date.now();
  if (diff <= 0) {
    clearInterval(timer);
    countdownEl.textContent = '⏰ Time’s up!';
    new Notification("Focus session ended", { body: "Take a short break or start again." });
  } else {
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    countdownEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }
};

toggleThemeBtn.onclick = () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
};

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}

if (treeData.length === 0) {
  treeData.push(createNode('New Task'));
}
renderTree();
