"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, deleteField, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LoadingRound from "@/components/re-useable-loading";
import { FaTimes, FaCamera, FaMapMarkerAlt, FaUser } from "react-icons/fa";

const NIGERIAN_STATES = [
  "Lagos", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
]

export default function DriverRegisterPageUi() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect if user came through the direct "Work as a Driver" signup flow
  const isDirectDriverFlow = searchParams.get("flow") === "driver";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("Lagos");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // 🔢 Calculate Age
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const diff = today.getMonth() - birth.getMonth();
    if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // 🔐 Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          router.push("/login");
          return;
        }
        if (userDoc.data().isDriver) {
          router.push(`/user/driver-profile/${user.uid}`);
          return;
        }
        setLoading(false);
      } catch (error) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const age = calculateAge(dateOfBirth);
    if (age < 19 || age > 75) {
      return setMessage("❌ Age must be between 19 and 75 years.");
    }

    if (!idPhoto) return setMessage("❌ ID photo is required.");

    const user = auth.currentUser;
    if (!user) return setMessage("You must be logged in.");

    try {
      setSubmitting(true);
      const userId = user.uid;

      // 1. Upload ID Photo to idPhotoURL
      const storageRef = ref(storage, `driverIDs/${userId}`);
      await uploadBytes(storageRef, idPhoto);
      const idPhotoURL = await getDownloadURL(storageRef);

      // 2. Prepare Ticket & Trial Logic
      const now = new Date();

      const initialTicket = {
        amount: 0,
        purchasedDate: now.toISOString(),
        expired: false, // Initial free month is active
        type: "welcome_bonus"
      };

      // 3. Update Document with New Fields
      await updateDoc(doc(db, "users", userId), {
        firstName,
        lastName,
        dateOfBirth,
        age,
        phoneNumber,
        whatsappPreferred,
        idNumber,
        idPhotoURL, // Maintained as requested
        country,
        state,
        city,
        address,
        isDriver: true,
        verified: false,
        vehicleLog: [],
        comments: [],
        customersCarried: [],
        fullName: deleteField(), // Remove fullName since drivers use firstName + lastName

        // --- NEW DRIVER FREE TICKET LOGIC ---
        newDriverConfig: {
          isNew: true,
          registeredAt: serverTimestamp(),
        },
        justJoined: true,
        driverJoinedDate: serverTimestamp(),
        ticket: [initialTicket],
        ticketStatus: "trial",
        hasUnreadNotifications: true,
        notifications: arrayUnion({
          id: `driver-reg-${Date.now()}`,
          type: "driver_registration",
          title: "🎉 Driver Registration Successful!",
          message: `Welcome to Nomo Cars Driver, ${firstName}! Your driver profile is ready and you have been granted a 2-month free trial.`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: null,
          actionLabel: null
        })
      });

      setMessage("✅ Registration successful! Enjoy 2 months free.");
      setTimeout(() => router.push(`/user/driver-profile/${userId}`), 1500);
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${isDirectDriverFlow ? "bg-gray-900" : "bg-white"}`}>
      <LoadingRound />
      <p className={`mt-4 animate-pulse ${isDirectDriverFlow ? "text-gray-400" : "text-gray-500"}`}>Setting up your driver account...</p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // Theme-aware classes
  // ═══════════════════════════════════════════════════════════════════
  const dark = isDirectDriverFlow;

  const inputClass = dark
    ? "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-white placeholder-gray-400"
    : "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none";

  const selectClass = dark
    ? "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-white"
    : "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none";

  const sectionLabelClass = dark
    ? "flex items-center gap-2 text-amber-400 font-bold uppercase text-xs tracking-wider"
    : "flex items-center gap-2 text-purple-600 font-bold uppercase text-xs tracking-wider";

  const accentColor = dark ? "amber" : "purple";

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className={`mx-2 min-h-screen pt-4 pb-8 sm:px-6 md:px-8 flex items-center justify-center relative ${dark ? "bg-gray-900" : "bg-gray-100"}`}>

      {/* Dark theme background overlay */}
      {dark && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070')` }}
          />
          <div className="absolute inset-0 bg-black/70" />
        </>
      )}

      <div className={`max-w-2xl w-full rounded shadow-xl overflow-hidden relative z-10 ${dark ? "bg-gray-900/80 border border-amber-500/30 backdrop-blur-md" : "bg-white"}`}>

        {/* Close Button */}
        <button
          onClick={() => router.back()}
          className={`absolute top-6 right-2 md:right-6 transition-colors z-10 ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
        >
          <FaTimes size={24} />
        </button>

        <div className="p-4 sm:p-12">

          {/* Step Indicator — only for direct driver flow */}
          {dark && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white font-black text-[10px] md:text-xs">✓</div>
                  <span className="text-green-400 font-black text-[11px] md:text-xs uppercase tracking-widest">Account Created</span>
                </div>
                <div className="flex-1 h-px bg-amber-500/40"></div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-[10px] md:text-xs">2</div>
                  <span className="text-amber-400 font-black text-[11px] md:text-xs uppercase tracking-widest">Driver Info</span>
                </div>
              </div>
            </div>
          )}

          <div className="md:text-center mb-10">
            <h1 className={`text-3xl font-bold ${dark ? "text-white" : "text-amber-500"}`}>
              {dark ? "Complete Driver Setup" : "Become a Driver"}
            </h1>
            <p className={`text-sm italic ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Complete the form below to register your account
            </p>

            {/* Added a small badge to show the offer */}
            <div className={`inline-block mt-4 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-tighter ${dark ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-green-100 text-green-700"}`}>
              🎁 New Driver Bonus: 60 Days Free
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* 1. Basic Info Section */}
            <section className="space-y-4">
              <div className={sectionLabelClass}>
                <FaUser /> Basic Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text" placeholder="First Name" required
                  className={inputClass}
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  type="text" placeholder="Last Name" required
                  className={inputClass}
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className={`text-xs font-semibold ml-1 ${dark ? "text-gray-400" : "text-gray-400"}`}>Date of Birth</label>
                  <input
                    type="date" required
                    className={inputClass}
                    value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className={`px-4 py-3 rounded-lg border text-sm ${dark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-purple-50 text-purple-700 border-purple-100"}`}>
                  Calculated Age: <strong>{calculateAge(dateOfBirth)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="tel" placeholder="Phone Number" required
                  className={inputClass}
                  value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <div className={`flex items-center px-4 py-3 border rounded-lg ${dark ? "bg-white/10 border-white/20" : "bg-gray-50 border-gray-200"}`}>
                  <input
                    type="checkbox" id="whatsapp"
                    className={`w-4 h-4 rounded ${dark ? "text-amber-500" : "text-purple-600"}`}
                    checked={whatsappPreferred} onChange={() => setWhatsappPreferred(!whatsappPreferred)}
                  />
                  <label htmlFor="whatsapp" className={`ml-2 text-sm cursor-pointer ${dark ? "text-gray-300" : "text-gray-600"}`}>Prefer WhatsApp?</label>
                </div>
              </div>
            </section>

            {/* 2. Verification Section */}
            <section className="space-y-4">
              <div className={`flex justify-center md:justify-start ${sectionLabelClass}`}>
                <FaCamera /> Identity Verification
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <label className="relative group cursor-pointer shrink-0">
                  <div className={`w-32 h-32 rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all ${dark ? "border-gray-600 group-hover:border-amber-500 bg-white/5" : "border-gray-300 group-hover:border-purple-500 bg-gray-50"}`}>
                    {idPhoto ? (
                      <img src={URL.createObjectURL(idPhoto)} className="w-full h-full object-cover" alt="ID Preview" />
                    ) : (
                      <div className="text-center p-2">
                        <FaCamera className={`mx-auto mb-1 ${dark ? "text-gray-500 group-hover:text-amber-500" : "text-gray-400 group-hover:text-purple-500"}`} />
                        <span className={`text-[10px] uppercase font-bold ${dark ? "text-gray-500" : "text-gray-400"}`}>Upload ID Photo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setIdPhoto(e.target.files ? e.target.files[0] : null)} />
                </label>
                <div className="flex-1 w-full">
                  <input
                    type="text" placeholder="Enter Valid ID Number (Same As ID Photo)" required
                    className={`${inputClass} placeholder:text-xs`}
                    value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                  />
                  <p className={`text-[11px] mt-2 px-1 italic ${dark ? "text-gray-500" : "text-gray-400"}`}>We accept National ID, Driver's License, or International Passport.</p>
                </div>
              </div>
            </section>

            {/* 3. Location Section */}
            <section className={`space-y-4 border-t pt-6 ${dark ? "border-white/10" : "border-gray-100"}`}>
              <div className={sectionLabelClass}>
                <FaMapMarkerAlt /> Work Location
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="Nigeria">Nigeria</option>
                </select>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={selectClass}
                  required
                >
                  {NIGERIAN_STATES.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text" placeholder="City" required
                className={dark ? "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg outline-none text-white placeholder-gray-400" : "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"}
                value={city} onChange={(e) => setCity(e.target.value)}
              />
              <input
                type="text" placeholder="Residential Address"
                className={dark ? "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg outline-none text-white placeholder-gray-400" : "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"}
                value={address} onChange={(e) => setAddress(e.target.value)}
              />
            </section>

            {/* Status Messages */}
            {message && (
              <div className={`p-4 rounded-lg text-sm font-medium ${
                message.startsWith("✅")
                  ? (dark ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-green-50 text-green-700")
                  : (dark ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-red-50 text-red-700")
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className={`w-full py-4 text-white rounded-2xl font-bold text-lg transition-all disabled:bg-gray-400 disabled:shadow-none ${
                dark
                  ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                  : "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200"
              }`}
            >
              {submitting ? <LoadingRound /> : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}