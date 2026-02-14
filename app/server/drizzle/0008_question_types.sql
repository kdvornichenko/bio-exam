ALTER TABLE "questions"
ALTER COLUMN "type" TYPE text USING "type"::text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "question_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ui_template" text NOT NULL,
	"validation_schema" jsonb,
	"scoring_rule" jsonb NOT NULL,
	"is_system" boolean NOT NULL DEFAULT false,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "question_types"
		ADD CONSTRAINT "question_types_created_by_users_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "question_types"
		ADD CONSTRAINT "question_types_updated_by_users_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "question_types_key_uniq" ON "question_types" ("key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_types_is_active_idx" ON "question_types" ("is_active");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "test_question_type_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"question_type_key" text NOT NULL,
	"title_override" text,
	"scoring_rule_override" jsonb,
	"is_disabled" boolean NOT NULL DEFAULT false,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "test_question_type_overrides"
		ADD CONSTRAINT "test_question_type_overrides_test_id_tests_id_fk"
		FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "test_question_type_overrides"
		ADD CONSTRAINT "test_question_type_overrides_created_by_users_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "test_question_type_overrides"
		ADD CONSTRAINT "test_question_type_overrides_updated_by_users_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "test_question_type_overrides_test_type_uniq"
	ON "test_question_type_overrides" ("test_id", "question_type_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_question_type_overrides_test_id_idx"
	ON "test_question_type_overrides" ("test_id");
--> statement-breakpoint

INSERT INTO "question_types" (
	"key",
	"title",
	"description",
	"ui_template",
	"validation_schema",
	"scoring_rule",
	"is_system",
	"is_active"
)
VALUES
	(
		'radio',
		'Один правильный вариант (legacy)',
		'Один ответ из списка вариантов',
		'single_choice',
		NULL,
		'{"formula":"exact_match","mistakeMetric":"boolean_correct","correctPoints":1}'::jsonb,
		true,
		true
	),
	(
		'checkbox',
		'Множественный выбор',
		'Выбор нескольких вариантов ответа',
		'multi_choice',
		NULL,
		'{"formula":"one_mistake_partial","mistakeMetric":"set_distance","correctPoints":2,"oneMistakePoints":1}'::jsonb,
		true,
		true
	),
	(
		'matching',
		'Сопоставление',
		'Сопоставление элементов слева и справа',
		'matching',
		NULL,
		'{"formula":"one_mistake_partial","mistakeMetric":"pair_mismatch_count","correctPoints":2,"oneMistakePoints":1}'::jsonb,
		true,
		true
	),
	(
		'short_answer',
		'Краткий ответ',
		'Короткая строка или число',
		'short_text',
		NULL,
		'{"formula":"exact_match","mistakeMetric":"compact_text_equal","correctPoints":1}'::jsonb,
		true,
		true
	),
	(
		'sequence',
		'Правильная последовательность',
		'Строка из цифр в правильном порядке',
		'sequence_digits',
		NULL,
		'{"formula":"one_mistake_partial","mistakeMetric":"hamming_digits","correctPoints":2,"oneMistakePoints":1}'::jsonb,
		true,
		true
	)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

UPDATE "question_types" AS qt
SET "scoring_rule" = jsonb_strip_nulls(
	jsonb_build_object(
		'formula', (legacy_rule ->> 'formula'),
		'mistakeMetric',
		CASE qt."key"
			WHEN 'radio' THEN 'boolean_correct'
			WHEN 'checkbox' THEN 'set_distance'
			WHEN 'matching' THEN 'pair_mismatch_count'
			WHEN 'short_answer' THEN 'compact_text_equal'
			WHEN 'sequence' THEN 'hamming_digits'
			ELSE 'boolean_correct'
		END,
		'correctPoints', COALESCE((legacy_rule ->> 'correctPoints')::numeric, (qt."scoring_rule" ->> 'correctPoints')::numeric),
		'oneMistakePoints', (legacy_rule ->> 'oneMistakePoints')::numeric
	)
)
FROM (
	SELECT
		qt_inner."key" AS key,
		(COALESCE(tss."rules", '{}'::jsonb) -> qt_inner."key") AS legacy_rule
	FROM "question_types" qt_inner
	LEFT JOIN "test_scoring_settings" tss ON tss."id" = 'global'
) src
WHERE qt."key" = src.key
	AND src.legacy_rule IS NOT NULL;
--> statement-breakpoint

INSERT INTO "test_question_type_overrides" (
	"test_id",
	"question_type_key",
	"scoring_rule_override",
	"created_by",
	"updated_by"
)
SELECT
	t."id" AS test_id,
	kv.key AS question_type_key,
	jsonb_strip_nulls(
		jsonb_build_object(
			'formula', (kv.value ->> 'formula'),
			'mistakeMetric',
			CASE kv.key
				WHEN 'radio' THEN 'boolean_correct'
				WHEN 'checkbox' THEN 'set_distance'
				WHEN 'matching' THEN 'pair_mismatch_count'
				WHEN 'short_answer' THEN 'compact_text_equal'
				WHEN 'sequence' THEN 'hamming_digits'
				ELSE 'boolean_correct'
			END,
			'correctPoints', (kv.value ->> 'correctPoints')::numeric,
			'oneMistakePoints', (kv.value ->> 'oneMistakePoints')::numeric
		)
	) AS scoring_rule_override,
	t."updated_by" AS created_by,
	t."updated_by" AS updated_by
FROM "tests" t
CROSS JOIN LATERAL jsonb_each(COALESCE(t."scoring_rules", '{}'::jsonb)) kv
WHERE t."scoring_rules" IS NOT NULL
ON CONFLICT ("test_id", "question_type_key") DO NOTHING;
