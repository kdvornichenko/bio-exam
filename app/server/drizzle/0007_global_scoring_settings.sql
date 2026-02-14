CREATE TABLE IF NOT EXISTS "test_scoring_settings" (
	"id" text PRIMARY KEY NOT NULL DEFAULT 'global',
	"rules" jsonb NOT NULL,
	"updated_at" timestamp NOT NULL DEFAULT now(),
	"updated_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_scoring_settings" ADD CONSTRAINT "test_scoring_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "test_scoring_settings" ("id", "rules")
VALUES (
	'global',
	'{"radio":{"formula":"exact_match","correctPoints":1},"checkbox":{"formula":"one_mistake_partial","correctPoints":2,"oneMistakePoints":1},"matching":{"formula":"one_mistake_partial","correctPoints":2,"oneMistakePoints":1},"short_answer":{"formula":"exact_match","correctPoints":1},"sequence":{"formula":"one_mistake_partial","correctPoints":2,"oneMistakePoints":1}}'::jsonb
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "scoring_rules" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "scoring_rules" DROP DEFAULT;
--> statement-breakpoint
UPDATE "tests" SET "scoring_rules" = NULL;
