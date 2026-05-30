import React, { useState, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import Catalog from './pages/Catalog';    
import Lesson from './pages/Lesson';
import TeacherDashboard from './pages/TeacherDashboard';
import CourseInfo from './pages/CourseInfo';
import Profile from './pages/Profile';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import TeacherProfile from './pages/TeacherProfile';
import AIMentor from './pages/AIMentor';
import Arena from './pages/Arena';
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
    }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Кольори для Світлої теми
                background: {
                  default: '#f5f7f9',
                  paper: '#ffffff',
                },
                primary: { main: '#1976d2' },
              }
            : {

                background: {
                  default: '#0f172a',
                  paper: '#1e293b', 
                },
                primary: { main: '#38bdf8' },
                divider: 'rgba(255, 255, 255, 0.12)',
              }),
        },
        typography: {
          fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* МАГІЯ: Цей компонент автоматично фарбує весь фон `body` */}
        
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <Box sx={{ flexGrow: 1 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/lesson/:courseId" element={<Lesson />} />
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/course/:id" element={<CourseInfo />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register" element={<Register/>} />
                <Route path="/admin" element={<AdminDashboard/>} />
                <Route path="/instructor/:id" element={<TeacherProfile />} />
                <Route path="/mentor" element={<AIMentor />} />
                <Route path="/arena" element={<Arena />} />
              </Routes>
            </Box>
          </Box>
        </Router>
        
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;