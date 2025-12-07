import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import JudgesPage from './pages/JudgesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl fixed h-screen">
          <div className="p-6">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  AI Judge
                </h1>
                <p className="text-xs text-gray-400">Intelligent Evaluation</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg scale-105'
                      : 'hover:bg-gray-800 hover:translate-x-1'
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-medium">Upload Data</span>
              </NavLink>

              <NavLink
                to="/judges"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg scale-105'
                      : 'hover:bg-gray-800 hover:translate-x-1'
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-medium">AI Judges</span>
              </NavLink>

              <NavLink
                to="/assignments"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg scale-105'
                      : 'hover:bg-gray-800 hover:translate-x-1'
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium">Assignments</span>
              </NavLink>

              <NavLink
                to="/results"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg scale-105'
                      : 'hover:bg-gray-800 hover:translate-x-1'
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">Results</span>
              </NavLink>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-72 overflow-y-auto h-screen">
          <div className="max-w-7xl mx-auto p-8">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/judges" element={<JudgesPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/results" element={<ResultsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
