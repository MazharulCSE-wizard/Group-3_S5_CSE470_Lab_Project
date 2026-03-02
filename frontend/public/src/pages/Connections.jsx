import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Users, UserPlus, Check, X, Trash2, Search, MapPin, Briefcase } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function Connections() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [activeTab, setActiveTab] = useState("connections")
  const [connections, setConnections] = useState([])
  const [seekers, setSeekers] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sending, setSending] = useState(null)

  useEffect(() => {
    if (user.role !== "seeker") {
      navigate("/")
      return
    }
    fetchConnections()
  }, [user.role, navigate])

  const fetchConnections = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.connections.list, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        const accepted = data.filter((c) => c.status === "accepted")
        const pending = data.filter((c) => c.status === "pending" && c.recipient._id === user._id)
        setConnections(accepted)
        setPendingRequests(pending)
      } else {
        setError(data.message || "Failed to fetch connections")
      }
    } catch (err) {
      console.error("Fetch connections error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const fetchSeekers = async () => {
    setLoading(true)
    setError("")
    try {
      const url = searchTerm
        ? `${API_ENDPOINTS.connections.seekers}?search=${encodeURIComponent(searchTerm)}`
        : API_ENDPOINTS.connections.seekers

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setSeekers(data.seekers || [])
      } else {
        setError(data.message || "Failed to fetch seekers")
      }
    } catch (err) {
      console.error("Fetch seekers error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "find") {
      fetchSeekers()
    }
  }, [activeTab])

  const handleSearch = () => {
    if (activeTab === "find") {
      fetchSeekers()
    }
  }

  const sendConnectionRequest = async (recipientId) => {
    setSending(recipientId)
    try {
      const response = await fetch(API_ENDPOINTS.connections.request, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientId }),
      })
      const data = await response.json()

      if (response.ok) {
        alert("Connection request sent!")
        fetchSeekers() // Refresh list
      } else {
        alert(data.message || "Failed to send connection request")
      }
    } catch (err) {
      console.error("Send connection request error:", err)
      alert("Network error. Please try again later.")
    } finally {
      setSending(null)
    }
  }

  const handleAcceptRequest = async (connectionId) => {
    try {
      const response = await fetch(API_ENDPOINTS.connections.accept(connectionId), {
        method: "PUT",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        fetchConnections() // Refresh list
      } else {
        alert(data.message || "Failed to accept connection")
      }
    } catch (err) {
      console.error("Accept connection error:", err)
      alert("Network error. Please try again later.")
    }
  }

  const handleRejectRequest = async (connectionId) => {
    try {
      const response = await fetch(API_ENDPOINTS.connections.reject(connectionId), {
        method: "PUT",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        fetchConnections() // Refresh list
      } else {
        alert(data.message || "Failed to reject connection")
      }
    } catch (err) {
      console.error("Reject connection error:", err)
      alert("Network error. Please try again later.")
    }
  }

  const handleRemoveConnection = async (connectionId) => {
    if (!window.confirm("Are you sure you want to remove this connection?")) {
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.connections.remove(connectionId), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        fetchConnections() // Refresh list
      } else {
        alert(data.message || "Failed to remove connection")
      }
    } catch (err) {
      console.error("Remove connection error:", err)
      alert("Network error. Please try again later.")
    }
  }

  const viewProfile = (userId) => {
    navigate(`/connections/profile/${userId}`)
  }

  const renderConnections = () => (
    <div className="space-y-4">
      {connections.length > 0 ? (
        connections.map((conn) => {
          const other = conn.otherUser
          const profile = conn.otherProfile
          return (
            <div
              key={conn._id}
              className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {profile?.profilePicture && (
                    <img
                      src={profile.profilePicture}
                      alt={profile.fullName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#e0e0ff] mb-1">
                      {profile?.fullName || other.name}
                    </h3>
                    {profile?.headline && (
                      <p className="text-[#00d9ff] text-sm mb-2">{profile.headline}</p>
                    )}
                    {profile?.location && (
                      <div className="flex items-center gap-2 text-[#a0a0c0] text-sm mb-2">
                        <MapPin size={14} />
                        {profile.location}
                      </div>
                    )}
                    <p className="text-[#a0a0c0] text-xs">
                      Connected since {new Date(conn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewProfile(other._id)}
                    className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => handleRemoveConnection(conn._id)}
                    className="p-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition"
                    title="Remove connection"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-[#6d6d8f] mb-4" />
          <p className="text-[#a0a0c0]">No connections yet. Start connecting with other job seekers!</p>
        </div>
      )}
    </div>
  )

  const renderPendingRequests = () => (
    <div className="space-y-4">
      {pendingRequests.length > 0 ? (
        pendingRequests.map((conn) => {
          const other = conn.requester
          const profile = conn.otherProfile
          return (
            <div
              key={conn._id}
              className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {profile?.profilePicture && (
                    <img
                      src={profile.profilePicture}
                      alt={profile.fullName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#e0e0ff] mb-1">
                      {profile?.fullName || other.name}
                    </h3>
                    {profile?.headline && (
                      <p className="text-[#00d9ff] text-sm mb-2">{profile.headline}</p>
                    )}
                    {profile?.location && (
                      <div className="flex items-center gap-2 text-[#a0a0c0] text-sm">
                        <MapPin size={14} />
                        {profile.location}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(conn._id)}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center gap-2"
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(conn._id)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition flex items-center gap-2"
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-[#6d6d8f] mb-4" />
          <p className="text-[#a0a0c0]">No pending connection requests</p>
        </div>
      )}
    </div>
  )

  const renderFindSeekers = () => (
    <>
      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0c0]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name..."
              className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg pl-10 pr-4 py-3 text-[#e0e0ff] placeholder-[#6d6d8f] focus:border-[#0066ff] focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
          >
            Search
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {seekers.length > 0 ? (
          seekers.map((seeker) => (
            <div
              key={seeker._id}
              className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {seeker.profilePicture && (
                    <img
                      src={seeker.profilePicture}
                      alt={seeker.fullName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#e0e0ff] mb-1">{seeker.fullName}</h3>
                    {seeker.headline && (
                      <p className="text-[#00d9ff] text-sm mb-2">{seeker.headline}</p>
                    )}
                    {seeker.location && (
                      <div className="flex items-center gap-2 text-[#a0a0c0] text-sm mb-2">
                        <MapPin size={14} />
                        {seeker.location}
                      </div>
                    )}
                    {seeker.skills && seeker.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {seeker.skills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {seeker.skills.length > 5 && (
                          <span className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs">
                            +{seeker.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => sendConnectionRequest(seeker._id)}
                  disabled={sending === seeker._id}
                  className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition flex items-center gap-2 disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  {sending === seeker._id ? "Sending..." : "Connect"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-[#6d6d8f] mb-4" />
            <p className="text-[#a0a0c0]">No job seekers found</p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users size={32} className="text-[#00d9ff]" />
            <h1 className="text-4xl font-bold text-[#e0e0ff]">Connections</h1>
          </div>
          <div className="text-[#a0a0c0]">
            {connections.length} {connections.length === 1 ? "connection" : "connections"}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("connections")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "connections"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            <Users size={20} className="inline mr-2" />
            My Connections ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "requests"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("find")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "find"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            <UserPlus size={20} className="inline mr-2" />
            Find Seekers
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
          </div>
        ) : activeTab === "connections" ? (
          renderConnections()
        ) : activeTab === "requests" ? (
          renderPendingRequests()
        ) : (
          renderFindSeekers()
        )}
      </div>
    </div>
  )
}
