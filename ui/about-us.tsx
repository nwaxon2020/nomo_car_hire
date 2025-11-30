"use client";


export default function AboutPageUi() {

  return (
    <div className="mt-0 flex min-h-screen bg-gray-100">

        {/* Main Content */}
        <main className="flex-1 p-2 sm:p-8 md:ml-0 mt-0">
            <div className="max-w-3xl mx-auto bg-white shadow-lg rounded px-4 sm:px-10 pt-8">
               <div>
                    <h1 className="text-xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center">
                        About Our Car Hire Platform
                    </h1>
                    {/* Circular Image Under Header */}
                
                    <div className="rounded w-full h-32 overflow-hidden border border-green-600 shadow-lg mb-4">
                        <img 
                        src="/about.jpg" 
                        alt="About Image" 
                        className="w-full h-full object-cover"
                        />
                    </div>
               </div><hr />

                <p className="mt-8 text-gray-700 text-lg leading-relaxed mb-4">
                    Welcome to our car hire platform — a service built to redefine comfort,
                    convenience, and trust in modern transportation. We believe that every
                    journey should be smooth, affordable, and enjoyable, and our mission is to
                    make that possible for everyone.
                </p>

                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Our platform was designed not just as a website, but as a complete
                    experience where customers feel safe, valued, and in control. We understand
                    that life moves fast, and transportation should never slow you down. That is
                    why we created a system that allows you to hire the perfect vehicle with
                    just a few clicks — anytime, anywhere.
                </p>

                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Whether you are traveling for business, attending a ceremony, exploring a
                    new city, or simply need a comfortable ride for your everyday movements, our
                    service is built to meet your needs. Every driver and vehicle on our
                    platform is carefully reviewed to ensure high standards of safety,
                    reliability, and comfort. You deserve peace of mind — and we deliver exactly
                    that.
                </p>

                <div className="mt-12 inline rounded w-full h-32 overflow-hidden shadow-lg">
                    <img 
                    src="/vision.png" 
                    alt="vision Image" 
                    className="w-full h-full object-contain"
                    />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-4">
                    Our Vision
                </h2>

                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Our vision is to become Africa’s most trusted digital car hire service,
                    offering seamless mobility solutions to both individuals and businesses. We
                    aim to empower users with a platform where booking a car feels effortless,
                    transparent, and reliable.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">
                    Our Mission
                </h2>

                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Our mission is to connect people with safe, convenient, and affordable
                    transportation options. By combining technology with real-world experience,
                    we hope to bridge the gap between customers and trusted drivers while making
                    car rental accessible to everyone — regardless of budget or location.
                </p>

                <div className="mt-12 rounded w-full h-32  shadow-lg">
                    <img 
                    src="/why.jpg" 
                    alt="why Image" 
                    className="w-full h-full object-cover"
                    />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-4">
                    Why Choose Us?
                </h2>

                <ul className="list-disc pl-6 text-gray-700 text-lg space-y-3 mb-6">
                    <li>
                    <strong>Ease of Use:</strong> Our platform is designed to be simple and
                    friendly, even for first-time users.
                    </li>
                    <li>
                    <strong>Verified Drivers & Vehicles:</strong> We carefully screen our
                    partners to ensure safety and professionalism.
                    </li>
                    <li>
                    <strong>Affordable Pricing:</strong> Transparent prices with no hidden
                    fees — what you see is what you pay.
                    </li>
                    <li>
                    <strong>Fast & Reliable Booking:</strong> Book a ride within seconds,
                    without stress or delays.
                    </li>
                    <li>
                    <strong>24/7 Support:</strong> Our team is always ready to help, day or
                    night.
                    </li>
                    <li>
                    <strong>Wide Range of Cars:</strong> From small city cars to luxury SUVs,
                    we offer vehicles suitable for every occasion.
                    </li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">
                    Our Promise to You
                </h2>

                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    We are committed to constantly improving our services, updating our
                    platform, and listening to your feedback. Our goal is not just to meet
                    expectations, but to exceed them. We want every customer to feel confident,
                    satisfied, and proud to use our service.
                </p>

                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    With every ride you book, you help us move closer to a future where
                    transportation is smarter, safer, and more accessible for all.
                </p>

                <p className="my-8 text-gray-700 text-lg leading-relaxed">For more Enquiries contact us @: <a href="mailto:nomopoventures@yahoo.com" className="rounded-md p-3 bg-green-600 text-white font-semibold">Help Desk</a></p>

                <div className="mt-8 text-center py-10">
                    <div className="mt-12 rounded w-full h-32  shadow-lg">
                        <img 
                        src="/tnk.jpg" 
                        alt="why Image" 
                        className="w-full h-full object-cover"
                        />
                    </div>
                    <p className="text-xl font-bold text-blue-600">
                    Thank you for choosing us. Let’s make your journey unforgettable. 
                    </p>
                </div>
            </div>

        </main>
    </div>
  );
}
