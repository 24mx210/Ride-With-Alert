import crypto from "crypto";

export function generateTemporaryCredentials() {
  const username = `temp_${crypto.randomBytes(8).toString("hex")}`;
  const password = crypto.randomBytes(12).toString("hex");
  return { temporaryUsername: username, temporaryPassword: password };
}

/**
 * Format phone number for Indian SMS (10 digits)
 * @param phoneNumber - Phone number in any format
 * @returns Formatted 10-digit Indian phone number
 */
function formatIndianPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "");
  
  // Remove country code if present (91 for India)
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove leading + if present in original
  if (phoneNumber.startsWith("+91")) {
    cleaned = phoneNumber.replace(/\D/g, "").substring(2);
  }
  
  // Ensure it's 10 digits
  if (cleaned.length === 10) {
    return cleaned;
  }
  
  // If still not 10 digits, return as is (will fail API call)
  return cleaned;
}

/**
 * Send SMS using Fast2SMS (FREE for India) or simulate SMS (for development)
 * Fast2SMS: https://www.fast2sms.com/ - Free ₹50 credit, ₹0.11 per SMS
 * @param phoneNumber - Recipient phone number (10 digits for India, or with country code)
 * @param message - SMS message content
 * @returns Promise with success status and message ID
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
  const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

  // If Fast2SMS API key is not configured, fallback to simulation
  if (!FAST2SMS_API_KEY) {
    console.log(`[SMS SIMULATION] To: ${phoneNumber}`);
    console.log(`[SMS SIMULATION] Message: ${message}`);
    console.log("---");
    console.log("💡 Get FREE SMS: Sign up at https://www.fast2sms.com/ and add FAST2SMS_API_KEY to .env");
    return { success: true, messageId: crypto.randomBytes(8).toString("hex") };
  }

  try {
    // Format phone number for India (10 digits)
    const formattedNumber = formatIndianPhoneNumber(phoneNumber);
    
    if (formattedNumber.length !== 10) {
      throw new Error(`Invalid Indian phone number. Expected 10 digits, got ${formattedNumber.length}`);
    }

    // Fast2SMS API endpoint
    const apiUrl = "https://www.fast2sms.com/dev/bulkV2";
    
    // Prepare request - Fast2SMS expects numbers as string (comma-separated for multiple)
    const requestBody = {
      route: "q", // Quick route for transactional SMS
      message: message,
      language: "english",
      numbers: formattedNumber, // Single number as string
    };

    // Send SMS via Fast2SMS
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    // Log full response for debugging
    console.log(`[SMS API Response] Status: ${response.status}`);
    console.log(`[SMS API Response] Body:`, JSON.stringify(result, null, 2));

    if (result.return === true || result.status === "success") {
      console.log(`[SMS SENT ✅] To: ${formattedNumber}`);
      console.log(`[SMS SENT ✅] Request ID: ${result.request_id || result.message_id || 'N/A'}`);
      console.log(`[SMS SENT ✅] Message: ${message.substring(0, 50)}...`);
      console.log("---");
      
      return {
        success: true,
        messageId: result.request_id || result.message_id || crypto.randomBytes(8).toString("hex"),
      };
    } else {
      const errorMsg = result.message || result.error || "Failed to send SMS";
      console.error(`[SMS API Error] ${errorMsg}`);
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error(`[SMS ERROR ❌] Failed to send SMS to ${phoneNumber}:`, error.message);
    console.log(`[SMS SIMULATION] To: ${phoneNumber}`);
    console.log(`[SMS SIMULATION] Message: ${message}`);
    console.log("---");
    
    return {
      success: false,
      messageId: crypto.randomBytes(8).toString("hex"),
      error: error.message,
    };
  }
}

// Keep simulateSMS for backward compatibility (deprecated)
export function simulateSMS(phoneNumber: string, message: string) {
  console.warn("⚠️  simulateSMS is deprecated. Use sendSMS instead.");
  return sendSMS(phoneNumber, message);
}

export interface NearbyFacility {
  name: string;
  type: "police" | "hospital";
  latitude: number;
  longitude: number;
  distance: number; // in km
  phone: string;
}

export function findNearbyFacilities(
  latitude: number,
  longitude: number,
  policePhone: string,
  hospitalPhone: string
): NearbyFacility[] {
  const facilities: NearbyFacility[] = [];

  // Simulated police stations (within 10km radius)
  const policeStations = [
    { name: "Central Police Station", lat: latitude + 0.05, lng: longitude + 0.05 },
    { name: "North Police Station", lat: latitude + 0.08, lng: longitude - 0.03 },
    { name: "South Police Station", lat: latitude - 0.06, lng: longitude + 0.04 },
  ];

  // Simulated hospitals (within 10km radius)
  const hospitals = [
    { name: "City General Hospital", lat: latitude - 0.04, lng: longitude + 0.06 },
    { name: "Emergency Medical Center", lat: latitude + 0.07, lng: longitude + 0.02 },
    { name: "Regional Hospital", lat: latitude - 0.05, lng: longitude - 0.05 },
  ];

  // Calculate distances and add to facilities
  policeStations.forEach((station) => {
    const distance = calculateDistance(latitude, longitude, station.lat, station.lng);
    if (distance <= 10) {
      facilities.push({
        name: station.name,
        type: "police",
        latitude: station.lat,
        longitude: station.lng,
        distance: Math.round(distance * 10) / 10,
        phone: policePhone,
      });
    }
  });

  hospitals.forEach((hospital) => {
    const distance = calculateDistance(latitude, longitude, hospital.lat, hospital.lng);
    if (distance <= 10) {
      facilities.push({
        name: hospital.name,
        type: "hospital",
        latitude: hospital.lat,
        longitude: hospital.lng,
        distance: Math.round(distance * 10) / 10,
        phone: hospitalPhone,
      });
    }
  });

  // Sort by distance
  return facilities.sort((a, b) => a.distance - b.distance);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
