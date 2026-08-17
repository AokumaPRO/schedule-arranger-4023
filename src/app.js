'use strict';

const { Hono } = require('hono');
const {csrf}= require('hono/csrf')
const { logger } = require('hono/logger');
const { html } = require('hono/html');
const { HTTPException } = require('hono/http-exception');
const { secureHeaders } = require('hono/secure-headers');
const { env } = require('hono/adapter');
const { getCookie, deleteCookie } = require('hono/cookie');
const { serveStatic } = require('@hono/node-server/serve-static');
const { trimTrailingSlash } = require('hono/trailing-slash');
const { githubAuth } = require('@hono/oauth-providers/github');
const { googleAuth } = require('@hono/oauth-providers/google');
const { getIronSession } = require('iron-session');
const { PrismaClient } = require('@prisma/client');
const accountRouter = require('./routes/account'); // 追加
const layout = require('./layout');

const prisma = new PrismaClient({ log: ['query'] });

const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const scheduleRouter = require('./routes/schedules');
const availabilitiesRouter = require('./routes/availabilities');
const commentsRouter = require('./routes/comments');

const app = new Hono();

app.use(async (c, next) => {
  const { CSRF_TRUSTED_ORIGIN } = env(c);
  const handler = csrf({
    origin: CSRF_TRUSTED_ORIGIN,
  });
  await handler(c, next);
});
app.use(logger());
app.use(serveStatic({ root: './public' }));
app.use(secureHeaders({
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
app.use(trimTrailingSlash());

// セッション管理用のミドルウェア
app.use(async (c, next) => {
  const { SESSION_PASSWORD } = env(c);
  const session = await getIronSession(c.req.raw, c.res, {
    password: SESSION_PASSWORD,
    cookieName: 'session',
  });
  c.set('session', session);
  await next();
});

// GitHub 認証
app.use('/auth/github', async (c, next) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env(c);
  const authHandler = githubAuth({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    scope: ['user:email'],
    oauthApp: true,
  });
  return await authHandler(c, next);
});

// GitHub 認証の後の処理
app.get('/auth/github', async (c) => {
  const session = c.get('session');
  const githubUser = c.get('user-github');
  const userId = `github_${githubUser.id}`;

  // 既存ユーザーか確認
  const existingUser = await prisma.user.findUnique({ where: { userId } });

  if (existingUser) {
    // 既存ユーザーなら、DBに保存済みのユーザー名を使う（上書きしない）
    session.user = { id: userId, login: existingUser.username };
  } else {
    // 新規ユーザーなら作成
    session.user = { id: userId, login: githubUser.login };
    await prisma.user.create({
      data: { userId, username: githubUser.login },
    });
  }
  await session.save();

  const loginFrom = getCookie(c, 'loginFrom');
  if (loginFrom && /^\/(?!\/)[\w\-./?=&%+#:]*$/.test(loginFrom)) {
    deleteCookie(c, 'loginFrom');
    return c.redirect(loginFrom);
  } else {
    return c.redirect('/');
  }
});
// Google 認証
app.use('/auth/google', async (c, next) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = env(c);
  const authHandler = googleAuth({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    scope: ['openid', 'email', 'profile'],
    redirect_uri: GOOGLE_REDIRECT_URI,
  });
  return await authHandler(c, next);
});

// Google 認証の後の処理
app.get('/auth/google', async (c) => {
  const session = c.get('session');
  const googleUser = c.get('user-google');
  const userId = `google_${googleUser.id}`;

  const existingUser = await prisma.user.findUnique({ where: { userId } });

  if (existingUser) {
    session.user = { id: userId, login: existingUser.username };
  } else {
    session.user = { id: userId, login: googleUser.email };
    await prisma.user.create({
      data: { userId, username: googleUser.email },
    });
  }
  await session.save();

  const loginFrom = getCookie(c, 'loginFrom');
  if (loginFrom && /^\/(?!\/)[\w\-./?=&%+#:]*$/.test(loginFrom)) {
    deleteCookie(c, 'loginFrom');
    return c.redirect(loginFrom);
  } else {
    return c.redirect('/');
  }
});

// ルーティング
app.route('/', indexRouter);
app.route('/account', accountRouter); // 追加
app.route('/login', loginRouter);
app.route('/logout', logoutRouter);
app.route('/schedules', scheduleRouter);
app.route('/schedules', availabilitiesRouter);
app.route('/schedules', commentsRouter);

// 404 Not Found
app.notFound((c) => {
  return c.html(
    layout(
      c,
      'Not Found',
      html`
        <h1>Not Found</h1>
        <p>${c.req.url} の内容が見つかりませんでした。</p>
      `,
    ),
    404,
  );
});

// エラーハンドリング
app.onError((error, c) => {
  console.error(error);
  const statusCode = error instanceof HTTPException ? error.status : 500;
  const { NODE_ENV } = env(c);
  return c.html(
    layout(
      c,
      'Error',
      html`
        <h1>Error</h1>
        <h2>${error.name} (${statusCode})</h2>
        <p>${error.message}</p>
        ${NODE_ENV === 'development' ? html`<pre>${error.stack}</pre>` : ''}
      `,
    ),
    statusCode,
  );
});

module.exports = app;
