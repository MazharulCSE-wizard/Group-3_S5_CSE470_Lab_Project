import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Clock, FileText, Briefcase, Heart, Calendar, Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function ActivityHistory() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`${API_ENDPOINTS.dashboard.activity}?limit=100`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setActivities(data.activities || [])
      } else {
        setError(data.message || "Failed to fetch activity history")
      }
    } catch (err) {
      console.error("Fetch activities error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case "application_submitted":
      case "application_received":
        return <FileText size={20} className="text-[#0066ff]" />
      case "application_updated":
      case "applicant_shortlisted":
      case "applicant_rejected":
      case "applicant_hired":
        return <CheckCircle size={20} className="text-[#00d9ff]" />
      case "job_saved":
        return <Heart size={20} className="text-[#ff1744]" />
      case "job_unsaved":
        return <Heart size={20} className="text-[#a0a0c0]" />
      case "interview_scheduled":
        return <Calendar size={20} className="text-[#ffa500]" />
      case "job_posted":
      case "job_updated":
      case "job_closed":
        return <Briefcase size={20} className="text-[#00d9ff]" />
      case "profile_updated":
        return <FileText size={20} className="text-[#00d9ff]" />
      default:
        return <AlertCircle size={20} className="text-[#a0a0c0]" />
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case "application_submitted":
      case "application_received":
        return "border-[#0066ff]"
      case "application_updated":
      case "applicant_shortlisted":
      case "applicant_rejected":
      case "applicant_hired":
        return "border-[#00d9ff]"
      case "job_saved":
        return "border-[#ff1744]"
      case "interview_scheduled":
        return "border-[#ffa500]"
      case "job_posted":
      case "job_updated":
      case "job_closed":
        return "border-[#00d9ff]"
      default:
        return "border-[#2d2d4d]"
    }
  }

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true
    return activity.type.includes(filter)
  })

  const activityTypes = [
    { value: "all", label: "All Activities" },
    { value: "application", label: "Applications" },
    { value: "job", label: "Jobs" },
    { value: "interview", label: "Interviews" },
    { value: "profile", label: "Profile" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Clock size={32} className="text-[#00d9ff]" />
            <h1 className="text-4xl font-bold text-[#e0e0ff]">Activity History</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff] transition"
          >
            ← Back
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 bg-[#16213e] border border-[#2d2d4d] rounded-xl p-2 flex gap-2 overflow-x-auto">
          {activityTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
                filter === type.value
                  ? "bg-[#0066ff] text-white"
                  : "text-[#a0a0c0] hover:bg-[#0f0f1e]"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Activity Timeline */}
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-6 neon-glow">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
            </div>
          ) : filteredActivities.length > 0 ? (
            <div className="space-y-4">
              {filteredActivities.map((activity, idx) => (
                <div
                  key={activity._id || idx}
                  className={`border-l-4 ${getActivityColor(activity.type)} pl-6 py-4 bg-[#0f0f1e] rounded-r-lg hover:bg-[#1a1a2e] transition relative`}
                >
                  {/* Icon */}
                  <div className="absolute left-[-12px] top-4 bg-[#16213e] rounded-full p-2">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Activity Details */}
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-[#e0e0ff]">{activity.description}</h3>
                    {activity.relatedJob && (
                      <p className="text-[#a0a0c0] text-sm mt-1">
                        Job: {activity.relatedJob.title || "Unknown"}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-[#a0a0c0] text-sm">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                    {activity.metadata?.status && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          activity.metadata.status === "accepted" || activity.metadata.status === "hired"
                            ? "bg-green-500/20 text-green-400"
                            : activity.metadata.status === "rejected"
                            ? "bg-red-500/20 text-red-400"
                            : activity.metadata.status === "shortlisted" || activity.metadata.status === "interview"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {activity.metadata.status}
                      </span>
                    )}
                  </div>

                  {/* Additional Info */}
                  {activity.metadata?.company && (
                    <p className="text-[#a0a0c0] text-sm mt-2">Company: {activity.metadata.company}</p>
                  )}
                  {activity.metadata?.location && (
                    <p className="text-[#a0a0c0] text-sm">Location: {activity.metadata.location}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock size={64} className="text-[#2d2d4d] mx-auto mb-4" />
              <p className="text-[#a0a0c0] text-lg">
                {filter === "all"
                  ? "No activity history yet. Start applying to jobs or updating your profile!"
                  : `No ${filter} activities found.`}
              </p>
              <button
                onClick={() => navigate("/jobs")}
                className="mt-4 px-6 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
              >
                Browse Jobs
              </button>
            </div>
          )}
        </div>

        {/* Summary Card */}
        {activities.length > 0 && (
          <div className="mt-6 bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#e0e0ff] mb-4">Activity Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0f0f1e] rounded-lg p-4 text-center">
                <p className="text-[#a0a0c0] text-sm mb-1">Total Activities</p>
                <p className="text-2xl font-bold text-[#e0e0ff]">{activities.length}</p>
              </div>
              <div className="bg-[#0f0f1e] rounded-lg p-4 text-center">
                <p className="text-[#a0a0c0] text-sm mb-1">Applications</p>
                <p className="text-2xl font-bold text-[#0066ff]">
                  {activities.filter((a) => a.type.includes("application")).length}
                </p>
              </div>
              <div className="bg-[#0f0f1e] rounded-lg p-4 text-center">
                <p className="text-[#a0a0c0] text-sm mb-1">Saved Jobs</p>
                <p className="text-2xl font-bold text-[#ff1744]">
                  {activities.filter((a) => a.type === "job_saved").length}
                </p>
              </div>
              <div className="bg-[#0f0f1e] rounded-lg p-4 text-center">
                <p className="text-[#a0a0c0] text-sm mb-1">Interviews</p>
                <p className="text-2xl font-bold text-[#ffa500]">
                  {activities.filter((a) => a.type === "interview_scheduled").length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
