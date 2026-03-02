import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Home, Briefcase, User, Settings } from "lucide-react";
import Header from "./Header";

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <Briefcase className="w-5 h-5" />, label: "Jobs", path: "/jobs" },
    { icon: <User className="w-5 h-5" />, label: "Profile", path: "/profile" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 border-b border-border bg-surface z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-4 flex items-center"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? "block" : "hidden"} md:block w-64 border-r border-border bg-surface min-h-screen md:pt-0 pt-20`}
        >
          <nav className="p-6 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text hover:bg-background rounded-lg transition"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="absolute bottom-6 left-6 right-6 flex gap-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-background transition text-text-secondary hover:text-text"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-12 md:pt-6">{children}</main>
      </div>
    </div>
  );
}
