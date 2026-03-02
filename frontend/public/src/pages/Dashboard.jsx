import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { BarChart3, Users, FileText, Settings, Briefcase, Clock, Eye, Heart, UserCheck } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const response = await fetch(API_ENDPOINTS.dashboard.stats, {
          headers: getAuthHeaders(),
        })
        const data = await response.json()

        if (response.ok) {
          setStats(data)
        } else {
          setError(data.message || "Failed to fetch dashboard stats")
        }
      } catch (err) {
        console.error("Fetch stats error:", err)
        setError("Network error. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const renderSeekerDashboard = () => (
    <>
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        {[
          { icon: <FileText size={32} />, label: "Profile Views", value: stats?.profileViews || 0, path: "/profile-views" },
          { icon: <Users size={32} />, label: "Connections", value: stats?.connections || 0, path: "/connections" },
          { icon: <BarChart3 size={32} />, label: "Applications", value: stats?.applications || 0, path: "/activity" },
          { icon: <Settings size={32} />, label: "Settings", value: "Configure", path: "/settings" },
        ].map((card, idx) => (
          <div
            key={idx}
            onClick={() => navigate(card.path)}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition cursor-pointer"
          >
            <div className="text-[#00d9ff] mb-4">{card.icon}</div>
            <p className="text-[#a0a0c0] text-sm font-medium">{card.label}</p>
            <p className="text-[#e0e0ff] text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/profile/seeker")}
              className="w-full px-4 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
            >
              Update Profile
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="w-full px-4 py-3 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
            >
              Browse Jobs
            </button>
          </div>
        </div>

        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {stats?.recentActivity?.length > 0 ? (
              stats.recentActivity.map((activity, idx) => (
                <div key={idx} className="border-l-4 border-[#0066ff] pl-4">
                  <p className="text-[#e0e0ff] font-semibold">{activity.title}</p>
                  <div className="flex items-center gap-2 text-[#a0a0c0] text-sm">
                    <Clock size={14} />
                    {new Date(activity.timestamp).toLocaleDateString()}
                    {activity.status && (
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                        activity.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                        activity.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        activity.status === 'shortlisted' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {activity.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#a0a0c0]">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </>
  )

  const renderCompanyDashboard = () => (
    <>
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        {[
          { icon: <Briefcase size={32} />, label: "Total Jobs", value: stats?.totalJobs || 0 },
          { icon: <FileText size={32} />, label: "Active Jobs", value: stats?.activeJobs || 0 },
          { icon: <Users size={32} />, label: "Total Applications", value: stats?.totalApplications || 0 },
          { icon: <Eye size={32} />, label: "Total Views", value: stats?.totalViews || 0 },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
          >
            <div className="text-[#00d9ff] mb-4">{card.icon}</div>
            <p className="text-[#a0a0c0] text-sm font-medium">{card.label}</p>
            <p className="text-[#e0e0ff] text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: <Heart size={24} />, label: "Wishlist Saves", value: stats?.totalWishlists || 0, color: "text-[#ff1744]" },
          { icon: <UserCheck size={24} />, label: "Shortlisted", value: stats?.shortlistedCount || 0, color: "text-[#00d9ff]" },
          { icon: <BarChart3 size={24} />, label: "Avg. Applications/Job", value: stats?.totalJobs > 0 ? Math.round((stats?.totalApplications || 0) / stats.totalJobs) : 0, color: "text-[#0066ff]" },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
          >
            <div className={`${card.color} mb-3`}>{card.icon}</div>
            <p className="text-[#a0a0c0] text-sm font-medium">{card.label}</p>
            <p className="text-[#e0e0ff] text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/profile/company")}
              className="w-full px-4 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
            >
              Manage Company
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="w-full px-4 py-3 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
            >
              Post Job
            </button>
          </div>
        </div>

        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Recent Applications</h2>
          <div className="space-y-4">
            {stats?.recentApplications?.length > 0 ? (
              stats.recentApplications.map((app, idx) => (
                <div key={idx} className="border-l-4 border-[#00d9ff] pl-4">
                  <p className="text-[#e0e0ff] font-semibold">{app.applicant?.name ?? "Unknown"}</p>
                  <p className="text-[#a0a0c0] text-sm">Applied to: {app.job?.title ?? "Unknown Job"}</p>
                  <div className="flex items-center gap-2 text-[#a0a0c0] text-sm mt-1">
                    <Clock size={14} />
                    {new Date(app.createdAt).toLocaleDateString()}
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                      app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      app.status === 'shortlisted' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#a0a0c0]">No recent applications</p>
            )}
          </div>
        </div>
      </div>

      {stats?.jobAnalytics?.length > 0 && (
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Job Performance Analytics</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2d2d4d]">
                  <th className="text-left py-3 px-4 text-[#a0a0c0] font-medium">Job Title</th>
                  <th className="text-center py-3 px-4 text-[#a0a0c0] font-medium">Views</th>
                  <th className="text-center py-3 px-4 text-[#a0a0c0] font-medium">Applications</th>
                  <th className="text-center py-3 px-4 text-[#a0a0c0] font-medium">Wishlist</th>
                  <th className="text-center py-3 px-4 text-[#a0a0c0] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.jobAnalytics.slice(0, 10).map((job, idx) => (
                  <tr key={idx} className="border-b border-[#2d2d4d] hover:bg-[#0f0f1e] transition">
                    <td className="py-3 px-4 text-[#e0e0ff] font-medium">{job.title}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-[#a0a0c0]">
                        <Eye size={14} />
                        {job.views || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-[#a0a0c0]">
                        <Users size={14} />
                        {job.applications || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-[#a0a0c0]">
                        <Heart size={14} />
                        {job.wishlists || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        job.status === 'open' ? 'bg-green-500/20 text-green-400' :
                        job.status === 'closed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-[#e0e0ff] mb-8">Dashboard</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
          </div>
        ) : (
          user.role === "seeker" ? renderSeekerDashboard() : renderCompanyDashboard()
        )}
      </div>
    </div>
  )
}
