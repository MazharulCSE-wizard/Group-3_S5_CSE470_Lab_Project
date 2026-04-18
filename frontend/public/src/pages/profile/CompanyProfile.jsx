import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api"
import { Edit2, MapPin, Globe, Building2, Users, Calendar } from "lucide-react"

export default function CompanyProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Settings states
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [changingPassword, setChangingPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  
  // Ref for timeout cleanup
  const timeoutRef = useRef(null)
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.profile.company.get, {
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

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.profile.company.update, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(profile),
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data)
        setSuccess("Profile updated successfully!")
        setIsEditMode(false)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setSuccess(""), 3000)
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
        const response = await fetch(API_ENDPOINTS.profile.company.update, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ profilePicture: base64String }),
        })
        const data = await response.json()

        if (response.ok) {
          setProfile(data)
          setSuccess("Profile picture updated!")
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => setSuccess(""), 3000)
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
        setSuccess("Password changed successfully!")
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setSuccess(""), 3000)
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
            <h1 className="text-4xl font-bold text-[#e0e0ff]">Company Profile</h1>
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
              >
                <Edit2 size={18} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Picture */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#0066ff] bg-[#0f0f1e] flex items-center justify-center">
                {profile?.profilePicture ? (
                  <img 
                    src={profile.profilePicture} 
                    alt="Company Logo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-[#a0a0c0]">🏢</span>
                )}
              </div>
              {isEditMode && (
                <label className="absolute bottom-0 right-0 bg-[#0066ff] hover:bg-[#0052cc] rounded-full p-2 cursor-pointer transition">
                  <Edit2 size={16} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {isEditMode && (
              <p className="text-xs text-[#a0a0c0] mt-2">Click to upload company logo (max 1MB)</p>
            )}
          </div>

          {!isEditMode ? (
            /* Profile Display View */
            <div className="bg-[#0f0f1e] rounded-lg p-6 space-y-6">
              {/* Company Name */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-[#e0e0ff]">{profile?.companyName || "Company Name Not Set"}</h2>
                <p className="text-[#a0a0c0] mt-2">{profile?.email || ""}</p>
              </div>

              {/* Description */}
              {profile?.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#e0e0ff] mb-2">About</h3>
                  <p className="text-[#cbd5f5]">{profile.description}</p>
                </div>
              )}

              {/* Company Details */}
              <div className="grid md:grid-cols-2 gap-6">
                {profile?.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-[#0066ff] mt-1" />
                    <div>
                      <p className="text-[#a0a0c0] text-sm">Location</p>
                      <p className="text-[#e0e0ff] font-medium">{profile.location}</p>
                    </div>
                  </div>
                )}

                {profile?.website && (
                  <div className="flex items-start gap-3">
                    <Globe size={20} className="text-[#0066ff] mt-1" />
                    <div>
                      <p className="text-[#a0a0c0] text-sm">Website</p>
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#0066ff] hover:underline font-medium"
                      >
                        {profile.website}
                      </a>
                    </div>
                  </div>
                )}

                {profile?.industry && (
                  <div className="flex items-start gap-3">
                    <Building2 size={20} className="text-[#0066ff] mt-1" />
                    <div>
                      <p className="text-[#a0a0c0] text-sm">Industry</p>
                      <p className="text-[#e0e0ff] font-medium">{profile.industry}</p>
                    </div>
                  </div>
                )}

                {profile?.size && (
                  <div className="flex items-start gap-3">
                    <Users size={20} className="text-[#0066ff] mt-1" />
                    <div>
                      <p className="text-[#a0a0c0] text-sm">Company Size</p>
                      <p className="text-[#e0e0ff] font-medium">{profile.size}</p>
                    </div>
                  </div>
                )}

                {profile?.founded && (
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-[#0066ff] mt-1" />
                    <div>
                      <p className="text-[#a0a0c0] text-sm">Founded</p>
                      <p className="text-[#e0e0ff] font-medium">{profile.founded}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Profile Edit Form */
            <div className="bg-[#0f0f1e] rounded-lg p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={profile?.companyName || ""}
                  onChange={handleChange}
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#a0a0c0] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Website</label>
                <input
                  type="text"
                  name="website"
                  value={profile?.website || ""}
                  onChange={handleChange}
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Location</label>
                <input
                  type="text"
                  name="location"
                  value={profile?.location || ""}
                  onChange={handleChange}
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#a0a0c0] mb-2 font-medium">Description</label>
              <textarea
                name="description"
                value={profile?.description || ""}
                onChange={handleChange}
                rows="4"
                className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={profile?.industry || ""}
                  onChange={handleChange}
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Company Size</label>
                <input
                  type="text"
                  name="size"
                  value={profile?.size || ""}
                  onChange={handleChange}
                  placeholder="e.g., 100-500"
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] placeholder-[#6d6d8f] focus:border-[#0066ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Founded Year</label>
                <input
                  type="text"
                  name="founded"
                  value={profile?.founded || ""}
                  onChange={handleChange}
                  className="w-full bg-[#16213e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#0066ff] text-white rounded-lg py-2 font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false)
                  fetchProfile() // Reset to original profile data
                }}
                disabled={saving}
                className="flex-1 bg-transparent border border-[#2d2d4d] text-[#e0e0ff] rounded-lg py-2 font-semibold hover:border-[#0066ff] transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            </div>
          )}

          {/* Account Settings - Always visible */}
          {isEditMode && (
            <div className="bg-[#0f0f1e] rounded-lg p-6 mt-6">
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
                      This action is permanent and cannot be undone. All your data including profile, jobs, and applications will be deleted.
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
          )}
        </div>
      </div>
    </div>
  )
}
