import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AccessGate } from './components/AccessGate'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { SyncProvider } from './context/SyncContext'
import { Dashboard } from './pages/Dashboard'
import { NewProspect } from './pages/NewProspect'
import { ProspectDetail } from './pages/ProspectDetail'
import { Prospects } from './pages/Prospects'

export default function App() {
  return (
    <AuthProvider>
      <AccessGate>
        <SyncProvider>
          <DataProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<NewProspect />} />
                  <Route path="fiches" element={<Prospects />} />
                  <Route path="fiches/:id" element={<ProspectDetail />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </SyncProvider>
      </AccessGate>
    </AuthProvider>
  )
}
