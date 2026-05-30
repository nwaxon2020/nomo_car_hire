"use client";

import { useEffect, useState } from 'react';
import { db, storage, auth } from '@/lib/firebaseConfig';
import {
  collection, query, orderBy, onSnapshot, doc,
  updateDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  FaEnvelope, FaPhone, FaWhatsapp, FaFileDownload, FaUserCircle, FaSpinner,
  FaCheckCircle, FaTrash, FaLock, FaEyeSlash,
} from 'react-icons/fa';
import { FiNavigation } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { verifyAdminPasscode } from '@/lib/hooks/useAdminRole';

export default function EmploymentAdminUi() {
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedAppName, setSelectedAppName] = useState('');
  const [passcode, setPasscode] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ADMIN_UID = "thuvYp857sfRGgFuswyyhAUxgYr1";

  useEffect(() => {
    let unsubscribe: () => void;

    const checkAuthAndFetch = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const isCEO = currentUser.uid === ADMIN_UID;
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.data();
        const hasAdminFlag = userData?.admin === true || userData?.isAdmin === true;
        const staffDoc = await getDoc(doc(db, "adminStaffs", currentUser.uid));
        const inStaffList = staffDoc.exists();

        const authorized = isCEO || hasAdminFlag || inStaffList;
        setIsAuthorized(authorized);

        if (authorized) {
          const q = query(collection(db, "employment_applications"), orderBy("createdAt", "desc"));
          unsubscribe = onSnapshot(q, (snap) => {
            setApps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
          }, (err) => {
            toast.error("Data sync failed");
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Security check failed:", error);
        setIsLoading(false);
      }
    };

    checkAuthAndFetch();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [ADMIN_UID]);

  const handleViewCV = async (app: any) => {
    if (!app.documentPath) return toast.error("No CV uploaded");
    setDownloadingId(app.id);
    try {
      const fileRef = ref(storage, app.documentPath);
      const url = await getDownloadURL(fileRef);
      window.open(url, '_blank');
    } catch (error) {
      toast.error("Could not load CV.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'read' ? 'pending' : 'read';
      await updateDoc(doc(db, "employment_applications", id), {
        status: newStatus,
        readAt: newStatus === 'read' ? new Date() : null
      });
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const handleDeleteClick = (app: any) => {
    setSelectedAppId(app.id);
    setSelectedAppName(`${app.firstName} ${app.lastName}`);
    setShowDeleteModal(true);
    setPasscode("");
  };

  const confirmDeletion = async () => {
    const isValid = await verifyAdminPasscode(passcode, "/admin/applicants");
    if (!isValid) return toast.error("Invalid Admin Passcode");
    if (!selectedAppId) return;

    setDeleting(true);
    try {
      const app = apps.find(a => a.id === selectedAppId);
      await deleteDoc(doc(db, "employment_applications", selectedAppId));
      if (app?.documentPath) {
        try {
          const fileRef = ref(storage, app.documentPath);
          await deleteObject(fileRef);
        } catch (e) { console.error("Storage cleanup skipped", e); }
      }
      toast.success("Application removed");
      setShowDeleteModal(false);
    } catch (error) {
      toast.error("Deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  const filteredApps = apps.filter(app => {
    if (filter === 'all') return true;
    return filter === 'read' ? app.status === 'read' : app.status !== 'read';
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <FaSpinner className="animate-spin text-blue-600 text-3xl" />
    </div>
  );

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-red-100 max-w-sm">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaCheckCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-[#0B2A4A] font-black uppercase italic tracking-tighter text-2xl">Access Restricted</h2>
        <p className="text-gray-400 text-[10px] font-bold uppercase mt-3 tracking-[0.2em] leading-relaxed">
          Administrative Clearance Required.<br />Protocol "Applicant Tracking" Locked.
        </p>
        <Link href="/admin" className="mt-8 inline-block bg-[#0B2A4A] text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest">
          Return to Admin
        </Link>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen pb-20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-row items-center justify-between gap-2">
          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight italic uppercase">Applicant Tracking</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{apps.length} Submissions Logged</p>
              </div>
            </div>

            <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
              {['all', 'unread', 'read'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
                  {f} ({f === 'all' ? apps.length : apps.filter(a => f === 'read' ? a.status === 'read' : a.status !== 'read').length})
                </button>
              ))}
            </div>
          </div>

          <Link href="/admin" className="p-3 bg-white rounded-lg md:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all self-start md:self-auto">
            <FiNavigation className="text-[#0B2A4A]" />
          </Link>
        </header>

        <div className="grid gap-4">
          {filteredApps.map((app) => (
            <motion.div layout key={app.id} className={`bg-white rounded-xl shadow-sm border transition-all ${app.status === 'read' ? 'border-emerald-200 opacity-80' : 'border-slate-100'}`}>
              <div className="p-5 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${app.status === 'read' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    <FaUserCircle size={28} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{app.firstName} {app.lastName}</h2>
                    <p className="text-slate-500 text-[10px] font-bold">{app.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`mailto:${app.email}`} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center w-10 h-10"><FaEnvelope size={14} /></a>
                  <a href={`tel:${app.phone}`} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-green-600 hover:text-white transition-all flex items-center justify-center w-10 h-10"><FaPhone size={14} /></a>
                  <a href={`https://wa.me/234${(app.phone || '').replace(/^0+/, '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center w-10 h-10"><FaWhatsapp size={16} /></a>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-4">
                <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-4 rounded-xl italic border border-slate-100">
                  {app.coverLetter || "No cover letter."}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {app.createdAt?.toDate().toLocaleDateString('en-GB')}
                  </span>
                  <div className="flex gap-2">
                    {/* Mark as Read/Unread Toggle Button */}
                    <button onClick={() => handleMarkAsRead(app.id, app.status)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-[10px] font-black uppercase transition-colors hover:bg-slate-200">
                      {app.status === 'read' ? (
                        <>
                          <FaEyeSlash /> <span>Mark Unread</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle /> <span>Mark Read</span>
                        </>
                      )}
                    </button>

                    <button onClick={() => handleViewCV(app)} disabled={downloadingId === app.id} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm">
                      {downloadingId === app.id ? "..." : <><FaFileDownload /> CV</>}
                    </button>

                    <button onClick={() => handleDeleteClick(app)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
              <FaLock className="mx-auto mb-4 text-red-500 text-3xl" />
              <h2 className="font-black uppercase italic text-xl">Confirm Purge</h2>
              <p className="text-xs text-slate-500 mt-2 mb-6">Enter Admin PIN to delete <span className="font-bold">{selectedAppName}</span></p>
              <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full bg-slate-50 border-2 rounded-2xl py-3 text-center font-black tracking-widest mb-6 focus:border-red-500 outline-none" placeholder="******" />
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border rounded-xl">Cancel</button>
                <button onClick={confirmDeletion} disabled={deleting} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-red-500 text-white rounded-xl">
                  {deleting ? "Purging..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}