import { el, mount, toast } from '../utils/dom.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { setToken } from '../utils/storage.js';
import { setUser } from '../state.js';
import { isValidEmail, isValidPassword, isNonEmpty, runValidators } from '../utils/validators.js';

function authLayout(title, subtitle, formNode, footerNode) {
  return el('div', { class: 'auth-screen' }, [
    el('div', { class: 'auth-card' }, [
      el('div', { class: 'auth-brand' }, ['Routism']),
      el('h1', { class: 'auth-title' }, [title]),
      subtitle ? el('p', { class: 'auth-subtitle' }, [subtitle]) : null,
      formNode,
      footerNode,
    ]),
  ]);
}

function field(labelText, inputAttrs, errorId) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, [labelText]),
    el('input', { class: 'field-input', ...inputAttrs }),
    el('span', { class: 'field-error', id: errorId }),
  ]);
}

function setFieldErrors(form, errors) {
  form.querySelectorAll('.field-error').forEach((n) => { n.textContent = ''; });
  for (const [key, message] of Object.entries(errors)) {
    const errNode = form.querySelector(`#err-${key}`);
    if (errNode) errNode.textContent = message;
  }
}

export function renderLogin(root) {
  const emailInput = { type: 'email', id: 'login-email', placeholder: 'you@example.com', autocomplete: 'email' };
  const passwordInput = { type: 'password', id: 'login-password', placeholder: 'Your password', autocomplete: 'current-password' };

  const form = el('form', { class: 'auth-form' }, [
    field('Email', emailInput, 'err-email'),
    field('Password', passwordInput, 'err-password'),
    el('button', { class: 'link-btn', type: 'button', onclick: (e) => { e.preventDefault(); navigate('/forgot-password'); } }, ['Forgot password?']),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, ['Log In']),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#login-email').value.trim();
    const password = form.querySelector('#login-password').value;

    const errors = runValidators({ email, password }, {
      email: [[isValidEmail, 'Enter a valid email']],
      password: [[isNonEmpty, 'Password is required']],
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';
    try {
      const { user, token } = await api.post('/auth/login', { email, password });
      setToken(token);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Login failed', { type: 'error' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });

  const footer = el('p', { class: 'auth-footer' }, [
    "Don't have an account? ",
    el('a', { href: '#/signup' }, ['Sign up']),
  ]);

  mount(root, authLayout('Welcome back', null, form, footer));
}

export function renderSignup(root) {
  const form = el('form', { class: 'auth-form' }, [
    field('Name', { type: 'text', id: 'signup-name', placeholder: 'Your name', autocomplete: 'name' }, 'err-name'),
    field('Email', { type: 'email', id: 'signup-email', placeholder: 'you@example.com', autocomplete: 'email' }, 'err-email'),
    field('Password', { type: 'password', id: 'signup-password', placeholder: 'At least 8 characters', autocomplete: 'new-password' }, 'err-password'),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, ['Create Account']),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('#signup-name').value.trim();
    const email = form.querySelector('#signup-email').value.trim();
    const password = form.querySelector('#signup-password').value;

    const errors = runValidators({ email, password }, {
      email: [[isValidEmail, 'Enter a valid email']],
      password: [[isValidPassword, 'Password must be at least 8 characters']],
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';
    try {
      const { user, token } = await api.post('/auth/signup', { name, email, password });
      setToken(token);
      setUser(user);
      toast('Welcome to Routism! Your 5-day Premium trial has started.');
      navigate('/dashboard');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Sign up failed', { type: 'error' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  const footer = el('p', { class: 'auth-footer' }, [
    'Already have an account? ',
    el('a', { href: '#/login' }, ['Log in']),
  ]);

  mount(root, authLayout('Create your account', 'Start your 5-day Premium trial free.', form, footer));
}

export function renderForgotPassword(root) {
  const form = el('form', { class: 'auth-form' }, [
    field('Email', { type: 'email', id: 'forgot-email', placeholder: 'you@example.com' }, 'err-email'),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, ['Send Reset Link']),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#forgot-email').value.trim();
    const errors = runValidators({ email }, { email: [[isValidEmail, 'Enter a valid email']] });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length) return;

    try {
      await api.post('/auth/forgot-password', { email });
      toast('If that email exists, a reset link has been sent.');
      navigate('/login');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Something went wrong', { type: 'error' });
    }
  });

  const footer = el('p', { class: 'auth-footer' }, [
    el('a', { href: '#/login' }, ['Back to login']),
  ]);

  mount(root, authLayout('Reset your password', "We'll send a reset link to your email.", form, footer));
}
