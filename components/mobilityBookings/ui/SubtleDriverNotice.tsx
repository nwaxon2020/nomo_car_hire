import { FaCar } from 'react-icons/fa';

const SubtleDriverNotice = () => (
    <div className="mb-2 p-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center gap-3">
        <div className="bg-emerald-600 p-1.5 rounded-lg text-white shadow-lg">
            <FaCar size={12} />
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Fleet Active</p>
            <p className="text-[10px] font-medium text-gray-400">Tap a vehicle below to set your active booking car.</p>
        </div>
    </div>
);

export default SubtleDriverNotice;
