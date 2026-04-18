import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { API_ENDPOINTS, getAuthHeaders } from "../config/api"
import { MapPin, Briefcase, DollarSign, Clock, Heart, ChevronDown, ChevronUp, Sparkles, RefreshCw } from "lucide-react"

export default function Jobs() {
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applying, setApplying] = useState(null)
  const [applySuccess, setApplySuccess] = useState("")
  const [page, setPage] = useState(1)
  const [paginationInfo, setPaginationInfo] = useState({ pages: 1, total: 0 })
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    type: "full-time",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    skills: "",
    experience: "",
    openings: "1",
  })
  const [postingJob, setPostingJob] = useState(false)
  const [jobFormError, setJobFormError] = useState("")
  const [jobFormSuccess, setJobFormSuccess] = useState("")
  const [myJobs, setMyJobs] = useState([])
  const [myJobsLoading, setMyJobsLoading] = useState(false)
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [jobApplications, setJobApplications] = useState({})
  const [wishlistStatus, setWishlistStatus] = useState({})
  const [togglingWishlist, setTogglingWishlist] = useState(null)
  const [appliedJobs, setAppliedJobs] = useState({}) // Tracks which jobs user has applied to
  const [interviewModal, setInterviewModal] = useState({ show: false, applicationId: null, jobId: null })
  const [interviewMessage, setInterviewMessage] = useState("")
  const [sendingInterview, setSendingInterview] = useState(false)
  const [bulkEmailModal, setBulkEmailModal] = useState({ show: false, jobId: null })
  const [bulkEmailForm, setBulkEmailForm] = useState({ subject: "", message: "", status: "" })
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false)
  const [directEmailModal, setDirectEmailModal] = useState({ show: false, applicationId: null, applicantName: "", jobTitle: "" })
  const [directEmailForm, setDirectEmailForm] = useState({ subject: "", message: "" })
  const [sendingDirectEmail, setSendingDirectEmail] = useState(false)
  const [editingJobId, setEditingJobId] = useState(null)
  const [editJobForm, setEditJobForm] = useState({})
  const [updatingJob, setUpdatingJob] = useState(false)
  const [profileModal, setProfileModal] = useState({ show: false, profileId: null, profile: null })
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isPostJobExpanded, setIsPostJobExpanded] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendationMessage, setRecommendationMessage] = useState("")
  const [recommendationMessageCode, setRecommendationMessageCode] = useState("")
  
  // Refs for timeout cleanup
  const successTimeoutRef = useRef(null)
  const errorTimeoutRef = useRef(null)

  const user = JSON.parse(localStorage.getItem("user") || "null")
  const isSeeker = user?.role === "seeker"
  const isCompany = user?.role === "company"
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [])

  const fetchJobs = useCallback(async (searchQuery, currentPage) => {
    setLoading(true)
    setError("")
    try {
      const url = new URL(API_ENDPOINTS.jobs.list)
      if (searchQuery) url.searchParams.append("q", searchQuery)
      url.searchParams.append("page", currentPage)
      url.searchParams.append("limit", 10)

      const response = await fetch(url.toString(), { headers: getAuthHeaders() })
      const data = await response.json()

      if (response.ok) {
        setJobs(data.jobs || [])
        setPaginationInfo({ pages: data.pagination?.pages || 1, total: data.pagination?.total || 0 })
      } else {
        setError(data.message || "Failed to fetch jobs")
      }
    } catch (err) {
      console.error("Fetch jobs error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMyJobs = useCallback(async () => {
    if (!isCompany) return

    setMyJobsLoading(true)
    setJobFormError("")
    try {
      const response = await fetch(API_ENDPOINTS.jobs.myJobs, { headers: getAuthHeaders() })
      const data = await response.json()

      if (response.ok) {
        setMyJobs(data || [])
      } else {
        setJobFormError(data.message || "Failed to fetch your jobs")
      }
    } catch (err) {
      console.error("Fetch my jobs error:", err)
      setJobFormError("Network error. Please try again later.")
    } finally {
      setMyJobsLoading(false)
    }
  }, [isCompany])

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true)
    setRecommendationMessage("")
    setRecommendationMessageCode("")
    try {
      const response = await fetch(`${API_ENDPOINTS.jobs.recommendations}?limit=5`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setRecommendations(data.recommendations || [])
        setRecommendationMessage(data.message || "")
        setRecommendationMessageCode(data.messageCode || "")
      } else {
        // Handle error responses
        setRecommendations([])
        setRecommendationMessage(data.message || "Unable to fetch recommendations")
        setRecommendationMessageCode(data.messageCode || "ERROR")
      }
    } catch (err) {
      console.error("Fetch recommendations error:", err)
      setRecommendations([])
      setRecommendationMessage("Network error. Please try again later.")
      setRecommendationMessageCode("NETWORK_ERROR")
    } finally {
      setLoadingRecommendations(false)
    }
  }

  useEffect(() => {
    fetchJobs(q, page)
  }, [q, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMyJobs()
  }, [fetchMyJobs])

  useEffect(() => {
    if (isSeeker) {
      fetchRecommendations()
    }
  }, [isSeeker])

  // Check wishlist status and applied status for all jobs when jobs change
  useEffect(() => {
    if (isSeeker && jobs.length > 0) {
      checkWishlistStatus()
      checkAppliedStatus()
    }
  }, [jobs, isSeeker])

  const checkWishlistStatus = async () => {
    if (!isSeeker) return
    
    try {
      // Use Promise.all to check all jobs in parallel instead of sequentially
      const statusPromises = jobs.map(job =>
        fetch(API_ENDPOINTS.wishlist.check(job._id), {
          headers: getAuthHeaders(),
        })
        .then(res => res.json())
        .then(data => ({ jobId: job._id, inWishlist: data.inWishlist || false }))
        .catch(err => {
          console.error(`Error checking wishlist for job ${job._id}:`, err)
          return { jobId: job._id, inWishlist: false }
        })
      )
      
      const results = await Promise.all(statusPromises)
      const statusChecks = {}
      results.forEach(result => {
        statusChecks[result.jobId] = result.inWishlist
      })
      setWishlistStatus(statusChecks)
    } catch (err) {
      console.error('Error checking wishlist status:', err)
    }
  }

  const checkAppliedStatus = async () => {
    if (!isSeeker) return
    
    try {
      const response = await fetch(API_ENDPOINTS.applications.myApplications, {
        headers: getAuthHeaders(),
      })
      
      if (response.ok) {
        const applications = await response.json()
        const appliedJobsMap = {}
        applications.forEach(app => {
          appliedJobsMap[app.job._id || app.job] = {
            applied: true,
            status: app.status,
            applicationId: app._id,
          }
        })
        setAppliedJobs(appliedJobsMap)
      }
    } catch (err) {
      console.error('Error checking applied status:', err)
    }
  }

  const toggleWishlist = async (jobId) => {
    if (!isSeeker) return
    
    setTogglingWishlist(jobId)
    try {
      const isInWishlist = wishlistStatus[jobId]
      
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(API_ENDPOINTS.wishlist.remove(jobId), {
          method: "DELETE",
          headers: getAuthHeaders(),
        })
        
        if (response.ok) {
          setWishlistStatus(prev => ({ ...prev, [jobId]: false }))
          setApplySuccess("Removed from wishlist")
          if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
          successTimeoutRef.current = setTimeout(() => setApplySuccess(""), 3000)
        }
      } else {
        // Add to wishlist
        const response = await fetch(API_ENDPOINTS.wishlist.add, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ jobId }),
        })
        
        if (response.ok) {
          setWishlistStatus(prev => ({ ...prev, [jobId]: true }))
          setApplySuccess("Added to wishlist")
          if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
          successTimeoutRef.current = setTimeout(() => setApplySuccess(""), 3000)
        }
      }
    } catch (err) {
      console.error("Toggle wishlist error:", err)
      setError("Failed to update wishlist")
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setError(""), 3000)
    } finally {
      setTogglingWishlist(null)
    }
  }

  const fetchJobApplications = async (jobId) => {
    setJobApplications((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || {}), loading: true, error: "" },
    }))

    try {
      const response = await fetch(API_ENDPOINTS.applications.forJob(jobId), { headers: getAuthHeaders() })
      const data = await response.json()

      if (response.ok) {
        setJobApplications((prev) => ({
          ...prev,
          [jobId]: { data, loading: false, error: "" },
        }))
      } else {
        setJobApplications((prev) => ({
          ...prev,
          [jobId]: { ...(prev[jobId] || {}), loading: false, error: data.message || "Failed to fetch applications" },
        }))
      }
    } catch (err) {
      console.error("Fetch job applications error:", err)
      setJobApplications((prev) => ({
        ...prev,
        [jobId]: { ...(prev[jobId] || {}), loading: false, error: "Network error. Please try again later." },
      }))
    }
  }

  const toggleApplications = (jobId) => {
    const isExpanded = expandedJobId === jobId
    setExpandedJobId(isExpanded ? null : jobId)
    if (!isExpanded && !jobApplications[jobId]?.data) {
      fetchJobApplications(jobId)
    }
  }

  const updateApplicationStatus = async (applicationId, status, jobId) => {
    try {
      const response = await fetch(API_ENDPOINTS.applications.updateStatus(applicationId), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      })
      const data = await response.json()

      if (response.ok) {
        setJobApplications((prev) => {
          const current = prev[jobId]?.data || []
          const updated = current.map((app) => (app._id === applicationId ? { ...app, status } : app))
          return {
            ...prev,
            [jobId]: { ...(prev[jobId] || {}), data: updated, error: "" },
          }
        })
      } else {
        setJobApplications((prev) => ({
          ...prev,
          [jobId]: { ...(prev[jobId] || {}), error: data.message || "Failed to update status" },
        }))
      }
    } catch (err) {
      console.error("Update application status error:", err)
      setJobApplications((prev) => ({
        ...prev,
        [jobId]: { ...(prev[jobId] || {}), error: "Network error. Please try again later." },
      }))
    }
  }

  const handleApply = async (jobId) => {
    if (!user) {
      window.location.href = "/auth/login?role=seeker"
      return
    }

    if (!isSeeker) {
      setError("Only job seekers can apply for jobs")
      return
    }

    setApplying(jobId)
    setApplySuccess("")
    try {
      const response = await fetch(API_ENDPOINTS.applications.apply, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ jobId }),
      })
      const data = await response.json()

      if (response.ok) {
        setApplySuccess(`Successfully applied to this job!`)
        // Update applied jobs state
        setAppliedJobs(prev => ({
          ...prev,
          [jobId]: {
            applied: true,
            status: 'pending',
            applicationId: data._id,
          }
        }))
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
        successTimeoutRef.current = setTimeout(() => setApplySuccess(""), 3000)
      } else {
        setError(data.message || "Failed to apply")
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = setTimeout(() => setError(""), 3000)
      }
    } catch (err) {
      console.error("Apply error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setApplying(null)
    }
  }

  const handleCreateJob = async (e) => {
    e.preventDefault()
    setJobFormError("")
    setJobFormSuccess("")

    if (!newJob.title.trim() || !newJob.description.trim() || !newJob.location.trim()) {
      setJobFormError("Title, description, and location are required")
      return
    }

    const salary =
      newJob.salaryMin || newJob.salaryMax
        ? {
            min: newJob.salaryMin ? Number(newJob.salaryMin) : undefined,
            max: newJob.salaryMax ? Number(newJob.salaryMax) : undefined,
            currency: newJob.salaryCurrency || "USD",
          }
        : undefined

    const payload = {
      title: newJob.title.trim(),
      description: newJob.description.trim(),
      location: newJob.location.trim(),
      type: newJob.type,
      experience: newJob.experience || undefined,
      salary,
      skills: newJob.skills
        ? newJob.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [],
      openings: newJob.openings ? Number(newJob.openings) : undefined,
    }

    setPostingJob(true)
    try {
      const response = await fetch(API_ENDPOINTS.jobs.create, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (response.ok) {
        setJobFormSuccess("Job posted successfully!")
        setNewJob({
          title: "",
          description: "",
          location: "",
          type: "full-time",
          salaryMin: "",
          salaryMax: "",
          salaryCurrency: "USD",
          skills: "",
          experience: "",
          openings: "1",
        })
        fetchMyJobs()
      } else {
        setJobFormError(data.message || "Failed to post job")
      }
    } catch (err) {
      console.error("Create job error:", err)
      setJobFormError("Network error. Please try again later.")
    } finally {
      setPostingJob(false)
    }
  }

  const handleEditJob = (job) => {
    setEditingJobId(job._id)
    setEditJobForm({
      title: job.title || "",
      description: job.description || "",
      location: job.location || "",
      type: job.type || "full-time",
      status: job.status || "open",
      salaryMin: job.salary?.min || "",
      salaryMax: job.salary?.max || "",
      salaryCurrency: job.salary?.currency || "USD",
      skills: job.skills?.join(", ") || "",
      experience: job.experience || "",
      openings: job.openings || "1",
    })
  }

  const handleUpdateJob = async (e) => {
    e.preventDefault()
    setJobFormError("")
    setJobFormSuccess("")

    if (!editJobForm.title.trim() || !editJobForm.description.trim() || !editJobForm.location.trim()) {
      setJobFormError("Title, description, and location are required")
      return
    }

    const salary =
      editJobForm.salaryMin || editJobForm.salaryMax
        ? {
            min: editJobForm.salaryMin ? Number(editJobForm.salaryMin) : undefined,
            max: editJobForm.salaryMax ? Number(editJobForm.salaryMax) : undefined,
            currency: editJobForm.salaryCurrency || "USD",
          }
        : undefined

    const payload = {
      title: editJobForm.title.trim(),
      description: editJobForm.description.trim(),
      location: editJobForm.location.trim(),
      type: editJobForm.type,
      status: editJobForm.status,
      experience: editJobForm.experience || undefined,
      salary,
      skills: editJobForm.skills
        ? editJobForm.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [],
      openings: editJobForm.openings ? Number(editJobForm.openings) : undefined,
    }

    setUpdatingJob(true)
    try {
      const response = await fetch(API_ENDPOINTS.jobs.update(editingJobId), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (response.ok) {
        setJobFormSuccess("Job updated successfully!")
        setEditingJobId(null)
        setEditJobForm({})
        fetchMyJobs()
      } else {
        setJobFormError(data.message || "Failed to update job")
      }
    } catch (err) {
      console.error("Update job error:", err)
      setJobFormError("Network error. Please try again later.")
    } finally {
      setUpdatingJob(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingJobId(null)
    setEditJobForm({})
    setJobFormError("")
  }

  const handleDeleteJob = async (jobId, jobTitle) => {
    // Sanitize job title for display in confirm dialog to prevent XSS
    const sanitizedTitle = jobTitle.replace(/[<>]/g, '');
    if (!window.confirm(`Are you sure you want to delete "${sanitizedTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.jobs.delete(jobId), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setJobFormSuccess("Job deleted successfully!")
        fetchMyJobs()
        // Clear success message after 3 seconds
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
        successTimeoutRef.current = setTimeout(() => {
          setJobFormSuccess("")
        }, 3000)
      } else {
        setJobFormError(data.message || "Failed to delete job")
        // Clear error message after 5 seconds
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = setTimeout(() => {
          setJobFormError("")
        }, 5000)
      }
    } catch (err) {
      console.error("Delete job error:", err)
      setJobFormError("Network error. Please try again later.")
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => {
        setJobFormError("")
      }, 5000)
    }
  }

  const viewApplicantProfile = async (profileId) => {
    setProfileModal({ show: true, profileId, profile: null })
    setLoadingProfile(true)
    setError("") // Clear any existing errors
    try {
      const response = await fetch(API_ENDPOINTS.profile.seeker.getPublic(profileId), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (response.ok) {
        setProfileModal({ show: true, profileId, profile: data })
      } else {
        setError(data.message || "Failed to load profile")
        setProfileModal({ show: false, profileId: null, profile: null })
      }
    } catch (err) {
      console.error("Load profile error:", err)
      setError("Network error. Please try again later.")
      setProfileModal({ show: false, profileId: null, profile: null })
    } finally {
      setLoadingProfile(false)
    }
  }

  const downloadApplicantCV = async (userId, applicantName) => {
    try {
      const headers = getAuthHeaders()
      delete headers['Content-Type'] // Remove Content-Type for blob response
      
      const response = await fetch(API_ENDPOINTS.profile.seeker.downloadApplicantCV(userId), {
        headers: headers
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        // Sanitize filename by removing all problematic characters for filenames
        const sanitizedName = (applicantName || 'Applicant')
          .replace(/[/\\:*?"<>|]/g, '') // Remove invalid filename characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .substring(0, 50) // Limit length
        a.download = `${sanitizedName}_CV.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        setError(data.message || "Failed to download CV")
      }
    } catch (err) {
      console.error("Download CV error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const downloadProfilePDF = async (profileId, applicantName) => {
    try {
      const headers = getAuthHeaders()
      delete headers['Content-Type'] // Remove Content-Type for blob response
      
      const response = await fetch(API_ENDPOINTS.profile.seeker.downloadProfilePDF(profileId), {
        headers: headers
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        // Sanitize filename by removing all problematic characters for filenames
        const sanitizedName = (applicantName || 'Profile')
          .replace(/[/\\:*?"<>|]/g, '') // Remove invalid filename characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .substring(0, 50) // Limit length
        a.download = `${sanitizedName}_Profile.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        setError(data.message || "Failed to download profile PDF")
      }
    } catch (err) {
      console.error("Download profile PDF error:", err)
      setError("Network error. Please try again later.")
    }
  }

  const sendInterviewInvitation = async () => {
    if (!interviewMessage.trim()) {
      // Show error in modal context
      setJobFormError("Please enter an interview message")
      return
    }

    setSendingInterview(true)
    setJobFormError("")
    try {
      const response = await fetch(API_ENDPOINTS.applications.callForInterview(interviewModal.applicationId), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: interviewMessage }),
      })
      const data = await response.json()

      if (response.ok) {
        setJobFormSuccess("Interview invitation sent successfully!")
        setInterviewModal({ show: false, applicationId: null, jobId: null })
        setInterviewMessage("")
        setJobFormError("") // Clear any errors
        // Refresh applications for this job
        if (interviewModal.jobId) {
          fetchJobApplications(interviewModal.jobId)
        }
      } else {
        setJobFormError(data.message || "Failed to send interview invitation")
      }
    } catch (err) {
      console.error("Send interview invitation error:", err)
      setJobFormError("Network error. Please try again later.")
    } finally {
      setSendingInterview(false)
    }
  }

  const sendBulkEmail = async () => {
    if (!bulkEmailForm.subject.trim() || !bulkEmailForm.message.trim()) {
      setError("Subject and message are required")
      return
    }

    setSendingBulkEmail(true)
    setError("")
    try {
      const response = await fetch(API_ENDPOINTS.applications.bulkEmail(bulkEmailModal.jobId), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(bulkEmailForm),
      })
      const data = await response.json()

      if (response.ok) {
        setJobFormSuccess(`Bulk email sent: ${data.success} succeeded, ${data.failed} failed`)
        setBulkEmailModal({ show: false, jobId: null })
        setBulkEmailForm({ subject: "", message: "", status: "" })
      } else {
        setError(data.message || "Failed to send bulk email")
      }
    } catch (err) {
      console.error("Send bulk email error:", err)
      setError("Network error. Please try again later.")
    } finally {
      setSendingBulkEmail(false)
    }
  }

  const sendDirectEmail = async () => {
    if (!directEmailForm.subject.trim() || !directEmailForm.message.trim()) {
      setJobFormError("Subject and message are required")
      return
    }

    setSendingDirectEmail(true)
    setJobFormError("")
    try {
      const response = await fetch(API_ENDPOINTS.applications.sendEmail(directEmailModal.applicationId), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(directEmailForm),
      })
      const data = await response.json()

      if (response.ok) {
        setJobFormSuccess("Email sent successfully!")
        setDirectEmailModal({ show: false, applicationId: null, applicantName: "", jobTitle: "" })
        setDirectEmailForm({ subject: "", message: "" })
      } else {
        setJobFormError(data.message || "Failed to send email")
      }
    } catch (err) {
      console.error("Send direct email error:", err)
      setJobFormError("Network error. Please try again later.")
    } finally {
      setSendingDirectEmail(false)
    }
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < paginationInfo.pages) {
      setPage(page + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      <div className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-[#e0e0ff] mb-6">Find Jobs</h1>

        <div className="mb-8">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1) // Reset to first page on search
            }}
            placeholder="Search jobs, companies, or locations"
            className="w-full max-w-xl px-4 py-3 rounded-lg bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] placeholder-[#9aa1b3] focus:outline-none focus:border-[#0066ff]"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {applySuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {applySuccess}
          </div>
        )}

        {isCompany && (
          <div className="mb-10 bg-[#16213e] border border-[#2d2d4d] rounded-2xl neon-glow">
            <div 
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-8 cursor-pointer hover:bg-[#1a2540] transition-colors"
              onClick={() => setIsPostJobExpanded(!isPostJobExpanded)}
            >
              <div className="flex items-center gap-3 flex-1">
                <h2 className="text-2xl font-bold text-[#e0e0ff]">Post a Job</h2>
                {isPostJobExpanded ? (
                  <ChevronUp className="text-[#a0a0c0]" size={24} />
                ) : (
                  <ChevronDown className="text-[#a0a0c0]" size={24} />
                )}
              </div>
              <p className="text-[#a0a0c0] text-sm">Share your open roles with seekers instantly.</p>
            </div>

            {isPostJobExpanded && (
              <div className="px-8 pb-8">
                {jobFormError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {jobFormError}
                  </div>
                )}
                {jobFormSuccess && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
                    {jobFormSuccess}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleCreateJob}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Job Title *</label>
                  <input
                    type="text"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Location *</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Type</label>
                  <select
                    value={newJob.type}
                    onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  >
                    {["full-time", "part-time", "contract", "remote", "internship"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Salary Min</label>
                  <input
                    type="number"
                    value={newJob.salaryMin}
                    onChange={(e) => setNewJob({ ...newJob, salaryMin: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Salary Max</label>
                  <input
                    type="number"
                    value={newJob.salaryMax}
                    onChange={(e) => setNewJob({ ...newJob, salaryMax: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Currency</label>
                  <input
                    type="text"
                    value={newJob.salaryCurrency}
                    onChange={(e) => setNewJob({ ...newJob, salaryCurrency: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Experience</label>
                  <input
                    type="text"
                    value={newJob.experience}
                    onChange={(e) => setNewJob({ ...newJob, experience: e.target.value })}
                    placeholder="e.g., 2-4 years"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Skills</label>
                  <input
                    type="text"
                    value={newJob.skills}
                    onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
                    placeholder="e.g., React, Node, SQL"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Openings</label>
                  <input
                    type="number"
                    min="1"
                    value={newJob.openings}
                    onChange={(e) => setNewJob({ ...newJob, openings: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Description *</label>
                <textarea
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  rows="4"
                  className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={postingJob}
                className="w-full bg-[#0066ff] text-white rounded-lg py-2 font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
              >
                {postingJob ? "Posting..." : "Post Job"}
              </button>
            </form>
              </div>
            )}
          </div>
        )}

        {isCompany && (
          <div className="mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-[#e0e0ff]">Your Job Listings</h2>
              <p className="text-[#a0a0c0] text-sm">
                Track your active openings and applications in one place.
              </p>
            </div>
            {myJobsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066ff]"></div>
              </div>
            ) : myJobs.length ? (
              <div className="grid gap-4">
                {myJobs.map((job) => (
                  <div key={job._id} className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-[#e0e0ff]">{job.title}</h3>
                        <div className="flex flex-wrap gap-3 text-[#a0a0c0] text-sm mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin size={14} /> {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase size={14} /> {job.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Date unavailable"}
                          </span>
                          <span className="flex items-center gap-1">
                            Openings: {job.openings ?? 1}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-[#a0a0c0]">
                        <p>
                          Status: <span className="text-[#e0e0ff] font-semibold">{job.status}</span>
                        </p>
                        <p className="mt-1">
                          Applications: <span className="text-[#e0e0ff] font-semibold">{job.applicationsCount ?? 0}</span>
                        </p>
                        <div className="flex flex-col gap-2 mt-2">
                          <button
                            onClick={() => handleEditJob(job)}
                            className="px-3 py-1 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
                          >
                            Edit Job
                          </button>
                          <button
                            onClick={() => toggleApplications(job._id)}
                            className="px-3 py-1 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
                          >
                            {expandedJobId === job._id ? "Hide applicants" : "View applicants"}
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job._id, job.title)}
                            className="px-3 py-1 border border-red-500/50 text-red-400 rounded-lg font-semibold hover:bg-red-500/20 transition"
                          >
                            Delete Job
                          </button>
                          {job.applicationsCount > 0 && (
                            <button
                              onClick={() => setBulkEmailModal({ show: true, jobId: job._id })}
                              className="px-3 py-1 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
                            >
                              Send Bulk Email
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedJobId === job._id && (
                      <div className="mt-4 border-t border-[#2d2d4d] pt-4">
                        {jobApplications[job._id]?.error && (
                          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {jobApplications[job._id].error}
                          </div>
                        )}
                        {jobApplications[job._id]?.loading ? (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066ff]"></div>
                          </div>
                        ) : (jobApplications[job._id]?.data || []).length ? (
                          <div className="space-y-3">
                            {(jobApplications[job._id]?.data || []).map((application) => (
                              <div key={application._id} className="bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg p-4">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                                  <div>
                                    <p className="text-[#e0e0ff] font-semibold">{application.applicant?.name || application.applicantProfile?.fullName || "Unknown applicant"}</p>
                                    <p className="text-[#a0a0c0] text-sm">{application.applicant?.email || application.applicantProfile?.email || "Email unavailable"}</p>
                                    {application.applicantProfile?.headline && (
                                      <p className="text-[#a0a0c0] text-sm mt-1">{application.applicantProfile.headline}</p>
                                    )}
                                    {application.applicantProfile?.skills?.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {application.applicantProfile.skills.slice(0, 5).map((skill, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2 items-start md:items-end">
                                    <span className="text-sm text-[#a0a0c0]">
                                      Status: <span className={`font-semibold ${
                                        application.status === 'hired' ? 'text-green-400' :
                                        application.status === 'interview' ? 'text-yellow-400' :
                                        application.status === 'accepted' ? 'text-blue-400' :
                                        application.status === 'rejected' ? 'text-red-400' :
                                        'text-[#e0e0ff]'
                                      }`}>{application.status}</span>
                                    </span>
                                    {/* Hiring Pipeline: Workflow buttons */}
                                    <div className="flex flex-wrap gap-2">
                                      <span className="text-xs text-[#a0a0c0] w-full mb-1">Workflow:</span>
                                      {[
                                        { status: "pending", label: "Pending", color: "border-gray-500" },
                                        { status: "reviewing", label: "Reviewing", color: "border-blue-400" },
                                        { status: "shortlisted", label: "Shortlist", color: "border-cyan-400" },
                                        { status: "accepted", label: "Accept", color: "border-green-400" },
                                        { status: "interview", label: "Interview", color: "border-yellow-400" },
                                        { status: "hired", label: "Hire", color: "border-emerald-400" },
                                      ].map(({ status, label, color }) => (
                                        <button
                                          key={status}
                                          onClick={() => updateApplicationStatus(application._id, status, job._id)}
                                          className={`px-3 py-1 rounded-lg text-sm border transition ${
                                            application.status === status
                                              ? status === 'hired' ? 'bg-emerald-500 text-white border-emerald-500' :
                                                status === 'interview' ? 'bg-yellow-500 text-black border-yellow-500' :
                                                status === 'accepted' ? 'bg-green-500 text-white border-green-500' :
                                                'bg-[#0066ff] text-white border-[#0066ff]'
                                              : `bg-transparent text-[#e0e0ff] ${color} hover:border-[#0066ff]`
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      ))}
                                      <button
                                        onClick={() => updateApplicationStatus(application._id, "rejected", job._id)}
                                        className={`px-3 py-1 rounded-lg text-sm border transition ${
                                          application.status === "rejected"
                                            ? "bg-red-500 text-white border-red-500"
                                            : "bg-transparent text-red-400 border-red-500/50 hover:border-red-500"
                                        }`}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {application.applicantProfile?._id && (
                                        <button
                                          onClick={() => viewApplicantProfile(application.applicantProfile._id)}
                                          className="px-4 py-2 bg-[#0066ff]/20 text-[#0066ff] border border-[#0066ff]/50 rounded-lg font-semibold hover:bg-[#0066ff]/30 transition text-sm"
                                        >
                                          View Profile
                                        </button>
                                      )}
                                      {application.applicant?._id && (
                                        <button
                                          onClick={() => {
                                            // Use applicant.name from User model, fallback to applicantProfile.fullName from JobSeekerProfile
                                            const applicantName = application.applicant?.name || application.applicantProfile?.fullName || 'Applicant'
                                            downloadApplicantCV(application.applicant._id, applicantName)
                                          }}
                                          className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg font-semibold hover:bg-purple-500/30 transition text-sm"
                                        >
                                          Download CV
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setInterviewModal({ show: true, applicationId: application._id, jobId: job._id })}
                                        className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg font-semibold hover:bg-green-500/30 transition text-sm"
                                      >
                                        Call for Interview
                                      </button>
                                      <button
                                        onClick={() => setDirectEmailModal({ 
                                          show: true, 
                                          applicationId: application._id, 
                                          applicantName: application.applicant?.name || application.applicantProfile?.fullName || 'Applicant',
                                          jobTitle: job.title
                                        })}
                                        className="px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded-lg font-semibold hover:bg-orange-500/30 transition text-sm"
                                      >
                                        Send Email
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {application.coverLetter && (
                                  <div className="mt-3 text-sm text-[#cbd5f5]">
                                    <p className="font-semibold text-[#e0e0ff]">Cover Letter</p>
                                    <p className="whitespace-pre-wrap">{application.coverLetter}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[#a0a0c0]">No applications yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#a0a0c0]">You have not posted any jobs yet.</p>
            )}
          </div>
        )}

        {/* AI-Powered Job Recommendations for Seekers */}
        {isSeeker && (
          <div className="mb-10 bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles size={28} className="text-[#00d9ff]" />
                <h2 className="text-2xl font-bold text-[#e0e0ff]">AI-Powered Recommendations</h2>
              </div>
              <button
                onClick={fetchRecommendations}
                disabled={loadingRecommendations}
                className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh recommendations"
              >
                <RefreshCw size={18} className={loadingRecommendations ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {loadingRecommendations ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066ff]"></div>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((recommendation) => {
                  const job = recommendation.job
                  return (
                    <div
                      key={job._id}
                      className="bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg p-5 hover:border-[#0066ff] transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#e0e0ff] mb-1">{job.title}</h3>
                          {job.company && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/company/${job.company}`)
                              }}
                              className="text-[#00d9ff] font-medium mb-2 hover:underline cursor-pointer text-left"
                            >
                              {job.companyName}
                            </button>
                          )}
                          {!job.company && <p className="text-[#00d9ff] font-medium mb-2">{job.companyName}</p>}
                          <div className="flex flex-wrap gap-4 text-[#a0a0c0] text-sm">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase size={14} />
                              {job.type}
                            </span>
                            {job.salary?.min && (
                              <span className="flex items-center gap-1">
                                <DollarSign size={14} />
                                {job.salary.min}-{job.salary.max} {job.salary.currency}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-[#00d9ff] font-bold text-lg">
                            {Math.round(recommendation.score * 100)}%
                          </div>
                          <div className="text-[#a0a0c0] text-xs">Match</div>
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      {recommendation.reasoning && (
                        <div className="mb-3 p-2 bg-[#1a1a2e] rounded text-[#a0a0c0] text-sm italic">
                          {recommendation.reasoning}
                        </div>
                      )}

                      {/* Match Breakdown */}
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#2d2d4d]">
                        <div className="text-center">
                          <div className="text-[#a0a0c0] text-xs mb-1">Skills</div>
                          <div className="text-[#e0e0ff] text-sm font-semibold">{recommendation.breakdown?.skillMatch || "N/A"}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[#a0a0c0] text-xs mb-1">Location</div>
                          <div className="text-[#e0e0ff] text-sm font-semibold">{recommendation.breakdown?.locationMatch || "N/A"}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[#a0a0c0] text-xs mb-1">Experience</div>
                          <div className="text-[#e0e0ff] text-sm font-semibold">{recommendation.breakdown?.experienceMatch || "N/A"}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[#a0a0c0] text-xs mb-1">Relevance</div>
                          <div className="text-[#e0e0ff] text-sm font-semibold">{recommendation.breakdown?.typeMatch || "N/A"}%</div>
                        </div>
                      </div>

                      {/* Apply Button */}
                      <div className="mt-4 flex gap-2">
                        {appliedJobs[job._id]?.applied ? (
                          <button
                            disabled
                            className="px-4 py-2 bg-green-600/50 text-white rounded-lg font-semibold cursor-not-allowed"
                          >
                            Applied
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApply(job._id)}
                            disabled={applying === job._id}
                            className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
                          >
                            {applying === job._id ? "Applying..." : "Apply Now"}
                          </button>
                        )}
                        <button
                          onClick={() => toggleWishlist(job._id)}
                          disabled={togglingWishlist === job._id}
                          className="flex items-center justify-center px-4 py-2 border border-[#2d2d4d] rounded-lg hover:border-[#ff1744] transition disabled:opacity-50"
                          title={wishlistStatus[job._id] ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart
                            size={20}
                            className={wishlistStatus[job._id] ? "text-[#ff1744]" : "text-[#a0a0c0]"}
                            fill={wishlistStatus[job._id] ? "#ff1744" : "none"}
                          />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles size={48} className="text-[#2d2d4d] mx-auto mb-4" />
                {recommendationMessageCode === "PROFILE_NOT_FOUND" || recommendationMessageCode === "PROFILE_INCOMPLETE" ? (
                  <>
                    <p className="text-[#a0a0c0] mb-4">{recommendationMessage || "Complete your profile to get personalized job recommendations"}</p>
                    <button
                      onClick={() => navigate("/profile")}
                      className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition"
                    >
                      Complete Your Profile
                    </button>
                  </>
                ) : recommendationMessageCode === "NO_SUITABLE_JOBS" ? (
                  <>
                    <p className="text-[#a0a0c0] mb-2">No suitable jobs found matching your profile</p>
                    <p className="text-[#6b6b8a] text-sm">Try updating your skills or browse all available jobs below</p>
                  </>
                ) : recommendationMessageCode === "NO_JOBS_AVAILABLE" ? (
                  <>
                    <p className="text-[#a0a0c0] mb-2">{recommendationMessage || "You've explored all available jobs!"}</p>
                    <p className="text-[#6b6b8a] text-sm">Check back later for new opportunities!</p>
                  </>
                ) : recommendationMessageCode === "ERROR" || recommendationMessageCode === "NETWORK_ERROR" ? (
                  <>
                    <p className="text-[#a0a0c0] mb-2">{recommendationMessage || "Unable to load recommendations"}</p>
                    <button
                      onClick={fetchRecommendations}
                      className="px-4 py-2 bg-[#2d2d4d] text-white rounded-lg font-semibold hover:bg-[#3d3d5d] transition"
                    >
                      Try Again
                    </button>
                  </>
                ) : (
                  <p className="text-[#a0a0c0]">{recommendationMessage || "No recommendations available. Try refreshing."}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* All Jobs Section - Separated from My Jobs */}
        <div className="mt-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[#e0e0ff]">
                {isCompany ? "Browse All Jobs" : "Available Jobs"}
              </h2>
              <span className="px-3 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded-full text-sm font-semibold">
                {paginationInfo.total || jobs.length} {(paginationInfo.total || jobs.length) === 1 ? 'job' : 'jobs'}
              </span>
            </div>
            {isCompany && (
              <p className="text-[#a0a0c0] text-sm">
                Explore job openings from other companies in the market.
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.length ? (
              jobs.map((job) => (
                <div key={job._id} className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 neon-glow hover:border-[#0066ff] transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[#e0e0ff]">{job.title}</h2>
                      {job.company && (
                        <button
                          onClick={() => navigate(`/company/${job.company}`)}
                          className="text-[#00d9ff] font-medium hover:underline cursor-pointer text-left"
                        >
                          {job.companyName}
                        </button>
                      )}
                      {!job.company && <p className="text-[#00d9ff] font-medium">{job.companyName}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-[#a0a0c0] text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase size={14} /> {job.type}
                        </span>
                        {job.salary?.min && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={14} /> {job.salary?.min?.toLocaleString()} - {job.salary?.max?.toLocaleString()} {job.salary?.currency || "USD"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {job.experience || "Any experience"}
                        </span>
                        <span className="flex items-center gap-1">
                          Openings: {job.openings ?? 1}
                        </span>
                      </div>
                      {job.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.skills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Job Description */}
                      {job.description && (
                        <div className="mt-4 pt-3 border-t border-[#2d2d4d]">
                          <p className="text-[#cbd5f5] text-sm leading-relaxed line-clamp-3">
                            {job.description}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {isSeeker && (
                        <button
                          onClick={() => toggleWishlist(job._id)}
                          disabled={togglingWishlist === job._id}
                          className="flex items-center justify-center px-4 py-2 border border-[#2d2d4d] rounded-lg hover:border-[#ff1744] transition disabled:opacity-50"
                          title={wishlistStatus[job._id] ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart
                            size={20}
                            className={wishlistStatus[job._id] ? "text-[#ff1744]" : "text-[#a0a0c0]"}
                            fill={wishlistStatus[job._id] ? "#ff1744" : "none"}
                          />
                        </button>
                      )}
                      {(isSeeker || !user) && (
                        appliedJobs[job._id]?.applied ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              disabled
                              className="px-4 py-2 bg-green-600/50 text-white rounded-lg font-semibold cursor-not-allowed"
                              title="You have already applied to this job"
                            >
                              Applied
                            </button>
                            <span className="text-xs text-[#a0a0c0] capitalize">
                              Status: {appliedJobs[job._id]?.status || 'pending'}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApply(job._id)}
                            disabled={applying === job._id}
                            className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
                          >
                            {applying === job._id ? "Applying..." : "Apply"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#a0a0c0]">No jobs found</p>
            )}
          </div>
          )}

          {paginationInfo.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className="px-4 py-2 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-[#a0a0c0]">
              Page {page} of {paginationInfo.pages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={page === paginationInfo.pages}
              className="px-4 py-2 bg-[#16213e] border border-[#2d2d4d] text-[#e0e0ff] rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Interview Invitation Modal */}
      {interviewModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 max-w-md w-full m-4 my-8">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-4">Call for Interview</h2>
            <p className="text-[#a0a0c0] mb-4">Send an interview invitation to the applicant</p>
            
            {jobFormError && interviewModal.show && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {jobFormError}
              </div>
            )}
            
            <textarea
              value={interviewMessage}
              onChange={(e) => setInterviewMessage(e.target.value)}
              placeholder="Enter your interview invitation message..."
              className="w-full px-4 py-3 bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] placeholder-[#9aa1b3] focus:outline-none focus:border-[#0066ff] min-h-[150px]"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendInterviewInvitation}
                disabled={sendingInterview}
                className="flex-1 px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
              >
                {sendingInterview ? "Sending..." : "Send Invitation"}
              </button>
              <button
                onClick={() => {
                  setInterviewModal({ show: false, applicationId: null, jobId: null })
                  setInterviewMessage("")
                  setJobFormError("") // Clear errors when closing
                }}
                className="flex-1 px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {bulkEmailModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 max-w-lg w-full m-4 my-8">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-4">Send Bulk Email</h2>
            <p className="text-[#a0a0c0] mb-4">Send an email to all applicants for this job</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Subject *</label>
                <input
                  type="text"
                  value={bulkEmailForm.subject}
                  onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] placeholder-[#9aa1b3] focus:outline-none focus:border-[#0066ff]"
                />
              </div>
              
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Message *</label>
                <textarea
                  value={bulkEmailForm.message}
                  onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, message: e.target.value })}
                  placeholder="Enter your message..."
                  className="w-full px-4 py-3 bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] placeholder-[#9aa1b3] focus:outline-none focus:border-[#0066ff] min-h-[150px]"
                />
              </div>
              
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Filter by Status (optional)</label>
                <select
                  value={bulkEmailForm.status}
                  onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] focus:outline-none focus:border-[#0066ff]"
                >
                  <option value="">All applicants</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="hired">Hired</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendBulkEmail}
                disabled={sendingBulkEmail}
                className="flex-1 px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
              >
                {sendingBulkEmail ? "Sending..." : "Send Email"}
              </button>
              <button
                onClick={() => {
                  setBulkEmailModal({ show: false, jobId: null })
                  setBulkEmailForm({ subject: "", message: "", status: "" })
                }}
                className="flex-1 px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Email Modal */}
      {directEmailModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 max-w-lg w-full m-4 my-8">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-4">Send Email to Applicant</h2>
            <p className="text-[#a0a0c0] mb-4">
              Send a direct email to <span className="text-[#00d9ff]">{directEmailModal.applicantName}</span> regarding their application for <span className="text-[#00d9ff]">{directEmailModal.jobTitle}</span>
            </p>
            
            {jobFormError && directEmailModal.show && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {jobFormError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Subject *</label>
                <input
                  type="text"
                  value={directEmailForm.subject}
                  onChange={(e) => setDirectEmailForm({ ...directEmailForm, subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] placeholder-[#9aa1b3] focus:outline-none focus:border-[#0066ff]"
                />
              </div>
              
              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Message *</label>
                <textarea
                  value={directEmailForm.message}
                  onChange={(e) => setDirectEmailForm({ ...directEmailForm, message: e.target.value })}
                  placeholder="Enter your message..."
                  className="w-full px-4 py-3 bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg text-[#e0e0ff] placeholder-[#9aa1b3] focus:outline-none focus:border-[#0066ff] min-h-[150px]"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendDirectEmail}
                disabled={sendingDirectEmail}
                className="flex-1 px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
              >
                {sendingDirectEmail ? "Sending..." : "Send Email"}
              </button>
              <button
                onClick={() => {
                  setDirectEmailModal({ show: false, applicationId: null, applicantName: "", jobTitle: "" })
                  setDirectEmailForm({ subject: "", message: "" })
                  setJobFormError("")
                }}
                className="flex-1 px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJobId && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 max-w-3xl w-full m-4 my-8">
            <h2 className="text-2xl font-bold text-[#e0e0ff] mb-6">Edit Job</h2>
            
            {jobFormError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {jobFormError}
              </div>
            )}

            <form onSubmit={handleUpdateJob} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Job Title *</label>
                  <input
                    type="text"
                    value={editJobForm.title}
                    onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Location *</label>
                  <input
                    type="text"
                    value={editJobForm.location}
                    onChange={(e) => setEditJobForm({ ...editJobForm, location: e.target.value })}
                    placeholder="e.g., New York, NY"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Job Type *</label>
                  <select
                    value={editJobForm.type}
                    onChange={(e) => setEditJobForm({ ...editJobForm, type: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Job Status *</label>
                  <select
                    value={editJobForm.status}
                    onChange={(e) => setEditJobForm({ ...editJobForm, status: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Experience Level</label>
                  <input
                    type="text"
                    value={editJobForm.experience}
                    onChange={(e) => setEditJobForm({ ...editJobForm, experience: e.target.value })}
                    placeholder="e.g., 3-5 years"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Salary Min</label>
                  <input
                    type="number"
                    value={editJobForm.salaryMin}
                    onChange={(e) => setEditJobForm({ ...editJobForm, salaryMin: e.target.value })}
                    placeholder="50000"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Salary Max</label>
                  <input
                    type="number"
                    value={editJobForm.salaryMax}
                    onChange={(e) => setEditJobForm({ ...editJobForm, salaryMax: e.target.value })}
                    placeholder="80000"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Currency</label>
                  <select
                    value={editJobForm.salaryCurrency}
                    onChange={(e) => setEditJobForm({ ...editJobForm, salaryCurrency: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="BDT">BDT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Skills</label>
                  <input
                    type="text"
                    value={editJobForm.skills}
                    onChange={(e) => setEditJobForm({ ...editJobForm, skills: e.target.value })}
                    placeholder="e.g., React, Node, SQL"
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#a0a0c0] mb-2 font-medium">Openings</label>
                  <input
                    type="number"
                    min="1"
                    value={editJobForm.openings}
                    onChange={(e) => setEditJobForm({ ...editJobForm, openings: e.target.value })}
                    className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a0a0c0] mb-2 font-medium">Description *</label>
                <textarea
                  value={editJobForm.description}
                  onChange={(e) => setEditJobForm({ ...editJobForm, description: e.target.value })}
                  rows="6"
                  className="w-full bg-[#0f0f1e] border border-[#2d2d4d] rounded-lg px-4 py-2 text-[#e0e0ff] focus:border-[#0066ff] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={updatingJob}
                  className="flex-1 px-4 py-2 bg-[#0066ff] text-white rounded-lg font-semibold hover:bg-[#0052cc] transition disabled:opacity-50"
                >
                  {updatingJob ? "Updating..." : "Update Job"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicant Profile Modal */}
      {profileModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 max-w-3xl w-full m-4 my-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#e0e0ff]">Applicant Profile</h2>
              </div>
              <div className="flex gap-2 items-center">
                {profileModal.profile?._id && (
                  <button
                    onClick={() => downloadProfilePDF(
                      profileModal.profile._id,
                      profileModal.profile.fullName
                    )}
                    className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg font-semibold hover:bg-green-500/30 transition text-sm"
                  >
                    Download Profile PDF
                  </button>
                )}
                {profileModal.profile?.user && (
                  <button
                    onClick={() => downloadApplicantCV(
                      profileModal.profile.user,
                      profileModal.profile.fullName
                    )}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-lg font-semibold hover:bg-blue-500/30 transition text-sm"
                  >
                    Download CV
                  </button>
                )}
                <button
                  onClick={() => setProfileModal({ show: false, profileId: null, profile: null })}
                  className="text-[#a0a0c0] hover:text-[#e0e0ff] transition text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingProfile ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066ff]"></div>
              </div>
            ) : profileModal.profile ? (
              <div className="space-y-6">
                {/* Profile Picture */}
                {profileModal.profile.profilePicture && (
                  <div className="flex justify-center mb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#0066ff] bg-[#0f0f1e]">
                      <img 
                        src={profileModal.profile.profilePicture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                {/* Basic Info */}
                <div>
                  <h3 className="text-xl font-semibold text-[#e0e0ff] mb-2">{profileModal.profile.fullName}</h3>
                  {profileModal.profile.headline && (
                    <p className="text-[#00d9ff] text-lg mb-2">{profileModal.profile.headline}</p>
                  )}
                  {profileModal.profile.location && (
                    <div className="text-[#a0a0c0]">
                      <p>📍 {profileModal.profile.location}</p>
                    </div>
                  )}
                </div>

                {/* Bio */}
                {profileModal.profile.bio && (
                  <div>
                    <h4 className="text-lg font-semibold text-[#e0e0ff] mb-2">About</h4>
                    <p className="text-[#cbd5f5]">{profileModal.profile.bio}</p>
                  </div>
                )}

                {/* Skills */}
                {profileModal.profile.skills?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-[#e0e0ff] mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {profileModal.profile.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-[#0066ff]/20 text-[#0066ff] rounded-lg text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {profileModal.profile.experience?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-[#e0e0ff] mb-3">Experience</h4>
                    <div className="space-y-4">
                      {profileModal.profile.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-2 border-[#0066ff] pl-4">
                          <h5 className="font-semibold text-[#e0e0ff]">{exp.title}</h5>
                          <p className="text-[#a0a0c0] text-sm">{exp.company} • {exp.duration}</p>
                          {exp.description && (
                            <p className="text-[#cbd5f5] text-sm mt-1">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {profileModal.profile.education?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-[#e0e0ff] mb-3">Education</h4>
                    <div className="space-y-3">
                      {profileModal.profile.education.map((edu, idx) => (
                        <div key={idx} className="border-l-2 border-[#0066ff] pl-4">
                          <h5 className="font-semibold text-[#e0e0ff]">{edu.degree}</h5>
                          <p className="text-[#a0a0c0] text-sm">{edu.school} • {edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[#a0a0c0] text-center py-8">Failed to load profile</p>
            )}

            <div className="mt-6">
              <button
                onClick={() => setProfileModal({ show: false, profileId: null, profile: null })}
                className="w-full px-4 py-2 border border-[#2d2d4d] text-[#e0e0ff] rounded-lg font-semibold hover:border-[#0066ff] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
