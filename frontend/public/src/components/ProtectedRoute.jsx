import { useState, useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"

// Check if token is likely expired based on JWT structure
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Check if token has exp claim and if it's expired
    if (payload.exp) {
      return Date.now() >= payload.exp * 1000
    }
    return false
  } catch {
    // If we can't parse the token, consider it invalid
    return true
  }
}

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token")
      
      if (!token) {
        setLoading(false)
        setIsValid(false)
        return
      }

      try {
        const response = await fetch(API_ENDPOINTS.auth.me, {
          headers: getAuthHeaders(),
        })

        if (response.ok) {
          const user = await response.json()
          // Update stored user data in case it changed
          localStorage.setItem("user", JSON.stringify(user))
          setIsValid(true)
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          setIsValid(false)
        }
      } catch {
        // Network error - check if token appears valid locally
        // Only allow access if token doesn't appear to be expired
        if (!isTokenExpired(token)) {
          setIsValid(true)
        } else {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          setIsValid(false)
        }
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
      </div>
    )
  }

  if (!isValid) {
    return <Navigate to="/auth/login" replace />
  }

  return <Outlet />
}
