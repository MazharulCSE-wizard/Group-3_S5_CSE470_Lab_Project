import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Eye, User, MapPin, Briefcase, Clock } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function ProfileViews() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [views, setViews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user.role !== "seeker") {
      navigate("/dashboard")
      return
    }
    fetchProfileViews()
  }, [user.role, navigate])

  const fetchProfileViews = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.getViews, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        // Transform the data to match the UI expectations
        const transformedViews = data.map(view => ({
          _id: view._id,
          viewedAt: view.viewedAt,
          viewer: {
            _id: view.viewer._id,
            name: view.viewerProfile?.companyName || view.viewerProfile?.fullName || view.viewer.name,
            headline: view.viewerProfile?.headline || null,
            company: view.viewerProfile?.companyName || null,
            location: view.viewerProfile?.location || null,
            profilePicture: view.viewerProfile?.profilePicture || null,
          }
        }))
        setViews(transformedViews)
      } else {
        setError(data.message || "Failed to fetch profile views")
      }
    } catch (err) {
      console.error("Fetch profile views error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const viewProfile = (userId) => {
    navigate(`/connections/profile/${userId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Eye size={32} className="text-[#00d9ff]" />
            <h1 className="text-4xl font-bold text-[#e0e0ff]">Profile Views</h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff] transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-6 neon-glow">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
            </div>
          ) : views.length > 0 ? (
            <div className="space-y-4">
              {views.map((view, idx) => (
                <div
                  key={idx}
                  className="bg-[#0f0f1e] border border-[#2d2d4d] rounded-xl p-6 hover:border-[#0066ff] transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {view.viewer?.profilePicture && (
                        <img
                          src={view.viewer.profilePicture}
                          alt={view.viewer.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#e0e0ff] mb-1">
                          {view.viewer?.name || "Anonymous"}
                        </h3>
                        {view.viewer?.headline && (
                          <p className="text-[#00d9ff] text-sm mb-2">{view.viewer.headline}</p>
                        )}
                        {view.viewer?.company && (
                          <div className="flex items-center gap-2 text-[#a0a0c0] text-sm mb-2">
                            <Briefcase size={14} />
                            {view.viewer.company}
                          </div>
                        )}
                        {view.viewer?.location && (
                          <div className="flex items-center gap-2 text-[#a0a0c0] text-sm mb-2">
                            <MapPin size={14} />
                            {view.viewer.location}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[#a0a0c0] text-xs">
                          <Clock size={14} />
                          Viewed {new Date(view.viewedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {view.viewer?._id && (
                      <button
                        onClick={() => viewProfile(view.viewer._id)}
                        className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition"
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye size={64} className="text-[#2d2d4d] mx-auto mb-4" />
              <p className="text-[#a0a0c0] text-lg mb-4">
                No profile views yet. Keep your profile updated to attract more views!
              </p>
              <button
                onClick={() => navigate("/profile/seeker")}
                className="px-6 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
              >
                Update Profile
              </button>
            </div>
          )}
        </div>

        {/* Tips Card */}
        <div className="mt-6 bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#e0e0ff] mb-4">Tips to Increase Profile Views</h3>
          <ul className="space-y-2 text-[#a0a0c0]">
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff] mt-1">•</span>
              <span>Complete your profile with all details including skills, experience, and education</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff] mt-1">•</span>
              <span>Add a professional profile picture</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff] mt-1">•</span>
              <span>Keep your profile active by regularly updating your skills and experience</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff] mt-1">•</span>
              <span>Connect with other professionals and companies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff] mt-1">•</span>
              <span>Apply to relevant job postings to increase your visibility</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
