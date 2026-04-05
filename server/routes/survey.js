const express = require('express');
const router = express.Router();
const { db } = require('../db');

const REQUIRED_FIELDS = ['region', 'department', 'csl_entity', 'license_status'];

router.post('/', async (req, res) => {
  try {
    const body = req.body;

    for (const field of REQUIRED_FIELDS) {
      if (!body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const result = await db.execute({
      sql: `INSERT INTO responses (
        region, department, csl_entity, role_level, license_status,
        ai_readiness, prompt_comfort, ai_output_confidence, daily_ai_use,
        prompt_academy_cohort, tools_used, ai_use_cases,
        agent_experience, agent_knowledge,
        ai_discovery_reasons, ai_motivators, ai_barriers,
        capability_building_interest, preferred_learning_format, ambassador_interest,
        what_makes_champion, share_motivators, ai_success_story, open_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.region,
        body.department,
        body.csl_entity,
        body.role_level || null,
        body.license_status,
        body.ai_readiness || null,
        body.prompt_comfort || null,
        body.ai_output_confidence || null,
        body.daily_ai_use || null,
        body.prompt_academy_cohort || null,
        body.tools_used ? JSON.stringify(body.tools_used) : null,
        body.ai_use_cases ? JSON.stringify(body.ai_use_cases) : null,
        body.agent_experience || null,
        body.agent_knowledge || null,
        body.ai_discovery_reasons ? JSON.stringify(body.ai_discovery_reasons) : null,
        body.ai_motivators ? JSON.stringify(body.ai_motivators) : null,
        body.ai_barriers ? JSON.stringify(body.ai_barriers) : null,
        body.capability_building_interest || null,
        body.preferred_learning_format || null,
        body.ambassador_interest || null,
        body.what_makes_champion || null,
        body.share_motivators || null,
        body.ai_success_story || null,
        body.open_response || null,
      ],
    });

    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('Survey submission error:', err);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

module.exports = router;
