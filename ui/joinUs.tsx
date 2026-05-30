"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebaseConfig'; 
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { FaUser, FaEnvelope, FaPhone, FaFileAlt, FaCloudUploadAlt, FaBriefcase, FaCheckCircle, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function JoinTeamForm() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email')?.toString().toLowerCase().trim();

    try {
      // 1. Check for existing application
      const q = query(collection(db, "employment_applications"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast.error("You have already submitted an application with this email.");
        setLoading(false);
        return;
      }

      // 2. Handle File Upload (CV/ID)
      let documentPath = "";
      if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        const fileRef = ref(storage, `cvs/${fileName}`);
        const metadata = { contentType: file.type || 'application/pdf' };
        await uploadBytes(fileRef, file, metadata);
        documentPath = `cvs/${fileName}`;
      }

      // 3. Save to Firestore
      const applicationData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: email,
        phone: formData.get('phone'),
        coverLetter: formData.get('coverLetter') || "",
        documentPath: documentPath,
        status: 'pending',
        createdAt: serverTimestamp(),
        source: 'nomo_cars_web'
      };

      await addDoc(collection(db, "employment_applications"), applicationData);
      
      toast.success("Application submitted! We'll reach out soon.");
      (e.target as HTMLFormElement).reset();
      setFile(null);
      setShowSuccess(true);
      
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 md:px-4 py-8">
      <div className="w-full max-w-2xl bg-white shadow-2xl md:rounded-2xl border border-gray-100 overflow-hidden">
        
        {/* Header with Nomo Cars Theme */}
        <div className="bg-blue-700 p-4 md:p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 opacity-10">
             <FaBriefcase size={80} />
          </div>
          <span className="inline-block px-3 py-1 mb-3 text-[10px] font-bold tracking-widest uppercase bg-yellow-500 text-white rounded-full">
            Careers @ Nomo Cars
          </span>
          <h2 className="text-3xl font-extrabold italic">Join Our <span className="text-yellow-400">Team</span></h2>
          <p className="text-blue-100 mt-2 text-sm">Help us build Nigeria's safest transportation network.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 pb-8 md:p-6 md:p-10 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required name="firstName" placeholder="First Name" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
            </div>
            <div className="relative">
              <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required name="lastName" placeholder="Last Name" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
            </div>
          </div>

          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required name="email" type="email" placeholder="Email Address" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
          </div>

          <div className="relative">
            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required name="phone" type="tel" placeholder="Phone Number" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
          </div>

          <div className="relative">
            <div className="flex justify-between mb-1">
               <label className="text-[10px] font-bold text-gray-500 uppercase">Cover Letter</label>
            </div>
            <FaFileAlt className="absolute left-4 top-10 text-gray-400" />
            <textarea name="coverLetter" placeholder="Briefly describe your experience..." rows={3} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-600 transition-all text-sm resize-none" />
          </div>
          
          {/* Custom File Upload to match Nomo Theme */}
          <div className="relative group border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-blue-50/30 hover:border-blue-400 transition-all cursor-pointer">
            <input 
              required 
              type="file" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
            />
            <div className="flex flex-col items-center">
              <FaCloudUploadAlt className="text-blue-600 text-3xl mb-2" />
              <p className="text-xs font-bold text-gray-700">
                {file ? file.name : "Upload CV / Resume (PDF or Word)"}
              </p>
              {!file && <p className="text-[10px] text-gray-400 mt-1">Maximum size: 5MB</p>}
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full py-4 bg-blue-700 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-blue-800 shadow-lg hover:shadow-blue-200 disabled:bg-gray-400 transition-all active:scale-[0.98] text-sm"
          >
            {loading ? "Processing..." : "Submit Application"}
          </button>
        </form>
      </div>

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl relative animate-[scaleIn_0.3s_ease-out]">
            <button
              onClick={() => { setShowSuccess(false); router.push('/'); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
            >
              <FaTimes size={14} />
            </button>

            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <FaCheckCircle className="text-green-500 text-3xl" />
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Application Submitted!</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Thank you for your interest in joining Nomo Cars. We've received your application and will get back to you shortly.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <p className="text-blue-700 text-xs font-semibold">What happens next?</p>
              <p className="text-blue-600 text-[11px] mt-1">Our team will review your application and reach out via email or phone within 3–5 business days.</p>
            </div>

            <button
              onClick={() => { setShowSuccess(false); router.push('/'); }}
              className="w-full py-3 bg-blue-700 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-blue-800 transition-all text-sm"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}