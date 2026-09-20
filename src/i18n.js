import { messages } from './locales/zh-ui.js';
import { eventCopy } from './locales/zh-events.js';
import { events } from './events.js';

export const LANGUAGE_KEY = 'human-inc-language';
let language = 'en';

export function preferredLanguage(saved, browserLanguage = 'en') {
  if (saved === 'zh' || saved === 'en') return saved;
  return /^zh(?:-|$)/i.test(browserLanguage) ? 'zh' : 'en';
}

export const getLanguage = () => language;
export function setLanguage(value) {
  if (value === 'zh' || value === 'en') language = value;
}

export function t(key, ...values) {
  const message = language === 'zh' ? messages[key] ?? key : key;
  return message.replace(/\{(\d+)\}/g, (_, index) => String(values[index] ?? ''));
}

export function localizedEvent(event) {
  const copy = language === 'zh' && eventCopy[event?.id];
  if (!copy) return event;
  return { ...event, ...copy, options: event.options.map((option, index) => ({ ...option, ...copy.options[index] })) };
}

export function localizedHistoryEntry(entry) {
  const event = events.find(event => event.id === entry.eventId || event.subject === entry.subject || event.legacySubject === entry.subject);
  if (!event) return entry;
  const index = Number.isInteger(entry.choiceIndex) && entry.choiceIndex >= 0 && entry.choiceIndex < event.options.length
    ? entry.choiceIndex
    : event.options.findIndex(option => option.title === entry.choice || option.legacyTitle === entry.choice);
  if (index < 0) return entry;
  const copy = localizedEvent(event);
  return { ...entry, subject: copy.subject, choice: copy.options[index].title, result: copy.options[index].result };
}

export function localizedResult(state) {
  if (!state.history.length) return state.lastResult;
  const latest = localizedHistoryEntry(state.history[0]);
  return { ...state.lastResult, title: latest.choice, text: latest.result };
}
