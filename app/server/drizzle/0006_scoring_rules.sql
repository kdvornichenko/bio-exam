ALTER TYPE "question_type" ADD VALUE IF NOT EXISTS 'short_answer';
--> statement-breakpoint
ALTER TYPE "question_type" ADD VALUE IF NOT EXISTS 'sequence';
--> statement-breakpoint
ALTER TABLE "tests"
ADD COLUMN IF NOT EXISTS "scoring_rules" jsonb NOT NULL DEFAULT '{"radio":{"formula":"exact_match","correctPoints":1},"checkbox":{"formula":"one_mistake_partial","correctPoints":2,"oneMistakePoints":1},"matching":{"formula":"one_mistake_partial","correctPoints":2,"oneMistakePoints":1},"short_answer":{"formula":"exact_match","correctPoints":1},"sequence":{"formula":"one_mistake_partial","correctPoints":2,"oneMistakePoints":1}}'::jsonb;
--> statement-breakpoint
UPDATE "tests"
SET "scoring_rules" = COALESCE("scoring_rules", '{}'::jsonb)
WHERE "scoring_rules" IS NULL;
