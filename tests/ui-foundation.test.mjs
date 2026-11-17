import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: { UI_ICONS: { search: '<svg data-icon="search"></svg>', x: '<svg data-icon="x"></svg>', 'circle-alert': '<svg data-icon="alert"></svg>' } } });
vm.runInContext(readFileSync(new URL('../src/ui/components.js', import.meta.url), 'utf8'), context, { filename: 'src/ui/components.js' });
vm.runInContext(readFileSync(new URL('../src/app/routes.js', import.meta.url), 'utf8'), context, { filename: 'src/app/routes.js' });
const ui = context.window.TerminalComponents;
const routes = context.window.TerminalRoutes;
const hostile = '<img src=x onerror="alert(1)">&\'';
const escaped = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;';
const count = (html, text) => html.split(text).length - 1;

// These tests cover pure generated markup/contracts, not browser layout or focus behavior.
test('text slots escape untrusted input while explicit Html slots remain composable', () => {
  assert.equal(ui.escape(hostile), escaped);
  assert.equal(ui.escape(null), '');
  assert.equal(ui.escape(0), '0');
  for (const html of [
    ui.PageHeader({ title: hostile, description: hostile, eyebrow: hostile }),
    ui.SourceBadge({ label: hostile, variant: hostile }),
    ui.ConfidenceBadge({ level: hostile }),
    ui.DetailDrawer({ title: hostile }),
    ui.EmptyState({ title: hostile, description: hostile }),
    ui.ErrorState({ title: hostile, description: hostile }),
  ]) {
    assert.ok(html.includes(escaped));
    assert.ok(!html.includes(hostile));
    assert.ok(!html.includes('<img'));
  }
  const card = ui.StatCard({ label: hostile, valueHtml: '<span>12.5</span>', detailHtml: '<em>Annual marks</em>', variant: hostile });
  assert.ok(card.includes(escaped));
  assert.ok(card.includes('<span>12.5</span>'));
  assert.ok(card.includes('<em>Annual marks</em>'));
  const table = ui.DataTable({ headers: [hostile, 'Marks'], rowsHtml: '<tr><td>EC</td><td>2</td></tr>', caption: hostile });
  assert.equal(count(table, escaped), 2);
  assert.equal(count(table, 'scope="col"'), 2);
  assert.ok(table.includes('<tbody><tr><td>EC</td><td>2</td></tr></tbody>'));
  const segments = ui.SegmentedControl({ items: [[hostile, hostile], ['all', 'All']], selected: 'all', attribute: 'data-selection' });
  assert.ok(segments.includes('data-selection="' + escaped + '"'));
  assert.ok(segments.includes('aria-pressed="true">All'));
  assert.ok(!segments.includes('<img'));
});

test('chart descriptions are text; plot controls only appear for analytical SVGs', () => {
  const plot = ui.ChartPanel({ title: hostile, description: hostile, bodyHtml: '<svg role="img" viewBox="0 0 100 100"></svg>', footHtml: '<em>Source corpus</em>' });
  assert.ok(plot.includes('<p class="panel-description">' + escaped + '</p>'));
  assert.ok(!plot.includes('<img'));
  assert.ok(plot.includes('data-ui-action="expand-chart"'));
  assert.ok(plot.includes('data-chart-export="svg"'));
  assert.ok(plot.includes('data-chart-export="png"'));
  assert.ok(plot.includes('<em>Source corpus</em>'));
  for (const bodyHtml of ['<table><tr><td>520 records</td></tr></table>', '<svg aria-hidden="true"><path/></svg>', '<p>No observed values.</p>']) {
    const html = ui.ChartPanel({ title: 'Coverage', bodyHtml });
    assert.ok(!html.includes('expand-chart'));
    assert.ok(!html.includes('data-chart-export'));
  }
  assert.ok(ui.ChartPanel({ title: 'Plot', bodyHtml: '<svg class="chart compact"></svg>' }).includes('expand-chart'));
});

test('empty, loading and error states convey actual state and do not manufacture values', () => {
  const empty = ui.EmptyState({ title: 'No matching questions', description: 'Broaden your scope.' });
  assert.ok(empty.includes('No matching questions'));
  assert.ok(!empty.includes('<button'));
  const retry = '<button data-retry="true">Retry</button>';
  assert.ok(ui.EmptyState({ title: 'Empty', description: '', actionHtml: retry }).includes(retry));
  const error = ui.ErrorState({ description: hostile, actionHtml: retry });
  assert.ok(error.includes('role="alert"'));
  assert.ok(error.includes(escaped));
  assert.ok(error.includes(retry));
  const loading = ui.LoadingSkeleton({ label: hostile });
  assert.ok(loading.includes('role="status"'));
  assert.ok(loading.includes('aria-label="' + escaped + '"'));
  assert.ok(loading.includes('skeleton-chart'));
  assert.ok(!loading.includes('<img'));
  assert.ok(!loading.includes('520'));
});

test('presentation protection fails closed unless authorization is exactly true', () => {
  const privateMarkup = '<section data-private="true">Private candidate records</section>';
  const deniedMarkup = '<p>Authentication unavailable</p>';
  assert.equal(ui.ProtectedRoute({ authorized: true, contentHtml: privateMarkup, deniedHtml: deniedMarkup }), privateMarkup);
  for (const authorized of [false, undefined, null, 0, '', 'false', 'true', {}, []]) {
    assert.equal(ui.ProtectedRoute({ authorized, contentHtml: privateMarkup, deniedHtml: deniedMarkup }), deniedMarkup);
  }
  const missing = ui.ProtectedRoute({ contentHtml: privateMarkup });
  assert.equal(typeof missing, 'string');
  assert.ok(!missing.includes('data-private'));
});

