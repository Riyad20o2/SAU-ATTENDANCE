import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile as updateAuthProfile,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  sendEmailVerification,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  setDoc,
  doc,
  getDoc,
  writeBatch,
  orderBy,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { StudentProfile, TeacherProfile, StudentAttendance } from "../types";

// =========================================================================
// FIREBASE CONFIGURATION
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDualJXk4g8ReHMTg3-YGnMOWz8RciZfg0",
  authDomain: "dsfs-dbce1.firebaseapp.com",
  projectId: "dsfs-dbce1",
  storageBucket: "dsfs-dbce1.firebasestorage.app",
  messagingSenderId: "386929739204",
  appId: "1:386929739204:web:f99a483a036e2bb5f29091",
  measurementId: "G-23QMR4M3RC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

// Helper for error messages
const getFriendlyErrorMessage = (error: any) => {
  if (error.code === 'auth/email-already-in-use') return 'This email is already registered. Logging you in...';
  if (error.code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  if (error.code === 'auth/operation-not-allowed') return 'Email/Password sign-in is not enabled in Firebase Console.';
  if (error.code === 'auth/invalid-email') return 'Invalid email address format.';
  if (error.code === 'permission-denied') return 'Database permission denied. Please checking your internet or contact support.';
  if (error.code === 'auth/invalid-profile-attribute') return 'Profile image is too large for authentication profile. It will be saved to database only.';
  return error.message || 'An unexpected error occurred.';
};

// Helper to check if user has a conflicting role
const hasConflictingRole = async (uid: string, currentRole: 'student' | 'teacher'): Promise<boolean> => {
    const conflictingCollection = currentRole === 'student' ? 'teachers' : 'students';
    const docRef = doc(db, conflictingCollection, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
};

// Demo Account Helper
const isDemoAccount = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const demoEmails = [
        'cet264m2002@sa-uc.edu.iq',
        'riyadnaje8@gmail.com' // Including user's email for convenience
    ];
    return demoEmails.includes(email.toLowerCase());
};

// Domain Validator
const isValidEducationalEmail = (email: string | null | undefined): boolean => {
    if (!email) return false;
    // Strict check for .edu.iq or specific educational.iq request
    return email.toLowerCase().endsWith('.edu.iq') || email.toLowerCase().endsWith('@educational.iq');
};

// =========================================================================
// AUTHENTICATION & USER MANAGEMENT
// =========================================================================

// --- ADMIN AUTH ---

export const loginAdmin = async (emailInput: string, passwordInput: string): Promise<any> => {
  if (emailInput.toLowerCase() !== 'admin' || passwordInput !== 'Riyad@12345') {
    throw new Error("Invalid admin credentials");
  }

  const adminEmail = "admin@sau-attendance.local";
  try {
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, passwordInput);
    return {
      uid: userCredential.user.uid,
      name: 'System Admin',
      email: 'admin',
      role: 'ADMIN'
    };
  } catch (e: any) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      // Try to create the admin user if it doesn't exist
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, passwordInput);
        return {
          uid: userCredential.user.uid,
          name: 'System Admin',
          email: 'admin',
          role: 'ADMIN'
        };
      } catch (createError: any) {
        // If creation fails (e.g. already exists but wrong password), throw original error
        throw e;
      }
    }
    throw e;
  }
};

export const resendVerificationEmail = async (email: string, password: string): Promise<void> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      const actionCodeSettings = {
        url: 'https://sau-attendance.vercel.app',
        handleCodeInApp: false,
      };
      await sendEmailVerification(user, actionCodeSettings);
    }
    await signOut(auth);
  } catch (e: any) {
    console.error("Error resending verification email", e);
    throw e;
  }
};

// --- STUDENT AUTH ---

