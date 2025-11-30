"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";

// ⬇️ Your new loader component
import LoadingRound from "@/ui/re-useable-loading";

export default function DriverRegisterPageUi() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(true); 
  const [submitting, setSubmitting] = useState(false); 
  const [message, setMessage] = useState("");

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const diff = today.getMonth() - birth.getMonth();

    if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // 🔐 Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/login");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return router.push("/login");

      if (userDoc.data().isDriver) return router.push("/dashboard");

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMessage("");

    if (!firstName || !lastName || !dateOfBirth || !phoneNumber || !idNumber) {
      return setMessage("All fields are required.");
    }

    if (!idPhoto) return setMessage("ID photo is required.");

    const age = calculateAge(dateOfBirth);
    if (age < 18) return setMessage("Must be at least 18.");
    if (age > 80) return setMessage("Must be below 80.");

    const user = auth.currentUser;
    if (!user) return setMessage("You must be logged in.");

    try {
      setSubmitting(true);

      const userId = user.uid;

      const storageRef = ref(storage, `driverIDs/${userId}`);
      await uploadBytes(storageRef, idPhoto);
      const idPhotoURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", userId), {
        firstName,
        lastName,
        dateOfBirth,
        age,
        phoneNumber,
        whatsappPreferred,
        idNumber,
        idPhotoURL,
        isDriver: true,
        verified: false,
        vehicleLog: [],
        comments: [],
      });

      setMessage("✅ Driver registration submitted!");
      setSubmitting(false);

      setTimeout(() => router.push("/dashboard"), 1500);
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
    <div className="min-h-screen flex items-center justify-center bg-white p-4 pb-8">
      <div className="bg-gray-50 shadow-2xl rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800">
          Driver Registration
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <input
            type="text"
            placeholder="Valid ID Number"
            className="w-full px-4 py-3 border rounded-xl"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
          />

          <label className="w-24 h-24 rounded-xl overflow-hidden border-2 border-purple-600 flex items-center justify-center bg-gray-100 cursor-pointer">
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

          <div className="text-center mt-4">
            <Link href="/" className="text-blue-700 font-semibold">
              Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
