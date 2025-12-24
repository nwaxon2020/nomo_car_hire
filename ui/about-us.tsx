"use client";

export default function AboutPageUi() {
  return (
    <div className="mt-0 flex min-h-screen bg-gray-100">
      {/* Main Content */}
      <main className="flex-1 p-4 px-2 sm:p-8 md:ml-0 mt-0">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg px-3 sm:px-8 pt-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              About Our Car Hire Platform
            </h1>
            <p className="text-gray-600 mb-6 text-lg">
              Redefining transportation with trust, technology, and tradition
            </p>
            
            {/* Hero Image */}
            <div className="rounded-lg w-full h-48 sm:h-64 overflow-hidden border-2 border-green-600 shadow-xl mb-6">
              <img 
                src="/about.jpg" 
                alt="Modern car hire service with professional drivers" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="border-t border-gray-300 my-6"></div>

          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 sr-only">Introduction</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Welcome to Nigeria's premier car hire platform — a revolutionary service built to transform comfort, 
                convenience, and trust in modern transportation. We believe that every journey should be smooth, 
                affordable, and enjoyable, and our mission is to make that possible for everyone, everywhere.
              </p>
            </section>

            <section>
              <p className="text-gray-700 text-lg leading-relaxed">
                Our platform was engineered not just as a digital service, but as a complete ecosystem where customers 
                feel safe, valued, and empowered. We understand that in today's fast-paced world, reliable transportation 
                shouldn't be a luxury or a hassle. That's why we've created an intuitive system that connects you with 
                verified vehicles and professional drivers in minutes — anytime, anywhere across Nigeria.
              </p>
            </section>

            <section>
              <p className="text-gray-700 text-lg leading-relaxed">
                Founded on the principles of innovation, integrity, and reliability, our platform represents the perfect 
                convergence of cutting-edge technology with traditional Nigerian transportation values. We combine 
                advanced booking algorithms, real-time tracking, and AI-powered matching with personalized local expertise 
                to deliver a service that truly understands the unique mobility needs of our diverse communities.
              </p>
            </section>

            <section>
              <p className="text-gray-700 text-lg leading-relaxed">
                Whether you're traveling for business, attending a ceremony, exploring a new city, commuting to work, 
                or simply need reliable transportation for daily activities, our service is meticulously designed to 
                exceed your expectations. Every driver and vehicle undergoes rigorous verification to ensure the highest 
                standards of safety, reliability, and comfort. Your peace of mind is our promise — and we deliver it 
                with every ride.
              </p>
            </section>
          </div>

          {/* Vision Section */}
          <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
            <div className="rounded-lg w-full h-40 overflow-hidden shadow-md mb-4">
              <img 
                src="/vision.png" 
                alt="Visionary transportation network across Africa" 
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Vision
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              To become Africa's most trusted digital mobility platform, offering seamless, smart, and sustainable 
              transportation solutions that empower individuals, transform businesses, and connect communities.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed">
              We envision a future where transportation in Nigeria is not merely a necessity but an elevated experience 
              characterized by unprecedented efficiency, uncompromising safety, and universal accessibility. Through 
              continuous innovation, strategic partnerships, and community engagement, we're building an ecosystem that 
              supports economic growth, reduces urban congestion, and provides sustainable livelihood opportunities for 
              thousands of professional drivers across the nation.
            </p>
          </div>

          {/* Mission Section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              To connect people with safe, convenient, and affordable transportation through technology that bridges 
              trust, enhances accessibility, and creates value for both passengers and drivers.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed">
              We are committed to revolutionizing urban mobility through three strategic pillars: First, <strong>enhancing 
              accessibility</strong> by expanding our network to every corner of Nigeria. Second, <strong>elevating industry 
              standards</strong> through comprehensive driver verification, continuous professional development, and 
              stringent vehicle maintenance protocols. Third, <strong>fostering economic empowerment</strong> by creating 
              sustainable income opportunities for drivers while maintaining competitive, transparent pricing for passengers.
            </p>
          </div>

          {/* Why Choose Us Section */}
          <div className="mt-12">
            <div className="rounded-lg w-full h-40 overflow-hidden shadow-md mb-4">
              <img 
                src="/why.jpg" 
                alt="Benefits of choosing our car hire service" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Why Choose Us?
            </h2>

            <div className="space-y-6">
              <div className="bg-white border-l-4 border-green-600 pl-4 py-3">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Verified Safety & Security</h3>
                <p className="text-gray-700">
                  Our 5-tier verification system includes criminal background checks, driving history validation, 
                  vehicle inspection certifications, medical fitness tests, and continuous performance monitoring. 
                  Every vehicle undergoes bi-weekly maintenance checks and must meet ISO-certified safety standards.
                </p>
              </div>

              <div className="bg-white border-l-4 border-blue-600 pl-4 py-3">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Transparent & Fair Pricing</h3>
                <p className="text-gray-700">
                  We employ intelligent pricing algorithms that consider distance, time, vehicle type, traffic conditions, 
                  and fuel costs while maintaining complete transparency. Our "No Surprise" policy ensures you see the 
                  exact fare upfront, with itemized breakdowns and no hidden charges.
                </p>
              </div>

              <div className="bg-white border-l-4 border-purple-600 pl-4 py-3">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Rapid Response & Reliability</h3>
                <p className="text-gray-700">
                  Our real-time matching system ensures average response times under 8 minutes in major cities and 
                  under 15 minutes in suburban areas. With over 85% ride completion rate and 24/7 availability, 
                  we guarantee reliability when you need it most.
                </p>
              </div>

              <div className="bg-white border-l-4 border-orange-600 pl-4 py-3">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Diverse Fleet Options</h3>
                <p className="text-gray-700">
                  Choose from economy sedans, spacious SUVs, luxury vehicles, minibuses for groups, Keke Napep for 
                  quick trips, and specialized vehicles for weddings and corporate events. Each category is 
                  optimized for specific needs and comfort requirements.
                </p>
              </div>

              <div className="bg-white border-l-4 border-red-600 pl-4 py-3">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Flexible Payment System</h3>
                <p className="text-gray-700">
                  We prioritize your financial security with a decentralized payment approach. Payments are made 
                  directly between customers and drivers, allowing for cash, bank transfer, or mobile money options. 
                  This ensures flexibility, reduces transaction fees, and maintains transparency for all parties.
                </p>
              </div>

              <div className="bg-white border-l-4 border-teal-600 pl-4 py-3">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">24/7 Customer Excellence</h3>
                <p className="text-gray-700">
                  Our dedicated support team operates round-the-clock across multiple channels. We maintain a 
                  10-minute maximum response time for urgent issues and provide personalized assistance in English, 
                  Pidgin, Yoruba, Hausa, and Igbo languages.
                </p>
              </div>
            </div>
          </div>

          {/* Our Promise Section */}
          <div className="mt-12 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Promise to You
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              We are committed to constant improvement, platform innovation, and actively listening to your feedback. 
              Our goal transcends meeting expectations — we strive to redefine them. We want every interaction with 
              our platform to inspire confidence, deliver satisfaction, and build lasting loyalty.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              Our commitment extends beyond transportation to encompass community development and environmental 
              stewardship. We actively participate in road safety initiatives, support driver education programs, 
              and implement eco-friendly practices including promoting fuel-efficient vehicles, offsetting carbon 
              emissions, and exploring electric vehicle integration.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              With every ride you book, you contribute to a future where transportation is smarter, safer, and more 
              accessible for all Nigerians. Your trust fuels our innovation, and your satisfaction measures our success. 
              We pledge to maintain the highest standards of service integrity while continuously evolving to meet the 
              dynamic needs of our growing community.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed">
              As we expand across Nigeria, we remain rooted in our founding principles: putting people first, 
              harnessing technology for social good, and building sustainable solutions that benefit passengers, 
              drivers, and communities alike. We're not just providing rides — we're creating meaningful connections, 
              empowering local economies, and driving national progress one journey at a time.
            </p>
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Need Assistance?</h2>
            <p className="mb-6 text-lg">
              Our dedicated support team is ready to help you with any questions or concerns.
            </p>
            <a 
              href="mailto:nomopoventures@yahoo.com" 
              className="inline-block bg-white text-green-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg"
              aria-label="Contact help desk via email"
            >
              Contact Help Desk
            </a>
            <p className="mt-6 text-white/90">
              <strong>Email:</strong> nomopoventures@yahoo.com<br />
              <strong>Phone:</strong> +234 902 368 8246<br />
              <strong>Hours:</strong> 24/7 Support Available
            </p>
          </div>

          {/* Final Section */}
          <div className="mt-12 text-center">
            <div className="rounded-lg w-full h-40 overflow-hidden shadow-lg mb-6">
              <img 
                src="/tnk.jpg" 
                alt="Thank you for choosing our service" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <h3 className="text-2xl font-bold text-blue-700 mb-4">
              Thank You for Choosing Us
            </h3>
            <p className="text-gray-700 text-lg mb-4">
              Let's make your next journey not just a trip, but an experience to remember.
            </p>
            <p className="text-gray-800 font-semibold text-xl">
              Together, we're not just moving people — we're moving Nigeria forward.
            </p>
            <div className="mt-8 pt-6 border-t border-gray-300">
              <p className="pb-8 text-gray-600">
                &copy; {new Date().getFullYear()} NOMO CAR. All rights reserved.<br />
                Building the future of Nigerian transportation, one ride at a time.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}