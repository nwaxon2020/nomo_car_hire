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
    const lat = typeof driver.location.lat === 'string' ? parseFloat(driver.location.lat) : driver.location.lat;
    const lng = typeof driver.location.lng === 'string' ? parseFloat(driver.location.lng) : driver.location.lng;
    if (isNaN(lat) || isNaN(lng)) return null;
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
