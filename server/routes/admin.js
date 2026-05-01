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

const SEED_RESPONSES = [
  { region: 'North America', department: 'R&D', csl_entity: 'CSL Behring', role_level: 'Individual Contributor', license_status: 'Yes, I have a Copilot license', ai_readiness: 4, prompt_comfort: 3, ai_output_confidence: 3, daily_ai_use: 'Frequently (daily)', ai_learning_methods: ['Prompt Academy sessions', 'Hands-on experimentation / self-taught'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Drafting emails and communications', 'Research and information gathering'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Personal curiosity', 'Peer or colleague influence'], ai_motivators: ['Saving time on repetitive tasks', 'Curiosity about new technology'], ai_barriers: ['Privacy or data security concerns'], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Willingness to experiment and share learnings with the team', share_motivators: 'Show concrete time savings with real examples from daily work', ai_success_story: 'Used Copilot to summarize a 40-page clinical report in under 5 minutes — saved hours of prep time.', open_response: '' },
  { region: 'Europe', department: 'Manufacturing', csl_entity: 'CSL Seqirus', role_level: 'Manager', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Team-specific training', 'Self-paced resources (SharePoint, LinkedIn Learning, Workday)'], tools_used: ['Microsoft Copilot', 'ChatGPT', 'Google Gemini'], ai_use_cases: ['Summarizing documents and meetings', 'Creating presentations'], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "No, this is new to me", ai_discovery_reasons: ['Company-wide initiative', 'Manager or team recommendation'], ai_motivators: ['Improving quality of work', 'Leadership encouragement'], ai_barriers: ['Lack of time to learn', 'Too many tools / overwhelming'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Live virtual training sessions', champion_interest: "Maybe, I'd like to learn more about it", what_makes_champion: 'Someone who bridges the gap between technical and non-technical colleagues', share_motivators: 'Lunch & learns with live demos', ai_success_story: '', open_response: 'Would love more manufacturing-specific use cases.' },
  { region: 'Asia Pacific', department: 'Commercial', csl_entity: 'CSL Vifor', role_level: 'Senior Manager / Director', license_status: "No, I do not have a license", ai_readiness: 2, prompt_comfort: 2, ai_output_confidence: 1, daily_ai_use: 'Rarely (a few times a month)', ai_learning_methods: ['External learning (courses, books, podcasts)'], tools_used: ['ChatGPT'], ai_use_cases: ['Brainstorming and ideation', 'Writing and editing content'], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "I've heard the term but don't really know", ai_discovery_reasons: ['Industry trends & news'], ai_motivators: ['Staying relevant in my career', 'Keeping up with industry peers'], ai_barriers: ["Not sure where to start", "Unclear company policies on AI use"], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Role-specific use case demos', champion_interest: "No, but I'd like to learn from one", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Need clearer guidance on what is approved to use at CSL.' },
  { region: 'Latin America', department: 'HR', csl_entity: 'CSL Behring', role_level: 'Individual Contributor', license_status: "I'm not sure", ai_readiness: 2, prompt_comfort: 1, ai_output_confidence: 2, daily_ai_use: 'Never', ai_learning_methods: [], tools_used: ["I don't use any AI tools"], ai_use_cases: [], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "No, this is new to me", ai_discovery_reasons: ['Company-wide initiative'], ai_motivators: ['Saving time on repetitive tasks'], ai_barriers: ['Language barriers in training', 'Not sure where to start', 'Lack of time to learn'], capability_building_interest: "Neutral - I'll participate if required", preferred_learning_format: 'Short video tutorials', champion_interest: 'Not interested at this time', what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Training materials in Spanish would help a lot.' },
  { region: 'Europe', department: 'IT', csl_entity: 'CSL Behring', role_level: 'Senior Leader / VP', license_status: 'Yes, I have a Copilot license', ai_readiness: 5, prompt_comfort: 5, ai_output_confidence: 4, daily_ai_use: 'Always (multiple times a day)', ai_learning_methods: ['Prompt Academy sessions', 'External learning (courses, books, podcasts)', 'Hands-on experimentation / self-taught', 'Peer learning from colleagues'], tools_used: ['Microsoft Copilot', 'ChatGPT', 'Claude (Anthropic)', 'Perplexity'], ai_use_cases: ['Code or formula generation', 'Process automation', 'Data analysis and reporting', 'Brainstorming and ideation'], agent_experience: 'Yes, I use AI agents regularly', agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Personal curiosity', 'Industry trends & news', 'Social media / online content'], ai_motivators: ['Curiosity about new technology', 'Solving complex problems faster', 'Creating capacity for higher-value work'], ai_barriers: [], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Deep curiosity, ability to translate AI capabilities into business value, and a genuine desire to upskill others', share_motivators: 'Pair champions with skeptics — one good demo is worth ten slide decks', ai_success_story: 'Built an AI agent that auto-drafts IT incident reports from our monitoring alerts. Saves 2 hours per on-call shift.', open_response: '' },
  { region: 'North America', department: 'Finance', csl_entity: 'CSL Seqirus', role_level: 'Manager', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 3, ai_output_confidence: 3, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Prompt Academy sessions', 'Self-paced resources (SharePoint, LinkedIn Learning, Workday)'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Data analysis and reporting', 'Summarizing documents and meetings', 'Creating presentations'], agent_experience: "Yes, I've tried them a few times", agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['CSL Prompt Academy training', 'Saw a colleague save time with AI'], ai_motivators: ['Saving time on repetitive tasks', 'Improving quality of work'], ai_barriers: ['Concerned about accuracy of AI outputs'], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Role-specific use case demos', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Proactively shares what works and what does not — both matter', share_motivators: 'Monthly AI wins sessions where teams share time saved', ai_success_story: 'Used Copilot in Excel to model three budget scenarios simultaneously — cut quarterly close prep from 2 days to half a day.', open_response: '' },
  { region: 'Middle East & Africa', department: 'Medical Affairs', csl_entity: 'CSL Vifor', role_level: 'Individual Contributor', license_status: "No, I do not have a license", ai_readiness: 2, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Rarely (a few times a month)', ai_learning_methods: ['External learning (courses, books, podcasts)'], tools_used: ['ChatGPT'], ai_use_cases: ['Research and information gathering', 'Writing and editing content'], agent_experience: 'No, but I know what they are', agent_knowledge: "I've heard the term but don't really know", ai_discovery_reasons: ['Personal curiosity', 'Industry trends & news'], ai_motivators: ['Research and innovation', 'Staying relevant in my career'], ai_barriers: ['Limited access to AI tools / no license', 'Privacy or data security concerns', "Don't trust AI with sensitive work"], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Written guides & documentation', champion_interest: "No, but I'd like to learn from one", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Access to approved tools is the main blocker for our region.' },
  { region: 'Europe', department: 'Quality', csl_entity: 'CSL Behring', role_level: 'Team Lead', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 3, ai_output_confidence: 2, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Team-specific training', 'Prompt Academy sessions'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Drafting emails and communications', 'Summarizing documents and meetings', 'Writing and editing content'], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "I've heard the term but don't really know", ai_discovery_reasons: ['Manager or team recommendation', 'Company-wide initiative'], ai_motivators: ['Improving quality of work', 'Collaborating better with my team'], ai_barriers: ['Concerned about accuracy of AI outputs', 'Unclear company policies on AI use'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'In-person workshops', champion_interest: "Maybe, I'd like to learn more about it", what_makes_champion: 'Patience and willingness to coach colleagues who are hesitant', share_motivators: 'More structured team-level AI goals', ai_success_story: '', open_response: '' },
  { region: 'Asia Pacific', department: 'Supply Chain', csl_entity: 'CSL Seqirus', role_level: 'Individual Contributor', license_status: "No, I do not have a license", ai_readiness: 1, prompt_comfort: 1, ai_output_confidence: 1, daily_ai_use: 'Never', ai_learning_methods: [], tools_used: ["I don't use any AI tools"], ai_use_cases: [], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "No, this is new to me", ai_discovery_reasons: ['Company-wide initiative'], ai_motivators: ['Saving time on repetitive tasks'], ai_barriers: ['Not sure where to start', 'Lack of time to learn'], capability_building_interest: "Neutral - I'll participate if required", preferred_learning_format: 'Short video tutorials', champion_interest: 'Not interested at this time', what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: '' },
  { region: 'North America', department: 'Regulatory Affairs', csl_entity: 'CSL Behring', role_level: 'Senior Manager / Director', license_status: 'Yes, I have a Copilot license', ai_readiness: 4, prompt_comfort: 3, ai_output_confidence: 3, daily_ai_use: 'Frequently (daily)', ai_learning_methods: ['Prompt Academy sessions', 'Peer learning from colleagues'], tools_used: ['Microsoft Copilot', 'Claude (Anthropic)', 'ChatGPT'], ai_use_cases: ['Summarizing documents and meetings', 'Research and information gathering', 'Writing and editing content'], agent_experience: "Yes, I've tried them a few times", agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Peer or colleague influence', 'CSL Prompt Academy training'], ai_motivators: ['Saving time on repetitive tasks', 'Solving complex problems faster', 'Improving quality of work'], ai_barriers: ["Don't trust AI with sensitive work"], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Role-specific use case demos', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Someone who has validated AI outputs rigorously and can show others where to trust it and where to verify', share_motivators: 'Use case library specific to regulatory submissions', ai_success_story: 'Summarized 200 pages of agency feedback in 20 minutes — allowed the team to start gap analysis the same day.', open_response: '' },
  { region: 'Europe', department: 'Commercial', csl_entity: 'CSL Vifor', role_level: 'Individual Contributor', license_status: "I'm not sure", ai_readiness: 3, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Rarely (a few times a month)', ai_learning_methods: ['Self-paced resources (SharePoint, LinkedIn Learning, Workday)'], tools_used: ['ChatGPT', 'Google Gemini'], ai_use_cases: ['Drafting emails and communications', 'Brainstorming and ideation'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Personal curiosity', 'Social media / online content'], ai_motivators: ['Staying relevant in my career', 'Curiosity about new technology'], ai_barriers: ['Lack of time to learn', 'Too many tools / overwhelming'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Lunch & learn sessions', champion_interest: "No, but I'd like to learn from one", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: '' },
  { region: 'North America', department: 'Operations', csl_entity: 'CSL Behring', role_level: 'Manager', license_status: 'Yes, I have a Copilot license', ai_readiness: 4, prompt_comfort: 4, ai_output_confidence: 3, daily_ai_use: 'Frequently (daily)', ai_learning_methods: ['Prompt Academy sessions', 'Team-specific training', 'Hands-on experimentation / self-taught'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Data analysis and reporting', 'Process automation', 'Summarizing documents and meetings'], agent_experience: 'Yes, I use AI agents regularly', agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Saw a colleague save time with AI', 'CSL Prompt Academy training'], ai_motivators: ['Saving time on repetitive tasks', 'Creating capacity for higher-value work', 'Being part of innovation at CSL'], ai_barriers: [], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Operational mindset — always asking where the bottleneck is and whether AI can remove it', share_motivators: 'Embedded champions within each ops team, not just a central group', ai_success_story: 'Automated weekly shift handover reports using Copilot. The team stopped dreading Friday afternoons.', open_response: '' },
  { region: 'Asia Pacific', department: 'R&D', csl_entity: 'CSL Seqirus', role_level: 'Individual Contributor', license_status: "No, I do not have a license", ai_readiness: 3, prompt_comfort: 3, ai_output_confidence: 3, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['External learning (courses, books, podcasts)', 'Hands-on experimentation / self-taught'], tools_used: ['ChatGPT', 'Perplexity', 'Claude (Anthropic)'], ai_use_cases: ['Research and information gathering', 'Brainstorming and ideation', 'Writing and editing content'], agent_experience: "Yes, I've tried them a few times", agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Personal curiosity', 'Industry trends & news'], ai_motivators: ['Curiosity about new technology', 'Solving complex problems faster'], ai_barriers: ['Limited access to AI tools / no license'], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Maybe, I'd like to learn more about it", what_makes_champion: 'Genuine scientific curiosity applied to AI — treating it like any other experimental tool', share_motivators: 'Journal club style sessions for AI papers and new capabilities', ai_success_story: 'Used Claude to synthesize literature across 50 papers for a project background section in a fraction of the usual time.', open_response: '' },
  { region: 'Europe', department: 'Legal', csl_entity: 'CSL Behring', role_level: 'Senior Manager / Director', license_status: 'Yes, I have a Copilot license', ai_readiness: 2, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Rarely (a few times a month)', ai_learning_methods: ['Team-specific training'], tools_used: ['Microsoft Copilot'], ai_use_cases: ['Summarizing documents and meetings', 'Drafting emails and communications'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Company-wide initiative'], ai_motivators: ['Saving time on repetitive tasks'], ai_barriers: ["Don't trust AI with sensitive work", 'Privacy or data security concerns', 'Concerned about accuracy of AI outputs'], capability_building_interest: "Neutral - I'll participate if required", preferred_learning_format: 'Written guides & documentation', champion_interest: 'Not interested at this time', what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Legal needs specific guardrails before broader adoption is appropriate.' },
  { region: 'Latin America', department: 'Commercial', csl_entity: 'CSL Vifor', role_level: 'Team Lead', license_status: "No, I do not have a license", ai_readiness: 3, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Self-paced resources (SharePoint, LinkedIn Learning, Workday)', 'External learning (courses, books, podcasts)'], tools_used: ['ChatGPT'], ai_use_cases: ['Drafting emails and communications', 'Translation and localization', 'Creating presentations'], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "I've heard the term but don't really know", ai_discovery_reasons: ['Personal curiosity', 'Social media / online content'], ai_motivators: ['Staying relevant in my career', 'Improving quality of work'], ai_barriers: ['Language barriers in training', 'Limited access to AI tools / no license'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Short video tutorials', champion_interest: "Maybe, I'd like to learn more about it", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Training needs to be available in Spanish and Portuguese.' },
  { region: 'North America', department: 'Engineering', csl_entity: 'CSL Behring', role_level: 'Individual Contributor', license_status: 'Yes, I have a Copilot license', ai_readiness: 5, prompt_comfort: 5, ai_output_confidence: 4, daily_ai_use: 'Always (multiple times a day)', ai_learning_methods: ['Hands-on experimentation / self-taught', 'External learning (courses, books, podcasts)', 'Peer learning from colleagues'], tools_used: ['Microsoft Copilot', 'Claude (Anthropic)', 'ChatGPT', 'GitHub Copilot'], ai_use_cases: ['Code or formula generation', 'Process automation', 'Data analysis and reporting', 'Research and information gathering'], agent_experience: 'Yes, I use AI agents regularly', agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Personal curiosity', 'Industry trends & news', 'Social media / online content'], ai_motivators: ['Curiosity about new technology', 'Creating capacity for higher-value work', 'Solving complex problems faster'], ai_barriers: [], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Builds things, not just talks about AI — and helps teammates get unstuck', share_motivators: 'Internal hackathons with real CSL problems as the prompt', ai_success_story: 'Used an AI agent to monitor batch manufacturing logs and surface anomalies before they escalated. Zero false negatives in 3 months.', open_response: '' },
  { region: 'Middle East & Africa', department: 'Finance', csl_entity: 'CSL Seqirus', role_level: 'Manager', license_status: "I'm not sure", ai_readiness: 2, prompt_comfort: 1, ai_output_confidence: 1, daily_ai_use: 'Never', ai_learning_methods: [], tools_used: ["I don't use any AI tools"], ai_use_cases: [], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "No, this is new to me", ai_discovery_reasons: ['Company-wide initiative'], ai_motivators: ['Saving time on repetitive tasks'], ai_barriers: ['Not sure where to start', 'Lack of time to learn', 'Unclear company policies on AI use'], capability_building_interest: "Neutral - I'll participate if required", preferred_learning_format: 'In-person workshops', champion_interest: 'Not interested at this time', what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: '' },
  { region: 'Europe', department: 'HR', csl_entity: 'CSL Vifor', role_level: 'Senior Manager / Director', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 3, ai_output_confidence: 3, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Prompt Academy sessions', 'Team-specific training'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Drafting emails and communications', 'Summarizing documents and meetings', 'Writing and editing content'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Manager or team recommendation', 'Company-wide initiative'], ai_motivators: ['Improving quality of work', 'Collaborating better with my team', 'Leadership encouragement'], ai_barriers: ['Concerned about accuracy of AI outputs'], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Peer learning / ambassador programs', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Creates psychological safety for people to admit they do not know and learn without fear', share_motivators: 'Recognize and celebrate early adopters publicly', ai_success_story: 'Drafted a company-wide AI policy framework using Copilot — saved two weeks of document drafting.', open_response: '' },
  { region: 'Asia Pacific', department: 'IT', csl_entity: 'CSL Behring', role_level: 'Team Lead', license_status: 'Yes, I have a Copilot license', ai_readiness: 4, prompt_comfort: 4, ai_output_confidence: 4, daily_ai_use: 'Frequently (daily)', ai_learning_methods: ['Prompt Academy sessions', 'Self-paced resources (SharePoint, LinkedIn Learning, Workday)', 'Peer learning from colleagues'], tools_used: ['Microsoft Copilot', 'ChatGPT', 'Claude (Anthropic)'], ai_use_cases: ['Code or formula generation', 'Process automation', 'Summarizing documents and meetings', 'Data analysis and reporting'], agent_experience: 'Yes, I use AI agents regularly', agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Personal curiosity', 'Industry trends & news', 'Peer or colleague influence'], ai_motivators: ['Solving complex problems faster', 'Creating capacity for higher-value work', 'Being part of innovation at CSL'], ai_barriers: [], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Technical credibility combined with communication skills — the translator between AI capabilities and business needs', share_motivators: 'Structured mentoring pairs between AI-confident and AI-curious employees', ai_success_story: 'Deployed an AI assistant that answers common IT helpdesk queries. First-contact resolution improved by 35%.', open_response: '' },
  { region: 'North America', department: 'Medical Affairs', csl_entity: 'CSL Seqirus', role_level: 'Individual Contributor', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 3, ai_output_confidence: 2, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Prompt Academy sessions'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Research and information gathering', 'Summarizing documents and meetings', 'Writing and editing content'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['CSL Prompt Academy training'], ai_motivators: ['Saving time on repetitive tasks', 'Improving quality of work'], ai_barriers: ["Don't trust AI with sensitive work", 'Concerned about accuracy of AI outputs'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Role-specific use case demos', champion_interest: "No, but I'd like to learn from one", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Would be helpful to know what types of medical content are safe to run through AI tools.' },
  { region: 'Europe', department: 'R&D', csl_entity: 'CSL Behring', role_level: 'Manager', license_status: 'Yes, I have a Copilot license', ai_readiness: 4, prompt_comfort: 4, ai_output_confidence: 3, daily_ai_use: 'Frequently (daily)', ai_learning_methods: ['Prompt Academy sessions', 'External learning (courses, books, podcasts)', 'Hands-on experimentation / self-taught'], tools_used: ['Microsoft Copilot', 'Claude (Anthropic)', 'ChatGPT', 'Perplexity'], ai_use_cases: ['Research and information gathering', 'Data analysis and reporting', 'Brainstorming and ideation', 'Writing and editing content'], agent_experience: "Yes, I've tried them a few times", agent_knowledge: 'Yes, I can explain what they do', ai_discovery_reasons: ['Personal curiosity', 'Peer or colleague influence', 'Industry trends & news'], ai_motivators: ['Solving complex problems faster', 'Curiosity about new technology', 'Improving quality of work'], ai_barriers: ['Privacy or data security concerns'], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Hands-on labs / sandbox environments', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Combines scientific rigour with practical curiosity — validates AI outputs rather than accepting them blindly', share_motivators: 'Role-specific use case library and an internal community of practice', ai_success_story: 'Used AI to assist with identifying patterns in assay data that led to a faster development iteration cycle.', open_response: '' },
  { region: 'Latin America', department: 'Operations', csl_entity: 'CSL Seqirus', role_level: 'Individual Contributor', license_status: "No, I do not have a license", ai_readiness: 1, prompt_comfort: 1, ai_output_confidence: 1, daily_ai_use: 'Never', ai_learning_methods: [], tools_used: ["I don't use any AI tools"], ai_use_cases: [], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "No, this is new to me", ai_discovery_reasons: [], ai_motivators: ['Saving time on repetitive tasks'], ai_barriers: ['Not sure where to start', 'Tools don\'t seem relevant to my role', 'Limited access to AI tools / no license'], capability_building_interest: 'Not very interested right now', preferred_learning_format: 'In-person workshops', champion_interest: 'Not interested at this time', what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: '' },
  { region: 'Middle East & Africa', department: 'Commercial', csl_entity: 'CSL Behring', role_level: 'Senior Leader / VP', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Rarely (a few times a month)', ai_learning_methods: ['Team-specific training'], tools_used: ['Microsoft Copilot'], ai_use_cases: ['Summarizing documents and meetings', 'Drafting emails and communications'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Company-wide initiative', 'Manager or team recommendation'], ai_motivators: ['Leadership encouragement', 'Being part of innovation at CSL'], ai_barriers: ['Lack of time to learn'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Live virtual training sessions', champion_interest: "Maybe, I'd like to learn more about it", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Would value an executive-level briefing on where AI is heading.' },
  { region: 'Asia Pacific', department: 'Quality', csl_entity: 'CSL Vifor', role_level: 'Individual Contributor', license_status: "No, I do not have a license", ai_readiness: 2, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Rarely (a few times a month)', ai_learning_methods: ['External learning (courses, books, podcasts)'], tools_used: ['ChatGPT'], ai_use_cases: ['Research and information gathering', 'Writing and editing content'], agent_experience: 'No, but I know what they are', agent_knowledge: "I've heard the term but don't really know", ai_discovery_reasons: ['Personal curiosity'], ai_motivators: ['Staying relevant in my career'], ai_barriers: ['Limited access to AI tools / no license', 'Privacy or data security concerns'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Self-paced online courses (Digital Compass)', champion_interest: "No, but I'd like to learn from one", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: '' },
  { region: 'North America', department: 'Corporate Affairs', csl_entity: 'CSL Behring', role_level: 'Manager', license_status: 'Yes, I have a Copilot license', ai_readiness: 4, prompt_comfort: 4, ai_output_confidence: 3, daily_ai_use: 'Frequently (daily)', ai_learning_methods: ['Prompt Academy sessions', 'Peer learning from colleagues'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Writing and editing content', 'Drafting emails and communications', 'Creating presentations', 'Brainstorming and ideation'], agent_experience: "Yes, I've tried them a few times", agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Saw a colleague save time with AI', 'CSL Prompt Academy training'], ai_motivators: ['Improving quality of work', 'Saving time on repetitive tasks', 'Being part of innovation at CSL'], ai_barriers: [], capability_building_interest: 'Very interested - I want to build AI into my daily work', preferred_learning_format: 'Peer learning / ambassador programs', champion_interest: "Yes, I'd love to be an AI champion", what_makes_champion: 'Storytelling ability — makes AI tangible and non-threatening to colleagues who are hesitant', share_motivators: 'Internal newsletter featuring real employee AI stories every month', ai_success_story: 'Produced a stakeholder briefing document in half the time using Copilot to structure and draft sections from my raw notes.', open_response: '' },
  { region: 'Europe', department: 'Supply Chain', csl_entity: 'CSL Seqirus', role_level: 'Team Lead', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 2, ai_output_confidence: 2, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Team-specific training', 'Self-paced resources (SharePoint, LinkedIn Learning, Workday)'], tools_used: ['Microsoft Copilot'], ai_use_cases: ['Data analysis and reporting', 'Summarizing documents and meetings'], agent_experience: "No, I'm not sure what AI agents are", agent_knowledge: "I've heard the term but don't really know", ai_discovery_reasons: ['Company-wide initiative'], ai_motivators: ['Saving time on repetitive tasks', 'Improving quality of work'], ai_barriers: ['Lack of time to learn', 'Too many tools / overwhelming', 'Not sure where to start'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Short video tutorials', champion_interest: "No, but I'd like to learn from one", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: '' },
  { region: 'North America', department: 'R&D', csl_entity: 'CSL Vifor', role_level: 'Executive', license_status: 'Yes, I have a Copilot license', ai_readiness: 3, prompt_comfort: 2, ai_output_confidence: 3, daily_ai_use: 'Occasionally (a few times a week)', ai_learning_methods: ['Team-specific training'], tools_used: ['Microsoft Copilot', 'ChatGPT'], ai_use_cases: ['Summarizing documents and meetings', 'Brainstorming and ideation'], agent_experience: 'No, but I know what they are', agent_knowledge: 'I have a general idea', ai_discovery_reasons: ['Company-wide initiative', 'Industry trends & news'], ai_motivators: ['Being part of innovation at CSL', 'Solving complex problems faster'], ai_barriers: ['Lack of time to learn'], capability_building_interest: "Somewhat interested - I'd like to learn more", preferred_learning_format: 'Live virtual training sessions', champion_interest: "Maybe, I'd like to learn more about it", what_makes_champion: '', share_motivators: '', ai_success_story: '', open_response: 'Prioritising AI adoption at the leadership level needs clearer business case framing.' },
];

router.post('/seed', async (req, res) => {
  try {
    for (const r of SEED_RESPONSES) {
      await db.execute({
        sql: `INSERT INTO responses (
          region, department, csl_entity, role_level, license_status,
          ai_readiness, prompt_comfort, ai_output_confidence, daily_ai_use,
          ai_learning_methods, tools_used, ai_use_cases,
          agent_experience, agent_knowledge,
          ai_discovery_reasons, ai_motivators, ai_barriers,
          capability_building_interest, preferred_learning_format, champion_interest,
          what_makes_champion, share_motivators, ai_success_story, open_response
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          r.region, r.department, r.csl_entity, r.role_level, r.license_status,
          r.ai_readiness, r.prompt_comfort, r.ai_output_confidence, r.daily_ai_use,
          JSON.stringify(r.ai_learning_methods), JSON.stringify(r.tools_used), JSON.stringify(r.ai_use_cases),
          r.agent_experience, r.agent_knowledge,
          JSON.stringify(r.ai_discovery_reasons), JSON.stringify(r.ai_motivators), JSON.stringify(r.ai_barriers),
          r.capability_building_interest, r.preferred_learning_format, r.champion_interest,
          r.what_makes_champion || null, r.share_motivators || null, r.ai_success_story || null, r.open_response || null,
        ],
      });
    }
    res.json({ inserted: SEED_RESPONSES.length });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Seed failed' });
  }
});

module.exports = router;
