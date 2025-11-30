"use client";
import { useEffect, useState } from "react";

interface LoadingDotsProps {
  wrapper?: "div" | "span" | "p"; // choose wrapper element
  className?: string; // optional styling
}

export default function LoadingDots({ wrapper = "span", className }: LoadingDotsProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const Wrapper = wrapper;

  return (
    <Wrapper className={className}>
      fetching{dots}
    </Wrapper>
  );
}


//usage examples:
// Inside a <div>:
// <div>
//   <LoadingDots className="text-xl font-semibold" />
// </div>

// Inside a <p>:
// <p>
//   Loading status: <LoadingDots wrapper="span" className="font-bold" />
// </p>

// Default usage (wraps in <span>):
// <LoadingDots className="text-lg text-gray-500" />
