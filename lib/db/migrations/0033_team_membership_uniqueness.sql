WITH ranked_memberships AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "user_id", "team_id"
      ORDER BY
        CASE WHEN lower("role") = 'owner' THEN 0 ELSE 1 END ASC,
        "joined_at" ASC,
        "id" ASC
    ) AS "membership_rank"
  FROM "team_members"
)
DELETE FROM "team_members"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_memberships
  WHERE "membership_rank" > 1
);
--> statement-breakpoint

CREATE UNIQUE INDEX "team_members_user_team_idx"
ON "team_members" USING btree ("user_id", "team_id");
--> statement-breakpoint

CREATE INDEX "team_members_team_id_idx"
ON "team_members" USING btree ("team_id");
