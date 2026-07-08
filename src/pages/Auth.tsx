import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { logActivity } from '../utils/logger';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Lock, User, Mail, Phone, Building2, Briefcase, 
  MapPin, Check, AlertCircle, RefreshCw, KeyRound, Eye, EyeOff
} from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: any) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Failed attempts counter (Lockout defense)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Login Form States
  const [loginId, setLoginId] = useState(''); // can be username or email
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Signup Form States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('Sales');
  const [role, setRole] = useState('Sales Manager');
  const [branch, setBranch] = useState('Sharjah Branch (HQ)');
  const [profilePic, setProfilePic] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Forgot/Reset Form States
  const [resetEmail, setResetEmail] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  // Seed default admin user on mount if database is empty
  useEffect(() => {
    db.users.count().then(async (count) => {
      if (count === 0) {
        // Seed some standard roles & demo accounts
        const seedUsers = [
          {
            name: 'Super Administrator',
            username: 'admin',
            email: 'admin@alzahrabm.com',
            phone: '+971 52 684 3809',
            password: 'admin', // Simple default for demo/offline app
            role: 'Super Administrator',
            department: 'IT & Administration',
            branch: 'Sharjah Branch (HQ)',
            status: 'active',
            lastLogin: 'Never',
            profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'
          },
          {
            name: 'Al Zahra Cashier',
            username: 'cashier',
            email: 'cashier@alzahrabm.com',
            phone: '+971 50 123 4567',
            password: 'cashier',
            role: 'Cashier',
            department: 'POS Billing',
            branch: 'Sharjah Branch (HQ)',
            status: 'active',
            lastLogin: 'Never',
            profilePic: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces'
          }
        ];
        for (const u of seedUsers) {
          await db.users.add(u);
        }
        await logActivity('System', 'Seeded initial system user accounts successfully', 'Authentication', 'info');
      }
    });
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (lockoutTime > 0) {
      setError(`Account temporarily locked. Please try again in ${lockoutTime} seconds.`);
      return;
    }

    if (!loginId.trim() || !loginPassword) {
      setError('Please provide both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      // Find user by either username or email
      const user = await db.users
        .filter(u => u.username === loginId.trim() || u.email === loginId.trim())
        .first();

      if (!user) {
        throw new Error('User account not found.');
      }

      if (user.status !== 'active') {
        throw new Error('This user account has been deactivated. Please contact your Super Administrator.');
      }

      // Check Password (simple matching for offline client side ERP)
      if (user.password !== loginPassword) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        if (attempts >= 5) {
          setLockoutTime(60); // lock out for 60 seconds
          setFailedAttempts(0);
          await logActivity(user.username, `Account locked out for 60s due to 5 consecutive failed login attempts.`, 'Security', 'critical');
          throw new Error('Too many failed login attempts. Account locked for 60 seconds.');
        }
        await logActivity(user.username, `Failed login attempt (Incorrect password). Attempt ${attempts}/5`, 'Authentication', 'warning');
        throw new Error(`Incorrect password. Attempt ${attempts} of 5.`);
      }

      // Login Successful!
      setFailedAttempts(0);
      const updatedUser = {
        ...user,
        lastLogin: new Date().toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      };
      await db.users.put(updatedUser);

      await logActivity(user.username, 'User logged in successfully', 'Authentication', 'info');

      if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify(updatedUser));
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(updatedUser);
      }, 800);

    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Weak password validation
    const hasNumOrSpec = /[0-9!@#$%^&*(),.?":{}|<>]/;
    if (password.length < 5 || !hasNumOrSpec.test(password)) {
      setError('Weak Password: Must be at least 5 characters and contain at least one number or special character.');
      return;
    }

    // Phone validation
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 7) {
      setError('Invalid Phone Number: Must contain at least 7 digits.');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the terms of service and security policy.');
      return;
    }

    setLoading(true);
    try {
      // Check duplicate username
      const existingUser = await db.users.where('username').equals(username.trim().toLowerCase()).first();
      if (existingUser) {
        throw new Error(`Username "${username.trim()}" is already taken.`);
      }

      // Check duplicate email
      const existingEmail = await db.users.where('email').equals(email.trim().toLowerCase()).first();
      if (existingEmail) {
        throw new Error(`Email Address "${email.trim()}" is already registered.`);
      }

      // Create new user account
      const newUser = {
        name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password: password,
        role: role,
        department: department,
        branch: branch,
        status: 'active',
        lastLogin: 'Never',
        profilePic: profilePic
      };

      await db.users.add(newUser);
      await logActivity(newUser.username, `New user registered account. Assigned role: ${role}`, 'User Management', 'info');

      setSuccess('Account created successfully! You can now log in.');
      setTimeout(() => {
        setMode('login');
        setLoginId(newUser.username);
        setLoginPassword('');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetEmail.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const user = await db.users.where('email').equals(resetEmail.trim().toLowerCase()).first();
      if (!user) {
        throw new Error('No account found with this email address.');
      }

      // Generate simulated reset code
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem('reset_code_' + user.username, mockCode);
      localStorage.setItem('reset_user', user.username);

      await logActivity('System', `Password reset security code requested for user: ${user.username}`, 'Security', 'warning');

      setSuccess(`Security verification code sent to ${user.email}! (Code: ${mockCode})`);
      setTimeout(() => {
        setMode('reset');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error executing password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const targetUsername = localStorage.getItem('reset_user');
    if (!targetUsername) {
      setError('Invalid reset session. Please request a new code.');
      setMode('forgot');
      return;
    }

    const correctCode = localStorage.getItem('reset_code_' + targetUsername);
    if (securityCode !== correctCode) {
      setError('Invalid security code. Please check your simulated code.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    const hasNumOrSpec = /[0-9!@#$%^&*(),.?":{}|<>]/;
    if (newPassword.length < 5 || !hasNumOrSpec.test(newPassword)) {
      setError('Weak Password: Must be at least 5 characters and contain at least one number or special character.');
      return;
    }

    setLoading(true);
    try {
      const user = await db.users.where('username').equals(targetUsername).first();
      if (!user) {
        throw new Error('User not found.');
      }

      user.password = newPassword;
      await db.users.put(user);

      // Clean up reset token
      localStorage.removeItem('reset_code_' + targetUsername);
      localStorage.removeItem('reset_user');

      await logActivity(user.username, 'Password updated via security reset code.', 'Security', 'critical');

      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        setMode('login');
        setLoginId(user.username);
        setLoginPassword('');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Background Geometry Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f49_1px,transparent_1px),linear-gradient(to_bottom,#082f49_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      <div className="absolute -top-[30%] -left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-700/10 blur-[120px]" />
      <div className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-emerald-700/10 blur-[120px]" />

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 backdrop-blur-md">
        
        {/* Left Side: Brand Information & Vision */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-brand-ink/90 to-slate-950 p-8 flex-col justify-between text-slate-100 border-r border-slate-800 relative">
          <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-10" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600')` }} />
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/15 rounded-xl border border-cyan-500/25 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-widest font-mono font-bold text-cyan-400">AL Zahra</span>
                <span className="text-sm font-bold font-sans text-slate-200">Bldg. Materials</span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                Enterprise Resource Planning <span className="text-cyan-400">v2.1</span>
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamless real-time inventory optimization, custom high-contrast barcode generation, and UAE compliant billing for AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Sharjah Branch).
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-12 relative z-10 border-t border-slate-800/60">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Branch TRN</div>
              <div className="text-xs font-mono text-slate-300 font-bold">100259942900003</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Sharjah HQ</div>
              <div className="text-xs text-slate-300">Industrial Area, Al Sajaa, Sharjah, UAE</div>
            </div>
            <div className="pt-2 text-[10px] text-slate-500 flex justify-between font-mono">
              <span>Secure Authentication</span>
              <span>AES-256 Hashing</span>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Interactive Form Container */}
        <div className="col-span-1 md:col-span-7 p-8 flex flex-col justify-center bg-slate-900/90 text-slate-100 min-h-[500px]">
          
          {/* Header Message */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {mode === 'login' && 'System Credentials'}
                {mode === 'signup' && 'Register Staff Account'}
                {mode === 'forgot' && 'Reset Request'}
                {mode === 'reset' && 'Create New Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login' && 'Authenticate to enter management console.'}
                {mode === 'signup' && 'Create secure credentials for ERP access.'}
                {mode === 'forgot' && 'Provide account email to retrieve secure code.'}
                {mode === 'reset' && 'Update security password criteria immediately.'}
              </p>
            </div>
            
            {/* Mobile Branding Logo */}
            <div className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* Validation Alert Prompts */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    required
                    type="text" 
                    placeholder="Enter admin or username"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="pl-10 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-mono text-cyan-400 hover:underline hover:text-cyan-300"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    required
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-sm text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400">Remember user session</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">v2.1.0-offline</span>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 font-bold text-sm tracking-wide text-white transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : 'Sign In To Console'}
              </Button>

              <div className="text-center pt-4 border-t border-slate-800/50 text-xs text-slate-400">
                New staff member?{' '}
                <button 
                  type="button" 
                  onClick={() => setMode('signup')}
                  className="text-cyan-400 font-bold hover:underline"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          )}

          {/* MODE: SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input 
                      required
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-8 h-9 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Username *</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input 
                      required
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-8 h-9 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input 
                      required
                      type="email"
                      placeholder="john@alzahra.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 h-9 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input 
                      required
                      placeholder="+971 52 XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-8 h-9 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Password *</label>
                  <Input 
                    required
                    type="password"
                    placeholder="Min 5 chars with number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Confirm Password *</label>
                  <Input 
                    required
                    type="password"
                    placeholder="Verify password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Department</label>
                  <select 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full flex h-9 rounded-md border border-slate-800 bg-slate-950/50 px-2 text-xs focus-visible:outline-none focus-visible:border-cyan-500"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Purchasing">Purchasing</option>
                    <option value="Management">Management</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">System Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full flex h-9 rounded-md border border-slate-800 bg-slate-950/50 px-2 text-xs focus-visible:outline-none focus-visible:border-cyan-500"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Warehouse Manager">Warehouse Manager</option>
                    <option value="Warehouse Staff">Warehouse Staff</option>
                    <option value="Purchase Manager">Purchase Manager</option>
                    <option value="Purchase Staff">Purchase Staff</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">Branch</label>
                  <select 
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full flex h-9 rounded-md border border-slate-800 bg-slate-950/50 px-2 text-xs focus-visible:outline-none focus-visible:border-cyan-500"
                  >
                    <option value="Sharjah Branch (HQ)">Sharjah HQ</option>
                    <option value="Sajaa Warehouse 1">Sajaa WH 1</option>
                    <option value="Dubai Branch">Dubai Branch</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input 
                    required
                    type="checkbox" 
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[11px] text-slate-400 leading-tight">
                    I agree to the cybersecurity policy, confidentiality terms, and operational guidelines.
                  </span>
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-10 bg-cyan-600 hover:bg-cyan-500 font-bold text-xs tracking-wide text-white transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Register Staff Member'}
              </Button>

              <div className="text-center pt-2 text-xs text-slate-400">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setMode('login')}
                  className="text-cyan-400 font-bold hover:underline"
                >
                  Sign In Here
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    required
                    type="email" 
                    placeholder="e.g. john@alzahrabm.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-sm text-slate-200"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 font-bold text-sm tracking-wide text-white transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
              </Button>

              <div className="text-center pt-4 border-t border-slate-800/50">
                <button 
                  type="button" 
                  onClick={() => setMode('login')}
                  className="text-xs text-cyan-400 font-bold hover:underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  Back to Login Screen
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Verification Code *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    required
                    placeholder="Enter 6-digit code"
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value)}
                    className="pl-10 bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-sm text-slate-200 font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">New Password *</label>
                <Input 
                  required
                  type="password"
                  placeholder="Min 5 characters, with number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-sm text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Confirm New Password *</label>
                <Input 
                  required
                  type="password"
                  placeholder="Verify new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="bg-slate-950/50 border-slate-800 focus:border-cyan-500 text-sm text-slate-200"
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 font-bold text-sm tracking-wide text-white transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm New Password'}
              </Button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
