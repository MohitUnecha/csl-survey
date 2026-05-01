import { Fragment, useCallback, useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { REGIONS, DEPARTMENTS, CSL_ENTITIES } from '../constants'

const STORAGE_KEY = 'csl-admin-basic-auth'
const COLORS = ['#C8102E', '#E23D44', '#8E1224', '#F97316', '#475569', '#0F172A', '#DC2626', '#FB7185', '#B91C1C', '#F59E0B', '#7F1D1D', '#991B1B']

function getStoredAuth() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(STORAGE_KEY) || ''
}

function buildAuthHeaders(encodedAuth) {
  return encodedAuth ? { Authorization: `Basic ${encodedAuth}` } : {}
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_45px_-30px_rgba(127,29,29,0.45)] ${accent ? 'ring-2 ring-csl-purple/15' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-csl-dark">{value ?? '—'}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(127,29,29,0.45)] ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-csl-dark">{title}</h3>
      {children}
    </div>
  )
}

function SimpleBar({ data, dataKey = 'count', nameKey = 'name', color = '#C8102E', layout = 'vertical' }) {
  if (!data || data.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No data yet</p>

  if (layout === 'vertical') {
    return (
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey={nameKey} width={190} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ fill: 'rgba(200, 16, 46, 0.06)' }} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ bottom: 40 }}>
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
        <YAxis allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(200, 16, 46, 0.06)' }} />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function SimplePie({ data }) {
  if (!data || data.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
          fontSize={11}
        >
          {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="mb-6 flex gap-1 rounded-2xl border border-white/70 bg-white/75 p-1 shadow-[0_20px_45px_-30px_rgba(127,29,29,0.45)]">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            active === tab ? 'bg-csl-purple text-white shadow-lg shadow-csl-purple/20' : 'text-gray-500 hover:text-csl-dark'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function LoginPanel({ credentials, onChange, onSubmit, busy, error }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.16),_transparent_35%),linear-gradient(135deg,#fff7f7_0%,#ffffff_52%,#fef2f2_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-red-100 bg-gradient-to-br from-[#5a0c16] via-[#82111f] to-[#c8102e] p-8 text-white shadow-[0_30px_80px_-35px_rgba(127,29,29,0.75)] sm:p-10">
            <div className="inline-flex rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
              <img src="/csl-logo.svg" alt="CSL" className="h-10" />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.28em] text-red-100/80">Protected Analytics</p>
            <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl">
              CSL AI Survey Admin
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-red-50/90">
              Secure access is required before anyone can view responses, exports, or internal adoption insights.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Responses', value: 'Locked' },
                { label: 'Exports', value: 'Protected' },
                { label: 'Charts', value: 'Private' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-100/70">{item.label}</p>
                  <p className="mt-2 text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/92 p-8 shadow-[0_30px_80px_-35px_rgba(127,29,29,0.55)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-csl-purple">Administrator Login</p>
            <h2 className="mt-3 text-3xl font-extrabold text-csl-dark">Sign in to continue</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Use the admin username and password you chose for this dashboard. Credentials are checked by the server and kept only for the current browser session.
            </p>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-csl-dark">Username</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={credentials.username}
                  onChange={(event) => onChange('username', event.target.value)}
                  className="w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-csl-dark outline-none transition-all focus:border-csl-purple focus:ring-4 focus:ring-csl-purple/10"
                  placeholder="Enter admin username"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-csl-dark">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={(event) => onChange('password', event.target.value)}
                  className="w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-csl-dark outline-none transition-all focus:border-csl-purple focus:ring-4 focus:ring-csl-purple/10"
                  placeholder="Enter admin password"
                  required
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-csl-purple via-csl-purple-dark to-csl-purple px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-csl-purple/20 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:brightness-110 disabled:saturate-75"
              >
                {busy ? 'Signing in...' : 'Unlock Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authenticating, setAuthenticating] = useState(false)

  const [stats, setStats] = useState(null)
  const [responses, setResponses] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(Boolean(getStoredAuth()))
  const [expandedRow, setExpandedRow] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [exporting, setExporting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const [clearing, setClearing] = useState(false)

  const [filters, setFilters] = useState({ region: '', department: '', csl_entity: '' })

  const clearAuth = useCallback((message = '') => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }

    setAuth('')
    setLoading(false)
    setStats(null)
    setResponses([])
    setTotal(0)
    setPages(1)
    setAuthError(message)
  }, [])

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...buildAuthHeaders(auth),
      },
    })

    if (response.status === 401) {
      clearAuth('Your admin session expired or the credentials were rejected. Sign in again.')
      throw new Error('unauthorized')
    }

    return response
  }, [auth, clearAuth])

  const buildQuery = useCallback((extra = {}) => {
    const params = new URLSearchParams()

    if (filters.region) params.set('region', filters.region)
    if (filters.department) params.set('department', filters.department)
    if (filters.csl_entity) params.set('csl_entity', filters.csl_entity)

    Object.entries(extra).forEach(([key, value]) => params.set(key, value))
    return params.toString()
  }, [filters])

  const fetchData = useCallback(async () => {
    if (!auth) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [statsRes, respRes] = await Promise.all([
        fetchWithAuth(`/api/admin/stats?${buildQuery()}`),
        fetchWithAuth(`/api/admin/responses?${buildQuery({ page, limit: 20 })}`),
      ])

      if (!statsRes.ok || !respRes.ok) {
        throw new Error('Failed to fetch admin data')
      }

      const statsData = await statsRes.json()
      const respData = await respRes.json()

      setStats(statsData)
      setResponses(respData.responses)
      setTotal(respData.total)
      setPages(respData.pages)
    } catch (error) {
      if (error.message !== 'unauthorized') {
        console.error('Failed to fetch admin data:', error)
      }
    } finally {
      setLoading(false)
    }
  }, [auth, buildQuery, fetchWithAuth, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthenticating(true)
    setAuthError('')

    try {
      const encoded = window.btoa(`${credentials.username}:${credentials.password}`)
      const response = await fetch('/api/admin/auth/check', {
        headers: buildAuthHeaders(encoded),
      })

      if (!response.ok) {
        throw new Error('invalid_credentials')
      }

      window.sessionStorage.setItem(STORAGE_KEY, encoded)
      setAuth(encoded)
      setPage(1)
      setExpandedRow(null)
      setCredentials({ username: '', password: '' })
    } catch (error) {
      setAuthError(error.message === 'invalid_credentials' ? 'Invalid username or password.' : 'Could not reach the admin service.')
    } finally {
      setAuthenticating(false)
    }
  }

  const handleClear = async () => {
    if (!window.confirm(`Delete ALL ${stats?.total || 0} responses? This cannot be undone.`)) return
    if (!window.confirm('Are you absolutely sure? Every response will be permanently erased.')) return
    setClearing(true)
    setSeedMsg('')
    try {
      const res = await fetchWithAuth('/api/admin/responses', { method: 'DELETE' })
      const data = await res.json()
      setSeedMsg(`✓ Deleted ${data.deleted} responses`)
      await fetchData()
    } catch {
      setSeedMsg('Clear failed — check console')
    } finally {
      setClearing(false)
    }
  }

  const handleSeed = async () => {
    if (!window.confirm('Insert 28 demo responses into the database?')) return
    setSeeding(true)
    setSeedMsg('')
    try {
      const res = await fetchWithAuth('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      setSeedMsg(`✓ Inserted ${data.inserted} demo responses`)
      await fetchData()
    } catch {
      setSeedMsg('Seed failed — check console')
    } finally {
      setSeeding(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const response = await fetchWithAuth(`/api/admin/export?${buildQuery()}`)

      if (!response.ok) {
        throw new Error('export_failed')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = downloadUrl
      link.download = 'csl-ai-survey-responses.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      if (error.message !== 'unauthorized') {
        console.error('Failed to export admin data:', error)
      }
    } finally {
      setExporting(false)
    }
  }

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ region: '', department: '', csl_entity: '' })
    setPage(1)
  }

  const readinessData = stats?.readinessDist?.filter((entry) => entry.ai_readiness != null).map((entry) => ({ name: `${entry.ai_readiness}/5`, count: Number(entry.count) })) || []
  const promptData = stats?.promptDist?.filter((entry) => entry.prompt_comfort != null).map((entry) => ({ name: `${entry.prompt_comfort}/5`, count: Number(entry.count) })) || []
  const confData = stats?.confDist?.filter((entry) => entry.ai_output_confidence != null).map((entry) => ({ name: `${entry.ai_output_confidence}/5`, count: Number(entry.count) })) || []
  const entityData = stats?.entityCounts?.map((entry) => ({ name: entry.csl_entity, count: Number(entry.count) })) || []
  const regionData = stats?.regionCounts?.map((entry) => ({ name: entry.region, count: Number(entry.count) })) || []
  const deptData = stats?.deptCounts?.map((entry) => ({ name: entry.department, count: Number(entry.count) })) || []
  const dailyUseData = stats?.dailyUseCounts?.filter((entry) => entry.daily_ai_use).map((entry) => ({ name: entry.daily_ai_use, count: Number(entry.count) })) || []
  const licenseData = stats?.licenseCounts?.map((entry) => ({ name: entry.license_status, count: Number(entry.count) })) || []
  const agentExpData = stats?.agentExpCounts?.filter((entry) => entry.agent_experience).map((entry) => ({ name: entry.agent_experience, count: Number(entry.count) })) || []
  const agentKnowData = stats?.agentKnowCounts?.filter((entry) => entry.agent_knowledge).map((entry) => ({ name: entry.agent_knowledge, count: Number(entry.count) })) || []
  const roleData = stats?.roleCounts?.filter((entry) => entry.role_level).map((entry) => ({ name: entry.role_level, count: Number(entry.count) })) || []
  const learningMethodData = stats?.learningMethodCounts?.map((entry) => ({ name: entry.name, count: Number(entry.count) })) || []
  const championData = stats?.championCounts?.filter((entry) => entry.champion_interest).map((entry) => ({ name: entry.champion_interest, count: Number(entry.count) })) || []

  const licensedCount = licenseData.find((entry) => entry.name?.includes('Yes'))?.count || 0

  if (!auth) {
    return (
      <LoginPanel
        credentials={credentials}
        onChange={(field, value) => setCredentials((current) => ({ ...current, [field]: value }))}
        onSubmit={handleLogin}
        busy={authenticating}
        error={authError}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.16),_transparent_28%),linear-gradient(180deg,#fff8f8_0%,#fef2f2_36%,#ffffff_100%)]">
      <div className="bg-gradient-to-r from-[#530b15] via-[#7f111f] to-[#c8102e] text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/95 px-3 py-2 shadow-lg">
                <img src="/csl-logo.svg" alt="CSL" className="h-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Survey Dashboard</h1>
                <p className="text-sm text-white/70">Admin analytics and response review for CSL AI adoption</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-right backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Responses</p>
                <p className="text-lg font-bold">{stats?.total || 0}</p>
              </div>

              <button
                onClick={handleClear}
                disabled={clearing}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-300/40 bg-red-900/30 px-5 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Permanently delete all responses"
              >
                {clearing ? 'Clearing...' : 'Clear all data'}
              </button>

              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                title="Insert 28 fictitious demo responses"
              >
                {seeding ? 'Seeding...' : 'Load demo data'}
              </button>
              {seedMsg && <span className="text-xs font-medium text-green-300">{seedMsg}</span>}

              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-csl-dark transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? 'Preparing export...' : 'Export Excel'}
              </button>

              <button
                onClick={() => clearAuth()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_45px_-30px_rgba(127,29,29,0.45)]">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Filters</span>
          {[
            { key: 'region', opts: REGIONS, label: 'All Regions' },
            { key: 'department', opts: DEPARTMENTS, label: 'All Departments' },
            { key: 'csl_entity', opts: CSL_ENTITIES, label: 'All Entities' },
          ].map((filter) => (
            <select
              key={filter.key}
              value={filters[filter.key]}
              onChange={(event) => updateFilter(filter.key, event.target.value)}
              className="rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-csl-purple focus:ring-4 focus:ring-csl-purple/10"
            >
              <option value="">{filter.label}</option>
              {filter.opts.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ))}
          {(filters.region || filters.department || filters.csl_entity) && (
            <button onClick={clearFilters} className="text-xs font-semibold text-csl-purple hover:underline">
              Clear filters
            </button>
          )}
        </div>

        <TabBar tabs={['Overview', 'Tools & Training', 'Insights', 'Responses']} active={activeTab} onChange={setActiveTab} />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-csl-purple" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <StatCard label="Total Responses" value={stats?.total || 0} accent />
                  <StatCard label="Avg AI Readiness" value={stats?.avgReadiness ? `${stats.avgReadiness}/5` : '—'} />
                  <StatCard label="Avg Prompt Comfort" value={stats?.avgPromptComfort ? `${stats.avgPromptComfort}/5` : '—'} />
                  <StatCard label="Avg Output Confidence" value={stats?.avgOutputConfidence ? `${stats.avgOutputConfidence}/5` : '—'} />
                  <StatCard label="Licensed Users" value={licensedCount} sub={`of ${stats?.total || 0} respondents`} />
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <ChartCard title="Responses by CSL Entity">
                    <SimplePie data={entityData} />
                  </ChartCard>
                  <ChartCard title="AI Readiness Distribution">
                    <SimpleBar data={readinessData} layout="horizontal" color="#C8102E" />
                  </ChartCard>
                  <ChartCard title="Prompt Comfort Distribution">
                    <SimpleBar data={promptData} layout="horizontal" color="#E23D44" />
                  </ChartCard>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="Responses by Region">
                    <SimpleBar data={regionData} color="#8E1224" />
                  </ChartCard>
                  <ChartCard title="Responses by Department">
                    <SimpleBar data={deptData} color="#C8102E" />
                  </ChartCard>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <ChartCard title="Daily AI Usage">
                    <SimpleBar data={dailyUseData} color="#475569" />
                  </ChartCard>
                  <ChartCard title="License Status">
                    <SimplePie data={licenseData} />
                  </ChartCard>
                  <ChartCard title="Role Level Breakdown">
                    <SimpleBar data={roleData} color="#530B15" />
                  </ChartCard>
                </div>
              </>
            )}

            {activeTab === 'Tools & Training' && (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="AI Tools Used (Top)">
                    <SimpleBar data={stats?.toolCounts?.slice(0, 12)} color="#C8102E" />
                  </ChartCard>
                  <ChartCard title="AI Use Cases">
                    <SimpleBar data={stats?.useCaseCounts?.slice(0, 10)} color="#E23D44" />
                  </ChartCard>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="How Respondents Learned About AI">
                    <SimpleBar data={learningMethodData} color="#475569" />
                  </ChartCard>
                  <ChartCard title="AI Output Confidence">
                    <SimpleBar data={confData} layout="horizontal" color="#8E1224" />
                  </ChartCard>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="AI Agent Knowledge">
                    <SimpleBar data={agentKnowData} color="#530B15" />
                  </ChartCard>
                  <ChartCard title="AI Agent Experience">
                    <SimpleBar data={agentExpData} color="#F97316" />
                  </ChartCard>
                </div>
              </>
            )}

            {activeTab === 'Insights' && (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <ChartCard title="Top Motivators for AI">
                    <SimpleBar data={stats?.motivatorCounts?.slice(0, 10)} color="#C8102E" />
                  </ChartCard>
                  <ChartCard title="What Brought People to AI">
                    <SimpleBar data={stats?.discoveryCounts?.slice(0, 10)} color="#8E1224" />
                  </ChartCard>
                  <ChartCard title="Barriers to AI Adoption">
                    <SimpleBar data={stats?.barrierCounts?.slice(0, 10)} color="#DC2626" />
                  </ChartCard>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="Capability Building Interest">
                    <SimpleBar data={stats?.capBuildCounts?.filter((entry) => entry.capability_building_interest).map((entry) => ({ name: entry.capability_building_interest, count: Number(entry.count) })) || []} color="#530B15" />
                  </ChartCard>
                  <ChartCard title="Preferred Learning Formats">
                    <SimpleBar data={stats?.learningCounts?.filter((entry) => entry.preferred_learning_format).map((entry) => ({ name: entry.preferred_learning_format, count: Number(entry.count) })) || []} color="#F97316" />
                  </ChartCard>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="AI Champion Interest">
                    <SimplePie data={championData} />
                  </ChartCard>
                  <ChartCard title="Qualitative Highlights">
                    <div className="max-h-80 space-y-3 overflow-y-auto">
                      {responses.filter((response) => response.what_makes_champion || response.ai_success_story).slice(0, 10).map((response) => (
                        <div key={response.id} className="rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm">
                          {response.ai_success_story && (
                            <p className="text-csl-dark"><span className="font-semibold text-csl-purple">Success:</span> {response.ai_success_story}</p>
                          )}
                          {response.what_makes_champion && (
                            <p className="mt-1 text-gray-600"><span className="font-semibold text-gray-500">Champion trait:</span> {response.what_makes_champion}</p>
                          )}
                          <p className="mt-2 text-xs text-gray-400">{response.csl_entity} · {response.department} · {response.region}</p>
                        </div>
                      ))}
                      {responses.filter((response) => response.what_makes_champion || response.ai_success_story).length === 0 && (
                        <p className="py-4 text-center text-sm text-gray-400">No qualitative responses yet</p>
                      )}
                    </div>
                  </ChartCard>
                </div>
              </>
            )}

            {activeTab === 'Responses' && (
              <div className="mb-6 overflow-hidden rounded-3xl border border-white/80 bg-white/92 shadow-[0_20px_45px_-30px_rgba(127,29,29,0.45)]">
                <div className="flex items-center justify-between border-b border-red-50 p-4">
                  <h3 className="font-semibold text-csl-dark">Individual Responses</h3>
                  <span className="text-sm text-gray-400">{total} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50/70">
                      <tr>
                        {['#', 'Date', 'Region', 'Dept', 'Entity', 'Role', 'License', 'Ready', 'Prompt', 'Confidence', 'Daily Use'].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {responses.map((response, index) => (
                        <Fragment key={response.id}>
                          <tr
                            className="cursor-pointer transition-colors hover:bg-red-50/60"
                            onClick={() => setExpandedRow(expandedRow === response.id ? null : response.id)}
                          >
                            <td className="px-3 py-3 text-gray-400">{(page - 1) * 20 + index + 1}</td>
                            <td className="whitespace-nowrap px-3 py-3">{new Date(`${response.submitted_at}Z`).toLocaleDateString()}</td>
                            <td className="px-3 py-3">{response.region}</td>
                            <td className="px-3 py-3 text-xs">{response.department}</td>
                            <td className="px-3 py-3 text-xs">{response.csl_entity}</td>
                            <td className="px-3 py-3 text-xs">{response.role_level || '—'}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                response.license_status?.includes('Yes') ? 'bg-green-100 text-green-700' :
                                response.license_status?.includes('No') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {response.license_status?.includes('Yes') ? 'Yes' : response.license_status?.includes('No') ? 'No' : '?'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">{response.ai_readiness || '—'}</td>
                            <td className="px-3 py-3 text-center">{response.prompt_comfort || '—'}</td>
                            <td className="px-3 py-3 text-center">{response.ai_output_confidence || '—'}</td>
                            <td className="px-3 py-3 text-xs">{response.daily_ai_use || '—'}</td>
                          </tr>
                          {expandedRow === response.id && (
                            <tr>
                              <td colSpan={11} className="p-0">
                                <div className="border-t border-red-100 bg-red-50/40 p-6">
                                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                                    <div><span className="font-semibold text-gray-500">How Learned About AI:</span> {Array.isArray(response.ai_learning_methods) && response.ai_learning_methods.length ? response.ai_learning_methods.join(', ') : '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Tools Used:</span> {Array.isArray(response.tools_used) && response.tools_used.length ? response.tools_used.join(', ') : '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Use Cases:</span> {Array.isArray(response.ai_use_cases) && response.ai_use_cases.length ? response.ai_use_cases.join(', ') : '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Agent Knowledge:</span> {response.agent_knowledge || '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Agent Experience:</span> {response.agent_experience || '—'}</div>
                                    <div><span className="font-semibold text-gray-500">AI Champion Interest:</span> {response.champion_interest || '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Discovery Reasons:</span> {Array.isArray(response.ai_discovery_reasons) && response.ai_discovery_reasons.length ? response.ai_discovery_reasons.join(', ') : '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Motivators:</span> {Array.isArray(response.ai_motivators) && response.ai_motivators.length ? response.ai_motivators.join(', ') : '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Barriers:</span> {Array.isArray(response.ai_barriers) && response.ai_barriers.length ? response.ai_barriers.join(', ') : '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Capability Interest:</span> {response.capability_building_interest || '—'}</div>
                                    <div><span className="font-semibold text-gray-500">Learning Format:</span> {response.preferred_learning_format || '—'}</div>
                                    <div className="md:col-span-2"><span className="font-semibold text-gray-500">What Makes a Champion:</span> {response.what_makes_champion || '—'}</div>
                                    <div className="md:col-span-2"><span className="font-semibold text-gray-500">How to Share Motivators:</span> {response.share_motivators || '—'}</div>
                                    {response.ai_success_story && <div className="md:col-span-2"><span className="font-semibold text-gray-500">Success Story:</span> {response.ai_success_story}</div>}
                                    {response.open_response && <div className="md:col-span-2"><span className="font-semibold text-gray-500">Additional Thoughts:</span> {response.open_response}</div>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                      {responses.length === 0 && (
                        <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No responses yet. Share the survey to start collecting data.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 border-t border-red-50 p-4">
                    <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-red-100 px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-30">Prev</button>
                    <span className="text-sm text-gray-500">Page {page} of {pages}</span>
                    <button onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages} className="rounded-xl border border-red-100 px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-30">Next</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
