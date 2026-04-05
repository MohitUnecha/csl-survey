export default function FloatingLogo() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <img src="/csl-logo.svg" alt="" className="absolute top-[8%] left-[5%] w-52 opacity-[0.05] animate-float-slow" />
      <img src="/csl-logo.svg" alt="" className="absolute right-[8%] top-[58%] w-64 opacity-[0.035] animate-float-med" />
      <img src="/csl-logo.svg" alt="" className="absolute right-[28%] top-[26%] w-40 opacity-[0.055] animate-float-fast" />
      <img src="/csl-logo.svg" alt="" className="absolute bottom-[12%] left-[23%] w-56 opacity-[0.03] animate-float-med" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.14),_transparent_30%),linear-gradient(135deg,#fff7f7_0%,#ffffff_52%,#fff1f1_100%)]" />
    </div>
  )
}
