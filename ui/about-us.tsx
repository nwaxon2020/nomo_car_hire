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
            Founded on the principles of innovation and reliability, our platform represents 
            the convergence of cutting-edge technology with traditional Nigerian transportation 
            values. We combine advanced booking algorithms with personalized local expertise to 
            deliver a service that truly understands the unique mobility needs of our communities.
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
            Our vision is to become Africa's most trusted digital car hire service,
            offering seamless mobility solutions to both individuals and businesses. We
            aim to empower users with a platform where booking a car feels effortless,
            transparent, and reliable.
          </p>

          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            We envision a Nigeria where transportation is not just a necessity but an experience 
            characterized by efficiency, safety, and accessibility. Through continuous innovation 
            and strategic partnerships, we're building an ecosystem that supports economic growth, 
            reduces urban congestion, and provides sustainable livelihood opportunities for thousands 
            of professional drivers across the nation.
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

          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            We are committed to revolutionizing urban mobility through three core objectives: 
            First, to enhance transportation accessibility by expanding our network across all 
            36 states of Nigeria. Second, to elevate industry standards through rigorous driver 
            verification, continuous training programs, and vehicle maintenance protocols. Third, 
            to foster economic empowerment by creating sustainable income opportunities for drivers 
            while offering competitive pricing for passengers.
          </p>

          <div className="mt-12 rounded w-full h-32 shadow-lg">
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
              friendly, even for first-time users. With an intuitive interface and 
              streamlined booking process, you can secure your transportation in under 
              60 seconds. We've eliminated unnecessary complexity to ensure everyone, 
              regardless of technical proficiency, can access our services effortlessly.
            </li>
            <li>
              <strong>Verified Drivers & Vehicles:</strong> We implement a comprehensive 
              4-tier verification system that includes background checks, driving history 
              validation, vehicle inspection certifications, and continuous performance 
              monitoring. Every vehicle in our fleet undergoes regular maintenance checks 
              and must meet our stringent safety standards before being approved for service.
            </li>
            <li>
              <strong>Affordable Pricing:</strong> We employ dynamic yet transparent 
              pricing algorithms that consider multiple factors including distance, time, 
              vehicle type, and current demand — all while maintaining complete price 
              transparency. Our no-surprise policy ensures what you agree is what you pay, 
              with detailed breakdowns of all charges before confirmation.
            </li>
            <li>
              <strong>Fast & Reliable Booking:</strong> Using our real-time matching system, 
              we ensure fast service with an average response time of under 8 minutes in major cities. 
              Our advanced search algorithm connects you to available drivers while taking your preferences 
              and requirements into account.
            </li>
            <li>
              <strong>24/7 Support:</strong> Our dedicated customer success team operates 
              round-the-clock across multiple channels including phone, email, and in-app 
              chat. We maintain a 15-minute maximum response time for urgent inquiries and 
              provide personalized assistance for both passengers and drivers throughout 
              their journey with us.
            </li>
            <li>
              <strong>Wide Range of Cars:</strong> Our diverse fleet includes economy sedans, 
              spacious SUVs, luxury vehicles, minibuses for groups, Keke Napep, and specialized vehicles 
              for occasions. Each category undergoes specific customization to meet the 
              unique demands of different trip types, ensuring optimal comfort and 
              functionality for every purpose.
            </li>
            <li>
              <strong>Flexible Payment Options:</strong> We do not request your account information. 
              Payments are made directly between customers and drivers for better flexibility and transparency.
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
            Our commitment extends beyond transportation to encompass community development 
            and environmental responsibility. We actively participate in road safety 
            initiatives, support driver education programs, and implement eco-friendly 
            practices including promoting fuel-efficient vehicles and exploring electric 
            vehicle integration into our fleet.
          </p>

          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            With every ride you book, you help us move closer to a future where
            transportation is smarter, safer, and more accessible for all. Your trust 
            fuels our innovation, and your satisfaction measures our success. We pledge 
            to maintain the highest standards of service integrity while continuously 
            evolving to meet the changing needs of our growing community of users.
          </p>

          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            As we expand our footprint across Nigeria, we remain grounded in our founding 
            principles: putting people first, embracing technology for good, and building 
            sustainable solutions that benefit both passengers and drivers. We're not just 
            providing rides — we're creating connections, empowering communities, and 
            driving progress one journey at a time.
          </p>

          <div className=" text-center my-8 text-gray-700 text-lg">
           <p className="mb-0"> For more Enquiries contact us @: </p>
            <br /><a 
              href="mailto:nomopoventures@yahoo.com" 
              className="mt-0 rounded-md p-3 bg-green-600 text-white font-semibold ml-2 hover:bg-green-700 transition-colors"
            >
              Help Desk
            </a>
          </div>

          <div className="mt-8 text-center py-10">
            <div className="mt-12 rounded w-full h-32 shadow-lg">
              <img 
                src="/tnk.jpg" 
                alt="why Image" 
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xl font-bold text-blue-600 mt-4">
              Thank you for choosing us. Let's make your journey unforgettable.
            </p>
            <p className="text-gray-700 mt-4 text-lg">
              Together, we're not just moving people — we're moving Nigeria forward.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}