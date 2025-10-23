import { Outlet } from "react-router-dom";
import SidePanel from "../SidePanel/Sidepanel";
import "./AdminLayout.css";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <SidePanel />
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
