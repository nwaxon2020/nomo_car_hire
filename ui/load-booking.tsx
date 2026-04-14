"use client";

import { Truck } from 'lucide-react';
import WaitingFormat from '@/components/WaitingFormat';

const LoadBookingUi = () => {
    return (
        <WaitingFormat 
            name="Load Booking" 
            icon={<Truck size={64} />} 
        />
    );
};

export default LoadBookingUi;
