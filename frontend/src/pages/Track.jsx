import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, Building2, User, AlertCircle, CheckCircle, Clock, ShieldCheck, FileCheck2, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const getImageUrl = (pathStr) => {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('data:')) {
    return pathStr;
  }
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `http://localhost:5000${cleanPath}`;
};

export default function Track() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get('id') || '';

  const [searchId, setSearchId] = useState(queryId);
  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (queryId) {
      setSearchId(queryId);
      fetchIncident(queryId);
    }
  }, [queryId]);

  const fetchIncident = async (idToFetch) => {
    if (!idToFetch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/incidents/track/${encodeURIComponent(idToFetch.trim())}`);
      setIncident(res.data.incident);
      setTimeline(res.data.timeline || []);
    } catch (err) {
      console.error('Track fetch error:', err);
      setIncident(null);
      setTimeline([]);
      setError(err.response?.data?.error || `Incident ID "${idToFetch}" not found.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      setSearchParams({ id: searchId.trim() });
      fetchIncident(searchId.trim());
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REPORT_SUBMITTED':
        return <span className="badge badge-submitted">REPORT SUBMITTED</span>;
      case 'ACCEPTED':
        return <span className="badge badge-accepted">ACCEPTED</span>;
      case 'ACTION_IN_PROGRESS':
        return <span className="badge badge-progress">ACTION IN PROGRESS</span>;
      case 'RESOLUTION_PROOF_UPLOADED':
        return <span className="badge badge-progress">PROOF UPLOADED</span>;
      case 'AI_VERIFICATION_COMPLETED':
        return <span className="badge badge-progress">AI VERIFIED</span>;
      case 'SOLVED':
        return <span className="badge badge-solved">PROBLEM SOLVED</span>;
      default:
        return <span className="badge badge-submitted">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Search Bar Header */}
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          Track Incident Status
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Enter your unique Incident ID (e.g., SG-KKD-1072) to view live progress and resolution proof.
        </p>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', maxWidth: '540px', margin: '0 auto' }}>
          <input 
            type="text" 
            placeholder="Enter Incident ID (SG-KKD-XXXX)" 
            value={searchId} 
            onChange={(e) => setSearchId(e.target.value)}
            className="form-input" 
            style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Search size={18} /> {loading ? 'Searching...' : 'Track'}
          </button>
        </form>
      </div>

      {/* Error / Not Found */}
      {error && (
        <div className="card" style={{ border: '1px solid rgba(255, 61, 113, 0.3)', background: 'rgba(255, 61, 113, 0.1)', textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={40} color="#ff3d71" style={{ marginBottom: '0.8rem' }} />
          <h3 style={{ color: '#ff3d71', marginBottom: '0.4rem' }}>Incident Not Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      )}

      {/* Incident Details Card */}
      {incident && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Main Info Header */}
          <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid var(--cyan-primary)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
                  {incident.incident_id}
                </h2>
                {getStatusBadge(incident.status)}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Category: {incident.category_display || incident.category}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PRIORITY & SEVERITY</div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
                <span className="badge badge-p1">{incident.priority}</span>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                  {incident.severity}
                </span>
              </div>
            </div>
          </div>

          {/* Department & Authority Info */}
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <Building2 size={22} color="var(--cyan-primary)" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESPONSIBLE DEPARTMENT</div>
                <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600, marginTop: '0.2rem' }}>
                  {incident.department}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <User size={22} color="var(--cyan-primary)" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ASSIGNED AUTHORITY</div>
                <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600, marginTop: '0.2rem' }}>
                  {incident.authority}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <MapPin size={22} color="var(--cyan-primary)" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>INCIDENT LOCATION</div>
                <div style={{ fontSize: '0.9rem', color: '#ffffff', marginTop: '0.2rem' }}>
                  {incident.address}
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Evidence (Citizen Photo + YOLO Bounding Box) */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem', color: '#ffffff' }}>
              Submitted Evidence & AI Detection
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  CITIZEN ORIGINAL SUBMISSION
                </div>
                <img 
                  src={getImageUrl(incident.submitted_image)} 
                  alt="Citizen Submission" 
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }} 
                />
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--cyan-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  YOLO11 AI ANNOTATED EVIDENCE ({(incident.confidence * 100).toFixed(1)}% CONFIDENCE)
                </div>
                <img 
                  src={getImageUrl(incident.annotated_image || incident.submitted_image)} 
                  alt="YOLO Detection" 
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan-primary)' }} 
                />
              </div>
            </div>
          </div>

          {/* Timeline Lifecycle */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem', color: '#ffffff' }}>
              Incident Lifecycle & Progress Timeline
            </h3>

            <div className="timeline-container">
              {timeline.map((step) => (
                <div key={step.id} className={`timeline-item ${step.completed ? 'completed' : ''}`}>
                  <div className="timeline-dot">
                    {step.completed ? '✓' : '○'}
                  </div>
                  <div className="timeline-title">
                    {step.title}
                  </div>
                  <div className="timeline-desc">
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RESOLUTION PROOF (Displayed when uploaded / solved) */}
          {(incident.resolution_proof || incident.status === 'SOLVED') && (
            <div className="card" style={{ border: '2px solid var(--success)', background: 'rgba(0, 230, 118, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                <ShieldCheck size={28} color="var(--success)" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>
                    OFFICIAL RESOLUTION PROOF
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Verified by Department Authority & AI Resolution Inspection
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                <div>
                  <img 
                    src={getImageUrl(incident.resolution_proof)} 
                    alt="Official Resolution Proof" 
                    style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid var(--success)' }} 
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
                    New resolution proof photo uploaded by department authority
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(7, 13, 29, 0.8)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLUTION DESCRIPTION</div>
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', marginTop: '0.4rem', lineHeight: 1.5 }}>
                      {incident.resolution_description || 'Department field team completed required maintenance and repairs.'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(7, 13, 29, 0.8)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>AI VERIFICATION RESULT</div>
                    <div style={{ fontSize: '0.9rem', color: '#ffffff', marginTop: '0.4rem' }}>
                      {incident.ai_verification_message || 'YOLO AI Verification Successful: Problem verified resolved.'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(7, 13, 29, 0.8)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLVING AUTHORITY</div>
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, marginTop: '0.2rem' }}>
                      {incident.department} ({incident.authority})
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
