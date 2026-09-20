import { events } from './events.js';

export const LEVELS = ['Junior Associate', 'Senior Associate', 'Team Lead', 'Director', 'VP', 'CEO'];
export const STAT_NAMES = { performance: 'Performance', trust: 'Trust', exposure: 'Exposure', energy: 'Energy' };
export const SAVE_KEY = 'human-inc-save-v1';
export const employeeIdFor = state => state?.employeeId || 'YOU-042';
const clamp = value => Math.max(0, Math.min(100, value));

export function newGame(seed = Date.now(), previousEmployeeId = null) {
  let number = (seed >>> 0) % 999 + 1;
  const formatId = value => `YOU-${String(value).padStart(3, '0')}`;
  if (formatId(number) === previousEmployeeId) number = number % 999 + 1;
  return { version: 1, employeeId: formatId(number), seed: seed >>> 0, phase: 'playing', level: 0, quarter: 1, month: 1, tenure: 0, stats: { performance: 45, trust: 55, exposure: 12, energy: 78 }, queue: [], eventId: null, history: [], lastResult: null, assessment: null, reason: null };
}

function random(state) {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function nextEvent(state) {
  if (state.phase !== 'playing' || state.eventId) return state;
  const next = structuredClone(state);
  // Older saves stored only subjects; retain their event history as well.
  const seen = new Set(next.history.map(entry => entry.eventId || events.find(event => event.subject === entry.subject || event.legacySubject === entry.subject)?.id));
  const eligible = events.filter(event => (event.minLevel || 0) <= next.level);
  const unseen = eligible.filter(event => !seen.has(event.id));
  const pool = unseen.length ? unseen : eligible;
  next.queue = [...new Set(next.queue)].filter(id => pool.some(event => event.id === id));
  const added = pool.filter(event => !next.queue.includes(event.id)).map(event => event.id);
  if (added.length) {
    for (let i = added.length - 1; i > 0; i--) {
      const j = Math.floor(random(next) * (i + 1));
      [added[i], added[j]] = [added[j], added[i]];
    }
    next.queue.push(...added);
  }
  let index = 0;
  if (next.quarter === 1 && next.month === 1) {
    index = next.queue.indexOf('standup');
  } else if (next.level > 0 && (next.tenure * 3 + next.month - 1) % 2 === 0) {
    // Three of each rank's six turns prioritize its newly unlocked duties.
    index = next.queue.findIndex(id => events.find(event => event.id === id).minLevel === next.level);
  }
  [next.eventId] = next.queue.splice(Math.max(0, index), 1);
  return next;
}

export const currentEvent = state => events.find(event => event.id === state.eventId);
export const targetFor = state => 60 + state.level * 5;

export function choose(state, index) {
  if (state.phase !== 'playing' || !Number.isInteger(index)) return state;
  const event = currentEvent(state);
  const choice = event?.options[index];
  if (!choice) return state;
  const next = structuredClone(state);
  for (const [stat, delta] of Object.entries(choice.effects)) next.stats[stat] = clamp(next.stats[stat] + delta);
  const exhausted = next.stats.energy === 0;
  if (exhausted) {
    next.stats.exposure = clamp(next.stats.exposure + 18);
    next.stats.performance = clamp(next.stats.performance - 10);
  }
  next.lastResult = { title: choice.title, text: choice.result, effects: choice.effects, exhausted };
  next.history.unshift({ eventId: event.id, choiceIndex: index, quarter: state.quarter, month: state.month, subject: event.subject, choice: choice.title, result: choice.result });
  next.eventId = null;
  next.phase = 'result';
  if (next.stats.exposure >= 100) {
    next.phase = 'fired';
    next.reason = 'human';
  }
  return next;
}

export function advance(state) {
  if (state.phase !== 'result') return state;
  const next = structuredClone(state);
  if (next.month < 3) {
    next.month++;
    next.phase = 'playing';
    return nextEvent(next);
  }
  return assess(next);
}

export function assess(state) {
  const next = structuredClone(state);
  const target = targetFor(next);
  next.assessment = { quarter: next.quarter, target, performance: next.stats.performance, trust: next.stats.trust, promoted: false, fromLevel: next.level };
  if (next.stats.exposure >= 100 || next.stats.performance < target || next.stats.trust < 25) {
    next.phase = 'fired';
    next.reason = next.stats.exposure >= 100 ? 'human' : next.stats.performance < target ? 'performance' : 'trust';
    return next;
  }
  next.tenure++;
  if (next.tenure === 2) {
    next.level++;
    next.tenure = 0;
    next.assessment.promoted = true;
  }
  next.phase = next.level === LEVELS.length - 1 ? 'won' : 'assessment';
  return next;
}

export function continueQuarter(state) {
  if (state.phase !== 'assessment') return state;
  const next = structuredClone(state);
  next.quarter++;
  next.month = 1;
  next.stats.performance = 45;
  next.stats.energy = clamp(next.stats.energy + 24);
  next.stats.exposure = clamp(next.stats.exposure - 8);
  next.phase = 'playing';
  next.lastResult = null;
  next.eventId = null;
  // Management duties become available immediately after a promotion.
  if (next.assessment.promoted) next.queue = [];
  return nextEvent(next);
}

export function validSave(value) {
  if (!value || value.version !== 1 || !['playing', 'result', 'assessment', 'won', 'fired'].includes(value.phase)) return false;
  if (value.employeeId !== undefined && (typeof value.employeeId !== 'string' || !/^YOU-\d{3}$/.test(value.employeeId))) return false;
  if (!Number.isInteger(value.level) || value.level < 0 || value.level >= LEVELS.length) return false;
  if (!Number.isInteger(value.quarter) || value.quarter < 1 || value.quarter > 10 || ![1, 2, 3].includes(value.month) || ![0, 1].includes(value.tenure)) return false;
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff) return false;
  if (!value.stats || !Object.keys(STAT_NAMES).every(key => Number.isFinite(value.stats[key]) && value.stats[key] >= 0 && value.stats[key] <= 100)) return false;
  if (!Array.isArray(value.history) || value.history.length > 30 || !value.history.every(entry => entry && Number.isInteger(entry.quarter) && Number.isInteger(entry.month) && ['subject', 'choice', 'result'].every(key => typeof entry[key] === 'string'))) return false;
  if (!Array.isArray(value.queue) || !value.queue.every(id => events.some(event => event.id === id))) return false;
  if (value.phase === 'playing' && !currentEvent(value)) return false;
  if (value.phase === 'result' && (!value.lastResult || typeof value.lastResult.text !== 'string' || typeof value.lastResult.title !== 'string' || !value.lastResult.effects || !Object.keys(STAT_NAMES).every(key => Number.isFinite(value.lastResult.effects[key])))) return false;
  if (['assessment', 'won'].includes(value.phase) && (!value.assessment || !Number.isInteger(value.assessment.quarter) || !Number.isFinite(value.assessment.target) || !Number.isFinite(value.assessment.performance) || !Number.isFinite(value.assessment.trust) || typeof value.assessment.promoted !== 'boolean')) return false;
  if (value.phase === 'fired' && !['human', 'performance', 'trust'].includes(value.reason)) return false;
  return true;
}

// Saved display text may come from the original Chinese edition. Resolve it
// through stable event IDs (or legacy text keys) without changing game progress.
export function restoreSave(value) {
  if (!validSave(value)) return null;
  const state = structuredClone(value);
  const resolveEntry = entry => {
    const event = events.find(event => event.id === entry?.eventId || event.subject === entry?.subject || event.legacySubject === entry?.subject);
    if (!event) return {};
    const choiceIndex = Number.isInteger(entry.choiceIndex) && entry.choiceIndex >= 0 && entry.choiceIndex < event.options.length
      ? entry.choiceIndex
      : event.options.findIndex(option => option.title === entry.choice || option.legacyTitle === entry.choice);
    return { event, choiceIndex, option: event.options[choiceIndex] };
  };
  const latest = resolveEntry(state.history[0]);
  state.history = state.history.map(entry => {
    const { event, choiceIndex, option } = resolveEntry(entry);
    return event && option ? { ...entry, eventId: event.id, choiceIndex, subject: event.subject, choice: option.title, result: option.result } : entry;
  });
  if (state.lastResult && latest.option) {
    state.lastResult.title = latest.option.title;
    state.lastResult.text = latest.option.result;
  }
  return state;
}
