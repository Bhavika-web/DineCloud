
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  LogOut,
  Menu,
  X,
  Utensils,
  Bell,
  UserCircle
} from "lucide-react";

import '../../styles/admin.css';

function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminData");
    navigate("/admin/login", { replace: true });
  };

  const adminData = JSON.parse(
    sessionStorage.getItem("adminData") || "{}"
  );

  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>

        <div className="admin-sidebar-brand">
          <div className="admin-logo-icon">
            <Utensils size={24} />
          </div>

          <span>DineCloud</span>

          <button
            className="admin-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <div className="admin-sidebar-label">
          MAIN MENU
        </div>

        <nav className="admin-navigation">

          {/* Dashboard */}
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </NavLink>

          {/* Order Management */}
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <ShoppingBag size={19} />
            <span>Order Management</span>
          </NavLink>

          {/* Inventory Management */}
          <NavLink
            to="/admin/inventory"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Package size={19} />
            <span>Inventory Management</span>
          </NavLink>

        </nav>

        <div className="admin-sidebar-bottom">

          <div className="admin-sidebar-profile">
            <div className="admin-profile-avatar">
              <UserCircle size={27} />
            </div>

            <div className="admin-profile-info">
              <strong>{adminData.name || "Administrator"}</strong>
              <span>Admin Account</span>
            </div>
          </div>

          <button
            className="admin-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* Main Content */}
      <div className="admin-main">

        <header className="admin-header">

          <button
            className="admin-mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={23} />
          </button>

          <div className="admin-header-title">
            <span>RESTAURANT MANAGEMENT</span>
            <h2>Admin Portal</h2>
          </div>

          <div className="admin-header-right">

            <div className="admin-notification-icon">
              <Bell size={20} />
            </div>

            <div className="admin-header-user">
              <div className="admin-header-avatar">
                <UserCircle size={25} />
              </div>

              <span>{adminData.name || "Admin"}</span>
            </div>

          </div>

        </header>

        <main className="admin-page-content">
          <Outlet />
        </main>

      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

    </div>
  );
}

export default AdminLayout;
