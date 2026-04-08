"use client"
import React from 'react';

interface BookingHeaderProps {
    title: string;
    notice: string;
}

export default function BookingHeader({ title, notice }: BookingHeaderProps) {
    return (
        <div className="pt-4 left-0 top-0 text-center w-full">
            <h1 className="mb-2 text-2xl md:text-3xl text-gray-600 font-extrabold">{title}</h1>
            <div className="m-2 p-2 sm:p-2 rounded bg-gray-200 font-semibold text-red-800">
                <small>
                    <span className="font-black">Important Notice:</span> {notice}
                </small>
            </div>
        </div>
    );
}
