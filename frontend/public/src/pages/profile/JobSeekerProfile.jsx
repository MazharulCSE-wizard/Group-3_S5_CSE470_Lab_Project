import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import { Plus, Trash2, Edit2, Save, X, Users } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api"

export default function JobSeekerProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [editingProfile, setEditingProfile] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [downloadingCV, setDownloadingCV] = useState(false)
  
  // Experience form states
  const [showExpForm, setShowExpForm] = useState(false)
  const [expForm, setExpForm] = useState({ title: "", company: "", duration: "", description: "" })
  const [editingExpId, setEditingExpId] = useState(null)
  
  // Education form states
  const [showEduForm, setShowEduForm] = useState(false)
  const [eduForm, setEduForm] = useState({ school: "", degree: "", year: "" })
  const [editingEduId, setEditingEduId] = useState(null)
  
  // Settings states
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [changingPassword, setChangingPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  
  // Connections states
  const [connections, setConnections] = useState([])
  const [loadingConnections, setLoadingConnections] = useState(false)
  
  // Ref for timeout cleanup
  const timeoutRef = useRef(null)
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  
  // Helper to set success with auto-clear
  const showSuccess = (message) => {
    setSuccess(message)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setSuccess(""), 3000)
  }

  useEffect(() => {
    fetchProfile()
    fetchConnections()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.get, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setEditForm({
          fullName: data.fullName || "",
          phone: data.phone || "",
          location: data.location || "",
          headline: data.headline || "",
          bio: data.bio || "",
        })
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

  const fetchConnections = async () => {
    setLoadingConnections(true)
    try {
      const response = await fetch(API_ENDPOINTS.connections.list, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        // Filter only accepted connections
        const acceptedConnections = data.filter(conn => conn.status === 'accepted')
        setConnections(acceptedConnections)
      }
    } catch (err) {
      console.error("Fetch connections error:", err)
    } finally {
      setLoadingConnections(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.update, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setEditingProfile(false)
        showSuccess("Profile updated successfully!")
      } else {
        setError(data.message || "Failed to update profile")
      }
    } catch (err) {
      console.error("Update profile error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setSaving(false)
    }
  }

  const addSkill = async () => {
    if (!newSkill.trim()) return
    
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.addSkill, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ skill: newSkill.trim() }),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setNewSkill("")
        showSuccess("Skill added!")
      } else {
        setError(data.message || `Failed to add skill "${newSkill}"`)
      }
    } catch (err) {
      console.error("Add skill error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const removeSkill = async (skill) => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.removeSkill(skill), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        showSuccess("Skill removed!")
      } else {
        setError(data.message || "Failed to remove skill")
      }
    } catch (err) {
      console.error("Remove skill error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const addExperience = async () => {
    if (!expForm.title?.trim() || !expForm.company?.trim() || !expForm.duration?.trim()) {
      setError("Title, company, and duration are required")
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.addExperience, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(expForm),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setExpForm({ title: "", company: "", duration: "", description: "" })
        setShowExpForm(false)
        showSuccess("Experience added!")
      } else {
        setError(data.message || "Failed to add experience")
      }
    } catch (err) {
      console.error("Add experience error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const updateExperience = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.updateExperience(editingExpId), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(expForm),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setExpForm({ title: "", company: "", duration: "", description: "" })
        setEditingExpId(null)
        showSuccess("Experience updated!")
      } else {
        setError(data.message || "Failed to update experience")
      }
    } catch (err) {
      console.error("Update experience error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const deleteExperience = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.deleteExperience(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        showSuccess("Experience deleted!")
      } else {
        setError(data.message || "Failed to delete experience")
      }
    } catch (err) {
      console.error("Delete experience error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const addEducation = async () => {
    if (!eduForm.school?.trim() || !eduForm.degree?.trim() || !eduForm.year?.trim()) {
      setError("School, degree, and year are required")
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.addEducation, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(eduForm),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setEduForm({ school: "", degree: "", year: "" })
        setShowEduForm(false)
        showSuccess("Education added!")
      } else {
        setError(data.message || "Failed to add education")
      }
    } catch (err) {
      console.error("Add education error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const updateEducation = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.updateEducation(editingEduId), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(eduForm),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setEduForm({ school: "", degree: "", year: "" })
        setEditingEduId(null)
        showSuccess("Education updated!")
      } else {
        setError(data.message || "Failed to update education")
      }
    } catch (err) {
      console.error("Update education error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const deleteEducation = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.deleteEducation(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        showSuccess("Education deleted!")
      } else {
        setError(data.message || "Failed to delete education")
      }
    } catch (err) {
      console.error("Delete education error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const downloadCV = async () => {
    if (!profile) return
    
    setDownloadingCV(true)
    setError("")
    
    try {
      const headers = getAuthHeaders()
      delete headers['Content-Type'] // Remove Content-Type for blob response
      
      const response = await fetch(API_ENDPOINTS.profile.seeker.downloadCV, {
        headers: headers
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${profile.fullName?.replace(/\s+/g, '_') || 'CV'}_Resume.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        showSuccess("CV downloaded successfully!")
      } else {
        const data = await response.json()
        setError(data.message || "Failed to download CV")
      }
    } catch (err) {
      console.error("Download CV error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setDownloadingCV(false)
    }
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (limit to 1MB)
    if (file.size > 1024 * 1024) {
      setError("Image size should be less than 1MB")
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file")
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result
      
      try {
        const response = await fetch(API_ENDPOINTS.profile.seeker.update, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ profilePicture: base64String }),
        })
        const data = await response.json()

        if (response.ok) {
          setProfile(data)
          showSuccess("Profile picture updated!")
        } else {
          setError(data.message || "Failed to update profile picture")
        }
      } catch (err) {
        console.error("Update profile picture error:", err)
        setError("Network error. Please try again later.")
      }
    }
    reader.readAsDataURL(file)
  }

  const changePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("All password fields are required")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }

    setChangingPassword(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.auth.changePassword, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        showSuccess("Password changed successfully!")
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setShowPasswordForm(false)
      } else {
        setError(data.message || "Failed to change password")
      }
    } catch (err) {
      console.error("Change password error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setChangingPassword(false)
    }
  }

  const deleteAccount = async () => {
    if (!deletePassword) {
      setError("Password is required to delete account")
      return
    }

    setDeletingAccount(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.auth.deleteAccount, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await response.json()

      if (response.ok) {
        // Clear local storage and redirect to home
        localStorage.clear()
        navigate("/")
      } else {
        setError(data.message || "Failed to delete account")
      }
    } catch (err) {
      console.error("Delete account error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
        <Header />
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />
      <div className="max-w-4xl mx-auto py-12 px-4">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-[#e0e0ff]">My Profile</h1>
            <button
              onClick={downloadCV}
              disabled={downloadingCV}
              className="px-6 py-2 bg-[#00d9ff] text-[#0f0f1e] rounded-lg font-semibold hover:bg-[#00b8d4] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingCV ? "Generating PDF..." : "Download CV as PDF"}
            </button>
          </div>

          {/* Profile Picture */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#0066ff] bg-[#0f0f1e] flex items-center justify-center">
                {profile?.profilePicture ? (
                  <img 
                    src={profile.profilePicture} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-[#a0a0c0]">👤</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-[#0066ff] hover:bg-[#0052cc] rounded-full p-2 cursor-pointer transition">
                <Edit2 size={16} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-[#a0a0c0] mt-2">Click to upload (max 1MB)</p>
          </div>

          {/* Personal Info */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Personal Information</h2>
              {!editingProfile ? (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-2 text-[#0066ff] hover:text-[#00d9ff]"
                >
                  <Edit2 size={18} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-1 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] disabled:opacity-50"
                  >
                    <Save size={18} /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProfile(false)
                      setEditForm({
                        fullName: profile?.fullName || "",
                        phone: profile?.phone || "",
                        location: profile?.location || "",
                        headline: profile?.headline || "",
                        bio: profile?.bio || "",
                      })
                    }}
                    className="flex items-center gap-2 px-4 py-1 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff]"
                  >
                    <X size={18} /> Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="bg-[#0f0f1e] rounded-lg p-6 space-y-4">
              {editingProfile ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Headline</label>
                    <input
                      type="text"
                      value={editForm.headline}
                      onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[#a0a0c0] text-sm font-medium">Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={3}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Full Name</label>
                    <p className="text-[#e0e0ff] text-lg">{profile?.fullName || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Headline</label>
                    <p className="text-[#e0e0ff] text-lg">{profile?.headline || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Email</label>
                    <p className="text-[#e0e0ff] text-lg">{profile?.email || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Phone</label>
                    <p className="text-[#e0e0ff] text-lg">{profile?.phone || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Location</label>
                    <p className="text-[#e0e0ff] text-lg">{profile?.location || "Not set"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[#a0a0c0] text-sm font-medium">Bio</label>
                    <p className="text-[#e0e0ff]">{profile?.bio || "Not set"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-4">Skills</h2>
            <div className="bg-[#0f0f1e] rounded-lg p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {(profile?.skills || []).map((skill, idx) => (
                  <div key={idx} className="bg-[#0066ff] text-white px-4 py-2 rounded-full flex items-center gap-2">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="hover:text-[#00d9ff]">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                  placeholder="Add a skill"
                  className="flex-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] placeholder-[#6d6d8f] focus:border-[#0066ff] focus:outline-none"
                />
                <button
                  onClick={addSkill}
                  className="px-4 py-2 bg-[#00d9ff] text-[#0f0f1e] rounded-lg font-semibold hover:bg-[#00b8d4] transition flex items-center gap-2"
                >
                  <Plus size={20} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Experience</h2>
              <button
                onClick={() => {
                  setShowExpForm(true)
                  setEditingExpId(null)
                  setExpForm({ title: "", company: "", duration: "", description: "" })
                }}
                className="flex items-center gap-2 text-[#0066ff] hover:text-[#00d9ff]"
              >
                <Plus size={18} /> Add Experience
              </button>
            </div>
            
            {(showExpForm || editingExpId) && (
              <div className="bg-[#0f0f1e] rounded-lg p-6 mb-4 border border-[#0066ff]">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Job Title *</label>
                    <input
                      type="text"
                      value={expForm.title}
                      onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Company *</label>
                    <input
                      type="text"
                      value={expForm.company}
                      onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Duration *</label>
                    <input
                      type="text"
                      value={expForm.duration}
                      onChange={(e) => setExpForm({ ...expForm, duration: e.target.value })}
                      placeholder="e.g., 2021 - Present"
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] placeholder-[#6d6d8f] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Description</label>
                    <input
                      type="text"
                      value={expForm.description}
                      onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingExpId ? updateExperience : addExperience}
                    className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
                  >
                    {editingExpId ? "Update" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowExpForm(false)
                      setEditingExpId(null)
                      setExpForm({ title: "", company: "", duration: "", description: "" })
                    }}
                    className="px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {(profile?.experience || []).map((exp) => (
                <div key={exp._id} className="bg-[#0f0f1e] rounded-lg p-6 border border-[#2d2d4d]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-[#e0e0ff]">{exp.title}</h3>
                      <p className="text-[#00d9ff]">{exp.company}</p>
                      <p className="text-[#a0a0c0] text-sm">{exp.duration}</p>
                      {exp.description && <p className="text-[#e0e0ff] mt-2">{exp.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExpId(exp._id)
                          setExpForm({
                            title: exp.title,
                            company: exp.company,
                            duration: exp.duration,
                            description: exp.description || "",
                          })
                          setShowExpForm(false)
                        }}
                        className="text-[#0066ff] hover:text-[#00d9ff]"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteExperience(exp._id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(!profile?.experience || profile.experience.length === 0) && !showExpForm && (
                <p className="text-[#a0a0c0] bg-[#0f0f1e] rounded-lg p-6">No experience added yet</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Education</h2>
              <button
                onClick={() => {
                  setShowEduForm(true)
                  setEditingEduId(null)
                  setEduForm({ school: "", degree: "", year: "" })
                }}
                className="flex items-center gap-2 text-[#0066ff] hover:text-[#00d9ff]"
              >
                <Plus size={18} /> Add Education
              </button>
            </div>
            
            {(showEduForm || editingEduId) && (
              <div className="bg-[#0f0f1e] rounded-lg p-6 mb-4 border border-[#0066ff]">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">School *</label>
                    <input
                      type="text"
                      value={eduForm.school}
                      onChange={(e) => setEduForm({ ...eduForm, school: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Degree *</label>
                    <input
                      type="text"
                      value={eduForm.degree}
                      onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#a0a0c0] text-sm font-medium">Year *</label>
                    <input
                      type="text"
                      value={eduForm.year}
                      onChange={(e) => setEduForm({ ...eduForm, year: e.target.value })}
                      className="w-full mt-1 bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingEduId ? updateEducation : addEducation}
                    className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
                  >
                    {editingEduId ? "Update" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowEduForm(false)
                      setEditingEduId(null)
                      setEduForm({ school: "", degree: "", year: "" })
                    }}
                    className="px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg hover:border-[#0066ff] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {(profile?.education || []).map((edu) => (
                <div key={edu._id} className="bg-[#0f0f1e] rounded-lg p-6 border border-[#2d2d4d]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-[#e0e0ff]">{edu.degree}</h3>
                      <p className="text-[#00d9ff]">{edu.school}</p>
                      <p className="text-[#a0a0c0] text-sm">{edu.year}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEduId(edu._id)
                          setEduForm({
                            school: edu.school,
                            degree: edu.degree,
                            year: edu.year,
                          })
                          setShowEduForm(false)
                        }}
                        className="text-[#0066ff] hover:text-[#00d9ff]"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteEducation(edu._id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(!profile?.education || profile.education.length === 0) && !showEduForm && (
                <p className="text-[#a0a0c0] bg-[#0f0f1e] rounded-lg p-6">No education added yet</p>
              )}
            </div>
          </div>

          {/* Connections */}
          <div className="mt-8 pt-8 border-t border-[#2d2d4d]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Users size={24} className="text-[#0066ff]" />
                <h2 className="text-2xl font-bold text-[#e0e0ff]">My Connections</h2>
                {connections.length > 0 && (
                  <span className="px-3 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded-full text-sm font-semibold">
                    {connections.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/connections')}
                className="text-[#0066ff] hover:text-[#00d9ff] transition text-sm font-semibold"
              >
                View All →
              </button>
            </div>
            
            {loadingConnections ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066ff]"></div>
              </div>
            ) : connections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  // Parse user once outside the map
                  const user = JSON.parse(localStorage.getItem("user") || "{}")
                  
                  return connections.slice(0, 6).map((connection) => {
                    // Determine if the current user is the requester or recipient
                    const otherUser = connection.requester._id === user._id 
                      ? connection.recipient 
                      : connection.requester
                    const otherProfile = connection.requester._id === user._id
                      ? connection.recipientProfile
                      : connection.requesterProfile
                  
                  return (
                    <div
                      key={connection._id}
                      onClick={() => navigate(`/connections/profile/${otherUser._id}`)}
                      className="bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg p-4 hover:border-[#0066ff] transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {otherProfile?.profilePicture && (
                          <img
                            src={otherProfile.profilePicture}
                            alt={otherProfile.fullName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#0066ff]"
                          />
                        )}
                        {!otherProfile?.profilePicture && (
                          <div className="w-12 h-12 rounded-full bg-[#0066ff]/20 flex items-center justify-center border-2 border-[#0066ff]">
                            <Users size={20} className="text-[#0066ff]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#e0e0ff] truncate">
                            {otherProfile?.fullName || otherUser.name}
                          </h3>
                          {otherProfile?.headline && (
                            <p className="text-[#a0a0c0] text-sm truncate">{otherProfile.headline}</p>
                          )}
                          {otherProfile?.location && (
                            <p className="text-[#a0a0c0] text-xs mt-1">📍 {otherProfile.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })
                })()}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#0f0f1e] rounded-lg border border-[#2d2d4d]">
                <Users size={48} className="text-[#2d2d4d] mx-auto mb-4" />
                <p className="text-[#a0a0c0] mb-4">You don't have any connections yet</p>
                <button
                  onClick={() => navigate('/connections')}
                  className="px-6 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
                >
                  Find Connections
                </button>
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="mt-8 pt-8 border-t border-[#2d2d4d]">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Account Settings</h2>
            
            {/* Change Password */}
            <div className="mb-6">
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>

              {showPasswordForm && (
                <div className="mt-4 bg-[#0f0f1e] rounded-lg p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[#a0a0c0] mb-2">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-[#16213e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] focus:border-[#0066ff] outline-none"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-[#a0a0c0] mb-2">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-[#16213e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] focus:border-[#0066ff] outline-none"
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-[#a0a0c0] mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-[#16213e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] focus:border-[#0066ff] outline-none"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <button
                      onClick={changePassword}
                      disabled={changingPassword}
                      className="px-6 py-2 bg-[#00d9ff] text-[#0f0f1e] rounded-lg font-semibold hover:bg-[#00b8d4] transition disabled:opacity-50"
                    >
                      {changingPassword ? "Changing..." : "Update Password"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Account */}
            <div className="mt-6">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg font-semibold hover:bg-red-500/30 transition"
              >
                {showDeleteConfirm ? "Cancel" : "Delete Account"}
              </button>

              {showDeleteConfirm && (
                <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Warning</h3>
                  <p className="text-[#a0a0c0] mb-4">
                    This action is permanent and cannot be undone. All your data including profile, applications, and saved jobs will be deleted.
                  </p>
                  <div className="mb-4">
                    <label className="block text-[#a0a0c0] mb-2">Enter your password to confirm</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-4 py-2 bg-[#16213e] border border-red-500/50 rounded-lg text-[#e0e0ff] focus:border-red-500 outline-none"
                      placeholder="Enter password"
                    />
                  </div>
                  <button
                    onClick={deleteAccount}
                    disabled={deletingAccount}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deletingAccount ? "Deleting..." : "Permanently Delete Account"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
