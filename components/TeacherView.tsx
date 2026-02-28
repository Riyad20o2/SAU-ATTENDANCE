import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Plus, Users, LayoutDashboard, Copy, CheckCircle2, RotateCcw, Lock, Download, FileCheck, Maximize2, X, Calendar, Clock, ChevronRight, FileSpreadsheet, Printer, ArrowLeft, Home, UserPlus, ClipboardCopy, ExternalLink, Table, Sparkles } from 'lucide-react';
import { ClassSession, StudentAttendance, QRCodeData, TeacherProfile } from '../types';
import AttendanceChart from './AttendanceChart';
import confetti from 'canvas-confetti';
import Logo from './Logo';
import { subscribeToSessionAttendance, saveSessionRecord, getTeacherHistory, markAttendance } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface TeacherViewProps {
  user: TeacherProfile;
  onLogout: () => void;
  autoOpenReport?: boolean;
}

interface SessionHistoryItem {
  id: string;
  className: string;
  topic: string;
  timestamp: number;
  endedAt: number;
  studentCount: number;
  students: StudentAttendance[]; 
  teacherId?: string;
}

const TeacherView: React.FC<TeacherViewProps> = ({ user, onLogout, autoOpenReport = false }) => {
  const [session, setSession] = useState<ClassSession | null>(null);
  const [className, setClassName] = useState(user.className);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isQrMaximized, setIsQrMaximized] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // History State
  const [historyData, setHistoryData] = useState<SessionHistoryItem[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<SessionHistoryItem | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // State for dynamic QR code rotation
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    setClassName(user.className);

    // Persist active session in localStorage (for refresh) but fetch data from Firebase
    const savedSession = localStorage.getItem('activeSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      if (parsedSession.className === user.className) {
          setSession(parsedSession);
      }
    }
  }, [user.className]);

  // Real-time Firebase Subscription
  useEffect(() => {
    let unsubscribe = () => {};

    if (session?.id && user.uid) {
      unsubscribe = subscribeToSessionAttendance(user.uid, session.id, session.timestamp, (attendees) => {
        // Sort most recent first
        const sorted = [...attendees].sort((a, b) => b.timestamp - a.timestamp);
        setAttendanceList(sorted);
      });
    }

    return () => unsubscribe();
  }, [session?.id]);

  // Effect to rotate QR code timestamp every 7 seconds
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      setQrTimestamp(Date.now());
    }, 7000);

    return () => clearInterval(interval);
  }, [session]);

  // Load History Logic
  useEffect(() => {
    if (autoOpenReport) {
        const fetchHistory = async () => {
             setIsHistoryLoading(true);
             try {
                // Fetch from Firestore (Securely by Teacher ID)
                const allHistory = await getTeacherHistory(user.className);
                const now = new Date();
                const currentDay = now.getDate();
                
                // Client-side filtering for recent months (mimicking previous logic)
                const filteredHistory = allHistory.filter((item: any) => {
                      if (item.className !== user.className) return false;
                      
                      const itemDate = new Date(item.timestamp);
                      const isCurrentMonth = itemDate.getMonth() === now.getMonth() && 
                                            itemDate.getFullYear() === now.getFullYear();
                      
                      if (currentDay <= 5) {
                          const prevMonthDate = new Date(now);
                          prevMonthDate.setMonth(now.getMonth() - 1);
                          
                          const isPrevMonth = itemDate.getMonth() === prevMonthDate.getMonth() && 
                                              itemDate.getFullYear() === prevMonthDate.getFullYear();
                          return isCurrentMonth || isPrevMonth;
                      }
                      
                      return isCurrentMonth;
                });

                filteredHistory.sort((a: any, b: any) => b.timestamp - a.timestamp);
                setHistoryData(filteredHistory as SessionHistoryItem[]);
             } catch (error) {
                console.error("Failed to load history", error);
             } finally {
                setIsHistoryLoading(false);
             }
        };
        fetchHistory();
    }
  }, [autoOpenReport, user.className]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !topic) return;

    setIsLoading(true);
    
    // Add artificial delay for better UX (spinner visibility and sense of processing)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Trigger exit animation
    setIsCreating(true);

    // Wait for animation to complete before switching state
    setTimeout(() => {
        const newSession: ClassSession = {
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          className, 
          topic,
          timestamp: Date.now(),
        };

        setSession(newSession);
        localStorage.setItem('activeSession', JSON.stringify(newSession));
        setIsLoading(false);
        setIsCreating(false);
    }, 300);
  };

  const handleAddDemoStudent = async () => {
    if (!session) return;
    
    // Create a random realistic demo student
    const firstNames = ["Ahmed", "Ali", "Fatima", "Zainab", "Mohammed", "Noor", "Hassan", "Maryam", "Yusuf", "Sara"];
    const lastNames = ["Al-Basri", "Al-Amiri", "Hussain", "Kareem", "Salim", "Abbas", "Jassim", "Rahim", "Tariq", "Mansour"];
    
    const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomId = Math.floor(Math.random() * 89999) + 10000;

    const demoStudent: StudentAttendance = {
        id: `demo-${Date.now()}-${Math.random()}`,
        sessionId: session.id,
        teacherId: user.uid || 'unknown',
        studentName: `${randomFirst} ${randomLast}`,
        studentId: `S${randomId}`,
        department: "Mechatronics",
        academicStage: "Second Year",
        branch: "A",
        studyType: "Morning",
        timestamp: Date.now(),
        aiMotivation: "Keep up the great work! (Simulated)",
    };

    try {
        await markAttendance(demoStudent);
    } catch (error) {
        console.error("Failed to add demo student", error);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    
    if (confirm("Are you sure you want to end this session? This will export the attendance list.")) {
      setIsLoading(true);
      try {
          const historyItem: SessionHistoryItem = {
              id: session.id,
              className: session.className,
              topic: session.topic,
              timestamp: session.timestamp,
              endedAt: Date.now(),
              studentCount: attendanceList.length,
              students: [...attendanceList],
              teacherId: user.uid
          };
          
          // Save to Firestore for permanent record
          await saveSessionRecord(historyItem);

          // === AUTOMATIC GOOGLE SHEETS EXPORT ===
          try {
            const scriptUrl = user.googleSheetUrl || 'https://script.google.com/macros/s/AKfycbCYGFyuFOIwK_B084g87Zb2TtJMoH3MzXDD1K9oTgMQcWbGPvbtvNhTi2mUG2c4mpKvg/exec';
            
            // Prepare data for Google Sheets
            const exportData = {
              topic: historyItem.topic,
              className: historyItem.className,
              teacherName: user.name,
              timestamp: new Date(historyItem.timestamp).toLocaleString(),
              studentCount: historyItem.students.length,
              students: historyItem.students.map(s => ({
                name: s.studentName,
                id: s.studentId,
                dept: s.department || 'N/A',
                stage: s.academicStage || 'N/A',
                branch: s.branch || 'N/A',
                study: s.studyType || 'N/A',
                time: new Date(s.timestamp).toLocaleTimeString()
              }))
            };

            // Send to Google Apps Script (using no-cors as it's common for GAS web apps)
            fetch(scriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(exportData),
            });
            
          } catch (exportError) {
            console.error("Google Sheets automatic export failed:", exportError);
          }
          
          // Only if save succeeds, do we show success animation
          setSessionEnded(true);

          // === ELABORATE CELEBRATION ANIMATION ===
          const duration = 5000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 100, zIndex: 9999 };
          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          // 1. Initial "Pop"
          confetti({
             ...defaults,
             particleCount: 150,
             origin: { y: 0.6 },
             colors: ['#22c55e', '#ffffff', '#f97316', '#3b82f6'],
             scalar: 1.2
          });

          // 2. Continuous Fireworks/Rain effect
          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            
            // Random bursts from different sides
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              colors: ['#22c55e', '#ffffff', '#f97316'],
              gravity: 1.2,
            });
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              colors: ['#3b82f6', '#ffffff', '#f59e0b'],
              gravity: 1.2,
            });
          }, 250);

          // Export CSV
          if (attendanceList.length > 0) {
            try {
                const csvContent = "Student Name,Student ID,Department,Stage,Branch,Study Type,Check-in Time,Date\n" + 
                attendanceList.map(student => {
                    const date = new Date(student.timestamp);
                    const cleanName = student.studentName.replace(/"/g, '""');
                    const cleanDept = student.department.replace(/"/g, '""');
                    return `"${cleanName}","${student.studentId}","${cleanDept}","${student.academicStage}","${student.branch}","${student.studyType}","${date.toLocaleTimeString()}","${date.toLocaleDateString()}"`;
                }).join("\n");
                
                // Add BOM for Excel/Sheets to read Arabic Correctly
                const bom = "\uFEFF";
                const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Attendance_${session?.className.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (csvError) {
                console.error("CSV Download failed", csvError);
            }
          }

          setTimeout(() => {
            localStorage.removeItem('activeSession');
            setSession(null);
            setTopic('');
            setAttendanceList([]);
            setSessionEnded(false);
            setIsLoading(false);
          }, 5000);

      } catch (error: any) {
          console.error("Failed to export session", error);
          alert(`Export failed: ${error.message}. Please check your connection or try refreshing the page.`);
          setIsLoading(false);
      }
    }
  };

  const handleCopyToSheets = (students: StudentAttendance[]) => {
    if (students.length === 0) {
        alert("No student data to copy.");
        return;
    }

    const headers = ['Student Name', 'Student ID', 'Department', 'Stage', 'Branch', 'Study Type', 'Check-in Time', 'Date'];
    const rows = students.map(student => {
      const date = new Date(student.timestamp);
      return [
        student.studentName,
        student.studentId,
        student.department,
        student.academicStage,
        student.branch,
        student.studyType,
        date.toLocaleTimeString(),
        date.toLocaleDateString()
      ].join('\t');
    });

    const tsvContent = [headers.join('\t'), ...rows].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      if(confirm("Data copied to clipboard!\n\nWould you like to open a new Google Sheet to paste it now?")) {
         window.open('https://sheets.new', '_blank');
      }
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert("Failed to copy data. Please try again.");
    });
  };

  const handleCopyFullLedger = () => {
    if (historyData.length === 0) {
      alert("No history data to export.");
      return;
    }

    // Prepare Master List
    const headers = ['Date', 'Topic', 'Class Name', 'Student Name', 'Student ID', 'Department', 'Stage', 'Branch', 'Study Type', 'Time'];
    const rows: string[] = [];

    historyData.forEach(session => {
        const sessionDate = new Date(session.timestamp).toLocaleDateString();
        
        session.students.forEach(student => {
            const checkInTime = new Date(student.timestamp).toLocaleTimeString();
            rows.push([
                sessionDate,
                session.topic,
                session.className,
                student.studentName,
                student.studentId,
                student.department || 'N/A',
                student.academicStage || 'N/A',
                student.branch || 'N/A',
                student.studyType || 'N/A',
                checkInTime
            ].join('\t'));
        });
    });

    if (rows.length === 0) {
        alert("Sessions exist, but no students were recorded.");
        return;
    }

    const tsvContent = [headers.join('\t'), ...rows].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
        if(confirm(`Master Ledger (${rows.length} records) copied!\n\nOpen Google Sheets to paste?`)) {
            window.open('https://sheets.new', '_blank');
        }
    }).catch(err => {
        console.error('Failed to copy ledger: ', err);
        alert("Failed to copy data. Please try again.");
    });
  };

  const handleExportHistoryCSV = (historyItem: SessionHistoryItem) => {
    if (!historyItem.students || historyItem.students.length === 0) {
        alert("No student data to export.");
        return;
    }
    const csvContent = "Student Name,Student ID,Department,Stage,Branch,Study Type,Check-in Time,Date\n" + 
      historyItem.students.map(student => {
          const date = new Date(student.timestamp);
          const cleanName = student.studentName.replace(/"/g, '""');
          const cleanDept = (student.department || 'N/A').replace(/"/g, '""');
          return `"${cleanName}","${student.studentId}","${cleanDept}","${student.academicStage || 'N/A'}","${student.branch || 'N/A'}","${student.studyType || 'N/A'}","${date.toLocaleTimeString()}","${date.toLocaleDateString()}"`;
      }).join("\n");
    
    // Add BOM for Excel/Sheets to read Arabic Correctly
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${historyItem.className.replace(/[^a-z0-9]/gi, '_')}_${new Date(historyItem.timestamp).toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = (historyItem: SessionHistoryItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dateStr = new Date(historyItem.timestamp).toLocaleDateString();
    
    const htmlContent = `
      <html>
        <head>
          <title>Attendance Report - ${historyItem.className}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; margin-bottom: 10px; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .meta { color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; color: #444; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <div class="meta">
              <strong>Class:</strong> ${historyItem.className}<br>
              <strong>Topic:</strong> ${historyItem.topic}<br>
              <strong>Date:</strong> ${dateStr}<br>
              <strong>Total Students:</strong> ${historyItem.students.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Stage</th>
                <th>Branch</th>
                <th>Study Type</th>
                <th>Time In</th>
              </tr>
            </thead>
            <tbody>
              ${historyItem.students.map(s => `
                <tr>
                  <td>${s.studentName}</td>
                  <td>${s.studentId}</td>
                  <td>${s.academicStage || 'N/A'}</td>
                  <td>${s.branch || 'N/A'}</td>
                  <td>${s.studyType || 'N/A'}</td>
                  <td>${new Date(s.timestamp).toLocaleTimeString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Generated by SAU Attendance System</div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  const qrData: QRCodeData | null = session && user.uid ? {
    sessionId: session.id,
    teacherId: user.uid,
    className: session.className,
    topic: session.topic,
    timestamp: qrTimestamp 
  } : null;

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="glass-panel border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
              <button onClick={onLogout} className="flex items-center gap-2 hover:bg-white/5 p-1.5 md:p-2 rounded-lg -ml-1 md:-ml-2 transition-colors border border-transparent hover:border-white/10 group">
                <motion.div 
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-white/10"
                >
                   <Logo />
                </motion.div>
                <div className="flex flex-col">
                     <h1 className="font-bold text-base md:text-lg text-white leading-tight">SAU ATTENDANCE</h1>
                     <p className="text-[8px] md:text-[10px] text-slate-400 font-medium">Teacher Portal • {user.name}</p>
                </div>
              </button>
          </div>
          <div className="flex items-center gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout} 
                className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-300 hover:text-white transition-colors border border-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-white/10"
              >
                <Home className="w-3.5 h-3.5 md:w-4 h-4" />
                <span>Home</span>
              </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {autoOpenReport ? (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-panel w-full max-w-4xl rounded-2xl shadow-2xl relative flex flex-col h-[80vh]"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                          <Calendar className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white">{selectedHistorySession ? 'Session Details' : 'Session History'}</h3>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">{selectedHistorySession ? new Date(selectedHistorySession.timestamp).toLocaleDateString() : `${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Report`}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      {!selectedHistorySession && historyData.length > 0 && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCopyFullLedger} 
                            className="text-emerald-400 hover:text-white transition-colors bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg hover:bg-emerald-500/20 flex items-center gap-2 px-3 text-sm font-medium"
                          >
                              <Table className="w-4 h-4" /> <span>Export All</span>
                          </motion.button>
                      )}
                      {selectedHistorySession && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedHistorySession(null)} 
                            className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 flex items-center gap-1 px-3"
                          >
                              <ArrowLeft className="w-4 h-4" /> <span className="text-xs font-medium">Back</span>
                          </motion.button>
                      )}
                      <button onClick={onLogout} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <AnimatePresence mode="wait">
                      {isHistoryLoading ? (
                        <motion.div 
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center h-full"
                        >
                            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 text-sm">Loading records from database...</p>
                        </motion.div>
                      ) : !selectedHistorySession ? (
                        <motion.div 
                          key="list"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {historyData.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-4">
                                  <Calendar className="w-16 h-16 opacity-20" />
                                  <p>No sessions recorded recently.</p>
                              </div>
                          ) : (
                              <div className="space-y-3">
                                  {historyData.map((item, idx) => (
                                      <motion.div 
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => setSelectedHistorySession(item)} 
                                        className="bg-[#0f2846]/50 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:bg-[#0f2846] transition-colors group cursor-pointer active:scale-[0.98]"
                                      >
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400 font-bold text-lg">{new Date(item.timestamp).getDate()}</div>
                                              <div>
                                                  <h4 className="text-white font-medium text-lg">{item.topic}</h4>
                                                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                      <span>•</span>
                                                      <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded text-[10px] border border-blue-500/20">{item.studentCount} Students</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity"><div className="p-2 rounded-full bg-white/5 text-slate-300"><ChevronRight className="w-5 h-5" /></div></div>
                                      </motion.div>
                                  ))}
                              </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="details"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-1">Topic</h4>
                                    <p className="text-white text-xl font-semibold">{selectedHistorySession.topic}</p>
                                    <p className="text-slate-400 text-sm mt-1">{selectedHistorySession.className}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleCopyToSheets(selectedHistorySession.students)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg" title="Copy for Google Sheets">
                                        <ClipboardCopy className="w-4 h-4" /> <span>Sheets</span>
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleExportHistoryCSV(selectedHistorySession)} className="flex items-center gap-2 bg-[#0f2846] hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg border border-white/10">
                                        <FileSpreadsheet className="w-4 h-4" /> <span>CSV</span>
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handlePrintPDF(selectedHistorySession)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg">
                                        <Printer className="w-4 h-4" /> <span>PDF</span>
                                    </motion.button>
                                </div>
                            </div>
                              <div>
                                <h5 className="text-slate-300 font-medium mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Attended Students ({selectedHistorySession.students.length})</h5>
                                <div className="bg-[#0f2846]/30 rounded-xl border border-white/5 overflow-hidden overflow-x-auto">
                                    {selectedHistorySession.students.length === 0 ? <div className="p-8 text-center text-slate-500">No students recorded.</div> : (
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead><tr className="border-b border-white/10 bg-white/5 text-xs text-slate-400 uppercase tracking-wider"><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">ID</th><th className="p-4 font-medium">Stage</th><th className="p-4 font-medium">Branch</th><th className="p-4 font-medium">Study</th><th className="p-4 font-medium">Time</th></tr></thead>
                                            <tbody className="divide-y divide-white/5 text-sm">
                                                {selectedHistorySession.students.map((s, i) => (
                                                    <motion.tr 
                                                      key={i} 
                                                      initial={{ opacity: 0 }}
                                                      animate={{ opacity: 1 }}
                                                      transition={{ delay: i * 0.03 }}
                                                      className="hover:bg-white/5 transition-colors"
                                                    >
                                                        <td className="p-4 text-white font-medium">{s.studentName}</td>
                                                        <td className="p-4 text-slate-400 font-mono">{s.studentId}</td>
                                                        <td className="p-4 text-slate-400">{s.academicStage}</td>
                                                        <td className="p-4 text-slate-400">{s.branch}</td>
                                                        <td className="p-4 text-slate-400">{s.studyType}</td>
                                                        <td className="p-4 text-slate-400">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
                <div className="p-4 border-t border-white/10 bg-[#061526]/50 rounded-b-2xl text-center">
                    <p className="text-xs text-slate-500">Records clear on the 5th of each new month.</p>
                </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {!session ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-md mx-auto w-full"
                >
                  <div className="glass-panel rounded-2xl p-6 md:p-8">
                    <div className="mb-6 text-center">
                      <motion.div 
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                      >
                        <Plus className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </motion.div>
                      <h2 className="text-xl md:text-2xl font-bold text-white">Start New Session</h2>
                      <p className="text-slate-400 mt-2 text-sm">Generate attendance barcode for <br/><span className="text-orange-400 font-semibold">{user.className}</span></p>
                    </div>
                    <form onSubmit={handleCreateSession} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Class Name</label>
                        <div className="relative">
                          <input type="text" disabled value={className} className="w-full px-4 py-3 rounded-lg bg-[#0f2846]/30 border border-white/5 text-slate-400 cursor-not-allowed outline-none" />
                          <Lock className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 ml-1">Fixed to your registered class</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Session Topic / Date</label>
                        <input type="text" required placeholder="e.g. Week 5: Midterm Review" className="w-full px-4 py-3 rounded-lg bg-[#0f2846]/50 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" value={topic} onChange={(e) => setTopic(e.target.value)} />
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg mt-4"
                      >
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Generate Barcode</>}
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="md:col-span-1 space-y-6"
                  >
                    <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setIsQrMaximized(true)} 
                        className="bg-white p-3 md:p-4 rounded-xl border-4 border-white/10 shadow-2xl mb-6 transform transition-transform duration-300 cursor-pointer group relative"
                      >
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg z-10 backdrop-blur-[2px]">
                          <Maximize2 className="w-8 h-8 text-white drop-shadow-md" />
                          <span className="text-white font-bold text-xs absolute bottom-12">MAXIMIZE</span>
                        </div>
                        <div className="h-40 w-40 md:h-48 md:w-48 bg-white flex items-center justify-center">
                          {qrData && <QRCode value={JSON.stringify(qrData)} size={160} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 256 256`} />}
                        </div>
                      </motion.div>
                      <div className="w-full max-w-[200px] mb-6">
                        <div className="flex justify-between items-center mb-2"><span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Refreshing Code</span></div>
                        <div className="h-1.5 bg-[#0f2846] rounded-full overflow-hidden border border-white/5 relative">
                          <motion.div 
                            key={qrTimestamp} 
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 7, ease: "linear" }}
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]" 
                          />
                        </div>
                      </div>
                      
                      <div className="w-full space-y-3">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleEndSession} 
                          disabled={isLoading}
                          className={`text-white bg-red-500/20 hover:bg-red-500/30 text-sm font-medium flex items-center gap-2 px-4 py-3 rounded-lg transition-all w-full justify-center border border-red-500/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span>{isLoading ? 'Saving Session...' : 'End Session & Export'}</span>
                        </motion.button>

                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAddDemoStudent}
                          className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium border border-white/5 flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-3 h-3" /> Add Demo Student
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="md:col-span-2"
                  >
                    <div className="glass-panel rounded-2xl flex flex-col h-[600px] overflow-hidden">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/30"><Users className="w-5 h-5 text-green-400" /></div>
                          <div>
                            <h2 className="font-bold text-lg text-white">Live Attendance</h2>
                            <p className="text-slate-400 text-sm">{attendanceList.length} students present</p>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-orange-400 transition-colors hover:rotate-12 transform"><Copy className="w-5 h-5" /></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                          {attendanceList.length === 0 ? (
                            <motion.div 
                              key="empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="h-full flex flex-col items-center justify-center text-slate-500"
                            >
                              <Users className="w-16 h-16 mb-4 opacity-20" />
                              <p>Waiting for scans...</p>
                            </motion.div>
                          ) : (
                            <div className="space-y-2">
                              {attendanceList.map((student, index) => (
                                <motion.div 
                                  key={student.id} 
                                  layout
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-[#0f2846]/40 hover:bg-[#0f2846]/80 rounded-xl border border-white/5 transition-all group hover:translate-x-1 gap-3"
                                >
                                  <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-700 overflow-hidden border border-white/10 shrink-0">
                                      <img src={`https://picsum.photos/seed/${student.studentId}/200`} alt={student.studentName} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white text-sm md:text-base">{student.studentName}</p>
                                      <div className="flex flex-wrap gap-x-2 text-[9px] md:text-[10px] text-slate-400">
                                        <span>ID: <span className="font-mono text-orange-400/80">{student.studentId}</span></span>
                                        <span>•</span>
                                        <span>{student.department}</span>
                                        <span className="hidden xs:inline">•</span>
                                        <span className="hidden xs:inline">{student.academicStage}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 border-t border-white/5 sm:border-0 pt-2 sm:pt-0">
                                    <span className="text-[10px] md:text-xs text-slate-500 font-mono">{new Date(student.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isQrMaximized && qrData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6" 
            onClick={() => setIsQrMaximized(false)}
          >
            <div className="absolute top-6 right-6">
              <button className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                <X className="w-8 h-8" />
              </button>
            </div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-10 rounded-3xl shadow-[0_0_150px_rgba(255,255,255,0.2)]" 
              onClick={(e) => e.stopPropagation()}
            >
               <QRCode value={JSON.stringify(qrData)} size={800} style={{ height: "auto", maxWidth: "95vw", maxHeight: "85vh" }} viewBox={`0 0 256 256`} />
            </motion.div>
            <p className="text-slate-400 mt-8 animate-pulse text-lg">Tap anywhere to close</p>
            <div className="w-64 mt-6">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  key={qrTimestamp} 
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 7, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionEnded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061526]/95 backdrop-blur-xl"
          >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center text-center p-6"
              >
                  <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(34,197,94,0.6)] mb-8"
                  >
                    <FileCheck className="w-16 h-16 text-white drop-shadow-lg" />
                  </motion.div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Session Complete!</h2>
                  <div className="space-y-4">
                      <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20"><FileSpreadsheet className="w-5 h-5" /><span className="font-medium">Synced to Database</span></div>
                          <p className="text-slate-400 text-sm">Attendance list has also been downloaded.</p>
                      </div>
                      <p className="text-emerald-400 font-mono bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20 inline-block">{attendanceList.length} Students Recorded</p>
                  </div>
                  <div className="mt-12 flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div><p className="text-slate-500 text-sm">Returning to dashboard...</p></div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherView;
