import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Bell, Check, Trash2, AlertCircle, Briefcase, MessageSquare } from "lucide-react"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.notifications.list, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
      } else {
        setError(data.message || "Failed to fetch notifications")
      }
    } catch (err) {
      console.error("Fetch notifications error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.notifications.markAsRead(id), {
        method: "PUT",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        )
      }
    } catch (err) {
      console.error("Mark as read error:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.notifications.markAllAsRead, {
        method: "PUT",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    } catch (err) {
      console.error("Mark all as read error:", err)
    }
  }

  const deleteNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) {
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.notifications.delete(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id))
      }
    } catch (err) {
      console.error("Delete notification error:", err)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "admin_feedback":
        return <MessageSquare size={20} className="text-[#0066ff]" />
      case "job_deleted":
        return <AlertCircle size={20} className="text-red-400" />
      case "application_update":
        return <Briefcase size={20} className="text-[#00d9ff]" />
      case "interview_scheduled":
        return <Bell size={20} className="text-[#ffa500]" />
      default:
        return <Bell size={20} className="text-[#a0a0c0]" />
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.isRead
    return notification.type === filter
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bell size={32} className="text-[#00d9ff]" />
            <h1 className="text-4xl font-bold text-[#e0e0ff]">Notifications</h1>
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

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === "all"
                  ? "bg-[#0066ff] text-white"
                  : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === "unread"
                  ? "bg-[#0066ff] text-white"
                  : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("admin_feedback")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === "admin_feedback"
                  ? "bg-[#0066ff] text-white"
                  : "bg-[#16213e] text-[#a0a0c0] border border-[#2d2d4d] hover:border-[#0066ff]"
              }`}
            >
              Feedback
            </button>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] rounded-lg font-semibold hover:bg-[#00d9ff]/30 transition"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-6 neon-glow">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-lg border ${
                    notification.isRead
                      ? "bg-[#0f0f1e] border-[#2d2d4d]"
                      : "bg-[#0066ff]/10 border-[#0066ff]"
                  } hover:bg-[#1a1a2e] transition`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-[#e0e0ff]">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="p-1 hover:bg-[#0066ff]/20 rounded transition"
                              title="Mark as read"
                            >
                              <Check size={16} className="text-[#00d9ff]" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="p-1 hover:bg-red-500/20 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[#a0a0c0] text-sm mb-2">{notification.message}</p>
                      {notification.relatedJob && (
                        <p className="text-[#00d9ff] text-sm mb-2">
                          Related Job: {notification.relatedJob.title}
                        </p>
                      )}
                      <p className="text-[#6d6d8f] text-xs">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell size={64} className="text-[#2d2d4d] mx-auto mb-4" />
              <p className="text-[#a0a0c0] text-lg">
                {filter === "all"
                  ? "No notifications yet"
                  : filter === "unread"
                  ? "No unread notifications"
                  : `No ${filter} notifications`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
