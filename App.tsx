import React, { useState, useEffect } from 'react';
import { UserRole, StudentProfile, TeacherProfile } from './types';
import TeacherView from './components/TeacherView';
import TeacherLogin from './components/TeacherLogin';
import StudentView from './components/StudentView';
import StudentLogin from './components/StudentLogin';
import AdminView from './components/AdminView';
import { BookOpen, GraduationCap, School, LogOut, Scan, LayoutDashboard, Share2, Lock, X, AlertTriangle, Timer, Calendar, Shield, ShieldCheck } from 'lucide-react';
import Logo from './components/Logo';
import ShareModal from './components/ShareModal';
import { getSystemSettings, subscribeToSystemSettings, auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [studentUser, setStudentUser] = useState<StudentProfile | null>(null);
  const [teacherUser, setTeacherUser] = useState<TeacherProfile | null>(null);
  const [lastStudent, setLastStudent] = useState<StudentProfile | null>(null);
  const [lastTeacher, setLastTeacher] = useState<TeacherProfile | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [openReportOnLoad, setOpenReportOnLoad] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Logout Security State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutCode, setLogoutCode] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [logoutAttempts, setLogoutAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({ logoutCode: '0109' });

  useEffect(() => {
    let unsubscribeSettings: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (!unsubscribeSettings) {
          unsubscribeSettings = subscribeToSystemSettings(setSystemSettings);
        }
      } else {
        if (unsubscribeSettings) {
          unsubscribeSettings();
          unsubscribeSettings = null;
        }
        setSystemSettings({ logoutCode: '0109' });
      }
    });
    
    const storedStudent = localStorage.getItem('sau_last_student');
    if (storedStudent) {
        try {
            setLastStudent(JSON.parse(storedStudent));
        } catch (e) {
            console.error("Failed to parse last student", e);
        }
    }
    const storedTeacher = localStorage.getItem('sau_last_teacher');
    if (storedTeacher) {
        try {
            setLastTeacher(JSON.parse(storedTeacher));
        } catch (e) {
            console.error("Failed to parse last teacher", e);
        }
    }
    return () => {
      authUnsubscribe();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  const checkLockoutStatus = () => {
      const storedLockout = localStorage.getItem('sau_logout_lockout_timestamp');
      if (storedLockout) {
          const lockedAt = parseInt(storedLockout, 10);
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (now - lockedAt < twentyFourHours) {
              setIsLockedOut(true);
              return true;
          } else {
              localStorage.removeItem('sau_logout_lockout_timestamp');
              localStorage.removeItem('sau_logout_attempts');
              setIsLockedOut(false);
              setLogoutAttempts(0);
              return false;
          }
      }
      return false;
  };

  const handleLogout = () => {
    setRole(UserRole.NONE);
    setStudentUser(null);
    setTeacherUser(null);
    setAutoScan(false);
    setOpenReportOnLoad(false);
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
        await auth.signOut();
        localStorage.removeItem('sau_last_student');
        localStorage.removeItem('sau_last_teacher');
        localStorage.removeItem('sau_logout_attempts');
        setLastStudent(null);
        setLastTeacher(null);
        handleLogout();
    } catch (e) {
        console.error("Sign out failed", e);
    } finally {
        setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    if (lastStudent) {
        checkLockoutStatus();
        const attempts = parseInt(localStorage.getItem('sau_logout_attempts') || '0', 10);
        setLogoutAttempts(attempts);
        
        setShowLogoutModal(true);
        setLogoutCode('');
        setLogoutError('');
    } else {
        handleSignOut();
    }
  };

  const confirmLogout = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (logoutCode === systemSettings.logoutCode) {
        localStorage.removeItem('sau_logout_attempts');
        setShowLogoutModal(false);
        handleSignOut();
    } else {
        const newAttempts = logoutAttempts + 1;
        setLogoutAttempts(newAttempts);
        localStorage.setItem('sau_logout_attempts', newAttempts.toString());

        if (newAttempts >= 3) {
            const now = Date.now();
            localStorage.setItem('sau_logout_lockout_timestamp', now.toString());
            setIsLockedOut(true);
            setLogoutError('Too many failed attempts.');
        } else {
            setLogoutError(`Incorrect Code. ${3 - newAttempts} attempts remaining.`);
        }
    }
  };

  const handleStudentLogin = (profile: StudentProfile) => {
    if ((profile as any).role === 'ADMIN') {
      setRole(UserRole.ADMIN);
      return;
    }
    setLastStudent(profile);
    setLastTeacher(null);
    setRole(UserRole.NONE);
    setStudentUser(null);
    setAutoScan(false); 
  };

  const handleTeacherLogin = (profile: TeacherProfile) => {
    if ((profile as any).role === 'ADMIN') {
      setRole(UserRole.ADMIN);
      return;
    }
    setLastTeacher(profile);
    setLastStudent(null);
    setRole(UserRole.NONE);
    setTeacherUser(null);
  };

  const handleStudentPortalSelect = () => {
      if (lastStudent) {
          setStudentUser(lastStudent);
          setRole(UserRole.STUDENT);
          setAutoScan(true);
      } else {
          setRole(UserRole.STUDENT);
          setAutoScan(false);
      }
  };

  const handleTeacherPortalSelect = () => {
      setOpenReportOnLoad(false);
      if (lastTeacher) {
          setTeacherUser(lastTeacher);
          setRole(UserRole.TEACHER);
      } else {
          setRole(UserRole.TEACHER);
      }
  };

  const handleTeacherReportSelect = () => {
      setOpenReportOnLoad(true);
      if (lastTeacher) {
          setTeacherUser(lastTeacher);
          setRole(UserRole.TEACHER);
      } else {
          setRole(UserRole.TEACHER);
      }
  };

  const currentUser = lastStudent || lastTeacher;

  const getProfileImageSrc = () => {
    if (currentUser?.profileImage) return currentUser.profileImage;
    const seed = lastStudent ? lastStudent.studentId : lastTeacher?.email;
    return `https://picsum.photos/seed/${seed}/400`;
  };

  const Header = () => (
    <header className="relative z-10 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center border-b border-white/5">
        <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleLogout}
            className="flex items-center gap-3 hover:bg-white/5 p-2 -ml-2 rounded-xl transition-all border border-transparent hover:border-white/10 focus:outline-none group"
        >
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)] overflow-hidden flex-shrink-0"
            >
                <Logo />
            </motion.div>
            <div className="text-left">
               <h1 className="text-lg md:text-xl font-bold tracking-wide text-white group-hover:text-blue-200 transition-colors">SAU ATTENDANCE</h1>
               <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">University of Shatt Al-Arab</p>
            </div>
        </motion.button>
         <div className="flex items-center gap-3">
             <motion.button 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 text-slate-300 hover:text-white font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5"
             >
                <Share2 className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline">Share</span>
             </motion.button>

            {role === UserRole.NONE && currentUser && (
                <motion.button 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogoutClick}
                    className="flex items-center gap-2 text-slate-300 hover:text-red-400 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 whitespace-nowrap"
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Log Out</span>
                </motion.button>
            )}
        </div>
    </header>
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans">
        <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />

        {/* Animated Background Decorative Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -10, 0],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"
        />

        <div className="flex-1 flex flex-col h-full relative">
            <AnimatePresence mode="wait">
                {role === UserRole.TEACHER && !teacherUser && (
                    <motion.div 
                        key="teacher-login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 flex flex-col"
                    >
                        <Header />
                        <div className="flex-1 flex items-center justify-center p-6">
                            <TeacherLogin onLogin={handleTeacherLogin} onBack={() => setRole(UserRole.NONE)} />
                        </div>
                    </motion.div>
                )}

                {role === UserRole.TEACHER && teacherUser && (
                    <motion.div 
                        key="teacher-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1"
                    >
                        <TeacherView user={teacherUser} onLogout={handleLogout} autoOpenReport={openReportOnLoad} />
                    </motion.div>
                )}

                {role === UserRole.STUDENT && !studentUser && (
                    <motion.div 
                        key="student-login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 flex flex-col"
                    >
                        <Header />
                        <div className="flex-1 flex items-center justify-center p-6">
                            <StudentLogin onLogin={handleStudentLogin} onBack={() => setRole(UserRole.NONE)} />
                        </div>
                    </motion.div>
                )}

                {role === UserRole.STUDENT && studentUser && (
                    <motion.div 
                        key="student-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1"
                    >
                        <StudentView user={studentUser} onLogout={handleLogout} autoStartScan={autoScan} />
                    </motion.div>
                )}

                {role === UserRole.ADMIN && (
                    <motion.div 
                        key="admin-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1"
                    >
                        <AdminView onLogout={handleLogout} />
                    </motion.div>
                )}

                {role === UserRole.NONE && (
                    <motion.div 
                        key="home-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col"
                    >
                        <Header />
                        <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">
                            <div className="w-full max-w-4xl flex flex-col items-center">
                                
                                {currentUser ? (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center mb-12 w-full"
                                    >
                                        <motion.div 
                                            whileHover={{ scale: 1.05 }}
                                            className="relative group mb-6 md:mb-8"
                                        >
                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                                            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-slate-800 border-2 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                                                <img 
                                                    src={getProfileImageSrc()}
                                                    alt={currentUser.name}
                                                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                                            </div>
                                        </motion.div>

                                        <div className="text-center space-y-2 px-4">
                                            <motion.h2 
                                              initial={{ opacity: 0, y: 10 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{ delay: 0.2 }}
                                              className="text-3xl md:text-5xl font-bold text-white leading-tight"
                                            >
                                                Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{currentUser.name.split(' ')[0]}</span>
                                            </motion.h2>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="text-center mb-12 space-y-4"
                                    >
                                        <h2 className="text-4xl md:text-5xl font-bold text-white">Welcome</h2>
                                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">Select your portal to access this smart system.</p>
                                    </motion.div>
                                )}

                                <div className={`${currentUser ? 'flex justify-center w-full mt-4 px-4' : 'grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full'}`}>
                                    {!currentUser && (
                                        <>
                                            <motion.button 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                whileHover={{ y: -8, scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleTeacherPortalSelect}
                                                className="group relative bg-[#0f2846]/40 hover:bg-[#163050] border border-white/10 p-12 rounded-3xl flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
                                                
                                                <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)] group-hover:scale-110 transition-transform duration-500 relative z-10">
                                                    <BookOpen className="w-10 h-10 text-white" />
                                                </div>

                                                <div className="text-center relative z-10">
                                                    <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">Teacher Portal</h3>
                                                    <p className="text-slate-400 text-sm">Create sessions, manage classes & view reports</p>
                                                </div>
                                            </motion.button>

                                            <motion.button 
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                                whileHover={{ y: -8, scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleStudentPortalSelect}
                                                className="group relative bg-[#0f2846]/40 hover:bg-[#163050] border border-white/10 p-12 rounded-3xl flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
                                                
                                                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-transform duration-500 relative z-10">
                                                    <GraduationCap className="w-10 h-10 text-white" />
                                                </div>

                                                <div className="text-center relative z-10">
                                                    <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Student Portal</h3>
                                                    <p className="text-slate-400 text-sm">Scan QR codes & track your attendance history</p>
                                                </div>
                                            </motion.button>
                                        </>
                                    )}
                                    
                                    {lastStudent && (
                                        <motion.button 
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleStudentPortalSelect}
                                            className="group relative flex flex-col items-center justify-center gap-4 md:gap-6 transition-all duration-300"
                                        >
                                            <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] border-4 border-white/10 group-hover:shadow-[0_0_80px_rgba(37,99,235,0.6)] group-hover:border-white/30 transition-all relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                                <Scan className="w-12 h-12 md:w-16 md:h-16 text-white relative z-10" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-xl md:text-2xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">Attend Class</h3>
                                                <p className="text-slate-400 text-xs md:text-sm">Tap to open scanner</p>
                                            </div>
                                        </motion.button>
                                    )}

                                    {lastTeacher && (
                                      <div className="flex gap-6 md:gap-12 items-center justify-center">
                                        <motion.button 
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleTeacherReportSelect}
                                            className="group relative flex flex-col items-center justify-center gap-4 md:gap-6 transition-all duration-300"
                                        >
                                            <div className="w-28 h-28 md:w-40 md:h-40 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(8,145,178,0.4)] border-4 border-white/10 group-hover:shadow-[0_0_80px_rgba(8,145,178,0.6)] group-hover:border-white/30 transition-all relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                                <Calendar className="w-10 h-10 md:w-16 md:h-16 text-white relative z-10" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg md:text-2xl font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">Reports</h3>
                                                <p className="text-slate-400 text-xs md:text-sm">View history</p>
                                            </div>
                                        </motion.button>
     
                                        <motion.button 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleTeacherPortalSelect}
                                            className="group relative flex flex-col items-center justify-center gap-4 md:gap-6 transition-all duration-300"
                                        >
                                            <div className="w-28 h-28 md:w-40 md:h-40 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.4)] border-4 border-white/10 group-hover:shadow-[0_0_80px_rgba(249,115,22,0.6)] group-hover:border-white/30 transition-all relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                                <LayoutDashboard className="w-10 h-10 md:w-16 md:h-16 text-white relative z-10" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg md:text-2xl font-bold text-white mb-1 group-hover:text-orange-300 transition-colors">Start Class</h3>
                                                <p className="text-slate-400 text-xs md:text-sm">Open dashboard</p>
                                            </div>
                                        </motion.button>
                                      </div>
                                    )}
                                </div>

                            </div>
                        </main>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <AnimatePresence>
          {showLogoutModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="glass-panel p-6 rounded-2xl max-w-sm w-full shadow-2xl relative bg-[#0f2846] border border-white/10"
                  >
                      <button 
                          onClick={() => setShowLogoutModal(false)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                      
                      <div className="flex flex-col items-center mb-6">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border ${isLockedOut ? 'bg-red-500/20 border-red-500/30' : 'bg-orange-500/20 border-orange-500/30'}`}>
                              {isLockedOut ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <ShieldCheck className="w-6 h-6 text-orange-400" />}
                          </div>
                          <h3 className="text-xl font-bold text-white">
                              {isLockedOut ? 'Logout Locked' : 'Security Verification'}
                          </h3>
                          <p className="text-slate-400 text-sm text-center mt-2">
                              {isLockedOut 
                                ? 'Security lockout active due to multiple failed attempts.' 
                                : 'For security, please enter the code provided by your teacher to log out.'}
                          </p>
                      </div>

                      {isLockedOut ? (
                          <div className="space-y-4">
                              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col items-center gap-2">
                                  <Timer className="w-6 h-6 text-red-400" />
                                  <div className="text-center">
                                      <p className="text-white font-medium">Try again in 24 hours</p>
                                      <p className="text-slate-400 text-xs mt-1">You can continue using the app.</p>
                                  </div>
                              </div>
                              <button
                                  onClick={() => setShowLogoutModal(false)}
                                  className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors border border-white/5"
                              >
                                  Cancel & Return to Account
                              </button>
                          </div>
                      ) : (
                          <form onSubmit={confirmLogout} className="space-y-4">
                              <div>
                                <motion.input
                                    animate={logoutError ? { x: [-10, 10, -10, 10, 0] } : {}}
                                    type="tel"
                                    maxLength={4}
                                    value={logoutCode}
                                    onChange={(e) => setLogoutCode(e.target.value)}
                                    placeholder="0000"
                                    className="w-full bg-[#061526] border border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono text-white focus:ring-2 focus:ring-orange-500/50 outline-none placeholder:text-slate-700 transition-all"
                                    autoFocus
                                />
                                {logoutError && <p className="text-red-400 text-xs text-center mt-2">{logoutError}</p>}
                              </div>

                              <div className="flex gap-3 mt-2">
                                  <button
                                      type="button"
                                      onClick={() => setShowLogoutModal(false)}
                                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors font-medium border border-white/5"
                                  >
                                      Cancel
                                  </button>
                                  <button
                                      type="submit"
                                      disabled={isLoggingOut}
                                      className="flex-1 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors shadow-lg shadow-orange-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                      {isLoggingOut && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                      Log Out
                                  </button>
                              </div>
                          </form>
                      )}
                  </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default App;
