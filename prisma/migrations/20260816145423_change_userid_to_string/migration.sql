-- CreateTable
CREATE TABLE "users" (
    "userId" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "schedules" (
    "scheduleId" UUID NOT NULL,
    "scheduleName" VARCHAR(255) NOT NULL,
    "memo" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("scheduleId")
);

-- CreateTable
CREATE TABLE "candidates" (
    "candidateId" SERIAL NOT NULL,
    "candidateName" VARCHAR(255) NOT NULL,
    "scheduleId" UUID NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("candidateId")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "candidateId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "availability" INTEGER NOT NULL DEFAULT 0,
    "scheduleId" UUID NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("candidateId","userId")
);

-- CreateTable
CREATE TABLE "comments" (
    "scheduleId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" VARCHAR(255) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("scheduleId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "schedules_createdBy_idx" ON "schedules"("createdBy");

-- CreateIndex
CREATE INDEX "candidates_scheduleId_idx" ON "candidates"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_candidateId_scheduleId_key" ON "candidates"("candidateId", "scheduleId");

-- CreateIndex
CREATE INDEX "availabilities_scheduleId_idx" ON "availabilities"("scheduleId");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("scheduleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_candidateId_scheduleId_fkey" FOREIGN KEY ("candidateId", "scheduleId") REFERENCES "candidates"("candidateId", "scheduleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("scheduleId") ON DELETE CASCADE ON UPDATE CASCADE;
