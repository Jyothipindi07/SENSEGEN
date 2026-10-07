import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  LogIn,
  UserPlus,
  Bell,
  FileText,
  LogOut,
  X
} from 'lucide-react';
import axios from 'axios';

// =====================================================
// RENDER BACKEND URL
// =====================================================
const API_URL = 'https://sensegen.onrender.com';


// =====================================================
// IMAGE URL HELPER
// =====================================================
const getImageUrl = (pathStr) => {
  if (!pathStr) return '';

  // Already a complete URL or data URL
  if (
    pathStr.startsWith('http://') ||
    pathStr.startsWith('https://') ||
    pathStr.startsWith('data:')
  ) {
    return pathStr;
  }

  const cleanPath = pathStr.startsWith('/')
    ? pathStr
    : `/${pathStr}`;

  return `${API_URL}${cleanPath}`;
};


// =====================================================
// USER DASHBOARD
// =====================================================
export default function UserDashboard() {
  const navigate = useNavigate();

  // ===================================================
  // USER / AUTH STATE
  // ===================================================
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [isLoginView, setIsLoginView] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);


  // ===================================================
  // DASHBOARD STATE
  // ===================================================
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);


  // ===================================================
  // RESTORE LOGIN SESSION
  // ===================================================
  useEffect(() => {
    const savedToken = localStorage.getItem('sensegen_token');
    const savedUser = localStorage.getItem('sensegen_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        setToken(savedToken);
        setUser(parsedUser);

        fetchUserData(parsedUser.id);
      } catch (error) {
        console.error('Failed to restore saved user:', error);

        localStorage.removeItem('sensegen_token');
        localStorage.removeItem('sensegen_user');
      }
    }
  }, []);


  // ===================================================
  // FETCH USER REPORTS + NOTIFICATIONS
  // ===================================================
  const fetchUserData = async (userId) => {
    setLoadingData(true);

    try {
      const [repRes, notifRes] = await Promise.all([
        axios.get(
          `${API_URL}/api/user/reports?user_id=${userId}`
        ),

        axios.get(
          `${API_URL}/api/user/notifications?user_id=${userId}`
        )
      ]);

      setReports(repRes.data || []);
      setNotifications(notifRes.data || []);

    } catch (err) {
      console.error(
        'Failed to load user dashboard data:',
        err
      );
    } finally {
      setLoadingData(false);
    }
  };


  // ===================================================
  // NOTIFICATION CLICK
  // ===================================================
  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read_status) {
        await axios.post(
          `${API_URL}/api/user/notifications/${notif.id}/read`
        );

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id
              ? { ...n, read_status: 1 }
              : n
          )
        );
      }
    } catch (err) {
      console.warn(
        'Could not mark notification as read:',
        err
      );
    }

    setShowNotifications(false);

    if (notif.incident_id) {
      navigate(`/track?id=${notif.incident_id}`);
    }
  };


  // ===================================================
  // LOGIN / SIGNUP
  // ===================================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    setAuthError(null);

    // -------------------------------
    // SIGNUP VALIDATION
    // -------------------------------
    if (!isLoginView) {
      if (formData.password.length < 8) {
        setAuthError(
          'Password must be at least 8 characters long.'
        );
        return;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        setAuthError(
          'Passwords do not match.'
        );
        return;
      }
    }

    setAuthLoading(true);

    // -------------------------------
    // API ENDPOINT
    // -------------------------------
    const endpoint = isLoginView
      ? '/api/auth/login'
      : '/api/auth/signup';

    try {
      // IMPORTANT:
      // Use Render backend URL
      const res = await axios.post(
        `${API_URL}${endpoint}`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }
      );

      const {
        token: newTok,
        user: newUsr
      } = res.data;

      // -------------------------------
      // SAVE LOGIN SESSION
      // -------------------------------
      localStorage.setItem(
        'sensegen_token',
        newTok
      );

      localStorage.setItem(
        'sensegen_user',
        JSON.stringify(newUsr)
      );

      setToken(newTok);
      setUser(newUsr);

      // -------------------------------
      // LOAD USER DATA
      // -------------------------------
      fetchUserData(newUsr.id);

    } catch (err) {
      console.error(
        'Auth error:',
        err
      );

      console.error(
        'Auth response:',
        err.response?.data
      );

      setAuthError(
        err.response?.data?.error ||
        'Authentication failed.'
      );

    } finally {
      setAuthLoading(false);
    }
  };


  // ===================================================
  // LOGOUT
  // ===================================================
  const handleLogout = () => {
    localStorage.removeItem(
      'sensegen_token'
    );

    localStorage.removeItem(
      'sensegen_user'
    );

    setUser(null);
    setToken(null);
    setReports([]);
    setNotifications([]);
  };


  // ===================================================
  // STATUS BADGE
  // ===================================================
  const getStatusBadge = (status) => {
    switch (status) {

      case 'REPORT_SUBMITTED':
        return (
          <span className="badge badge-submitted">
            REPORT SUBMITTED
          </span>
        );

      case 'ACCEPTED':
        return (
          <span className="badge badge-accepted">
            Report Accepted
          </span>
        );

      case 'ACTION_IN_PROGRESS':
        return (
          <span className="badge badge-progress">
            Work In Progress
          </span>
        );

      case 'RESOLUTION_PROOF_UPLOADED':
        return (
          <span className="badge badge-progress">
            Work In Progress
          </span>
        );

      case 'AI_VERIFICATION_COMPLETED':
        return (
          <span className="badge badge-progress">
            Work In Progress
          </span>
        );

      case 'SOLVED':
        return (
          <span className="badge badge-solved">
            Problem Solved
          </span>
        );

      default:
        return (
          <span className="badge badge-submitted">
            {status}
          </span>
        );
    }
  };


  // ===================================================
  // LOGIN / SIGNUP SCREEN
  // ===================================================
  if (!user) {
    return (
      <div
        style={{
          maxWidth: '460px',
          margin: '2rem auto'
        }}
      >
        <div className="card">

          {/* HEADER */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.2rem'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background:
                  'rgba(0, 242, 254, 0.1)',
                color:
                  'var(--cyan-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.8rem'
              }}
            >
              <User size={24} />
            </div>

            <h2
              style={{
                fontSize: '1.6rem',
                fontWeight: 800
              }}
            >
              USER PORTAL
            </h2>

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                marginTop: '0.2rem'
              }}
            >
              Sign in to view your submitted
              reports and personal notifications.
            </p>
          </div>


          {/* LOGIN / SIGNUP TABS */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.2rem',
              background:
                'rgba(255, 255, 255, 0.05)',
              padding: '4px',
              borderRadius: '8px'
            }}
          >

            {/* LOGIN */}
            <button
              type="button"
              onClick={() => {
                setIsLoginView(true);
                setAuthError(null);
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '6px',
                border: 'none',
                background: isLoginView
                  ? 'var(--cyan-primary)'
                  : 'transparent',
                color: isLoginView
                  ? '#070d1d'
                  : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <LogIn size={16} />
              Login
            </button>


            {/* SIGNUP */}
            <button
              type="button"
              onClick={() => {
                setIsLoginView(false);
                setAuthError(null);
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '6px',
                border: 'none',
                background: !isLoginView
                  ? 'var(--cyan-primary)'
                  : 'transparent',
                color: !isLoginView
                  ? '#070d1d'
                  : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <UserPlus size={16} />
              Sign Up
            </button>

          </div>


          {/* ERROR MESSAGE */}
          {authError && (
            <div
              style={{
                padding: '0.8rem',
                background:
                  'rgba(255, 61, 113, 0.15)',
                border:
                  '1px solid rgba(255, 61, 113, 0.3)',
                color: '#ff3d71',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              {authError}
            </div>
          )}


          {/* FORM */}
          <form
            onSubmit={handleAuthSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >

            {/* NAME - SIGNUP ONLY */}
            {!isLoginView && (
              <div className="form-group">

                <label className="form-label">
                  User Name
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  className="form-input"
                  placeholder="Enter your name"
                />

              </div>
            )}


            {/* EMAIL */}
            <div className="form-group">

              <label className="form-label">
                User Email
              </label>

              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value
                  })
                }
                className="form-input"
                placeholder="name@example.com"
              />

            </div>


            {/* PASSWORD */}
            <div className="form-group">

              <label className="form-label">
                Password
              </label>

              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    password: e.target.value
                  })
                }
                className="form-input"
                placeholder="••••••••"
              />

            </div>


            {/* CONFIRM PASSWORD */}
            {!isLoginView && (
              <div className="form-group">

                <label className="form-label">
                  Confirm Password
                </label>

                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value
                    })
                  }
                  className="form-input"
                  placeholder="••••••••"
                />

              </div>
            )}


            {/* SUBMIT */}
            <button
              type="submit"
              disabled={authLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                justifyContent: 'center'
              }}
            >
              {isLoginView ? (
                <>
                  <LogIn size={18} />
                  Login
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>

          </form>


          {/* SWITCH LOGIN / SIGNUP */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.2rem',
              paddingTop: '1rem',
              borderTop:
                '1px solid var(--border-light)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}
          >
            {isLoginView
              ? "Don't have an account? "
              : "Already have an account? "}

            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setAuthError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cyan-primary)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isLoginView
                ? 'Sign Up'
                : 'Log In'}
            </button>

          </div>

        </div>
      </div>
    );
  }


  // ===================================================
  // LOGGED-IN DASHBOARD
  // ===================================================
  const unreadCount =
    notifications.filter(
      (n) => !n.read_status
    ).length;


  return (
    <div
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}
    >

      {/* =============================================
          HEADER
      ============================================== */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}
      >

        <div>

          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#ffffff'
            }}
          >
            Welcome, {user.name}
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem'
            }}
          >
            {user.email} • Personal Citizen
            Incident Dashboard
          </p>

        </div>


        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >

          {/* NOTIFICATIONS */}
          <div style={{ position: 'relative' }}>

            <button
              onClick={() =>
                setShowNotifications(
                  !showNotifications
                )
              }
              className="btn btn-secondary"
              style={{
                position: 'relative',
                padding: '0.65rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >

              <Bell
                size={18}
                color="var(--cyan-primary)"
              />

              <span
                style={{ fontWeight: 700 }}
              >
                Notifications
              </span>

              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ff3d71',
                    color: '#ffffff',
                    borderRadius: '999px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    lineHeight: 1
                  }}
                >
                  {unreadCount}
                </span>
              )}

            </button>


            {/* NOTIFICATION DROPDOWN */}
            {showNotifications && (
              <div
                className="card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 0.6rem)',
                  width: '360px',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  border:
                    '1px solid var(--cyan-primary)',
                  boxShadow:
                    '0 12px 40px rgba(0,0,0,0.7)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    borderBottom:
                      '1px solid var(--border-light)',
                    paddingBottom: '0.6rem'
                  }}
                >

                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Bell
                      size={16}
                      color="var(--cyan-primary)"
                    />

                    MY NOTIFICATIONS (
                    {unreadCount} UNREAD)
                  </div>

                  <button
                    onClick={() =>
                      setShowNotifications(false)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={18} />
                  </button>

                </div>


                {notifications.length === 0 ? (

                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      margin: '0.5rem 0'
                    }}
                  >
                    No notifications found.
                  </p>

                ) : (

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >

                    {notifications.map(
                      (notif) => (

                        <div
                          key={notif.id}
                          onClick={() =>
                            handleNotificationClick(
                              notif
                            )
                          }
                          style={{
                            background:
                              notif.read_status
                                ? 'rgba(7, 13, 29, 0.4)'
                                : 'rgba(0, 242, 254, 0.08)',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            borderLeft:
                              notif.read_status
                                ? '3px solid var(--border-light)'
                                : '3px solid var(--cyan-primary)',
                            cursor: 'pointer',
                            transition:
                              'all 0.2s ease'
                          }}
                        >

                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: '#ffffff',
                              fontWeight:
                                notif.read_status
                                  ? 400
                                  : 700,
                              display: 'flex',
                              alignItems:
                                'flex-start',
                              gap: '0.4rem'
                            }}
                          >

                            {!notif.read_status && (
                              <span
                                style={{
                                  color:
                                    'var(--cyan-primary)',
                                  fontSize: '0.7rem'
                                }}
                              >
                                ●
                              </span>
                            )}

                            <div>
                              {notif.message}
                            </div>

                          </div>


                          <div
                            style={{
                              fontSize: '0.75rem',
                              color:
                                'var(--text-muted)',
                              marginTop: '0.3rem',
                              display: 'flex',
                              justifyContent:
                                'space-between'
                            }}
                          >

                            <span>
                              {new Date(
                                notif.created_at
                              ).toLocaleString()}
                            </span>

                            <span
                              style={{
                                color:
                                  'var(--cyan-primary)',
                                fontWeight: 600
                              }}
                            >
                              Track →
                            </span>

                          </div>

                        </div>

                      )
                    )}

                  </div>
                )}

              </div>
            )}

          </div>


          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
          >
            <LogOut size={16} />
            Sign Out
          </button>

        </div>

      </div>


      {/* =============================================
          MY REPORTS
      ============================================== */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            borderBottom:
              '1px solid var(--border-light)',
            paddingBottom: '0.8rem'
          }}
        >

          <FileText
            size={22}
            color="var(--cyan-primary)"
          />

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            MY REPORTS
          </h2>

        </div>


        {loadingData ? (

          <p
            style={{
              color: 'var(--text-muted)'
            }}
          >
            Loading reports...
          </p>

        ) : reports.length === 0 ? (

          <p
            style={{
              color: 'var(--text-muted)',
              padding: '1rem 0'
            }}
          >
            You have not submitted any reports yet.
          </p>

        ) : (

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.2rem'
            }}
          >

            {reports.map((rep) => (

              <div
                key={rep.id}
                style={{
                  background:
                    'rgba(7, 13, 29, 0.6)',
                  padding: '1.2rem',
                  borderRadius:
                    'var(--radius-sm)',
                  border:
                    '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.7rem'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center'
                  }}
                >

                  <span
                    style={{
                      fontWeight: 800,
                      color:
                        'var(--cyan-primary)',
                      fontSize: '1.1rem'
                    }}
                  >
                    {rep.incident_id}
                  </span>

                  {getStatusBadge(
                    rep.status
                  )}

                </div>


                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#ffffff'
                  }}
                >
                  {rep.category_display ||
                    rep.category}
                </div>


                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  📍 {rep.address}
                </div>


                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  🏢 {rep.department}
                </div>


                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    marginTop: '0.6rem',
                    paddingTop: '0.8rem',
                    borderTop:
                      '1px solid rgba(255,255,255,0.05)'
                  }}
                >

                  <span
                    style={{
                      color:
                        rep.status === 'SOLVED'
                          ? 'var(--success)'
                          : 'var(--text-muted)',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    {rep.status === 'SOLVED'
                      ? 'Problem Solved & Case Closed'
                      : `Priority: ${rep.priority}`}
                  </span>


                  <Link
                    to={`/track?id=${rep.incident_id}`}
                    className="btn btn-primary"
                    style={{
                      padding:
                        '0.45rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    TRACK →
                  </Link>

                </div>

              </div>

            ))}

          </div>
        )}

      </div>

    </div>
  );
}