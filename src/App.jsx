import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import Homepage from './components/Homepage.jsx';
import Login from './components/Login.jsx';
import Contact from './components/Contact.jsx';
import ExecutiveDashboard from './components/ExecutiveDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { fetchCurrentUser, logout as apiLogout, onUnauthorized } from './api.js';

/* ============================================================
   THE CONSCIOUS ORBIT — application shell.

   There is no router: a single `page` string decides what renders.
   That string and the signed-in email are persisted so a refresh
   keeps the user where they were, and the stored session is
   revalidated against the API before a dashboard is shown.
   ============================================================ */

const PAGE_KEY = 'co.page';
const EMAIL_KEY = 'co.userEmail';
const VALID_PAGES = new Set(['home', 'contact', 'login', 'dashboard', 'admin-dashboard']);

function readStoredPage() {
  try {
    const stored = localStorage.getItem(PAGE_KEY);
    return VALID_PAGES.has(stored) ? stored : 'home';
  } catch { return 'home'; }
}

function readStoredEmail() {
  try { return localStorage.getItem(EMAIL_KEY) || ''; } catch { return ''; }
}

/** Shared page transition. */
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.4 },
};

function App() {
  const [page, setPageState] = useState(readStoredPage);
  const [userEmail, setUserEmailState] = useState(readStoredEmail);

  /* Wrap the setters so every navigation and login/logout persists. Never
     write from useEffect: React strict-mode double-mounts would clobber the
     stored value with the initial default on remount. */
  const setPage = React.useCallback((next) => {
    setPageState(next);
    try {
      if (next === 'home') localStorage.removeItem(PAGE_KEY);
      else localStorage.setItem(PAGE_KEY, next);
    } catch { /* storage disabled — in-memory only */ }
  }, []);

  const setUserEmail = React.useCallback((next) => {
    setUserEmailState(next || '');
    try {
      if (next) localStorage.setItem(EMAIL_KEY, next);
      else localStorage.removeItem(EMAIL_KEY);
    } catch { /* ignore */ }
  }, []);

  /* A stored page is only trustworthy while the session behind it is. On load,
     confirm the token with the server; if it has expired or was tampered with,
     drop back to the login screen rather than rendering a dashboard that
     cannot fetch anything. */
  React.useEffect(() => {
    const needsSession = page === 'dashboard' || page === 'admin-dashboard';
    if (!needsSession) return undefined;
    let cancelled = false;
    fetchCurrentUser()
      .then((data) => {
        if (!cancelled && data?.user?.email) setUserEmail(data.user.email);
      })
      .catch((err) => {
        // A network failure is not an auth failure — leave the user in place
        // so the offline fallback still works.
        if (!cancelled && err?.status === 401) setPage('login');
      });
    return () => { cancelled = true; };
  }, [page, setPage, setUserEmail]);

  // Any 401 mid-session (an expired token) returns the user to the login screen.
  React.useEffect(() => onUnauthorized(() => setPage('login')), [setPage]);

  const signOut = () => {
    apiLogout();
    setUserEmail('');
    setPage('home');
  };

  // ---- Page routing ----
  if (page === 'home') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="home" {...fade}>
          <Homepage
            onEnter={() => setPage('login')}
            onLogin={() => setPage('login')}
            onContact={() => setPage('contact')}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (page === 'contact') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="contact" {...fade}>
          <Contact onBack={() => setPage('home')} />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (page === 'login') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" {...fade}>
          <Login
            onLogin={(role, email) => {
              setUserEmail(email || '');
              setPage(role === 'admin' ? 'admin-dashboard' : 'dashboard');
            }}
            onBack={() => setPage('home')}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (page === 'admin-dashboard') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="admin-dashboard" {...fade}>
          <AdminDashboard onLogout={signOut} onGoHome={() => setPage('home')} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key="dashboard" {...fade}>
        <ExecutiveDashboard
          onLogout={signOut}
          onGoHome={() => setPage('home')}
          userEmail={userEmail}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default App;
