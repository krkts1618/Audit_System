import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Landmark,
  LayoutDashboard,
  Building,
  Boxes,
  Upload,
  Tag,
  Users,
  Settings,
  FileText,
  Wrench,
  LogOut,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Shield,
} from "lucide-react";

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Theme state: defaults to dark mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Click outside listener for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isHod = user?.role === "HOD";

  // Dynamic user details - shows real logged-in username
  const username =
    user?.name ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "User");
  const userRole = user?.role || "HOD";
  const userEmail = user?.email || "";
  const userInitials = username.slice(0, 2).toUpperCase();

  // Active link helper supporting dark and light mode
  const getNavLinkClass = (path) => {
    const active = location.pathname === path;
    if (active) {
      return "bg-indigo-50 dark:bg-indigo-600/30 text-indigo-600 dark:text-white font-semibold border border-indigo-200 dark:border-indigo-500/40 shadow-xs";
    }
    return "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60";
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#0F172A]/95 border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 z-20 transition-colors shadow-xs dark:shadow-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800/80 space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Landmark size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Campus Audit
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {isHod ? (
            <>
              <Link
                to="/hod/dashboard"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/hod/dashboard"
                )}`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/hod/dashboard"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/rooms"
                )}`}
              >
                <Building size={18} />
                <span>Rooms</span>
              </Link>

              <Link
                to="/hod/dashboard"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/assets"
                )}`}
              >
                <Boxes size={18} />
                <span>Assets</span>
              </Link>

              <Link
                to="/hod/ingestion"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/hod/ingestion"
                )}`}
              >
                <Upload size={18} />
                <span>Bulk Upload</span>
              </Link>

              <Link
                to="/hod/dashboard"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/tickets"
                )}`}
              >
                <Tag size={18} />
                <span>Tickets</span>
              </Link>

              <Link
                to="/hod/dashboard"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/users"
                )}`}
              >
                <Users size={18} />
                <span>Users</span>
              </Link>

              <Link
                to="/hod/dashboard"
                className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                  "/hod/settings"
                )}`}
              >
                <Settings size={18} />
                <span>Settings</span>
              </Link>
            </>
          ) : user?.role === "Care Taker" ? (
            <Link
              to="/caretaker/report"
              className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                "/caretaker/report"
              )}`}
            >
              <FileText size={18} />
              <span>Report Defect</span>
            </Link>
          ) : (
            <Link
              to="/fixer/board"
              className={`flex items-center px-4 py-2.5 rounded-xl space-x-3 text-sm transition-all duration-150 ${getNavLinkClass(
                "/fixer/board"
              )}`}
            >
              <Wrench size={18} />
              <span>Maintenance Board</span>
            </Link>
          )}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2.5 space-x-3 text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white/90 dark:bg-[#0F172A]/85 border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-8 flex items-center justify-between backdrop-blur-xl shrink-0 z-10 transition-colors shadow-xs dark:shadow-none">
          {/* Search Box */}
          <div className="relative w-64 sm:w-80">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl pl-9 pr-4 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun size={18} className="text-amber-400" />
              ) : (
                <Moon size={18} className="text-indigo-600" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#0F172A]"></span>
            </button>

            {/* User Profile Button with Dropdown (matching screenshot) */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center space-x-2.5 p-1.5 pl-2 pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/40 transition-all cursor-pointer shadow-xs dark:shadow-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-white/20">
                  {userInitials}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {username}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {userRole}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-2xl py-2 z-30 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Info Card */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {username}
                    </p>
                    {userEmail && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {userEmail}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                        <Shield size={10} />
                        <span>{userRole}</span>
                      </span>
                    </div>
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative p-6 sm:p-10">
          {/* Ambient Glowing Orbs in dark mode */}
          <div className="absolute top-12 right-1/4 w-80 h-80 rounded-full bg-blue-600/15 filter blur-[100px] pointer-events-none dark:opacity-100 opacity-20 transition-opacity"></div>
          <div className="absolute top-1/3 right-10 w-72 h-72 rounded-full bg-indigo-600/15 filter blur-[90px] pointer-events-none dark:opacity-100 opacity-20 transition-opacity"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-purple-600/10 filter blur-[110px] pointer-events-none dark:opacity-100 opacity-15 transition-opacity"></div>

          <div className="relative z-10 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
