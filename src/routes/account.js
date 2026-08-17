const { Hono } = require('hono');
const { html } = require('hono/html');
const layout = require('../layout');
const ensureAuthenticated = require('../middlewares/ensure-authenticated');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });
const { z } = require('zod');
const { zValidator } = require('@hono/zod-validator');
const { HTTPException } = require('hono/http-exception');

const app = new Hono();

app.use(ensureAuthenticated());

const usernameFormValidator = zValidator(
  'form',
  z.object({
    username: z.string().min(1, 'ユーザー名を入力してください').max(255),
  }),
  (result) => {
    if (!result.success) {
      throw new HTTPException(400, { message: '入力された情報が正しくありません' });
    }
  }
);

app.get('/', (c) => {
  const { user } = c.get('session') ?? {};
  return c.html(
    layout(
      c,
      'アカウント設定',
      html`
        <h1 class="my-3">アカウント設定</h1>
        <form method="post" action="/account/update" class="my-3">
          <div class="mb-3">
            <label class="form-label">ユーザー名</label>
            <input
              type="text"
              name="username"
              class="form-control"
              value="${user.login}"
            />
          </div>
          <button class="btn btn-primary" type="submit">変更する</button>
        </form>
      `,
    ),
  );
});

app.post('/update', usernameFormValidator, async (c) => {
  const session = c.get('session');
  const { user } = session ?? {};
  const body = c.req.valid('form');
  const newUsername = body.username.trim();

  // 重複チェック(自分以外に同じユーザー名がいないか)
  const existing = await prisma.user.findUnique({
    where: { username: newUsername },
  });
  if (existing && existing.userId !== user.id) {
    return c.html(
      layout(
        c,
        'アカウント設定',
        html`
          <h1 class="my-3">アカウント設定</h1>
          <p class="text-danger">そのユーザー名は既に使われています。</p>
          <form method="post" action="/account/update" class="my-3">
            <div class="mb-3">
              <label class="form-label">ユーザー名</label>
              <input
                type="text"
                name="username"
                class="form-control"
                value="${newUsername}"
              />
            </div>
            <button class="btn btn-primary" type="submit">変更する</button>
          </form>
        `,
      ),
      400,
    );
  }

  // DB を更新
  await prisma.user.update({
    where: { userId: user.id },
    data: { username: newUsername },
  });

  // セッションも更新
  session.user.login = newUsername;
  await session.save();

  return c.redirect('/account');
});

module.exports = app;