import { el, toast, showLoading } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { api, ApiError } from '../api.js';
import { formatCurrency } from '../utils/formatters.js';

function daysLeft(isoDate) {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export async function renderPremium(root) {
  const content = el('div', { class: 'premium-screen', id: 'premium-content' });
  const main = renderShell(root, { title: 'Premium', activePath: '/settings', content });
  showLoading(content);

  async function load() {
    try {
      const status = await api.get('/premium/status');
      content.innerHTML = '';
      renderContent(status);
    } catch (err) {
      content.innerHTML = '';
      content.appendChild(el('div', { class: 'error-state' }, [err instanceof ApiError ? err.message : 'Could not load Premium status']));
    }
  }

  function renderContent(status) {
    const trialDays = daysLeft(status.trialEndsAt);

    content.appendChild(el('div', { class: 'premium-hero' }, [
      el('h2', [status.isFounder ? `Founder #${status.founderNumber} 🎉` : status.isActive ? 'You have Premium' : 'Unlock Premium']),
      el('p', [
        status.isFounder
          ? 'Thank you for backing Routism as a founding member — lifetime access, forever.'
          : status.isActive
            ? `Trial active — ${trialDays} day${trialDays === 1 ? '' : 's'} left.`
            : 'Your trial has ended. Choose a plan to keep Insights and unlimited routines.',
      ]),
    ]));

    if (!status.isFounder && status.rewardedAdsRemaining > 0) {
      content.appendChild(el('div', { class: 'reward-ad-card' }, [
        el('div', [`Need more time? Watch a short ad for +3 days.`]),
        el('div', { class: 'reward-ad-meta' }, [`${status.rewardedAdsRemaining} of 3 extensions left`]),
        el('button', {
          class: 'btn btn-secondary',
          onclick: async (e) => {
            e.target.disabled = true;
            e.target.textContent = 'Loading ad…';
            try {
              // Ad SDK integration point: trigger the rewarded ad unit here,
              // then call the reward endpoint once the ad completes.
              await api.post('/premium/watch-ad', {});
              toast('+3 days added to your trial!');
              await load();
            } catch (err) {
              toast(err instanceof ApiError ? err.message : 'Could not load ad', { type: 'error' });
              e.target.disabled = false;
              e.target.textContent = 'Watch Ad for +3 Days';
            }
          },
        }, ['Watch Ad for +3 Days']),
      ]));
    }

    const plans = [
      { id: 'monthly', label: 'Monthly', price: status.pricing.monthly.amount, period: '/month' },
      { id: 'yearly', label: 'Yearly', price: status.pricing.yearly.amount, period: '/year', badge: 'Best value' },
      {
        id: 'founder',
        label: 'Founder Lifetime',
        price: status.pricing.founder.amount,
        period: 'one-time',
        badge: `${status.founderSlotsRemaining} of ${status.founderSlotsTotal} left`,
        disabled: status.founderSlotsRemaining <= 0 || status.isFounder,
      },
    ];

    content.appendChild(el('div', { class: 'plans-grid' }, plans.map((plan) =>
      el('div', { class: `plan-card${plan.id === 'yearly' ? ' plan-card-featured' : ''}` }, [
        plan.badge ? el('span', { class: 'plan-badge' }, [plan.badge]) : null,
        el('h3', [plan.label]),
        el('div', { class: 'plan-price' }, [formatCurrency(plan.price), el('span', { class: 'plan-period' }, [` ${plan.period}`])]),
        el('button', {
          class: 'btn btn-primary btn-block',
          disabled: plan.disabled,
          onclick: async () => {
            try {
              // Payment integration point: this should trigger Google Play Billing / Apple IAP
              // and only call /subscribe after the store confirms purchase.
              await api.post('/premium/subscribe', { plan: plan.id });
              toast(`You're now on the ${plan.label} plan!`);
              await load();
            } catch (err) {
              toast(err instanceof ApiError ? err.message : 'Could not complete purchase', { type: 'error' });
            }
          },
        }, [plan.disabled && plan.id === 'founder' ? 'Sold Out' : 'Choose Plan']),
      ])
    )));

    content.appendChild(el('ul', { class: 'premium-benefits' }, [
      el('li', ['Unlimited routines & full Insights']),
      el('li', ['No banner or interstitial ads, ever']),
      el('li', ['Priority support']),
    ]));
  }

  await load();
  return main;
}
