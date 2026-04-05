import { Routes, Route } from 'react-router-dom'
import SurveyPage from './pages/SurveyPage'
import ThankYouPage from './pages/ThankYouPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SurveyPage />} />
      <Route path="/survey" element={<SurveyPage />} />
      <Route path="/thankyou" element={<ThankYouPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}
