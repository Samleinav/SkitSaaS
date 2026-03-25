DROP INDEX "sys_activity_logs_actor_user_id_idx";--> statement-breakpoint
DROP INDEX "sys_activity_logs_entity_idx";--> statement-breakpoint
CREATE INDEX "sys_activity_logs_category_created_at_idx" ON "sys_activity_logs" USING btree ("event_category","created_at");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_actor_created_at_idx" ON "sys_activity_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_request_id_idx" ON "sys_activity_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_entity_created_at_idx" ON "sys_activity_logs" USING btree ("entity_type","entity_id","created_at");
