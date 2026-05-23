import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProfileProps } from './types';
import './Profile.css';

export const Profile: React.FC<ProfileProps> = ({
  fullName,
  email,
  gender,
  height,
  weight,
  goal,
}) => {
  const navigate = useNavigate();

  return (
    <div className="lumina-profile-layout">
      <div className="lumina-profile-card">
        <div className="lumina-profile-avatar-large">
          <img 
            alt="User Profile Photo" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3vRdcAG9t6iFC5DAgdJAW_2xrU33Y5jWF3VTnvuT6g1_txVlo9IKcYRWZLDe7MgGQ4oDQoa78iHbt7RNXwIIUtmdbkDEcD-JTsxkq64qt13q97fhxO8p8ZzBn_Ri15-QgWhsW3f0QAjI-nrChR0yjI4vx5cRkmb0rrzVL6_yHAG9p1-9IaKUzooqUs3icFjuaw9qGLIw6vyp2WQ-MyxyQFwBxT7Cm9LLm1oLZR-pvMeHoR0IkOXnyWvrVn2O1W-3JerDeNtItYgrg" 
          />
        </div>
        <h2 className="lumina-profile-name">{fullName}</h2>
        <span className="lumina-profile-email">{email}</span>
        
        <div className="lumina-profile-stats-grid">
          <div className="lumina-profile-stat-box">
            <div className="lumina-profile-stat-val" style={{ textTransform: 'capitalize' }}>{gender}</div>
            <div className="lumina-profile-stat-lbl">Gender</div>
          </div>
          <div className="lumina-profile-stat-box">
            <div className="lumina-profile-stat-val">{height}</div>
            <div className="lumina-profile-stat-lbl">Height</div>
          </div>
          <div className="lumina-profile-stat-box">
            <div className="lumina-profile-stat-val">{weight}</div>
            <div className="lumina-profile-stat-lbl">Weight</div>
          </div>
          <div className="lumina-profile-stat-box" style={{ gridColumn: 'span 3' }}>
            <div className="lumina-profile-stat-val" style={{ textTransform: 'capitalize' }}>
              {goal.replace('_', ' ')}
            </div>
            <div className="lumina-profile-stat-lbl">Active Strategy</div>
          </div>
        </div>

        <button 
          className="lumina-ai-btn" 
          style={{ width: '100%', padding: '12px', height: 'auto', border: '1px solid #ba1a1a', color: '#ba1a1a', background: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => navigate('/login')}
        >
          Sign Out
        </button>
      </div>

      <div className="lumina-weekly-card">
        <h3 className="lumina-weekly-title" style={{ fontSize: '16px', marginBottom: '16px' }}>On-Device Privacy Profile</h3>
        <p style={{ fontSize: '14px', lineHeight: '22px', color: 'var(--on-surface-variant)', margin: '0 0 16px 0' }}>
          Your Gemi profile resides strictly in your offline browser sandboxed storage. Your personal information, fitness logs, and AI conversations never touch the cloud, honoring strict data dignity policies.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--surface-bright)', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Gemma AI Weights</span>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Active Local (2.2B)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--surface-bright)', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Data Encryption</span>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>AES-GCM Local</span>
          </div>
        </div>
      </div>
    </div>
  );
};