export const registerStudent = async (profile: StudentProfile, email: string, password: string): Promise<{ success: boolean; error?: string; profile?: StudentProfile }> => {
  // 1. Domain Check
  if (!isValidEducationalEmail(email)) {
      return { success: false, error: "Access Denied: Please use your official college email (ending in .edu.iq)." };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    try {
        await updateAuthProfile(user, {
          displayName: profile.name
        });

        const studentData = {
          name: profile.name,
          email: email,
          studentId: profile.studentId,
          department: profile.department,
          academicStage: profile.academicStage,
          branch: profile.branch,
          studyType: profile.studyType,
          profileImage: profile.profileImage || null,
          createdAt: Date.now(),
          uid: user.uid
        };

        await setDoc(doc(db, "students", user.uid), studentData);
        
        return { success: true, profile: studentData as StudentProfile };
    } catch (profileError) {
        console.error("Profile creation failed, cleaning up user", profileError);
        await deleteUser(user).catch(err => console.error("Cleanup failed", err));
        throw profileError;
    }
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const isTeacher = await hasConflictingRole(user.uid, 'student');
            if (isTeacher) {
                await signOut(auth);
                return { success: false, error: "This email is already registered as a Teacher. Please use a different email for the Student Portal." };
            }

            const docRef = doc(db, "students", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                 await setDoc(doc(db, "students", user.uid), {
                    name: profile.name,
                    email: email,
                    studentId: profile.studentId,
                    department: profile.department,
                    academicStage: profile.academicStage,
                    branch: profile.branch,
                    studyType: profile.studyType,
                    profileImage: profile.profileImage || null,
                    createdAt: Date.now(),
                    uid: user.uid
                });
            }
            
            return { success: false, error: "Account already exists. Please log in." };

        } catch (loginErr) {
            return { success: false, error: "Account exists. Please log in." };
        }
    }
    
    return { success: false, error: getFriendlyErrorMessage(e) };
  }
};

export const loginStudent = async (email: string, password: string): Promise<StudentProfile> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const docRef = doc(db, "students", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // Check if it's the Admin account
        if (user.email === "admin@sau-attendance.local") {
            await signOut(auth);
            throw new Error("This is the Admin account. Please login to the Admin Portal.");
        }

        // Auto-create profile for demo accounts if missing
        if (isDemoAccount(user.email)) {
            const defaultProfile = {
                name: "Demo Student",
                email: user.email!,
                studentId: "DEMO" + user.uid.substring(0, 4).toUpperCase(),
                department: "Computer Science",
                academicStage: "Fourth Year" as const,
                branch: "A" as const,
                studyType: "Morning" as const,
                createdAt: Date.now(),
                uid: user.uid
            };
            await setDoc(doc(db, "students", user.uid), defaultProfile);
            return {
                name: defaultProfile.name,
                studentId: defaultProfile.studentId,
                department: defaultProfile.department,
                academicStage: defaultProfile.academicStage,
                branch: defaultProfile.branch,
                studyType: defaultProfile.studyType,
                uid: user.uid
            };
        }

        const isTeacher = await hasConflictingRole(user.uid, 'student');
        await signOut(auth);
        
        if (isTeacher) {
            throw new Error("This account is registered as a Teacher. Please login to the Teacher Portal.");
        } else {
            throw new Error("Student profile not found. Please register this account first.");
        }
    }

    const data = docSnap.data();
    return {
        name: data.name || user.displayName || "Student",
        studentId: data.studentId,
        department: data.department,
        academicStage: data.academicStage,
        branch: data.branch,
        studyType: data.studyType,
        profileImage: data.profileImage || user.photoURL || undefined,
        uid: user.uid
    };

  } catch (e: any) {
    console.error("Error logging in student", e);
    if (e.message.includes("Teacher") || e.message.includes("not found")) {
        throw e;
    }
    if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        throw new Error("Invalid email or password.");
    }
    throw new Error(e.message || "Login failed.");
  }
};

export const loginStudentWithGoogle = async (): Promise<StudentProfile | null> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!isValidEducationalEmail(user.email)) {
        await deleteUser(user).catch(() => {}); 
        await signOut(auth);
        throw new Error("Access Denied: Please sign in with your official college email (.edu.iq). Personal Gmail accounts are not accepted.");
    }

    const isTeacher = await hasConflictingRole(user.uid, 'student');
    if (isTeacher) {
        await signOut(auth);
        throw new Error("This Google account is registered as a Teacher. Please login to the Teacher Portal.");
    }

    const docRef = doc(db, "students", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            name: data.name || user.displayName || "Student",
            studentId: data.studentId,
            department: data.department,
            academicStage: data.academicStage,
            branch: data.branch,
            studyType: data.studyType,
            profileImage: data.profileImage || user.photoURL || undefined,
            uid: user.uid
        };
    } else {
        const generatedId = "S" + user.uid.substring(0, 5).toUpperCase();
        const profile: StudentProfile = {
            name: user.displayName || "Student",
            studentId: generatedId,
            department: "General",
            academicStage: "First Year",
            branch: "A",
            studyType: "Morning",
            profileImage: user.photoURL || undefined,
            uid: user.uid
        };
        
        await setDoc(doc(db, "students", user.uid), {
            name: profile.name,
            email: user.email,
            studentId: profile.studentId,
            department: profile.department,
            academicStage: profile.academicStage,
            branch: profile.branch,
            studyType: profile.studyType,
            profileImage: profile.profileImage || null,
            createdAt: Date.now(),
            uid: user.uid
        });

        return profile;
    }
  } catch (e: any) {
    console.error("Error logging in student with Google", e);
    throw new Error(e.message || "Google Sign-In failed.");
  }
};

