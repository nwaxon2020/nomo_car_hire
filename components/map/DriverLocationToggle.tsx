'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import {
  FaMapMarkerAlt, FaLocationArrow, FaStopCircle, FaPhone,
  FaUser, FaTimes, FaEdit, FaWhatsapp, FaCamera, FaGlobe, FaInfoCircle, FaChevronDown
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function DriverLocationToggle({
  driverId,
  vehicleId,
  tripId,
}: { driverId: string; vehicleId?: string; tripId?: string; }) {
  const [isLocationOn, setIsLocationOn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false); // NEW: State for dropdown
  const [watchId, setWatchId] = useState<number | null>(null);

  // Profile States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const auth = getAuth();
  const isCurrentDriver = auth.currentUser?.uid === driverId;

  useEffect(() => {
    if (!driverId) return;
    const loadData = async () => {
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (driverDoc.exists()) {
        const data = driverDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhoneNumber(data.phoneNumber || '');
        setWhatsappPreferred(data.whatsappPreferred || false);
        setProfileImage(data.profileImage || '');
        setCity(data.city || 'Ikeja');
        setState(data.state || 'Lagos');
        setIsLocationOn(data.location?.isSharing || false);
        setCurrentLocation(data.location || null);
      }
    };
    loadData();
  }, [driverId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${driverId}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', driverId), { profileImage: url });
      setProfileImage(url);
      toast.success("Photo updated!");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', driverId), {
        firstName,
        lastName,
        phoneNumber,
        city,
        state,
        whatsappPreferred,
        updatedAt: Timestamp.now()
      });
      setIsEditingLocation(false);
      toast.success("Profile synchronized!");
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLocation = async () => {
    if (isLocationOn) {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsLocationOn(false);
      await updateDoc(doc(db, 'users', driverId), {
        'location.isSharing': false,
        isLocationActive: false
      });
      toast.success("Location Off");
    } else {
      if (!navigator.geolocation) return toast.error("GPS not supported");
      setIsLoading(true);

      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            const areaName = `${data.city || data.locality}, ${data.principalSubdivision}`;
            const loc = { lat: latitude, lng: longitude, isSharing: true, address: areaName, timestamp: Timestamp.now() };
            setCurrentLocation(loc);
            await updateDoc(doc(db, 'users', driverId), { location: loc, isLocationActive: true });
            setIsLocationOn(true);
            setIsLoading(false);
          } catch (error) {
            const fallbackLoc = { lat: latitude, lng: longitude, isSharing: true, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, timestamp: Timestamp.now() };
            setCurrentLocation(fallbackLoc);
            await updateDoc(doc(db, 'users', driverId), { location: fallbackLoc, isLocationActive: true });
            setIsLocationOn(true);
            setIsLoading(false);
          }
        },
        (err) => {
          setIsLoading(false);
          toast.error("Enable GPS permissions");
        },
        { enableHighAccuracy: true }
      );
      setWatchId(id);
    }
  };

  if (!isCurrentDriver) return null;

  return (
    <div className="relative font-sans px-2">
      {/* MAIN WIDGET */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl shadow-xl overflow-hidden text-white">
        <div className="p-3 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLocationOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-[10px] font-bold uppercase text-slate-300">
              {isLocationOn ? 'Live' : 'Offline'}
            </span>

            {/* INTERACTIVE DROPDOWN INFO BOX */}
            <div className="px-3">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-1.5 flex flex-col transition-all active:bg-amber-500/20"
              >
                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tight text-left">How This Helps You</p>
                  </div>
                </div>

                {showInfo && (
                  <div className="mt-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    <ul className="text-[9px] text-slate-300 space-y-1 leading-tight text-left border-t border-amber-500/10 pt-2">
                      <li className="flex items-start gap-1"><span>•</span> Customers can see how close you are to their location</li>
                      <li className="flex items-start gap-1"><span>•</span> Increases your chances of getting booked</li>
                      <li className="flex items-start gap-1"><span>•</span> Shows customers you're active and available</li>
                    </ul>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleLocation}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${isLocationOn ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'}`}
            >
              {isLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                isLocationOn ? <><FaStopCircle /> Off</> : <><FaLocationArrow /> Go Live</>}
            </button>
            <button onClick={() => setSettingsOpen(true)} className="px-3 py-1.5 bg-slate-800 rounded-lg text-slate-300 text-[10px] font-semibold border border-white/5">
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* SETTINGS OVERLAY */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/90 backdrop-blur-md p-0 md:p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-t-xl md:rounded-xl border-t md:border border-emerald-500/20 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="relative p-6 space-y-5">
              <button onClick={() => setSettingsOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"><FaTimes /></button>

              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full border-2 border-emerald-500/50 overflow-hidden bg-slate-800">
                    {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : <FaUser className="w-full h-full p-5 text-slate-600" />}
                    {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 rounded-full cursor-pointer hover:bg-emerald-500 transition-colors shadow-lg">
                    <FaCamera className="text-white text-xs" />
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Driver Photo</p>
              </div>

              {isLocationOn && currentLocation && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <FaGlobe className="text-emerald-400 mt-1 text-xs" />
                    <div>
                      <p className="text-[9px] uppercase font-black text-emerald-500 tracking-widest">Active Broadcasting</p>
                      <p className="text-xs text-slate-200 leading-tight mt-1">{currentLocation.address}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Base Region</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded">VIP</span>
                </div>
                {!isEditingLocation ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <FaMapMarkerAlt className="text-red-500" />
                      <span>{city}, {state}</span>
                    </div>
                    <button onClick={() => setIsEditingLocation(true)} className="text-emerald-400 text-xs flex items-center gap-1"><FaEdit /> Edit</button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in zoom-in-95">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-emerald-500" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                      <input className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-emerald-500" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleUpdateProfile} disabled={isSaving} className="flex-1 bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                        {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Update
                      </button>
                      <button onClick={() => setIsEditingLocation(false)} className="flex-1 bg-slate-800 text-slate-400 text-[10px] font-bold py-2 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:border-emerald-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:border-emerald-500 outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Phone & WhatsApp</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FaPhone className="absolute left-3 top-3 text-slate-500 text-[10px]" />
                    <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-sm text-white focus:border-emerald-500 outline-none" />
                  </div>
                  <button
                    onClick={() => setWhatsappPreferred(!whatsappPreferred)}
                    className={`px-3 rounded-lg flex items-center justify-center transition-all border ${whatsappPreferred ? 'bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                  >
                    <FaWhatsapp className="text-lg" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSaving ? 'Synchronizing...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}