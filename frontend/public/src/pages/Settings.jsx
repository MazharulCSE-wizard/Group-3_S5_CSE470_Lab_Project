import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Settings as SettingsIcon, User, Lock, Bell, Trash2, Save, Eye, EyeOff } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function Settings() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [activeTab, setActiveTab] = useState("account")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Notification settings state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    applicationUpdates: true,
    jobRecommendations: true,
    connectionRequests: true,
  })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(API_ENDPOINTS.auth.changePassword, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        setSuccess("Password changed successfully")
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        setError(data.message || "Failed to change password")
      }
    } catch (err) {
      console.error("Change password error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
    )) {
      return
    }

    const confirmText = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmText !== "DELETE") {
      alert("Account deletion cancelled")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.auth.deleteAccount, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        alert("Your account has been deleted successfully")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        navigate("/")
      } else {
        setError(data.message || "Failed to delete account")
      }
    } catch (err) {
      console.error("Delete account error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationSave = () => {
    setSuccess("Notification preferences saved")
    // In a real app, this would save to backend
    setTimeout(() => setSuccess(""), 3000)
  }

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#e0e0ff] mb-4 flex items-center gap-2">
          <User size={24} className="text-[#00d9ff]" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[#a0a0c0] text-sm mb-2">Name</label>
            <input
              type="text"
              value={user.name || ""}
              disabled
              className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-3 text-[#e0e0ff] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[#a0a0c0] text-sm mb-2">Email</label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-3 text-[#e0e0ff] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[#a0a0c0] text-sm mb-2">Role</label>
            <input
              type="text"
              value={user.role || ""}
              disabled
              className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-3 text-[#e0e0ff] disabled:opacity-50 capitalize"
            />
          </div>
          <p className="text-[#a0a0c0] text-sm mt-4">
            To update your profile information, visit your{" "}
            <button
              onClick={() => navigate(user.role === "seeker" ? "/profile/seeker" : "/profile/company")}
              className="text-[#0066ff] hover:underline"
            >
              profile page
            </button>
          </p>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <form onSubmit={handlePasswordChange} className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#e0e0ff] mb-4 flex items-center gap-2">
          <Lock size={24} className="text-[#00d9ff]" />
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[#a0a0c0] text-sm mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-3 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0c0] hover:text-[#e0e0ff]"
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[#a0a0c0] text-sm mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-3 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0c0] hover:text-[#e0e0ff]"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[#a0a0c0] text-sm mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-3 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0c0] hover:text-[#e0e0ff]"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#e0e0ff] mb-4 flex items-center gap-2">
          <Bell size={24} className="text-[#00d9ff]" />
          Notification Preferences
        </h3>
        <div className="space-y-4">
          {[
            { key: "emailNotifications", label: "Email Notifications", description: "Receive email updates" },
            { key: "applicationUpdates", label: "Application Updates", description: "Get notified about application status changes" },
            { key: "jobRecommendations", label: "Job Recommendations", description: "Receive personalized job recommendations" },
            { key: "connectionRequests", label: "Connection Requests", description: "Get notified about new connection requests" },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 bg-[#0f0f1e] rounded-lg">
              <div>
                <p className="text-[#e0e0ff] font-medium">{setting.label}</p>
                <p className="text-[#a0a0c0] text-sm">{setting.description}</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={notifications[setting.key]}
                  onChange={(e) => setNotifications({ ...notifications, [setting.key]: e.target.checked })}
                  className="sr-only peer"
                />
                <span className="absolute inset-0 bg-[#2d2d4d] rounded-full cursor-pointer peer-checked:bg-[#0066ff] transition"></span>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-6"></span>
              </label>
            </div>
          ))}
          <button
            onClick={handleNotificationSave}
            className="w-full px-4 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )

  const renderDangerZone = () => (
    <div className="space-y-6">
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
          <Trash2 size={24} />
          Danger Zone
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-[#e0e0ff] font-medium mb-2">Delete Account</p>
            <p className="text-[#a0a0c0] text-sm mb-4">
              Once you delete your account, there is no going back. All your data including profile, applications, and connections will be permanently deleted.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 size={20} />
              {loading ? "Deleting..." : "Delete My Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const tabs = [
    { id: "account", label: "Account", icon: <User size={20} /> },
    { id: "security", label: "Security", icon: <Lock size={20} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={20} /> },
    { id: "danger", label: "Danger Zone", icon: <Trash2 size={20} /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon size={32} className="text-[#00d9ff]" />
            <h1 className="text-4xl font-bold text-[#e0e0ff]">Settings</h1>
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

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-[#0066ff] text-white"
                  : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "account" && renderAccountSettings()}
          {activeTab === "security" && renderSecuritySettings()}
          {activeTab === "notifications" && renderNotificationSettings()}
          {activeTab === "danger" && renderDangerZone()}
        </div>
      </div>
    </div>
  )
}
