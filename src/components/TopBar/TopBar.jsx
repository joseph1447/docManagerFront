import "./TopBar.css";
import logo from '../../assets/JS.svg';

const TopBar = ({ user, onLogout }) => {
  return (
    <div className="topbar">
      <div className="topbar-content">
        <div className="logo">
          <img src={logo} alt="DocManager Logo" />
        </div>
        {user ? (
          <div className="user-info">
            <img
              src={user?.picture || '/path-to-default-avatar.png'}
              alt={user?.name || 'User'}
              className="user-avatar"
            />
            <span>{user?.name || 'Guest'}</span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <span>Please log in</span>
        )}
      </div>
    </div>
  );
};

export default TopBar;