// --- TEACHER AUTH ---

export const registerTeacher = async (profile: TeacherProfile, password: string): Promise<{ success: boolean; error?: string; profile?: TeacherProfile }> => {
  if (!isValidEducationalEmail(profile.email)) {
    return { success: false, error: "Access Denied: Please use your official college email (ending in .edu.iq)." };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, profile.email, password);
    const user = userCredential.user;

    try {
        await updateAuthProfile(user, {
            displayName: profile.name
        });

        const teacherData = {
            name: profile.name,
            email: profile.email,
            className: profile.className,
            googleSheetUrl: profile.googleSheetUrl || null,
            profileImage: profile.profileImage || null,
            createdAt: Date.now(),
            uid: user.uid
        };

        await setDoc(doc(db, "teachers", user.uid), teacherData);

        return { success: true, profile: teacherData as TeacherProfile };
    } catch (profileError) {
        console.error("Profile creation failed, cleaning up user", profileError);
        await deleteUser(user).catch(err => console.error("Cleanup failed", err));
        throw profileError;
    }
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, profile.email, password);
            const user = userCredential.user;

            const isStudent = await hasConflictingRole(user.uid, 'teacher');
            if (isStudent) {
                await signOut(auth);
                return { success: false, error: "This email is already registered as a Student. Please use a different email for the Teacher Portal." };
            }
            
            const docRef = doc(db, "teachers", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                await setDoc(doc(db, "teachers", user.uid), {
                    name: profile.name,
                    email: profile.email,
                    className: profile.className,
                    googleSheetUrl: profile.googleSheetUrl || null,
                    profileImage: profile.profileImage || null,
                    createdAt: Date.now(),
                    uid: user.uid
                });
            }
            return { success: false, error: "Account already exists. Please log in." };
        } catch (loginErr) {
            return { success: false, error: "Account exists. Please log in." };
        }
    }
    return { success: false, error: getFriendlyErrorMessage(e) };
  }
};

export const loginTeacher = async (email: string, password: string): Promise<TeacherProfile> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const docRef = doc(db, "teachers", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // Check if it's the Admin account
        if (user.email === "admin@sau-attendance.local") {
            await signOut(auth);
            throw new Error("This is the Admin account. Please login to the Admin Portal.");
        }

        // Auto-create profile for demo accounts if missing
        if (isDemoAccount(user.email)) {
            const defaultProfile = {
                name: "Demo Teacher",
                email: user.email!,
                className: "Advanced Mechatronics",
                createdAt: Date.now(),
                uid: user.uid
            };
            await setDoc(doc(db, "teachers", user.uid), defaultProfile);
            return {
                name: defaultProfile.name,
                email: defaultProfile.email,
                className: defaultProfile.className,
                uid: user.uid
            };
        }

        const isStudent = await hasConflictingRole(user.uid, 'teacher');
        await signOut(auth);
        
        if (isStudent) {
            throw new Error("This account is registered as a Student. Please login to the Student Portal.");
        } else {
            throw new Error("Teacher profile not found. Please ensure you are registered as a Teacher.");
        }
    }

    const data = docSnap.data();
    return {
        name: data.name || user.displayName || "Teacher",
        email: data.email || user.email || email,
        className: data.className || "My Class",
        googleSheetUrl: data.googleSheetUrl || undefined,
        profileImage: data.profileImage || user.photoURL || undefined,
        uid: user.uid
    };

  } catch (e: any) {
    console.error("Error logging in teacher", e);
    if (e.message.includes("Student") || e.message.includes("not found")) {
        throw e;
    }
    if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        throw new Error("Invalid email or password.");
    }
    throw new Error(e.message || "Login failed.");
  }
};

