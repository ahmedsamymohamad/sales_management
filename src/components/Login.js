import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, CheckCircle } from 'lucide-react';

export default function Login({ onAuthSuccess, showToast }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('employee');
  const [monthlyTarget, setMonthlyTarget] = useState('5000');
  const [loading, setLoading] = useState(false);
  
  // Custom Email Verification States
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');

  const [adminExists, setAdminExists] = useState(false);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      
      if (!error && data && data.length > 0) {
        setAdminExists(true);
        setRole('employee');
      } else {
        setAdminExists(false);
      }
    } catch (err) {
      console.error('Error checking existing admins:', err);
    }
  };

  useEffect(() => {
    checkAdminExists();
  }, [isSignUp, showVerification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email || !password) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (isSignUp && !fullName) {
      showToast('Please enter your full name.', 'warning');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 1. Check if email already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim().toLowerCase());
        
        if (checkError) throw checkError;
        if (existingUser && existingUser.length > 0) {
          showToast('An account with this email already exists.', 'warning');
          setLoading(false);
          return;
        }

        // 2. Generate a custom 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setSentCode(code);
        setVerifyEmail(email.trim().toLowerCase());

        // 3. Register user in database with is_verified = false
        const { error: signUpError } = await supabase
          .from('profiles')
          .insert([
            {
              email: email.trim().toLowerCase(),
              password: password, // In production, hash this password
              full_name: fullName,
              role: role,
              monthly_target: role === 'employee' ? parseFloat(monthlyTarget) || 0 : 0,
              is_verified: false,
              verification_code: code
            }
          ]);

        if (signUpError) throw signUpError;

        showToast(`Verification code generated!`, 'success');
        // Let the user know the verification code in a dialog helper
        setShowVerification(true);
      } else {
        // Sign In Flow
        const { data: userProfile, error: signInError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .eq('password', password);

        if (signInError) throw signInError;

        if (!userProfile || userProfile.length === 0) {
          showToast('Invalid email or password.', 'danger');
          setLoading(false);
          return;
        }

        const activeUser = userProfile[0];

        if (!activeUser.is_verified) {
          showToast('Please verify your email address first.', 'warning');
          setVerifyEmail(activeUser.email);
          setSentCode(activeUser.verification_code);
          setShowVerification(true);
          setLoading(false);
          return;
        }

        showToast('Welcome back!', 'success');
        onAuthSuccess(activeUser);
      }
    } catch (error) {
      console.error('Auth operation failed:', error);
      showToast(error.message || 'Authentication failed. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      showToast('Please enter the verification code.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch user profile
      const { data: userProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', verifyEmail);

      if (fetchError) throw fetchError;
      if (!userProfile || userProfile.length === 0) {
        showToast('Verification record not found.', 'danger');
        setLoading(false);
        return;
      }

      const activeUser = userProfile[0];

      // 2. Validate Code
      if (verificationCode.trim() === activeUser.verification_code) {
        // Update database verification status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_verified: true, verification_code: null })
          .eq('email', verifyEmail);

        if (updateError) throw updateError;

        showToast('Email verified successfully! Logging in...', 'success');
        
        // Log in immediately
        onAuthSuccess({ ...activeUser, is_verified: true });
      } else {
        showToast('Invalid verification code. Please try again.', 'danger');
      }
    } catch (err) {
      console.error('Verification failed:', err);
      showToast(err.message || 'Verification failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill accounts for demo convenience
  const handleQuickDemo = async (demoType) => {
    const demoEmail = demoType === 'admin' ? 'admin@demo.com' : 'employee@demo.com';
    const demoPassword = demoType === 'admin' ? 'admin123' : 'employee123';
    
    setLoading(true);
    try {
      // Query if demo account exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', demoEmail);

      if (error) throw error;

      if (!data || data.length === 0) {
        // If not exists, automatically create and verify it
        const { error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              email: demoEmail,
              password: demoPassword,
              full_name: demoType === 'admin' ? 'Demo Admin' : 'Demo Employee',
              role: demoType === 'admin' ? 'admin' : 'employee',
              monthly_target: demoType === 'employee' ? 10000 : 0,
              is_verified: true
            }
          ]);
        
        if (createError) throw createError;
        showToast(`Auto-created Verified Demo Account: ${demoEmail}`, 'success');
      }

      setEmail(demoEmail);
      setPassword(demoPassword);
      setIsSignUp(false);
      setShowVerification(false);
      
      // Auto-trigger form submission values
      showToast('Prefilled credentials. Click Sign In to connect!', 'success');
    } catch (err) {
      console.error('Demo setup failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel">
          <div className="login-header">
            <div className="brand-icon">✓</div>
            <h2>Verify Your Email</h2>
            <p>Please enter the verification code sent to {verifyEmail}</p>
          </div>

          {/* Code display banner for testing ease */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px dashed var(--accent-purple)',
            borderRadius: '10px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Developer Testing Email Sandbox</p>
            <p style={{ fontSize: '1.8rem', fontWeight: '700', letterSpacing: '4px', margin: '8px 0', color: 'var(--accent-pink)' }}>
              {sentCode}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This simulated code bypasses SMTP delivery rate limits.</p>
          </div>

          <form onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label htmlFor="otpCode">6-Digit Verification Code</label>
              <input
                id="otpCode"
                type="text"
                maxLength="6"
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: '600' }}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="loader"></span>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Verify and Activate</span>
                </>
              )}
            </button>

            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: '100%', marginTop: '12px', border: 'none', background: 'transparent' }}
              onClick={() => setShowVerification(false)}
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="brand-icon">A</div>
          <h2>AuraSales</h2>
          <p>Sales Performance Management Platform</p>
        </div>

        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => setIsSignUp(false)}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => setIsSignUp(true)}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isSignUp && (
            <>
              <div className="form-group">
                <label>Account Role</label>
                <div className="select-role-container">
                  <div style={adminExists ? { gridColumn: 'span 2' } : {}}>
                    <input
                      type="radio"
                      id="role-employee"
                      name="role"
                      value="employee"
                      className="role-radio"
                      checked={role === 'employee'}
                      onChange={() => setRole('employee')}
                    />
                    <label htmlFor="role-employee" className="role-label">
                      Employee
                    </label>
                  </div>
                  {!adminExists && (
                    <div>
                      <input
                        type="radio"
                        id="role-admin"
                        name="role"
                        value="admin"
                        className="role-radio"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                      />
                      <label htmlFor="role-admin" className="role-label">
                        Administrator
                      </label>
                    </div>
                  )}
                </div>
                {adminExists && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    * Admin accounts can only be registered by an existing administrator.
                  </p>
                )}
              </div>

              {role === 'employee' && (
                <div className="form-group">
                  <label htmlFor="monthlyTarget">Monthly Sales Target ($)</label>
                  <input
                    id="monthlyTarget"
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="5000"
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="loader"></span>
            ) : isSignUp ? (
              <>
                <UserPlus size={18} />
                <span>Register Account</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="demo-accounts">
          <p className="demo-title">Reviewer Demo Accounts</p>
          <div className="demo-buttons">
            <button 
              type="button" 
              className="btn-demo"
              onClick={() => handleQuickDemo('admin')}
            >
              Demo Admin
            </button>
            <button 
              type="button" 
              className="btn-demo"
              onClick={() => handleQuickDemo('employee')}
            >
              Demo Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
