import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ScanLine, User, Home, Lock, X } from 'lucide-react';
import QRScanner from './QRScanner';
import { QRCodeData, StudentAttendance, StudentProfile } from '../types';
import { generateStudentMotivation } from '../services/geminiService';
import confetti from 'canvas-confetti';
import Logo from './Logo';
import { markAttendance, checkIfAlreadyAttended } from '../services/firebase';

interface StudentViewProps {
  user: StudentProfile;
  onLogout: () => void;
  autoStartScan?: boolean;
  logoutCode?: string;
}

const StudentView: React.FC<StudentViewProps> = ({ 
  user, 
  onLogout, 
  autoStartScan = false,
  logoutCode = '1234'
}) => {
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

  const verifyPinAndLogout = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === logoutCode) {
      onLogout();
    } else {
      setPinError(true);
      setPin('');
      // Shake animation effect could be added here
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

      // Keep Local Storage backup just in case
      const existingData = localStorage.getItem('attendanceData');
      const allAttendance = existingData ? JSON.parse(existingData) : [];
      localStorage.setItem('attendanceData', JSON.stringify([...allAttendance, newAttendance]));

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
    // Prevent multiple triggers if already processing
    if (viewState === 'SUBMITTING' || viewState === 'SUCCESS') return;

    try {
      const parsed: QRCodeData = JSON.parse(data);
      if (parsed.sessionId && parsed.className) {
        // Security Check: QR Expiration with Clock Drift Tolerance
        if (parsed.timestamp) {
            const now = Date.now();
            const diff = now - parsed.timestamp;
            
            // Refined Validation Window
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
        
        // Automatically process attendance without confirmation form
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
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#061526]/80 backdrop-blur-md z-10 animate-fade-in">
        <button 
          onClick={handleLogoutClick}
          className="flex items-center gap-2 hover:opacity-80 transition-all text-left focus:outline-none hover:bg-white/5 p-2 rounded-lg -ml-2 border border-transparent hover:border-white/10"
        >
           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-white/10">
              <Logo />
           </div>
           <div className="flex flex-col">
             <h1 className="font-bold text-lg text-white leading-tight">SAU ATTENDANCE</h1>
             <p className="text-[10px] text-slate-400 font-medium">Welcome, {user.name.split(' ')[0]}</p>
           </div>
        </button>
        <button onClick={handleLogoutClick} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-full hover:bg-white/10">
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col p-6 items-center justify-center">
        {viewState === 'IDLE' && (
          <div className="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-sm flex flex-col items-center justify-center space-y-6 md:space-y-8 shadow-2xl animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2 text-slate-400 text-sm bg-white/5 py-1 px-3 rounded-full w-fit mx-auto border border-white/5">
                 <User className="w-3 h-3" />
                 <span>ID: {user.studentId}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Mark Attendance</h2>
              <p className="text-slate-400 text-sm">Scan the QR code displayed by your teacher.</p>
            </div>

            <div className="relative group w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
              <button 
                onClick={() => setViewState('SCANNING')}
                className="relative w-full bg-[#0f2846] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col items-center gap-4 hover:bg-[#163050] transition-all transform hover:-translate-y-1 active:scale-95"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <ScanLine className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                </div>
                <span className="font-bold text-base md:text-lg text-slate-200">Scan QR Code</span>
              </button>
            </div>
          </div>
        )}

        {viewState === 'SUBMITTING' && (
           <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold text-white">Marking Attendance...</h2>
              <p className="text-slate-400 text-sm mt-2">Please wait a moment.</p>
           </div>
        )}

        {viewState === 'SUCCESS' && (
          <div className="glass-panel p-8 rounded-2xl text-center max-w-sm mx-auto w-full animate-scale-in border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 mx-auto border border-green-500/30 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're Checked In!</h2>
            <p className="text-slate-400 mb-8 text-sm">Your attendance for <strong className="text-slate-200">{scannedData?.className}</strong> has been recorded.</p>
            
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] p-6 rounded-2xl text-white shadow-xl border border-white/10 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
               <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
               <p className="relative z-10 text-lg font-medium italic text-orange-50">"{motivation}"</p>
            </div>

            <button 
              onClick={reset}
              className="mt-12 text-slate-400 hover:text-white font-medium text-sm transition-colors"
            >
              Scan Another Class
            </button>
          </div>
        )}
      </main>

      {/* Security Lock Modal for Logout */}
      {showLogoutSecurity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl max-w-sm w-full shadow-2xl relative animate-scale-in bg-[#0f2846] border border-white/10">
            <button 
              onClick={() => setShowLogoutSecurity(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 border bg-red-500/20 border-red-500/30">
                <Lock className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Teacher Authorization</h3>
              <p className="text-slate-400 text-sm text-center mt-2">
                For security, please enter the code provided by your teacher to log out.
              </p>
            </div>

            <form onSubmit={verifyPinAndLogout} className="space-y-4">
              <div>
                <input
                  type="tel"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="0000"
                  className="w-full bg-[#061526] border border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono text-white focus:ring-2 focus:ring-red-500/50 outline-none placeholder:text-slate-700 transition-all"
                  autoFocus
                />
                {pinError && <p className="text-red-400 text-xs text-center mt-2 animate-shake">Incorrect Code</p>}
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutSecurity(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                  Log Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;