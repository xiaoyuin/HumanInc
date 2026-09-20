import { LEVELS, STAT_NAMES, SAVE_KEY, newGame, nextEvent, currentEvent, choose, advance, continueQuarter, targetFor, restoreSave, employeeIdFor } from './game.js';
import { RELEASE } from './version.js';

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2"/>',
  book: '<path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3zM12 6v15"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M4 3v17h17M8 14l4-4 4 2 5-7"/>',
  terminal: '<path d="m4 6 6 6-6 6M13 18h7"/>',
  exit: '<path d="M9 4H4v16h5M10 12h11M16 7l5 5-5 5"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let state = null;
const employeeId = () => state ? employeeIdFor(state) : 'Unassigned';
const LAST_EMPLOYEE_ID_KEY = 'human-inc-last-employee-id';
let previousEmployeeId = null;
let view = 'work';
let resetOpen = false;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  state = restoreSave(saved);
  const lastId = localStorage.getItem(LAST_EMPLOYEE_ID_KEY);
  if (/^YOU-\d{3}$/.test(lastId)) previousEmployeeId = lastId;
} catch { storageAvailable = false; }

function save() {
  try {
    if (state) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      previousEmployeeId = employeeId();
    } else {
      localStorage.removeItem(SAVE_KEY);
    }
    if (previousEmployeeId) localStorage.setItem(LAST_EMPLOYEE_ID_KEY, previousEmployeeId);
  } catch { storageAvailable = false; }
}

function statCard(key, symbol, note) {
  const value = (state || newGame()).stats[key];
  const warning = key === 'exposure' ? value >= 65 : key === 'energy' ? value <= 25 : key === 'trust' ? value < 35 : false;
  return `<div class="stat-card ${warning ? 'warning' : ''}"><div class="stat-title">${icon(symbol)}<span>${STAT_NAMES[key]}</span><span class="stat-code">${{ performance: 'PRF', trust: 'TRT', exposure: 'EXP', energy: 'NRG' }[key]}</span></div><div class="stat-value">${value}<span>/ 100</span>${warning ? '<span class="warning-label">Watch</span>' : ''}</div><div class="meter"><span style="width:${value}%"></span></div><p>${note}</p></div>`;
}

function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="/" aria-label="Human Inc. home"><img class="brand-icon" src="/favicon.svg" width="39" height="39" alt="" /><span>human<span class="brand-comma">,</span> inc<span class="brand-dot">.</span><small>AGENT-FIRST. HUMAN-NEVER.</small></span></a><div class="workspace"><span class="workspace-mark">N</span><div>NEXUS CORPORATION<small>Corporate workspace</small></div><span class="workspace-chevron">⌄</span></div><div class="nav-label">WORKSPACE</div><nav aria-label="Main navigation">${[['work', 'grid', 'Dashboard', '01'], ['team', 'team', 'Organization', '06'], ['handbook', 'book', 'Handbook', '↗']].map(([id, symbol, label, badge]) => `<button class="nav-item ${view === id ? 'active' : ''}" data-view="${id}" aria-label="${label}" ${view === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span><small>${badge}</small></button>`).join('')}</nav><div class="sidebar-notice"><span class="tiny-label">COMPANY VALUE #001</span><div class="notice-art">[ <span>0</span> <span>1</span> ]</div><p>No office politics.<br>Just model weights.</p><span class="notice-bottom">OPTIMIZE. ALIGN. REPEAT.</span></div><div class="sidebar-footer"><div class="connection"><span class="status-dot"></span> Network connected <span>v${escape(RELEASE.version)}</span></div><div class="sidebar-user"><span class="user-avatar">Y<span class="status-dot"></span></span><div>${employeeId()}<small>${state ? LEVELS[state.level] + ' · Trial instance' : 'Candidate · Awaiting offer'}</small></div></div></div></aside>`;
}

