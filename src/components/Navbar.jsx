import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import laxmiLogo from '../assets/laxmi-logo.png';
import './Navbar.css';

const Navbar = ({ onAdminClick, onHomeClick }) => {
    const location = useLocation();

    return (
        <nav className="main-navbar">
            <div className="nav-container">
                <div className="nav-left">
                    <Link to="/" onClick={onHomeClick} className="nav-brand" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                            src={laxmiLogo} 
                            alt="Laxmi Credit Icon" 
                            style={{ height: '36px', width: 'auto', objectFit: 'contain' }} 
                        />
                        <span 
                            style={{ 
                                fontSize: '1.8rem', 
                                fontWeight: 900, 
                                fontStyle: 'italic', 
                                fontFamily: "'Mulish', 'Plus Jakarta Sans', sans-serif", 
                                letterSpacing: '-0.8px',
                                background: 'linear-gradient(135deg, #F58220 0%, #1E40AF 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                            }}
                        >
                            Laxmi credit
                        </span>
                    </Link>
                </div>
                <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="nav-links" style={{ display: 'flex', gap: '20px' }}>
                        <Link 
                            to="/personal-loan" 
                            className={`nav-item ${location.pathname === '/personal-loan' ? 'active' : ''}`}
                            onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
                            style={{ textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}
                        >
                            Personal Loan & BT
                        </Link>
                        <Link 
                            to="/top-up-loan" 
                            className={`nav-item ${location.pathname === '/top-up-loan' ? 'active' : ''}`}
                            onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
                            style={{ textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}
                        >
                            Loan Top-Up
                        </Link>
                        <Link 
                            to="/od-limit" 
                            className={`nav-item ${location.pathname === '/od-limit' ? 'active' : ''}`}
                            onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
                            style={{ textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}
                        >
                            OD Limit
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
