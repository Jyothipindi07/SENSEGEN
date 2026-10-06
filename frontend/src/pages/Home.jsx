import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Cpu, MapPin, AlertTriangle, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const workflowSteps = [
    { num: '01', title: 'REPORT', desc: 'Citizen captures or uploads photo or video', icon: Camera },
    { num: '02', title: 'AI DETECTION', desc: 'YOLO11 detects the civic issue automatically', icon: Cpu },
    { num: '03', title: 'LOCATION', desc: 'Browser GPS identifies exact location', icon: MapPin },
    { num: '04', title: 'PRIORITY', desc: 'AI determines severity and priority level', icon: AlertTriangle },
    { num: '05', title: 'DEPARTMENT', desc: 'Report is routed to appropriate authority', icon: Building2 },
    { num: '06', title: 'RESOLUTION', desc: 'Authority completes work & uploads proof', icon: CheckCircle2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '3rem' }}>
      
      {/* Small Compact AICW 2.0 Banner at Top of Home Page */}
      <section className="card" style={{ 
        background: 'rgba(13, 23, 46, 0.85)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px',
        padding: '0.8rem 1.4rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        {/* Title on Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--cyan-primary), var(--blue-accent))', 
            color: '#070d1d', 
            fontWeight: 800, 
            fontSize: '0.8rem', 
            padding: '0.3rem 0.65rem', 
            borderRadius: '6px',
            letterSpacing: '0.05em'
          }}>
            AICW 2.0
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              AICW 2.0 — Artificial Intelligence Career for Women Program
            </div>
          </div>
        </div>

        {/* 5-Logo Group Centered in right-center banner space */}
        <div style={{ 
          flex: 1,
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '2.2rem',
          paddingLeft: '0.5rem',
          paddingRight: '0.5rem'
        }}>
          {/* 1. Microsoft */}
          <img 
            src="/logos/microsoft.svg" 
            alt="Microsoft" 
            style={{ height: '26px', width: 'auto', objectFit: 'contain' }} 
          />

          {/* 2. Edunet Foundation */}
          <img 
            src="/logos/edunet.svg" 
            alt="edunet foundation" 
            style={{ height: '28px', width: 'auto', objectFit: 'contain' }} 
          />

          {/* 3. MSDE / Government of India */}
          <img 
            src="/logos/msde_hd.svg" 
            alt="Ministry of Skill Development And Entrepreneurship" 
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }} 
          />

          {/* 4. Skill AP / APSSDC */}
          <img 
            src="/logos/skillap_hd.svg" 
            alt="Skill AP / APSSDC" 
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }} 
          />

          {/* 5. SAP */}
          <img 
            src="/logos/sap.svg" 
            alt="SAP" 
            style={{ height: '26px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>
      </section>

      {/* Hero Section */}
      <section style={{ textTransform: 'none', textAlign: 'center', paddingTop: '1.5rem', paddingBottom: '2rem', background: 'radial-gradient(circle at center, rgba(0, 242, 254, 0.08) 0%, transparent 70%)' }}>
        <div style={{ display: 'inline-block', padding: '0.4rem 1.2rem', borderRadius: '50px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.25)', color: 'var(--cyan-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
          AI-POWERED CIVIC REPORTING PLATFORM
        </div>

        <h1 style={{ fontSize: '3.8rem', fontWeight: 800, marginBottom: '0.8rem', lineHeight: 1.1 }}>
          SENSEGEN
        </h1>
        
        <p style={{ fontSize: '1.6rem', color: 'var(--cyan-primary)', fontWeight: 600, marginBottom: '1.8rem', letterSpacing: '0.02em' }}>
          See it. Snap it. Solved.
        </p>

        <p style={{ maxWidth: '780px', margin: '0 auto 2.5rem', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.7 }}>
          SenseGen is an AI-powered civic reporting platform that allows citizens to report public problems using a single photo or video. AI automatically identifies the issue, determines its location and priority, and routes the report to the appropriate department.
        </p>

        <div>
          <button onClick={() => navigate('/report')} className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}>
            REPORT AN ISSUE <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Workflow Section */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Automated Lifecycle Workflow</h2>
          <p style={{ color: 'var(--text-muted)' }}>From citizen report to AI verification and department resolution</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {workflowSteps.map((step) => {
            const IconComp = step.icon;
            return (
              <div key={step.num} className="card card-hover" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(0, 242, 254, 0.15)', position: 'absolute', right: '1.2rem', top: '0.8rem' }}>
                  {step.num}
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <IconComp size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
                  {step.num} {step.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
