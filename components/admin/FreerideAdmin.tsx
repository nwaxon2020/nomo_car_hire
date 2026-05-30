"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import {
  FiSave,
  FiUsers,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiCopy,
  FiExternalLink,
  FiSearch,
  FiSettings,
  FiAlertCircle,
  FiCheckCircle,
  FiTrash2,
  FiAlertTriangle,
  FiClock,
  FiRotateCcw,
  FiLock
} from 'react-icons/fi';
import { toast } from "react-hot-toast";
import { useAdminRole, verifyAdminPasscode } from '@/lib/hooks/useAdminRole';

interface FreerideConfig {
  driverThreshold: number;
  passengerThreshold: number;
  freeRideTimesLimit: number;
}

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  photoURL: string;
  profileImage: string;
  referralPoints: number;
  freeRidesUsed?: number;
  fareReceived?: boolean;
  fareReceivedAt?: any;
  isDriver?: boolean;
}

export default function FreerideAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<FreerideConfig>({
    driverThreshold: 20,
    passengerThreshold: 20,
    freeRideTimesLimit: 1
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    type: 'payment' | 'reset' | null;
    customer: Customer | null;
  }>({
    show: false,
    type: null,
    customer: null
  });
  const [processingAction, setProcessingAction] = useState(false);
  
  // Passcode States
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeEntry, setPasscodeEntry] = useState("");
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null);

  const { isCEO } = useAdminRole();

  // Fetch Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "adminSettings", "freerideConfig");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as FreerideConfig);
        } else {
          // Initialize with defaults if not exists
          await setDoc(docRef, {
            driverThreshold: 20,
            passengerThreshold: 20,
            freeRideTimesLimit: 1
          });
        }
      } catch (err) {
        console.error("Error fetching freeride config:", err);
      }
    };
    fetchConfig();
  }, []);

  // Fetch Qualifying Customers
  useEffect(() => {
    if (!config.passengerThreshold) return;

    setLoading(true);
    const usersRef = collection(db, "users");
    // We can't do multiple conditions effectively in firestore for "qualifying" easily if it involves complex logic,
    // so we'll fetch those with enough points and filter locally for the freeRidesUsed limit.
    const q = query(usersRef, where("referralPoints", ">=", config.passengerThreshold));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter out those who have already used up their free rides
        const freeRidesUsed = data.freeRidesUsed || 0;
        if (freeRidesUsed < config.freeRideTimesLimit) {
          list.push({ id: doc.id, ...data } as Customer);
        }
      });
      setCustomers(list.sort((a, b) => b.referralPoints - a.referralPoints));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching customers:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [config.passengerThreshold, config.freeRideTimesLimit]);

  // Auto-Cleanup: Reset customers who received fare > 90 days ago
  useEffect(() => {
    if (customers.length === 0) return;

    const cleanup = async () => {
      const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      for (const customer of customers) {
        if (customer.fareReceived && customer.fareReceivedAt) {
          const receivedDate = customer.fareReceivedAt.toDate
            ? customer.fareReceivedAt.toDate().getTime()
            : new Date(customer.fareReceivedAt).getTime();

          if (now - receivedDate > ninetyDaysInMs) {
            console.log(`Auto-cleaning up customer ${customer.id} (Fare received > 90 days ago)`);
            await quietResetPoints(customer.id);
          }
        }
      }
    };

    cleanup();
  }, [customers]);

  const quietResetPoints = async (customerId: string) => {
    try {
      const userRef = doc(db, "users", customerId);
      await setDoc(userRef, {
        referralPoints: 0,
        fareReceived: false,
        fareReceivedAt: null
      }, { merge: true });
    } catch (err) {
      console.error("Auto-cleanup failed for:", customerId, err);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "adminSettings", "freerideConfig"), config);
      setIsDirty(false);
      toast.success("Freeride settings updated!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkFareReceived = async (customerId: string) => {
    setProcessingAction(true);
    try {
      const userRef = doc(db, "users", customerId);
      await setDoc(userRef, {
        fareReceived: true,
        fareReceivedAt: new Date()
      }, { merge: true });
      toast.success("Payment status updated to: RECEIVED");
      setShowConfirmModal({ show: false, type: null, customer: null });
    } catch (err) {
      console.error("Error marking fare received:", err);
      toast.error("Failed to update payment status");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUnmarkPaid = async () => {
    const isValid = await verifyAdminPasscode(passcodeEntry, "/admin/freeride");
    if (!isValid) {
      toast.error("Invalid Administrative Passcode");
      setPasscodeEntry("");
      return;
    }

    if (!pendingUndoId) return;
    
    setProcessingAction(true);
    try {
      const userRef = doc(db, "users", pendingUndoId);
      await setDoc(userRef, {
        fareReceived: false,
        fareReceivedAt: null
      }, { merge: true });
      
      toast.success("Payment status reverted to PENDING");
      setShowPasscodeModal(false);
      setPasscodeEntry("");
      setPendingUndoId(null);
    } catch (err) {
      console.error("Error reverting payment:", err);
      toast.error("Reversion failed");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleResetPoints = async (customerId: string) => {
    setProcessingAction(true);
    try {
      const userRef = doc(db, "users", customerId);
      // NOTE: We reset referralPoints but NOT referralCount (VIP status) or freeRidesUsed (Global limit)
      await setDoc(userRef, {
        referralPoints: 0,
        fareReceived: false,
        fareReceivedAt: null
      }, { merge: true });
      toast.success("Customer reset and removed from qualifying list.");
      setShowConfirmModal({ show: false, type: null, customer: null });
    } catch (err) {
      console.error("Error resetting customer:", err);
      toast.error("Failed to reset customer status");
    } finally {
      setProcessingAction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recently";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString("en-GB");
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB");
      }
      return new Date(timestamp).toLocaleDateString("en-GB");
    } catch {
      return "Recently";
    }
  };

  const getProfilePath = (customer: Customer) => {
    return customer.isDriver
      ? `/user/driver-profile/${customer.id}`
      : `/user/profile/${customer.id}`;
  };

  const filteredCustomers = customers.filter(c =>
    c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Settings Section */}
      <section className={`p-6 rounded-2xl border-2 transition-all duration-500 ${isDirty
        ? "bg-red-50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
        : "bg-white border-gray-100 shadow-sm"
        }`}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]">
            <FiSettings className="text-blue-600" /> Threshold Regulation
          </h3>
          {isDirty && (
            <span className="text-[10px] font-black uppercase text-red-600 animate-pulse bg-red-100 px-3 py-1 rounded-full">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Driver Referral Threshold"
            value={config.driverThreshold}
            type="number"
            onChange={(v) => { setConfig({ ...config, driverThreshold: parseInt(v) || 0 }); setIsDirty(true); }}
          />
          <Input
            label="Passenger Referral Threshold"
            value={config.passengerThreshold}
            type="number"
            onChange={(v) => { setConfig({ ...config, passengerThreshold: parseInt(v) || 0 }); setIsDirty(true); }}
          />
          <Input
            label="Free Ride Tickets (Global Limit)"
            value={config.freeRideTimesLimit}
            type="number"
            onChange={(v) => { setConfig({ ...config, freeRideTimesLimit: parseInt(v) || 0 }); setIsDirty(true); }}
          />
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving || !isDirty}
          className={`mt-8 w-full md:w-auto px-10 py-3 rounded-xl font-black uppercase italic flex items-center justify-center gap-2 transition-all ${isDirty
            ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          {saving ? "Saving..." : "Apply Settings"} <FiSave />
        </button>
      </section>

      {/* Customers List Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]">
              <FiUsers className="text-emerald-500" /> Qualifying Customers
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
              Showing users with {config.passengerThreshold}+ referrals who haven't used their {config.freeRideTimesLimit} free ride(s).
            </p>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-80"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase text-gray-400">Loading qualifying users...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-4">
              🧐
            </div>
            <h4 className="font-black uppercase italic text-gray-500">No qualifying customers found</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase max-w-xs">
              Either no one has reached the threshold, or everyone has already used their free ride tickets.
            </p>
          </div>) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Referrals</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Contact Details</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Payment Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-6 font-medium">
                        <div className="flex items-center gap-4">
                          <img
                            src={customer.photoURL || customer.profileImage || `https://ui-avatars.com/api/?name=${customer.fullName}&background=random`}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shadow-sm ring-2 ring-white"
                          />
                          <div>
                            <p className="text-sm font-black text-[#0B2A4A] uppercase italic">{customer.fullName || "Anonymous"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-gray-400 font-mono">{customer.id}</span>
                              <button onClick={() => copyToClipboard(customer.id)} className="text-blue-500 hover:text-blue-700">
                                <FiCopy size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="inline-flex flex-col">
                          <span className="text-xl font-black text-blue-600 italic leading-none">{customer.referralPoints}</span>
                          <span className="text-[9px] font-black uppercase text-gray-400 mt-1">Total Referrals</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-[10px] font-bold text-gray-600 hover:text-blue-600 transition-colors">
                            <FiMail className="text-blue-400" /> {customer.email}
                          </a>
                          <a href={`tel:${customer.phoneNumber}`} className="flex items-center gap-2 text-[10px] font-bold text-gray-600 hover:text-green-600 transition-colors">
                            <FiPhone className="text-green-400" /> {customer.phoneNumber}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {customer.fareReceived ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <FiCheckCircle size={10} /> Paid Received
                              </span>
                              <button 
                                onClick={() => { setPendingUndoId(customer.id); setShowPasscodeModal(true); }}
                                className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Undo Payment Status (Requires CEO Code)"
                              >
                                <FiRotateCcw size={10} />
                              </button>
                            </div>
                            {customer.fareReceivedAt && (
                              <span className="text-[8px] text-gray-400 font-bold ml-1 flex items-center gap-1">
                                <FiClock size={8} /> {formatDate(customer.fareReceivedAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                            <FiAlertCircle size={10} /> Pending Payment
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          {!customer.fareReceived && (
                            <button
                              onClick={() => setShowConfirmModal({ show: true, type: 'payment', customer: customer })}
                              className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase italic rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-2"
                              title="Click when customer redeems a free ride ticket"
                            >
                              Mark Paid
                            </button>
                          )}

                          <a
                            href={`https://wa.me/${customer.phoneNumber?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Chat on WhatsApp"
                          >
                            <FiMessageSquare size={18} />
                          </a>

                          <button
                            disabled={!customer.fareReceived}
                            onClick={() => setShowConfirmModal({ show: true, type: 'reset', customer: customer })}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${customer.fareReceived
                              ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer"
                              : "bg-gray-100 text-gray-300 cursor-not-allowed"
                              }`}
                            title={customer.fareReceived ? "Delete Customer from list (Reset Progress)" : "Mark as paid before resetting"}
                          >
                            <FiTrash2 size={18} />
                          </button>

                          <button
                            disabled={!isCEO}
                            onClick={() => window.open(getProfilePath(customer), '_blank')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                              isCEO 
                                ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white" 
                                : "bg-gray-100 text-gray-300 cursor-not-allowed"
                            }`}
                            title={isCEO ? "View Profile" : "CEO Access Only"}
                          >
                            <FiExternalLink size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden divide-y divide-gray-50">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-5 hover:bg-gray-50/30 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={customer.photoURL || customer.profileImage || `https://ui-avatars.com/api/?name=${customer.fullName}&background=random`}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white"
                      />
                      <div>
                        <p className="text-xs font-black text-[#0B2A4A] uppercase italic leading-tight">{customer.fullName || "Anonymous"}</p>
                        <button onClick={() => copyToClipboard(customer.id)} className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold text-gray-400 group">
                          {customer.id} <FiCopy className="group-hover:text-blue-500" />
                        </button>
                        <a href={`mailto:${customer.email}`} className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-600 hover:text-blue-600 transition-colors">
                          <FiMail className="text-blue-400" /> {customer.email}
                        </a>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600 italic leading-none">{customer.referralPoints}</p>
                      <p className="text-[8px] font-black uppercase text-gray-400 mt-0.5">Points</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    {customer.fareReceived ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-[8px] font-black uppercase border border-green-100">
                          <FiCheckCircle size={10} /> Paid • {formatDate(customer.fareReceivedAt)}
                        </span>
                        <button 
                          onClick={() => { setPendingUndoId(customer.id); setShowPasscodeModal(true); }}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100"
                        >
                          <FiRotateCcw size={10} />
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[8px] font-black uppercase border border-amber-100">
                        <FiAlertCircle size={10} /> Pending Payment
                      </span>
                    )}
                    <a href={`tel:${customer.phoneNumber}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[8px] font-black uppercase border border-blue-100 leading-none h-[22px]">
                      <FiPhone size={10} /> Call
                    </a>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setShowConfirmModal({ show: true, type: 'payment', customer: customer })}
                      disabled={customer.fareReceived}
                      className={`h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${customer.fareReceived
                        ? "bg-gray-50 text-green-500 opacity-50 cursor-not-allowed"
                        : "bg-blue-600 text-white shadow-blue-100 active:scale-95"
                        }`}
                      title="Mark Paid"
                    >
                      <FiCheckCircle size={18} />
                    </button>

                    <a
                      href={`https://wa.me/${customer.phoneNumber?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center active:scale-95 shadow-sm"
                      title="WhatsApp"
                    >
                      <FiMessageSquare size={18} />
                    </a>

                    <button
                      disabled={!isCEO}
                      onClick={() => window.open(getProfilePath(customer), '_blank')}
                      className={`h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                        isCEO 
                          ? "bg-blue-50 text-blue-600 active:scale-95" 
                          : "bg-gray-100 text-gray-300 cursor-not-allowed"
                      }`}
                      title={isCEO ? "View Profile" : "CEO Access Only"}
                    >
                      <FiExternalLink size={18} />
                    </button>

                    <button
                      disabled={!customer.fareReceived}
                      onClick={() => setShowConfirmModal({ show: true, type: 'reset', customer: customer })}
                      className={`h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${customer.fareReceived
                        ? "bg-red-50 text-red-500 active:scale-95"
                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                        }`}
                      title="Reset"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Administrative Passcode Modal (For Undoing Payment) */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg">
              <FiLock />
            </div>
            
            <h2 className="text-xl font-black uppercase italic text-[#0B2A4A] mb-2 leading-tight">
              CEO Authorization
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
              Reverting payment status requires administrative clearance.
            </p>

            <input
              type="password"
              autoFocus
              maxLength={6}
              value={passcodeEntry}
              onChange={(e) => setPasscodeEntry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnmarkPaid()}
              placeholder="••••••"
              className="w-full text-center text-3xl font-black tracking-[0.5em] p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-red-500 outline-none mb-8 transition-all"
            />

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setShowPasscodeModal(false); setPasscodeEntry(""); setPendingUndoId(null); }}
                className="py-4 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmarkPaid}
                disabled={processingAction}
                className="py-4 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase shadow-lg shadow-red-100"
              >
                {processingAction ? "..." : "Authorize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showConfirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg ${showConfirmModal.type === 'payment' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              }`}>
              {showConfirmModal.type === 'payment' ? <FiCheckCircle /> : <FiAlertTriangle />}
            </div>

            <h2 className="text-xl font-black uppercase italic text-[#0B2A4A] mb-2 leading-tight">
              {showConfirmModal.type === 'payment'
                ? "Confirm Payment Receipt"
                : "Delete Customer Progress"}
            </h2>

            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">
              {showConfirmModal.type === 'payment'
                ? `Are you sure you want to mark ${showConfirmModal.customer?.fullName} as paid? This confirms the ₦5,000 fare has been successfully transferred to them.`
                : `Are you sure you want to remove ${showConfirmModal.customer?.fullName} from the qualifying list? This will reset their reward points but will NEVER affect their VIP Stars progress.`}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowConfirmModal({ show: false, type: null, customer: null })}
                className="py-4 rounded-2xl bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  if (showConfirmModal.type === 'payment') {
                    handleMarkFareReceived(showConfirmModal.customer!.id);
                  } else {
                    handleResetPoints(showConfirmModal.customer!.id);
                  }
                }}
                disabled={processingAction}
                className={`py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${showConfirmModal.type === 'payment'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                  }`}
              >
                {processingAction ? "Processing..." : (showConfirmModal.type === 'payment' ? "Confirm Paid" : "Confirm Reset")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void, type?: string }) {
  return (
    <div className="w-full">
      <label className="block text-[9px] font-black uppercase text-gray-400 mb-2 ml-1 tracking-tighter">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-extrabold uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
      />
    </div>
  );
}
