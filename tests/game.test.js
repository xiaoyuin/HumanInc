import test from 'node:test';
import assert from 'node:assert/strict';
import { events } from '../src/events.js';
import { newGame, nextEvent, currentEvent, choose, advance, assess, continueQuarter, targetFor, validSave, restoreSave } from '../src/game.js';

test('employee IDs change on restart even when the timestamp is identical', () => {
  const first = newGame(42);
  const restarted = newGame(42, first.employeeId);
  assert.match(first.employeeId, /^YOU-\d{3}$/);
  assert.match(restarted.employeeId, /^YOU-\d{3}$/);
  assert.notEqual(restarted.employeeId, first.employeeId);
  assert.equal(restarted.seed, first.seed);
  assert.notEqual(newGame(41, 'YOU-042').employeeId, 'YOU-042');
});

test('employee IDs persist across decisions, quarters and save restoration', () => {
  let state = nextEvent(newGame(42));
  const id = state.employeeId;
  assert.equal(typeof id, 'string');
  state = advance(choose(state, 0));
  assert.equal(state.employeeId, id);
  state.stats.performance = 100;
  state = continueQuarter(assess(state));
  assert.equal(state.employeeId, id);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(validSave(restored), true);
  assert.equal(restored.employeeId, id);
  delete restored.employeeId;
  assert.equal(validSave(restored), true, 'old saves remain compatible');
  assert.equal(validSave({ ...restored, employeeId: '<invalid>' }), false);
});

test('onboarding always starts with a playable standup', () => {
  const state = nextEvent(newGame(42));
  assert.equal(currentEvent(state).id, 'standup');
  assert.equal(currentEvent(state).options.length, 3);
  assert.equal(validSave(state), true);
});

test('decisions apply once and do not mutate their input', () => {
  const state = nextEvent(newGame(42));
  const original = structuredClone(state);
  const result = choose(state, 0);
  assert.deepEqual(state, original);
  assert.equal(result.stats.performance, 55);
  assert.equal(result.stats.exposure, 6);
  assert.equal(result.phase, 'result');
  assert.equal(choose(result, 0), result);
  assert.equal(choose(state, -1), state);
  assert.equal(choose(state, 0.5), state);
  assert.equal(advance(result).month, 2);
});

test('human discovery fires immediately before quarterly assessment', () => {
  const state = nextEvent(newGame(42));
  state.stats.exposure = 90;
  const result = choose(state, 2);
  assert.equal(result.stats.exposure, 100);
  assert.equal(result.phase, 'fired');
  assert.equal(result.reason, 'human');
  assert.equal(advance(result), result);
});

test('exhaustion damages performance and may reveal identity', () => {
  const state = nextEvent(newGame(42));
  state.stats.energy = 5;
  state.stats.exposure = 90;
  const result = choose(state, 1);
  assert.equal(result.stats.energy, 0);
  assert.equal(result.stats.performance, 58);
  assert.equal(result.lastResult.exhausted, true);
  assert.equal(result.phase, 'fired');
});

test('quarterly thresholds are inclusive and trust is independently required', () => {
  const state = newGame(42);
  state.stats.performance = 59;
  assert.equal(assess(state).reason, 'performance');
  state.stats.performance = 60;
  state.stats.trust = 24;
  assert.equal(assess(state).reason, 'trust');
  state.stats.trust = 25;
  assert.equal(assess(state).phase, 'assessment');
});

test('two retained quarters promote; recovery preserves trust and resets performance', () => {
  let state = newGame(42);
  state.stats = { performance: 90, energy: 90, exposure: 5, trust: 77 };
  state = assess(state);
  assert.equal(state.level, 0);
  assert.equal(state.tenure, 1);
  state = continueQuarter(state);
  assert.equal(state.stats.energy, 100);
  assert.equal(state.stats.exposure, 0);
  assert.equal(state.stats.performance, 45);
  assert.equal(state.stats.trust, 77);
  state.stats.performance = 90;
  state = assess(state);
  assert.equal(state.level, 1);
  assert.equal(state.tenure, 0);
  assert.equal(targetFor(state), 65);
});

