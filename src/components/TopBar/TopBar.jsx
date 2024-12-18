import PropTypes from 'prop-types';
import "./TopBar.css";
import logo from '../../assets/JS.svg';
import { useGoogleLogin } from '@react-oauth/google';

const TopBar = ({ 
  user = null, 
  onLogout, 
  onLoginSuccess
}) => {
  const login = useGoogleLogin({
    onSuccess: onLoginSuccess,
    onError: () => alert("Login failed. Please try again."),
  });

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
          <button className="google-button"  onClick={login}>
          <span className="google-icon"></span>
          <span className="button-text">Login with Google</span>
          </button>
        )}
      </div>
    </div>
  );
};

TopBar.propTypes = {
  user: PropTypes.shape({
    picture: PropTypes.string,
    name: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
};

export default TopBar;