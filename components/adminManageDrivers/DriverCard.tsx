import { FaFlag } from "react-icons/fa";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export default function DriverCard({ driver, onClick }: any) {
  // Use driverJoinedDate (from your registration page) for the 60-day check
  const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
  const joinTimeMs = driver.driverJoinedDate?.seconds * 1000;
  const isNew = joinTimeMs > Date.now() - sixtyDaysInMs;
  
  const isLocked = driver.flags >= 3;
  const hasNewCar = driver.newCarCount > 0;

  const handleCardClick = async () => {
    // 1. YOUR EXACT JUST JOINED LOGIC (DO NOT TOUCH)
    if (!isNew && driver.justJoined === true) {
      try {
        await updateDoc(doc(db, "users", driver.id), {
          justJoined: false
        });
      } catch (err) {
        console.error("Failed to update justJoined status", err);
      }
    }

    // 2. NEW CAR NOTIFICATION CLEANUP (Added this safely)
    if (hasNewCar) {
      try {
        await updateDoc(doc(db, "users", driver.id), {
          newCarCount: 0
        });
      } catch (err) {
        console.error("Failed to reset car notification", err);
      }
    }
    
    // Fire the original onClick function (to open the profile)
    onClick();
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`relative cursor-pointer group bg-white p-3 rounded-xl border-2 transition-all hover:shadow-lg 
        ${isNew ? 'border-green-400' : 'border-gray-100'} 
        ${isLocked ? 'grayscale opacity-80' : ''}`}
    >
      {/* NEW CAR NOTIFICATION BUBBLE */}
      {hasNewCar && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce z-10">
          {driver.newCarCount}
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