import { FaCar, FaMapMarkerAlt } from 'react-icons/fa';

interface ActiveBookingBannerProps {
    type: string;
    targetPath: string;
}

const ActiveBookingBanner = ({ type, targetPath }: ActiveBookingBannerProps) => (
    <div className="max-w-md mx-auto mt-20 p-1 bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 rounded-[2.6rem] shadow-[0_20px_50px_rgba(245,158,11,0.3)] animate-in fade-in zoom-in duration-700">
        <div className="bg-white rounded-[2.5rem] p-10 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-20" />
                <div className="relative w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 rounded-full flex items-center justify-center border border-amber-100 shadow-inner">
                    <FaCar className="text-amber-500 text-4xl" />
                </div>
            </div>
            
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-3 leading-none">
                Active Session
            </h2>
            <div className="w-12 h-1 bg-amber-500 mx-auto mb-6 rounded-full" />
            
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed px-2">
                You have an active <span className="text-amber-600">{type}</span> session. Please finish it before starting a new direct hire.
            </p>
            
            <button
                onClick={() => window.location.href = targetPath}
                className="group relative w-full py-5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <FaMapMarkerAlt className="text-amber-400 group-hover:scale-110 transition-transform" size={14} />
                Return to {type} Trip
            </button>
        </div>
    </div>
);

export default ActiveBookingBanner;
