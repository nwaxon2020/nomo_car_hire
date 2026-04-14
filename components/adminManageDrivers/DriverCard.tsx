import { FaFlag } from "react-icons/fa";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export default function DriverCard({ driver, onClick }: any) {
  const isNew = driver.justJoined === true;
  const isLocked = driver.isDisabled === true || driver.flags >= 3;
  const hasNewCar = driver.newCarCount > 0;

  // 60-day logic for the 'NEW' tag
  const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
  const joinTimeMs = driver.driverJoinedDate?.seconds * 1000;
  const isWithin60Days = joinTimeMs > Date.now() - sixtyDaysInMs;

  const handleCardClick = async () => {
    // Reset notification flags when card is clicked
    if (isNew || hasNewCar) {
      try {
        await updateDoc(doc(db, "users", driver.id), {
          justJoined: false,
          newCarCount: 0
        });
      } catch (err) {
        console.error("Failed to reset driver notifications", err);
      }
    }
    
    // Fire the original onClick function (to open the profile)
    onClick();
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`relative cursor-pointer group bg-white p-3 rounded-xl border-2 transition-all hover:shadow-lg 
        ${hasNewCar ? 'border-green-400' : 'border-gray-100'} 
        ${driver.isDisabled ? 'border-red-500 bg-red-50/50' : ''}
        ${isLocked ? 'grayscale opacity-80' : ''}`}
    >
      {driver.isDisabled && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full z-10 uppercase tracking-tighter border border-white shadow-sm">
          Disabled
        </div>
      )}
      {/* NEW CAR NOTIFICATION BUBBLE */}
      {hasNewCar && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce z-10">
          {driver.newCarCount}
        </div>
      )}

      {/* 60-DAY NEW TAG */}
      {isWithin60Days && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full z-10 uppercase tracking-tighter border border-white shadow-sm">
          New
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <img 
          src={driver.profileImage || "/default-avatar.png"} 
          className="w-10 h-10 rounded-lg object-cover" 
        />
        <div className="flex gap-0.5">
          {[1, 2, 3].map(i => (
            <FaFlag key={i} size={10} className={driver.flags >= i ? 'text-red-600' : 'text-gray-200'} />
          ))}
        </div>
      </div>

      <h3 className="font-bold text-sm truncate uppercase">{driver.firstName} {driver.lastName}</h3>
      <p className="text-[10px] text-gray-400 font-mono truncate">ID: {driver.uid?.slice(-8).toUpperCase()}</p>
      
      <div className="mt-2 flex justify-between items-center">
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${driver.verified ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
          {driver.verified ? 'VERIFIED' : 'PENDING'}
        </span>
        {driver.vip && <span className="text-amber-500 text-[10px] font-black italic">VIP</span>}
      </div>
    </div>
  );
}