"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";

export default function DriverRegisterPageUi() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(true); // start loading until auth check
  const [message, setMessage] = useState("");

  // Function to calculate age from date of birth
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // ✅ Auth check + driver check
  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        router.push("/login");
        return;
      }

      const data = userDoc.data();
      if (data.isDriver) {
        router.push("/dashboard"); // already a driver
        return;
      }

      setLoading(false); // show form
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMessage("");

    if (!firstName.trim() || !lastName.trim() || !dateOfBirth || !phoneNumber.trim() || !idNumber.trim()) {
      setMessage("All fields are required.");
      return;
    }

    if (!idPhoto) {
      setMessage("ID photo is required.");
      return;
    }

    // Age validation
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      setMessage("You must be at least 18 years old to register as a driver.");
      return;
    }

    if (age > 80) {
      setMessage("You must be under 80 years old to register as a driver.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setMessage("You must be logged in to register as a driver.");
      return;
    }

    setLoading(true);

    try {
      const userId = user.uid;

      // Upload ID photo
      const storageRef = ref(storage, `driverIDs/${userId}`);
      await uploadBytes(storageRef, idPhoto);
      const idPhotoURL = await getDownloadURL(storageRef);

      // Update user document in Firestore
      await updateDoc(doc(db, "users", userId), {
        firstName,
        lastName,
        dateOfBirth,
        age, // Store calculated age for easy reference
        phoneNumber,
        whatsappPreferred,
        idNumber,
        idPhotoURL,
        isDriver: true,
        verified: false,
        vehicleLog: [],
        comments: [],
      });

      setMessage("✅ Driver registration submitted! Await verification.");
      setLoading(false);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      console.error(err);
      setMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center mt-8">Loading...</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 pb-8">
      <div className="bg-gray-50 shadow-2xl rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800 drop-shadow">Driver Registration</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="First Name" className="w-full px-4 py-3 border rounded-xl" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <input type="text" placeholder="Last Name" className="w-full px-4 py-3 border rounded-xl" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          
          
        {/* Date of Birth input - Alternative with label */}
        <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <input 
            type="date" 
            className="w-full px-4 py-3 border rounded-xl" 
            value={dateOfBirth} 
            onChange={(e) => setDateOfBirth(e.target.value)} 
            required 
        />
        {dateOfBirth && (
            <p className="text-sm text-gray-600 mt-1">
            Age: {calculateAge(dateOfBirth)} years old
            </p>
        )}
        </div>

          <input type="text" placeholder="Phone Number" className="w-full px-4 py-3 border rounded-xl" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={whatsappPreferred} onChange={() => setWhatsappPreferred(!whatsappPreferred)} id="whatsappPreferred" />
            <label htmlFor="whatsappPreferred" className="text-gray-700">Preferred WhatsApp number?</label>
          </div>

          <input type="text" placeholder="Valid ID Number" className="w-full px-4 py-3 border rounded-xl" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />

          <div className="flex flex-col items-center">
            <label className="w-24 h-24 mb-2 rounded-xl overflow-hidden border-2 border-purple-600 flex items-center justify-center bg-gray-100 cursor-pointer">
              {idPhoto ? (
                <img src={URL.createObjectURL(idPhoto)} alt="ID Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-center text-sm">Upload ID Photo</span>
              )}
              <input type="file" accept="image/*" onChange={(e) => setIdPhoto(e.target.files ? e.target.files[0] : null)} className="hidden" />
            </label>
          </div>

          {message && (
            <div className={`text-center mt-4 text-sm px-4 py-2 rounded-xl ${message.startsWith("✅") ? "bg-green-100 text-green-700 border border-green-400" : "bg-red-100 text-red-700 border border-red-400"}`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="cursor-pointer w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-all">
            {loading ? "Submitting..." : "Submit"}
          </button>

          <div className="text-center">
            <Link href="/" className="text-blue-700 hover:underline font-semibold">Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}