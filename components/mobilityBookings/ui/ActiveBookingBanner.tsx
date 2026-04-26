import { FaCar, FaMapMarkerAlt } from 'react-icons/fa';

interface ActiveBookingBannerProps {
    type: string;
    targetPath: string;
}

const ActiveBookingBanner = ({ type, targetPath }: ActiveBookingBannerProps) => (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <FaCar className="text-amber-500 text-3xl" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">Active Booking Found</h2>
        <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed px-4">
            You currently have an active {type} booking. Please complete or cancel it before starting a new search.
        </p>
        <button
            onClick={() => window.location.href = targetPath}
            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
        >
            <FaMapMarkerAlt size={14} />
            Return to Active Booking
        </button>
    </div>
);

export default ActiveBookingBanner;
