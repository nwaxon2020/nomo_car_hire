"use client";

interface SafetyTipsProps {
  selectedTips: string[];
  onTipToggle: (tip: string) => void;
}

export default function SafetyTips({ selectedTips, onTipToggle }: SafetyTipsProps) {
  const safetyTips = [
    {
      id: "meet_public",
      icon: "🏪",
      title: "Meet in Public",
      description: "Always meet at petrol stations, shopping malls, or other busy areas"
    },
    {
      id: "check_papers",
      icon: "📄",
      title: "Check Car Papers",
      description: "Verify vehicle papers, insurance, and driver's license"
    },
    {
      id: "inspect_car",
      icon: "🚗",
      title: "Inspect Vehicle",
      description: "Check for damages, tire condition, and test drive if possible"
    },
    {
      id: "agree_price",
      icon: "💰",
      title: "Agree on Price",
      description: "Discuss and agree on price BEFORE starting the trip"
    },
    {
      id: "tell_friend",
      icon: "👥",
      title: "Tell Someone",
      description: "Share trip details with a friend or family member"
    },
    {
      id: "save_chat",
      icon: "💬",
      title: "Save Chat",
      description: "Keep WhatsApp chat as reference for terms agreed"
    }
  ];

  const nigerianSpecificTips = [
    {
      id: "verify_driver",
      icon: "🆔",
      title: "Verify Driver ID",
      description: "Ask for valid ID card matching the profile"
    },
    {
      id: "cash_handling",
      icon: "💵",
      title: "Cash Safety",
      description: "Count money discreetly and keep it secure"
    },
    {
      id: "route_agreement",
      icon: "🗺️",
      title: "Agree on Route",
      description: "Discuss preferred routes and avoid isolated areas"
    },
    {
      id: "emergency_contact",
      icon: "📱",
      title: "Save Emergency",
      description: "Save driver's number as emergency contact"
    }
  ];

  const handleTipClick = (tipTitle: string) => {
    onTipToggle(tipTitle);
  };

  return (
    <div className="mt-3 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Select safety tips to remember:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {safetyTips.map((tip) => (
            <button
              key={tip.id}
              type="button"
              onClick={() => handleTipClick(tip.title)}
              className={`p-3 rounded-lg border transition-all duration-200 text-left
                        active:scale-95 ${
                selectedTips.includes(tip.title)
                  ? "bg-blue-50 border-blue-300 shadow-inner"
                  : "bg-white border-gray-200 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg ${
                  selectedTips.includes(tip.title) 
                    ? "bg-blue-100" 
                    : "bg-gray-100"
                }`}>
                  <span className="text-lg">{tip.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">{tip.title}</span>
                    {selectedTips.includes(tip.title) && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{tip.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nigerian Specific Tips */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span className="text-green-600 text-base">🇳🇬</span>
          Nigeria-Specific Tips
        </p>
        <div className="space-y-2">
          {nigerianSpecificTips.map((tip) => (
            <button
              key={tip.id}
              type="button"
              onClick={() => handleTipClick(tip.title)}
              className={`w-full p-2 rounded-lg border transition-all duration-200
                        text-left active:scale-95 ${
                selectedTips.includes(tip.title)
                  ? "bg-green-50 border-green-300 shadow-inner"
                  : "bg-white border-gray-200 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{tip.icon}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{tip.title}:</span>
                  <span className="text-xs text-gray-600 ml-2">{tip.description}</span>
                </div>
                {selectedTips.includes(tip.title) && (
                  <span className="text-green-600 font-bold text-lg">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Safety Score */}
      <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800">Safety Score</p>
            <p className="text-xs text-yellow-700">
              {selectedTips.length} of {safetyTips.length + nigerianSpecificTips.length} tips selected
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-700">
              {Math.round((selectedTips.length / (safetyTips.length + nigerianSpecificTips.length)) * 100)}%
            </div>
            <div className="text-xs text-yellow-600 font-medium">Preparedness</div>
          </div>
        </div>
        <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
          <div 
            className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${(selectedTips.length / (safetyTips.length + nigerianSpecificTips.length)) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}