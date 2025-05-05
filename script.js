if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/vexScoreCalc/serviceWorker.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Registration failed:', err));
  });
}

let scores = { red: 0, blue: 0 };
let autonomousBonus = { red: false, blue: false };
let highStakeState = 'transparent';
let ringCounts = { red: 0, blue: 0 };
const RING_LIMIT = 24;
const stakes = {};
const stakeIds = ['wall1', 'alliance1', 'alliance2', 'wall2', 'mogo1', 'mogo2', 'mogo3', 'mogo4', 'mogo5'];
const cornerStates = { positive: new Set(), negative: new Set() };
let gridLevels = { red1: 0, red2: 0, blue1: 0, blue2: 0 };

function cycleHighStakeRing() {
  const ring = document.getElementById('highStakeRing');
  if (highStakeState === 'transparent') {
    highStakeState = 'red';
    ring.classList.add('red');
    ring.classList.remove('blue');
    ringCounts['red']++;
  } else if (highStakeState === 'red') {
    highStakeState = 'blue';
    ring.classList.add('blue');
    ring.classList.remove('red');
    ringCounts['red']--;
    ringCounts['blue']++;
  } else {
    highStakeState = 'transparent';
    ring.classList.remove('red', 'blue');
    ringCounts['blue']--;
  }
  updateAddRingButtons();
  calculateScore();
}

function calculateScore() {
  scores = { red: 0, blue: 0 };

  Object.entries(stakes).forEach(([stakeId, rings]) => {
    const isPositive = cornerStates.positive.has(stakeId);
    const isNegative = cornerStates.negative.has(stakeId);
    let redRings = rings.filter(ring => ring === 'red').length;
    const blueRings = rings.length - redRings;
    const topRing = rings[rings.length - 1];
    let redPoints = redRings + (topRing === 'red' ? 2 : 0);
    let bluePoints = blueRings + (topRing === 'blue' ? 2 : 0);

    if (isPositive) { redPoints *= 2; bluePoints *= 2; }
    if (isNegative) { redPoints *= -1; bluePoints *= -1; }

    scores.red += redPoints;
    scores.blue += bluePoints;
  });

  if (highStakeState === 'red') scores.red += 6;
  else if (highStakeState === 'blue') scores.blue += 6;

  scores.red = Math.max(scores.red, 0);
  scores.blue = Math.max(scores.blue, 0);

  if (autonomousBonus.red && autonomousBonus.blue) {
    scores.red += 3;
    scores.blue += 3;
  } else if (autonomousBonus.red) {
    scores.red += 6;
  } else if (autonomousBonus.blue) {
    scores.blue += 6;
  }

  if (highStakeState === 'red') {
    if (gridLevels.red1 > 0) scores.red += 2;
    if (gridLevels.red2 > 0) scores.red += 2;
  } else if (highStakeState === 'blue') {
    if (gridLevels.blue1 > 0) scores.blue += 2;
    if (gridLevels.blue2 > 0) scores.blue += 2;
  }

  scores.red += (gridLevels.red1 + gridLevels.red2) * 3;
  if (gridLevels.red1 === 3) scores.red += 3;
  if (gridLevels.red2 === 3) scores.red += 3;
  scores.blue += (gridLevels.blue1 + gridLevels.blue2) * 3;
  if (gridLevels.blue1 === 3) scores.blue += 3;
  if (gridLevels.blue2 === 3) scores.blue += 3;

  document.getElementById('redPoints').textContent = scores.red;
  document.getElementById('bluePoints').textContent = scores.blue;
  document.getElementById('deltaScore').textContent = Math.abs(scores.red - scores.blue);
  if (scores.red > scores.blue) {
    document.getElementById('deltaScore').className = 'score red-score';
  } else if (scores.red < scores.blue) {
    document.getElementById('deltaScore').className = 'score blue-score';
  } else {
    document.getElementById('deltaScore').className = 'score gray-score';
  }
}

function toggleAutonomousBonus(color) {
  const button = document.getElementById(`auton-${color}`);
  button.classList.toggle('selected');
  autonomousBonus[color] = button.classList.contains('selected');
  calculateScore();
}

