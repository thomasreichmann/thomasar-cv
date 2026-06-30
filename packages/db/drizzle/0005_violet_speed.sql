ALTER TABLE "resume"."resume" ADD COLUMN "base_resume_id" uuid;--> statement-breakpoint
ALTER TABLE "resume"."resume" ADD COLUMN "target" text;--> statement-breakpoint
ALTER TABLE "resume"."resume" ADD CONSTRAINT "resume_base_resume_id_resume_id_fk" FOREIGN KEY ("base_resume_id") REFERENCES "resume"."resume"("id") ON DELETE set null ON UPDATE no action;