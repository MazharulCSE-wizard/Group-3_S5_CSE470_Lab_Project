import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Users, Building2, Search, Trash2, Mail, MapPin, Calendar, Briefcase, MessageSquare, X } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [activeTab, setActiveTab] = useState("users")
  const [seekers, setSeekers] = useState([])
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [jobs, setJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingRole, setUpdatingRole] = useState(null)
  const [feedbackForm, setFeedbackForm] = useState({ show: false, companyId: "", companyName: "", title: "", message: "", jobId: "" })
  const [sendingFeedback, setSendingFeedback] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (user.role !== "admin") {
      navigate("/")
      return
    }
    fetchData()
  }, [activeTab, user.role, navigate])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      let endpoint
      if (activeTab === "users") {
        endpoint = API_ENDPOINTS.admin.users
      } else if (activeTab === "seekers") {
        endpoint = API_ENDPOINTS.admin.seekers
      } else if (activeTab === "companies") {
        endpoint = API_ENDPOINTS.admin.companies
      } else {
        endpoint = API_ENDPOINTS.admin.jobs
      }
      
      const response = await fetch(endpoint, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        if (activeTab === "users") {
          setUsers(data.users || [])
        } else if (activeTab === "seekers") {
          setSeekers(data.seekers || [])
        } else if (activeTab === "companies") {
          setCompanies(data.companies || [])
        } else {
          setJobs(data.jobs || [])
        }
      } else {
        setError(data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return
    }

    try {
      const endpoint = type === "seeker" 
        ? API_ENDPOINTS.admin.deleteSeeker(id)
        : type === "company"
        ? API_ENDPOINTS.admin.deleteCompany(id)
        : type === "job"
        ? API_ENDPOINTS.admin.deleteJob(id)
        : API_ENDPOINTS.admin.deleteUser(id)

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        // Refresh the list
        fetchData()
        alert(data.message || `${type} deleted successfully`)
      } else {
        alert(data.message || `Failed to delete ${type}`)
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Network error. Please try again later.")
    }
  }

  const handleRoleUpdate = async (userId, newRole, currentUserEmail) => {
    // Prevent changing own role
    if (currentUserEmail === user.email) {
      alert("You cannot change your own role")
      return
    }

    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    setUpdatingRole(userId)
    try {
      const response = await fetch(API_ENDPOINTS.admin.updateUserRole(userId), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      })
      const data = await response.json()

      if (response.ok) {
        fetchData()
        alert(data.message || "Role updated successfully")
      } else {
        alert(data.message || "Failed to update role")
      }
    } catch (err) {
      console.error("Update role error:", err)
      alert("Network error. Please try again later.")
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleSendFeedback = async () => {
    if (!feedbackForm.title || !feedbackForm.message) {
      alert("Title and message are required")
      return
    }

    setSendingFeedback(true)
    try {
      const response = await fetch(API_ENDPOINTS.admin.sendFeedback, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId: feedbackForm.companyId,
          title: feedbackForm.title,
          message: feedbackForm.message,
          jobId: feedbackForm.jobId || undefined,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        alert("Feedback sent successfully!")
        setFeedbackForm({ show: false, companyId: "", companyName: "", title: "", message: "", jobId: "" })
      } else {
        alert(data.message || "Failed to send feedback")
      }
    } catch (err) {
      console.error("Send feedback error:", err)
      alert("Network error. Please try again later.")
    } finally {
      setSendingFeedback(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchData()
      return
    }

    setLoading(true)
    setError("")
    try {
      const endpoint = activeTab === "seekers" 
        ? `${API_ENDPOINTS.admin.seekers}?search=${encodeURIComponent(searchTerm)}`
        : activeTab === "companies"
        ? `${API_ENDPOINTS.admin.companies}?search=${encodeURIComponent(searchTerm)}`
        : `${API_ENDPOINTS.admin.jobs}?search=${encodeURIComponent(searchTerm)}`
      
      const response = await fetch(endpoint, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        if (activeTab === "seekers") {
          setSeekers(data.seekers || [])
        } else if (activeTab === "companies") {
          setCompanies(data.companies || [])
        } else {
          setJobs(data.jobs || [])
        }
      } else {
        setError(data.message || "Failed to search")
      }
    } catch (err) {
      console.error("Search error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const renderUsers = () => (
    <div className="space-y-4">
      {users.length > 0 ? (
        users.map((userData) => (
          <div
            key={userData._id}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#e0e0ff] mb-2">
                  {userData.name || "No Name"}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Mail size={16} />
                    <span>{userData.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      userData.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      userData.role === 'company' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {userData.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Calendar size={16} />
                    <span>Joined: {new Date(userData.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col gap-2">
                <select
                  value={userData.role}
                  onChange={(e) => handleRoleUpdate(userData._id, e.target.value, userData.email)}
                  disabled={updatingRole === userData._id || userData.email === user.email}
                  className="px-3 py-2 bg-[#0f0f1e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg focus:outline-none focus:border-[#0066ff] disabled:opacity-50"
                >
                  <option value="seeker">Seeker</option>
                  <option value="company">Company</option>
                  <option value="admin">Admin</option>
                </select>
                {userData.email !== user.email && (
                  <button
                    onClick={() => handleDelete(userData._id, "user")}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    title="Delete user"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-[#6d6d8f] mb-4" />
          <p className="text-[#a0a0c0]">No users found</p>
        </div>
      )}
    </div>
  )

  const renderSeekers = () => (
    <div className="space-y-4">
      {seekers.length > 0 ? (
        seekers.map((seeker) => (
          <div
            key={seeker._id}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#e0e0ff] mb-2">
                  {seeker.fullName || "No Name"}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Mail size={16} />
                    <span>{seeker.email || "No email"}</span>
                  </div>
                  {seeker.location && (
                    <div className="flex items-center gap-2 text-[#a0a0c0]">
                      <MapPin size={16} />
                      <span>{seeker.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Calendar size={16} />
                    <span>Joined: {new Date(seeker.user?.createdAt || seeker.createdAt).toLocaleDateString()}</span>
                  </div>
                  {seeker.headline && (
                    <p className="text-[#a0a0c0] text-sm mt-2">{seeker.headline}</p>
                  )}
                  {seeker.skills && seeker.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {seeker.skills.slice(0, 5).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[#0066ff]/20 text-[#00d9ff] rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {seeker.skills.length > 5 && (
                        <span className="px-2 py-1 bg-[#0066ff]/20 text-[#00d9ff] rounded text-xs">
                          +{seeker.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(seeker._id, "seeker")}
                className="ml-4 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                title="Delete seeker"
              >
                <Trash2 size={20} />
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
  )

  const renderCompanies = () => (
    <div className="space-y-4">
      {companies.length > 0 ? (
        companies.map((company) => (
          <div
            key={company._id}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#e0e0ff] mb-2">
                  {company.companyName || "No Name"}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Mail size={16} />
                    <span>{company.email || "No email"}</span>
                  </div>
                  {company.location && (
                    <div className="flex items-center gap-2 text-[#a0a0c0]">
                      <MapPin size={16} />
                      <span>{company.location}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-[#a0a0c0]">
                      <span className="text-sm">🌐 {company.website}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Calendar size={16} />
                    <span>Joined: {new Date(company.user?.createdAt || company.createdAt).toLocaleDateString()}</span>
                  </div>
                  {company.description && (
                    <p className="text-[#a0a0c0] text-sm mt-2">{company.description}</p>
                  )}
                  {company.industry && (
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-[#0066ff]/20 text-[#00d9ff] rounded text-xs">
                        {company.industry}
                      </span>
                      {company.size && (
                        <span className="px-2 py-1 bg-[#0066ff]/20 text-[#00d9ff] rounded text-xs">
                          {company.size}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(company._id, "company")}
                className="ml-4 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                title="Delete company"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-[#6d6d8f] mb-4" />
          <p className="text-[#a0a0c0]">No companies found</p>
        </div>
      )}
    </div>
  )

  const renderJobs = () => (
    <div className="space-y-4">
      {jobs.length > 0 ? (
        jobs.map((job) => (
          <div
            key={job._id}
            className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#e0e0ff] mb-2">
                  {job.title}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Building2 size={16} />
                    <span>{job.companyName || "Unknown Company"}</span>
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-2 text-[#a0a0c0]">
                      <MapPin size={16} />
                      <span>{job.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#a0a0c0]">
                    <Calendar size={16} />
                    <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                  {job.description && (
                    <p className="text-[#a0a0c0] text-sm mt-2 line-clamp-2">{job.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.status === 'open' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'closed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {job.status}
                    </span>
                    {job.type && (
                      <span className="px-2 py-1 bg-[#0066ff]/20 text-[#00d9ff] rounded text-xs">
                        {job.type}
                      </span>
                    )}
                    {job.applicationsCount > 0 && (
                      <span className="px-2 py-1 bg-[#0066ff]/20 text-[#00d9ff] rounded text-xs">
                        {job.applicationsCount} applications
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col gap-2">
                <button
                  onClick={() => setFeedbackForm({ 
                    show: true, 
                    companyId: job.company._id || job.company,
                    companyName: job.companyName,
                    title: `Feedback for: ${job.title}`,
                    message: "",
                    jobId: job._id
                  })}
                  className="px-3 py-2 bg-[#0066ff]/20 text-[#0066ff] rounded-lg hover:bg-[#0066ff]/30 transition text-sm"
                  title="Send feedback to company"
                >
                  Send Feedback
                </button>
                <button
                  onClick={() => handleDelete(job._id, "job")}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                  title="Delete job"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-[#6d6d8f] mb-4" />
          <p className="text-[#a0a0c0]">No jobs found</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#e0e0ff] mb-2">Admin Dashboard</h1>
          <p className="text-[#a0a0c0]">Manage job seekers, companies, and jobs</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0066ff]/20 rounded-lg">
                <Users size={32} className="text-[#00d9ff]" />
              </div>
              <div>
                <p className="text-[#a0a0c0] text-sm">Total Job Seekers</p>
                <p className="text-[#e0e0ff] text-3xl font-bold">{seekers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0066ff]/20 rounded-lg">
                <Building2 size={32} className="text-[#00d9ff]" />
              </div>
              <div>
                <p className="text-[#a0a0c0] text-sm">Total Companies</p>
                <p className="text-[#e0e0ff] text-3xl font-bold">{companies.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "users"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            <Users size={20} className="inline mr-2" />
            All Users
          </button>
          <button
            onClick={() => setActiveTab("seekers")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "seekers"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            <Users size={20} className="inline mr-2" />
            Job Seekers
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "companies"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            <Building2 size={20} className="inline mr-2" />
            Companies
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "jobs"
                ? "bg-[#0066ff] text-white"
                : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
            }`}
          >
            <Briefcase size={20} className="inline mr-2" />
            Jobs
          </button>
        </div>

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
                placeholder={`Search ${
                  activeTab === "seekers" ? "seekers" : 
                  activeTab === "companies" ? "companies" : 
                  activeTab === "jobs" ? "jobs" : "users"
                } by name...`}
                className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg pl-10 pr-4 py-3 text-[#e0e0ff] placeholder-[#6d6d8f] focus:border-[#0066ff] focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchTerm("")
                fetchData()
              }}
              className="px-6 py-3 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
            >
              Clear
            </button>
          </div>
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
        ) : (
          activeTab === "users" ? renderUsers() : 
          activeTab === "seekers" ? renderSeekers() : 
          activeTab === "companies" ? renderCompanies() :
          renderJobs()
        )}

        {/* Feedback Modal */}
        {feedbackForm.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-6 max-w-2xl w-full neon-glow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#e0e0ff]">Send Feedback</h2>
                <button
                  onClick={() => setFeedbackForm({ show: false, companyId: "", companyName: "", title: "", message: "", jobId: "" })}
                  className="p-2 hover:bg-[#0f0f1e] rounded transition"
                >
                  <X size={24} className="text-[#a0a0c0]" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-[#a0a0c0] mb-2">To: <span className="text-[#e0e0ff]">{feedbackForm.companyName}</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Title</label>
                  <input
                    type="text"
                    value={feedbackForm.title}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, title: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    placeholder="Feedback title"
                  />
                </div>

                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Message</label>
                  <textarea
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                    rows="6"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    placeholder="Enter your feedback message..."
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSendFeedback}
                    disabled={sendingFeedback}
                    className="flex-1 bg-[#0066ff] text-white rounded-lg py-3 font-semibold hover:bg-[#0052cc] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={20} />
                    {sendingFeedback ? "Sending..." : "Send Feedback"}
                  </button>
                  <button
                    onClick={() => setFeedbackForm({ show: false, companyId: "", companyName: "", title: "", message: "", jobId: "" })}
                    className="px-6 py-3 bg-[#0f0f1e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
