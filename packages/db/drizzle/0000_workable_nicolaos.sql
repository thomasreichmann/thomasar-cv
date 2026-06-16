CREATE SCHEMA IF NOT EXISTS "resume";
--> statement-breakpoint
CREATE TABLE "resume"."ping" (
	"id" serial PRIMARY KEY NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
