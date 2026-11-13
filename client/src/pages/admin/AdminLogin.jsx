
import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, Utensils } from 'lucide-react'
import '../../styles/admin.css'
import { useNavigate } from "react-router-dom"
import http from "../../api/http"

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading) return

    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    try {
      setLoading(true)

      const response = await http.post('/auth/login', {
        email: email.trim(),
        password,
      })

      const { token, admin } = response.data

      // Verify login response
      if (!token) {
        throw new Error('Authentication token was not received.')
      }

      // Clear previous admin session
      sessionStorage.removeItem('adminToken')
      sessionStorage.removeItem('adminData')

      // Store new admin session
      sessionStorage.setItem('adminToken', token)

      if (admin) {
        sessionStorage.setItem(
          'adminData',
          JSON.stringify(admin)
        )
      }

      // Navigate to admin dashboard
      navigate('/admin/dashboard')

    } catch (error) {
      console.error('Admin login error:', error)

      setError(
        error.response?.data?.message ||
        error.message ||
        'Unable to login. Please try again.'
      )

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">

      {/* Left branding section */}
      <section className="admin-login-brand">
        <div className="admin-brand-content">

          <div className="admin-brand-logo">
            <div className="admin-logo-icon">
              <Utensils size={25} />
            </div>
            <span>DineCloud</span>
          </div>

          <div className="admin-brand-message">
            <span className="admin-eyebrow">
              ADMINISTRATION PORTAL
            </span>

            <h1>
              Manage your restaurant,
              <span> beautifully.</span>
            </h1>

            <p>
              One place to manage incoming orders, monitor restaurant
              activity and keep your operations running smoothly.
            </p>
          </div>

          <div className="admin-brand-footer">
            <ShieldCheck size={17} />
            <span>Authorized personnel only</span>
          </div>

        </div>

        <div className="admin-decoration admin-decoration-one" />
        <div className="admin-decoration admin-decoration-two" />
      </section>

      {/* Right login section */}
      <section className="admin-login-form-section">

        <div className="admin-login-form-wrapper">

          <div className="admin-mobile-logo">
            <div className="admin-logo-icon">
              <Utensils size={23} />
            </div>
            <span>DineCloud</span>
          </div>

          <div className="admin-form-heading">
            <span className="admin-form-eyebrow">
              WELCOME BACK
            </span>

            <h2>Admin Login</h2>

            <p>
              Enter your credentials to access the admin dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="admin-login-form">

            <div className="admin-input-group">
              <label htmlFor="admin-email">Email Address</label>

              <input
                id="admin-email"
                type="email"
                placeholder="admin@dinecloud.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>

            <div className="admin-input-group">
              <label htmlFor="admin-password">Password</label>

              <div className="admin-password-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }
                </button>
              </div>
            </div>

            {error && (
              <p className="admin-login-error" role="alert">
                {error}
              </p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="admin-login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="admin-login-spinner"></span>
                  Signing In...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>

          </form>

          <p className="admin-login-security">
            <ShieldCheck size={15} />
            Secure access for authorized administrators
          </p>

          <div className="admin-login-bottom">
            <span>© DineCloud</span>
            <span>Restaurant Management System</span>
          </div>

        </div>
      </section>

    </div>
  )
}

export default AdminLogin
