import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Header from "../components/Header"
import { Download, MapPin, Mail, Phone, Briefcase, GraduationCap, Award } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function ConnectionProfile() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const fetchProfile = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.connections.profile(userId), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
      } else {
        setError(data.message || "Failed to fetch profile")
      }
    } catch (err) {
      console.error("Fetch profile error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const downloadCV = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.downloadApplicantCV(userId), {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${profile?.fullName || "CV"}_Resume.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } else {
        alert("Failed to download CV")
      }
    } catch (err) {
      console.error("Download CV error:", err)
      alert("Network error. Please try again later.")
    }
  }

  const downloadProfilePDF = async () => {
    try {
      const headers = getAuthHeaders()
      delete headers['Content-Type']
      
      const response = await fetch(API_ENDPOINTS.profile.seeker.downloadProfilePDF(profile._id), {
        headers: headers
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        // Sanitize filename consistently
        const sanitizedName = (profile?.fullName || "Profile")
          .replace(/[/\\:*?"<>|]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50)
        a.download = `${sanitizedName}_Profile.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } else {
        alert("Failed to download profile PDF")
      }
    } catch (err) {
      console.error("Download profile PDF error:", err)
      alert("Network error. Please try again later.")
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
            {error || "Profile not found"}
          </div>
          <button
            onClick={() => navigate("/connections")}
            className="mt-4 px-6 py-3 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition"
          >
            ← Back to Connections
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-4xl mx-auto py-12 px-4">
        <button
          onClick={() => navigate("/connections")}
          className="mb-6 px-4 py-2 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff] transition"
        >
          ← Back to Connections
        </button>

        {/* Profile Header */}
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow mb-6">
          <div className="flex items-start gap-6">
            {profile.profilePicture && (
              <img
                src={profile.profilePicture}
                alt={profile.fullName}
                className="w-32 h-32 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#e0e0ff] mb-2">{profile.fullName}</h1>
              {profile.headline && <p className="text-[#00d9ff] text-lg mb-4">{profile.headline}</p>}
              
              <div className="flex flex-wrap gap-4 text-[#a0a0c0]">
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={downloadProfilePDF}
                  className="px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition flex items-center gap-2"
                >
                  <Download size={20} />
                  Download Profile PDF
                </button>
                <button
                  onClick={downloadCV}
                  className="px-6 py-3 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition flex items-center gap-2"
                >
                  <Download size={20} />
                  Download CV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow mb-6">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-4">About</h2>
            <p className="text-[#a0a0c0] leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Award size={24} className="text-[#00d9ff]" />
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-[#0066ff]/20 text-[#0066ff] rounded-lg font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {profile.experience && profile.experience.length > 0 && (
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Briefcase size={24} className="text-[#00d9ff]" />
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Experience</h2>
            </div>
            <div className="space-y-6">
              {profile.experience.map((exp, idx) => (
                <div key={idx} className="border-l-4 border-[#0066ff] pl-6">
                  <h3 className="text-xl font-bold text-[#e0e0ff]">{exp.title}</h3>
                  <p className="text-[#00d9ff] font-medium">{exp.company}</p>
                  <p className="text-[#a0a0c0] text-sm mb-2">{exp.duration}</p>
                  {exp.description && <p className="text-[#a0a0c0]">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap size={24} className="text-[#00d9ff]" />
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Education</h2>
            </div>
            <div className="space-y-4">
              {profile.education.map((edu, idx) => (
                <div key={idx} className="border-l-4 border-[#0066ff] pl-6">
                  <h3 className="text-xl font-bold text-[#e0e0ff]">{edu.degree}</h3>
                  <p className="text-[#00d9ff] font-medium">{edu.school}</p>
                  <p className="text-[#a0a0c0] text-sm">{edu.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
