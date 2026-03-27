"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FiSave, FiPlus, FiTrash2, FiUpload, FiBookOpen, FiTarget, FiEye, FiAlertTriangle, FiType, FiLink, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function AboutEditor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // Track unsaved changes
  const [urlInput, setUrlInput] = useState(""); // State for URL field
  
  // State for Delete Confirmation Modal
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "cms", "about_page"), (snap) => {
      if (snap.exists()) {
        setData(snap.data());
      } else {
        setData({
          heroImages: ["/about.jpg"],
          title: "About Our Car Platform",
          subtitle: "Redefining transportation...",
          introParagraphs: ["Welcome to Nigeria's premier car hub..."],
          visionText: "",
          missionText: "",
          whyChooseUs: [
            { title: "Safety", desc: "" },
            { title: "Pricing", desc: "" },
            { title: "Fleet", desc: "" }
          ],
          promise: "",
          ceoName: "Prince Ogbonnaya Nwachukwu",
          ceoQuote: "",
          ceoImage: "/ceo1.png"
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Helper to update data and trigger "unsaved" state
  const updateData = (newData: any) => {
    setData(newData);
    setHasChanges(true);
  };

  // --- PARAGRAPH METHODS ---
  const addParagraph = () => {
    updateData({ ...data, introParagraphs: [...data.introParagraphs, ""] });
    toast.success("New paragraph box added");
  };

  const confirmDelete = () => {
    if (deleteIdx !== null) {
      const newParas = data.introParagraphs.filter((_: any, i: number) => i !== deleteIdx);
      updateData({ ...data, introParagraphs: newParas });
      setDeleteIdx(null);
      toast.error("Paragraph removed");
    }
  };

  // --- IMAGE HELPERS ---
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, `about_page/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      toast.error("Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const addHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const url = await handleFileUpload(e.target.files[0]);
      if (url) updateData({ ...data, heroImages: [...data.heroImages, url] });
    }
  };

  const addHeroImageUrl = () => {
    if (urlInput.trim()) {
        updateData({...data, heroImages: [...data.heroImages, urlInput.trim()]});
        setUrlInput("");
        toast.success("Image URL added");
    }
  };

  const updateCeoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const url = await handleFileUpload(e.target.files[0]);
      if (url) updateData({ ...data, ceoImage: url });
    }
  };

  const save = async () => {
    await setDoc(doc(db, "cms", "about_page"), data);
    setHasChanges(false);
    toast.success("About Page Updated!");
  };

  const cancelChanges = () => {
      window.location.reload(); // Quick way to reset to Firestore state
  };

  if (loading) return <p className="p-10 text-center">Loading Content...</p>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 bg-gray-50 min-h-screen relative pb-32">
      
      {/* UNSAVED CHANGES NOTIFICATION BOX */}
      {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-2xl bg-emerald-900 text-white p-4 rounded md:rounded-xl shadow-2xl flex items-center justify-between border-2 border-emerald-400 animate-bounce-short">
              <div className="flex items-center gap-3">
                  <FiAlertTriangle className="text-yellow-400" size={24}/>
                  <div>
                    <p className="font-bold text-sm">Unsaved Changes detected!</p>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest">Your progress is not yet live.</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={cancelChanges} className="px-4 py-2 text-xs font-bold hover:bg-white/10 rounded-lg transition">Discard</button>
                  <button onClick={save} className="px-6 py-2 bg-white text-emerald-900 rounded-lg text-xs font-black shadow-lg">Save Now</button>
              </div>
          </div>
      )}

      {/* DELETE CONFIRMATION OVERLAY */}
      {deleteIdx !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded md:rounded-xl p-3 md:p-6 max-w-sm w-full shadow-2xl border flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <FiAlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Delete Paragraph?</h3>
            <p className="text-gray-500 mt-2">This action cannot be undone. Are you sure you want to remove this section?</p>
            <div className="flex gap-3 mt-6 w-full">
              <button onClick={() => setDeleteIdx(null)} className="flex-1 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex gap-2 flex-col md:flex-row justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md p-4 z-10 rounded-xl shadow-sm border">
        <h1 className="text-xl font-bold uppercase tracking-widest text-emerald-800">About Page CMS</h1>
        <button onClick={save} disabled={uploading} className={`px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition ${hasChanges ? 'bg-emerald-600 text-white hover:scale-105' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
          <FiSave /> {uploading ? "Processing..." : "Save Changes"}
        </button>
      </div>

      {/* PAGE TITLES & SUBTITLE */}
      <section className="bg-white p-3 md:p-6 rounded md:rounded-xl border shadow-sm space-y-4">
        <h2 className="font-bold text-gray-700 flex items-center gap-2 text-lg border-b pb-2"><FiType className="text-emerald-600"/> Page Header</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Title</label>
            <input 
              type="text"
              className="w-full p-3 border rounded-xl bg-gray-50 text-gray-800 font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={data.title}
              onChange={(e) => updateData({...data, title: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Header Subtitle</label>
            <input 
              type="text"
              className="w-full p-3 border rounded-xl bg-gray-50 text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={data.subtitle}
              onChange={(e) => updateData({...data, subtitle: e.target.value})}
            />
          </div>
        </div>
      </section>

      {/* HERO SLIDER IMAGES */}
      <section className="bg-white p-3 md:p-6 rounded md:rounded-xl border shadow-sm">
        <h2 className="font-bold mb-4 flex items-center gap-2 text-gray-700 underline decoration-emerald-500">Hero Images Slider</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {data.heroImages.map((img: string, i: number) => (
            <div key={i} className="relative group h-32 rounded-lg overflow-hidden border">
              <img src={img} className="w-full h-full object-cover" />
              <button 
                onClick={() => updateData({...data, heroImages: data.heroImages.filter((_: any, idx: number) => idx !== i)})}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <FiTrash2 size={14}/>
              </button>
            </div>
          ))}
          <label className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition h-32">
            <FiUpload className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-bold uppercase text-gray-500">Upload File</span>
            <input type="file" hidden onChange={addHeroImage} />
          </label>
        </div>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Paste image URL here..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-gray-50 outline-emerald-500"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                />
            </div>
            <button 
                onClick={addHeroImageUrl}
                className="bg-emerald-100 text-emerald-700 px-6 rounded-lg font-bold text-sm hover:bg-emerald-200 transition flex items-center gap-2"
            >
                <FiPlus/> Add URL
            </button>
        </div>
      </section>

      {/* MAIN CONTENT (DYNAMNIC PARAGRAPHS) */}
      <section className="bg-white p-3 md:p-6 rounded md:rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-2  justify-between items-center">
            <h2 className="font-bold text-gray-700 flex items-center gap-2 text-lg"><FiBookOpen className="text-emerald-600"/> Main About Content</h2>
            <button onClick={addParagraph} className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition">
                <FiPlus /> Add Paragraph
            </button>
        </div>
        <div className="grid gap-6">
          {data.introParagraphs.map((para: string, i: number) => (
            <div key={i} className="relative group">
              <div className="flex justify-between items-end mb-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paragraph {i + 1}</label>
                <button 
                  onClick={() => setDeleteIdx(i)}
                  className="text-red-400 hover:text-red-600 transition flex items-center gap-1 text-[10px] font-bold uppercase"
                >
                    <FiTrash2 /> Remove
                </button>
              </div>
              <textarea 
                className="w-full p-4 border rounded-xl bg-gray-50 text-gray-800 text-sm outline-emerald-500 shadow-inner min-h-[100px]"
                value={para}
                onChange={(e) => {
                  const newParas = [...data.introParagraphs];
                  newParas[i] = e.target.value;
                  updateData({...data, introParagraphs: newParas});
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* VISION & MISSION */}
      <section className="bg-white p-3 md:p-6 rounded md:rounded-xl border shadow-sm space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="font-bold text-gray-700 flex items-center gap-2"><FiEye className="text-blue-600"/> Our Vision</h2>
            <textarea 
              className="w-full p-3 border rounded-xl bg-gray-50 text-sm outline-blue-500"
              rows={4}
              value={data.visionText}
              onChange={(e) => updateData({...data, visionText: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-gray-700 flex items-center gap-2"><FiTarget className="text-orange-600"/> Our Mission</h2>
            <textarea 
              className="w-full p-3 border rounded-xl bg-gray-50 text-sm outline-orange-500"
              rows={4}
              value={data.missionText}
              onChange={(e) => updateData({...data, missionText: e.target.value})}
            />
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US & PROMISE/CEO */}
      <div className="grid md:grid-cols-2 gap-8 pb-20">
        <section className="bg-white p-3 md:p-6 rounded md:rounded-xl border shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">Why Choose Us?</h2>
          {data.whyChooseUs.map((item: any, i: number) => (
            <div key={i} className="p-3 border rounded-xl bg-gray-50 space-y-2">
              <input className="w-full font-bold bg-transparent border-b outline-none text-emerald-900" value={item.title} onChange={(e) => {
                   const newList = [...data.whyChooseUs];
                   newList[i].title = e.target.value;
                   updateData({...data, whyChooseUs: newList});
                }} />
              <textarea className="w-full text-sm bg-transparent outline-none text-gray-600" rows={2} value={item.desc} onChange={(e) => {
                   const newList = [...data.whyChooseUs];
                   newList[i].desc = e.target.value;
                   updateData({...data, whyChooseUs: newList});
                }} />
            </div>
          ))}
        </section>

        <div className="space-y-8">
            <section className="bg-white p-6 rounded md:rounded-xl border shadow-sm">
                <h2 className="font-bold text-gray-700 mb-2">Our Promise</h2>
                <textarea className="w-full p-3 border rounded-xl text-sm bg-gray-50" rows={4} value={data.promise} onChange={(e) => updateData({...data, promise: e.target.value})} />
            </section>

            <section className="bg-white p-3 md:p-6 rounded md:rounded-xl border shadow-sm space-y-4 border-emerald-100">
                <h2 className="font-bold text-gray-700 uppercase text-xs tracking-tighter italic">CEO Details (Files Only)</h2>
                <div className="flex gap-4 items-center">
                    <img src={data.ceoImage} className="w-20 h-24 object-cover rounded-lg border-2 border-emerald-500" />
                    <label className="flex-1 border-2 border-emerald-100 p-4 rounded-xl text-center cursor-pointer hover:bg-emerald-50 transition">
                        <FiUpload className="mx-auto mb-1 text-emerald-600"/>
                        <span className="text-xs font-bold uppercase">Update CEO</span>
                        <input type="file" hidden onChange={updateCeoImage} />
                    </label>
                </div>
                <input className="w-full p-2 border rounded-lg font-bold" value={data.ceoName} onChange={(e) => updateData({...data, ceoName: e.target.value})} />
                <textarea className="w-full p-2 border rounded-lg italic text-sm text-gray-600 bg-gray-50" rows={3} value={data.ceoQuote} onChange={(e) => updateData({...data, ceoQuote: e.target.value})} />
            </section>
        </div>
      </div>
    </div>
  );
}