import  { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { decode } from 'js-jwt'; // Use the decode method from js-jwt
import Dashboard from "./components/Dashboard/Dashboard";
import Legal from "./components/Legal/Legal";
import TopBar from "./components/TopBar/TopBar";
import SidePanel from "./components/SidePanel/Sidepanel";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (credentialResponse) => {
    const decoded = decode(credentialResponse.credential); // Decoding the JWT
    // setUser(decoded);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <GoogleOAuthProvider clientId="534877991669-d3q43kibggav29bqq52ctftqhlte1toa.apps.googleusercontent.com">
      <Router>
        <div className="app-container">
          {/* TopBar */}
          <TopBar user={user} onLogout={handleLogout} />

          <div className="main-content">
            {/* SidePanel */}
            <SidePanel />

            <div className="content-area">
              <Routes>
                <Route
                  path="/"
                  element={
                    user ? (
                      <Dashboard user={user} />
                    ) : (
                      <LoginPrompt onLoginSuccess={handleLoginSuccess} />
                    )
                  }
                />
                <Route path="/legal" element={<Legal />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
};

const LoginPrompt = ({ onLoginSuccess }) => {
  const login = useGoogleLogin({
    onSuccess: onLoginSuccess,
    onError: () => alert("Login failed. Please try again."),
  });

  return (
    <div className="login-prompt">
      <h2>Please log in to access the dashboard</h2>
      <button onClick={() => login()}>Sign in with Google</button>
    </div>
  );
};

export default App;
