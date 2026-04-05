import { useEffect, useState } from 'react'
import FloatingLogo from '../components/FloatingLogo'

export default function ThankYouPage() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <FloatingLogo />
      <div className={`relative z-10 text-center px-6 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-csl-purple to-csl-purple-dark flex items-center justify-center shadow-2xl shadow-csl-purple/20">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-csl-dark mb-4">Thank You!</h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto mb-2">
          Your response has been recorded successfully.
        </p>
        <p className="text-gray-400 max-w-sm mx-auto">
          Thank you for helping shape the future of AI at CSL. Together, we're building a smarter, more innovative workplace.
        </p>
        <div className="mt-10">
          <a href="/" className="inline-block px-8 py-3 rounded-2xl bg-csl-purple/10 text-csl-purple font-semibold hover:bg-csl-purple/20 transition-colors">
            Submit Another Response
          </a>
        </div>
      </div>
    </div>
  )
}
