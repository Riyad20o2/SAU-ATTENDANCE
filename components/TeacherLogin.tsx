import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, ArrowRight, Mail, BookOpen, Camera, Upload, ChevronLeft, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TeacherProfile } from '../types';
import Logo from './Logo';
import { loginTeacher, registerTeacher, loginTeacherWithGoogle, loginAdmin, resendVerificationEmail } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface TeacherLoginProps {
  onLogin: (profile: TeacherProfile) => void;
  onBack: () => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLogin, onBack }) => {
  const [viewMode, setViewMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFICATION_SENT'>('LOGIN');
  const [step, setStep] = useState(1); // 1 = Details, 2 = Photo
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Password Strength
  useEffect(() => {
    if (!password) {
        setPasswordStrength(0);
        return;
    }
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    
    setPasswordStrength(strength);
  }, [password]);

  const getStrengthColor = (score: number) => {
      if (score === 0) return 'bg-white/10';
      if (score === 1) return 'bg-red-500';
      if (score === 2) return 'bg-orange-500';
      if (score === 3) return 'bg-yellow-500';
      return 'bg-green-500';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit
        setError("Image size too large. Please choose a smaller image (max 2MB).");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !className) {
      setError('All fields are required');
      return;
    }

    // Email Domain Validation (Client Side)
    if (!isLogin && !email.toLowerCase().endsWith('.edu.iq') && !email.toLowerCase().endsWith('@educational.iq')) {
        setError('Please use your official university email (ending in .edu.iq).');
        return;
    }

    // Password Complexity Check for Registration
    if (!isLogin) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setError('');
    setStep(2);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const teacher = await loginTeacherWithGoogle();
      if (teacher) {
        localStorage.setItem('sau_last_teacher', JSON.stringify(teacher));
        localStorage.removeItem('sau_last_student');
        onLogin(teacher);
      } else {
        setError('Google Sign-In failed or was cancelled.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email || !password) {
      setError('Please enter your email and password to resend the verification link.');
      return;
    }
    
    setIsResending(true);
    setError('');
    try {
      await resendVerificationEmail(email, password);
      setSuccessMsg('Verification email resent! Please check your inbox.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // ADMIN LOGIN CHECK
        if (email.toLowerCase() === 'admin') {
          const admin = await loginAdmin(email, password);
          onLogin(admin as any);
          return;
        }

        // FIREBASE LOGIN
        const teacher = await loginTeacher(email, password);
        
        if (teacher) {
            localStorage.setItem('sau_last_teacher', JSON.stringify(teacher));
            localStorage.removeItem('sau_last_student');
            onLogin(teacher);
        }
      } else {
        // FIREBASE REGISTER
        const profile: TeacherProfile = {
            name,
            email,
            className,
            profileImage: profileImage || undefined
        };

        const result = await registerTeacher(profile, password);

        if (result.success) {
            setIsLoading(false);
            setViewMode('VERIFICATION_SENT');
            setStep(1);
            setPassword('');
        } else {
            setError(result.error || 'Registration failed. Please try again.');
            setIsLoading(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection failed.');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setViewMode(viewMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
    setStep(1);
    setError('');
    setSuccessMsg('');
    setPassword('');
    setProfileImage('');
  };

  const goBackToStep1 = () => {
    setStep(1);
    setError('');
  };

  const isLogin = viewMode === 'LOGIN';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center w-full max-w-md mx-auto"
    >
      <div className="glass-panel w-full p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>

        <div className="flex flex-col items-center mb-6 relative z-10">
          <motion.div 
            whileHover={{ rotate: -5, scale: 1.05 }}
            className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 ring-4 ring-white/5 overflow-hidden border border-white/10"
          >
             <Logo />
          </motion.div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Teacher Portal</h2>
          <p className="text-slate-400 text-sm">
            {isLogin 
              ? 'Access your dashboard & reports.' 
              : step === 1
                ? 'Register as a new instructor.'
                : 'Upload your profile picture.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'VERIFICATION_SENT' ? (
            <motion.div 
              key="verification"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-6 relative z-10"
            >
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto border border-orange-500/30 animate-bounce">
                <Mail className="w-10 h-10 text-orange-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Verify your Email</h2>
                <p className="text-slate-400 text-sm">
                  We've sent a verification link to <strong className="text-white">{email}</strong>. 
                  Please check your inbox and click the link to activate your teacher account.
                </p>
              </div>
              <div className="bg-[#0f2846]/50 p-4 rounded-xl border border-white/5 text-xs text-slate-500 text-left">
                <p className="font-bold text-slate-400 mb-1">Troubleshooting:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Check your spam folder.</li>
                  <li>Wait 2-5 minutes for the email to arrive.</li>
                  <li>Ensure you used your official university email.</li>
                </ul>
              </div>
              <button 
                onClick={() => setViewMode('LOGIN')}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
              >
                Back to Login
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={isLogin ? 'login' : `register-step-${step}`}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center relative z-10"
                >
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                  {error.includes("Email not verified") && (
                    <button 
                      onClick={handleResendEmail}
                      disabled={isResending}
                      className="block mx-auto mt-2 text-xs font-bold underline hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      {isResending && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
                      {isResending ? 'Sending...' : 'Resend Verification Email'}
                    </button>
                  )}
                </motion.div>
              )}

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm text-center relative z-10"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <p>{successMsg}</p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={!isLogin && step === 1 ? handleNextStep : handleSubmit} className="space-y-4 relative z-10">
                
                {(isLogin || step === 1) && (
                  <div className="space-y-4">
                      {!isLogin && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                          >
                              <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <User className="h-5 w-5 text-slate-500" />
                                  </div>
                                  <input
                                  type="text"
                                  required={!isLogin}
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  placeholder="e.g. Dr. Sarah Smith"
                                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0f2846]/50 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                  />
                              </div>
                              </div>

                              <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Assigned Class / Subject</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <BookOpen className="h-5 w-5 text-slate-500" />
                                  </div>
                                  <input
                                  type="text"
                                  required={!isLogin}
                                  value={className}
                                  onChange={(e) => setClassName(e.target.value)}
                                  placeholder="e.g. Advanced Database Systems"
                                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0f2846]/50 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                  />
                              </div>
                              </div>
                          </motion.div>
                      )}

                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="teacher@college.edu.iq"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0f2846]/50 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                            />
                            </div>
                            {!isLogin && <p className="text-[10px] text-slate-500 ml-1">Must be an official educational email (.edu.iq)</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-3 rounded-xl bg-[#0f2846]/50 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                            </div>
                            {!isLogin && (
                            <div className="mt-2">
                                <div className="flex gap-1 h-1.5 w-full">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div 
                                            key={step} 
                                            className={`flex-1 rounded-full transition-all duration-300 ${step <= passwordStrength ? getStrengthColor(passwordStrength) : 'bg-white/10'}`}
                                        ></div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 ml-1 flex justify-between">
                                    <span>Must be 8+ chars with numbers & symbols</span>
                                    <span className={`${passwordStrength === 4 ? 'text-green-500' : 'text-slate-600'}`}>
                                        {passwordStrength === 0 ? '' : passwordStrength < 3 ? 'Weak' : passwordStrength === 3 ? 'Medium' : 'Strong'}
                                    </span>
                                </p>
                            </div>
                            )}
                        </div>
                      </motion.div>
                  </div>
                )}

                {!isLogin && step === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center space-y-6 py-4"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-40 h-40 rounded-full border-4 border-dashed border-slate-600 hover:border-orange-500 hover:bg-white/5 flex items-center justify-center cursor-pointer transition-all group relative overflow-hidden bg-[#0f2846]"
                    >
                      {profileImage ? (
                        <img src={profileImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-500 group-hover:text-orange-400">
                          <Camera className="w-10 h-10 mb-2" />
                          <span className="text-xs font-medium">Upload Photo</span>
                        </div>
                      )}
                      
                      {profileImage && (
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-8 h-8 text-white" />
                         </div>
                      )}
                    </motion.div>
                    
                    <div className="text-center">
                      <p className="text-sm text-slate-300">Choose a professional photo.</p>
                      <button 
                         type="button" 
                         onClick={() => setProfileImage('')} 
                         className={`text-xs text-red-400 mt-2 hover:underline ${!profileImage ? 'invisible' : ''}`}
                      >
                        Remove Photo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={goBackToStep1}
                      className="absolute top-0 left-0 text-slate-400 hover:text-white flex items-center gap-1 text-sm mt-0"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 group relative overflow-hidden"
                >
                  {isLoading && !error ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Log In' : step === 1 ? 'Next' : 'Create Account'} 
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Google Sign In Button */}
              {isLogin && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 relative z-10"
                >
                  <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider">Or continue with</span>
                      <div className="flex-grow border-t border-white/10"></div>
                  </div>
                  <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 mt-2 disabled:opacity-70"
                  >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Sign in with Google
                        </>
                      )}
                  </motion.button>
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-center space-y-4 relative z-10"
              >
                <p className="text-sm text-slate-400">
                  {isLogin ? "New to the system?" : "Already have an account?"}
                  <button 
                    onClick={toggleMode}
                    className="ml-2 text-orange-400 hover:text-orange-300 font-semibold underline decoration-dotted underline-offset-4 transition-colors"
                  >
                    {isLogin ? 'Register' : 'Log In'}
                  </button>
                </p>

                <button 
                  onClick={onBack}
                  className="text-slate-500 hover:text-white text-xs transition-colors"
                >
                  Back to Role Selection
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TeacherLogin;
