"use client";

import { useRouter } from "next/navigation";
import { FaShieldAlt, FaWallet, FaCar } from "react-icons/fa";

export default function PassengerSafety({ data }: any) {
  const router = useRouter();
  const content = data || {};
  
  // Safely accessing your features array from the data
  const features = content.features || [];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-1 lg:order-2">
            <h2 className="text-left text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {content.title || "Safe Travels with Nomo Cars"}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {content.description || "Your safety is our priority. We ensure every ride is secure and comfortable."}
            </p>
            
            <div className="space-y-6">
              <SafetyFeature 
                icon={<FaShieldAlt className="text-green-600 text-xl" />} 
                bg="bg-green-100"
                title={features[0]?.title || "Safety First"}
                desc={features[0]?.description || "All drivers undergo thorough background checks and vehicle inspections"}
              />
              <SafetyFeature 
                icon={<FaWallet className="text-blue-600 text-xl" />} 
                bg="bg-blue-100"
                title={features[1]?.title || "Flexible Payments"}
                desc={features[1]?.description || "Cash and other payments are negotiated between passengers and drivers"}
              />
            </div>
            
            <div className="mt-8 flex justify-center md:justify-start">
              <button
                onClick={() => router.push("/user/car-hire")}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                <FaCar /> {content.buttonText || content.btnMain || "Book Your First Ride"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SafetyFeature({ icon, bg, title, desc }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-gray-900 text-lg mb-2">{title}</h4>
        <p className="text-gray-600">{desc}</p>
      </div>
    </div>
  );
}