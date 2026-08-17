const { Hono } = require('hono');
const { html } = require('hono/html');
const {setCookie } = require('hono/cookie')
const layout = require('../layout');

const app = new Hono();

app.get('/', (c) => {
  const from = c.req.query('from');
  if (from) {
    setCookie(c, 'loginFrom', from, { maxAge: 1000 * 60 * 10 });
  }
  return c.html(
    layout(
      c,
      'Login',
      html`
        <a href="/auth/github" class="btn btn-primary my-3">
          GitHub でログイン
        </a>
        <a href="/auth/google" class="btn btn-outline-danger my-3">
          Google でログイン
        </a>
      `,
    ),
  );
});

module.exports = app;