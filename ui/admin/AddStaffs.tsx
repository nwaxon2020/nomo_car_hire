"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebaseConfig';
import { collection, getDocs, setDoc, doc, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { FiSearch, FiPlus, FiX, FiNavigation, FiUsers, FiShield, FiTrash2, FiActivity, FiLock, FiEdit3, FiCheck, FiEye, FiEyeOff, FiChevronDown, FiChevronUp, FiKey } from 'react-icons/fi';
import Link from "next/link";
import toast from 'react-hot-toast';
import { useAdminRole, verifyAdminPasscode } from '@/lib/hooks/useAdminRole';

export default function AddStaffPageUi() {
  const [users, setUsers] = useState<any[]>([]);
  const [adminStaff, setAdminStaff] = useState<any[]>([]);
  const [globalRoutes, setGlobalRoutes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [routeInput, setRouteInput] = useState("");
  const [routes, setRoutes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Passcode UI States
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");
  const [showNewPasscode, setShowNewPasscode] = useState(false);
  const [newPasscodeRoutes, setNewPasscodeRoutes] = useState<string[]>([]);
  const [showRoutesDropdown, setShowRoutesDropdown] = useState(false);
  const [adminPasscodes, setAdminPasscodes] = useState<any[]>([]);
  const [passcodeToDelete, setPasscodeToDelete] = useState<any>(null);
  const [deletePasscodeEntry, setDeletePasscodeEntry] = useState("");
  const [visiblePasscodes, setVisiblePasscodes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const togglePasscodeVisibility = (id: string) => {
    if (visiblePasscodes.includes(id)) {
      setVisiblePasscodes(visiblePasscodes.filter(pId => pId !== id));
    } else {
      setVisiblePasscodes([...visiblePasscodes, id]);
    }
  };

  const { isCEO } = useAdminRole();

  useEffect(() => {
    if (!isCEO) {
      setIsLoading(false);
      return;
    }

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    };

    const unsubRoutes = onSnapshot(doc(db, "adminRoutes", "config"), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalRoutes(docSnap.data().availableRoutes || []);
      }
    });

    const unsubStaff = onSnapshot(collection(db, "adminStaffs"), (snap) => {
      setAdminStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPasscodes = onSnapshot(collection(db, "adminPasscodes"), (snap) => {
      setAdminPasscodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    fetchUsers();
    return () => { unsubStaff(); unsubRoutes(); unsubPasscodes(); };
  }, [isCEO]);

  const handleCreateRouteInLibrary = async () => {
    let formattedRoute = routeInput.trim();
    if (!formattedRoute) return;
    if (!formattedRoute.startsWith('/')) formattedRoute = '/' + formattedRoute;
    if (!formattedRoute.startsWith('/admin')) {
      formattedRoute = '/admin' + (formattedRoute === '/' ? '' : formattedRoute);
    }

    if (globalRoutes.includes(formattedRoute)) return toast.error("Route already exists");

    try {
      await setDoc(doc(db, "adminRoutes", "config"), {
        availableRoutes: arrayUnion(formattedRoute)
      }, { merge: true });
      setRouteInput("");
      toast.success("Saved to Library");
    } catch (e) {
      toast.error("Failed to save route");
    }
  };

  const toggleRouteSelection = (route: string) => {
    if (routes.includes(route)) {
      setRoutes(routes.filter(r => r !== route));
    } else {
      setRoutes([...routes, route]);
    }
  };

  const handleEditInitiate = (staff: any) => {
    setSelectedUser(staff);
    setRoutes(staff.allowedRoutes || []);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePasscode = async () => {
    if (newPasscode.length < 6) return toast.error("Passcode must be at least 6 digits");
    if (newPasscodeRoutes.length === 0) return toast.error("Select at least one route");
    if (adminPasscodes.some(pc => pc.passcode === newPasscode)) return toast.error("This passcode already exists");
    try {
      await setDoc(doc(collection(db, "adminPasscodes")), {
        passcode: newPasscode,
        routes: newPasscodeRoutes,
        createdAt: new Date().toISOString()
      });
      toast.success("Passcode Created");
      setNewPasscode("");
      setNewPasscodeRoutes([]);
      setShowAddPassword(false);
    } catch (e) {
      toast.error("Failed to save passcode");
    }
  };

  const handleDeletePasscode = async (id: string) => {
    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user");
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/revoke-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: id, action: "delete-passcode" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete passcode");
      }

      toast.success("Passcode Deleted");
      setPasscodeToDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete passcode");
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizePermissions = async () => {
    setIsProcessing(true);
    const isValid = await verifyAdminPasscode(passcode, "any");
    if (!isValid) {
      setIsProcessing(false);
      return toast.error("Invalid Passcode");
    }
    try {
      const targetId = selectedUser.id || selectedUser.uid;

      await setDoc(doc(db, "adminStaffs", targetId), {
        uid: targetId,
        email: selectedUser.email,
        name: selectedUser.name || 'Staff Member',
        allowedRoutes: routes,
        isAdmin: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await updateDoc(doc(db, "users", targetId), {
        isAdmin: true
      });

      toast.success(isEditing ? "Updated" : "Promoted");
      setShowConfirm(false); setSelectedUser(null); setIsEditing(false); setPasscode(""); setRoutes([]);
    } catch (e) {
      toast.error("Process failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const revokeAccess = async () => {
    setIsProcessing(true);
    const isValid = await verifyAdminPasscode(passcode, "any");
    if (!isValid) {
      setIsProcessing(false);
      return toast.error("Invalid Passcode");
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user");
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/revoke-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: showDeleteConfirm, action: "revoke-staff" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke access");
      }

      toast.success("Access Revoked");
      setShowDeleteConfirm(null); setPasscode("");
    } catch (e: any) {
      toast.error(e.message || "Revocation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isCEO) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-10 font-black text-red-600 uppercase italic">CEO ACCESS ONLY</div>;

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-10 pb-20 px-4 md:px-12 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className='w-full'>
            <div className="flex items-center justify-between gap-2">
              <div className='flex items-center gap-1'>
                <div className="w-2 h-6 bg-blue-600 rounded-full" />
                <h1 className="text-2xl font-black uppercase italic text-[#0B2A4A] tracking-tighter">
                  Staff <span className="text-blue-600">Permissions</span>
                </h1>
              </div>

              <Link href="/admin" className="md:hidden flex items-center justify-center p-3 bg-white rounded-md md:rounded-lg border border-gray-100 shadow-sm transition-all">
                <FiNavigation className="text-[#0B2A4A]" />
              </Link>
            </div>
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.4em]">Administrative Control</p>
          </div>

          <div className="w-full flex md:justify-end items-center gap-3">
            <div className="bg-[#0B2A4A] text-white px-6 py-3 rounded-md md:rounded-lg shadow-lg flex items-center gap-3">
              <FiUsers className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{adminStaff.length} Staff</span>
            </div>
            {/* ADMIN BUTTON RE-ADDED */}
            <button className="p-3 bg-blue-600 text-white rounded-md md:rounded-lg shadow-sm">
              <FiShield />
            </button>
            <Link href="/admin" className="hidden md:flex justify-center items-center md:px-10 p-3 bg-white rounded-md md:rounded-lg border border-gray-100 shadow-sm transition-all">
              <FiNavigation className="text-[#0B2A4A]" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-md md:rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-[10px] font-black uppercase text-[#0B2A4A] mb-4 flex items-center gap-2">
                <FiPlus className="text-blue-600" /> 1. Manage & Assign Routes
              </h3>

              <div className="flex flex-col md:flex-row gap-2 mb-6">
                <input
                  value={routeInput}
                  onChange={(e) => setRouteInput(e.target.value)}
                  placeholder="Create route e.target /cars-manager"
                  className="flex-1 bg-gray-50 border p-3 rounded-md text-xs font-bold outline-none"
                />
                <button onClick={handleCreateRouteInLibrary} className="bg-[#0B2A4A] text-white py-3 md:py-0 px-6 rounded-md font-black uppercase text-[10px] tracking-widest">
                  Create
                </button>
              </div>

              <p className="text-[8px] font-black uppercase text-gray-400 mb-3 tracking-widest italic">Tap to assign/unassign routes:</p>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto no-scrollbar border-t pt-4">
                {globalRoutes.length === 0 && <p className="text-gray-300 text-[10px] italic">Library is empty...</p>}
                {globalRoutes.map(r => (
                  <div
                    key={r}
                    onClick={() => toggleRouteSelection(r)}
                    className={`cursor-pointer px-3 py-2 rounded-full text-[9px] font-black flex items-center gap-2 border transition-all ${routes.includes(r) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                  >
                    {routes.includes(r) && <FiCheck size={10} />}
                    {r}
                    {!routes.includes(r) && (
                      <FiX
                        className="hover:text-red-500 transition-colors ml-1"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await updateDoc(doc(db, "adminRoutes", "config"), { availableRoutes: arrayRemove(r) });
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!isEditing && (
              <div className="bg-white p-6 rounded-md md:rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-[10px] font-black uppercase text-[#0B2A4A] mb-4 flex items-center gap-2">
                  <FiSearch className="text-blue-600" /> 2. Select Target User
                </h3>
                <input
                  placeholder="Search user email..."
                  className="w-full bg-gray-50 border-none p-4 rounded-md text-xs font-bold mb-4 outline-none"
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-[200px] overflow-y-auto space-y-2 no-scrollbar">
                  {users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) && search !== "").map(user => (
                    <div key={user.id} className="bg-gray-50/50 p-4 rounded-md flex justify-between items-center border border-transparent hover:border-blue-200 transition-all">
                      <div>
                        <p className="text-[10px] font-black text-[#0B2A4A] uppercase">{user.name || 'User'}</p>
                        <p className="text-[9px] font-bold text-gray-400">{user.email}</p>
                      </div>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className={`px-4 py-2 rounded-md text-[8px] font-black uppercase tracking-widest ${selectedUser?.id === user.id ? 'bg-[#0B2A4A] text-white' : 'bg-white border text-blue-600'}`}
                      >
                        {selectedUser?.id === user.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedUser && (
            <div className={`p-6 rounded-md md:rounded-lg text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl transition-all duration-300 ${isEditing ? 'bg-orange-500' : 'bg-blue-600'}`}>
              <div className="text-center md:text-left">
                <p className="text-[8px] font-black uppercase opacity-60 tracking-[0.3em]">{isEditing ? 'Modifying Access' : 'New Promotion'}</p>
                <p className="font-black italic uppercase text-lg leading-tight">{selectedUser.email}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedUser(null); setIsEditing(false); setRoutes([]); }} className="bg-white/10 px-5 py-3 rounded-md font-black uppercase text-[9px] tracking-widest hover:bg-white/20">Cancel</button>
                <button onClick={() => setShowConfirm(true)} disabled={routes.length === 0} className="bg-white text-gray-900 px-8 py-3 rounded-md font-black uppercase text-[9px] tracking-widest shadow-lg disabled:opacity-50">
                  {isEditing ? 'Confirm Update' : 'Promote Staff'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest flex items-center gap-2">
              <FiActivity /> Active Administrative Team
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminStaff.map((staff) => (
                <div key={staff.id} className="bg-white p-5 rounded-md md:rounded-lg border border-gray-100 shadow-sm flex justify-between items-start group hover:border-blue-100 transition-all">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-[#0B2A4A]">{staff.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 mb-3">{staff.email}</p>
                    <div className="flex flex-wrap gap-1">
                      {staff.allowedRoutes?.map((r: string) => (
                        <span key={r} className="text-[7px] font-bold bg-gray-50 border px-1.5 py-0.5 rounded uppercase text-blue-600">{r.replace('/admin/', '')}</span>
                      ))}
                    </div>
                  </div>
                  {/* REMOVED opacity-0 FOR MOBILE, ADDED md:opacity-0 FOR DESKTOP HOVER */}
                  <div className="flex flex-col gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditInitiate(staff)} className="text-blue-600 p-2 bg-blue-50 rounded-md hover:bg-blue-600 hover:text-white transition-all">
                      <FiEdit3 size={14} />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(staff.id)} className="text-red-500 p-2 bg-red-50 rounded-md hover:bg-red-600 hover:text-white transition-all">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Passcode Management Section */}
          <div className="mt-12 pt-12 border-t border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <FiKey /> Passcode Settings
              </h3>
              <button
                onClick={() => setShowAddPassword(!showAddPassword)}
                className="bg-[#0B2A4A] text-white px-4 py-2 rounded-md font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-sm"
              >
                <FiPlus /> Add Password
              </button>
            </div>

            {showAddPassword && (
              <div className="bg-white p-6 rounded-md md:rounded-lg shadow-sm border border-gray-100 mb-8 animate-in slide-in-from-top-4">
                <h4 className="text-[10px] font-black uppercase text-[#0B2A4A] mb-4">Create New Route Passcode</h4>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Passcode (Min 6 digits)</label>
                    <div className="relative">
                      <input
                        type={showNewPasscode ? "text" : "password"}
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="Enter new passcode"
                        className="w-full bg-gray-50 border p-3 pr-10 rounded-md text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                      />
                      <button
                        onClick={() => setShowNewPasscode(!showNewPasscode)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0B2A4A]"
                      >
                        {showNewPasscode ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Assign Routes</label>
                    <div className="border border-gray-100 rounded-md bg-gray-50">
                      <button
                        onClick={() => setShowRoutesDropdown(!showRoutesDropdown)}
                        className="w-full p-3 flex items-center justify-between text-xs font-bold text-[#0B2A4A]"
                      >
                        <span>Select Routes ({newPasscodeRoutes.length} selected)</span>
                        {showRoutesDropdown ? <FiChevronUp /> : <FiChevronDown />}
                      </button>

                      {showRoutesDropdown && (
                        <div className="p-3 border-t border-gray-100 max-h-48 overflow-y-auto flex flex-col gap-2">
                          {globalRoutes.length === 0 && <p className="text-gray-400 text-xs italic">No routes available.</p>}
                          {globalRoutes.map(r => {
                            const isAssigned = adminPasscodes.some(pc => pc.routes?.includes(r));
                            return (
                              <label key={r} onClick={(e) => {
                                if (isAssigned) { e.preventDefault(); return; }
                                if (newPasscodeRoutes.includes(r)) {
                                  setNewPasscodeRoutes(newPasscodeRoutes.filter(route => route !== r));
                                } else {
                                  setNewPasscodeRoutes([...newPasscodeRoutes, r]);
                                }
                              }} className={`flex items-center gap-3 p-2 rounded transition-colors ${isAssigned ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-white cursor-pointer'}`}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${newPasscodeRoutes.includes(r) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                                  {newPasscodeRoutes.includes(r) && <FiCheck size={10} />}
                                </div>
                                <span className="text-xs font-bold text-gray-700">{r} {isAssigned && <span className="text-[9px] text-gray-400 italic">(Assigned)</span>}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => { setShowAddPassword(false); setNewPasscode(""); setNewPasscodeRoutes([]); }}
                      className="px-6 py-2 border rounded-md text-[9px] font-black uppercase text-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePasscode}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm"
                    >
                      Save Passcode
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminPasscodes.map(pc => (
                <div key={pc.id} className="bg-white p-5 rounded-md md:rounded-lg border border-gray-100 shadow-sm flex flex-col gap-3 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-[0.2em] text-[#0B2A4A] bg-gray-50 px-3 py-1 rounded mt-1">
                          {visiblePasscodes.includes(pc.id) ? pc.passcode : '*'.repeat(pc.passcode?.length || 6)}
                        </span>
                        <button onClick={() => togglePasscodeVisibility(pc.id)} className="text-gray-400 hover:text-gray-600 p-2">
                          {visiblePasscodes.includes(pc.id) ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Created: {new Date(pc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => { setPasscodeToDelete(pc); setDeletePasscodeEntry(""); }} className="text-red-500 p-2 bg-red-50 rounded-md hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 sm:opacity-100">
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase text-gray-400 mb-1.5">Assigned Routes</p>
                    <div className="flex flex-wrap gap-1">
                      {pc.routes?.map((r: string) => (
                        <span key={r} className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {adminPasscodes.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-400 text-xs font-bold italic bg-white rounded-lg border border-gray-100 border-dashed">
                  No route passcodes configured yet.
                </div>
              )}
            </div>
          </div>

        </div>

        {(showConfirm || showDeleteConfirm) && (
          <div className="fixed inset-0 bg-[#0B2A4A]/90 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className={`bg-white p-8 rounded-md md:rounded-lg max-w-sm w-full text-center shadow-2xl border-t-4 animate-in zoom-in-95 duration-200 ${showDeleteConfirm ? 'border-red-600' : 'border-blue-600'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${showDeleteConfirm ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {showDeleteConfirm ? <FiTrash2 size={20} /> : <FiLock size={20} />}
              </div>
              <h3 className="text-[#0B2A4A] font-black uppercase italic text-lg mb-1">{showDeleteConfirm ? "Revoke Access" : "Verify Action"}</h3>
              <p className="text-gray-400 text-[9px] font-bold uppercase mb-6 italic">Master Authority Passcode Required</p>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="****"
                className="w-full text-center text-2xl tracking-[0.5em] font-black p-3 bg-gray-50 rounded-md mb-6 outline-none border-2 border-transparent focus:border-blue-600"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowConfirm(false); setShowDeleteConfirm(null); setPasscode(""); }} className="flex-1 p-4 border rounded-md text-[9px] font-black uppercase text-gray-400">Cancel</button>
                <button disabled={isProcessing} onClick={showDeleteConfirm ? revokeAccess : finalizePermissions} className={`flex-1 p-4 text-white rounded-md text-[9px] font-black uppercase tracking-widest ${showDeleteConfirm ? 'bg-red-600' : 'bg-blue-600'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isProcessing ? "Processing..." : (showDeleteConfirm ? "Confirm Revoke" : "Confirm Authorize")}
                </button>
              </div>
            </div>
          </div>
        )}

        {passcodeToDelete && (
          <div className="fixed inset-0 bg-[#0B2A4A]/90 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-md md:rounded-lg max-w-sm w-full text-center shadow-2xl border-t-4 border-red-600 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50 text-red-600">
                <FiTrash2 size={20} />
              </div>
              <h3 className="text-[#0B2A4A] font-black uppercase italic text-lg mb-1">Delete Passcode</h3>
              <p className="text-gray-400 text-[9px] font-bold uppercase mb-6 italic">Enter the passcode to confirm deletion.</p>
              <input
                type="password"
                value={deletePasscodeEntry}
                onChange={(e) => setDeletePasscodeEntry(e.target.value)}
                placeholder="••••••"
                className="w-full text-center text-2xl tracking-[0.5em] font-black p-3 bg-gray-50 rounded-md mb-6 outline-none border-2 border-transparent focus:border-red-600"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setPasscodeToDelete(null); setDeletePasscodeEntry(""); }} className="flex-1 p-4 border rounded-md text-[9px] font-black uppercase text-gray-400">Cancel</button>
                <button disabled={isProcessing} onClick={() => {
                  if (deletePasscodeEntry === passcodeToDelete.passcode) {
                    handleDeletePasscode(passcodeToDelete.id);
                  } else {
                    toast.error("Incorrect Passcode");
                  }
                }} className={`flex-1 p-4 text-white rounded-md text-[9px] font-black uppercase tracking-widest bg-red-600 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isProcessing ? "Processing..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}