export const loginTeacherWithGoogle = async (): Promise<TeacherProfile | null> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!isValidEducationalEmail(user.email)) {
        await deleteUser(user).catch(() => {});
        await signOut(auth);
        throw new Error("Access Denied: Please sign in with your official college email (.edu.iq). Personal Gmail accounts are not accepted.");
    }

    const isStudent = await hasConflictingRole(user.uid, 'teacher');
    if (isStudent) {
        await signOut(auth);
        throw new Error("This Google account is registered as a Student. Please login to the Student Portal.");
    }

    const docRef = doc(db, "teachers", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            name: data.name || user.displayName || "Teacher",
            email: data.email || user.email || "",
            className: data.className || "My Class",
            googleSheetUrl: data.googleSheetUrl || undefined,
            profileImage: data.profileImage || user.photoURL || undefined,
            uid: user.uid
        };
    } else {
        const profile: TeacherProfile = {
            name: user.displayName || "Teacher",
            email: user.email || "",
            className: "New Class", // Default for Google login
            profileImage: user.photoURL || undefined,
            uid: user.uid
        };

        await setDoc(doc(db, "teachers", user.uid), {
            name: profile.name,
            email: profile.email,
            className: profile.className,
            googleSheetUrl: profile.googleSheetUrl || null,
            profileImage: profile.profileImage || null,
            createdAt: Date.now(),
            uid: user.uid
        });

        return profile;
    }
  } catch (e: any) {
    console.error("Error logging in teacher with Google", e);
    throw new Error(e.message || "Google Sign-In failed.");
  }
};

// =========================================================================
// DATA PERSISTENCE (Firestore)
// =========================================================================

export const markAttendance = async (data: StudentAttendance): Promise<void> => {
  try {
    const user = auth.currentUser;
    const dateFolder = new Date(data.timestamp).toISOString().split('T')[0];
    const payload = {
        ...data,
        uid: user ? user.uid : "anonymous" 
    };

    // Save to teacher's specific attendance sub-collection organized by date
    await addDoc(collection(db, "teachers", data.teacherId, "attendance", dateFolder, "records"), payload);
  } catch (e) {
    console.error("Error marking attendance to Firestore", e);
    throw e;
  }
};

export const checkIfAlreadyAttended = async (teacherId: string, sessionId: string, studentId: string, timestamp: number): Promise<boolean> => {
  try {
    const dateFolder = new Date(timestamp).toISOString().split('T')[0];
    const q = query(
      collection(db, "teachers", teacherId, "attendance", dateFolder, "records"),
      where("sessionId", "==", sessionId),
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (e) {
    console.error("Error checking attendance status:", e);
    return false;
  }
};

export const subscribeToSessionAttendance = (teacherId: string, sessionId: string, sessionTimestamp: number, callback: (data: StudentAttendance[]) => void) => {
  const dateFolder = new Date(sessionTimestamp).toISOString().split('T')[0];
  const q = query(
    collection(db, "teachers", teacherId, "attendance", dateFolder, "records"), 
    where("sessionId", "==", sessionId)
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const attendees: StudentAttendance[] = [];
    querySnapshot.forEach((doc) => {
      attendees.push(doc.data() as StudentAttendance);
    });
    callback(attendees);
  }, (error) => {
    console.error("Error subscribing to attendance:", error);
  });

  return unsubscribe;
};

// Save completed session history & Export
export const saveSessionRecord = async (sessionData: any) => {
  try {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Authentication check failed. Please refresh the page and ensure you are logged in before ending session.");
    }

    // 1. Structure Data
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dateFolder = `${month}-${day}`; // "2-18"
    
    // Sanitize class name to be safe for document ID
    const safeClassName = (sessionData.className || "DefaultClass").trim().replace(/[\/]/g, "_");

    // === EXPORT LOGIC ===
    // Path: classes > [ClassName] > [Date] > [SessionID]
    // The [Date] is a collection here because it contains Session Documents.
    
    // 1. Create a reference for the Session Document
    const sessionDocRef = doc(db, "classes", safeClassName, dateFolder, sessionData.id);

    // 2. Prepare Batch Write (Atomic operation)
    const batch = writeBatch(db);

    // 3. Set Session Metadata
    batch.set(sessionDocRef, {
        topic: sessionData.topic,
        timestamp: sessionData.timestamp,
        teacherId: user.uid,
        studentCount: sessionData.students.length,
        exportedAt: Date.now(),
        className: sessionData.className // useful redundancy
    });

    // 4. Create 'attendees' subcollection under the session document
    // This perfectly mimics "extracting attendees into their own folder"
    const attendeesCollectionRef = collection(sessionDocRef, "attendees");

    sessionData.students.forEach((student: any) => {
        // Use a new document reference for each student
        const studentDocRef = doc(attendeesCollectionRef);
        batch.set(studentDocRef, {
            ...student,
            savedAt: Date.now()
        });
    });

    // 5. Also save to the teacher's 'sessions' subcollection for history UI retrieval
    const mainHistoryRef = doc(db, "teachers", user.uid, "sessions", sessionData.id);
    batch.set(mainHistoryRef, {
         ...sessionData,
        teacherId: user.uid
    });

    // 6. Commit all changes at once
    await batch.commit();

    console.log(`Session successfully exported to classes/${safeClassName}/${dateFolder}/${sessionData.id}`);

  } catch (e: any) {
    console.error("Error saving session record", e);
    throw e;
  }
};

