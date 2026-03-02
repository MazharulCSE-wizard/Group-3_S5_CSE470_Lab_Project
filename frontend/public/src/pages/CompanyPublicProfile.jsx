import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Header from "../components/Header"
import { Globe, MapPin, Building2, Users, Calendar, Briefcase } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function CompanyPublicProfile() {
  const navigate = useNavigate()
  const { companyId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchCompanyJobs()
  }, [companyId])

  const fetchProfile = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.profile.company.getPublic(companyId), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
      } else {
        setError(data.message || "Failed to fetch company profile")
      }
    } catch (err) {
      console.error("Fetch company profile error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyJobs = async () => {
    setLoadingJobs(true)
    try {
      // Fetch jobs posted by this company
      const response = await fetch(`${API_ENDPOINTS.jobs.list}?company=${companyId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setJobs(data.jobs || [])
      }
    } catch (err) {
      console.error("Fetch company jobs error:", err)
    } finally {
      setLoadingJobs(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
        <Header />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
        <Header />
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error || "Company profile not found"}
          </div>
          <button
            onClick={() => navigate("/jobs")}
            className="mt-4 px-6 py-3 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition"
          >
            ← Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-5xl mx-auto py-12 px-4">
        <button
          onClick={() => navigate("/jobs")}
          className="mb-6 px-4 py-2 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff] transition"
        >
          ← Back to Jobs
        </button>

        {/* Company Header */}
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow mb-6">
          <div className="flex items-start gap-6">
            {profile.profilePicture && (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#0066ff] bg-[#0f0f1e] flex-shrink-0">
                <img
                  src={profile.profilePicture}
                  alt={profile.companyName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#e0e0ff] mb-2">{profile.companyName}</h1>
              {profile.industry && (
                <p className="text-[#00d9ff] text-lg mb-4">{profile.industry}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[#a0a0c0]">
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#0066ff]" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-[#0066ff]" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0066ff] hover:underline"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile.size && (
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#0066ff]" />
                    <span>{profile.size} employees</span>
                  </div>
                )}
                {profile.founded && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#0066ff]" />
                    <span>Founded {profile.founded}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        {profile.description && (
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow mb-6">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-4 flex items-center gap-2">
              <Building2 size={24} className="text-[#0066ff]" />
              About {profile.companyName}
            </h2>
            <p className="text-[#cbd5f5] leading-relaxed whitespace-pre-wrap">{profile.description}</p>
          </div>
        )}

        {/* Open Positions */}
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6 flex items-center gap-2">
            <Briefcase size={24} className="text-[#0066ff]" />
            Open Positions
            {jobs.length > 0 && (
              <span className="ml-2 px-3 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded-full text-sm font-semibold">
                {jobs.length}
              </span>
            )}
          </h2>
          
          {loadingJobs ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066ff]"></div>
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  onClick={() => navigate(`/jobs#${job._id}`)}
                  className="bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg p-5 hover:border-[#0066ff] transition cursor-pointer"
                >
                  <h3 className="text-lg font-bold text-[#e0e0ff] mb-2">{job.title}</h3>
                  <div className="flex flex-wrap gap-4 text-[#a0a0c0] text-sm">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.location}
                      </span>
                    )}
                    {job.type && (
                      <span className="flex items-center gap-1">
                        <Briefcase size={14} />
                        {job.type}
                      </span>
                    )}
                    {job.salary?.min && (
                      <span className="flex items-center gap-1">
                        💰 {job.salary.min}-{job.salary.max} {job.salary.currency}
                      </span>
                    )}
                  </div>
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.skills.slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#a0a0c0] text-center py-8">No open positions at the moment</p>
          )}
        </div>
      </div>
    </div>
  )
}
