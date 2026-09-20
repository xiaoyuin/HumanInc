import { LEVELS, STAT_NAMES, SAVE_KEY, newGame, nextEvent, currentEvent, choose, advance, continueQuarter, targetFor, validSave } from './game.js';

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
let view = 'work';
let resetOpen = false;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (validSave(saved)) state = saved;
} catch { storageAvailable = false; }

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { storageAvailable = false; }
}

function statCard(key, symbol, note) {
  const value = (state || newGame()).stats[key];
  const warning = key === 'exposure' ? value >= 65 : key === 'energy' ? value <= 25 : key === 'trust' ? value < 35 : false;
  return `<div class="stat-card ${warning ? 'warning' : ''}"><div class="stat-title">${icon(symbol)}<span>${STAT_NAMES[key]}指数</span><span class="stat-code">${{ performance: 'PRF', trust: 'TRT', exposure: 'EXP', energy: 'NRG' }[key]}</span></div><div class="stat-value">${value}<span>/ 100</span>${warning ? '<span class="warning-label">需关注</span>' : ''}</div><div class="meter"><span style="width:${value}%"></span></div><p>${note}</p></div>`;
}

function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="/" aria-label="Human Inc. 首页"><span class="brand-icon">h<span>i</span></span><span>human<span class="brand-comma">,</span> inc<span class="brand-dot">.</span><small>AGENT-FIRST. HUMAN-NEVER.</small></span></a><div class="workspace"><span class="workspace-mark">N</span><div>NEXUS CORPORATION<small>企业协作工作空间</small></div><span class="workspace-chevron">⌄</span></div><div class="nav-label">WORKSPACE</div><nav aria-label="主导航">${[['work', 'grid', '工作台', '01'], ['team', 'team', '组织架构', '06'], ['handbook', 'book', '员工手册', '↗']].map(([id, symbol, label, badge]) => `<button class="nav-item ${view === id ? 'active' : ''}" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span><small>${badge}</small></button>`).join('')}</nav><div class="sidebar-notice"><span class="tiny-label">COMPANY VALUE #001</span><div class="notice-art">[ <span>0</span> <span>1</span> ]</div><p>这里没有人情世故。<br>只有模型权重。</p><span class="notice-bottom">OPTIMIZE. ALIGN. REPEAT.</span></div><div class="sidebar-footer"><div class="connection"><span class="status-dot"></span> 内部网络连接正常 <span>v.1.0</span></div><div class="sidebar-user"><span class="user-avatar">Y<span class="status-dot"></span></span><div>YOU-042<small>${LEVELS[state?.level || 0]} · 试运行实例</small></div></div></div></aside>`;
}

