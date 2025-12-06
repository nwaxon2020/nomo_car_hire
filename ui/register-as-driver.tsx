"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LoadingRound from "@/components/re-useable-loading";

export default function DriverRegisterPageUi() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  
  // Location fields
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // 🔢 Calculate Age
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const diff = today.getMonth() - birth.getMonth();

    if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // 🔐 Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/login");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return router.push("/login");

      if (userDoc.data().isDriver) return router.push(`/user/driver-profile/${user?.uid}`);

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // 📝 Submit Handler
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMessage("");

    if (!firstName || !lastName || !dateOfBirth || !phoneNumber || !idNumber || !country || !state || !city) {
      return setMessage("All fields are required.");
    }

    if (!idPhoto) return setMessage("ID photo is required.");

    // 🎯 Age Validation (19–75 years old)
    const age = calculateAge(dateOfBirth);

    if (age < 19)
      return setMessage("❌ You must be at least 19 years old to register.");
    if (age > 75)
      return setMessage("❌ Maximum age allowed is 75 years.");

    const user = auth.currentUser;
    if (!user) return setMessage("You must be logged in.");

    try {
      setSubmitting(true);
      const userId = user.uid;

      // Upload ID Photo
      const storageRef = ref(storage, `driverIDs/${userId}`);
      await uploadBytes(storageRef, idPhoto);
      const idPhotoURL = await getDownloadURL(storageRef);

      // Update Firestore
      await updateDoc(doc(db, "users", userId), {
        firstName,
        lastName,
        dateOfBirth,
        age,
        phoneNumber,
        whatsappPreferred,
        idNumber,
        idPhotoURL,
        // Location fields
        country,
        state,
        city,
        address,
        isDriver: true,
        verified: false,
        vehicleLog: [],
        comments: [],
        customersCarried: [],
        driverVip: false,
      });

      setMessage("✅ Driver registration submitted!");
      setSubmitting(false);

      setTimeout(() => router.push(`/user/driver-profile/${userId}`), 1500);
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-700 text-lg animate-pulse">Loading...</div>
      </div>
    );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white p-4 pb-8">
      <div className="bg-gray-50 shadow-2xl rounded-2xl p-8 max-w-md w-full">

        {/* Close button */}
        <div
          onClick={() => router.back()}
          className="border rounded-md py-1 px-3 cursor-pointer text-xl sm:text-2xl text-center mt-4 absolute top-0 right-4 sm:right-8 text-gray-900 font-bold"
        >
          x
        </div>

        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800">
          Driver Registration
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="First Name"
            className="w-full px-4 py-3 border rounded-xl"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Last Name"
            className="w-full px-4 py-3 border rounded-xl"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 border rounded-xl mt-1"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            {dateOfBirth && (
              <p className="text-gray-600 text-sm mt-1">
                Age: {calculateAge(dateOfBirth)}
              </p>
            )}
          </div>

          <input
            type="text"
            placeholder="Phone Number"
            className="w-full px-4 py-3 border rounded-xl"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={whatsappPreferred}
              onChange={() => setWhatsappPreferred(!whatsappPreferred)}
            />
            <span className="text-gray-700">Preferred WhatsApp?</span>
          </div>

          {/* ID input section */}
          <input
            type="text"
            placeholder="Valid ID Number"
            className="w-full px-4 py-3 border rounded-xl"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
          />

          <label className="mx-auto w-24 h-24 rounded-xl overflow-hidden border-2 border-purple-600 flex items-center justify-center bg-gray-100 cursor-pointer">
            {idPhoto ? (
              <img
                src={URL.createObjectURL(idPhoto)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-xs">Upload ID Photo</span>
            )}

            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) =>
                setIdPhoto(e.target.files ? e.target.files[0] : null)
              }
            />
          </label>


          {/* Location Fields */}
          <div className="space-y-4 pt-2 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">Location Information</h3>
            
            <input
              type="text"
              placeholder="Country"
              className="w-full px-4 py-3 border rounded-xl"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="State/Province"
              className="w-full px-4 py-3 border rounded-xl"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="City"
              className="w-full px-4 py-3 border rounded-xl"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Address (Optional)"
              className="w-full px-4 py-3 border rounded-xl"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {message && (
            <div
              className={`text-center text-sm px-4 py-2 rounded-xl ${
                message.startsWith("✅")
                  ? "bg-green-100 text-green-700 border border-green-400"
                  : "bg-red-100 text-red-700 border border-red-400"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center"
          >
            {submitting ? <LoadingRound /> : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}