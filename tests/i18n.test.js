import test from 'node:test';
import assert from 'node:assert/strict';
import { events } from '../src/events.js';
import { newGame, nextEvent, choose, restoreSave } from '../src/game.js';
import { messages } from '../src/locales/zh-ui.js';
import { eventCopy } from '../src/locales/zh-events.js';
import { preferredLanguage, setLanguage, getLanguage, t, localizedEvent, localizedHistoryEntry, localizedResult } from '../src/i18n.js';

test('language preference overrides browser language and invalid preferences fall back safely', () => {
  assert.equal(preferredLanguage('en', 'zh-CN'), 'en');
  assert.equal(preferredLanguage('zh', 'en-US'), 'zh');
  for (const browser of ['zh', 'zh-CN', 'zh-Hant-TW']) assert.equal(preferredLanguage(null, browser), 'zh');
  assert.equal(preferredLanguage('invalid', 'en-GB'), 'en');
  assert.equal(preferredLanguage(null, 'fr-FR'), 'en');
  setLanguage('zh');
  setLanguage('invalid');
  assert.equal(getLanguage(), 'zh');
  setLanguage('en');
});

test('UI translations interpolate values and keep all placeholders intact', () => {
  const placeholders = text => [...text.matchAll(/\{(\d+)\}/g)].map(match => match[1]).sort();
  for (const [key, value] of Object.entries(messages)) {
    assert.deepEqual(placeholders(value), placeholders(key), key);
    assert.ok(!value.includes('${'), key);
  }
  setLanguage('zh');
  assert.equal(t('Quarter {0}', 5), '第 5 季度');
  assert.equal(t('Junior Associate'), '初级职员');
  assert.equal(t('To {0}', 'YOU-123'), '发给 YOU-123');
  setLanguage('en');
  assert.equal(t('Quarter {0}', 5), 'Quarter 5');
  assert.equal(t('Unknown message'), 'Unknown message');
});

test('every event has Chinese copy without duplicating or changing mechanics', () => {
  assert.deepEqual(Object.keys(eventCopy).sort(), events.map(event => event.id).sort());
  const original = structuredClone(events);
  setLanguage('zh');
  for (const event of events) {
    const translated = localizedEvent(event);
    assert.equal(translated.id, event.id);
    assert.equal(translated.minLevel, event.minLevel);
    assert.equal(translated.subject, event.legacySubject);
    for (const field of ['category', 'role', 'subject', 'text', 'quote']) assert.ok(translated[field]);
    assert.equal(translated.options.length, 3);
    for (let index = 0; index < 3; index++) {
      assert.equal(translated.options[index].title, event.options[index].legacyTitle);
      assert.deepEqual(translated.options[index].effects, event.options[index].effects);
      assert.ok(translated.options[index].detail && translated.options[index].result);
    }
  }
  assert.deepEqual(events, original);
  setLanguage('en');
  for (const event of events) assert.equal(localizedEvent(event), event);
});

test('switching display language leaves saved choices, RNG, stats and identity unchanged', () => {
  const state = choose(nextEvent(newGame(42)), 1);
  const original = structuredClone(state);
  const event = events.find(event => event.id === 'standup');
  for (const language of ['zh', 'en', 'zh', 'en']) {
    setLanguage(language);
    const history = localizedHistoryEntry(state.history[0]);
    const result = localizedResult(state);
    const expected = language === 'zh' ? eventCopy.standup : event;
    assert.equal(history.subject, expected.subject);
    assert.equal(history.choice, expected.options[1].title);
    assert.equal(result.title, expected.options[1].title);
    assert.equal(result.text, expected.options[1].result);
    assert.deepEqual(result.effects, state.lastResult.effects);
    assert.deepEqual(state, original);
  }
});

test('old Chinese histories can display either language after restoration', () => {
  const state = choose(nextEvent(newGame(42)), 0);
  const event = events[0];
  delete state.history[0].eventId;
  delete state.history[0].choiceIndex;
  state.history[0].subject = event.legacySubject;
  state.history[0].choice = event.options[0].legacyTitle;
  state.history[0].result = eventCopy.standup.options[0].result;
  const restored = restoreSave(state);
  setLanguage('zh');
  assert.equal(localizedHistoryEntry(restored.history[0]).choice, event.options[0].legacyTitle);
  setLanguage('en');
  assert.equal(localizedHistoryEntry(restored.history[0]).choice, event.options[0].title);
  assert.deepEqual(restored.stats, state.stats);
  assert.equal(restored.employeeId, state.employeeId);
});
