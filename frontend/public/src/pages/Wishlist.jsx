import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"
import { Heart, MapPin, Briefcase, DollarSign, Clock, Trash2 } from "lucide-react"

export default function Wishlist() {
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [removing, setRemoving] = useState(null)

  const user = JSON.parse(localStorage.getItem("user") || "null")

  useEffect(() => {
    if (!user || user.role !== "seeker") {
      navigate("/")
      return
    }
    fetchWishlist()
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWishlist = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.wishlist.list, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setWishlist(data || [])
      } else {
        setError(data.message || "Failed to fetch wishlist")
      }
    } catch (err) {
      console.error("Fetch wishlist error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const removeFromWishlist = async (jobId) => {
    setRemoving(jobId)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.wishlist.remove(jobId), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setWishlist(wishlist.filter((item) => item.job._id !== jobId))
      } else {
        setError(data.message || "Failed to remove from wishlist")
      }
    } catch (err) {
      console.error("Remove from wishlist error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setRemoving(null)
    }
  }

  const handleApply = (jobId) => {
    // Navigate to jobs page or trigger application modal
    navigate(`/jobs#${jobId}`)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart size={32} className="text-[#ff1744]" fill="#ff1744" />
            <h1 className="text-4xl font-bold text-[#e0e0ff]">My Wishlist</h1>
          </div>
          <p className="text-[#a0a0c0]">{wishlist.length} saved {wishlist.length === 1 ? 'job' : 'jobs'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
          </div>
        ) : wishlist.length > 0 ? (
          <div className="grid gap-4">
            {wishlist.map((item) => {
              const job = item.job
              if (!job) return null

              return (
                <div
                  key={item._id}
                  className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[#e0e0ff]">{job.title}</h2>
                      <p className="text-[#00d9ff] font-medium">{job.company?.companyName || "Unknown Company"}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-[#a0a0c0] text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase size={14} /> {job.type}
                        </span>
                        {job.salary?.min && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={14} />{" "}
                            {job.salary?.min?.toLocaleString()} - {job.salary?.max?.toLocaleString()}{" "}
                            {job.salary?.currency || "USD"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {job.experience || "Any experience"}
                        </span>
                      </div>
                      {job.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.skills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[#a0a0c0] text-sm mt-2">
                        Saved on {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => handleApply(job._id)}
                        className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
                      >
                        Apply Now
                      </button>
                      <button
                        onClick={() => removeFromWishlist(job._id)}
                        disabled={removing === job._id}
                        className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg font-semibold hover:bg-red-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        {removing === job._id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart size={64} className="mx-auto text-[#6d6d8f] mb-4" />
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-2">No Saved Jobs</h2>
            <p className="text-[#a0a0c0] mb-6">
              Start saving jobs you're interested in to view them here later
            </p>
            <button
              onClick={() => navigate("/jobs")}
              className="px-6 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
            >
              Browse Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
