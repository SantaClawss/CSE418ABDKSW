import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const isAdmin = localStorage.getItem("is_admin") === "true";
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <button
        className="navbar__hamburger"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      <div className={`navbar__links${menuOpen ? ' navbar__links--open' : ''}`}>
        <button className="navbar__btn" onClick={() => handleNav('/home')}>Home</button>
        <button className="navbar__btn" onClick={() => handleNav('/news')}>News</button>
        <button className="navbar__btn" onClick={() => handleNav('/data')}>Data</button>
        <button className="navbar__btn" onClick={() => handleNav('/faq')}>FAQ</button>
        <button className="navbar__btn" onClick={() => handleNav('/biosecurity')}>Biosecurity Guide</button>
        <button className="navbar__btn" onClick={() => handleNav('/education')}>Education</button>
        <button className="navbar__btn" onClick={() => handleNav('/publications')}>Publications</button>
        <button className="navbar__btn" onClick={() => handleNav('/profile')}>Profile</button>
        {isAdmin && (
          <button className="navbar__btn" onClick={() => handleNav('/admin')}>Admin Dashboard</button>
        )}
        <button className="navbar__btn" onClick={() => { localStorage.removeItem("is_admin"); handleNav('/'); }}>Log Out</button>
      </div>
    </nav>
  );
};

export default Navbar;