function updateAutonomousButtons() {
  ['red', 'blue'].forEach(color => {
    const button = document.getElementById(`auton-${color}`);
    if (autonomousBonus[color]) button.classList.add('selected');
    else button.classList.remove('selected');
  });
}

function createStakeColumn(id) {
  const column = document.createElement('div');
  column.className = `stake-column ${id.startsWith('alliance') ? 'alliance-column' : ''}`;

  let cornerControls = id.startsWith('mogo') ? `
    <div class="corner-controls">
      <button class="corner-btn positive" data-corner="positive" data-mogo="${id}">+</button>
      <button class="corner-btn negative" data-corner="negative" data-mogo="${id}">-</button>
    </div>` : '';

  let colorButtons = id.startsWith('alliance') ? `
    ${id === 'alliance1' ? '<button class="button alliance-button red" data-action="add" data-color="red">+</button>' : ''}
    ${id === 'alliance2' ? '<button class="button alliance-button blue" data-action="add" data-color="blue">+</button>' : ''}
    <button class="button alliance-button reset" data-action="reset">🗑️</button>
  ` : `
    <button class="button red" data-action="add" data-color="red">+</button>
    <button class="button blue" data-action="add" data-color="blue">+</button>
    <button class="button gray" data-action="remove">-</button>
    <button class="button reset" data-action="reset">🗑️</button>
  `;

  const buttonsHTML = `
    <div class="${id.startsWith('alliance') ? 'alliance-button-container' : id.startsWith('wall') ? 'wall-button-container' : 'button-container'}">
      ${colorButtons}
    </div>
  `;

  column.innerHTML = `
    <div class="stake-container">
      <div class="stake-box-column">
        <div class="stake" id="${id}">
          <div class="stake-cap"></div>
          <div class="stake-pole"></div>
          <div class="ring-container" id="${id}-rings"></div>
          ${id.startsWith('mogo') ? '<div class="stake-base"></div>' : ''}
        </div>
        ${cornerControls}
        ${id.startsWith('alliance') ? buttonsHTML : ''}
      </div>
      ${!id.startsWith('alliance') ? `<div class="control-column">${buttonsHTML}</div>` : ''}
    </div>
  `;

  column.querySelectorAll('button').forEach(button => {
    if (button.classList.contains('corner-btn')) {
      button.addEventListener('click', handleCornerSelection);
    } else {
      button.addEventListener('click', () => handleButtonClick(id, button.dataset));
    }
  });

  stakes[id] = [];
  return column;
}

function handleCornerSelection(event) {
  const button = event.target;
  const mogoId = button.dataset.mogo;
  const cornerType = button.dataset.corner;
  const oppositeType = cornerType === 'positive' ? 'negative' : 'positive';

  if (button.classList.toggle('selected')) {
    const oppositeBtn = button.parentElement.querySelector(`.corner-btn.${oppositeType}`);
    if (oppositeBtn.classList.contains('selected')) {
      oppositeBtn.classList.remove('selected');
      cornerStates[oppositeType].delete(mogoId);
    }
    cornerStates[cornerType].add(mogoId);
  } else {
    cornerStates[cornerType].delete(mogoId);
  }
  updateCornerButtons();
  calculateScore();
}

function updateCornerButtons() {
  document.querySelectorAll('.corner-btn').forEach(button => {
    const cornerType = button.dataset.corner;
    const isSelected = cornerStates[cornerType].size >= 2;
    button.disabled = !button.classList.contains('selected') && isSelected && !cornerStates[cornerType].has(button.dataset.mogo);
  });
}

function addRing(stakeId, color) {
  const ringsContainer = document.getElementById(`${stakeId}-rings`);
  const maxRings = stakeId.startsWith('alliance') ? 2 : 6;

  if ((stakeId === 'alliance1' && color !== 'red') || (stakeId === 'alliance2' && color !== 'blue') || stakes[stakeId].length >= maxRings || ringCounts[color] >= RING_LIMIT) return;

  const ring = document.createElement('div');
  ring.className = `ring ${color}-ring`;
  ringsContainer.appendChild(ring);
  stakes[stakeId].push(color);
  ringCounts[color]++;
  updateAddRingButtons();
  calculateScore();
}

