"use client";

export default function Loading() {
    return (
        <div className="h-screen flex flex-col items-center justify-center">
            <div className="mt-6 w-14 h-14 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-3xl font-bold text-gray-800 flex gap-1">
                Loading
                <span className="animate-bounce [animation-delay:0ms]">.</span>
                <span className="animate-bounce [animation-delay:150ms]">.</span>
                <span className="animate-bounce [animation-delay:300ms]">.</span>
            </p>
        </div>
  );
}
