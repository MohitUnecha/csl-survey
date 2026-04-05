import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FloatingLogo from '../components/FloatingLogo'
import ProgressBar from '../components/ProgressBar'
import {
  REGIONS, DEPARTMENTS, CSL_ENTITIES, ROLE_LEVELS, LICENSE_OPTIONS,
  DAILY_USE_OPTIONS, PROMPT_ACADEMY_OPTIONS, TOOLS_USED, AI_USE_CASES,
  AGENT_EXPERIENCE_OPTIONS, AGENT_KNOWLEDGE_OPTIONS,
  DISCOVERY_REASONS, MOTIVATORS, BARRIERS, CAPABILITY_OPTIONS,
  LEARNING_FORMAT_OPTIONS, AMBASSADOR_OPTIONS, LIKERT_LABELS,
} from '../constants'

function Dropdown({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-csl-dark mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-csl-dark
          focus:ring-2 focus:ring-csl-purple/30 focus:border-csl-purple outline-none transition-all
          appearance-none cursor-pointer hover:border-csl-purple/40"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}

function LikertScale({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-csl-dark mb-3">{label}</label>
      <div className="flex gap-2 sm:gap-4 justify-between">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200
              ${value === n
                ? 'bg-csl-purple text-white shadow-lg shadow-csl-purple/25 scale-105'
                : 'bg-white/80 text-csl-dark border border-gray-200 hover:border-csl-purple/40 hover:bg-csl-light'
              }`}
          >
            <div className="text-lg font-bold">{n}</div>
            <div className="text-[10px] sm:text-xs mt-1 opacity-80">{LIKERT_LABELS[n]}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MultiSelect({ label, options, value, onChange }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div>
      <label className="block text-sm font-semibold text-csl-dark mb-3">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`text-left px-4 py-3 rounded-xl text-sm transition-all duration-200
              ${value.includes(opt)
                ? 'bg-csl-purple/10 text-csl-purple border-2 border-csl-purple/30 font-medium'
                : 'bg-white/80 text-csl-dark border border-gray-200 hover:border-csl-purple/30'
              }`}
          >
            <span className="mr-2">{value.includes(opt) ? '✓' : '○'}</span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-csl-dark mb-2">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-csl-dark
          focus:ring-2 focus:ring-csl-purple/30 focus:border-csl-purple outline-none transition-all
          resize-none placeholder:text-gray-400"
      />
    </div>
  )
}

function Section({ title, subtitle, children, index }) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="glass rounded-2xl p-6 sm:p-8 shadow-lg shadow-csl-purple/5 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-csl-dark">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  )
}

const REQUIRED_FIELD_CONFIG = [
  { key: 'region', label: 'Region' },
  { key: 'department', label: 'Department' },
  { key: 'csl_entity', label: 'CSL Entity' },
  { key: 'license_status', label: 'License status' },
]

export default function SurveyPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ type: 'idle', message: '' });
  const [showSlowSubmitNote, setShowSlowSubmitNote] = useState(false);

  const [form, setForm] = useState({
    region: '',
    department: '',
    csl_entity: '',
    role_level: '',
    license_status: '',
    ai_readiness: null,
    prompt_comfort: null,
    ai_output_confidence: null,
    daily_ai_use: '',
    prompt_academy_cohort: '',
    tools_used: [],
    ai_use_cases: [],
    agent_experience: '',
    agent_knowledge: '',
    ai_discovery_reasons: [],
    ai_motivators: [],
    ai_barriers: [],
    capability_building_interest: '',
    preferred_learning_format: '',
    ambassador_interest: '',
    what_makes_champion: '',
    share_motivators: '',
    ai_success_story: '',
    open_response: '',
  });

  useEffect(() => {
    if (!submitting) {
      setShowSlowSubmitNote(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSlowSubmitNote(true);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [submitting]);

  const set = (field) => (value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setSubmitState((prev) => (prev.type === 'idle' || prev.type === 'submitting'
      ? prev
      : { type: 'idle', message: '' }));
  };

  const SECTIONS = [
    { id: 'about', title: 'About You', subtitle: 'This survey is completely anonymous. No names or emails are collected.' },
    { id: 'readiness', title: 'AI Readiness & Current Usage', subtitle: 'Help us understand where you are on your AI journey.' },
    { id: 'tools', title: 'Tools & Training', subtitle: 'Which AI tools have you explored and what training have you completed?' },
    { id: 'experience', title: 'AI Agents', subtitle: 'AI agents can take actions autonomously. Tell us what you know about them.' },
    { id: 'motivators', title: 'Motivators & Barriers', subtitle: 'What drives or holds back your AI journey?' },
    { id: 'capability', title: 'Capability Building & Learning', subtitle: 'How would you like to grow your AI skills?' },
    { id: 'champion', title: 'AI Champions at CSL', subtitle: 'Help us understand what makes someone an AI champion and how we can create more.' },
  ];

  const filledSections = () => {
    let count = 0;
    if (form.region && form.department && form.csl_entity && form.license_status) count++;
    if (form.ai_readiness && form.daily_ai_use) count++;
    if (form.tools_used.length > 0 || form.prompt_academy_cohort) count++;
    if (form.agent_experience || form.agent_knowledge) count++;
    if (form.ai_discovery_reasons.length > 0 || form.ai_motivators.length > 0) count++;
    if (form.capability_building_interest || form.preferred_learning_format) count++;
    if (form.what_makes_champion || form.share_motivators || form.ai_success_story || form.open_response) count++;
    return count;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const missingFields = REQUIRED_FIELD_CONFIG.filter(({ key }) => !form[key]);

    missingFields.forEach(({ key }) => {
      newErrors[key] = true;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitState({
        type: 'validation',
        message: `Please complete the required fields: ${missingFields.map(field => field.label).join(', ')}.`,
      });

      const firstMissingField = document.querySelector(`[data-field="${missingFields[0].key}"]`);
      if (firstMissingField) {
        firstMissingField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      return;
    }

    setSubmitting(true);
    setSubmitState({
      type: 'submitting',
      message: 'Submitting your anonymous response securely...',
    });

    let timeoutId;

    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (res.ok) {
        setSubmitState({
          type: 'success',
          message: 'Response saved. Taking you to the thank-you page...',
        });
        window.setTimeout(() => navigate('/thankyou'), 700);
      } else {
        let errorMessage = 'Something went wrong while saving your response. Please try again.';
        try {
          const data = await res.json();
          if (data?.error) errorMessage = data.error;
        } catch {
          // Ignore parse errors and keep fallback message.
        }

        setSubmitState({ type: 'error', message: errorMessage });
      }
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'The server is taking longer than expected. Please try again in a moment.'
        : 'Could not connect to the server. Please check your connection and try again.';

      setSubmitState({ type: 'error', message });
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  const submitPanelTone = submitState.type === 'error' || submitState.type === 'validation'
    ? 'border-red-200 bg-red-50/90'
    : submitState.type === 'success'
      ? 'border-emerald-200 bg-emerald-50/90'
      : 'border-red-100 bg-white/90';

  return (
    <div className="min-h-screen relative">
      <FloatingLogo />
      <ProgressBar current={filledSections()} total={SECTIONS.length} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/csl-logo.svg" alt="CSL" className="h-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-csl-dark mb-3">
            AI Upskilling Survey
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Help shape the future of AI at CSL. Your responses are <span className="font-semibold text-csl-purple">completely anonymous</span>.
          </p>
          <p className="text-xs text-gray-400 mt-2">Takes approximately 5-7 minutes to complete</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: About You */}
          <Section title={SECTIONS[0].title} subtitle={SECTIONS[0].subtitle} index={0}>
            <div data-field="region">
              <Dropdown label="Which region are you in?" value={form.region} onChange={set('region')} options={REGIONS} required />
            </div>
            {errors.region && <p className="text-red-500 text-xs -mt-4">Please select your region</p>}
            <div data-field="department">
              <Dropdown label="What department do you work in?" value={form.department} onChange={set('department')} options={DEPARTMENTS} required />
            </div>
            {errors.department && <p className="text-red-500 text-xs -mt-4">Please select your department</p>}
            <div data-field="csl_entity">
              <Dropdown label="Which part of CSL do you belong to?" value={form.csl_entity} onChange={set('csl_entity')} options={CSL_ENTITIES} required />
            </div>
            {errors.csl_entity && <p className="text-red-500 text-xs -mt-4">Please select your CSL entity</p>}
            <Dropdown label="What is your role level?" value={form.role_level} onChange={set('role_level')} options={ROLE_LEVELS} />
            <div data-field="license_status">
              <Dropdown label="Do you have a Microsoft Copilot license?" value={form.license_status} onChange={set('license_status')} options={LICENSE_OPTIONS} required />
            </div>
            {errors.license_status && <p className="text-red-500 text-xs -mt-4">Please select your license status</p>}
          </Section>

          {/* Section 2: AI Readiness */}
          <Section title={SECTIONS[1].title} subtitle={SECTIONS[1].subtitle} index={1}>
            <LikertScale
              label="How would you rate your overall AI readiness?"
              value={form.ai_readiness}
              onChange={set('ai_readiness')}
            />
            <Dropdown
              label="How often do you use AI tools in your daily work?"
              value={form.daily_ai_use}
              onChange={set('daily_ai_use')}
              options={DAILY_USE_OPTIONS}
            />
            <LikertScale
              label="How comfortable are you with creating prompts?"
              value={form.prompt_comfort}
              onChange={set('prompt_comfort')}
            />
            <LikertScale
              label="How confident are you in evaluating AI-generated outputs for accuracy?"
              value={form.ai_output_confidence}
              onChange={set('ai_output_confidence')}
            />
          </Section>

          {/* Section 3: Tools & Training */}
          <Section title={SECTIONS[2].title} subtitle={SECTIONS[2].subtitle} index={2}>
            <Dropdown
              label="Which Prompt Academy session(s) have you attended?"
              value={form.prompt_academy_cohort}
              onChange={set('prompt_academy_cohort')}
              options={PROMPT_ACADEMY_OPTIONS}
            />
            <MultiSelect
              label="Which AI tools have you used? (select all that apply)"
              options={TOOLS_USED}
              value={form.tools_used}
              onChange={set('tools_used')}
            />
            <MultiSelect
              label="How are you using AI in your work? (select all that apply)"
              options={AI_USE_CASES}
              value={form.ai_use_cases}
              onChange={set('ai_use_cases')}
            />
          </Section>

          {/* Section 4: AI Agents */}
          <Section title={SECTIONS[3].title} subtitle={SECTIONS[3].subtitle} index={3}>
            <Dropdown
              label="Do you know what AI agents are?"
              value={form.agent_knowledge}
              onChange={set('agent_knowledge')}
              options={AGENT_KNOWLEDGE_OPTIONS}
            />
            <Dropdown
              label="What is your experience with AI agents?"
              value={form.agent_experience}
              onChange={set('agent_experience')}
              options={AGENT_EXPERIENCE_OPTIONS}
            />
          </Section>

          {/* Section 5: Motivators & Barriers */}
          <Section title={SECTIONS[4].title} subtitle={SECTIONS[4].subtitle} index={4}>
            <MultiSelect
              label="What brought you to AI? (select all that apply)"
              options={DISCOVERY_REASONS}
              value={form.ai_discovery_reasons}
              onChange={set('ai_discovery_reasons')}
            />
            <MultiSelect
              label="What motivates you to learn about AI? (select all that apply)"
              options={MOTIVATORS}
              value={form.ai_motivators}
              onChange={set('ai_motivators')}
            />
            <MultiSelect
              label="What are your biggest barriers to AI adoption? (select all that apply)"
              options={BARRIERS}
              value={form.ai_barriers}
              onChange={set('ai_barriers')}
            />
          </Section>

          {/* Section 6: Capability & Learning */}
          <Section title={SECTIONS[5].title} subtitle={SECTIONS[5].subtitle} index={5}>
            <Dropdown
              label="How interested are you in AI capability building programs?"
              value={form.capability_building_interest}
              onChange={set('capability_building_interest')}
              options={CAPABILITY_OPTIONS}
            />
            <Dropdown
              label="What is your preferred learning format?"
              value={form.preferred_learning_format}
              onChange={set('preferred_learning_format')}
              options={LEARNING_FORMAT_OPTIONS}
            />
            <Dropdown
              label="Would you be interested in becoming an AI Ambassador at CSL?"
              value={form.ambassador_interest}
              onChange={set('ambassador_interest')}
              options={AMBASSADOR_OPTIONS}
            />
          </Section>

          {/* Section 7: AI Champions */}
          <Section title={SECTIONS[6].title} subtitle={SECTIONS[6].subtitle} index={6}>
            <TextArea
              label="In your opinion, what makes someone an AI champion at CSL?"
              value={form.what_makes_champion}
              onChange={set('what_makes_champion')}
              placeholder="E.g., curiosity, willingness to experiment, sharing knowledge with others..."
            />
            <TextArea
              label="How can we help others develop the same motivation for AI?"
              value={form.share_motivators}
              onChange={set('share_motivators')}
              placeholder="Share your ideas on how to inspire more colleagues..."
            />
            <TextArea
              label="Share a quick AI success story (optional)"
              value={form.ai_success_story}
              onChange={set('ai_success_story')}
              placeholder="Tell us about a time AI helped you save time, solve a problem, or improve your work..."
            />
            <TextArea
              label="Any additional thoughts or feedback?"
              value={form.open_response}
              onChange={set('open_response')}
              placeholder="Anything else you'd like to share about your AI journey at CSL..."
            />
          </Section>

          {/* Submit */}
          <div className="mt-10 animate-fade-in">
            <div className={`glass rounded-[28px] border p-5 sm:p-6 shadow-xl shadow-csl-purple/10 ${submitPanelTone}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-csl-purple">Final Step</p>
                  <h3 className="mt-2 text-2xl font-extrabold text-csl-dark">Send your anonymous response</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {submitState.message || 'Review your answers and submit when you are ready.'}
                  </p>
                  {showSlowSubmitNote && submitState.type === 'submitting' && (
                    <p className="mt-2 text-xs font-medium text-csl-purple">
                      The server is waking up and saving your response. Keep this tab open for a few seconds.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-csl-purple via-csl-purple-dark to-csl-purple px-10 py-4 text-lg font-bold text-white shadow-xl shadow-csl-purple/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-csl-purple/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:brightness-110 disabled:saturate-75"
                >
                  {submitting ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending Response...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Survey
                    </>
                  )}
                </button>
              </div>

	              <div className="mt-4 flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
	                <p>Your responses are anonymous and will help improve AI programs at CSL.</p>
	                <p>Required fields: Region, Department, CSL Entity, License status.</p>
	              </div>

	            </div>

	            <div className="mt-4 text-center">
	              <a
	                href="https://www.rutgersconsulting.com/"
	                target="_blank"
	                rel="noreferrer"
	                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 transition-colors hover:text-csl-purple"
	              >
	                <span>Made by Rutgers Consulting Club</span>
	                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
	                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H9m8 0v8" />
	                </svg>
	              </a>
	            </div>
	          </div>
	        </form>
	      </div>
    </div>
  )
}