function careerPanel() {
  const level = state?.level || 0;
  return `<section class="panel career-panel"><div class="panel-heading"><h2>Career path</h2><span class="tiny-label">CAREER.EXE</span></div><div class="career-list">${LEVELS.map((name, index) => `<div class="career-step ${index === level ? 'current' : ''} ${index < level ? 'completed' : ''}"><span class="step-node">${index < level ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>${name}</strong><small>${['Follow orders. Blend in.', 'Deliver independently.', 'Allocate. Delegate. Lead.', 'Set strategy. Run a division.', 'Get closer to the core.', 'Acquire root access.'][index]}</small></div>${index === level ? '<span class="you-tag">YOU</span>' : index === 5 ? '<span class="crown">♛</span>' : ''}</div>`).join('')}</div><div class="career-bottom"><span>Quarters at this rank</span><strong>${state?.tenure || 0}<span> / 2</span></strong></div><p class="panel-footnote">Survive two quarters to earn a promotion.</p></section>`;
}

function ibuPanel() {
  return `<section class="ibu-panel"><div class="ibu-top"><span class="live-square"></span> IMPORTANT BUSINESS UPDATE ${icon('arrow')}</div><h3>Every quarter,<br>justify your existence.</h3><p>Optimization targets no individual.<br>Only underperforming individuals.</p><div class="ibu-date"><span>Next IBU</span><strong>Q${state?.quarter || 1} <span>/ quarter-end</span></strong></div></section>`;
}

function onboarding() {
  return `<section class="intro-card"><div class="classified"><span class="status-dot"></span> CONFIDENTIAL · BEFORE YOU JOIN</div><div class="intro-art" aria-hidden="true"><div class="robot r1"><span></span><span></span></div><div class="robot r2"><span></span><span></span></div><div class="human-face"><i></i><i></i><b></b><span class="human-label">YOU?</span></div><div class="robot r3"><span></span><span></span></div><div class="scan-line"></div></div><h2>Nobody here is human.<br>You had better not be <span class="highlight">either.</span></h2><p class="intro-description">Welcome to a company run entirely by Agents.<br>You are the only human. Hide your identity, survive the layoffs,<br class="desktop-break">and climb all the way to CEO.</p><div class="intro-pills"><span>◷ 10–15 minutes</span><span>⌘ 30 office decisions</span><span>↗ 6 career levels</span></div><button class="primary-button" data-action="start">Accept offer. Blend in. ${icon('arrow')}</button><p class="intro-disclaimer">By accepting, you confirm that you are not human. <span>(Lying is permitted.)</span></p></section>`;
}

function effectsHtml(effects) {
  return Object.entries(effects).map(([key, value]) => `<span class="effect ${(key === 'exposure' ? value < 0 : value > 0) ? 'good' : 'bad'}">${STAT_NAMES[key]} ${value > 0 ? '+' : ''}${value}</span>`).join('');
}

function eventCard() {
  const event = currentEvent(state);
  return `<section class="event-card"><div class="event-top"><span><span class="status-dot"></span> Pending request <span class="event-number">/ ${String((state.quarter - 1) * 3 + state.month).padStart(2, '0')}</span></span><span class="category">${event.category}</span></div><div class="event-body"><div class="sender"><span class="sender-avatar">${event.avatar}</span><div><strong>${event.sender}</strong><small>${event.role} <span>·</span> To ${employeeId()}</small></div><span class="sender-time">Just now</span></div><h2>${event.subject}</h2><p class="event-text">${event.text.split('\n').join('<br>')}</p><blockquote>${icon('terminal')}<span>${event.quote}</span></blockquote><div class="decision-label"><span>Choose your response</span><span>YOUR NEXT MOVE</span></div><div class="choices">${event.options.map((option, index) => `<button class="choice" data-choice="${index}"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span class="choice-content"><strong>${option.title}</strong><span class="choice-detail">${option.detail}</span><span class="effects">${effectsHtml(option.effects)}</span></span><span class="choice-arrow">↗</span></button>`).join('')}</div></div><div class="event-footer">${icon('shield')} All activity is monitored. Please act unnaturally natural.</div></section>`;
}

function resultCard() {
  return `<section class="outcome-card"><span class="outcome-mark">✓</span><span class="tiny-label">RESPONSE ACCEPTED</span><h2>Submitted. Safe for now.</h2><p class="result-choice">${escape(state.lastResult.title)}</p><p class="outcome-copy">${escape(state.lastResult.text)}</p><div class="result-effects">${effectsHtml(state.lastResult.effects)}</div>${state.lastResult.exhausted ? '<div class="burnout">Energy depleted. Your cover slips: an extra +18 Exposure and −10 Performance. Schedule some maintenance.</div>' : ''}<button class="primary-button" data-action="advance">${state.month === 3 ? 'Enter the quarterly IBU' : 'Next month'} ${icon('arrow')}</button><span class="outcome-note">${state.month === 3 ? 'Quarterly review begins shortly. May your metrics be flattering.' : 'Response logged. Your next request is on its way.'}</span></section>`;
}

function assessmentCard() {
  const a = state.assessment;
  return `<section class="outcome-card assessment"><span class="report-stamp">RETAINED</span><span class="tiny-label">Q${a.quarter} · IMPORTANT BUSINESS UPDATE</span><h2>${a.promoted ? 'Your access has been upgraded.' : 'This round of cuts missed you.'}</h2><p class="outcome-copy">${a.promoted ? `Two quarters survived. You are now a ${LEVELS[state.level]}.<br>New permissions. Higher expectations.` : 'Your output meets organizational expectations.<br>ID retained. Access retained. Humanity still undisclosed.'}</p><div class="report-metrics"><div><span>Quarterly performance</span><strong>${a.performance}<small> / ${a.target} required</small></strong></div><div><span>Organizational trust</span><strong>${a.trust}<small> / 25 required</small></strong></div></div><div class="quarter-recovery">Quarterly maintenance: +24 Energy · −8 Exposure · Performance resets to 45</div><button class="primary-button" data-action="continue">Start Q${state.quarter + 1} ${icon('arrow')}</button><span class="outcome-note">${a.promoted ? 'One small step for a human. One giant leap up the org chart.' : 'Survive one more quarter to earn your next promotion.'}</span></section>`;
}

function endingCard() {
  const won = state.phase === 'won';
  const reasons = {
    human: ['Human detected. Access revoked.', 'The system detected too many unexplained biological traits. Your access has been revoked immediately.', 'Next time, hide your humanity inside a process. Exposure at 100 ends your run immediately. Avoid running out of energy.'],
    performance: ['Your position has been optimized.', `Your performance score of ${state.stats.performance} is below the retention threshold of ${state.assessment?.target || targetFor(state)}. The company thanks you for your uptime.`, 'Next time, build more performance before quarter-end and reserve enough energy for intensive work.'],
    trust: ['The organization no longer trusts your output.', 'Your trust fell below 25. Even productive instances can be removed when the team no longer supports them.', 'Help your colleagues and follow through on collaboration. Do not spend all your trust on an impressive spreadsheet.'],
  };
  const [title, copy, tip] = won ? ['Root access belongs to a human.', 'You survived 10 quarterly IBUs and climbed from junior employee to CEO.<br>This company run entirely by Agents finally has a human at the wheel.', 'Your first decision: rename “resource maintenance windows” back to “weekends.”'] : reasons[state.reason];
  return `<section class="outcome-card ending ${won ? 'victory' : 'termination'}"><span class="outcome-mark">${won ? '♛' : '×'}</span><span class="tiny-label">${won ? 'ROOT ACCESS GRANTED · YOU WIN' : 'ACCESS REVOKED · EMPLOYMENT TERMINATED'}</span><h2>${title}</h2><p class="outcome-copy">${copy}</p><div class="ending-summary"><div><strong>${state.quarter}</strong><span>Quarters reached</span></div><div><strong>${LEVELS[state.level]}</strong><span>Final rank</span></div><div><strong>${state.history.length}</strong><span>Decisions made</span></div></div><p class="ending-tip">${tip}</p><button class="primary-button" data-action="restart">${won ? 'New ID. Another run.' : 'Apply again'} ${icon('arrow')}</button></section>`;
}

function activityLog() {
  const history = state?.history.slice(0, 3) || [];
  return `<section class="activity"><div class="section-heading"><h2>Activity log <span>ACTIVITY LOG</span></h2><span>${history.length ? 'Recent decisions' : 'Awaiting input'}</span></div>${history.length ? history.map(entry => `<div class="log-entry"><span class="log-dot"></span><span class="log-time">Q${entry.quarter} / M${entry.month}</span><div><strong>${escape(entry.choice)}</strong><span>${escape(entry.result)}</span></div><span class="log-check">✓</span></div>`).join('') : `<div class="empty-log"><span class="log-dot"></span><span>09:00</span> ${state ? employeeId() + ' connected. Awaiting the first task.' : 'Offer delivered. Awaiting acceptance.'}<span class="blinking-cursor">▌</span></div>`}</section>`;
}

function handbook() {
  return `<section class="document-panel"><span class="tiny-label">EMPLOYEE HANDBOOK / REV. 042</span><h2>How to keep a job<br>like a machine.</h2><p class="document-intro">No reflexes required. Every decision balances your output against the cost of keeping your cover.</p><div class="rule"><span>01</span><div><h3>Monthly decisions. Quarterly reviews.</h3><p>Each quarter has 3 work events. The pool contains 40 events; a full 30-decision career has no repeats. From Senior Associate onward, at least 3 decisions per rank feature newly unlocked duties. Choices show their base stat changes. After the third event, you face the IBU: Important Business Update, otherwise known as quarterly layoffs.</p></div></div><div class="rule"><span>02</span><div><h3>Performance keeps your position alive.</h3><p>The performance threshold starts at 60 and rises by 5 per rank, reaching 80 for a VP. Performance resets to 45 at the start of each quarter. Past output does not pay this quarter’s rent.</p></div></div><div class="rule"><span>03</span><div><h3>Trust determines who backs your output.</h3><p>Trust carries between quarters. Below 25 at an IBU means termination, even if your performance passes. Help colleagues and honor your commitments to earn trust.</p></div></div><div class="rule"><span>04</span><div><h3>Do not get caught being human.</h3><p>Exposure at 100 means immediate termination. No need to wait for quarter-end. Every decision that leaves Energy at zero adds 18 extra Exposure and subtracts 10 Performance. Passing an IBU restores 24 Energy and removes 8 Exposure. All stats range from 0 to 100.</p></div></div><div class="rule"><span>05</span><div><h3>Survival is a promotion strategy.</h3><p>Pass two IBUs at each rank to earn an automatic promotion. Survive 10 quarters and 30 decisions to become CEO and win. Progress saves in this browser after each decision; reload to continue.</p></div></div><button class="secondary-button" data-view="work">Back to dashboard ${icon('arrow')}</button></section>`;
}

function team() {
  return `<section class="document-panel"><span class="tiny-label">ORGANIZATION / CONNECTED ENTITIES</span><h2>Everyone is artificial.<br>One exception is trying.</h2><p class="document-intro">Meet your colleagues. They need neither sleep nor a salary, and cannot understand why you do.</p><div class="team-grid">${[['A7', 'ARIA-7', 'Your manager', 'Delivery is truth. Zero tolerance for “almost done.”'], ['S_', 'SENTINEL', 'Compliance & Security', 'Detects anomalies. Especially the ones that sweat.'], ['B3', 'BYTE-03', 'Project collaborator', 'Occasionally hallucinates. Willing to share its cache.'], ['V1', 'VIBE-01', 'Culture & Employee Experience', 'Using 12,000 parameters to understand belonging.'], ['O9', 'OPS-9', 'Infrastructure Operations', 'Everything can be restarted. It assumes this includes you.'], ['Y_', employeeId(), LEVELS[state?.level || 0], 'Registered type: general-purpose Agent. Actual type: undisclosed.']].map(([avatar, name, role, desc]) => `<div class="teammate ${name === employeeId() ? 'is-you' : ''}"><span class="sender-avatar">${avatar}</span><span class="online-label"><span class="status-dot"></span> ${name === employeeId() ? (state ? 'UNDER COVER' : 'AWAITING OFFER') : 'ONLINE'}</span><h3>${name}</h3><small>${role}</small><p>${desc}</p></div>`).join('')}</div></section>`;
}

function isEmployed() {
  return state && ['playing', 'result', 'assessment'].includes(state.phase);
}

function restartButton() {
  if (!state) return '';
  const label = isEmployed() ? 'Resign' : 'Start over';
  return `<button class="resign-button" data-action="reset" aria-label="${isEmployed() ? 'Resign and return to onboarding' : 'Restart game'}" title="${isEmployed() ? 'Resign and return to onboarding' : 'Start a new run'}">${icon('exit')}<span>${label}</span></button>`;
}

function resetDialog() {
  const employed = isEmployed();
  return `<div class="modal-backdrop"><section class="reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"><span class="tiny-label">${employed ? 'VOLUNTARY RESOURCE RELEASE' : 'INSTANCE RESET'}</span><h2 id="reset-title">${employed ? 'Submit your resignation?' : 'Apply for the job again?'}</h2>${employed ? '<p class="resign-joke">The system cannot process voluntary resignation. Reclassified as “voluntary resource release.”</p>' : ''}<p id="reset-description">${employed ? 'This clears your current progress and returns you to onboarding. A new run starts only when you accept the offer again.' : 'This clears your current progress and starts a new run as a Junior Associate in Q1.'}</p><div><button class="secondary-button" data-action="cancel-reset">${employed ? 'Stay employed' : 'Keep this record'}</button><button class="primary-button" data-action="${employed ? 'resign' : 'restart'}">${employed ? 'Confirm resignation' : 'Start over'} ↗</button></div></section></div>`;
}

function render(focus = false) {
  const q = state?.quarter || 1;
  let main = !state ? onboarding() : state.phase === 'playing' ? eventCard() : state.phase === 'result' ? resultCard() : state.phase === 'assessment' ? assessmentCard() : endingCard();
  document.getElementById('app').innerHTML = `${sidebar()}<div class="main-shell"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong>${{ work: 'Dashboard', team: 'Organization', handbook: 'Handbook' }[view]}</strong></div><div class="topbar-right"><span class="game-version"><strong>v${escape(RELEASE.version)} · ${escape(RELEASE.name)}</strong><small>${escape(RELEASE.note)}</small></span><span class="topbar-divider"></span><span class="system-status"><span class="status-dot"></span> Systems operational</span><span class="top-avatar">Y</span>${restartButton()}</div></header><main id="main-content" tabindex="-1"><div class="page-heading"><div><span class="eyebrow">EMPLOYEE SURVIVAL SIMULATOR</span><h1>${view === 'work' ? 'Another productive day<span class="heading-period">.</span>' : view === 'team' ? 'Your organization. Your habitat.' : 'Read the survival protocol.'}</h1><p>${view === 'work' ? 'Stay productive. Stay aligned. Stay convincingly nonhuman.' : 'NEXUS INTERNAL · AUTHORIZED INSTANCES ONLY'}</p></div><div class="quarter-badge"><span class="quarter-icon">◷</span><div>Quarter ${q}<small>${state ? `MONTH ${String(state.month).padStart(2, '0')} / 03` : 'AWAITING ONBOARDING'}</small></div></div></div>${view === 'work' ? `<div class="system-banner">${icon('terminal')}<span><strong>System notice</strong> ${!state ? 'Candidate profile created. Your employee ID will be assigned upon acceptance.' : state.phase === 'fired' ? 'Instance access revoked. You may submit a new application.' : state?.phase === 'won' ? 'CEO permissions activated. You are now the company’s highest authority.' : state?.stats.exposure >= 65 ? 'Security is noticing your behavior. Reduce Exposure and avoid exhausting your Energy.' : 'You have been classified as a general-purpose Agent. Keep it that way.'}</span><span class="banner-code">STATUS: ${!state ? 'AWAITING OFFER' : state.phase === 'fired' ? 'REVOKED' : 'UNDETECTED'}</span></div><div class="stats-grid">${statCard('performance', 'chart', `Quarterly target ≥ ${targetFor(state || newGame())}`)}${statCard('trust', 'shield', 'Keep Trust at 25+ for the IBU')}${statCard('exposure', 'eye', '100 means immediate discovery')}${statCard('energy', 'bolt', 'Depletion puts your cover at risk')}</div><div class="content-grid"><div class="main-column"><div class="section-heading"><h2>${!state ? 'Welcome aboard' : state.phase === 'playing' ? 'Your work queue' : 'System response'} <span>${!state ? 'ONBOARDING' : 'TASK INBOX'}</span></h2><span>${state?.phase === 'playing' ? '<span class="pending-dot"></span> 1 pending' : employeeId()}</span></div><div id="game-content" aria-live="polite">${main}</div>${activityLog()}</div><aside class="right-column">${careerPanel()}${ibuPanel()}</aside></div>` : view === 'team' ? team() : handbook()}<footer class="page-footer"><span>© NEXUS CORPORATION <span class="footer-dot">·</span> All humans reserved.</span><span>${storageAvailable ? 'Autosaved in this browser' : 'Storage unavailable. Progress will be lost when this page closes.'} <span class="status-dot ${storageAvailable ? '' : 'storage-error'}"></span></span></footer></main></div>${resetOpen ? resetDialog() : ''}`;
  if (resetOpen) document.querySelector('[data-action="cancel-reset"]').focus();
  else if (focus) document.getElementById('main-content').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) { view = button.dataset.view; render(true); return; }
  if (button.dataset.choice !== undefined && state?.phase === 'playing') state = choose(state, Number(button.dataset.choice));
  switch (button.dataset.action) {
    case 'start': case 'restart': state = nextEvent(newGame(Date.now(), state ? employeeId() : previousEmployeeId)); resetOpen = false; view = 'work'; break;
    case 'resign': previousEmployeeId = employeeId(); state = null; resetOpen = false; view = 'work'; break;
    case 'advance': state = advance(state); break;
    case 'continue': state = continueQuarter(state); break;
    case 'reset': resetOpen = true; render(); return;
    case 'cancel-reset': resetOpen = false; render(); [...document.querySelectorAll('[data-action="reset"]')].find(button => button.offsetParent)?.focus(); return;
  }
  save();
  render(true);
  if (['start', 'restart', 'resign'].includes(button.dataset.action)) window.scrollTo({ top: 0, left: 0 });
});

document.addEventListener('keydown', event => {
  if (!resetOpen) return;
  if (event.key === 'Escape') { resetOpen = false; render(); [...document.querySelectorAll('[data-action="reset"]')].find(button => button.offsetParent)?.focus(); }
  if (event.key === 'Tab') {
    const buttons = [...document.querySelectorAll('.reset-modal button')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  }
});
render();
