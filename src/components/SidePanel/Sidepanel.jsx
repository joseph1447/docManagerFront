import { useState } from "react";
import { Link } from "react-router-dom";
import "./SidePanel.css";
import { FaBars, FaTachometerAlt, FaLock, FaChevronLeft } from "react-icons/fa"; // Importamos íconos desde react-icons

const SidePanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  const menuItems = [
    { path: "/", icon: <FaTachometerAlt />, label: "Dashboard" },
    { path: "/xml-to-excel", icon: <FaTachometerAlt />, label: "XML To Excel" },
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
