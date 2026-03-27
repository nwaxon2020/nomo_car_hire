// types.ts
import { FaUserCheck, FaCar, FaWallet, FaShieldAlt, FaClock, FaStar, FaCrown, FaCheckCircle, FaArrowRight, FaKey, FaMapMarkerAlt, FaUsers } from "react-icons/fa";

export interface HeroSection {
  badgeText: string;
  title: string;
  subtitle: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  searchPlaceholder: string;
  stats: { drivers: number; rides: number; cities: number };
  backgroundImage?: string;
}

export interface HowItWorksStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  buttonText: string;
  buttonLink: string;
  image?: string;
}

export interface HowItWorksSection {
  title: string;
  subtitle: string;
  steps: HowItWorksStep[];
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface FeaturesSection {
  title: string;
  subtitle: string;
  features: Feature[];
}

export interface Benefit {
  id: string;
  title: string;
  description: string;
}

export interface PartnerStat {
  id: string;
  value: string;
  label: string;
}

export interface DriverPartnerSection {
  badgeText: string;
  title: string;
  subtitle: string;
  description: string;
  primaryButtonText: string;
  benefits: Benefit[];
  stats: PartnerStat[];
  backgroundImage?: string;
}

export interface SafetyFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface PassengerSafetySection {
  title: string;
  description: string;
  buttonText: string;
  features: SafetyFeature[];
  backgroundImage?: string;
}

export interface CTAStat {
  id: string;
  icon: string;
  text: string;
}

export interface CTASection {
  title: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  stats: CTAStat[];
  backgroundImage?: string;
}

export interface FullPageContent {
  hero: HeroSection;
  howItWorks: HowItWorksSection;
  features: FeaturesSection;
  partner: DriverPartnerSection;
  safety: PassengerSafetySection;
  cta: CTASection;
}

export const AVAILABLE_ICONS = [
  { name: "FaUserCheck", label: "User Check" },
  { name: "FaCar", label: "Car" },
  { name: "FaWallet", label: "Wallet" },
  { name: "FaShieldAlt", label: "Shield" },
  { name: "FaClock", label: "Clock" },
  { name: "FaStar", label: "Star" },
  { name: "FaCrown", label: "Crown" },
  { name: "FaCheckCircle", label: "Check Circle" },
  { name: "FaArrowRight", label: "Arrow Right" },
  { name: "FaKey", label: "Key" },
  { name: "FaMapMarkerAlt", label: "Map Marker" },
  { name: "FaUsers", label: "Users" },
];

export const defaultContent: FullPageContent = {
  hero: {
    badgeText: "Nigeria's #1 Car Hire Platform",
    title: "Hire Professional",
    subtitle: "Drivers Instantly",
    description: "Connect with verified drivers, book rides safely, and travel with confidence.",
    primaryButtonText: "Get Started Free",
    secondaryButtonText: "Book a Ride",
    searchPlaceholder: "Enter location, city, or destination...",
    stats: { drivers: 1000, rides: 10000, cities: 50 },
    backgroundImage: ""
  },
  howItWorks: {
    title: "How Nomo Cars Works",
    subtitle: "Simple steps to get you moving",
    steps: [
      { id: "1", title: "Create Account", description: "Sign up as a passenger or driver.", icon: "FaUserCheck", buttonText: "Sign Up", buttonLink: "/signup" },
      { id: "2", title: "Book or Drive", description: "Book rides instantly or start earning.", icon: "FaCar", buttonText: "Book Ride", buttonLink: "/user/car-hire" },
      { id: "3", title: "Enjoy & Earn", description: "Enjoy safe rides or earn money.", icon: "FaWallet", buttonText: "Dashboard", buttonLink: "/dashboard" }
    ]
  },
  features: {
    title: "Why Choose Nomo Cars?",
    subtitle: "Best car hire experience in Nigeria",
    features: [
      { id: "1", title: "Verified Drivers", description: "Background-checked drivers", icon: "FaShieldAlt" },
      { id: "2", title: "24/7 Service", description: "Always available", icon: "FaClock" },
      { id: "3", title: "Top Ratings", description: "Rated 4.8/5", icon: "FaStar" },
      { id: "4", title: "Flexible Payments", description: "Cash and other payments", icon: "FaWallet" }
    ]
  },
  partner: {
    badgeText: "Become a Driver Partner",
    title: "Earn Money on Your Schedule",
    subtitle: "Start earning today",
    description: "Drive whenever you want, full-time or part-time.",
    primaryButtonText: "Start Driving",
    benefits: [
      { id: "1", title: "Flexible Hours", description: "Drive on your schedule" },
      { id: "2", title: "Weekly Earnings", description: "Get paid weekly" },
      { id: "3", title: "Support 24/7", description: "Round the clock support" }
    ],
    stats: [
      { id: "1", value: "₦25k+", label: "Weekly Potential" },
      { id: "2", value: "95%", label: "Satisfaction" },
      { id: "3", value: "24/7", label: "Support" },
      { id: "4", value: "₦0", label: "Signup Fee" }
    ]
  },
  safety: {
    title: "Safe Travels with Nomo Cars",
    description: "Your safety is our priority.",
    buttonText: "Book Your First Ride",
    features: [
      { id: "1", title: "Safety First", description: "Background checks", icon: "FaShieldAlt" },
      { id: "2", title: "Flexible Payments", description: "Negotiate with drivers", icon: "FaWallet" }
    ]
  },
  cta: {
    title: "Ready to Get Started?",
    description: "Join thousands of Nigerians who trust Nomo Cars.",
    primaryButtonText: "Sign Up Free",
    secondaryButtonText: "Learn More",
    secondaryButtonLink: "/about",
    stats: [
      { id: "1", icon: "FaShieldAlt", text: "100% Secure" },
      { id: "2", icon: "FaStar", text: "Rated 4.8/5" },
      { id: "3", icon: "FaUsers", text: "1000+ Drivers" }
    ]
  }
};