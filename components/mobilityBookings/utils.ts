export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

/**
 * Formats a distance in km into a human-readable string.
 * Shows meters when under 1km, km with 1 decimal otherwise.
 * e.g: 0.34 km → "340 m away", 2.3 km → "2.3 km away"
 */
export const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
        const meters = Math.round(distanceKm * 1000);
        return `${meters} m away`;
    }
    return `${distanceKm.toFixed(1)} km away`;
};

export const getDefaultVehicleImage = (carType: string) => {
    const images: Record<string, string> = {
        "sedan": "/carr.jpg",
        "suv": "/car.jpg",
        "truck": "/carz.jpg",
        "van": "/car.jpg",
        "keke": "/carz.jpg",
        "luxury": "/carr.jpg",
        "bus": "/carz.jpg",
    }
    return images[carType?.toLowerCase()] || "/car_select.jpg"
}

export const getVehicleImages = (vehicle: any) => {
    const images = [];
    if (vehicle.images?.front) images.push(vehicle.images.front);
    if (vehicle.images?.side) images.push(vehicle.images.side);
    if (vehicle.images?.back) images.push(vehicle.images.back);
    if (vehicle.images?.interior) images.push(vehicle.images.interior);

    if (images.length === 0) {
        images.push(getDefaultVehicleImage(vehicle.carType));
        images.push("/car.jpg");
        images.push("/carz.jpg");
    }
    return images;
};

export const getDriverLocation = (driver: any) => {
    if (!driver || !driver.location) return null;
    
    // Handle both lat/lng and latitude/longitude formats
    const lat = driver.location.lat !== undefined 
        ? (typeof driver.location.lat === 'string' ? parseFloat(driver.location.lat) : driver.location.lat)
        : (typeof driver.location.latitude === 'string' ? parseFloat(driver.location.latitude) : driver.location.latitude);
        
    const lng = driver.location.lng !== undefined
        ? (typeof driver.location.lng === 'string' ? parseFloat(driver.location.lng) : driver.location.lng)
        : (typeof driver.location.longitude === 'string' ? parseFloat(driver.location.longitude) : driver.location.longitude);

    if (isNaN(lat) || isNaN(lng) || lat === undefined || lng === undefined) return null;
    return { lat, lng };
};

export const getDriverAddress = (driver: any) => {
    return driver?.location?.address || "Scanning for location...";
};

export const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recently"
    try {
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString("en-GB")
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB")
        return new Date(timestamp).toLocaleDateString("en-GB")
    } catch (error) {
        return "Recently"
    }
}
