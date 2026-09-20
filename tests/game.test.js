import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, nextEvent, currentEvent, choose, advance, assess, continueQuarter, targetFor, validSave } from '../src/game.js';

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
