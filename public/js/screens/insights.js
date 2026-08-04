import { el, showLoading } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { getState } from '../state.js';
import { formatPercent } from '../utils/formatters.js';

function statCard(label, value, accent) {
  return el('div', { class: `stat-card${accent ? ' stat-card-accent' : ''}` }, [
    el('div', { class: 'stat-value' }, [String(value)]),
    el('div', { class: 'stat-label' }, [label]),
  ]);
}

function emptyState() {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'empty-state-illustration' }, ['📊']),
    el('h2', ['Your insights start here']),
    el('p', ['Complete a few routines and Routism will start showing your trends, streaks, and consistency.']),
    el('button', { class: 'btn btn-primary', onclick: () => navigate('/dashboard') }, ['Go to Routines']),
  ]);
}

function premiumGate() {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'empty-state-illustration' }, ['🔒']),
    el('h2', ['Insights is a Premium feature']),
    el('p', ['Upgrade to see your completion rate, streaks, and trends.']),
    el('button', { class: 'btn btn-primary', onclick: () => navigate('/premium') }, ['View Premium']),
  ]);
}

export async function renderInsights(root) {
  const content = el('div', { class: 'insights-screen', id: 'insights-content' });
  const main = renderShell(root, { title: 'Insights', activePath: '/insights', content });
  showLoading(content);

  try {
    const premium = await api.get('/premium/status');
    if (!premium.isActive) {
      content.innerHTML = '';
      content.appendChild(premiumGate());
      return main;
    }

    const summary = await api.get('/insights');
    content.innerHTML = '';

    if (!summary.hasData) {
      content.appendChild(emptyState());
      return main;
    }

    content.appendChild(el('div', { class: 'stat-grid' }, [
      statCard('Weekly completion', formatPercent(summary.completionRate), true),
      statCard('Current streak', `${summary.currentStreak} 🔥`),
      statCard('This week', `${summary.weeklyScore}/${summary.weeklyExpected}`),
      statCard('Monthly trend', formatPercent(summary.monthlyTrend.rate)),
    ]));

    content.appendChild(el('div', { class: 'stat-grid stat-grid-secondary' }, [
      statCard('Skipped this week', summary.weeklySkipped),
      statCard('Missed this week', summary.weeklyMissed),
    ]));

    if (summary.mostConsistentRoutine) {
      content.appendChild(el('div', { class: 'insight-highlight' }, [
        el('span', ['🏆 Most consistent: ']),
        el('strong', [summary.mostConsistentRoutine]),
      ]));
    }

    if (summary.missedRoutines.length) {
      content.appendChild(el('div', { class: 'missed-section' }, [
        el('h3', ['Recently missed']),
        ...summary.missedRoutines.map((m) =>
          el('div', { class: 'missed-item', onclick: () => navigate(`/tasks/${m.id}`) }, [
            el('span', [m.name]),
            el('span', { class: 'missed-item-date' }, [m.occurrenceDate]),
          ])
        ),
      ]));
    }

    content.appendChild(el('div', { class: 'export-actions' }, [
      el('a', { class: 'btn btn-ghost btn-sm', href: '/api/insights/export.csv', target: '_blank' }, ['Export CSV']),
      el('a', { class: 'btn btn-ghost btn-sm', href: '/api/insights/export.pdf', target: '_blank' }, ['Export PDF']),
    ]));

    content.appendChild(el('button', {
      class: 'btn btn-secondary btn-block',
      style: 'margin-top:16px',
      onclick: () => navigate('/achievements'),
    }, ['View Achievements']));
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'error-state' }, [err instanceof ApiError ? err.message : 'Could not load insights']));
  }

  return main;
}
