// Simple lyric writing app with component versioning and project storage

let projects = JSON.parse(localStorage.getItem('lyricProjects')) || {};
let currentProject = null;
let editingIndex = null;

function saveProjects() {
  localStorage.setItem('lyricProjects', JSON.stringify(projects));
}

function componentDisplayName(type, version) {
  switch (type) {
    case 'intro':
      return 'Intro';
    case 'verse':
      return `Verze ${version}`;
    case 'chorus':
      return 'Refrén';
    case 'bridge':
      return 'Bridge';
    case 'outro':
      return 'Outro';
    default:
      return type;
  }
}

function renderProjectOptions() {
  const select = document.getElementById('project-select');
  select.innerHTML = '';
  Object.keys(projects).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentProject) opt.selected = true;
    select.appendChild(opt);
  });
}

function loadProject(name) {
  currentProject = name;
  renderProjectOptions();
  renderLyricsList();
}

function init() {
  if (Object.keys(projects).length === 0) {
    projects['Alap projekt'] = [];
  }
  currentProject = Object.keys(projects)[0];
  renderProjectOptions();
  renderLyricsList();
}

document.getElementById('project-select').addEventListener('change', (e) => {
  loadProject(e.target.value);
});

document.getElementById('new-project').addEventListener('click', () => {
  const name = prompt('Projekt neve?');
  if (name && !projects[name]) {
    projects[name] = [];
    saveProjects();
    loadProject(name);
  }
});

document.getElementById('add-btn').addEventListener('click', () => {
  const type = document.getElementById('component-type').value;
  let version = null;
  if (type === 'verse') {
    const verses = projects[currentProject].filter((c) => c.type === 'verse');
    version = verses.length + 1;
  }
  openEditor({ type, version, text: '' }, null);
});

function openEditor(component, index) {
  editingIndex = index;
  const editor = document.getElementById('editor');
  document.getElementById('editor-text').value = component.text || '';
  document.getElementById('editor-title').textContent = componentDisplayName(
    component.type,
    component.version
  );
  editor.dataset.type = component.type;
  if (component.version) editor.dataset.version = component.version;
  else delete editor.dataset.version;
  editor.classList.remove('hidden');
}

document.getElementById('save-btn').addEventListener('click', () => {
  const editor = document.getElementById('editor');
  const type = editor.dataset.type;
  const version = editor.dataset.version
    ? parseInt(editor.dataset.version, 10)
    : null;
  const text = document.getElementById('editor-text').value;

  if (editingIndex !== null) {
    const comp = projects[currentProject][editingIndex];
    comp.text = text;
  } else {
    const comp = { type, text };
    if (version) comp.version = version;
    projects[currentProject].push(comp);
  }

  saveProjects();
  editor.classList.add('hidden');
  renderLyricsList();
});

document.getElementById('delete-btn').addEventListener('click', () => {
  if (editingIndex !== null) {
    projects[currentProject].splice(editingIndex, 1);
    saveProjects();
    renderLyricsList();
  }
  document.getElementById('editor').classList.add('hidden');
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  document.getElementById('editor').classList.add('hidden');
});

function renderLyricsList() {
  const ul = document.getElementById('lyrics-list');
  ul.innerHTML = '';
  projects[currentProject].forEach((comp, index) => {
    const li = document.createElement('li');
    li.setAttribute('data-index', index);

    const header = document.createElement('strong');
    header.textContent = componentDisplayName(comp.type, comp.version);
    li.appendChild(header);

    const pre = document.createElement('pre');
    pre.textContent = comp.text;
    li.appendChild(pre);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Szerkeszt';
    editBtn.addEventListener('click', () => openEditor(comp, index));
    li.appendChild(editBtn);

    ul.appendChild(li);
  });

  Sortable.create(ul, {
    animation: 150,
    onEnd: (evt) => {
      const arr = projects[currentProject];
      const [moved] = arr.splice(evt.oldIndex, 1);
      arr.splice(evt.newIndex, 0, moved);
      saveProjects();
      renderLyricsList();
    },
  });
}

function getFullText() {
  return projects[currentProject]
    .map((c) => `${componentDisplayName(c.type, c.version)}\n${c.text}`)
    .join('\n\n');
}

document
  .getElementById('export-docx')
  .addEventListener('click', async () => {
    const { Document, Packer, Paragraph } = window.docx;
    const doc = new Document();
    const lines = getFullText().split('\n');
    lines.forEach((line) => doc.addParagraph(new Paragraph(line)));
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${currentProject}.docx`);
  });

document.getElementById('export-pdf').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const text = getFullText();
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 10, 10);
  doc.save(`${currentProject}.pdf`);
});

init();