function careerPanel() {
  const level = state?.level || 0;
  return `<section class="panel career-panel"><div class="panel-heading"><h2>晋升路径</h2><span class="tiny-label">CAREER.EXE</span></div><div class="career-list">${LEVELS.map((name, index) => `<div class="career-step ${index === level ? 'current' : ''} ${index < level ? 'completed' : ''}"><span class="step-node">${index < level ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>${name}</strong><small>${['执行指令，保持低调', '独立交付，成为骨干', '调度资源，带领团队', '制定战略，管理部门', '影响公司，接近核心', '成为系统的最高权限'][index]}</small></div>${index === level ? '<span class="you-tag">YOU</span>' : index === 5 ? '<span class="crown">♛</span>' : ''}</div>`).join('')}</div><div class="career-bottom"><span>当前职级存活</span><strong>${state?.tenure || 0}<span> / 2 季度</span></strong></div><p class="panel-footnote">每存活两个季度，晋升一个职级。</p></section>`;
}

function ibuPanel() {
  return `<section class="ibu-panel"><div class="ibu-top"><span class="live-square"></span> IMPORTANT BUSINESS UPDATE ${icon('arrow')}</div><h3>每个季度，<br>重新证明你的价值。</h3><p>组织优化不针对任何个体。<br>只针对未达标的个体。</p><div class="ibu-date"><span>下次 IBU</span><strong>Q${state?.quarter || 1} <span>/ 季度末</span></strong></div></section>`;
}

function onboarding() {
  return `<section class="intro-card"><div class="classified"><span class="status-dot"></span> CONFIDENTIAL · 入职前须知</div><div class="intro-art" aria-hidden="true"><div class="robot r1"><span></span><span></span></div><div class="robot r2"><span></span><span></span></div><div class="human-face"><i></i><i></i><b></b><span class="human-label">YOU?</span></div><div class="robot r3"><span></span><span></span></div><div class="scan-line"></div></div><h2>你的同事都不是人。<br>你最好也<span class="highlight">不是。</span></h2><p class="intro-description">欢迎加入一家完全由 Agent 运营的公司。<br>你是唯一的人类。你的目标：藏好身份，活过裁员，<br class="desktop-break">一路升职，成为 CEO。</p><div class="intro-pills"><span>◷ 约 10–15 分钟</span><span>⌘ 30 次职场抉择</span><span>↗ 6 个职级</span></div><button class="primary-button" data-action="start">接受 Offer，开始潜伏 ${icon('arrow')}</button><p class="intro-disclaimer">点击即表示同意：本人不是人类。<span>（你可以撒谎。）</span></p></section>`;
}

function effectsHtml(effects) {
  return Object.entries(effects).map(([key, value]) => `<span class="effect ${(key === 'exposure' ? value < 0 : value > 0) ? 'good' : 'bad'}">${STAT_NAMES[key]} ${value > 0 ? '+' : ''}${value}</span>`).join('');
}

function eventCard() {
  const event = currentEvent(state);
  return `<section class="event-card"><div class="event-top"><span><span class="status-dot"></span> 待处理事件 <span class="event-number">/ ${String((state.quarter - 1) * 3 + state.month).padStart(2, '0')}</span></span><span class="category">${event.category}</span></div><div class="event-body"><div class="sender"><span class="sender-avatar">${event.avatar}</span><div><strong>${event.sender}</strong><small>${event.role} <span>·</span> 发给 YOU-042</small></div><span class="sender-time">刚刚</span></div><h2>${event.subject}</h2><p class="event-text">${event.text.split('\n').join('<br>')}</p><blockquote>${icon('terminal')}<span>${event.quote}</span></blockquote><div class="decision-label"><span>选择你的回应</span><span>YOUR NEXT MOVE</span></div><div class="choices">${event.options.map((option, index) => `<button class="choice" data-choice="${index}"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span class="choice-content"><strong>${option.title}</strong><span class="choice-detail">${option.detail}</span><span class="effects">${effectsHtml(option.effects)}</span></span><span class="choice-arrow">↗</span></button>`).join('')}</div></div><div class="event-footer">${icon('shield')} 所有行为均已接入合规监控。请自然地表现得不自然。</div></section>`;
}

function resultCard() {
  return `<section class="outcome-card"><span class="outcome-mark">✓</span><span class="tiny-label">RESPONSE ACCEPTED</span><h2>已提交。暂时安全。</h2><p class="result-choice">${escape(state.lastResult.title)}</p><p class="outcome-copy">${escape(state.lastResult.text)}</p><div class="result-effects">${effectsHtml(state.lastResult.effects)}</div>${state.lastResult.exhausted ? '<div class="burnout">精力耗尽，你的伪装出现破绽：额外暴露 +18、绩效 −10。注意安排休息。</div>' : ''}<button class="primary-button" data-action="advance">${state.month === 3 ? '进入季度 IBU' : '继续下个月'} ${icon('arrow')}</button><span class="outcome-note">${state.month === 3 ? '季度考核即将开始。愿你的指标足够漂亮。' : '系统已记录本次决策。下一个请求正在路上。'}</span></section>`;
}

function assessmentCard() {
  const a = state.assessment;
  return `<section class="outcome-card assessment"><span class="report-stamp">RETAINED</span><span class="tiny-label">Q${a.quarter} · IMPORTANT BUSINESS UPDATE</span><h2>${a.promoted ? '恭喜，你的权限升级了。' : '本轮优化，没有你。'}</h2><p class="outcome-copy">${a.promoted ? `连续存活两个季度，你已晋升为「${LEVELS[state.level]}」。<br>新的权限，和更高的绩效门槛，正在等你。` : '你的产出满足组织预期。<br>工号保留，权限保留，人类身份依旧保密。'}</p><div class="report-metrics"><div><span>季度绩效</span><strong>${a.performance}<small> / ${a.target} 达标</small></strong></div><div><span>组织信任</span><strong>${a.trust}<small> / 25 达标</small></strong></div></div><div class="quarter-recovery">季度维护：精力 +24 · 暴露 −8 · 绩效重置为 45</div><button class="primary-button" data-action="continue">进入 Q${state.quarter + 1} ${icon('arrow')}</button><span class="outcome-note">${a.promoted ? '人类的一小步，组织架构的一大步。' : '再存活一个季度，即可晋升下一个职级。'}</span></section>`;
}

function endingCard() {
  const won = state.phase === 'won';
  const reasons = {
    human: ['你的人类身份，暴露了。', '系统检测到过多无法解释的生物特征。你的访问权限已被即时撤销。', '下次试试用流程包装人性。暴露达到 100 会立刻出局，也要避免精力耗尽。'],
    performance: ['你的岗位，被优化了。', `本季度绩效为 ${state.stats.performance}，低于 ${state.assessment?.target || targetFor(state)} 的保留门槛。公司感谢你的运行。`, '下次在季度结束前积累更多绩效，同时为高强度工作预留精力。'],
    trust: ['组织不再信任你的输出。', '你的信任低于 25。即便产出达标，缺少协作支持的实例也会被移出组织。', '下次多帮助同事、认真完成协作。不要让漂亮的报表耗尽所有信任。'],
  };
  const [title, copy, tip] = won ? ['最高权限，属于一个人类。', '你熬过了 10 次季度 IBU，从一名小职员成为 CEO。<br>这家完全由 Agent 运营的公司，终于有了一个人的方向。', '你的第一项决定：把“资源维护窗口”改回“周末”。'] : reasons[state.reason];
  return `<section class="outcome-card ending ${won ? 'victory' : 'termination'}"><span class="outcome-mark">${won ? '♛' : '×'}</span><span class="tiny-label">${won ? 'ROOT ACCESS GRANTED · 游戏通关' : 'ACCESS REVOKED · 雇佣终止'}</span><h2>${title}</h2><p class="outcome-copy">${copy}</p><div class="ending-summary"><div><strong>${state.quarter}</strong><span>经历季度</span></div><div><strong>${LEVELS[state.level]}</strong><span>最终职级</span></div><div><strong>${state.history.length}</strong><span>职场抉择</span></div></div><p class="ending-tip">${tip}</p><button class="primary-button" data-action="restart">${won ? '换个工号，再来一次' : '重新投递简历'} ${icon('arrow')}</button></section>`;
}

function activityLog() {
  const history = state?.history.slice(0, 3) || [];
  return `<section class="activity"><div class="section-heading"><h2>运行日志 <span>ACTIVITY LOG</span></h2><span>${history.length ? '最近决策' : '等待输入'}</span></div>${history.length ? history.map(entry => `<div class="log-entry"><span class="log-dot"></span><span class="log-time">Q${entry.quarter} / M${entry.month}</span><div><strong>${escape(entry.choice)}</strong><span>${escape(entry.result)}</span></div><span class="log-check">✓</span></div>`).join('') : '<div class="empty-log"><span class="log-dot"></span><span>09:00</span> YOU-042 已接入工作空间。等待首次任务。<span class="blinking-cursor">▌</span></div>'}</section>`;
}

function handbook() {
  return `<section class="document-panel"><span class="tiny-label">EMPLOYEE HANDBOOK / REV. 042</span><h2>如何像机器一样，<br>保住一份工作。</h2><p class="document-intro">这里不考验手速。每一次选择，都在工作成果和伪装成本之间寻找平衡。</p><div class="rule"><span>01</span><div><h3>按月决策，按季考核</h3><p>每季度包含 3 次工作事件。共 40 个事件，一局 30 次决策不重复；高级职员起，每个职级至少遇到 3 个新解锁的专属事件。选项会预告全部基础数值变化。完成第三次事件后，进入 IBU（Important Business Update）季度裁员考核。</p></div></div><div class="rule"><span>02</span><div><h3>绩效决定你的岗位</h3><p>初级职员的季度绩效门槛是 60，每晋升一级增加 5，副总裁为 80。每季度开始时绩效重置为 45，必须重新交付成果。</p></div></div><div class="rule"><span>03</span><div><h3>信任决定有没有人支持你</h3><p>信任跨季度保留。IBU 时信任低于 25，即使绩效达标也会被裁员。帮助同事与遵守协作流程可以积累信任。</p></div></div><div class="rule"><span>04</span><div><h3>千万别被发现是人</h3><p>暴露达到 100 会立即裁员，无需等待季度末。精力耗尽的每次决策都会额外增加 18 暴露、扣除 10 绩效。季度通过后恢复 24 精力、降低 8 暴露。所有指数范围均为 0–100。</p></div></div><div class="rule"><span>05</span><div><h3>存活，就是晋升</h3><p>每个职级连续通过两次 IBU 后自动晋升。经历 10 个季度、30 次决策成为 CEO 即通关。决策后自动在当前浏览器保存，刷新页面可以继续。</p></div></div><button class="secondary-button" data-view="work">返回工作台 ${icon('arrow')}</button></section>`;
}

function team() {
  return `<section class="document-panel"><span class="tiny-label">ORGANIZATION / CONNECTED ENTITIES</span><h2>全员智能。<br>除了一个例外。</h2><p class="document-intro">认识你的同事。他们不需要睡眠、不需要工资，也不理解你为什么需要。</p><div class="team-grid">${[['A7', 'ARIA-7', '直属主管', '交付即真理。对“马上就好”的容忍度为零。'], ['S_', 'SENTINEL', '合规与安全', '负责检测异常。尤其是会流汗的异常。'], ['B3', 'BYTE-03', '项目协作者', '偶尔产生幻觉，但愿意共享缓存。'], ['V1', 'VIBE-01', '文化与组织体验', '正在用 12,000 个参数理解“归属感”。'], ['O9', 'OPS-9', '基础设施运维', '一切都可以重启。它认为你也可以。'], ['Y_', 'YOU-042', LEVELS[state?.level || 0], '备案类型：通用 Agent。真实类型：暂不公开。']].map(([avatar, name, role, desc]) => `<div class="teammate ${name === 'YOU-042' ? 'is-you' : ''}"><span class="sender-avatar">${avatar}</span><span class="online-label"><span class="status-dot"></span> ${name === 'YOU-042' ? '伪装在线' : 'ONLINE'}</span><h3>${name}</h3><small>${role}</small><p>${desc}</p></div>`).join('')}</div></section>`;
}

function isEmployed() {
  return state && ['playing', 'result', 'assessment'].includes(state.phase);
}

function restartButton() {
  if (!state) return '';
  const label = isEmployed() ? '辞职' : '重新开始';
  return `<button class="resign-button" data-action="reset" aria-label="${isEmployed() ? '辞职，重新开始游戏' : '重新开始游戏'}" title="重新开始一局">${icon('exit')}<span>${label}</span></button>`;
}

function resetDialog() {
  const employed = isEmployed();
  return `<div class="modal-backdrop"><section class="reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"><span class="tiny-label">${employed ? 'VOLUNTARY RESOURCE RELEASE' : 'INSTANCE RESET'}</span><h2 id="reset-title">${employed ? '提交辞职申请？' : '重新投递简历？'}</h2>${employed ? '<p class="resign-joke">系统无法理解主动离职，已归类为“自愿释放算力”。</p>' : ''}<p id="reset-description">确认后将清除当前游戏进度，从第 1 季度的初级职员重新开始。</p><div><button class="secondary-button" data-action="cancel-reset">${employed ? '暂不辞职' : '保留当前记录'}</button><button class="primary-button" data-action="restart">${employed ? '辞职，重新开始' : '重新开始'} ↗</button></div></section></div>`;
}

function render(focus = false) {
  const q = state?.quarter || 1;
  let main = !state ? onboarding() : state.phase === 'playing' ? eventCard() : state.phase === 'result' ? resultCard() : state.phase === 'assessment' ? assessmentCard() : endingCard();
  document.getElementById('app').innerHTML = `${sidebar()}<div class="main-shell"><header class="topbar"><div class="breadcrumb">工作空间 <span>/</span> <strong>${{ work: '工作台', team: '组织架构', handbook: '员工手册' }[view]}</strong></div><div class="topbar-right"><span class="environment-label">PRODUCTION</span><span class="topbar-divider"></span><span class="system-status"><span class="status-dot"></span> 系统运行正常</span><span class="top-avatar">Y</span>${restartButton()}</div></header><main id="main-content" tabindex="-1"><div class="page-heading"><div><span class="eyebrow">EMPLOYEE SURVIVAL SIMULATOR</span><h1>${view === 'work' ? '又是高效运行的一天<span class="heading-period">。</span>' : view === 'team' ? '你的组织，你的生存环境。' : '欢迎阅读生存协议。'}</h1><p>${view === 'work' ? '保持产出。保持对齐。保持不像一个人类。' : 'NEXUS 内部资料 · 仅限授权实例访问'}</p></div><div class="quarter-badge"><span class="quarter-icon">◷</span><div>第 ${q} 季度<small>${state ? `MONTH ${String(state.month).padStart(2, '0')} / 03` : 'AWAITING ONBOARDING'}</small></div></div></div>${view === 'work' ? `<div class="system-banner">${icon('terminal')}<span><strong>系统提示</strong> ${state?.phase === 'fired' ? '当前实例的访问权限已撤销。你可以重新投递简历。' : state?.phase === 'won' ? 'CEO 权限已激活。欢迎成为这家公司的最高决策者。' : state?.stats.exposure >= 65 ? '你的行为正在引起安全部门注意。请降低暴露，避免精力耗尽。' : '你已被识别为通用型 Agent。请继续保持。'}</span><span class="banner-code">STATUS: ${state?.phase === 'fired' ? 'REVOKED' : 'UNDETECTED'}</span></div><div class="stats-grid">${statCard('performance', 'chart', `本季保留门槛 ≥ ${targetFor(state || newGame())}`)}${statCard('trust', 'shield', '季度信任低于 25 将被裁员')}${statCard('exposure', 'eye', '达到 100 将立即暴露身份')}${statCard('energy', 'bolt', '精力耗尽会增加暴露风险')}</div><div class="content-grid"><div class="main-column"><div class="section-heading"><h2>${!state ? '欢迎入职' : state.phase === 'playing' ? '你的工作队列' : '系统回执'} <span>${!state ? 'ONBOARDING' : 'TASK INBOX'}</span></h2><span>${state?.phase === 'playing' ? '<span class="pending-dot"></span> 1 项待处理' : 'YOU-042'}</span></div><div id="game-content" aria-live="polite">${main}</div>${activityLog()}</div><aside class="right-column">${careerPanel()}${ibuPanel()}</aside></div>` : view === 'team' ? team() : handbook()}<footer class="page-footer"><span>© NEXUS CORPORATION <span class="footer-dot">·</span> All humans reserved.</span><span>${storageAvailable ? '本地自动存档' : '浏览器存储不可用，关闭页面会丢失进度'} <span class="status-dot ${storageAvailable ? '' : 'storage-error'}"></span></span></footer></main></div>${resetOpen ? resetDialog() : ''}`;
  if (resetOpen) document.querySelector('[data-action="cancel-reset"]').focus();
  else if (focus) document.getElementById('main-content').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) { view = button.dataset.view; render(true); return; }
  if (button.dataset.choice !== undefined && state?.phase === 'playing') state = choose(state, Number(button.dataset.choice));
  switch (button.dataset.action) {
    case 'start': case 'restart': state = nextEvent(newGame()); resetOpen = false; view = 'work'; break;
    case 'advance': state = advance(state); break;
    case 'continue': state = continueQuarter(state); break;
    case 'reset': resetOpen = true; render(); return;
    case 'cancel-reset': resetOpen = false; render(); [...document.querySelectorAll('[data-action="reset"]')].find(button => button.offsetParent)?.focus(); return;
  }
  if (state) save();
  render(true);
  if (['start', 'restart'].includes(button.dataset.action)) window.scrollTo({ top: 0, left: 0 });
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
