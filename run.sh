# prisma/schema.prisma の内容をデータベースに反映
npx prisma db push --accept-data-loss
# Prisma クライアントを作成
npx prisma generate
# アプリケーションを起動
node src/server.js