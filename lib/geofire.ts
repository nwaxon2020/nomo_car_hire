import { 
  geohashForLocation, 
  geohashQueryBounds, 
  distanceBetween 
} from 'geofire-common';
import { 
  collection, 
  query, 
  orderBy, 
  startAt, 
  endAt, 
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Generates a geohash for a given location.
 */
export const getGeohash = (lat: number, lng: number): string => {
  return geohashForLocation([lat, lng]);
};

/**
 * Subscribes to drivers within a specified radius (in meters).
 * Returns an unsubscribe function.
 */
export const subscribeToNearbyDrivers = (
  center: [number, number],
  radiusInMeters: number,
  onUpdate: (drivers: any[]) => void
) => {
  // Each item in 'bounds' represents a range [start, end] to query
  const bounds = geohashQueryBounds(center, radiusInMeters);
  const unsubs: (() => void)[] = [];
  const allResults = new Map<string, any>();

  bounds.forEach((b) => {
    const q = query(
      collection(db, 'users'),
      where('isLocationActive', '==', true),
      orderBy('location.geohash'),
      startAt(b[0]),
      endAt(b[1])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;

        if (change.type === 'removed') {
          allResults.delete(docId);
        } else {
          // Verify actual distance (geohash bounds are squares, we want a circle)
          const driverLoc = data.location;
          if (driverLoc && typeof driverLoc.lat === 'number' && typeof driverLoc.lng === 'number') {
            const distanceInKm = distanceBetween([driverLoc.lat, driverLoc.lng], center);
            const distanceInMeters = distanceInKm * 1000;

            if (distanceInMeters <= radiusInMeters) {
              allResults.set(docId, { id: docId, ...data });
            } else {
              allResults.delete(docId);
            }
          }
        }
      });

      onUpdate(Array.from(allResults.values()));
    });

    unsubs.push(unsub);
  });

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
};

/**
 * Helper to calculate distance in meters
 */
export const getDistance = (p1: [number, number], p2: [number, number]): number => {
  return distanceBetween(p1, p2) * 1000;
};
