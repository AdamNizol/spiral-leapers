import { presets, getPreset } from './presets.js';
import { SpiralSimulation } from './simulation.js';
import { PatternRenderer } from './renderer.js';
import { PieceEditor } from './piece-editor.js';
import { sanitizeConfig, uniqueId, downloadConfig, configToHash, configFromHash } from './state.js';

const $ = id => document.getElementById(id);
const palette = ['#ef3652', '#35a6ff', '#ffc43d', '#37d495', '#ba71ff', '#ff8737', '#56e4df', '#ef79bd'];

let config = sanitizeConfig(getPreset());
let simulation = null;
let renderer = new PatternRenderer($('pattern-canvas'));
let playFrame = 0;
let computeFrame = 0;
let playing = false;
let scheduledRender = 0;
let activePreset = presets[0].id;
let toastTimer = 0;

function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2300);
}

function cancelActivity() {
  playing = false;
  cancelAnimationFrame(playFrame);
  cancelAnimationFrame(computeFrame);
  cancelAnimationFrame(scheduledRender);
  $('play-pause').textContent = 'Play';
}

function resetSimulation() {
  cancelActivity();
  simulation = new SpiralSimulation(config);
  renderer.configure(config);
  updateReadout('Ready to render.');
}

function updateReadout(prefix = '') {
  const status = $('status');
  const end = simulation.finished ? ' · Finished' : '';
  status.textContent = `${prefix || 'Placed'} ${simulation.placements.toLocaleString()} squares · ${simulation.turnAttempts.toLocaleString()} team turns${end}`;
  const counts = $('counts');
  counts.innerHTML = '';
  config.teams.forEach((team, index) => {
    const pill = document.createElement('span');
    pill.className = 'count-pill';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = team.color;
    pill.append(swatch, `${team.name}: ${simulation.teamCounts[index].toLocaleString()}`);
    counts.append(pill);
  });
}

function renderFinal() {
  resetSimulation();
  const maxPerFrame = config.board.size >= 501 ? 18000 : 8500;
  const run = () => {
    const placements = simulation.runPlacements(maxPerFrame);
    renderer.paintMany(placements);
    updateReadout('Rendering…');
    if (!simulation.finished) {
      computeFrame = requestAnimationFrame(run);
    } else {
      updateReadout('Rendered.');
    }
  };
  computeFrame = requestAnimationFrame(run);
}

function queueFinalRender() {
  cancelActivity();
  scheduledRender = requestAnimationFrame(() => renderFinal());
}

function setConfig(nextConfig, message = '') {
  config = sanitizeConfig(nextConfig);
  bindBoardFields();
  renderPieces();
  renderTeams();
  resetSimulation();
  queueFinalRender();
  if (message) notify(message);
}

function bindBoardFields() {
  $('board-size').value = String(config.board.size);
  $('background-color').value = config.board.backgroundColor;
}

function changeBoard() {
  config.board.size = Number($('board-size').value);
  config.board.backgroundColor = $('background-color').value;
  config = sanitizeConfig(config);
  bindBoardFields();
  queueFinalRender();
}

function play() {
  cancelAnimationFrame(computeFrame);
  if (simulation.finished) resetSimulation();
  playing = true;
  $('play-pause').textContent = 'Pause';
  const animate = () => {
    if (!playing) return;
    const placements = simulation.runPlacements(Number($('play-speed').value));
    renderer.paintMany(placements);
    updateReadout('Playing…');
    if (simulation.finished) {
      playing = false;
      $('play-pause').textContent = 'Play';
      updateReadout('Playback complete.');
      return;
    }
    playFrame = requestAnimationFrame(animate);
  };
  playFrame = requestAnimationFrame(animate);
}

function pause() {
  playing = false;
  cancelAnimationFrame(playFrame);
  $('play-pause').textContent = 'Play';
  updateReadout('Paused.');
}

