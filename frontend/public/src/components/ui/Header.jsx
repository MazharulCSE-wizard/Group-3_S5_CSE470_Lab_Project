import { LogOut, Briefcase, Heart, Clock, Bell, LayoutDashboard, User, Menu, X, Sun, Moon } from "lucide-react";
import { useSyncExternalStore, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import { useTheme } from "../../context/ThemeContext";
import Dashboard from "@/pages/Dashboard";

function subscribeToStorage(callback) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getTokenSnapshot() {
  return localStorage.getItem("token");
}

function getServerSnapshot() {
  return null;
}

export default function Header() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const token = useSyncExternalStore(
    subscribeToStorage,
    getTokenSnapshot,
    getServerSnapshot
  );

  const user = token ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const isAdmin = user?.role === "admin";
  const isSeeker = user?.role === "seeker";
  const isCompany = user?.role === "company";
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (token && (isCompany || isAdmin)) {
      fetchUnreadCount();
      
      // Poll for new notifications every 30 seconds only when page is visible
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchUnreadCount();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token, isCompany, isAdmin]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.notifications.list}?unreadOnly=true`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  }, [navigate]);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
        <div
          onClick={() => navigate("/")}
          className="text-2xl font-bold cursor-pointer gradient-text"
        >
          OSEEK
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => navigate("/jobs")}
            className="flex items-center gap-2 text-text-secondary hover:text-text transition"
          >
            <Briefcase className="w-4 h-4" />
            Jobs
          </button>
          {token ? (
            <>
              {isSeeker && (
                <>
                  <button
                    onClick={() => navigate("/wishlist")}
                    className="flex items-center gap-2 text-text-secondary hover:text-text transition"
                  >
                    <Heart className="w-4 h-4" />
                    Wishlist
                  </button>
                  <button
                    onClick={() => navigate("/connections")}
                    className="flex items-center gap-2 text-text-secondary hover:text-text transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Connections
                  </button>
                </>
              )}
              {!isAdmin && (
                <button
                  onClick={() => navigate("/activity")}
                  className="flex items-center gap-2 text-text-secondary hover:text-text transition"
                >
                  <Clock className="w-4 h-4" />
                  Activity
                </button>
              )}
              {(isCompany || isAdmin) && (
                <button
                  onClick={() => navigate("/notifications")}
                  className="relative flex items-center gap-2 text-text-secondary hover:text-text transition"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              )}
              {!isAdmin && (
                <button
                  onClick={() => navigate(isSeeker ? "/profile/seeker" : "/profile/company")}
                  className="flex items-center gap-2 text-text-secondary hover:text-text transition"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
              )}
              <button className="flex items-center gap-2 text-text-secondary hover:text-text transition"
                onClick={() => navigate(isAdmin ? "/admin/dashboard" : "/dashboard")}
                
              > <LayoutDashboard className="w-4 h-4"/>Dashboard
                
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text transition"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-surface transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/auth/login")}
                className="text-text-secondary hover:text-text transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/auth/signup")}
                className="px-4 py-2 bg-primary text-background rounded-lg font-semibold hover:bg-primary-dark transition"
              >
                Sign Up
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text transition"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-text-secondary hover:text-text transition"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col px-4 py-4 space-y-2">
            <button
              onClick={() => {
                navigate("/jobs");
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
            >
              <Briefcase className="w-4 h-4" />
              Jobs
            </button>
            {token ? (
              <>
                {isSeeker && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/wishlist");
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                    >
                      <Heart className="w-4 h-4" />
                      Wishlist
                    </button>
                    <button
                      onClick={() => {
                        navigate("/connections");
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Connections
                    </button>
                  </>
                )}
                {!isAdmin && (
                  <button
                    onClick={() => {
                      navigate("/activity");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                  >
                    <Clock className="w-4 h-4" />
                    Activity
                  </button>
                )}
                {(isCompany || isAdmin) && (
                  <button
                    onClick={() => {
                      navigate("/notifications");
                      setMobileMenuOpen(false);
                    }}
                    className="relative flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                )}
                {!isAdmin && (
                  <button
                    onClick={() => {
                      navigate(isSeeker ? "/profile/seeker" : "/profile/company");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    navigate(isAdmin ? "/admin/dashboard" : "/dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left border-t border-border mt-2 pt-4"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate("/auth/login");
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    navigate("/auth/signup");
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-3 bg-primary text-background rounded-lg font-semibold hover:bg-primary-dark transition text-center"
                >
                  Sign Up
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text hover:bg-surface rounded-lg transition text-left border-t border-border mt-2 pt-4"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
