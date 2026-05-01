const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAdminAuth } = require('../auth');
const XLSX = require('xlsx');

const MAX_PAGE_SIZE = 100;

router.use(requireAdminAuth);
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

function buildWhereClause(query, alias = '') {
  const conditions = [];
  const args = [];
  const columnPrefix = alias ? `${alias}.` : '';

  if (query.region) { conditions.push(`${columnPrefix}region = ?`); args.push(query.region); }
  if (query.department) { conditions.push(`${columnPrefix}department = ?`); args.push(query.department); }
  if (query.csl_entity) { conditions.push(`${columnPrefix}csl_entity = ?`); args.push(query.csl_entity); }
  if (query.license_status) { conditions.push(`${columnPrefix}license_status = ?`); args.push(query.license_status); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  return { where, args };
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

async function countGroupBy(where, args, column) {
  const result = await db.execute({
    sql: `SELECT ${column}, COUNT(*) as count FROM responses ${where} GROUP BY ${column} ORDER BY count DESC`,
    args,
  });

  return result.rows;
}

async function countJsonArrayValues(where, args, column) {
  const result = await db.execute({
    sql: `
      SELECT json_each.value AS name, COUNT(*) AS count
      FROM responses r, json_each(CASE WHEN r.${column} IS NULL THEN '[]' ELSE r.${column} END)
      ${where}
      GROUP BY json_each.value
      ORDER BY count DESC
    `,
    args,
  });

  return result.rows.map((row) => ({
    name: row.name,
    count: Number(row.count),
  }));
}

router.get('/auth/check', (req, res) => {
  res.json({ authenticated: true });
});

router.get('/responses', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const { where, args } = buildWhereClause(req.query);

    const rowsResult = await db.execute({
      sql: `SELECT * FROM responses ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM responses ${where}`,
      args,
    });

    const total = Number(countResult.rows[0].count);

    const parsed = rowsResult.rows.map(row => ({
      ...row,
      ai_learning_methods: parseJsonArray(row.ai_learning_methods),
      ai_discovery_reasons: parseJsonArray(row.ai_discovery_reasons),
      ai_motivators: parseJsonArray(row.ai_motivators),
      ai_barriers: parseJsonArray(row.ai_barriers),
      tools_used: parseJsonArray(row.tools_used),
      ai_use_cases: parseJsonArray(row.ai_use_cases),
    }));

    res.json({ responses: parsed, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Fetch responses error:', err);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { where, args } = buildWhereClause(req.query);
    const { where: aliasedWhere, args: aliasedArgs } = buildWhereClause(req.query, 'r');

    const countResult = await db.execute({ sql: `SELECT COUNT(*) as count FROM responses ${where}`, args });
    const total = Number(countResult.rows[0].count);

    const readinessWhere = where ? `${where} AND ai_readiness IS NOT NULL` : 'WHERE ai_readiness IS NOT NULL';
    const avgReadinessResult = await db.execute({ sql: `SELECT AVG(ai_readiness) as avg FROM responses ${readinessWhere}`, args });
    const avgReadiness = avgReadinessResult.rows[0].avg;

    const promptWhere = where ? `${where} AND prompt_comfort IS NOT NULL` : 'WHERE prompt_comfort IS NOT NULL';
    const avgPromptResult = await db.execute({ sql: `SELECT AVG(prompt_comfort) as avg FROM responses ${promptWhere}`, args });
    const avgPromptComfort = avgPromptResult.rows[0].avg;

    const confWhere = where ? `${where} AND ai_output_confidence IS NOT NULL` : 'WHERE ai_output_confidence IS NOT NULL';
    const avgConfResult = await db.execute({ sql: `SELECT AVG(ai_output_confidence) as avg FROM responses ${confWhere}`, args });
    const avgOutputConfidence = avgConfResult.rows[0].avg;

    const [
      regionCounts, deptCounts, entityCounts, licenseCounts, dailyUseCounts,
      readinessDist, promptDist, confDist, agentExpCounts, agentKnowCounts,
      capBuildCounts, learningCounts, roleCounts, learningMethodCounts, championCounts,
      motivatorCounts, discoveryCounts, barrierCounts, toolCounts, useCaseCounts,
    ] = await Promise.all([
      countGroupBy(where, args, 'region'),
      countGroupBy(where, args, 'department'),
      countGroupBy(where, args, 'csl_entity'),
      countGroupBy(where, args, 'license_status'),
      countGroupBy(where, args, 'daily_ai_use'),
      countGroupBy(where, args, 'ai_readiness'),
      countGroupBy(where, args, 'prompt_comfort'),
      countGroupBy(where, args, 'ai_output_confidence'),
      countGroupBy(where, args, 'agent_experience'),
      countGroupBy(where, args, 'agent_knowledge'),
      countGroupBy(where, args, 'capability_building_interest'),
      countGroupBy(where, args, 'preferred_learning_format'),
      countGroupBy(where, args, 'role_level'),
      countJsonArrayValues(aliasedWhere, aliasedArgs, 'ai_learning_methods'),
      countGroupBy(where, args, 'champion_interest'),
      countJsonArrayValues(aliasedWhere, aliasedArgs, 'ai_motivators'),
      countJsonArrayValues(aliasedWhere, aliasedArgs, 'ai_discovery_reasons'),
      countJsonArrayValues(aliasedWhere, aliasedArgs, 'ai_barriers'),
      countJsonArrayValues(aliasedWhere, aliasedArgs, 'tools_used'),
      countJsonArrayValues(aliasedWhere, aliasedArgs, 'ai_use_cases'),
    ]);

    res.json({
      total,
      avgReadiness: avgReadiness != null ? Math.round(Number(avgReadiness) * 100) / 100 : null,
      avgPromptComfort: avgPromptComfort != null ? Math.round(Number(avgPromptComfort) * 100) / 100 : null,
      avgOutputConfidence: avgOutputConfidence != null ? Math.round(Number(avgOutputConfidence) * 100) / 100 : null,
      regionCounts, deptCounts, entityCounts, licenseCounts, dailyUseCounts,
      readinessDist, promptDist, confDist,
      agentExpCounts, agentKnowCounts, capBuildCounts, learningCounts,
      roleCounts, learningMethodCounts, championCounts,
      motivatorCounts,
      discoveryCounts,
      barrierCounts,
      toolCounts,
      useCaseCounts,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { where, args } = buildWhereClause(req.query);
    const result = await db.execute({
      sql: `SELECT * FROM responses ${where} ORDER BY submitted_at DESC`,
      args,
    });

    const data = result.rows.map(row => ({
      'ID': row.id,
      'Submitted': row.submitted_at,
      'Region': row.region,
      'Department': row.department,
      'CSL Entity': row.csl_entity,
      'Role Level': row.role_level,
      'License Status': row.license_status,
      'AI Readiness (1-5)': row.ai_readiness,
      'Prompt Comfort (1-5)': row.prompt_comfort,
      'AI Output Confidence (1-5)': row.ai_output_confidence,
      'Daily AI Use': row.daily_ai_use,
      'How Learned About AI': parseJsonArray(row.ai_learning_methods).join(', '),
      'Tools Used': parseJsonArray(row.tools_used).join(', '),
      'AI Use Cases': parseJsonArray(row.ai_use_cases).join(', '),
      'Agent Experience': row.agent_experience,
      'Agent Knowledge': row.agent_knowledge,
      'What Brought You to AI': parseJsonArray(row.ai_discovery_reasons).join(', '),
      'AI Motivators': parseJsonArray(row.ai_motivators).join(', '),
      'AI Barriers': parseJsonArray(row.ai_barriers).join(', '),
      'Capability Building Interest': row.capability_building_interest,
      'Preferred Learning Format': row.preferred_learning_format,
      'AI Champion Interest': row.champion_interest,
      'What Makes an AI Champion': row.what_makes_champion,
      'How to Share Motivators': row.share_motivators,
      'AI Success Story': row.ai_success_story,
      'Additional Thoughts': row.open_response,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Survey Responses');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=csl-ai-survey-responses.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