function makeThumbnail(piece) {
  const max = piece.offsets.reduce((value, item) => Math.max(value, Math.abs(item.dx), Math.abs(item.dy)), 1);
  const size = Math.max(3, Math.min(15, max * 2 + 1));
  const half = (size - 1) / 2;
  const offsets = new Set(piece.offsets.map(item => `${item.dx},${item.dy}`));
  const thumb = document.createElement('span');
  thumb.className = 'piece-thumb';
  thumb.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const cell = document.createElement('span');
      const dx = column - half;
      const dy = row - half;
      if (dx === 0 && dy === 0) cell.className = 'origin';
      else if (offsets.has(`${dx},${dy}`)) cell.className = 'active';
      thumb.append(cell);
    }
  }
  return thumb;
}

function renderPieces() {
  const list = $('piece-list');
  list.innerHTML = '';
  config.pieces.forEach(piece => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'piece-card';
    card.append(makeThumbnail(piece));
    const words = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'piece-name';
    name.textContent = piece.name;
    const count = document.createElement('span');
    count.className = 'piece-offset-count';
    count.textContent = `${piece.offsets.length} offsets`;
    words.append(name, document.createElement('br'), count);
    card.append(words);
    card.addEventListener('click', () => pieceEditor.open(piece, config.pieces.length > 1));
    list.append(card);
  });
}

function editTeamName(team, value) {
  team.name = value.trim().slice(0, 40) || 'Unnamed team';
  renderTeams();
  updateReadout('Updated.');
}

function sequenceOptions(selectedId) {
  const select = document.createElement('select');
  config.pieces.forEach(piece => {
    const option = document.createElement('option');
    option.value = piece.id;
    option.textContent = piece.name;
    option.selected = piece.id === selectedId;
    select.append(option);
  });
  return select;
}

function moveTeam(index, direction) {
  const other = index + direction;
  if (other < 0 || other >= config.teams.length) return;
  [config.teams[index], config.teams[other]] = [config.teams[other], config.teams[index]];
  renderTeams();
  queueFinalRender();
}

function renderTeams() {
  const list = $('team-list');
  list.innerHTML = '';
  config.teams.forEach((team, index) => {
    const card = document.createElement('article');
    card.className = 'team-card';

    const head = document.createElement('div');
    head.className = 'team-head';
    const color = document.createElement('input');
    color.type = 'color';
    color.value = team.color;
    color.title = `${team.name} colour`;
    color.addEventListener('input', () => { team.color = color.value; queueFinalRender(); });
    const name = document.createElement('input');
    name.type = 'text';
    name.value = team.name;
    name.maxLength = 40;
    name.addEventListener('change', () => editTeamName(team, name.value));
    const actions = document.createElement('div');
    actions.className = 'team-actions';
    [['↑', () => moveTeam(index, -1)], ['↓', () => moveTeam(index, 1)], ['⧉', () => duplicateTeam(index)], ['×', () => removeTeam(index)]].forEach(([label, action], buttonIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.title = ['Move earlier', 'Move later', 'Duplicate team', 'Remove team'][buttonIndex];
      button.className = `mini-button ${buttonIndex === 3 ? 'danger' : ''}`;
      button.addEventListener('click', action);
      actions.append(button);
    });
    head.append(color, name, actions);
    card.append(head);

    const targetTitle = document.createElement('span');
    targetTitle.className = 'team-block-title';
    targetTitle.textContent = 'Attacks';
    card.append(targetTitle);
    const targets = document.createElement('div');
    targets.className = 'targets';
    config.teams.filter(target => target.id !== team.id).forEach(target => {
      const label = document.createElement('label');
      label.className = 'target-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = team.attacks.includes(target.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && !team.attacks.includes(target.id)) team.attacks.push(target.id);
        if (!checkbox.checked) team.attacks = team.attacks.filter(value => value !== target.id);
        queueFinalRender();
      });
      label.append(checkbox, target.name);
      targets.append(label);
    });
    card.append(targets);

    const sequenceTitle = document.createElement('span');
    sequenceTitle.className = 'team-block-title';
    sequenceTitle.textContent = 'Piece sequence';
    card.append(sequenceTitle);
    const sequence = document.createElement('div');
    sequence.className = 'sequence';
    team.sequence.forEach((pieceId, sequenceIndex) => {
      const row = document.createElement('div');
      row.className = 'sequence-row';
      const label = document.createElement('span');
      label.className = 'sequence-index';
      label.textContent = String(sequenceIndex + 1);
      const select = sequenceOptions(pieceId);
      select.addEventListener('change', () => { team.sequence[sequenceIndex] = select.value; queueFinalRender(); });
      const buttons = document.createElement('div');
      buttons.className = 'sequence-buttons';
      [['↑', -1], ['↓', 1], ['×', 0]].forEach(([symbol, direction]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = symbol;
        button.className = 'mini-button';
        button.addEventListener('click', () => {
          if (direction === 0) {
            if (team.sequence.length > 1) team.sequence.splice(sequenceIndex, 1);
          } else {
            const targetIndex = sequenceIndex + direction;
            if (targetIndex >= 0 && targetIndex < team.sequence.length) {
              [team.sequence[sequenceIndex], team.sequence[targetIndex]] = [team.sequence[targetIndex], team.sequence[sequenceIndex]];
            }
          }
          renderTeams();
          queueFinalRender();
        });
        buttons.append(button);
      });
      row.append(label, select, buttons);
      sequence.append(row);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'button small add-sequence';
    add.textContent = 'Add sequence step';
    add.addEventListener('click', () => {
      team.sequence.push(team.sequence[team.sequence.length - 1] ?? config.pieces[0].id);
      renderTeams();
      queueFinalRender();
    });
    sequence.append(add);
    card.append(sequence);
    list.append(card);
  });
}

