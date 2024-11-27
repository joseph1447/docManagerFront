import { Link } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-layout">

      {/* Main Content */}
      <main className="dashboard-content">
        <h2>Welcome to DocManager!</h2>
        <p>Select a tool to get started:</p>
        <div className="tool-card">
          <Link to="/xml-to-excel">
            <h3>XML to Excel</h3>
            <p>Convert multiple XML files into a unified Excel sheet.</p>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
