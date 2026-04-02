"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  FiSave, FiPlus, FiTrash2, FiUpload, FiBookOpen, FiTarget,
  FiEye, FiAlertTriangle, FiType, FiLink, FiImage,
  FiUser, FiCompass, FiHeart, FiStar,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function AboutEditor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState("hero");

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

  const updateData = (newData: any) => {
    setData(newData);
    setHasChanges(true);
  };

  const addParagraph = () => {
    updateData({ ...data, introParagraphs: [...data.introParagraphs, ""] });
    toast.success("New paragraph added");
  };

  const confirmDelete = () => {
    if (deleteIdx !== null) {
      const newParas = data.introParagraphs.filter((_: any, i: number) => i !== deleteIdx);
      updateData({ ...data, introParagraphs: newParas });
      setDeleteIdx(null);
      toast.success("Paragraph removed");
    }
  };

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
      updateData({ ...data, heroImages: [...data.heroImages, urlInput.trim()] });
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
    toast.success("About Page Updated Successfully!");
  };

  const cancelChanges = () => {
    window.location.reload();
  };

  const sections = [
    { id: "hero", label: "Hero Section", icon: <FiImage /> },
    { id: "content", label: "Main Content", icon: <FiBookOpen /> },
    { id: "vision", label: "Vision & Mission", icon: <FiEye /> },
    { id: "features", label: "Why Choose Us", icon: <FiStar /> },
    { id: "ceo", label: "CEO Section", icon: <FiUser /> },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading Content...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Unsaved Changes Banner */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <FiAlertTriangle className="text-yellow-300 text-xl" />
                </div>
                <div>
                  <p className="font-bold text-sm">Unsaved Changes</p>
                  <p className="text-xs opacity-90">Your content is not yet published</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelChanges}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={save}
                  className="px-6 py-2 bg-white text-emerald-700 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <FiSave /> Publish Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <FiAlertTriangle className="text-red-600 text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Paragraph?</h3>
                <p className="text-gray-500">This action cannot be undone. Are you sure?</p>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setDeleteIdx(null)}
                    className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FiBookOpen className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">About Page <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">CMS</span></h1>
                <p className="text-xs text-gray-500 mt-0.5">Manage your company story</p>
              </div>
            </div>
            <button
              onClick={save}
              disabled={uploading}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${hasChanges
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-xl hover:scale-105'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              <FiSave /> {uploading ? "Processing..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-[73px] z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-1 md:py-0 px-3 md:px-6">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${activeSection === section.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto md:px-6 py-10">
        <div className="space-y-8">
          {/* Hero Section */}
          {activeSection === "hero" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Page Titles */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 md:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FiType className="text-white text-xl" />
                    <h2 className="font-bold text-white text-lg">Page Header</h2>
                  </div>
                </div>
                <div className="p-3 md:p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Main Title</label>
                      <input
                        type="text"
                        className="w-full p-4 border-2 border-gray-200 rounded-md md:rounded-xl bg-gray-50 text-gray-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                        value={data.title}
                        onChange={(e) => updateData({ ...data, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Header Subtitle</label>
                      <input
                        type="text"
                        className="w-full p-4 border-2 border-gray-200 rounded-md md:rounded-xl bg-gray-50 text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                        value={data.subtitle}
                        onChange={(e) => updateData({ ...data, subtitle: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero Images Slider */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 md:px-6">
                  <div className="flex items-center gap-2">
                    <FiImage className="text-white text-xl" />
                    <h2 className="font-bold text-white text-lg">Hero Images Slider</h2>
                  </div>
                </div>
                <div className="p-2 md:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
                    {data.heroImages.map((img: string, i: number) => (
                      <div key={i} className="relative group h-40 rounded md:rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
                        <img src={img} className="w-full h-full object-cover" />
                        <button
                          onClick={() => updateData({ ...data, heroImages: data.heroImages.filter((_: any, idx: number) => idx !== i) })}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full md:opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all h-40 group">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-all">
                        <FiUpload className="text-emerald-500 text-xl" />
                      </div>
                      <span className="text-[10px] font-bold uppercase text-gray-500 mt-2">Upload Image</span>
                      <input type="file" hidden onChange={addHeroImage} accept="image/*" />
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <FiLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Paste image URL here..."
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={addHeroImageUrl}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <FiPlus /> Add URL
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Main Content Section */}
          {activeSection === "content" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 md:px-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <FiBookOpen className="text-white text-xl" />
                    <h2 className="font-bold text-white text-lg">Main About Content</h2>
                  </div>
                  <button
                    onClick={addParagraph}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-bold text-sm transition-all"
                  >
                    <FiPlus /> Add Paragraph
                  </button>
                </div>
              </div>
              <div className="px-1 py-3 md:p-6 space-y-6">
                {data.introParagraphs.map((para: string, i: number) => (
                  <div key={i} className="group relative bg-gray-50 rounded-xl px-2 py-5 md:px-5 border border-gray-200 hover:border-purple-200 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Paragraph {i + 1}</span>
                      <button
                        onClick={() => setDeleteIdx(i)}
                        className="text-red-400 hover:text-red-600 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
                      >
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                    <textarea
                      className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-800 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400 outline-none transition h-[180px]"
                      value={para}
                      onChange={(e) => {
                        const newParas = [...data.introParagraphs];
                        newParas[i] = e.target.value;
                        updateData({ ...data, introParagraphs: newParas });
                      }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Vision & Mission Section */}
          {activeSection === "vision" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 md:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FiEye className="text-white text-xl" />
                    <h2 className="font-bold text-white text-lg">Our Vision</h2>
                  </div>
                </div>
                <div className="p-1 md:p-6">
                  <textarea
                    className="w-full py-5 px-3 md:px-5 border-2 border-gray-200 rounded md:rounded-xl bg-gray-50 text-gray-700 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 outline-none transition min-h-[200px]"
                    rows={6}
                    value={data.visionText}
                    onChange={(e) => updateData({ ...data, visionText: e.target.value })}
                    placeholder="Enter your company vision..."
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-3 md:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FiTarget className="text-white text-xl" />
                    <h2 className="font-bold text-white text-lg">Our Mission</h2>
                  </div>
                </div>
                <div className="p-1 md:p-6">
                  <textarea
                    className="w-full py-5 px-3 md:px-5 border-2 border-gray-200 rounded md:rounded-xl bg-gray-50 text-gray-700 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-400 outline-none transition min-h-[200px]"
                    rows={6}
                    value={data.missionText}
                    onChange={(e) => updateData({ ...data, missionText: e.target.value })}
                    placeholder="Enter your company mission..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Why Choose Us & Promise */}
          {activeSection === "features" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 md:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FiStar className="text-white text-xl" />
                    <h2 className="font-bold text-white text-lg">Why Choose Us?</h2>
                  </div>
                </div>
                <div className="p-1 md:p-6 space-y-4">
                  {data.whyChooseUs.map((item: any, i: number) => (
                    <div key={i} className="p-2 md:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-md md:rounded-xl border border-amber-200 space-y-3">
                      <input
                        className="w-full font-bold bg-transparent border-b-2 border-amber-300 outline-none text-amber-900 text-lg p-2"
                        value={item.title}
                        onChange={(e) => {
                          const newList = [...data.whyChooseUs];
                          newList[i].title = e.target.value;
                          updateData({ ...data, whyChooseUs: newList });
                        }}
                        placeholder="Feature title"
                      />
                      <textarea
                        className="w-full text-sm bg-transparent outline-none text-gray-600 p-2 min-h-[100px]"
                        rows={2}
                        value={item.desc}
                        onChange={(e) => {
                          const newList = [...data.whyChooseUs];
                          newList[i].desc = e.target.value;
                          updateData({ ...data, whyChooseUs: newList });
                        }}
                        placeholder="Describe this feature..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 md:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FiHeart className="text-white text-xl" />
                      <h2 className="font-bold text-white text-lg">Our Promise</h2>
                    </div>
                  </div>
                  <div className="p-1 md:p-6">
                    <textarea
                      className="w-full py-5 px-2 md:px-5 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-400 outline-none transition min-h-[180px]"
                      rows={5}
                      value={data.promise}
                      onChange={(e) => updateData({ ...data, promise: e.target.value })}
                      placeholder="Enter your company promise..."
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* CEO Section */}
          {activeSection === "ceo" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-4 md:px-6 py-4">
                <div className="flex items-center gap-2">
                  <FiUser className="text-white text-xl" />
                  <h2 className="font-bold text-white text-lg">CEO & Leadership</h2>
                </div>
              </div>
              <div className="p-4 md:p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                  <div className="relative group">
                    <img
                      src={data.ceoImage}
                      className="w-32 h-32 rounded-2xl object-cover border-4 border-emerald-500 shadow-lg"
                      alt="CEO"
                    />
                    <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <FiUpload className="text-white text-2xl" />
                      <input type="file" hidden onChange={updateCeoImage} accept="image/*" />
                    </label>
                  </div>
                  <div className="w-full md:flex-1 space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">CEO Name</label>
                      <input
                        className="w-full p-4 border-2 border-gray-200 rounded-xl font-bold text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        value={data.ceoName}
                        onChange={(e) => updateData({ ...data, ceoName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">CEO Quote / Message</label>
                      <div className="relative">
                        <FiCompass className="absolute left-4 top-4 text-emerald-400 text-xl" />
                        <textarea
                          className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl italic text-gray-600 bg-gray-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none transition min-h-[120px]"
                          rows={3}
                          value={data.ceoQuote}
                          onChange={(e) => updateData({ ...data, ceoQuote: e.target.value })}
                          placeholder="Share a message from the CEO..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}