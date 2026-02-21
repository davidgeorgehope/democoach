import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Train from './pages/Train'
import Sessions from './pages/Sessions'
import SessionReview from './pages/SessionReview'
import Objections from './pages/Objections'
import Personas from './pages/Personas'
import Transcripts from './pages/Transcripts'
import KnowledgeBase from './pages/KnowledgeBase'
import SessionCompare from './pages/SessionCompare'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/train" element={<Train />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionReview />} />
        <Route path="/sessions/compare" element={<SessionCompare />} />
        <Route path="/objections" element={<Objections />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/transcripts" element={<Transcripts />} />
        <Route path="/kb" element={<KnowledgeBase />} />
      </Routes>
    </Layout>
  )
}
