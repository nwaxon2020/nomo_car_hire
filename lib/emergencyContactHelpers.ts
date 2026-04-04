import { db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Get the active emergency contact for a user
 * - If user selected one, use that
 * - Otherwise, use the most recently added contact
 * Returns the contact object with phone number in +234 format for Nigeria
 */
export const getActiveEmergencyContact = async (userId: string): Promise<any | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const emergencyContacts = userData.emergencyContact || [];

    if (emergencyContacts.length === 0) return null;

    // First priority: Find explicitly marked active contact
    const activeContact = emergencyContacts.find((contact: any) => contact.isActive);
    if (activeContact) {
      return activeContact;
    }

    // Fallback: Get the most recently added contact (by addedAt timestamp)
    const sortedByDate = emergencyContacts.sort(
      (a: any, b: any) => (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0)
    );

    return sortedByDate[0] || null;
  } catch (error) {
    console.error('Error getting active emergency contact:', error);
    return null;
  }
};

/**
 * Format phone number for WhatsApp (Nigeria +234 format)
 */
export const formatPhoneForWhatsApp = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  let cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    return '234' + cleaned;
  } else if (cleaned.startsWith('234') && cleaned.length === 13) {
    return cleaned;
  } else if (cleaned.startsWith('+234') && cleaned.length === 14) {
    return cleaned.substring(1);
  }

  return cleaned;
};

/**
 * Format phone number for voice calls
 */
export const formatPhoneForCall = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  return phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
};

/**
 * Get emergency contact WhatsApp link
 */
export const getEmergencyContactWhatsAppLink = (phoneNumber: string, message?: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
  const text = message || 'I need emergency assistance!';
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Get emergency contact call link
 */
export const getEmergencyContactCallLink = (phoneNumber: string): string => {
  const formattedPhone = formatPhoneForCall(phoneNumber);
  return `tel:${formattedPhone}`;
};
