create table if not exists mod_scientist_sessions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  title varchar(240) not null,
  mode varchar(30) not null default 'research_query',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint mod_scientist_sessions_mode_chk
    check (mode in ('research_query', 'document_analysis', 'clinical_case'))
);
--> statement-breakpoint
create index if not exists mod_scientist_sessions_user_idx
  on mod_scientist_sessions (user_id);
--> statement-breakpoint
create index if not exists mod_scientist_sessions_created_idx
  on mod_scientist_sessions (created_at);
--> statement-breakpoint

create table if not exists mod_scientist_runs (
  id serial primary key,
  session_id integer not null references mod_scientist_sessions(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  parent_run_id integer,
  depth integer not null default 0,
  mode varchar(30) not null default 'research_query',
  tier varchar(20) not null default 'standard',
  status varchar(20) not null default 'queued',
  raw_query text not null,
  focus_override text,
  mesh_terms jsonb,
  run_config jsonb,
  last_error text,
  s3_prefix text,
  s3_moved boolean not null default false,
  cost_usd_total numeric(12, 6) not null default 0,
  queued_at timestamp not null default now(),
  started_at timestamp,
  completed_at timestamp,
  partial_at timestamp,
  partial_reason text,
  constraint mod_scientist_runs_depth_chk
    check (depth between 0 and 2),
  constraint mod_scientist_runs_mode_chk
    check (mode in ('research_query', 'document_analysis', 'clinical_case')),
  constraint mod_scientist_runs_tier_chk
    check (tier in ('fast', 'standard', 'deep')),
  constraint mod_scientist_runs_status_chk
    check (status in ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
create index if not exists mod_scientist_runs_session_idx
  on mod_scientist_runs (session_id);
--> statement-breakpoint
create index if not exists mod_scientist_runs_user_idx
  on mod_scientist_runs (user_id);
--> statement-breakpoint
create index if not exists mod_scientist_runs_status_idx
  on mod_scientist_runs (status);
--> statement-breakpoint
create index if not exists mod_scientist_runs_tier_idx
  on mod_scientist_runs (tier);
--> statement-breakpoint
create index if not exists mod_scientist_runs_queued_idx
  on mod_scientist_runs (queued_at);
--> statement-breakpoint

create table if not exists mod_scientist_run_agents (
  id serial primary key,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  agent_number integer not null,
  model_id text not null,
  status varchar(20) not null default 'pending',
  prompt_input text,
  prompt_output text,
  metadata jsonb,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  inference_mode varchar(20) not null default 'realtime',
  bedrock_trace_id text,
  error_message text,
  started_at timestamp,
  completed_at timestamp,
  constraint mod_scientist_run_agents_status_chk
    check (status in ('pending', 'running', 'completed', 'failed')),
  constraint mod_scientist_run_agents_mode_chk
    check (inference_mode in ('realtime', 'batch', 'algorithmic', 'mock')),
  constraint mod_scientist_run_agents_num_chk
    check (agent_number between 1 and 4)
);
--> statement-breakpoint
create index if not exists mod_scientist_run_agents_run_idx
  on mod_scientist_run_agents (run_id);
--> statement-breakpoint
create unique index if not exists mod_scientist_run_agents_run_agent_uidx
  on mod_scientist_run_agents (run_id, agent_number);
--> statement-breakpoint

create table if not exists mod_scientist_run_files (
  id serial primary key,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  file_type varchar(30) not null,
  s3_key text not null,
  size_bytes integer not null default 0,
  content_encoding varchar(20) not null default 'gzip',
  created_at timestamp not null default now(),
  deleted_at timestamp,
  constraint mod_scientist_run_files_type_chk
    check (file_type in ('input', 'output', 'report', 'hypotheses', 'kg_nodes', 'kg_edges', 'document'))
);
--> statement-breakpoint
create index if not exists mod_scientist_run_files_run_idx
  on mod_scientist_run_files (run_id);
--> statement-breakpoint

create table if not exists mod_scientist_kg_nodes (
  id serial primary key,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  mesh_term varchar(240) not null,
  paper_count integer not null default 0,
  created_at timestamp not null default now()
);
--> statement-breakpoint
create index if not exists mod_scientist_kg_nodes_run_idx
  on mod_scientist_kg_nodes (run_id);
--> statement-breakpoint
create unique index if not exists mod_scientist_kg_nodes_run_mesh_uidx
  on mod_scientist_kg_nodes (run_id, mesh_term);
--> statement-breakpoint

create table if not exists mod_scientist_kg_edges (
  id serial primary key,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  source_node_id integer not null references mod_scientist_kg_nodes(id) on delete cascade,
  target_node_id integer not null references mod_scientist_kg_nodes(id) on delete cascade,
  relation_type varchar(30) not null default 'co_occurrence',
  co_occurrence_count integer not null default 0,
  weight numeric(8, 4) not null default 0,
  created_at timestamp not null default now(),
  constraint mod_scientist_kg_edges_relation_chk
    check (relation_type in ('co_occurrence'))
);
--> statement-breakpoint
create index if not exists mod_scientist_kg_edges_run_idx
  on mod_scientist_kg_edges (run_id);
--> statement-breakpoint

create table if not exists mod_scientist_papers (
  pmid varchar(60) primary key,
  title text,
  abstract text,
  authors jsonb,
  journal text,
  pub_year integer,
  mesh_terms jsonb,
  cached_at timestamp not null default now()
);
--> statement-breakpoint
create index if not exists mod_scientist_papers_cached_idx
  on mod_scientist_papers (cached_at);
--> statement-breakpoint

create table if not exists mod_scientist_embeddings (
  id serial primary key,
  pmid varchar(60) not null references mod_scientist_papers(pmid) on delete cascade,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  embedding jsonb,
  chunk_index integer not null default 0,
  model_used text not null,
  created_at timestamp not null default now()
);
--> statement-breakpoint
create index if not exists mod_scientist_embeddings_run_idx
  on mod_scientist_embeddings (run_id);
--> statement-breakpoint

create table if not exists mod_scientist_hypotheses (
  id serial primary key,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  session_id integer not null references mod_scientist_sessions(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  title varchar(240) not null,
  content jsonb not null,
  pmids_cited jsonb,
  evidence_level varchar(8),
  is_saved boolean not null default false,
  created_at timestamp not null default now(),
  constraint mod_scientist_hypotheses_evidence_chk
    check (evidence_level is null or evidence_level in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
create index if not exists mod_scientist_hypotheses_run_idx
  on mod_scientist_hypotheses (run_id);
--> statement-breakpoint

create table if not exists mod_scientist_usage_log (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  session_id integer,
  run_id integer,
  agent_number integer,
  model_id text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  inference_mode varchar(20) not null default 'realtime',
  created_at timestamp not null default now()
);
--> statement-breakpoint
create index if not exists mod_scientist_usage_log_user_idx
  on mod_scientist_usage_log (user_id);
--> statement-breakpoint
create index if not exists mod_scientist_usage_log_created_idx
  on mod_scientist_usage_log (created_at);
--> statement-breakpoint

create table if not exists mod_scientist_storage_log (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  run_id integer,
  s3_key text not null,
  size_bytes integer not null default 0,
  file_type varchar(30),
  created_at timestamp not null default now(),
  deleted_at timestamp
);
--> statement-breakpoint
create index if not exists mod_scientist_storage_log_user_idx
  on mod_scientist_storage_log (user_id);
--> statement-breakpoint
create index if not exists mod_scientist_storage_log_created_idx
  on mod_scientist_storage_log (created_at);
--> statement-breakpoint

create table if not exists mod_scientist_concurrency (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  run_id integer not null references mod_scientist_runs(id) on delete cascade,
  slot_type varchar(20) not null default 'realtime',
  acquired_at timestamp not null default now(),
  released_at timestamp,
  constraint mod_scientist_concurrency_slot_chk
    check (slot_type in ('realtime', 'batch_active'))
);
--> statement-breakpoint
create index if not exists mod_scientist_concurrency_user_idx
  on mod_scientist_concurrency (user_id);
