import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  CheckCircle2,
  Play,
  Upload,
  Sparkles,
  MapPin,
  X,
  Loader2,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';
import axios from 'axios';

/* =========================================================
   RENDER BACKEND
========================================================= */

const API_URL = 'https://sensegen.onrender.com';

/* =========================================================
   IMAGE URL HELPER
========================================================= */

const getImageUrl = (pathStr) => {
  if (!pathStr) return '';

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

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

export default function AdminDashboard() {
  /* =======================================================
     AUTH STATE
  ======================================================= */

  const [adminToken, setAdminToken] = useState(
    localStorage.getItem('sensegen_admin_token') || null
  );

  const [isLoginView, setIsLoginView] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  /* =======================================================
     DASHBOARD STATE
  ======================================================= */

  const [stats, setStats] = useState({
    total: 0,
    p1_count: 0,
    in_progress: 0,
    resolved: 0
  });

  const [incidents, setIncidents] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  /* =======================================================
     INSPECT INCIDENT
  ======================================================= */

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [inspectTimeline, setInspectTimeline] = useState([]);

  /* =======================================================
     RESOLUTION PROOF
  ======================================================= */

  const [proofFile, setProofFile] = useState(null);

  const [proofDesc, setProofDesc] = useState(
    'Maintenance and repair work completed successfully.'
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredIncidents = incidents.filter((inc) => {
    if (priorityFilter === 'ALL') return true;

    return inc.priority === priorityFilter;
  });

  /* =======================================================
     FETCH ADMIN DATA
  ======================================================= */

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const fetchAdminData = async () => {
    setLoading(true);

    try {
      const [statsRes, incRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`),
        axios.get(`${API_URL}/api/admin/incidents`)
      ]);

      setStats(
        statsRes.data || {
          total: 0,
          p1_count: 0,
          in_progress: 0,
          resolved: 0
        }
      );

      setIncidents(incRes.data || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     ADMIN LOGIN / SIGNUP
  ======================================================= */

  const handleAdminAuthSubmit = async (e) => {
    e.preventDefault();

    setAuthError(null);

    if (!isLoginView) {
      if (formData.password.length < 8) {
        setAuthError(
          'Password must be at least 8 characters long.'
        );
        return;
      }

      if (
        formData.password !== formData.confirmPassword
      ) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setAuthLoading(true);

    const endpoint = isLoginView
      ? '/api/admin/login'
      : '/api/admin/signup';

    try {
      const res = await axios.post(
        `${API_URL}${endpoint}`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }
      );

      const token = res.data.token;

      const adminObj =
        res.data.admin || {
          email: formData.email
        };

      localStorage.setItem(
        'sensegen_admin_token',
        token
      );

      localStorage.setItem(
        'sensegen_admin_email',
        adminObj.email
      );

      setAdminToken(token);

      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Admin Auth error:', err);

      setAuthError(
        err.response?.data?.error ||
        'Authentication failed.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleAdminLogout = () => {
    localStorage.removeItem('sensegen_admin_token');
    localStorage.removeItem('sensegen_admin_email');

    setAdminToken(null);
    setSelectedIncident(null);
    setProofFile(null);
  };

  /* =======================================================
     INSPECT INCIDENT
  ======================================================= */

  const handleInspect = async (incId) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/admin/incidents/${incId}`
      );

      const inc = res.data.incident;

      setSelectedIncident(inc);

      setInspectTimeline(
        res.data.timeline || []
      );

      /*
        IMPORTANT:
        After successful proof upload backend already stores
        the proof image.

        Therefore when inspecting again we clear only the
        NEW file selector. Existing resolution_proof remains
        inside selectedIncident.
      */

      setProofFile(null);

      if (inc?.resolution_description) {
        setProofDesc(
          inc.resolution_description
        );
      } else {
        setProofDesc(
          'Maintenance and repair work completed successfully.'
        );
      }

      setActionMsg(null);
    } catch (err) {
      console.error(
        'Failed to inspect incident:',
        err
      );
    }
  };

  /* =======================================================
     ACCEPT REPORT
  ======================================================= */

  const handleAccept = async (id) => {
    setActionLoading(true);
    setActionMsg(null);

    try {
      await axios.post(
        `${API_URL}/api/admin/incidents/${id}/accept`
      );

      setActionMsg(
        'Incident ACCEPTED successfully!'
      );

      await handleInspect(id);
      await fetchAdminData();
    } catch (err) {
      setActionMsg(
        err.response?.data?.error ||
        'Failed to accept incident.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     START WORK
  ======================================================= */

  const handleStartWork = async (id) => {
    setActionLoading(true);
    setActionMsg(null);

    try {
      await axios.post(
        `${API_URL}/api/admin/incidents/${id}/start-work`
      );

      setActionMsg(
        'Status updated to ACTION IN PROGRESS!'
      );

      await handleInspect(id);
      await fetchAdminData();
    } catch (err) {
      setActionMsg(
        err.response?.data?.error ||
        'Failed to start work.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     UPLOAD RESOLUTION PROOF
     
     THIS IS THE IMPORTANT FUNCTION.

     Flow:
     Admin selects image
          ↓
     handleUploadProof()
          ↓
     Backend upload-proof API
          ↓
     AI verification
          ↓
     Backend saves proof
          ↓
     Incident refreshed
  ======================================================= */

  const handleUploadProof = async (id) => {
    if (!proofFile) {
      setActionMsg(
        'Please select a resolution proof image to upload.'
      );
      return;
    }

    if (!proofDesc || !proofDesc.trim()) {
      setActionMsg(
        'Please enter a resolution description.'
      );
      return;
    }

    setActionLoading(true);
    setActionMsg(null);

    try {
      const formData = new FormData();

      formData.append(
        'proof_image',
        proofFile
      );

      formData.append(
        'description',
        proofDesc.trim()
      );

      const res = await axios.post(
        `${API_URL}/api/admin/incidents/${id}/upload-proof`,
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      );

      setActionMsg(
        `Proof uploaded & AI Verified${res.data?.ai_verification_message
          ? `: ${res.data.ai_verification_message}`
          : ' successfully!'
        }`
      );

      /*
        Refresh incident.
        Backend should now return resolution_proof
        and updated status.
      */

      await handleInspect(id);
      await fetchAdminData();
    } catch (err) {
      console.error(
        'Upload proof error:',
        err
      );

      setActionMsg(
        err.response?.data?.error ||
        'Failed to upload proof.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     MARK PROBLEM SOLVED

     IMPORTANT:
     This function is called ONLY AFTER proof upload.

     If resolution_proof already exists in backend,
     admin does not need to select the image again.
  ======================================================= */

  const handleSolve = async (id) => {
    if (
      !selectedIncident?.resolution_proof
    ) {
      setActionMsg(
        'Please upload and verify the resolution proof before marking the problem as solved.'
      );
      return;
    }

    if (
      !proofDesc ||
      !proofDesc.trim()
    ) {
      setActionMsg(
        'Resolution description is required before marking problem as solved.'
      );
      return;
    }

    setActionLoading(true);
    setActionMsg(null);

    try {
      const formData = new FormData();

      /*
        We DO NOT need to upload the same image again.
        The proof has already been uploaded using
        handleUploadProof().
      */

      formData.append(
        'description',
        proofDesc.trim()
      );

      const res = await axios.post(
        `${API_URL}/api/admin/incidents/${id}/solve`,
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      );

      setActionMsg(
        `Incident SOLVED! ${res.data?.ai_verification_message
          ? `AI Verification: ${res.data.ai_verification_message}`
          : 'Resolution verified successfully.'
        }`
      );

      await handleInspect(id);
      await fetchAdminData();
    } catch (err) {
      console.error(
        'Solve incident error:',
        err
      );

      setActionMsg(
        err.response?.data?.error ||
        'Failed to mark as solved.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     STATUS BADGE
  ======================================================= */

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
            ACCEPTED
          </span>
        );

      case 'ACTION_IN_PROGRESS':
      case 'IN_PROGRESS':
        return (
          <span className="badge badge-progress">
            ACTION IN PROGRESS
          </span>
        );

      case 'RESOLUTION_PROOF_UPLOADED':
        return (
          <span className="badge badge-progress">
            PROOF UPLOADED
          </span>
        );

      case 'AI_VERIFICATION_COMPLETED':
        return (
          <span className="badge badge-progress">
            AI VERIFIED
          </span>
        );

      case 'SOLVED':
        return (
          <span className="badge badge-solved">
            PROBLEM SOLVED
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

  /* =======================================================
     LOGIN / SIGNUP SCREEN
  ======================================================= */

  if (!adminToken) {
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
              <Shield size={24} />
            </div>

            <h2
              style={{
                fontSize: '1.6rem',
                fontWeight: 800
              }}
            >
              ADMIN PORTAL
            </h2>

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                marginTop: '0.2rem'
              }}
            >
              Municipal Authority &
              Department Officers
            </p>
          </div>

          {/* LOGIN / SIGNUP TABS */}

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.2rem',
              background:
                'rgba(255,255,255,0.05)',
              padding: '4px',
              borderRadius: '8px'
            }}
          >
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <LogIn size={16} />
              Login
            </button>

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

          {/* AUTH ERROR */}

          {authError && (
            <div
              style={{
                padding: '0.8rem',
                background:
                  'rgba(255,61,113,0.15)',
                border:
                  '1px solid rgba(255,61,113,0.3)',
                color: '#ff3d71',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              {authError}
            </div>
          )}

          {/* AUTH FORM */}

          <form
            onSubmit={handleAdminAuthSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {!isLoginView && (
              <div className="form-group">
                <label className="form-label">
                  Admin Name
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
                  placeholder="Enter admin name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Admin Email
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
                placeholder="admin@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Password
              </label>

              <input
                type="password"
                required
                minLength={8}
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

            {!isLoginView && (
              <div className="form-group">
                <label className="form-label">
                  Confirm Password
                </label>

                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword:
                        e.target.value
                    })
                  }
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>
            )}

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
              {authLoading ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : isLoginView ? (
                <>
                  <LogIn size={18} />
                  Login
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Admin Account
                </>
              )}
            </button>
          </form>

          {/* SWITCH */}

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
              ? "Don't have an admin account? "
              : 'Already have an admin account? '}

            <button
              type="button"
              onClick={() => {
                setIsLoginView(
                  !isLoginView
                );
                setAuthError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color:
                  'var(--cyan-primary)',
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

  /* =======================================================
     ADMIN DASHBOARD
  ======================================================= */

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}
    >

      {/* =================================================
          TOP BAR
      ================================================= */}

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
              fontWeight: 800
            }}
          >
            Municipal Admin Control Panel
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem'
            }}
          >
            Live Incident Queue &
            Department Resolution Management
          </p>
        </div>

        <button
          onClick={handleAdminLogout}
          className="btn btn-secondary"
        >
          <LogOut size={17} />
          Logout Admin
        </button>
      </div>

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(220px,1fr))',
          gap: '1.2rem'
        }}
      >
        <div
          className="card"
          style={{
            borderLeft:
              '4px solid var(--cyan-primary)'
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            TOTAL INCIDENTS
          </div>

          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              marginTop: '0.3rem'
            }}
          >
            {stats.total}
          </div>
        </div>

        <div
          className="card"
          style={{
            borderLeft:
              '4px solid #ff3d71'
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: '#ff3d71',
              fontWeight: 600
            }}
          >
            P1 CRITICAL INCIDENTS
          </div>

          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              marginTop: '0.3rem'
            }}
          >
            {stats.p1_count}
          </div>
        </div>

        <div
          className="card"
          style={{
            borderLeft:
              '4px solid #ffab00'
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: '#ffab00',
              fontWeight: 600
            }}
          >
            IN PROGRESS
          </div>

          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              marginTop: '0.3rem'
            }}
          >
            {stats.in_progress}
          </div>
        </div>

        <div
          className="card"
          style={{
            borderLeft:
              '4px solid var(--success)'
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--success)',
              fontWeight: 600
            }}
          >
            RESOLVED
          </div>

          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              marginTop: '0.3rem'
            }}
          >
            {stats.resolved}
          </div>
        </div>
      </div>

      {/* =================================================
          INCIDENT QUEUE
      ================================================= */}

      <div className="card">

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.2rem',
            paddingBottom: '0.8rem',
            borderBottom:
              '1px solid var(--border-light)'
          }}
        >
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: 0
            }}
          >
            Incident Queue & Management Table
          </h3>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color:
                  'var(--text-muted)'
              }}
            >
              Priority:
            </span>

            <div
              style={{
                display: 'flex',
                gap: '0.3rem',
                background:
                  'rgba(0,0,0,0.3)',
                padding: '4px',
                borderRadius: '8px',
                border:
                  '1px solid var(--border-color)'
              }}
            >
              {[
                'ALL',
                'P1',
                'P2',
                'P3',
                'P4'
              ].map((pVal) => (
                <button
                  key={pVal}
                  type="button"
                  onClick={() =>
                    setPriorityFilter(
                      pVal
                    )
                  }
                  style={{
                    padding:
                      '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background:
                      priorityFilter ===
                        pVal
                        ? 'var(--cyan-primary)'
                        : 'transparent',
                    color:
                      priorityFilter ===
                        pVal
                        ? '#070d1d'
                        : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize:
                      '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {pVal}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <Loader2
              size={28}
              className="animate-spin"
            />
            <p
              style={{
                color:
                  'var(--text-muted)'
              }}
            >
              Loading incidents...
            </p>
          </div>
        ) : filteredIncidents.length ===
          0 ? (
          <p
            style={{
              color:
                'var(--text-muted)',
              padding: '1rem 0'
            }}
          >
            {incidents.length === 0
              ? 'No incidents submitted yet.'
              : `No ${priorityFilter} priority incidents found.`}
          </p>
        ) : (
          <div
            style={{
              overflowX: 'auto'
            }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredIncidents.map(
                  (inc) => (
                    <tr key={inc.id}>

                      <td>
                        <img
                          src={getImageUrl(
                            inc.submitted_image
                          )}
                          alt="Evidence"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit:
                              'cover',
                            borderRadius:
                              '6px'
                          }}
                        />
                      </td>

                      <td
                        style={{
                          fontWeight: 800,
                          color:
                            'var(--cyan-primary)'
                        }}
                      >
                        {inc.incident_id}
                      </td>

                      <td
                        style={{
                          fontWeight: 600
                        }}
                      >
                        {inc.category_display ||
                          inc.category}
                      </td>

                      <td>
                        <span className="badge badge-p1">
                          {inc.priority}
                        </span>
                      </td>

                      <td
                        style={{
                          maxWidth:
                            '240px',
                          fontSize:
                            '0.85rem',
                          color:
                            'var(--text-muted)',
                          whiteSpace:
                            'nowrap',
                          overflow:
                            'hidden',
                          textOverflow:
                            'ellipsis'
                        }}
                      >
                        {inc.address}
                      </td>

                      <td>
                        {getStatusBadge(
                          inc.status
                        )}
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            handleInspect(
                              inc.id
                            )
                          }
                          className="btn btn-secondary"
                          style={{
                            padding:
                              '0.4rem 0.8rem',
                            fontSize:
                              '0.85rem'
                          }}
                        >
                          <Eye size={16} />
                          Inspect
                        </button>
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          INCIDENT MODAL
      ================================================= */}

      {selectedIncident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection:
                'column',
              gap: '1.5rem',
              border:
                '1px solid var(--cyan-primary)'
            }}
          >

            {/* MODAL HEADER */}

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                borderBottom:
                  '1px solid var(--border-light)',
                paddingBottom:
                  '1rem'
              }}
            >
              <div>

                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: '0.8rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <h2
                    style={{
                      fontSize:
                        '1.6rem',
                      fontWeight: 800,
                      color:
                        'var(--cyan-primary)'
                    }}
                  >
                    {
                      selectedIncident.incident_id
                    }
                  </h2>

                  {getStatusBadge(
                    selectedIncident.status
                  )}
                </div>

                <div
                  style={{
                    fontSize:
                      '0.9rem',
                    color:
                      'var(--text-muted)',
                    marginTop:
                      '0.2rem'
                  }}
                >
                  {selectedIncident.category_display ||
                    selectedIncident.category}

                  {' • '}

                  Priority:{' '}
                  {
                    selectedIncident.priority
                  }

                  {' ('}
                  {
                    selectedIncident.severity
                  }
                  {')'}
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedIncident(
                    null
                  )
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <X size={28} />
              </button>
            </div>

            {/* ACTION MESSAGE */}

            {actionMsg && (
              <div
                style={{
                  padding: '0.9rem',
                  background:
                    'rgba(0,242,254,0.12)',
                  border:
                    '1px solid var(--cyan-primary)',
                  color:
                    'var(--cyan-primary)',
                  borderRadius: '8px',
                  fontSize:
                    '0.9rem',
                  lineHeight: 1.5
                }}
              >
                {actionMsg}
              </div>
            )}

            {/* =================================================
                ORIGINAL + YOLO IMAGES
            ================================================= */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(280px,1fr))',
                gap: '1.5rem'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      '0.8rem',
                    color:
                      'var(--text-muted)',
                    fontWeight: 600,
                    marginBottom:
                      '0.4rem'
                  }}
                >
                  ORIGINAL SUBMITTED EVIDENCE
                </div>

                <img
                  src={getImageUrl(
                    selectedIncident.submitted_image
                  )}
                  alt="Original Evidence"
                  style={{
                    width: '100%',
                    height: '240px',
                    objectFit:
                      'cover',
                    borderRadius:
                      '8px'
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      '0.8rem',
                    color:
                      'var(--cyan-primary)',
                    fontWeight: 600,
                    marginBottom:
                      '0.4rem'
                  }}
                >
                  YOLO11 AI ANNOTATED DETECTION
                </div>

                <img
                  src={getImageUrl(
                    selectedIncident.annotated_image ||
                    selectedIncident.submitted_image
                  )}
                  alt="YOLO Detection"
                  style={{
                    width: '100%',
                    height: '240px',
                    objectFit:
                      'cover',
                    borderRadius:
                      '8px',
                    border:
                      '1px solid var(--cyan-primary)'
                  }}
                />
              </div>
            </div>

            {/* =================================================
                INCIDENT DETAILS
            ================================================= */}

            <div
              style={{
                background:
                  'rgba(7,13,29,0.6)',
                padding: '1rem',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(240px,1fr))',
                gap: '1rem'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      '0.8rem',
                    color:
                      'var(--text-muted)'
                  }}
                >
                  DEPARTMENT
                </div>

                <div
                  style={{
                    fontWeight: 600,
                    color: '#fff'
                  }}
                >
                  {
                    selectedIncident.department
                  }
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      '0.8rem',
                    color:
                      'var(--text-muted)'
                  }}
                >
                  ASSIGNED AUTHORITY
                </div>

                <div
                  style={{
                    fontWeight: 600,
                    color: '#fff'
                  }}
                >
                  {
                    selectedIncident.authority
                  }
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      '0.8rem',
                    color:
                      'var(--text-muted)'
                  }}
                >
                  LOCATION
                </div>

                <div
                  style={{
                    fontWeight: 500,
                    color: '#fff',
                    fontSize:
                      '0.85rem'
                  }}
                >
                  {
                    selectedIncident.address
                  }
                </div>
              </div>
            </div>

            {/* =================================================
                MAP
            ================================================= */}

            {selectedIncident.latitude &&
              selectedIncident.longitude && (
                <div
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border:
                      '1px solid var(--border-light)'
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        '0.8rem',
                      color:
                        'var(--text-muted)',
                      background:
                        'rgba(7,13,29,0.8)',
                      padding:
                        '0.5rem 1rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: '0.4rem'
                    }}
                  >
                    <MapPin size={15} />
                    INTERACTIVE GEOLOCATION MAP
                  </div>

                  <iframe
                    title="Incident Location Map"
                    width="100%"
                    height="180"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedIncident.longitude -
                      0.005
                      }%2C${selectedIncident.latitude -
                      0.005
                      }%2C${selectedIncident.longitude +
                      0.005
                      }%2C${selectedIncident.latitude +
                      0.005
                      }&layer=mapnik&marker=${selectedIncident.latitude
                      }%2C${selectedIncident.longitude
                      }`}
                  />
                </div>
              )}

            {/* =================================================
                ADMIN WORKFLOW
            ================================================= */}

            <div
              style={{
                background:
                  'rgba(0,242,254,0.04)',
                padding: '1.4rem',
                borderRadius: '12px',
                border:
                  '1px solid var(--border-color)'
              }}
            >

              <h3
                style={{
                  fontSize:
                    '1.2rem',
                  fontWeight: 700,
                  marginBottom:
                    '1.2rem',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '0.6rem'
                }}
              >
                <Sparkles
                  size={20}
                  color="var(--cyan-primary)"
                />

                Admin Work Lifecycle Actions
              </h3>

              {/* =================================================
                  ACCEPT REPORT
              ================================================= */}

              {selectedIncident.status ===
                'REPORT_SUBMITTED' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '1rem'
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          '0.85rem',
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      Current Status:{' '}
                      <strong
                        style={{
                          color:
                            'var(--cyan-primary)'
                        }}
                      >
                        REPORT SUBMITTED
                      </strong>

                      {' — Click Accept Report to assign the department field team.'}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleAccept(
                          selectedIncident.id
                        )
                      }
                      disabled={
                        actionLoading
                      }
                      className="btn btn-primary"
                      style={{
                        padding:
                          '0.8rem 1.5rem',
                        fontWeight: 700
                      }}
                    >
                      {actionLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2
                          size={18}
                        />
                      )}

                      ACCEPT REPORT
                    </button>
                  </div>
                )}

              {/* =================================================
                  START WORK
              ================================================= */}

              {selectedIncident.status ===
                'ACCEPTED' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '1rem'
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          '0.85rem',
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      Current Status:{' '}
                      <strong
                        style={{
                          color:
                            'var(--cyan-primary)'
                        }}
                      >
                        ACCEPTED BY AUTHORITY
                      </strong>

                      {' — Click Start Work to begin repair operations.'}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleStartWork(
                          selectedIncident.id
                        )
                      }
                      disabled={
                        actionLoading
                      }
                      className="btn btn-primary"
                      style={{
                        padding:
                          '0.8rem 1.5rem',
                        fontWeight: 700
                      }}
                    >
                      {actionLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Play size={18} />
                      )}

                      START WORK / WORK IN PROGRESS
                    </button>
                  </div>
                )}

              {/* =================================================
                  RESOLUTION PROOF WORKFLOW

                  IMPORTANT:
                  This block also supports
                  AI_VERIFICATION_COMPLETED.
              ================================================= */}

              {(
                selectedIncident.status ===
                'ACTION_IN_PROGRESS' ||
                selectedIncident.status ===
                'IN_PROGRESS' ||
                selectedIncident.status ===
                'RESOLUTION_PROOF_UPLOADED' ||
                selectedIncident.status ===
                'AI_VERIFICATION_COMPLETED'
              ) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '1.2rem'
                    }}
                  >

                    {/* WORK STATUS */}

                    <div
                      style={{
                        fontSize:
                          '0.85rem',
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      Current Status:{' '}

                      <strong
                        style={{
                          color:
                            selectedIncident.status ===
                              'AI_VERIFICATION_COMPLETED'
                              ? 'var(--success)'
                              : 'var(--cyan-primary)'
                        }}
                      >
                        {selectedIncident.status ===
                          'AI_VERIFICATION_COMPLETED'
                          ? 'AI VERIFICATION COMPLETED'
                          : 'WORK IN PROGRESS'}
                      </strong>
                    </div>

                    {/* =================================================
                      PROOF ALREADY UPLOADED
                  ================================================= */}

                    {selectedIncident.resolution_proof && (
                      <div
                        style={{
                          padding: '1rem',
                          background:
                            'rgba(0,230,118,0.08)',
                          border:
                            '1px solid var(--success)',
                          borderRadius:
                            '8px'
                        }}
                      >
                        <div
                          style={{
                            color:
                              'var(--success)',
                            fontWeight: 800,
                            marginBottom:
                              '0.7rem'
                          }}
                        >
                          ✓ RESOLUTION PROOF UPLOADED
                        </div>

                        <img
                          src={getImageUrl(
                            selectedIncident.resolution_proof
                          )}
                          alt="Resolution Proof"
                          style={{
                            width: '100%',
                            maxHeight:
                              '250px',
                            objectFit:
                              'cover',
                            borderRadius:
                              '8px',
                            border:
                              '1px solid var(--success)'
                          }}
                        />

                        <div
                          style={{
                            marginTop:
                              '0.7rem',
                            fontSize:
                              '0.85rem',
                            color:
                              'var(--text-muted)'
                          }}
                        >
                          AI Verification:{' '}
                          <strong
                            style={{
                              color:
                                'var(--success)'
                            }}
                          >
                            {selectedIncident.ai_verification_message ||
                              'Verified'}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* =================================================
                      DESCRIPTION
                  ================================================= */}

                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          fontWeight: 700,
                          color: '#ffffff'
                        }}
                      >
                        Resolution Description{' '}
                        <span
                          style={{
                            color: '#ff3d71'
                          }}
                        >
                          *
                        </span>
                      </label>

                      <textarea
                        rows="4"
                        placeholder="Describe the repair work completed..."
                        value={proofDesc}
                        onChange={(e) =>
                          setProofDesc(
                            e.target.value
                          )
                        }
                        className="form-textarea"
                      />
                    </div>

                    {/* =================================================
                      NEW PROOF IMAGE
                  ================================================= */}

                    {!selectedIncident.resolution_proof && (
                      <div className="form-group">
                        <label
                          className="form-label"
                          style={{
                            fontWeight: 700,
                            color: '#ffffff'
                          }}
                        >
                          Resolution Proof Image{' '}
                          <span
                            style={{
                              color: '#ff3d71'
                            }}
                          >
                            *
                          </span>
                        </label>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setProofFile(
                              e.target.files?.[0] ||
                              null
                            )
                          }
                          className="form-input"
                        />

                        {proofFile && (
                          <div
                            style={{
                              fontSize:
                                '0.8rem',
                              color:
                                'var(--cyan-primary)',
                              marginTop:
                                '0.4rem'
                            }}
                          >
                            ✓ Selected:{' '}
                            {proofFile.name}
                            {' '}
                            (
                            {(
                              proofFile.size /
                              1024
                            ).toFixed(1)}
                            {' '}KB)
                          </div>
                        )}
                      </div>
                    )}

                    {/* =================================================
                      STEP 1:
                      UPLOAD & VERIFY PROOF
                  ================================================= */}

                    {!selectedIncident.resolution_proof && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUploadProof(
                            selectedIncident.id
                          )
                        }
                        disabled={
                          actionLoading ||
                          !proofFile ||
                          !proofDesc.trim()
                        }
                        className="btn btn-secondary"
                        style={{
                          width: '100%',
                          padding:
                            '0.95rem',
                          justifyContent:
                            'center',
                          fontWeight: 800,
                          fontSize:
                            '1rem',
                          border:
                            '1px solid var(--cyan-primary)',
                          opacity:
                            actionLoading ||
                              !proofFile ||
                              !proofDesc.trim()
                              ? 0.55
                              : 1
                        }}
                      >
                        {actionLoading ? (
                          <Loader2
                            size={20}
                            className="animate-spin"
                          />
                        ) : (
                          <Upload size={20} />
                        )}

                        UPLOAD & VERIFY PROOF
                      </button>
                    )}

                    {!selectedIncident.resolution_proof && (
                      <div
                        style={{
                          fontSize:
                            '0.8rem',
                          color:
                            'var(--text-muted)',
                          textAlign:
                            'center'
                        }}
                      >
                        Step 1: Upload the
                        after-repair image.
                        SenseGen will send it
                        for AI verification.
                      </div>
                    )}

                    {/* =================================================
                      STEP 2:
                      MARK PROBLEM SOLVED

                      ONLY ENABLED AFTER PROOF
                      EXISTS IN BACKEND.
                  ================================================= */}

                    <button
                      type="button"
                      onClick={() =>
                        handleSolve(
                          selectedIncident.id
                        )
                      }
                      disabled={
                        actionLoading ||
                        !selectedIncident.resolution_proof ||
                        !proofDesc.trim()
                      }
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding:
                          '0.95rem',
                        justifyContent:
                          'center',
                        fontWeight: 800,
                        fontSize:
                          '1rem',
                        background:
                          !selectedIncident.resolution_proof ||
                            !proofDesc.trim()
                            ? 'rgba(255,255,255,0.1)'
                            : 'linear-gradient(135deg,#00e676,#00b0ff)',
                        color:
                          !selectedIncident.resolution_proof ||
                            !proofDesc.trim()
                            ? 'var(--text-muted)'
                            : '#070d1d',
                        cursor:
                          !selectedIncident.resolution_proof ||
                            !proofDesc.trim()
                            ? 'not-allowed'
                            : 'pointer'
                      }}
                    >
                      {actionLoading ? (
                        <Loader2
                          size={20}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2
                          size={20}
                        />
                      )}

                      MARK PROBLEM SOLVED
                    </button>

                    {/* EXPLANATION */}

                    {!selectedIncident.resolution_proof && (
                      <div
                        style={{
                          padding:
                            '0.8rem',
                          background:
                            'rgba(255,171,0,0.08)',
                          border:
                            '1px solid rgba(255,171,0,0.3)',
                          color:
                            '#ffab00',
                          borderRadius:
                            '8px',
                          fontSize:
                            '0.8rem',
                          textAlign:
                            'center'
                        }}
                      >
                        ⚠️ First click
                        <strong>
                          {' '}UPLOAD & VERIFY PROOF
                        </strong>
                        . After AI verification,
                        MARK PROBLEM SOLVED
                        will become available.
                      </div>
                    )}

                    {selectedIncident.resolution_proof && (
                      <div
                        style={{
                          padding:
                            '0.8rem',
                          background:
                            'rgba(0,230,118,0.08)',
                          border:
                            '1px solid rgba(0,230,118,0.3)',
                          color:
                            'var(--success)',
                          borderRadius:
                            '8px',
                          fontSize:
                            '0.8rem',
                          textAlign:
                            'center'
                        }}
                      >
                        ✓ Proof has been uploaded
                        and verified. You can now
                        click{' '}
                        <strong>
                          MARK PROBLEM SOLVED
                        </strong>.
                      </div>
                    )}
                  </div>
                )}

              {/* =================================================
                  SOLVED
              ================================================= */}

              {selectedIncident.status ===
                'SOLVED' && (
                  <div
                    style={{
                      background:
                        'rgba(0,230,118,0.08)',
                      padding: '1.2rem',
                      borderRadius:
                        '8px',
                      border:
                        '1px solid var(--success)',
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '1rem'
                    }}
                  >
                    <div
                      style={{
                        color:
                          'var(--success)',
                        fontWeight: 800,
                        fontSize:
                          '1.15rem',
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: '0.6rem'
                      }}
                    >
                      <CheckCircle2
                        size={24}
                      />

                      ✓ PROBLEM SOLVED
                    </div>

                    {/* RESOLUTION IMAGE */}

                    {selectedIncident.resolution_proof && (
                      <div>
                        <div
                          style={{
                            fontSize:
                              '0.8rem',
                            color:
                              'var(--text-muted)',
                            fontWeight: 600,
                            marginBottom:
                              '0.4rem'
                          }}
                        >
                          RESOLUTION PROOF IMAGE
                        </div>

                        <img
                          src={getImageUrl(
                            selectedIncident.resolution_proof
                          )}
                          alt="Resolution Proof"
                          style={{
                            width: '100%',
                            maxHeight:
                              '280px',
                            objectFit:
                              'cover',
                            borderRadius:
                              '8px',
                            border:
                              '1px solid var(--success)'
                          }}
                        />
                      </div>
                    )}

                    {/* RESOLUTION DETAILS */}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit,minmax(240px,1fr))',
                        gap: '1.2rem'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              '0.8rem',
                            color:
                              'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          RESOLUTION DESCRIPTION
                        </div>

                        <div
                          style={{
                            fontSize:
                              '0.95rem',
                            color: '#ffffff',
                            marginTop:
                              '0.25rem',
                            lineHeight: 1.5
                          }}
                        >
                          {selectedIncident.resolution_description ||
                            proofDesc ||
                            'Maintenance and repair work completed successfully.'}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize:
                              '0.8rem',
                            color:
                              'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          AI VERIFICATION
                        </div>

                        <div
                          style={{
                            fontSize:
                              '0.9rem',
                            color:
                              'var(--success)',
                            fontWeight: 700,
                            marginTop:
                              '0.25rem'
                          }}
                        >
                          ✓ VERIFIED
                        </div>

                        <div
                          style={{
                            fontSize:
                              '0.82rem',
                            color:
                              'var(--text-muted)',
                            marginTop:
                              '0.3rem'
                          }}
                        >
                          {selectedIncident.ai_verification_message ||
                            'Resolution verified successfully.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

            </div>

            {/* =================================================
                TIMELINE
            ================================================= */}

            {inspectTimeline &&
              inspectTimeline.length > 0 && (
                <div
                  style={{
                    background:
                      'rgba(7,13,29,0.5)',
                    padding: '1rem',
                    borderRadius:
                      '8px',
                    border:
                      '1px solid var(--border-light)'
                  }}
                >
                  <h3
                    style={{
                      fontSize:
                        '1rem',
                      fontWeight: 700,
                      marginBottom:
                        '1rem'
                    }}
                  >
                    Incident Timeline
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '0.8rem'
                    }}
                  >
                    {inspectTimeline.map(
                      (item, index) => (
                        <div
                          key={
                            item.id ||
                            index
                          }
                          style={{
                            display: 'flex',
                            gap: '0.8rem',
                            alignItems:
                              'flex-start'
                          }}
                        >
                          <div
                            style={{
                              width:
                                '10px',
                              height:
                                '10px',
                              borderRadius:
                                '50%',
                              background:
                                'var(--cyan-primary)',
                              marginTop:
                                '5px',
                              flexShrink: 0
                            }}
                          />

                          <div>
                            <div
                              style={{
                                fontWeight:
                                  700,
                                color:
                                  '#ffffff'
                              }}
                            >
                              {item.status ||
                                item.action ||
                                item.title}
                            </div>

                            {(item.description ||
                              item.message) && (
                                <div
                                  style={{
                                    fontSize:
                                      '0.82rem',
                                    color:
                                      'var(--text-muted)',
                                    marginTop:
                                      '0.2rem'
                                  }}
                                >
                                  {item.description ||
                                    item.message}
                                </div>
                              )}

                            {item.created_at && (
                              <div
                                style={{
                                  fontSize:
                                    '0.72rem',
                                  color:
                                    'var(--text-muted)',
                                  marginTop:
                                    '0.2rem'
                                }}
                              >
                                {new Date(
                                  item.created_at
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

          </div>
        </div>
      )}
    </div>
  );
}