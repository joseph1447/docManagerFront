import "./TopBar.css";

const TopBar = ({ user, onLogout }) => {
  
  return (
    <div className="topbar">
      <div className="topbar-content">
        <div className="logo">DocManager</div>
        {user ? (
          <div className="user-info">
            <img
              src={user.picture}
              alt={user.name || "User"}
              className="user-avatar"
            />
            <span>{user.name}</span>
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
