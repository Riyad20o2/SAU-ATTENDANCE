import React, { useState, useEffect } from 'react';
import { Users, UserCog, Trash2, Edit, Save, X, Search, Shield, LogOut, GraduationCap, BookOpen, Key } from 'lucide-react';
import { StudentProfile, TeacherProfile } from '../types';
import { subscribeToAllStudents, subscribeToAllTeachers, updateStudentProfileAdmin, updateTeacherProfileAdmin, deleteUserAdmin, getSystemSettings, updateSystemSettings } from '../services/firebase';
import Logo from './Logo';
import { Settings } from 'lucide-react';

interface AdminViewProps {
  onLogout: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'TEACHERS' | 'SETTINGS'>('STUDENTS');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [settings, setSettings] = useState<any>({ logoutCode: '0109' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<{ hasServiceAccount: boolean } | null>(null);

  useEffect(() => {
    const unsubStudents = subscribeToAllStudents(setStudents);
    const unsubTeachers = subscribeToAllTeachers(setTeachers);
    loadSettings();
    checkAdminStatus();
    setIsLoading(false);

    return () => {
      unsubStudents();
      unsubTeachers();
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      setAdminStatus(data);
    } catch (e) {
      console.error("Failed to check admin status", e);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await getSystemSettings();
      setSettings(s);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSystemSettings(settings);
      alert("System settings updated.");
    } catch (e) {
      console.error(e);
      alert("Failed to update settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({ ...user });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSavingProfile(true);
    try {
      if (activeTab === 'STUDENTS') {
        await updateStudentProfileAdmin(editingUser.uid, editForm);
      } else {
        await updateTeacherProfileAdmin(editingUser.uid, editForm);
      }
      setEditingUser(null);
      alert("Profile updated successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setIsDeleting(uid);
    try {
      await deleteUserAdmin(uid, activeTab === 'STUDENTS' ? 'student' : 'teacher');
      alert("User deleted successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete user.");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredData = (activeTab === 'STUDENTS' ? students : teachers).filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#061526] text-white">
      <header className="px-4 md:px-6 py-3 md:py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#061526]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
            <Logo />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-tight">ADMIN PORTAL</h1>
            <p className="text-[8px] md:text-[10px] text-orange-400 font-bold uppercase tracking-widest">System Controller</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-300 hover:text-red-400 transition-colors px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-white/5 border border-white/10">
          <LogOut className="w-3.5 h-3.5 md:w-4 h-4" />
          <span className="hidden xs:inline">Log Out</span>
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start md:items-center justify-between">
          <div className="flex flex-wrap bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('STUDENTS')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'STUDENTS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <GraduationCap className="w-4 h-4" /> Students
            </button>
            <button 
              onClick={() => setActiveTab('TEACHERS')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'TEACHERS' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <BookOpen className="w-4 h-4" /> Teachers
            </button>
            <button 
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'SETTINGS' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>

          {adminStatus && !adminStatus.hasServiceAccount && (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase">
              <Shield className="w-3 h-3" />
              Admin SDK Key Missing: Deletion Disabled
            </div>
          )}
          {adminStatus?.hasServiceAccount && (
            <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-green-400 text-[10px] font-bold uppercase">
              <Shield className="w-3 h-3" />
              Admin SDK Connected
            </div>
          )}

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400">Loading system data...</p>
          </div>
        ) : activeTab === 'SETTINGS' ? (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold">System Security Settings</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Student Logout Authorization Code</label>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      maxLength={4}
                      value={settings.logoutCode}
                      onChange={(e) => setSettings({...settings, logoutCode: e.target.value})}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-mono tracking-widest text-center outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                    <button 
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingSettings ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">This 4-digit code is required for students to log out of their accounts on public devices.</p>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h4 className="text-sm font-bold text-white mb-4">Global System Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => alert("Maintenance mode toggled.")}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
                    >
                      <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">Maintenance Mode</p>
                      <p className="text-[10px] text-slate-500 mt-1">Temporarily disable all logins</p>
                    </button>
                    <button 
                      onClick={() => alert("System logs exported.")}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
                    >
                      <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">Export System Logs</p>
                      <p className="text-[10px] text-slate-500 mt-1">Download all activity history</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="p-4 font-bold">User</th>
                    <th className="p-4 font-bold">Details</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredData.map((user) => (
                    <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                            <img src={user.profileImage || `https://picsum.photos/seed/${user.uid}/200`} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>
                            <p className="font-bold text-white">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs space-y-1">
                          {activeTab === 'STUDENTS' ? (
                            <>
                              <p><span className="text-slate-500">ID:</span> <span className="text-blue-400 font-mono">{user.studentId}</span></p>
                              <p><span className="text-slate-500">Dept:</span> {user.department}</p>
                              <p><span className="text-slate-500">Stage:</span> {user.academicStage}</p>
                            </>
                          ) : (
                            <>
                              <p><span className="text-slate-500">Class:</span> {user.className}</p>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">Active</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.uid)}
                            disabled={isDeleting === user.uid}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                            title="Delete User"
                          >
                            {isDeleting === user.uid ? (
                              <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length === 0 && (
              <div className="p-20 text-center">
                <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">No users found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full shadow-2xl relative animate-scale-in bg-[#0f2846] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCog className="w-5 h-5 text-blue-400" /> Edit {activeTab === 'STUDENTS' ? 'Student' : 'Teacher'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email Address</label>
                <input 
                  type="email" 
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {activeTab === 'STUDENTS' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Student ID</label>
                      <input 
                        type="text" 
                        value={editForm.studentId}
                        onChange={(e) => setEditForm({...editForm, studentId: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Department</label>
                      <input 
                        type="text" 
                        value={editForm.department}
                        onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Stage</label>
                      <select 
                        value={editForm.academicStage}
                        onChange={(e) => setEditForm({...editForm, academicStage: e.target.value})}
                        className="w-full bg-[#0f2846] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="First Year">First Year</option>
                        <option value="Second Year">Second Year</option>
                        <option value="Third Year">Third Year</option>
                        <option value="Fourth Year">Fourth Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Branch</label>
                      <select 
                        value={editForm.branch}
                        onChange={(e) => setEditForm({...editForm, branch: e.target.value})}
                        className="w-full bg-[#0f2846] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="A">Branch A</option>
                        <option value="B">Branch B</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Study Type</label>
                    <select 
                      value={editForm.studyType}
                      onChange={(e) => setEditForm({...editForm, studyType: e.target.value})}
                      className="w-full bg-[#0f2846] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Class Name</label>
                    <input 
                      type="text" 
                      value={editForm.className}
                      onChange={(e) => setEditForm({...editForm, className: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Google Sheet Export URL</label>
                    <input 
                      type="text" 
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={editForm.googleSheetUrl || ''}
                      onChange={(e) => setEditForm({...editForm, googleSheetUrl: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Leave empty to use the system default sheet.</p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all font-bold border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSavingProfile}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>

              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <Key className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Password Control</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">Password changes for other users require a secure reset link for security reasons.</p>
                <button 
                  onClick={() => alert("Password reset link sent to " + editForm.email)}
                  className="w-full py-2 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500 hover:text-white transition-all border border-orange-500/30"
                >
                  Send Reset Password Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
