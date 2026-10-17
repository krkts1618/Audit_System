import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Wrench,
  LogOut,
  UploadCloud,
} from "lucide-react";

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Helper function to highlight the active sidebar link
  const isActive = (path) =>
    location.pathname === path
      ? "bg-indigo-500/20 text-indigo-400 border-r-4 border-indigo-500"
      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

  return (
    <div className="flex h-screen bg-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col backdrop-blur-xl">
        {/* Brand & User Profile */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white tracking-wider">
            CAMPUS AUDIT
          </h1>
          <div className="mt-6 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-indigo-400 font-semibold">
                {user?.role || "Role"}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Links */}
        <nav className="flex-1 py-6 flex flex-col gap-2">
          {user?.role === "HOD" && (
            <>
              <Link
                to="/hod/dashboard"
                className={`flex items-center px-6 py-3 space-x-3 transition-colors ${isActive("/hod/dashboard")}`}
              >
                <LayoutDashboard size={20} />
                <span className="font-medium">Overview</span>
              </Link>
              <Link
                to="/hod/ingestion"
                className={`flex items-center px-6 py-3 space-x-3 transition-colors ${isActive("/hod/ingestion")}`}
              >
                <UploadCloud size={20} />
                <span className="font-medium">Upload Assets</span>
              </Link>
            </>
          )}

          {user?.role === "Care Taker" && (
            <Link
              to="/caretaker/report"
              className={`flex items-center px-6 py-3 space-x-3 transition-colors ${isActive("/caretaker/report")}`}
            >
              <FileText size={20} />
              <span className="font-medium">Report Defect</span>
            </Link>
          )}

          {user?.role === "Fixer" && (
            <Link
              to="/fixer/board"
              className={`flex items-center px-6 py-3 space-x-3 transition-colors ${isActive("/fixer/board")}`}
            >
              <Wrench size={20} />
              <span className="font-medium">Maintenance Board</span>
            </Link>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 space-x-3 text-slate-400 hover:text-crimson-500 hover:bg-crimson-500/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="ambient-orb-indigo top-0 right-0 opacity-40 pointer-events-none"></div>
        <div className="p-8">
          <Outlet /> {/* React Router injects the specific page here */}
        </div>
      </main>
    </div>
  );
};

export default Layout;
