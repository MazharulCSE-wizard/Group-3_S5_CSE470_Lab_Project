import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import JobSeekerProfile from "./pages/profile/JobSeekerProfile"
import CompanyProfile from "./pages/profile/CompanyProfile"
import CompanyPublicProfile from "./pages/CompanyPublicProfile"
import Dashboard from "./pages/Dashboard"
import AdminDashboard from "./pages/AdminDashboard"
import Jobs from "./pages/Jobs"
import Wishlist from "./pages/Wishlist"
import ActivityHistory from "./pages/ActivityHistory"
import Notifications from "./pages/Notifications"
import Connections from "./pages/Connections"
import ConnectionProfile from "./pages/ConnectionProfile"
import Settings from "./pages/Settings"
import ProfileViews from "./pages/ProfileViews"
import ProtectedRoute from "./components/ProtectedRoute"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile/seeker" element={<JobSeekerProfile />} />
          <Route path="/profile/company" element={<CompanyProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/activity" element={<ActivityHistory />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/connections/profile/:userId" element={<ConnectionProfile />} />
          <Route path="/company/:companyId" element={<CompanyPublicProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile-views" element={<ProfileViews />} />
        </Route>
      </Routes>
    </Router>
  )
}
