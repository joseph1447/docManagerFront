import  { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import Dashboard from "./components/Dashboard/Dashboard";
import Legal from "./components/Legal/Legal";
import TopBar from "./components/TopBar/TopBar";
import XmlToExcel from "./components/XmlToExcel/XmlToExcel";
import PropTypes from 'prop-types';
import SidePanel from "./components/SidePanel/Sidepanel";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(() => {
    // Restaurar sesión desde localStorage al inicializar
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLoginSuccess = (credentialResponse) => {
    const accessToken = credentialResponse.access_token; // Get the access token
    if (accessToken) {
      // Now use the access token to fetch user data
      fetchUserData(accessToken);
    } else {
      console.error('Access token is missing');
    }
  };
  
  const fetchUserData = async (accessToken) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`, // Use the access token for authorization
        },
      });
  
      const userData = await response.json(); // Parse the user data
      console.log(userData); // Now you have the user data
  
      // You can set the user data in the state if needed
      setUser(userData);

      localStorage.setItem("user", JSON.stringify(userData));

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user"); // Eliminar datos de la sesión

  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <div className="app-container">
          {/* TopBar */}
          <TopBar user={user} onLogout={handleLogout} />

            {/* SidePanel */}
            <SidePanel />

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
                <Route
                  path="/xml-to-excel"
                  element={
                    user ? (
                      <XmlToExcel/>
                    ) : (
                      <LoginPrompt onLoginSuccess={handleLoginSuccess} />
                    )
                  }
                />
                <Route path="/legal" element={<Legal />} />
                </Routes>
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
  LoginPrompt.propTypes = {
    onLoginSuccess: PropTypes.func.isRequired,
};
  return (
    <div className="login-prompt">
      <h2>Please log in to access the dashboard</h2>
      <button onClick={() => login()}>Sign in with Google</button>
    </div>
  );
};

export default App;
