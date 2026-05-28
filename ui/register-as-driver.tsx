"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <LoadingRound />
      <p className="mt-4 text-gray-500 animate-pulse">Setting up your driver account...</p>
    </div>
  );

  return (
    <div className="mx-2 min-h-screen bg-gray-100 pt-4 pb-8 sm:px-6 md:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded shadow-xl overflow-hidden relative">

        {/* Close Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 right-2 md:right-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <FaTimes size={24} />
        </button>

        <div className="p-4 sm:p-12">
          <div className="md:text-center mb-10">
            <h1 className="text-3xl font-bold text-amber-500 ">Become a Driver</h1>
            <p className="text-gray-500 text-sm italic">Complete the form below to register your account</p>

            {/* Added a small badge to show the offer */}
            <div className="inline-block mt-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-tighter">
              🎁 New Driver Bonus: 60 Days Free
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* 1. Basic Info Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-purple-600 font-bold uppercase text-xs tracking-wider">
                <FaUser /> Basic Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text" placeholder="First Name" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  type="text" placeholder="Last Name" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold text-gray-400 ml-1">Date of Birth</label>
                  <input
                    type="date" required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="px-4 py-3 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 text-sm">
                  Calculated Age: <strong>{calculateAge(dateOfBirth)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="tel" placeholder="Phone Number" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox" id="whatsapp"
                    className="w-4 h-4 text-purple-600 rounded"
                    checked={whatsappPreferred} onChange={() => setWhatsappPreferred(!whatsappPreferred)}
                  />
                  <label htmlFor="whatsapp" className="ml-2 text-sm text-gray-600 cursor-pointer">Prefer WhatsApp?</label>
                </div>
              </div>
            </section>

            {/* 2. Verification Section */}
            <section className="space-y-4">
              <div className="flex justify-center md:justify-start items-center gap-2 text-purple-600 font-bold uppercase text-xs tracking-wider">
                <FaCamera /> Identity Verification
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <label className="relative group cursor-pointer shrink-0">
                  <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 group-hover:border-purple-500 overflow-hidden flex items-center justify-center bg-gray-50 transition-all">
                    {idPhoto ? (
                      <img src={URL.createObjectURL(idPhoto)} className="w-full h-full object-cover" alt="ID Preview" />
                    ) : (
                      <div className="text-center p-2">
                        <FaCamera className="mx-auto text-gray-400 group-hover:text-purple-500 mb-1" />
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Upload ID Photo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setIdPhoto(e.target.files ? e.target.files[0] : null)} />
                </label>
                <div className="flex-1 w-full">
                  <input
                    type="text" placeholder="Enter Valid ID Number (Same As ID Photo)" required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-xs"
                    value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-400 mt-2 px-1 italic">We accept National ID, Driver's License, or International Passport.</p>
                </div>
              </div>
            </section>

            {/* 3. Location Section */}
            <section className="space-y-4 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 text-purple-600 font-bold uppercase text-xs tracking-wider">
                <FaMapMarkerAlt /> Work Location
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                >
                  <option value="Nigeria">Nigeria</option>
                </select>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                value={city} onChange={(e) => setCity(e.target.value)}
              />
              <input
                type="text" placeholder="Residential Address"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                value={address} onChange={(e) => setAddress(e.target.value)}
              />
            </section>

            {/* Status Messages */}
            {message && (
              <div className={`p-4 rounded-lg text-sm font-medium ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {message}
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:bg-gray-400 disabled:shadow-none"
            >
              {submitting ? <LoadingRound /> : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}