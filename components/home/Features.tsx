"use client";

import { FaShieldAlt, FaClock, FaStar, FaUsers, FaWallet } from "react-icons/fa";

// Helper to pick the right icon based on the string from your DB
const IconComponent = ({ name, className }: { name: string; className: string }) => {
  switch (name) {
    case "FaShieldAlt": return <FaShieldAlt className={className} />;
    case "FaClock": return <FaClock className={className} />;
    case "FaStar": return <FaStar className={className} />;
    case "FaUsers": return <FaUsers className={className} />;
    case "FaWallet": return <FaWallet className={className} />;
    default: return <FaStar className={className} />;
  }
};

// Helper to get a consistent color theme for each card
const getIconBgColor = (index: number) => {
  const colors = ["bg-blue-100", "bg-green-100", "bg-yellow-100", "bg-purple-100"];
  return colors[index % colors.length];
};

const getIconTextColor = (index: number) => {
  const colors = ["text-blue-600", "text-green-600", "text-yellow-600", "text-purple-600"];
  return colors[index % colors.length];
};

export default function Features({ stats, data }: any) {
  // Accessing the 'features' array and header info from your data object
  const features = data?.features || [];
  const sectionTitle = data?.title || "Why Choose Nomo Cars?";
  const sectionSubtitle = data?.subtitle || "We're committed to providing the best car hire experience in Nigeria";

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {sectionTitle}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {sectionSubtitle}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item: any, index: number) => (
            <FeatureCard 
              key={item.id || index}
              title={item.title}
              desc={item.description}
              iconName={item.icon}
              bgColor={getIconBgColor(index)}
              iconColor={getIconTextColor(index)}
              // Special handling for the rating text if it's the 3rd card
              isRatingCard={item.title?.toLowerCase().includes("rating")}
              ratingValue={stats?.rating}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, desc, iconName, bgColor, iconColor, isRatingCard, ratingValue }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mb-4`}>
        <IconComponent name={iconName} className={`${iconColor} text-xl`} />
      </div>
      <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">
        {isRatingCard && ratingValue 
          ? desc.replace("4.8/5", `${ratingValue.toFixed(1)}/5`) 
          : desc}
      </p>
    </div>
  );
}