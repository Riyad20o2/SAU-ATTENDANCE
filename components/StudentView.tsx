import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ScanLine, User, Home, Sparkles, ShieldCheck, X } from 'lucide-react';
import QRScanner from './QRScanner';
import { QRCodeData, StudentAttendance, StudentProfile } from '../types';
import { generateStudentMotivation } from '../services/geminiService';
import confetti from 'canvas-confetti';
import Logo from './Logo';
import { markAttendance, checkIfAlreadyAttended } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface StudentViewProps {
  user: StudentProfile;
  onLogout: () => void;
  autoStartScan?: boolean;
}

const StudentView: React.FC<StudentViewProps> = ({ user, onLogout, autoStartScan = false }) => {
  const [viewState, setViewState] = useState<'IDLE' | 'SCANNING' | 'SUBMITTING' | 'SUCCESS'>(
    autoStartScan ? 'SCANNING' : 'IDLE'
  );
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [motivation, setMotivation] = useState('');
  const [showLogoutSecurity, setShowLogoutSecurity] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutSecurity(true);
    setPin('');
    setPinError(false);
  };

  const verifyPinAndLogout = () => {
    if (pin === '1234') {
      onLogout();
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 1000);
    }
  };

  const processAttendance = async (parsed: QRCodeData) => {
    setScannedData(parsed);
    setViewState('SUBMITTING');

    try {
      // Check if already attended
      const alreadyAttended = await checkIfAlreadyAttended(
        parsed.teacherId,
        parsed.sessionId,
        user.studentId,
        parsed.timestamp || Date.now()
      );

      if (alreadyAttended) {
        alert("You have already attended this class session.");
        setViewState('IDLE');
        return;
      }

      const msg = await generateStudentMotivation(user.name, parsed.topic);
      setMotivation(msg);

      const newAttendance: StudentAttendance = {
        id: Math.random().toString(36).substr(2, 9),
        sessionId: parsed.sessionId,
        teacherId: parsed.teacherId,
        studentName: user.name,
        studentId: user.studentId,
        department: user.department,
        academicStage: user.academicStage,
        branch: user.branch,
        studyType: user.studyType,
        timestamp: Date.now(),
        aiMotivation: msg
      };

      // Submit to Firebase
      await markAttendance(newAttendance);

      setViewState('SUCCESS');
      
      confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#ffffff', '#3b82f6']
      });
    } catch (e) {
      console.error("Error submitting attendance:", e);
      alert("Error saving your attendance to the database. Please check connection.");
      setViewState('IDLE');
    }
  };

  const handleScan = (data: string) => {
    if (viewState === 'SUBMITTING' || viewState === 'SUCCESS') return;

    try {
      const parsed: QRCodeData = JSON.parse(data);
      if (parsed.sessionId && parsed.className) {
        if (parsed.timestamp) {
            const now = Date.now();
            const diff = now - parsed.timestamp;
            const MAX_AGE_MS = 15000;      
            const MAX_FUTURE_MS = 15000;   
            
            if (diff > MAX_AGE_MS) {
                alert("This QR code has expired. Please scan the live code displayed by your teacher.");
                setViewState('IDLE');
                return;
            }
            
            if (diff < -MAX_FUTURE_MS) {
                 alert("Synchronization Error: Your device clock appears to be incorrect. Please check your time settings.");
                 setViewState('IDLE');
                 return;
            }
        }
        processAttendance(parsed);
      } else {
        alert("Invalid QR Code format.");
        setViewState('IDLE');
      }
    } catch (e) {
      console.error(e);
      alert("Could not read class data from QR.");
      setViewState('IDLE');
    }
  };

  const reset = () => {
    setViewState('IDLE');
    setScannedData(null);
    setMotivation('');
  };

  if (viewState === 'SCANNING') {
    return <QRScanner onScan={handleScan} onClose={() => setViewState('IDLE')} />;
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#061526]/80 backdrop-blur-md z-10">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleLogoutClick}
          className="flex items-center gap-2 hover:opacity-80 transition-all text-left focus:outline-none hover:bg-white/5 p-2 rounded-lg -ml-2 border border-transparent hover:border-white/10"
        >
           <motion.div 
             whileHover={{ rotate: 5, scale: 1.1 }}
             className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-white/10"
           >
              <Logo />
           </motion.div>
           <div className="flex flex-col">
             <h1 className="font-bold text-lg text-white leading-tight">SAU ATTENDANCE</h1>
             <p className="text-[10px] text-slate-400 font-medium">Welcome, {user.name.split(' ')[0]}</p>
           </div>
        </motion.button>
        <motion.button 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogoutClick} 
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-full hover:bg-white/10"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </motion.button>
      </header>

      <main className="flex-1 flex flex-col p-6 items-center justify-center">
        <AnimatePresence mode="wait">
          {viewState === 'IDLE' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-sm flex flex-col items-center justify-center space-y-6 md:space-y-8 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center gap-2 mb-2 text-slate-400 text-sm bg-white/5 py-1 px-3 rounded-full w-fit mx-auto border border-white/5"
                >
                   <User className="w-3 h-3" />
                   <span>ID: {user.studentId}</span>
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Mark Attendance</h2>
                <p className="text-slate-400 text-sm">Scan the QR code displayed by your teacher.</p>
              </div>

              <div className="relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setViewState('SCANNING')}
                  className="relative w-full bg-[#0f2846] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col items-center gap-4 hover:bg-[#163050] transition-all"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <ScanLine className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                  </div>
                  <span className="font-bold text-base md:text-lg text-slate-200">Scan QR Code</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {viewState === 'SUBMITTING' && (
             <motion.div 
               key="submitting"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center"
             >
                <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold text-white">Marking Attendance...</h2>
                <p className="text-slate-400 text-sm mt-2">Please wait a moment.</p>
             </motion.div>
          )}

          {viewState === 'SUCCESS' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 rounded-2xl text-center max-w-sm mx-auto w-full border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)]"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 mx-auto border border-green-500/30"
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">You're Checked In!</h2>
              <p className="text-slate-400 mb-8 text-sm">Your attendance for <strong className="text-slate-200">{scannedData?.className}</strong> has been recorded.</p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] p-6 rounded-2xl text-white shadow-xl border border-white/10 relative overflow-hidden"
              >
                 <Sparkles className="absolute top-2 right-2 w-4 h-4 text-orange-300 opacity-50" />
                 <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
                 <p className="relative z-10 text-lg font-medium italic text-orange-50">"{motivation}"</p>
              </motion.div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="mt-12 text-slate-400 hover:text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <ScanLine className="w-4 h-4" /> Scan Another Class
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showLogoutSecurity && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel p-8 rounded-3xl w-full max-w-sm border-white/10 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowLogoutSecurity(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto border border-orange-500/30">
                  <ShieldCheck className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Security Verification</h2>
                <p className="text-slate-400 text-sm">To prevent proxy attendance, please enter the security PIN to log out.</p>
              </div>

              <div className="space-y-6">
                <motion.div 
                  animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}}
                  className="flex justify-center gap-3"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i}
                      className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                        pin.length > i 
                          ? 'border-orange-500 bg-orange-500/10 text-white' 
                          : 'border-white/10 bg-white/5 text-slate-500'
                      } ${pinError ? 'border-red-500' : ''}`}
                    >
                      {pin.length > i ? '•' : ''}
                    </div>
                  ))}
                </motion.div>

                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <motion.button
                      key={num}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => pin.length < 4 && setPin(prev => prev + num)}
                      className="h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xl transition-all"
                    >
                      {num}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPin('')}
                    className="h-14 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 font-medium text-sm transition-all"
                  >
                    Clear
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => pin.length < 4 && setPin(prev => prev + '0')}
                    className="h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xl transition-all"
                  >
                    0
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => pin.length === 4 ? verifyPinAndLogout() : setPin(prev => prev.slice(0, -1))}
                    className={`h-14 rounded-xl font-bold transition-all ${
                      pin.length === 4 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400'
                    }`}
                  >
                    {pin.length === 4 ? 'OK' : '←'}
                  </motion.button>
                </div>

                <button 
                  onClick={() => setShowLogoutSecurity(false)}
                  className="w-full py-2 text-slate-500 hover:text-white text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentView;