test('shell updates preserve unchanged DOM containers; filter/search setup retains input value', () => {
  const node = initial => {
    let html = initial;
    let writes = 0;
    return { get innerHTML() { return html; }, set innerHTML(value) { html = value; writes++; }, get writes() { return writes; } };
  };
  const sidebar = node('');
  const header = node('');
  ui.AppShell({ sidebar, header, sidebarHtml: '<nav>Research</nav>', headerHtml: '<b>Overview</b>' });
  ui.AppShell({ sidebar, header, sidebarHtml: '<nav>Research</nav>', headerHtml: '<b>Overview</b>' });
  assert.equal(sidebar.writes, 1);
  assert.equal(header.writes, 1);
  ui.AppShell({ sidebar, header, sidebarHtml: '<nav>Research</nav>', headerHtml: '<b>Topics</b>' });
  assert.equal(sidebar.writes, 1);
  assert.equal(header.writes, 2);
  assert.ok(ui.AppSidebar({ brandHtml: '<b>GATE EC</b>', navigationHtml: '<nav>Research</nav>', footerHtml: '<p>Sources</p>' }).includes('<nav>Research</nav>'));
  assert.ok(ui.WorkspaceHeader({ startHtml: '<b>Overview</b>', actionsHtml: '<button>Export</button>' }).includes('<button>Export</button>'));
  const classes = new Set();
  const attributes = {};
  ui.FilterToolbar({ node: { classList: { add: value => classes.add(value) }, setAttribute: (key, value) => attributes[key] = value } });
  assert.ok(classes.has('filter-bar'));
  assert.equal(attributes['aria-label'], 'Research scope filters');
  const searchIcon = {};
  const input = { value: 'Communications' };
  const help = {};
  ui.SearchCommand({ top: { querySelector: selector => { assert.equal(selector, 'span'); return searchIcon; } }, input, help });
  assert.equal(input.value, 'Communications');
  assert.ok(input.placeholder.includes('Search'));
  assert.ok(searchIcon.innerHTML.includes('aria-hidden="true"'));
  assert.ok(help.innerHTML.includes('Esc'));
});

const originalRouteIds = ['monitor', 'explorer', 'subjects', 'topics', 'lab', 'compare', 'scenarios', 'reports', 'audit', 'questions', 'difficulty', 'distributions', 'inference', 'responses', 'evidence'];
test('catalogue uniquely covers every original research route plus real settings', () => {
  const activeIds = Array.from(routes.working).flatMap(entry => Array.from(entry.routes));
  assert.equal(activeIds.length, 40);
  assert.equal(new Set(activeIds).size, activeIds.length);
  assert.ok([...originalRouteIds,'settings','recruitment','technical-exams','recruiters','recruitment-detail','recruitment-preferences','recruitment-saved','recruitment-notifications'].every(id=>activeIds.includes(id)));
  for (const id of activeIds) {
    assert.equal(routes.resolve(id).status, 'available', id);
    assert.ok(routes.find(id));
  }
  assert.equal(routes.resolve('unknown-route').status, 'not-found');
  assert.equal(routes.find('unknown-route'), null);
  assert.equal(routes.resolve('').status, 'not-found');
});

test('migrated module routes share one catalogue while owner navigation stays protected',()=>{
 assert.equal(routes.future.length,0);
 for(const id of ['rank','admissions','institutes','psu','dashboard','profile','planner','mocks','reminders','forum'])assert.equal(routes.resolve(id).status,'available');
 const visible=owner=>Array.from(routes.visibleGroups(owner)).flatMap(g=>Array.from(g.items)).map(i=>i.id);
 assert.ok(!visible(false).includes('admin'));assert.ok(visible(true).includes('admin'));assert.ok(!visible('true').includes('admin'));
 assert.equal(routes.resolve('rank-predictor').id,'rank');assert.equal(routes.resolve('pyq-bank').id,'questions');assert.equal(routes.resolve('__proto__').status,'not-found');
});

test('export capability denies unavailable routes and absent local response data', () => {
  assert.equal(routes.canExport('responses', false), false);
  assert.equal(routes.canExport('responses', undefined), false);
  assert.equal(routes.canExport('responses', true), true);
  assert.equal(routes.canExport('responses', 'false'), false);
  assert.equal(routes.canExport('settings', true), false);
  assert.equal(routes.canExport('evidence', true), false);
  for (const route of [...Array.from(routes.future, entry => entry.id), 'unavailable', 'unknown-route', '']) {
    assert.equal(routes.canExport(route, true), false, route);
  }
  for (const route of originalRouteIds.filter(id => !['responses', 'evidence'].includes(id))) {
    assert.equal(routes.canExport(route, false), true, route);
  }
});


test('segmented controls reject attribute-name injection', () => {
  for (const attribute of ['onclick', 'data-x" onclick="attack', 'data-x y', 'data-', 'DATA-tab', undefined]) {
    assert.throws(() => ui.SegmentedControl({ items: [['all', 'All']], selected: 'all', attribute }), /Expected a data-\* action attribute/);
  }
});