test('a full ten-quarter career promotes to CEO', () => {
  let state = newGame(123);
  for (let quarter = 1; quarter <= 10; quarter++) {
    state.stats.performance = 100;
    state = assess(state);
    assert.equal(state.level, Math.floor(quarter / 2));
    if (quarter < 10) state = continueQuarter(state);
  }
  assert.equal(state.phase, 'won');
  assert.equal(state.level, 5);
  assert.equal(state.quarter, 10);
  assert.equal(continueQuarter(state), state);
});

test('save restores decision, result and quarterly assessment stages', () => {
  let state = nextEvent(newGame(42));
  for (let i = 0; i < 3; i++) {
    assert.equal(validSave(JSON.parse(JSON.stringify(state))), true);
    state = choose(state, 0);
    assert.equal(validSave(JSON.parse(JSON.stringify(state))), true);
    state = advance(state);
  }
  assert.equal(state.phase, 'assessment');
  assert.equal(validSave(JSON.parse(JSON.stringify(state))), true);
  assert.equal(validSave({ ...state, stats: { ...state.stats, energy: -1 } }), false);
  assert.equal(validSave({ ...state, assessment: null }), false);
  assert.equal(validSave({ ...state, quarter: 'oops' }), false);
  assert.equal(validSave({ ...state, history: [null] }), false);
  assert.equal(validSave(null), false);
});

test('event decks are deterministic and have no repeats before exhausted', () => {
  let state = nextEvent(newGame(42));
  assert.deepEqual(state, nextEvent(newGame(42)));
  const ids = [state.eventId, ...state.queue];
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => !['delegation', 'strategy'].includes(id)));
});

test('expanded event catalog is playable and has enough duties for each rank', () => {
  assert.equal(events.length, 40);
  assert.equal(new Set(events.map(event => event.id)).size, events.length);
  assert.equal(new Set(events.map(event => event.subject)).size, events.length);
  assert.deepEqual([0, 1, 2, 3, 4].map(level => events.filter(event => (event.minLevel || 0) === level).length), [16, 6, 6, 6, 6]);
  for (const event of events) {
    for (const key of ['id', 'subject', 'text', 'quote', 'category', 'sender', 'role', 'avatar']) assert.ok(event[key]?.trim(), `${event.id}: missing ${key}`);
    assert.equal(event.options.length, 3);
    for (const option of event.options) {
      assert.ok(option.title && option.detail && option.result);
      assert.deepEqual(Object.keys(option.effects).sort(), ['energy', 'exposure', 'performance', 'trust']);
      assert.ok(Object.values(option.effects).every(Number.isFinite));
    }
  }
});

test('full careers have no repeated events and at least three current-rank duties per promotion', () => {
  for (let seed = 1; seed <= 50; seed++) {
    let state = nextEvent(newGame(seed));
    const seen = new Set();
    const rankDuties = [0, 0, 0, 0, 0];
    for (let turn = 0; turn < 30; turn++) {
      const event = currentEvent(state);
      assert.ok(!seen.has(event.id), `${seed}: repeated ${event.id}`);
      seen.add(event.id);
      assert.ok((event.minLevel || 0) <= state.level, `Premature unlock: ${event.id}`);
      if (event.minLevel === state.level) rankDuties[state.level]++;
      // Isolate scheduling here; the separate real-choice test checks balance.
      state.stats = { performance: 100, trust: 100, energy: 100, exposure: 0 };
      state = advance(choose(state, 0));
      if (state.phase === 'assessment') state = continueQuarter(state);
    }
    assert.equal(state.phase, 'won');
    assert.ok(rankDuties.slice(1).every(count => count >= 3), `${seed}: ${rankDuties}`);
  }
});