function duplicateTeam(index) {
  if (config.teams.length >= 16) return notify('The app supports up to 16 teams in one configuration.');
  const source = config.teams[index];
  const duplicate = structuredClone(source);
  duplicate.id = uniqueId('team');
  duplicate.name = `${source.name} copy`;
  duplicate.color = palette[config.teams.length % palette.length];
  config.teams.splice(index + 1, 0, duplicate);
  renderTeams();
  queueFinalRender();
}

function removeTeam(index) {
  if (config.teams.length <= 1) return notify('A configuration needs at least one team.');
  const removedId = config.teams[index].id;
  config.teams.splice(index, 1);
  config.teams.forEach(team => { team.attacks = team.attacks.filter(id => id !== removedId); });
  renderTeams();
  queueFinalRender();
}

function addTeam() {
  if (config.teams.length >= 16) return notify('The app supports up to 16 teams in one configuration.');
  const id = uniqueId('team');
  config.teams.push({
    id,
    name: `Team ${config.teams.length + 1}`,
    color: palette[config.teams.length % palette.length],
    sequence: [config.pieces[0].id],
    attacks: []
  });
  renderTeams();
  queueFinalRender();
}

const pieceEditor = new PieceEditor({
  dialog: $('piece-dialog'),
  form: $('piece-form'),
  title: $('piece-dialog-title'),
  nameInput: $('piece-name'),
  sizeSelect: $('piece-grid-size'),
  grid: $('piece-editor-grid'),
  summary: $('offset-summary'),
  closeButton: $('close-piece-dialog'),
  cancelButton: $('cancel-piece'),
  duplicateButton: $('duplicate-piece'),
  deleteButton: $('delete-piece')
}, {
  save(piece) {
    const index = config.pieces.findIndex(item => item.id === piece.id);
    if (index !== -1) config.pieces[index] = piece;
    else config.pieces.push(piece);
    renderPieces();
    renderTeams();
    queueFinalRender();
  },
  duplicate(piece) {
    const duplicate = structuredClone(piece);
    duplicate.id = uniqueId('piece');
    duplicate.name = `${piece.name} copy`;
    config.pieces.push(duplicate);
    renderPieces();
    renderTeams();
    queueFinalRender();
    return duplicate;
  },
  delete(pieceId) {
    if (config.pieces.length <= 1) {
      notify('A configuration needs at least one piece.');
      return false;
    }
    config.pieces = config.pieces.filter(piece => piece.id !== pieceId);
    const fallback = config.pieces[0].id;
    config.teams.forEach(team => {
      team.sequence = team.sequence.filter(id => id !== pieceId);
      if (!team.sequence.length) team.sequence = [fallback];
    });
    renderPieces();
    renderTeams();
    queueFinalRender();
    return true;
  },
  notify
});

