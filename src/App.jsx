import  { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import Dashboard from "./components/Dashboard/Dashboard";
import Legal from "./components/Legal/Legal";
import TopBar from "./components/TopBar/TopBar";
import ChatBot from "./components/ChatBot/ChatBot";
import CryptoList from "./components/CryptoList/CryptoList";
import XmlToExcel from "./components/XmlToExcel/XmlToExcel";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import PropTypes from 'prop-types';
import "./App.css";
const baseUrl = import.meta.env.VITE_API_URL;
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

            //validating user in Database
            // Enviar token a tu backend para autenticación
            const APIresponse = await fetch(baseUrl+'/auth/google', {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userData }),
            });            
      
     const apiData = await APIresponse.json();
    
      //apiData.message : ususario validado con exito
      console.info(apiData.message)
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
      <TopBar user={user} onLogout={handleLogout} onLoginSuccess={handleLoginSuccess} />

        <div className="app-container">
          {/* TopBar */}

              <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/legal" element={<Legal />} />
              
              {/* Admin Layout Routes - with side panel */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route
                  path="chat"
                  element={
                    user ? (
                      <ChatBot user={user}/>
                    ) : (
                      <LoginPrompt onLoginSuccess={handleLoginSuccess} />
                    )
                  }
                />
                <Route
                  path="crypto"
                  element={
                    user ? (
                      <CryptoList user={user}/>
                    ) : (
                      <LoginPrompt onLoginSuccess={handleLoginSuccess} />
                    )
                  }
                />
                <Route
                  path="xml-to-excel"
                  element={
                    user ? (
                      <XmlToExcel/>
                    ) : (
                      <LoginPrompt onLoginSuccess={handleLoginSuccess} />
                    )
                  }
                />
              </Route>
              
              {/* Legacy routes for backward compatibility */}
              <Route
                path="/chat"
                element={
                  user ? (
                    <ChatBot user={user}/>
                  ) : (
                    <LoginPrompt onLoginSuccess={handleLoginSuccess} />
                  )
                }
              />
              <Route
                path="/crypto"
                element={
                  user ? (
                    <CryptoList user={user}/>
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
      <h2>Please log in </h2>
      
      <button className="google-button"  onClick={() => login()}>
          <span className="google-icon"></span>
          <span className="button-text">Login with Google</span>
      </button>
    </div>
  );
};

export default App;
