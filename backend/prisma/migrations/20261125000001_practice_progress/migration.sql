-- AlterTable
ALTER TABLE "practice_attempts"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS "last_question_index" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "completed_at" DROP NOT NULL,
  ALTER COLUMN "completed_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "practice_attempts_user_id_chapter_id_status_idx"
  ON "practice_attempts"("user_id", "chapter_id", "status");
