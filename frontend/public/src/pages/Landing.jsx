import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { Briefcase, Users, Zap, ArrowRight } from "lucide-react"

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen `bg-gradient-to-b` from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  <span className="gradient-text">Your Dream Job</span>
                  <br />
                  <span className="text-[#e0e0ff]">Awaits</span>
                </h1>
                <p className="text-xl text-[#a0a0c0] leading-relaxed mb-8">
                  Connect with opportunities that match your skills. OSEEK helps job seekers and companies find the
                  perfect fit.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate("/auth/signup?role=seeker")}
                  className="px-8 py-3 bg-[#0066ff] rounded-lg font-semibold text-white hover:bg-[#0052cc] transition neon-glow-hover"
                >
                  Find Jobs
                </button>
                <button
                  onClick={() => navigate("/auth/signup?role=company")}
                  className="px-8 py-3 border-2 border-[#0066ff] text-[#0066ff] rounded-lg font-semibold hover:bg-[#0066ff] hover:text-white transition"
                >
                  Post Jobs
                </button>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="hidden md:block">
              <div className="relative h-96">
                <div className="absolute inset-0 bg-linear-to-r from-[#0066ff]/20 to-[#00d9ff]/20 rounded-2xl blur-3xl"></div>
                <div className="relative bg-[#16213e] border border-[#2d2d4d] rounded-2xl p-8 neon-glow">
                  <div className="space-y-4">
                    <div className="h-4 bg-[#2d2d4d] rounded w-3/4"></div>
                    <div className="h-4 bg-[#2d2d4d] rounded w-full"></div>
                    <div className="h-4 bg-[#2d2d4d] rounded w-5/6"></div>
                    <div className="pt-4 space-y-2">
                      <div className="h-3 bg-[#0066ff]/30 rounded w-1/2"></div>
                      <div className="h-3 bg-[#00d9ff]/30 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[#1a1a2e]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-[#e0e0ff]">Why Choose OSEEK?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Briefcase className="w-8 h-8" />,
                title: "Smart Matching",
                description: "AI-powered recommendations match your skills with perfect opportunities",
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Easy Collaboration",
                description: "Seamless communication between job seekers and employers",
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Fast & Secure",
                description: "Quick application process with enterprise-grade security",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#16213e] border border-[#2d2d4d] rounded-xl p-6 hover:border-[#0066ff] transition"
              >
                <div className="text-[#00d9ff] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-[#e0e0ff]">{feature.title}</h3>
                <p className="text-[#a0a0c0]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-[#16213e] border border-[#0066ff]/50 rounded-2xl p-12 text-center neon-glow">
          <h2 className="text-3xl font-bold mb-4 text-[#e0e0ff]">Ready to Get Started?</h2>
          <p className="text-[#a0a0c0] mb-8">Join thousands of users finding their dream jobs on OSEEK</p>
          <button
            onClick={() => navigate("/auth/signup")}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#0066ff] rounded-lg font-semibold text-white hover:bg-[#0052cc] transition"
          >
            Create Account <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  )
}
