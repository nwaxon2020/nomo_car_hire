"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import {
  FaSave, FaImage, FaUpload, FaEdit, FaPlus, FaTrash,
  FaChevronDown, FaShieldAlt, FaCar,
  FaWallet, FaClock, FaStar, FaUsers, FaUserCheck, FaCrown, FaGem, FaCheckCircle, FaUserShield
} from "react-icons/fa";
import LoadingRound from "@/components/re-useable-loading";

// --- Icon Configuration ---
const ICON_OPTIONS = [
  { name: "FaUserCheck", icon: <FaUserCheck /> },
  { name: "FaCar", icon: <FaCar /> },
  { name: "FaWallet", icon: <FaWallet /> },
  { name: "FaShieldAlt", icon: <FaShieldAlt /> },
  { name: "FaClock", icon: <FaClock /> },
  { name: "FaStar", icon: <FaStar /> },
  { name: "FaUsers", icon: <FaUsers /> },
  { name: "FaCrown", icon: <FaCrown /> },
  { name: "FaGem", icon: <FaGem /> },
  { name: "FaUserShield", icon: <FaUserShield /> },
  { name: "FaCheckCircle", icon: <FaCheckCircle /> },
];

// --- Types ---
interface HeroSection {
  badgeText: string; title: string; subtitle: string; description: string;
  primaryButtonText: string; secondaryButtonText: string; searchPlaceholder: string;
  backgroundImage?: string;
}
interface HowItWorksStep { id: string; title: string; description: string; icon: string; buttonText: string; buttonLink: string; }
interface HowItWorksSection { title: string; subtitle: string; steps: HowItWorksStep[]; }
interface Feature { id: string; title: string; description: string; icon: string; }
interface FeaturesSection { title: string; subtitle: string; features: Feature[]; }
interface Benefit { id: string; title: string; description: string; }
interface PartnerStat { id: string; value: string; label: string; }
interface DriverPartnerSection {
  badgeText: string; title: string; subtitle: string; description: string;
  primaryButtonText: string; benefits: Benefit[]; stats: PartnerStat[]; backgroundImage?: string;
  sectionIcon?: string;
}
interface SafetyFeature { id: string; title: string; description: string; icon: string; }
interface PassengerSafetySection { title: string; subtitle: string; description: string; buttonText: string; features: SafetyFeature[]; backgroundImage?: string; }
interface CTAStat { id: string; icon: string; text: string; }
interface CTASection {
  title: string; description: string; primaryButtonText: string; secondaryButtonText: string;
  secondaryButtonLink: string; stats: CTAStat[]; backgroundImage?: string;
}

interface FullPageContent {
  hero: HeroSection; howItWorks: HowItWorksSection; features: FeaturesSection;
  partner: DriverPartnerSection; safety: PassengerSafetySection; cta: CTASection;
}

const defaultContent: FullPageContent = {
  hero: {
    badgeText: "Nigeria's #1 Car Hire Platform", title: "Hire Professional", subtitle: "Drivers Instantly",
    description: "Connect with verified drivers, book rides safely, and travel with confidence.",
    primaryButtonText: "Get Started Free", secondaryButtonText: "Book a Ride", searchPlaceholder: "Enter location...",
    backgroundImage: ""
  },
  howItWorks: { title: "How Nomo Cars Works", subtitle: "Simple steps", steps: [] },
  features: { title: "Why Choose Us?", subtitle: "Best experience", features: [] },
  partner: {
    badgeText: "Partner", title: "Drive with Us", subtitle: "", description: "", primaryButtonText: "Register", benefits: [], sectionIcon: "FaCheckCircle", stats: [
      { id: "stat-1", value: "₦25k+", label: "Weekly Potential" }, { id: "stat-2", value: "95%", label: "Driver Satisfaction" },
      { id: "stat-3", value: "24/7", label: "Support" }, { id: "stat-4", value: "₦0", label: "Signup Fee" },]
  },
  safety: { title: "Safety First", subtitle: "Our Commitment", description: "", buttonText: "Read More", features: [] },
  cta: { title: "Join Nomo", description: "", primaryButtonText: "Start", secondaryButtonText: "Contact", secondaryButtonLink: "/", stats: [] }
};