test('older saves retain progress and exclude previously played subjects from future draws', () => {
  let state = choose(nextEvent(newGame(42)), 0);
  delete state.history[0].eventId;
  state.queue = ['standup', 'captcha'];
  state = JSON.parse(JSON.stringify(state));
  assert.equal(validSave(state), true);
  const next = advance(state);
  assert.equal(next.quarter, 1);
  assert.equal(next.month, 2);
  assert.equal(next.stats.performance, 55);
  assert.equal(next.eventId, 'captcha');
  assert.ok(!next.queue.includes('standup'));
  assert.ok(next.queue.includes('camera'));
  assert.ok(!next.queue.includes('ceo_shortlist'));
  assert.equal(validSave(next), true);
});

test('Chinese saves restore in English without losing identity, stats or decisions', () => {
  const event = events.find(event => event.id === 'standup');
  const chinese = choose(nextEvent(newGame(42)), 1);
  chinese.history[0].subject = event.legacySubject;
  chinese.history[0].choice = event.options[1].legacyTitle;
  chinese.history[0].result = '旧的中文回执';
  delete chinese.history[0].eventId;
  delete chinese.history[0].choiceIndex;
  chinese.lastResult.title = event.options[1].legacyTitle;
  chinese.lastResult.text = '旧的中文回执';
  const before = structuredClone(chinese);
  const restored = restoreSave(chinese);
  assert.deepEqual(chinese, before, 'migration does not mutate its input');
  for (const key of ['stats', 'seed', 'queue', 'employeeId', 'phase', 'quarter', 'month', 'level', 'tenure']) assert.deepEqual(restored[key], chinese[key]);
  assert.equal(restored.history.length, 1);
  assert.equal(restored.history[0].eventId, event.id);
  assert.equal(restored.history[0].choiceIndex, 1);
  assert.equal(restored.history[0].subject, event.subject);
  assert.equal(restored.history[0].choice, event.options[1].title);
  assert.equal(restored.lastResult.text, event.options[1].result);
  assert.deepEqual(restored.lastResult.effects, chinese.lastResult.effects);
  assert.deepEqual(restoreSave(restored), restored, 'migration is idempotent');
  const next = advance(restored);
  assert.notEqual(next.eventId, 'standup');
  assert.ok(!next.queue.includes('standup'));
  assert.equal(restoreSave(null), null);
});

test('all player-facing event copy is English and retains legacy save lookup keys', () => {
  for (const event of events) {
    for (const key of ['subject', 'text', 'quote', 'category', 'role']) assert.doesNotMatch(event[key], /\p{Script=Han}/u, `${event.id}.${key}`);
    assert.ok(event.legacySubject);
    for (const option of event.options) {
      for (const key of ['title', 'detail', 'result']) assert.doesNotMatch(option[key], /\p{Script=Han}/u, `${event.id}.${key}`);
      assert.ok(option.legacyTitle);
    }
  }
});

// Explore real decisions across each quarter to verify a viable route to CEO
// exists without changing stats, skipping events or bypassing IBU checks.
test('real choices can complete the game for multiple shuffled event sequences', () => {
  for (const seed of [1, 42, 2026, 98765, 999999]) {
    let candidates = [nextEvent(newGame(seed))];
    let winner = null;
    for (let turn = 0; turn < 30; turn++) {
      const next = [];
      for (const candidate of candidates) {
        for (let option = 0; option < 3; option++) {
          let state = choose(candidate, option);
          if (state.phase === 'fired') continue;
          state = advance(state);
          if (state.phase === 'fired') continue;
          if (state.phase === 'won') { winner = state; break; }
          if (state.phase === 'assessment') state = continueQuarter(state);
          next.push(state);
        }
        if (winner) break;
      }
      if (winner) break;
      const rank = state => state.stats.energy * 1.1 - state.stats.exposure * 1.5 + Math.min(state.stats.trust, 50) * .3 + Math.min(state.stats.performance, targetFor(state)) * .8;
      const unique = new Map(next.map(state => [JSON.stringify(state.stats), state]));
      candidates = [...unique.values()].sort((a, b) => rank(b) - rank(a)).slice(0, 250);
    }
    assert.ok(winner, `No playable winning route for seed ${seed}`);
    assert.equal(winner.history.length, 30);
  }
});