// --- ADMIN FUNCTIONS ---

export const subscribeToAllStudents = (callback: (students: any[]) => void) => {
  const q = query(collection(db, "students"), orderBy("name"));
  return onSnapshot(q, (querySnapshot) => {
    const students: any[] = [];
    querySnapshot.forEach((doc) => {
      students.push({ ...doc.data(), id: doc.id });
    });
    callback(students);
  }, (error) => {
    console.error("Error subscribing to students:", error);
  });
};

export const subscribeToAllTeachers = (callback: (teachers: any[]) => void) => {
  const q = query(collection(db, "teachers"), orderBy("name"));
  return onSnapshot(q, (querySnapshot) => {
    const teachers: any[] = [];
    querySnapshot.forEach((doc) => {
      teachers.push({ ...doc.data(), id: doc.id });
    });
    callback(teachers);
  }, (error) => {
    console.error("Error subscribing to teachers:", error);
  });
};

export const updateStudentProfileAdmin = async (uid: string, data: Partial<StudentProfile>): Promise<void> => {
  const docRef = doc(db, "students", uid);
  await updateDoc(docRef, data);
};

export const updateTeacherProfileAdmin = async (uid: string, data: Partial<TeacherProfile>): Promise<void> => {
  const docRef = doc(db, "teachers", uid);
  await updateDoc(docRef, data);
};

export const deleteUserAdmin = async (uid: string, role: 'student' | 'teacher'): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Admin authentication required.");
    
    // Get the admin's ID token to authorize the server-side deletion
    const idToken = await user.getIdToken();
    
    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, role, adminToken: idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete user account.");
    }
  } catch (e: any) {
    console.error("Error in deleteUserAdmin:", e);
    throw e;
  }
};

export const getSystemSettings = async (): Promise<any> => {
  try {
    const docRef = doc(db, "settings", "system");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (e) {
    console.warn("Failed to fetch system settings:", e);
  }
  return { logoutCode: '0109' }; // Default
};

export const updateSystemSettings = async (data: any): Promise<void> => {
  const docRef = doc(db, "settings", "system");
  await setDoc(docRef, data, { merge: true });
};

export const subscribeToSystemSettings = (callback: (settings: any) => void) => {
  const docRef = doc(db, "settings", "system");
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback({ logoutCode: '0109' });
    }
  }, (error) => {
    console.warn("System settings subscription restricted or unavailable:", error.message);
    // Fallback to default settings if permission is denied
    callback({ logoutCode: '0109' });
  });
};

export const getTeacherHistory = async (className?: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    // Fetch from teacher's specific sessions subcollection
    const q = query(collection(db, "teachers", user.uid, "sessions"));
    
    const querySnapshot = await getDocs(q);
    const sessions: any[] = [];
    querySnapshot.forEach((doc) => {
      sessions.push(doc.data());
    });
    return sessions;
  } catch (e) {
    console.error("Error fetching history from Firestore", e);
    return [];
  }
};