export default function HomePageEditor() {
  const [content, setContent] = useState<FullPageContent | null>(null);
  const [originalContent, setOriginalContent] = useState<FullPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "cms", "homePage"), (docSnap) => {
      const dbData = docSnap.exists() ? docSnap.data() as FullPageContent : {} as FullPageContent;
      const mergedData = {
        hero: { ...defaultContent.hero, ...dbData.hero },
        howItWorks: { ...defaultContent.howItWorks, ...dbData.howItWorks },
        features: { ...defaultContent.features, ...dbData.features },
        partner: { ...defaultContent.partner, ...dbData.partner },
        safety: { ...defaultContent.safety, ...dbData.safety },
        cta: { ...defaultContent.cta, ...dbData.cta },
      };
      setContent(mergedData);
      setOriginalContent(mergedData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (content && originalContent) {
      const newDirtyMap: Record<string, boolean> = {};
      (Object.keys(content) as Array<keyof FullPageContent>).forEach((key) => {
        newDirtyMap[key] = JSON.stringify(content[key]) !== JSON.stringify(originalContent[key]);
      });
      setDirtySections(newDirtyMap);
    }
  }, [content, originalContent]);

  const handleUndo = (section: keyof FullPageContent) => {
    if (originalContent && content) {
      setContent({ ...content, [section]: originalContent[section] });
      toast.success(`${section} changes discarded`, { icon: '🔄' });
    }
  };

  const handleSave = async (section: keyof FullPageContent, sectionData: any, file: File | null = null) => {
    const toastId = toast.loading(`Updating ${section}...`);
    setSaving(section);
    try {
      let finalData = { ...sectionData };
      if (file) {
        const storageRef = ref(storage, `cms/home/${section}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        finalData.backgroundImage = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "cms", "homePage"), { [section]: finalData }, { merge: true });
      toast.success(`${section} updated successfully!`, { id: toastId });
    } catch (error) {
      toast.error(`Error saving ${section}`, { id: toastId });
    } finally {
      setSaving(null);
    }
  };

  if (loading || !content) return <div className="flex justify-center items-center h-screen bg-slate-50"><LoadingRound /></div>;

  return (
    <div className="mt-40 min-h-screen bg-[#F8FAFC]">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-8 py-5">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <h2 className="text-lg font-bold text-blue-600">Home Page Configuration</h2>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className={`w-2 h-2 rounded-full animate-pulse ${Object.values(dirtySections).includes(true) ? 'bg-red-500' : 'bg-green-500'}`}></span>
            {Object.values(dirtySections).includes(true) ? 'Unsaved Changes' : 'CMS Active'}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 md:p-8 space-y-6 pb-20">
        <EditorSection title="Hero Section" icon={<FaEdit />} data={content.hero} isDirty={dirtySections.hero} saving={saving === "hero"} onUndo={() => handleUndo("hero")} onSave={(d: any, f: any) => handleSave("hero", d, f)} hasImage update={(v: any) => setContent({ ...content, hero: v })}>
          {(d: any, u: any) => <HeroForm data={d} update={u} />}
        </EditorSection>

        <EditorSection title="How It Works" icon={<FaPlus />} data={content.howItWorks} isDirty={dirtySections.howItWorks} saving={saving === "howItWorks"} onUndo={() => handleUndo("howItWorks")} onSave={(d: any) => handleSave("howItWorks", d)} update={(v: any) => setContent({ ...content, howItWorks: v })}>
          {(d: any, u: any) => <HowItWorksForm data={d} update={u} />}
        </EditorSection>

        <EditorSection title="Features List" icon={<FaStar />} data={content.features} isDirty={dirtySections.features} saving={saving === "features"} onUndo={() => handleUndo("features")} onSave={(d: any) => handleSave("features", d)} update={(v: any) => setContent({ ...content, features: v })}>
          {(d: any, u: any) => <FeaturesForm data={d} update={u} />}
        </EditorSection>

        <EditorSection title="Driver Partner" icon={<FaCar />} data={content.partner} isDirty={dirtySections.partner} saving={saving === "partner"} onUndo={() => handleUndo("partner")} onSave={(d: any, f: any) => handleSave("partner", d, f)} hasImage update={(v: any) => setContent({ ...content, partner: v })}>
          {(d: any, u: any) => <DriverForm data={d} update={u} />}
        </EditorSection>

        <EditorSection title="Safety Information" icon={<FaShieldAlt />} data={content.safety} isDirty={dirtySections.safety} saving={saving === "safety"} onUndo={() => handleUndo("safety")} onSave={(d: any) => handleSave("safety", d)} update={(v: any) => setContent({ ...content, safety: v })}>
          {(d: any, u: any) => <SafetyForm data={d} update={u} />}
        </EditorSection>

        <EditorSection title="Final CTA" icon={<FaUsers />} data={content.cta} isDirty={dirtySections.cta} saving={saving === "cta"} onUndo={() => handleUndo("cta")} onSave={(d: any) => handleSave("cta", d)} update={(v: any) => setContent({ ...content, cta: v })}>
          {(d: any, u: any) => <CTAForm data={d} update={u} />}
        </EditorSection>
      </main>
    </div>
  );
}

// --- Shared Components ---

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const currentIcon = ICON_OPTIONS.find(i => i.name === value)?.icon;

  return (
    <div className="relative w-full">
      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Icon Selection</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-sm hover:bg-white transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-600 text-lg">{currentIcon || <FaPlus size={10} />}</span>
          <span className="text-slate-700 font-medium">{value || "Choose Icon"}</span>
        </div>
        <FaChevronDown size={10} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95">
          <div className="grid grid-cols-4 gap-3">
            {ICON_OPTIONS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => { onChange(item.name); setOpen(false); }}
                className={`aspect-square flex items-center justify-center rounded-xl transition-all text-xl ${value === item.name
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                  }`}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditorSection({ title, icon, data, isDirty, saving, onSave, onUndo, hasImage, update, children }: any) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // KEY FIX: The button is enabled if the text is dirty OR a new file is selected
  const canSave = isDirty || file !== null;

  return (
    <div className={`bg-white md:rounded-lg border transition-all duration-300 ${canSave ? 'border-red-400 bg-red-50/20' : open ? 'border-blue-200 shadow-xl' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}>
      <div onClick={() => setOpen(!open)} className="flex justify-between items-center p-5 cursor-pointer select-none">
        <div className="flex items-center gap-4">
          {/* Visual indicator turns red if a file is waiting to be uploaded */}
          <div className={`p-2.5 rounded-xl transition-colors ${canSave ? 'bg-red-600 text-white' : open ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{icon}</div>
          <div className="flex flex-col">
            <span className={`font-bold tracking-tight ${canSave ? 'text-red-700' : 'text-slate-700'}`}>{title}</span>
            {canSave && <span className="text-[9px] font-black uppercase text-red-500 animate-pulse">Pending Changes</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Undo only clears text; we add logic to clear file too if needed */}
          {canSave && <button onClick={(e) => { e.stopPropagation(); onUndo(); setFile(null); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><FaClock size={12} /></button>}
          <div className={`transition-transform duration-300 p-2 rounded-full ${open ? 'rotate-180 bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}><FaChevronDown size={14} /></div>
        </div>
      </div>

      {open && (
        <div className="p-3 md:p-6 pt-0 border-t border-slate-50 animate-in fade-in slide-in-from-top-2">
          <div className={`mt-6 ${hasImage ? 'grid grid-cols-1 lg:grid-cols-3 gap-8' : ''}`}>
            <div className={hasImage ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>{children(data, update)}</div>
            {hasImage && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Background Media</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-white flex items-center justify-center">
                  {(data.backgroundImage || file) ? (
                    <img src={file ? URL.createObjectURL(file) : data.backgroundImage} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <FaImage className="text-slate-200 text-3xl" />
                  )}
                  <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <FaUpload className="text-white text-xl" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        setFile(selectedFile);
                      }}
                    />
                  </label>
                </div>
                <div className="mt-4">
                  <Input label="Image URL" value={data.backgroundImage || ""} onChange={(v: string) => update({ ...data, backgroundImage: v })} />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
            <button onClick={() => { setOpen(false); setFile(null); }} className="px-5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Close</button>
            <button
              onClick={async () => {
                await onSave(data, file);
                setFile(null); // Clear local file state after successful upload
              }}
              disabled={saving || !canSave}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition-all ${canSave ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {saving ? <LoadingRound /> : <><FaSave size={14} /> Update Section</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Specific Forms ---
function HeroForm({ data, update }: any) {
  return (
    <div className="space-y-4">
      <Input label="Badge" value={data.badgeText} onChange={(v: string) => update({ ...data, badgeText: v })} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Title Prefix" value={data.title} onChange={(v: string) => update({ ...data, title: v })} />
        <Input label="Title Highlight" value={data.subtitle} onChange={(v: string) => update({ ...data, subtitle: v })} />
      </div>
      <TextArea label="Description" value={data.description} onChange={(v: string) => update({ ...data, description: v })} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Primary CTA" value={data.primaryButtonText} onChange={(v: string) => update({ ...data, primaryButtonText: v })} />
        <Input label="Secondary CTA" value={data.secondaryButtonText} onChange={(v: string) => update({ ...data, secondaryButtonText: v })} />
      </div>
      <Input label="Search Placeholder" value={data.searchPlaceholder} onChange={(v: string) => update({ ...data, searchPlaceholder: v })} />
    </div>
  );
}

function HowItWorksForm({ data, update }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Section Title" value={data.title} onChange={(v: string) => update({ ...data, title: v })} />
        <Input label="Section Subtitle" value={data.subtitle} onChange={(v: string) => update({ ...data, subtitle: v })} />
      </div>
      <List
        items={data.steps || []}
        onUpdate={(it: any) => update({ ...data, steps: it })}
        title="Workflow Steps"
        newItem={() => ({
          id: Date.now().toString(),
          title: "New Step",
          description: "",
          icon: "FaCar",
          buttonText: "Click Here", // Default button name
          buttonLink: "/"
        })}
      >
        {(item: any, updateItem: any) => (
          <div className="space-y-3">
            <IconSelect value={item.icon} onChange={(v) => updateItem({ ...item, icon: v })} />
            <Input label="Step Title" value={item.title} onChange={(v: string) => updateItem({ ...item, title: v })} />
            <TextArea label="Detail" value={item.description} onChange={(v: string) => updateItem({ ...item, description: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Button Name" value={item.buttonText} onChange={(v: string) => updateItem({ ...item, buttonText: v })} />
              <Input label="Button Link" value={item.buttonLink} onChange={(v: string) => updateItem({ ...item, buttonLink: v })} />
            </div>
          </div>
        )}
      </List>
    </div>
  );
}

function FeaturesForm({ data, update }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Section Title" value={data.title} onChange={(v: string) => update({ ...data, title: v })} />
        <Input label="Section Subtitle" value={data.subtitle} onChange={(v: string) => update({ ...data, subtitle: v })} />
      </div>
      <List items={data.features || []} onUpdate={(it: any) => update({ ...data, features: it })} title="Features" columns={2} newItem={() => ({ id: Date.now().toString(), title: "Feature", description: "", icon: "FaShieldAlt" })}>
        {(item: any, updateItem: any) => (
          <div className="space-y-3">
            <IconSelect value={item.icon} onChange={(v) => updateItem({ ...item, icon: v })} />
            <Input label="Title" value={item.title} onChange={(v: string) => updateItem({ ...item, title: v })} />
            <TextArea label="Description" value={item.description} onChange={(v: string) => updateItem({ ...item, description: v })} />
          </div>
        )}
      </List>
    </div>
  );
}

function DriverForm({ data, update }: any) {
  // Helper to update a specific stat by index
  const updateStat = (index: number, field: 'value' | 'label', val: string) => {
    const newStats = [...(data.stats || [])];
    if (!newStats[index]) {
      newStats[index] = { id: Date.now().toString() + index, value: "", label: "" };
    }
    newStats[index] = { ...newStats[index], [field]: val };
    update({ ...data, stats: newStats });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input label="Headline" value={data.title} onChange={(v: string) => update({ ...data, title: v })} />
        <TextArea label="Description" value={data.description} onChange={(v: string) => update({ ...data, description: v })} />
      </div>

      {/* --- NEW STATS SECTION --- */}
      <div className="pt-6 border-t border-slate-100">
        <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 ml-1">Performance Stats (4 Cards)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400">STAT CARD {idx + 1}</span>
              </div>
              <Input
                label="Value (e.g. ₦25k+)"
                value={data.stats?.[idx]?.value || ""}
                onChange={(v: string) => updateStat(idx, 'value', v)}
              />
              <Input
                label="Label (e.g. Weekly Potential / Percent / Time / Fees)"
                value={data.stats?.[idx]?.label || ""}
                onChange={(v: string) => updateStat(idx, 'label', v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100">
        <div className="mb-4">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">General Benefits Icon</label>
          <IconSelect value={data.sectionIcon || "FaCheckCircle"} onChange={(v) => update({ ...data, sectionIcon: v })} />
        </div>

        <List
          items={data.benefits || []}
          onUpdate={(it: any) => update({ ...data, benefits: it })}
          title="Benefits List"
          newItem={() => ({ id: Date.now().toString(), title: "New Benefit", description: "" })}
        >
          {(item: any, updateItem: any) => (
            <div className="space-y-3">
              <Input label="Benefit Info" value={item.title} onChange={(v: string) => updateItem({ ...item, title: v })} />
              <TextArea label="Benefit Description" value={item.description} onChange={(v: string) => updateItem({ ...item, description: v })} />
            </div>
          )}
        </List>
      </div>
    </div>
  );
}

function SafetyForm({ data, update }: any) {
  return (
    <div className="space-y-4">
      <Input label="Safety Title" value={data.title} onChange={(v: string) => update({ ...data, title: v })} />
      <TextArea label="Description" value={data.description} onChange={(v: string) => update({ ...data, description: v })} />
      <List items={data.features || []} onUpdate={(it: any) => update({ ...data, features: it })} title="Safety Features" newItem={() => ({ id: Date.now().toString(), title: "Protocol", icon: "FaShieldAlt", description: "" })}>
        {(item: any, updateItem: any) => (
          <div className="space-y-3">
            <IconSelect value={item.icon} onChange={(v) => updateItem({ ...item, icon: v })} />
            <Input label="Name" value={item.title} onChange={(v: string) => updateItem({ ...item, title: v })} />
            <TextArea label="Feature Description" value={item.description} onChange={(v: string) => updateItem({ ...item, description: v })} />
          </div>
        )}
      </List>
    </div>
  );
}

function CTAForm({ data, update }: any) {
  return (
    <div className="space-y-4">
      <Input label="CTA Title" value={data.title} onChange={(v: string) => update({ ...data, title: v })} />
      <TextArea label="Description" value={data.description} onChange={(v: string) => update({ ...data, description: v })} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Primary Button Text" value={data.primaryButtonText} onChange={(v: string) => update({ ...data, primaryButtonText: v })} />
        <Input label="Secondary Button Text" value={data.secondaryButtonText} onChange={(v: string) => update({ ...data, secondaryButtonText: v })} />
      </div>
    </div>
  );
}

// --- Base Components ---
function Input({ label, value, onChange }: any) {
  return (
    <div className="w-full">
      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-1">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" />
    </div>
  );
}

function TextArea({ label, value, onChange }: any) {
  return (
    <div className="w-full">
      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-1">{label}</label>
      <textarea rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all resize-none" />
    </div>
  );
}

function List({ items, onUpdate, children, title, columns = 1, newItem }: any) {
  const updateItem = (idx: number, newData: any) => {
    const updated = [...items]; updated[idx] = newData; onUpdate(updated);
  };
  return (
    <div className="space-y-4 pt-4 border-t border-slate-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-black text-slate-800 uppercase">{title}</span>
        <button onClick={() => onUpdate([...items, newItem()])} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200">+ Add</button>
      </div>
      <div className={`grid ${columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {items.map((item: any, idx: number) => (
          <div key={item.id} className="relative bg-white border border-slate-200 p-5 rounded-2xl shadow-sm group">
            <button onClick={() => onUpdate(items.filter((_: any, i: number) => i !== idx))} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"><FaTrash size={12} /></button>
            <div className="pt-2">{children(item, (ni: any) => updateItem(idx, ni))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}