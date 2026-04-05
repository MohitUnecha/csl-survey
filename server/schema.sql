CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_at TEXT DEFAULT (datetime('now')),

  -- Demographics
  region TEXT NOT NULL,
  department TEXT NOT NULL,
  csl_entity TEXT NOT NULL,
  role_level TEXT,
  license_status TEXT NOT NULL,

  -- AI Readiness
  ai_readiness INTEGER CHECK(ai_readiness BETWEEN 1 AND 5),
  prompt_comfort INTEGER CHECK(prompt_comfort BETWEEN 1 AND 5),
  ai_output_confidence INTEGER CHECK(ai_output_confidence BETWEEN 1 AND 5),
  daily_ai_use TEXT,

  -- Training & Tools
  prompt_academy_cohort TEXT,
  tools_used TEXT,
  ai_use_cases TEXT,

  -- Agents
  agent_experience TEXT,
  agent_knowledge TEXT,

  -- Motivators & Barriers
  ai_discovery_reasons TEXT,
  ai_motivators TEXT,
  ai_barriers TEXT,

  -- Capability & Learning
  capability_building_interest TEXT,
  preferred_learning_format TEXT,
  ambassador_interest TEXT,

  -- Champions (qualitative)
  what_makes_champion TEXT,
  share_motivators TEXT,
  ai_success_story TEXT,
  open_response TEXT
);

CREATE INDEX IF NOT EXISTS idx_responses_submitted_at
ON responses(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_responses_region
ON responses(region);

CREATE INDEX IF NOT EXISTS idx_responses_department
ON responses(department);

CREATE INDEX IF NOT EXISTS idx_responses_csl_entity
ON responses(csl_entity);

CREATE INDEX IF NOT EXISTS idx_responses_license_status
ON responses(license_status);
