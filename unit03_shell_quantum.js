'use strict';

const pc2Unit = 'UE03';
const releaseStorageKey = 'PC2_UE03_RELEASE_V2';
const progressStorageKey = 'PC2_UE03_PRACTICE_V2';
const byId = id => document.getElementById(id);
const practiceGroups = [['r1a', 'r1b', 'r1c'], ['r2a', 'r2b']];
const practiceOrder = practiceGroups.flat();
const numberChecks = {
  c1a: { fields: ['e11', 'e12', 'e21'], targets: [2, 5, 5], tolerance: 0 },
  r1a: { fields: ['homo', 'lumo'], targets: [11, 12], tolerance: 0 },
  r1b: { fields: ['gap'], targets: [1.60315e-19], tolerance: .015 },
  r1c: { fields: ['wavelength'], targets: [1239.06], tolerance: .015 },
  r2a: { fields: ['mosquito'], targets: [5.2728e-25], tolerance: .015 },
  r2b: { fields: ['proton'], targets: [1.05057e7], tolerance: .015 },
  h1: { fields: ['zero'], targets: [8.20041e-20], tolerance: .015 }
};
const cwAnswers = { light: 'W', hydrogen: 'C', uncertainty: 'W', voltage: 'W', box: 'C', pauli: 'C' };

function readState(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveState(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The worksheet still works if persistence is unavailable. */ }
}
function normaliseCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
const storedReleases = readState(releaseStorageKey, {}) || {};
const released = { inclass: storedReleases.inclass === true, homework: storedReleases.homework === true };
function updateReleases() {
  for (const [section, label] of Object.entries({ inclass: 'In-class', homework: 'Homework' })) {
    byId('status-' + section).textContent = label + ' solutions: ' + (released[section] ? 'unlocked' : 'locked');
    document.querySelectorAll('[data-release="' + section + '"]').forEach(solution => {
      solution.hidden = !released[section];
    });
    document.querySelectorAll('[data-lock-note="' + section + '"]').forEach(note => {
      note.hidden = released[section];
    });
  }
}
byId('release-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = byId('release-code');
  const code = normaliseCode(input.value);
  const status = byId('release-status');
  if (!code) {
    status.textContent = 'Enter the code announced by the lecturer.';
    return;
  }
  const config = window.PC2_CODES?.[pc2Unit];
  const sections = ['inclass', 'homework'];
  if (!config || sections.some(key => !normaliseCode(config[key])) ||
      normaliseCode(config.inclass) === normaliseCode(config.homework)) {
    status.textContent = 'The release codes could not be loaded. Refresh the worksheet and try again.';
    return;
  }
  const section = sections.find(key => normaliseCode(config[key]) === code);
  if (!section) {
    status.textContent = 'This code does not match Unit 03. Check the announcement and try again.';
    return;
  }
  released[section] = true;
  saveState(releaseStorageKey, released);
  updateReleases();
  status.textContent = (section === 'inclass' ? 'In-class' : 'Homework') +
    ' solutions unlocked. Open any solution individually.';
  input.value = '';
});

function parseNumber(input) {
  const text = String(input).trim().replaceAll('−', '-').replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return NaN;
  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}
