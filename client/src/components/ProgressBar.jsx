export default function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-gray-200/50">
      <div
        className="h-full bg-gradient-to-r from-csl-purple via-csl-purple-dark to-csl-teal transition-all duration-500 ease-out rounded-r-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
