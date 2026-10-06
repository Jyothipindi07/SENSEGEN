import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Camera, Shield, Search, LayoutDashboard, UserCheck } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand-logo">
          <div className="brand-icon">S</div>
          <div>
            <div className="brand-text-title">SENSEGEN</div>
            <div className="brand-tagline">See it. Snap it. Solved.</div>
          </div>
        </Link>

        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/report" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Report Issue
            </NavLink>
          </li>
          <li>
            <NavLink to="/track" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Track
            </NavLink>
          </li>
          <li>
            <NavLink to="/user" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              User Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Admin Dashboard
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