function classify(id, raw) {
  const check = numberChecks[id];
  const values = raw.map(parseNumber);
  if (values.length !== check.targets.length || values.some(value => !Number.isFinite(value))) return 'format';
  return values.every((value, i) => Math.abs(value - check.targets[i]) <= Math.abs(check.targets[i]) * check.tolerance)
    ? 'pass' : 'retry';
}
function feedback(form, kind, message) {
  const output = form.querySelector('.feedback');
  output.dataset.kind = kind;
  output.textContent = message;
}
const progress = Object.create(null);
const storedProgress = readState(progressStorageKey, {}) || {};
for (const group of practiceGroups) {
  // Restore each exercise separately: unfinished R1 must not discard valid R2 progress.
  for (const id of group) {
    const values = storedProgress[id];
    if (!Array.isArray(values) || !values.every(value => typeof value === 'string') ||
        classify(id, values) !== 'pass') break;
    progress[id] = values;
  }
}
function updatePractice() {
  for (const group of practiceGroups) {
    let available = true;
    for (const id of group) {
      const form = byId('step-' + id);
      form.hidden = !available;
      const values = progress[id];
      numberChecks[id].fields.forEach((key, i) => {
        const input = byId('answer-' + key);
        input.readOnly = Boolean(values);
        if (values) input.value = values[i];
      });
      form.querySelector('.check').disabled = Boolean(values);
      if (values) feedback(form, 'pass', 'Correct.');
      available = available && Boolean(values);
    }
  }
  byId('r1-reflect').hidden = !progress.r1c;
  byId('practice-done').hidden = !progress.r2b;
}
const restartPractice = byId('practice-restart');
const restartStatus = byId('practice-restart-status');
restartPractice.hidden = false;
byId('practice-reset').addEventListener('click', () => {
  for (const id of practiceOrder) {
    delete progress[id];
    const form = byId('step-' + id);
    form.reset();
    feedback(form, '', '');
  }
  saveState(progressStorageKey, progress);
  restartPractice.open = false;
  updatePractice();
  restartStatus.textContent = 'R1/R2 restarted. Begin with R1(a) or R2(a).';
  byId('answer-homo').focus();
});
document.querySelectorAll('form[data-step]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const id = form.dataset.step;
    const index = practiceOrder.indexOf(id);
    const prerequisite = { r1b: 'r1a', r1c: 'r1b', r2b: 'r2a' }[id];
    if (form.hidden || (prerequisite && !progress[prerequisite]) || progress[id]) return;
    const values = numberChecks[id].fields.map(key => byId('answer-' + key).value.trim());
    const result = classify(id, values);
    if (index !== -1) restartStatus.textContent = '';
    if (result === 'format') {
      const message = numberChecks[id].tolerance === 0
        ? 'Enter a whole number in each field, for example 3.'
        : 'Enter a number without units. For scientific notation, use 2.5e-12 or 2,5e-12.';
      feedback(form, 'retry', message);
    } else if (result === 'retry') {
      feedback(form, 'retry', 'Not correct yet. Recheck this step and try again.');
    } else if (index !== -1) {
      progress[id] = values;
      saveState(progressStorageKey, progress);
      updatePractice();
      // Keep focus near the checked result. The next step is available in normal tab order.
      form.querySelector('.feedback').focus();
    } else {
      feedback(form, 'pass', 'Correct.');
    }
  });
  form.querySelector('.feedback').tabIndex = -1;
});
byId('concept-c1b').addEventListener('submit', event => {
  event.preventDefault();
  const reason = byId('c1-reason').value;
  const occupation = byId('c1-occupation').value;
  if (!reason || !occupation) return feedback(event.currentTarget, 'retry', 'Make both selections first.');
  const good = reason === 'square' && occupation === 'pair';
  feedback(event.currentTarget, good ? 'pass' : 'retry', good ? 'Both selections are correct.' : 'At least one selection needs revision.');
});
byId('concept-c2').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const radial = form.querySelector('[name=radial]:checked')?.value;
  const angular = form.querySelector('[name=angular]:checked')?.value;
  if (!radial || !angular) return feedback(form, 'retry', 'Select one row in each table first.');
  const good = radial === '21' && angular === '1m1';
  feedback(form, good ? 'pass' : 'retry', good ? 'Both rows are correct. Write their product on paper.' : 'At least one row needs revision.');
});
document.querySelectorAll('form[data-statement]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const selected = form.querySelector('select').value;
    if (!selected) return feedback(form, 'retry', 'Choose Correct or Wrong first.');
    const good = selected === cwAnswers[form.dataset.statement];
    feedback(form, good ? 'pass' : 'retry', good ? 'Your choice is correct.' : 'Reconsider this statement.');
  });
});
updateReleases();
updatePractice();
if (window.renderMathInElement) {
  window.renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\(', right: '\\)', display: false },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false
  });
}
