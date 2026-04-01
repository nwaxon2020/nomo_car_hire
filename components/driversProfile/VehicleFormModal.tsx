// components/driver/VehicleFormModal.tsx
import React, { useState, useEffect } from 'react';
import { VehicleImageUpload } from './VehicleImageUpload';
import { toast } from 'react-hot-toast';
import { X, Car, Image as ImageIcon, FileText, ChevronRight, ChevronLeft, Lock, ChevronDown } from 'lucide-react';

interface VehicleFormData {
    carName: string;
    carModel: string;
    carType: string;
    passengers: string; // Changed to string to support "20+", "30+", etc.
    ac: boolean;
    plateNumber: string;
    exteriorColor: string;
    interiorColor: string;
    description: string;
    status: 'available' | 'unavailable' | 'maintenance';
}

interface VehicleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, files: any) => Promise<void>;
    editingVehicle?: any;
    isLoading?: boolean;
    canAddVehicle?: boolean;
    vehicleLimitMessage?: string;
    onUpgradeVIP?: () => void;
}

type TabType = 'details' | 'photos' | 'documents';

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    editingVehicle,
    isLoading = false,
    canAddVehicle = true,
    vehicleLimitMessage = '',
    onUpgradeVIP
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('details');
    const [formData, setFormData] = useState<VehicleFormData>({
        carName: '', carModel: '', carType: 'sedan', passengers: '4',
        ac: true, plateNumber: '', exteriorColor: '', interiorColor: '',
        description: '', status: 'available'
    });

    const [files, setFiles] = useState<Record<string, File | null>>({
        front: null, side: null, back: null, interior: null,
        license: null, ownership: null, insurance: null
    });

    const [previews, setPreviews] = useState<Record<string, string>>({});

    useEffect(() => {
        if (editingVehicle) {
            setFormData({
                carName: editingVehicle.carName || '',
                carModel: editingVehicle.carModel || '',
                carType: editingVehicle.carType || 'sedan',
                passengers: String(editingVehicle.passengers || '4'),
                ac: editingVehicle.ac ?? true,
                plateNumber: editingVehicle.plateNumber || '',
                exteriorColor: editingVehicle.exteriorColor || '',
                interiorColor: editingVehicle.interiorColor || '',
                description: editingVehicle.description || '',
                status: editingVehicle.status || 'available'
            });
            setPreviews(editingVehicle.images || {});
        } else {
            resetForm();
        }
    }, [editingVehicle, isOpen]);

    const resetForm = () => {
        setFormData({
            carName: '', carModel: '', carType: 'sedan', passengers: '4',
            ac: true, plateNumber: '', exteriorColor: '', interiorColor: '',
            description: '', status: 'available'
        });
        setFiles({
            front: null, side: null, back: null, interior: null,
            license: null, ownership: null, insurance: null
        });
        setPreviews({});
        setActiveTab('details');
    };

    const handleFileChange = (type: string, file: File | null) => {
        setFiles(prev => ({ ...prev, [type]: file }));
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const isStepValid = (step: TabType) => {
        if (step === 'details') {
            return formData.carName.trim() !== '' && formData.plateNumber.trim() !== '';
        }
        if (step === 'photos') {
            const required = ['front', 'side', 'back', 'interior'];
            return required.every(p => files[p] || previews[p]);
        }
        return true;
    };

    const handleNext = () => {
        if (!isStepValid(activeTab)) {
            toast.error("Please fill all required fields in this section.");
            return;
        }
        if (activeTab === 'details') setActiveTab('photos');
        else if (activeTab === 'photos') setActiveTab('documents');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const requiredDocs = ['license', 'ownership', 'insurance'];
        const docsValid = editingVehicle || requiredDocs.every(d => files[d] || previews[d]);

        if (!docsValid) {
            toast.error("Please upload all required documents");
            return;
        }

        const submissionData = {
            ...formData,
            plateNumber: formData.plateNumber.trim().toUpperCase(),
            isApproved: editingVehicle ? editingVehicle.isApproved : false,
            createdAt: editingVehicle ? editingVehicle.createdAt : new Date().toISOString()
        };

        await onSubmit(submissionData, files);
    };

    if (!isOpen) return null;

    return (
        <div className="h-[100vh] fixed inset-0 z-60 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">

                <div className="px-4 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex px-4 py-2 gap-4 bg-gray-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'details', label: 'Info', icon: <Car size={16} /> },
                        { id: 'photos', label: 'Photos', icon: <ImageIcon size={16} /> },
                        { id: 'documents', label: 'Docs', icon: <FileText size={16} /> }
                    ].map((tab) => (
                        <div
                            key={tab.id}
                            className={`flex items-center gap-2 pb-1 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!canAddVehicle && !editingVehicle && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Lock size={16} className="text-amber-600" />
                                <p className="text-[10px] sm:text-xs text-amber-700 font-medium">{vehicleLimitMessage || "Limit reached. Upgrade to add more."}</p>
                            </div>
                            {onUpgradeVIP && (
                                <button onClick={onUpgradeVIP} className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-md shadow-sm">
                                    Upgrade
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <InputField label="Car Brand/Name *" value={formData.carName} onChange={(v) => setFormData({ ...formData, carName: v })} placeholder="Toyota Camry" />
                            <InputField label="Model/Year" value={formData.carModel} onChange={(v) => setFormData({ ...formData, carModel: v })} placeholder="2022" />
                            <InputField label="Plate Number *" value={formData.plateNumber} onChange={(v) => setFormData({ ...formData, plateNumber: v })} placeholder="ABC-123-XY" />

                            <SelectField label="Body Type" value={formData.carType} onChange={(v) => setFormData({ ...formData, carType: v })}>
                                <option value="sedan">Sedan</option>
                                <option value="suv">SUV</option>
                                <option value="truck">Truck</option>
                                <option value="van">Van/Bus</option>
                                <option value="keke">Keke</option>
                            </SelectField>

                            <SelectField
                                label="Current Status"
                                value={formData.status}
                                onChange={(v) => setFormData({ ...formData, status: v as any })}
                            >
                                <option value="available" className="text-emerald-600 font-bold">🟢 Available</option>
                                <option value="unavailable" className="text-red-600 font-bold">🔴 Unavailable</option>
                                <option value="maintenance" className="text-gray-500 font-bold">🔘 Under Maintenance</option>
                            </SelectField>

                            <InputField label="Exterior Color" value={formData.exteriorColor} onChange={(v) => setFormData({ ...formData, exteriorColor: v })} placeholder="Silver" />
                            <InputField label="Interior Color" value={formData.interiorColor} onChange={(v) => setFormData({ ...formData, interiorColor: v })} placeholder="Black" />

                            <SelectField label="Seats" value={formData.passengers} onChange={(v) => setFormData({ ...formData, passengers: v })}>
                                {["2", "3", "4", "6", "8", "12", "14", "16", "18", "20+", "30+"].map(n => <option key={n} value={n}>{n} Seats</option>)}
                            </SelectField>

                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    rows={2}
                                    placeholder="Notable features..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <input
                                    type="checkbox"
                                    id="ac"
                                    checked={formData.ac}
                                    onChange={e => setFormData({ ...formData, ac: e.target.checked })}
                                    className="w-4 h-4 rounded border-blue-300 text-blue-600"
                                />
                                <label htmlFor="ac" className="text-xs font-semibold text-blue-800">Has Working AC</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'photos' && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                            <VehicleImageUpload label="Front View *" type="front" onFileChange={handleFileChange} preview={previews.front} />
                            <VehicleImageUpload label="Side View *" type="side" onFileChange={handleFileChange} preview={previews.side} />
                            <VehicleImageUpload label="Rear View *" type="back" onFileChange={handleFileChange} preview={previews.back} />
                            <VehicleImageUpload label="Interior *" type="interior" onFileChange={handleFileChange} preview={previews.interior} />
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <VehicleImageUpload label="License *" type="license" onFileChange={handleFileChange} preview={previews.license} />
                                <VehicleImageUpload label="Ownership *" type="ownership" onFileChange={handleFileChange} preview={previews.ownership} />
                                <VehicleImageUpload label="Insurance *" type="insurance" onFileChange={handleFileChange} preview={previews.insurance} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'details') onClose();
                            else setActiveTab(activeTab === 'documents' ? 'photos' : 'details');
                        }}
                        className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 font-bold"
                    >
                        {activeTab === 'details' ? 'Cancel' : <><ChevronLeft size={18} /> Back</>}
                    </button>

                    {activeTab !== 'documents' ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100"
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading || (!canAddVehicle && !editingVehicle)}
                            className={`px-8 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all 
                                ${(!canAddVehicle && !editingVehicle) ? 'bg-slate-400' : 'bg-emerald-600 shadow-emerald-100'}`}
                        >
                            {isLoading ? 'Sending...' : editingVehicle ? 'Save' : 'Submit'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<{ label: string, value: any, onChange: (v: string) => void, placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-300 font-medium"
            placeholder={placeholder}
        />
    </div>
);

const SelectField: React.FC<{ label: string, value: any, onChange: (v: string) => void, children: React.ReactNode }> = ({ label, value, onChange, children }) => (
    <div className="flex flex-col gap-1 relative">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-all cursor-pointer font-medium appearance-none"
            >
                {children}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    </div>
);