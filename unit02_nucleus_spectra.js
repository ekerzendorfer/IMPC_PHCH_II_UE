'use strict';
/* UE02: client-side practice, not a graded test or secure access control. */
const UE02_UNIT = 'UE02';
const UE02_PROGRESS = 'PC2_UE02_PRACTICE_V1';
const UE02_RELEASE = 'PC2_UE02_RELEASE_V1';

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  function getSaved(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
  function normalCode(s) { return typeof s === 'string' ? s.trim().toUpperCase() : ''; }
  function showFeedback(form, kind, message) {
    const el = form.querySelector('.feedback');
    if (!el) return;
    el.dataset.kind = kind;
    el.textContent = message;
  }
  function parseNumber(s) {
    const text = String(s).trim().replaceAll('−', '-').replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return NaN;
    const n = Number(text);
    return Number.isFinite(n) ? n : NaN;
  }
  const groups = { inclass: 'In-class', homework: 'Optional' };
  const releaseState = getSaved(UE02_RELEASE);
  const released = { inclass: releaseState.inclass === true, homework: releaseState.homework === true };
  function syncSolutions() {
    for (const [group, title] of Object.entries(groups)) {
      $('status-' + group).textContent = title + ' solutions: ' + (released[group] ? 'unlocked' : 'locked');
      document.querySelectorAll('[data-release="' + group + '"]').forEach(el => { el.hidden = !released[group]; });
      document.querySelectorAll('[data-lock-note="' + group + '"]').forEach(el => { el.hidden = released[group]; });
    }
  }
  $('release-form').addEventListener('submit', event => {
    event.preventDefault();
    const status = $('release-status');
    const input = $('release-code');
    const candidate = normalCode(input.value);
    if (!candidate) {
      status.textContent = 'Enter the code announced by the lecturer.';
      return;
    }
    const configured = window.PC2_CODES && window.PC2_CODES[UE02_UNIT];
    const inclassCode = normalCode(configured && configured.inclass);
    const homeworkCode = normalCode(configured && configured.homework);
    if (!inclassCode || !homeworkCode || inclassCode === homeworkCode) {
      status.textContent = 'The solution codes are unavailable. Refresh the page or ask the lecturer.';
      return;
    }
    const group = candidate === inclassCode ? 'inclass' : (candidate === homeworkCode ? 'homework' : null);
    if (!group) {
      status.textContent = 'This code does not match UE02. Check the announced code.';
      return;
    }
    released[group] = true;
    save(UE02_RELEASE, released);
    syncSolutions();
    status.textContent = groups[group] + ' solutions unlocked. Open each one individually.';
    input.value = '';
  });

  const h = 6.62607015e-34, c = 299792458, elementaryCharge = 1.602176634e-19;
  const massDefect = (2.014101778 + 3.016049282) - (4.002603254 + 1.008664916);
  const QMeV = massDefect * 931.49410242;
  const csAge = 30.2 / Math.log(2) * Math.log(1 / 0.352);
  const hAlphaWavelength = (36 / (5 * 1.09678e7)) * 1e9;
  const answers = {
    c1a: { ids: ['c1a-A', 'c1a-Z'], targets: [222, 86], tolerance: 0 },
    c1b: { ids: ['c1b-A', 'c1b-Z'], targets: [234, 91], tolerance: 0 },
    r1a: { ids: ['r1a'], targets: [massDefect], tolerance: .01 },
    r1b: { ids: ['r1b'], targets: [QMeV], tolerance: .01 },
    r2a: { ids: ['r2a'], targets: [2.5], tolerance: .005 },
    r2b: { ids: ['r2b'], targets: [100 * Math.pow(0.5, 2.5)], tolerance: .01 },
    h1: { ids: ['h1'], targets: [csAge], tolerance: .01 },
    h2: { ids: ['h2'], targets: [hAlphaWavelength], tolerance: .01 }
  };
  const exerciseSteps = { r1: ['r1a','r1b'], r2: ['r2a','r2b'] };
  const stepToExercise = Object.fromEntries(Object.entries(exerciseSteps).flatMap(([exercise, ids]) => ids.map(id => [id, exercise])));
  const previous = getSaved(UE02_PROGRESS);
  const progress = Object.create(null);
  function grade(id, values) {
    const meta = answers[id];
    if (!meta || !Array.isArray(values) || values.length !== meta.targets.length) return 'format';
    const numbers = values.map(parseNumber);
    if (numbers.some(v => !Number.isFinite(v))) return 'format';
    const correct = numbers.every((num, i) => {
      const expected = meta.targets[i];
      if (meta.tolerance === 0) return num === expected && Number.isInteger(num);
      return Math.abs(num - expected) <= Math.abs(expected) * meta.tolerance;
    });
    return correct ? 'pass' : 'retry';
  }
  for (const ids of Object.values(exerciseSteps)) {
    // The persisted validity chain belongs to this exercise only.
    for (const id of ids) {
      const values = previous[id];
      if (grade(id, values) !== 'pass') break;
      progress[id] = values;
    }
  }
  function syncPractice() {
    for (const ids of Object.values(exerciseSteps)) {
      let open = true;
      for (const id of ids) {
        const form = $('step-' + id);
        const completed = progress[id];
        form.hidden = !open;
        answers[id].ids.forEach((key, i) => {
          const input = $('answer-' + key);
          input.readOnly = Boolean(completed);
          if (completed) input.value = completed[i];
        });
        const button = form.querySelector('button[type=submit]');
        if (button) button.disabled = Boolean(completed);
        if (completed) showFeedback(form, 'pass', 'Correct.');
        open = open && Boolean(completed);
      }
    }
  }
  document.querySelectorAll('form[data-number-step]').forEach(form => {
    form.querySelector('.feedback').tabIndex = -1;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const id = form.dataset.numberStep;
      const currentExercise = stepToExercise[id];
      if (form.hidden || (currentExercise && progress[id])) return;
      if (currentExercise) {
        const siblings = exerciseSteps[currentExercise];
        const idx = siblings.indexOf(id);
        if (idx > 0 && !progress[siblings[idx-1]]) return;
        $('practice-restart-status').textContent = '';
      }
      const values = answers[id].ids.map(key => $('answer-' + key).value.trim());
      const result = grade(id, values);
      if (result === 'format') {
        showFeedback(form, 'retry', 'Enter numbers without units, for example 5.41 or 2.5e-12 (2,5e-12 also works).');
      } else if (result === 'retry') {
        showFeedback(form, 'retry', 'Not correct yet. Recheck your calculation, units and significant figures.');
      } else if (currentExercise) {
        progress[id] = values;
        save(UE02_PROGRESS, progress);
        syncPractice();
        form.querySelector('.feedback').focus();
      } else {
        showFeedback(form, 'pass', id === 'c1a' || id === 'c1b' ?
          'A and Z are correct. Also write the daughter element symbol on paper.' :
          'Correct. Explain the result using the equation and your units.');
      }
    });
  });

  $('practice-reset').addEventListener('click', () => {
    for (const ids of Object.values(exerciseSteps)) {
      for (const id of ids) {
        delete progress[id];
        const form = $('step-' + id);
        form.reset();
        showFeedback(form, '', '');
      }
    }
    save(UE02_PROGRESS, progress);
    syncPractice();
    $('practice-restart').open = false;
    $('practice-restart-status').textContent = 'R1 and R2 reset. Start with R1(a) or R2(a).';
    $('answer-r1a').focus();
  });
  $('concept-quarks').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const n = $('quark-neutron').value, b = $('quark-change').value;
    if (!n || !b) return showFeedback(form, 'retry', 'Please make both selections.');
    const right = n === 'udd' && b === 'np';
    showFeedback(form, right ? 'pass' : 'retry', right ?
      'Both choices are correct. Explain the change in nuclear charge on paper.' :
      'At least one choice needs revision.');
  });
  syncSolutions();
  syncPractice();
  if (window.renderMathInElement) {
    window.renderMathInElement(document.body, {
      delimiters: [
        {left:'$$',right:'$$',display:true},
        {left:'\\(',right:'\\)',display:false},
        {left:'$',right:'$',display:false}
      ], throwOnError:false
    });
  }
});