function addPiece() {
  const piece = { id: uniqueId('piece'), name: `Piece ${config.pieces.length + 1}`, offsets: [] };
  pieceEditor.open(piece, false);
}

function inspectPointer(event) {
  if (!simulation) return;
  const cell = renderer.cellFromPointer(event);
  const info = simulation.inspect(cell);
  if (!info) return;
  let message = `Cell (${info.x}, ${info.y}) · spiral position ${info.spiralIndex.toLocaleString()}`;
  if (info.owner) message += ` · ${info.owner.name} ${info.piece.name}, placement ${info.placementNumber.toLocaleString()}`;
  else message += ' · unoccupied';
  if (info.blockers.length) {
    const blocks = info.blockers.map(item => `${item.target.name} blocked by ${item.attackers.map(team => team.name).join(', ')}`).join('; ');
    message += ` · ${blocks}`;
  }
  $('inspect').textContent = message;
}

function wireControls() {
  const presetSelect = $('preset-select');
  presets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    presetSelect.append(option);
  });
  presetSelect.value = activePreset;
  $('load-preset').addEventListener('click', () => {
    activePreset = presetSelect.value;
    setConfig(getPreset(activePreset), 'Preset loaded.');
  });
  $('new-config').addEventListener('click', () => setConfig(getPreset(activePreset), 'Preset restored.'));
  $('board-size').addEventListener('change', changeBoard);
  $('background-color').addEventListener('input', changeBoard);
  $('render-final').addEventListener('click', renderFinal);
  $('reset-sim').addEventListener('click', resetSimulation);
  $('play-pause').addEventListener('click', () => playing ? pause() : play());
  $('step-placement').addEventListener('click', () => {
    pause();
    const placement = simulation.stepPlacement();
    if (placement) renderer.paintMany([placement]);
    updateReadout(simulation.finished ? 'Finished.' : 'Stepped.');
  });
  $('step-round').addEventListener('click', () => {
    pause();
    renderer.paintMany(simulation.stepRound());
    updateReadout(simulation.finished ? 'Finished.' : 'Advanced one round.');
  });
  $('export-png').addEventListener('click', () => renderer.exportPng(Number($('export-scale').value)));
  $('save-json').addEventListener('click', () => downloadConfig(config));
  $('load-json').addEventListener('click', () => $('json-file').click());
  $('json-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setConfig(JSON.parse(await file.text()), 'Configuration loaded.');
    } catch {
      notify('That file is not valid Spiral Leapers JSON.');
    }
    event.target.value = '';
  });
  $('share-link').addEventListener('click', async () => {
    const hash = await configToHash(config);
    const url = new URL(location.href);
    url.hash = `s=${hash}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      notify('Share link copied.');
    } catch {
      location.hash = `s=${hash}`;
      notify('Share state added to the address bar.');
    }
  });
  $('add-piece').addEventListener('click', addPiece);
  $('add-team').addEventListener('click', addTeam);
  $('pattern-canvas').addEventListener('mousemove', inspectPointer);
  $('pattern-canvas').addEventListener('mouseleave', () => { $('inspect').textContent = 'Hover over the image to inspect a cell.'; });
}

async function initialize() {
  wireControls();
  const shared = await configFromHash(location.hash);
  if (shared) {
    config = shared;
    notify('Shared configuration loaded.');
  }
  bindBoardFields();
  renderPieces();
  renderTeams();
  renderFinal();
}

initialize();
