import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Video, Film, MapPin, AlertCircle, ArrowRight, Loader2, Sparkles, RefreshCw, X, Circle, StopCircle, ArrowLeft, Trash2 } from 'lucide-react';
import axios from 'axios';
const CATEGORIES = [
  { id: 'water_leakage', name: 'Water Leakage', icon: '💧', desc: 'Pipe bursts, municipal water leaks & flooding' },
  { id: 'garbage_overflow', name: 'Garbage Overflow', icon: '🗑️', desc: 'Overflowing dumpsters & uncollected waste' },
  { id: 'fire_accident', name: 'Fire Accident', icon: '🔥', desc: 'Active fire hazard & emergency situations' },
  { id: 'fallen_tree', name: 'Fallen Tree', icon: '🌳', desc: 'Blocked roads & dangerous fallen branches' },
  { id: 'road_damage', name: 'Road Damage', icon: '🛣️', desc: 'Potholes, cracks & damaged road surfaces' },
  { id: 'streetlight_failure', name: 'Streetlight Failure', icon: '💡', desc: 'Broken street lamps & dark public zones' },
];
export default function Report() {
  const navigate = useNavigate();
  // Navigation State: null = Category Selection Screen; Object = Evidence Reporting Screen
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeOption, setActiveOption] = useState(null); // 'capture_photo', 'upload_photo', 'record_video', 'upload_video'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  // Geolocation state
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [address, setAddress] = useState('Detecting GPS location...');
  const [locLoading, setLocLoading] = useState(true);
  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Hidden File Inputs
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  // Photo Camera Modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const photoVideoRef = useRef(null);
  const photoStreamRef = useRef(null);
  // Video Recording Modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRecordStreamRef = useRef(null);
  const videoRecordPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef(null);
  // Auto request GPS on mount
  useEffect(() => {
    fetchLocation();
  }, []);
  const fetchLocation = () => {
    setLocLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCoords({ lat, lon });
          setAddress(`GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
          setLocLoading(false);
        },
        (err) => {
          console.warn('Geolocation denied/unavailable:', err);
          setCoords({ lat: null, lon: null });
          setAddress('Location unavailable');
          setLocLoading(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setCoords({ lat: null, lon: null });
      setAddress('Location unavailable');
      setLocLoading(false);
    }
  };
  // Helper to handle selecting category
  const handleSelectCategory = (categoryObj) => {
    setSelectedCategory(categoryObj);
    setError(null);
  };
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    handleRemoveEvidence();
  };
  // Discard / Remove Evidence Handler
  const handleRemoveEvidence = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setActiveOption(null);
    setError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };
  // --- OPTION 1: CAPTURE PHOTO ---
  const startPhotoCamera = async () => {
    setShowPhotoModal(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      photoStreamRef.current = stream;
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Camera access denied or unavailable on this device.');
      setShowPhotoModal(false);
    }
  };
  const capturePhotoSnapshot = () => {
    if (photoVideoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = photoVideoRef.current.videoWidth || 640;
      canvas.height = photoVideoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(photoVideoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const capturedFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        setIsVideo(false);
        setPreviewUrl(URL.createObjectURL(capturedFile));
        setActiveOption('capture_photo');
        closePhotoCamera();
      }, 'image/jpeg');
    }
  };
  const closePhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowPhotoModal(false);
  };
  // --- OPTION 2: UPLOAD PHOTO ---
  const handlePhotoUploadChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setIsVideo(false);
      setPreviewUrl(URL.createObjectURL(selected));
      setActiveOption('upload_photo');
      setError(null);
    }
  };
  // --- OPTION 3: RECORD VIDEO ---
  const startVideoRecorderModal = async () => {
    setShowVideoModal(true);
    setIsRecording(false);
    setRecordingSeconds(0);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      videoRecordStreamRef.current = stream;
      if (videoRecordPreviewRef.current) {
        videoRecordPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Video recorder error:', err);
      alert('Camera/Microphone access denied or unavailable.');
      setShowVideoModal(false);
    }
  };
  const startVideoRecording = () => {
    if (!videoRecordStreamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(videoRecordStreamRef.current, { mimeType: 'video/webm' });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const recordedFile = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        setFile(recordedFile);
        setIsVideo(true);
        setPreviewUrl(URL.createObjectURL(recordedFile));
        setActiveOption('record_video');
        closeVideoRecorderModal();
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      alert('Video recording is not supported in this browser format.');
    }
  };
  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };
  const closeVideoRecorderModal = () => {
    if (isRecording) {
      stopVideoRecording();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (videoRecordStreamRef.current) {
      videoRecordStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowVideoModal(false);
  };
  // --- OPTION 4: UPLOAD VIDEO ---
  const handleVideoUploadChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setIsVideo(true);
      setPreviewUrl(URL.createObjectURL(selected));
      setActiveOption('upload_video');
      setError(null);
    }
  };
  // --- SUBMIT REPORT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or capture photo or video evidence before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('evidence', file);
      if (coords.lat !== null && coords.lon !== null) {
        formData.append('latitude', coords.lat);
        formData.append('longitude', coords.lon);
      }
      if (selectedCategory && selectedCategory.id) {
        formData.append('hint_category', selectedCategory.id);
      }
      // Read logged in user if available
      const storedUser = localStorage.getItem('sensegen_user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj && userObj.id) {
            formData.append('user_id', userObj.id);
          }
        } catch (uErr) { }
      }
      const res = await axios.post('/api/incidents/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.incident_id) {
        navigate(`/track?id=${res.data.incident_id}`);
      }
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
      setSubmitting(false);
    }
  };
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ---------------------------------------------------- */}
      {/* SCREEN 1: CATEGORY SELECTION VIEW (If null)           */}
      {/* ---------------------------------------------------- */}
      {selectedCategory === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Report a Civic Issue
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
              Select a category to start your report, or choose AI Auto-Detect.
            </p>
          </div>
          {/* 6 Category Cards Grid (3 Columns x 2 Rows) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem' }}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem',
                  padding: '1.4rem'
                }}
              >
                <div style={{ fontSize: '2.2rem' }}>{cat.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {cat.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Centered AI Auto-Detect Card (Below the 6 Category Cards) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <div
              onClick={() => handleSelectCategory({ id: null, name: 'AI Auto-Detect', icon: '✨', desc: 'Let YOLO11 AI automatically identify the category' })}
              className="card card-hover"
              style={{
                cursor: 'pointer',
                border: '2px dashed var(--cyan-primary)',
                background: 'rgba(0, 242, 254, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                padding: '1.4rem',
                width: '100%',
                maxWidth: '340px'
              }}
            >
              <div style={{ fontSize: '2.2rem' }}>✨</div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--cyan-primary)', fontSize: '1.05rem' }}>
                  AI Auto-Detect
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Automatically detect category using YOLO11
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ---------------------------------------------------- */}
      {/* SCREEN 2: EVIDENCE REPORTING VIEW (If selected)       */}
      {/* ---------------------------------------------------- */}
      {selectedCategory !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top Bar with Back Button & Category Title */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--cyan-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={handleBackToCategories}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
              >
                <ArrowLeft size={16} /> Change Category
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.8rem' }}>{selectedCategory.icon}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SELECTED CATEGORY</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
                    {selectedCategory.name}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Step 2 of 2
            </div>
          </div>
          {/* Evidence Section: 4 Options 2x2 Grid */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
              PROVIDE PHOTO OR VIDEO EVIDENCE
            </h3>
            {/* 2x2 Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem' }}>
              {/* Option 1: CAPTURE PHOTO */}
              <div
                onClick={startPhotoCamera}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  border: activeOption === 'capture_photo' ? '2px solid var(--cyan-primary)' : '1px solid var(--border-light)',
                  background: activeOption === 'capture_photo' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)',
                  boxShadow: activeOption === 'capture_photo' ? '0 0 16px rgba(0, 242, 254, 0.25)' : 'none',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem'
                }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.12)', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Camera size={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                    CAPTURE PHOTO
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Use device camera to capture the issue.
                  </div>
                </div>
              </div>
              {/* Option 2: UPLOAD PHOTO */}
              <div
                onClick={() => photoInputRef.current && photoInputRef.current.click()}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  border: activeOption === 'upload_photo' ? '2px solid var(--cyan-primary)' : '1px solid var(--border-light)',
                  background: activeOption === 'upload_photo' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)',
                  boxShadow: activeOption === 'upload_photo' ? '0 0 16px rgba(0, 242, 254, 0.25)' : 'none',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem'
                }}
              >
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  onChange={handlePhotoUploadChange}
                  style={{ display: 'none' }}
                />
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.12)', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Upload size={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                    UPLOAD PHOTO
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Upload an existing image.
                  </div>
                </div>
              </div>
              {/* Option 3: RECORD VIDEO */}
              <div
                onClick={startVideoRecorderModal}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  border: activeOption === 'record_video' ? '2px solid var(--cyan-primary)' : '1px solid var(--border-light)',
                  background: activeOption === 'record_video' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)',
                  boxShadow: activeOption === 'record_video' ? '0 0 16px rgba(0, 242, 254, 0.25)' : 'none',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem'
                }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.12)', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Video size={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                    RECORD VIDEO
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Record a short video of the issue.
                  </div>
                </div>
              </div>
              {/* Option 4: UPLOAD VIDEO */}
              <div
                onClick={() => videoInputRef.current && videoInputRef.current.click()}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  border: activeOption === 'upload_video' ? '2px solid var(--cyan-primary)' : '1px solid var(--border-light)',
                  background: activeOption === 'upload_video' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)',
                  boxShadow: activeOption === 'upload_video' ? '0 0 16px rgba(0, 242, 254, 0.25)' : 'none',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem'
                }}
              >
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  onChange={handleVideoUploadChange}
                  style={{ display: 'none' }}
                />
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.12)', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Film size={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                    UPLOAD VIDEO
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Upload an existing video.
                  </div>
                </div>
              </div>
            </div>
            {/* Selected Evidence Preview Container */}
            {previewUrl && (
              <div className="card" style={{ position: 'relative', background: 'rgba(7, 13, 29, 0.85)', border: '1px dashed var(--cyan-primary)', textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                    Selected Evidence Preview ({file?.name || 'Evidence Captured'})
                  </div>
                  {/* Remove / Discard Evidence Button */}
                  <button
                    type="button"
                    onClick={handleRemoveEvidence}
                    className="btn btn-danger"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem', borderRadius: '6px' }}
                    title="Discard evidence and select again"
                  >
                    <X size={15} /> Remove
                  </button>
                </div>
                {isVideo ? (
                  <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                ) : (
                  <img src={previewUrl} alt="Evidence Preview" style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '8px', objectFit: 'contain' }} />
                )}
              </div>
            )}
            {/* Geolocation Details Container */}
            <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <MapPin size={22} color="var(--cyan-primary)" />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>AUTOMATIC GPS LOCATION</div>
                  <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 500 }}>
                    {locLoading ? 'Detecting browser geolocation...' : address}
                  </div>
                </div>
              </div>
              <button onClick={fetchLocation} style={{ background: 'none', border: 'none', color: 'var(--cyan-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <RefreshCw size={16} />
              </button>
            </div>
            {/* Error Notification */}
            {error && (
              <div style={{ padding: '0.8rem 1rem', background: 'rgba(255, 61, 113, 0.15)', border: '1px solid rgba(255, 61, 113, 0.3)', color: '#ff3d71', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            {/* Action Button: REPORT ISSUE */}
            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '1.1rem', fontSize: '1.15rem', justifyContent: 'center' }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={24} className="animate-spin" /> Analyzing Evidence with YOLO11 AI & Creating Incident...
                  </>
                ) : (
                  <>
                    <Sparkles size={22} /> SUBMIT REPORT FOR {selectedCategory.name.toUpperCase()} <ArrowRight size={22} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PHOTO CAMERA MODAL */}
      {showPhotoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--cyan-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 700 }}>Capture Photo</h3>
              <button onClick={closePhotoCamera} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <video ref={photoVideoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '420px', borderRadius: '8px', background: '#000', objectFit: 'cover' }} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button onClick={closePhotoCamera} className="btn btn-secondary">Cancel</button>
              <button onClick={capturePhotoSnapshot} className="btn btn-primary">
                <Camera size={18} /> Take Snapshot & Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VIDEO RECORDING MODAL */}
      {showVideoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--cyan-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 700 }}>Record Video</h3>
              <button onClick={closeVideoRecorderModal} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ position: 'relative' }}>
              <video ref={videoRecordPreviewRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '420px', borderRadius: '8px', background: '#000', objectFit: 'cover' }} />
              {isRecording && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255, 61, 113, 0.9)', color: '#ffffff', padding: '0.4rem 0.8rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Circle size={12} fill="#ffffff" className="animate-pulse" /> Recording: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button onClick={closeVideoRecorderModal} className="btn btn-secondary">Cancel</button>
              {!isRecording ? (
                <button onClick={startVideoRecording} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ff3d71, #ffaa00)', color: '#fff' }}>
                  <Circle size={18} /> Start Video Recording
                </button>
              ) : (
                <button onClick={stopVideoRecording} className="btn btn-primary" style={{ background: 'var(--cyan-primary)', color: '#070d1d' }}>
                  <StopCircle size={18} /> Stop Recording & Use Video
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}