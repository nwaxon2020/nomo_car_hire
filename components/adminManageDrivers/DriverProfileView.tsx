"use client";
import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import VehicleCard from "./VehicleCard";
import { toast } from "react-hot-toast";
import { FaTimes, FaPaperPlane, FaFlag, FaChevronLeft, FaChevronRight, FaInfoCircle, FaChevronDown, FaExclamationTriangle, FaLock } from "react-icons/fa";

import { triggerNotification } from "@/lib/notifications";

export default function DriverProfileView({ driver: initialDriver, onClose }: any) {
  const [driver, setDriver] = useState(initialDriver);
  const [msg, setMsg] = useState("");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [flagReason, setFlagReason] = useState(driver.flagReason || "");
  const [pendingFlag, setPendingFlag] = useState(driver.flags || 0);

  // New Passcode States
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeEntry, setPasscodeEntry] = useState("");
  const [adminAction, setAdminAction] = useState<{ type: string, label: string } | null>(null);

  const PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASS_CODE2;

  const presetReasons = [
    "Customer Complaint", "Reckless Driving", "Vehicle Condition Issues",
    "Late Pickup/Dropoff", "Unprofessional Behavior", "Security Policy Breach"
  ];

  useEffect(() => {
    const unsubDriver = onSnapshot(doc(db, "users", driver.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDriver({ id: doc.id, ...data });
        setPendingFlag(data.flags || 0);
      }
    });
    return () => unsubDriver();
  }, [driver.id]);

  useEffect(() => {
    if (!driver.uid) return;
    const q = query(collection(db, "vehicleLog"), where("driverId", "==", driver.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVehicles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [driver.uid]);

  const sendNotification = async () => {
    if (!msg) return toast.error("Please enter a message");

    try {
      await triggerNotification(
        driver.id,
        "Message from Admin Office",
        msg,
        "personal"
      );

      setMsg("");
      toast.success("Message & Push Sent to Driver");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleFlagClick = (count: number) => {
    setPendingFlag(count);
    setShowReasonInput(true);
  };

  // Trigger Passcode for Restricted Actions
  const handleClearFlags = () => {
    if (driver.flags === 3) {
      setAdminAction({ type: 'CLEAR_FLAGS', label: 'Clear 3-Flag Driver' });
      setShowPasscodeModal(true);
    } else {
      setShowClearConfirm(true);
    }
  };

  const handleVerifyToggle = async () => {
    if (driver.verified) {
      setAdminAction({ type: 'UNVERIFY', label: 'Unverify Driver' });
      setShowPasscodeModal(true);
      return;
    }
    if (driver.flags >= 3) {
      setAdminAction({ type: 'VERIFY_WITH_FLAGS', label: 'Verify 3-Flag Driver' });
      setShowPasscodeModal(true);
      return;
    }
    await executeVerify();
  };

  // Logic Executions after Passcode
  const executeVerify = async () => {
    await updateDoc(doc(db, "users", driver.id), { verified: true, flags: 0 });
    toast.success("Driver Verified!");
  };

  const executeUnverify = async () => {
    await updateDoc(doc(db, "users", driver.id), { verified: false });
    toast.success("Driver status set to Unverified");
  };

  const handlePasscodeSubmit = async () => {
    if (passcodeEntry !== PASSCODE) {
      setPasscodeEntry("");
      return toast.error("Invalid Passcode");
    }

    const action = adminAction?.type;
    setShowPasscodeModal(false);
    setPasscodeEntry("");
    setAdminAction(null);

    if (action === 'CLEAR_FLAGS') setShowClearConfirm(true);
    if (action === 'UNVERIFY') executeUnverify();
    if (action === 'VERIFY_WITH_FLAGS') executeVerify();
  };

  const confirmClear = async () => {
    await updateDoc(doc(db, "users", driver.id), { flags: 0, flagReason: "" });
    setShowReasonInput(false);
    setShowClearConfirm(false);
    setFlagReason("");
    setPendingFlag(0);
    toast.success("Flags Cleared");
  };

  const saveReason = async () => {
    if (!flagReason.trim()) return toast.error("Please provide a reason");
    try {
      await updateDoc(doc(db, "users", driver.id), {
        flags: pendingFlag,
        flagReason: flagReason
      });
      setShowReasonInput(false);
      setShowPresets(false);
      toast.success(`Driver set to ${pendingFlag} Flags`);
    } catch (error) {
      toast.error("Failed to save report");
    }
  };

  const carImages = selectedCar ? Object.values(selectedCar.images || {}).filter((img): img is string => typeof img === 'string') : [];
  const nextImg = () => setCurrentImgIdx((prev) => (prev + 1) % carImages.length);
  const prevImg = () => setCurrentImgIdx((prev) => (prev - 1 + carImages.length) % carImages.length);

  const DataField = ({ label, value, full }: any) => (
    <div className={full ? 'w-full' : 'flex-1'}>
      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1 tracking-wider">{label}</p>
      <p className="text-sm font-black text-gray-800 break-words bg-white p-2 rounded-lg border border-gray-100">{value || "---"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-white h-screen w-screen overflow-y-auto animate-in fade-in duration-300">

      {/* Header */}
      <div className="sticky relative top-0 z-20 bg-white/90 backdrop-blur-md border-b  p-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src={driver.profileImage} className="w-14 h-14 rounded-xl object-cover border-2 border-amber-400" />
          <div className="space-y-1">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <h2 className="font-black text-xl">{driver.firstName} {driver.lastName}</h2>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <FaFlag
                      key={n}
                      onClick={() => handleFlagClick(n)}
                      className={`cursor-pointer transition-colors ${(pendingFlag >= n || driver.flags >= n) ? 'text-red-600' : 'text-gray-200'
                        }`}
                      size={16}
                    />
                  ))}
                  {(driver.flags > 0 || pendingFlag > 0) && (
                    <div className="flex items-center gap-2 ml-2">
                      <button onClick={handleClearFlags} className="text-[11px] font-bold px-3 py-0.5 rounded-xl border border-green-500 text-green-600 hover:bg-green-50">Clear Flag</button>
                      <button onClick={() => setShowReasonInput(!showReasonInput)} className="text-blue-500 hover:text-blue-700"><FaInfoCircle size={14} /></button>
                    </div>
                  )}
                </div>

                {showReasonInput && (
                  <div className="flex flex-col md:flex-row items-center gap-2 mt-2 animate-in slide-in-from-top-2 relative">
                    <div className="relative group">
                      <input
                        type="text"
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value)}
                        placeholder="Add reason for flag..."
                        className="text-[11px] p-1.5 pr-8 border rounded-lg w-56 outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <button onClick={() => setShowPresets(!showPresets)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors">
                        <FaChevronDown size={10} />
                      </button>

                      {showPresets && (
                        <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl mt-1 z-50 py-1 overflow-hidden">
                          {presetReasons.map((reason) => (
                            <button key={reason} onClick={() => { setFlagReason(reason); setShowPresets(false); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-gray-600 hover:bg-amber-50 hover:text-amber-600 border-b last:border-0 border-gray-50">
                              {reason}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={saveReason} className="text-[10px] bg-black text-white px-2 py-1.5 rounded-lg font-bold uppercase">Save Report</button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium">{driver.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-10 md:right-10 right-2 p-3 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
          <FaTimes size={18} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Bio & Messaging */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-gray-50 p-5 rounded-2xl space-y-4">
            <h3 className="text-gray-400 font-bold text-[10px] uppercase">Bio Data</h3>
            <DataField label="Address" value={driver.address} full />
            <div className="flex gap-3">
              <DataField label="Age" value={driver.age} />
              <DataField label="City" value={driver.city} />
            </div>
            <a href={driver.idPhotoURL} target="_blank" className="block text-center py-3 bg-white border border-gray-200 rounded-xl font-bold text-amber-600 text-xs uppercase hover:bg-amber-50 transition-colors">View ID Card</a>
          </section>

          <section className="bg-gray-900 p-5 rounded-2xl">
            <h3 className="text-gray-400 font-bold text-[10px] uppercase mb-3">Direct Message</h3>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} className="w-full bg-gray-800 border-none rounded-xl p-3 text-white text-sm h-28 mb-3 focus:ring-1 focus:ring-amber-500" placeholder="Type instruction..." />
            <button onClick={sendNotification} className="w-full py-3 bg-amber-500 hover:bg-amber-400 rounded-xl font-black text-sm flex items-center justify-center gap-2">
              <FaPaperPlane /> SEND NOW
            </button>
          </section>
        </div>

        {/* Right Col: Vehicles & Verification */}
        <div className="lg:col-span-8">
          <h3 className="font-black text-2xl mb-6 uppercase tracking-tight">Registered Vehicles ({vehicles.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((car) => (
              <div key={car.id} className="relative group">
                <VehicleCard car={car} />
                <button onClick={() => { setSelectedCar(car); setCurrentImgIdx(0); }} className="absolute top-2 right-2 bg-white/80 backdrop-blur p-2 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100 shadow-sm">
                  VIEW FULL
                </button>
              </div>
            ))}
          </div>

          <button
            disabled={vehicles.length === 0}
            onClick={handleVerifyToggle}
            className={`w-full mt-8 py-4 rounded-xl font-black shadow-lg transition-all 
              ${vehicles.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : driver.verified
                  ? 'bg-purple-600 text-white shadow-purple-100'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-green-100'}`}
          >
            {vehicles.length === 0
              ? "NO VEHICLE TO ENABLE VERIFICATION"
              : driver.verified ? "DRIVER VERIFIED" : "VERIFY & APPROVE DRIVER"}
          </button>
          {driver.verified && <p className="text-center text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Only CEO can unverify this account</p>}
        </div>
      </div>

      {/* CEO PASSCODE MODAL */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <FaLock size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase">CEO Access Only</h3>
                <p className="text-sm text-gray-500 mt-2">Enter passcode to authorize:<br /><span className="font-bold text-gray-800">{adminAction?.label}</span></p>
              </div>
              <input
                type="password"
                autoFocus
                value={passcodeEntry}
                onChange={(e) => setPasscodeEntry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
                placeholder="••••••"
                className="w-full text-center text-2xl tracking-[1em] font-black p-4 border-2 border-gray-100 rounded-2xl focus:border-amber-400 outline-none"
              />
              <div className="flex gap-3 w-full">
                <button onClick={() => { setShowPasscodeModal(false); setPasscodeEntry(""); }} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-xs uppercase">Cancel</button>
                <button onClick={handlePasscodeSubmit} className="flex-1 py-4 bg-black text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-gray-200">Authorize</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR FLAGS CONFIRMATION */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <FaExclamationTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Clear All Flags?</h3>
                <p className="text-sm text-gray-500 mt-1">This will remove all disciplinary records for <b>{driver.firstName}</b>.</p>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">CANCEL</button>
                <button onClick={confirmClear} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-100">CONFIRM CLEAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE VIEW OVERLAY */}
      {selectedCar && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setSelectedCar(null)} className="absolute top-8 right-8 text-white hover:text-red-500 z-[210] p-4 bg-white/10 rounded-full backdrop-blur-md">
            <FaTimes size={24} />
          </button>
          <button onClick={prevImg} className="absolute left-8 text-white/50 hover:text-white z-[210]"><FaChevronLeft size={48} /></button>
          <div className="relative max-w-5xl max-h-[80vh] overflow-hidden rounded-2xl">
            <img src={carImages[currentImgIdx]} className="w-full h-full object-contain" alt="Full view" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-xs font-bold">
              {currentImgIdx + 1} / {carImages.length} • {selectedCar.carName}
            </div>
          </div>
          <button onClick={nextImg} className="absolute right-8 text-white/50 hover:text-white z-[210]"><FaChevronRight size={48} /></button>
        </div>
      )}
    </div>
  );
}