import { useState } from "react";
import { Link } from "react-router-dom";
import "./SidePanel.css";
import { FaBars, FaHome, FaLock, FaChevronLeft,FaBookReader, FaRobot } from "react-icons/fa"; // Importamos íconos desde react-icons

const SidePanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { path: "/", icon: <FaHome />, label: "Dashboard" },
    { path: "/xml-to-excel", icon: <FaBookReader />, label: "XML To Excel" },
    { path: "/chat", icon: <FaRobot />, label: "AI ChatBot" },
    { path: "/legal", icon: <FaLock />, label: "Política de Privacidad" },
    // Agrega más opciones aquí
  ];

  return (
    <div className={`sidepanel ${isExpanded ? "expanded" : "collapsed"}`}>
      <button
        className="toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <FaChevronLeft /> : <FaBars />}
      </button>
      <div className="sidepanel-links">
        {menuItems.map((item, index) => (
          <Link to={item.path} key={index} className="sidepanel-item">
            <div className="icon">{item.icon}</div>
            {isExpanded && <span className="label">{item.label}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SidePanel;