function handleButtonClick(stakeId, { action, color }) {
  switch (action) {
    case 'add': addRing(stakeId, color); break;
    case 'remove': removeTopmostRing(stakeId); break;
    case 'reset': resetStake(stakeId); break;
  }
}

function removeTopmostRing(stakeId) {
  const rings = document.getElementById(`${stakeId}-rings`);
  if (rings.children.length > 0) {
    const removedRing = stakes[stakeId].pop();
    rings.lastChild.remove();
    ringCounts[removedRing]--;
    updateAddRingButtons();
    calculateScore();
  }
}

function resetStake(stakeId) {
  const rings = document.getElementById(`${stakeId}-rings`);
  const removedRings = stakes[stakeId];
  rings.innerHTML = '';
  stakes[stakeId] = [];
  removedRings.forEach(ring => ringCounts[ring]--);

  if (stakeId.startsWith('mogo')) {
    cornerStates.positive.delete(stakeId);
    cornerStates.negative.delete(stakeId);
    const cornerButtons = document.querySelectorAll(`.corner-btn[data-mogo="${stakeId}"]`);
    cornerButtons.forEach(button => button.classList.remove('selected'));
    updateCornerButtons();
  }
  updateAddRingButtons();
  calculateScore();
}

function updateAddRingButtons() {
  document.querySelectorAll('.button.red[data-action="add"]').forEach(button => {
    button.disabled = ringCounts.red >= RING_LIMIT;
  });
  document.querySelectorAll('.button.blue[data-action="add"]').forEach(button => {
    button.disabled = ringCounts.blue >= RING_LIMIT;
  });
}

function updateGridBoxDisplay(gridBox, level) {
  const grids = gridBox.querySelectorAll('.grid');
  grids.forEach(grid => {
    const index = parseInt(grid.dataset.index);
    grid.classList.toggle('filled', index < level);
  });
}

function resetEverything() {
  scores = { red: 0, blue: 0 };
  autonomousBonus = { red: false, blue: false };
  highStakeState = 'transparent';
  ringCounts = { red: 0, blue: 0 };
  stakeIds.forEach(stakeId => resetStake(stakeId));
  cornerStates.positive.clear();
  cornerStates.negative.clear();
  gridLevels = { red1: 0, red2: 0, blue1: 0, blue2: 0 };

  const highStakeRing = document.getElementById('highStakeRing');
  highStakeRing.classList.remove('red', 'blue');
  updateAutonomousButtons();
  updateCornerButtons();
  updateAddRingButtons();
  document.querySelectorAll('.grid-box').forEach(gridBox => updateGridBoxDisplay(gridBox, 0));
  calculateScore();
}

document.addEventListener('DOMContentLoaded', () => {
  stakeIds.forEach(id => {
    const container = document.getElementById(`${id}-container`);
    if (container) container.appendChild(createStakeColumn(id));
  });

  document.getElementById('highStakeRing').addEventListener('click', cycleHighStakeRing);
  document.getElementById('auton-red').addEventListener('click', () => toggleAutonomousBonus('red'));
  document.getElementById('auton-blue').addEventListener('click', () => toggleAutonomousBonus('blue'));
  document.getElementById('globalReset').addEventListener('click', () => {
    console.log('Global Reset clicked');
    resetEverything();
  });

  document.querySelectorAll('.grid-box').forEach(gridBox => {
    const key = gridBox.id.replace('Grid', '');
    gridBox.addEventListener('click', () => {
      gridLevels[key] = (gridLevels[key] + 1) % 4;
      updateGridBoxDisplay(gridBox, gridLevels[key]);
      calculateScore();
    });
  });

  updateAutonomousButtons();
  updateCornerButtons();
  updateAddRingButtons();
  document.querySelectorAll('.grid-box').forEach(gridBox => updateGridBoxDisplay(gridBox, gridLevels[gridBox.id.replace('Grid', '')]));
});