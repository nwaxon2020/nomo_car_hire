import { FaInfoCircle } from 'react-icons/fa';

const NegotiationNotice = () => (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 flex items-center gap-2 shadow-sm">
        <div className="bg-blue-600 px-2 py-1 rounded-xl text-white shadow-md shrink-0">
            <FaInfoCircle size={14} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Fair Negotiation Policy</p>
            <p className="text-[11px] font-medium text-gray-600 leading-tight">
                Bookings are negotiations between drivers and customers. Please ensure a proper agreement on fare and terms is reached before starting your trip.
            </p>
        </div>
    </div>
);

export default NegotiationNotice;
