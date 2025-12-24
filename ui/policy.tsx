"use client";

export default function PolicyPageUi() {
    const lastUpdated = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-8 px-4 sm:px-8 border border-gray-200 animate-fadeIn">
                
                {/* HEADER */}
                <h1 className="text-4xl font-extrabold text-gray-800 mb-3 text-center">
                    Privacy & Policy
                </h1>
                <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
                    Your privacy and safety are extremely important to us. Please read this policy to understand how we handle and protect your information, and ensure a secure platform for all users.
                </p>

                {/* SECTIONS */}
                <Section
                    title="1. Data Collection"
                    content="We collect information that you provide directly, such as your name, email, phone number, vehicle details, payment information, uploaded images, and booking history. We also collect usage data and location information to improve our services and facilitate ride bookings."
                />

                <Section
                    title="2. Ride Booking Requests"
                    content={
                        <>
                            When requesting or accepting ride bookings, users agree to:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Provide accurate pick-up and drop-off locations</li>
                                <li>Confirm booking details before finalizing</li>
                                <li>Communicate respectfully with drivers/passengers</li>
                                <li>Report any discrepancies in booking details immediately</li>
                                <li>Cancel bookings at least 30 minutes before scheduled time when possible</li>
                            </ul>
                        </>
                    }
                />

                <Section
                    title="3. Safety Guidelines & Negotiations"
                    content={
                        <>
                            <strong>For Passengers:</strong>
                            <ul className="list-disc pl-5 mt-2 mb-4 space-y-1">
                                <li>Always verify driver identity and vehicle details before boarding</li>
                                <li>Share ride details with trusted contacts</li>
                                <li>Use in-app messaging for communication before meeting</li>
                                <li>Report suspicious behavior immediately via the emergency button</li>
                                <li>Meet in well-lit, public areas for pick-ups</li>
                            </ul>

                            <strong>For Drivers:</strong>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Provide accurate fare estimates before ride confirmation</li>
                                <li>Maintain transparent pricing - no hidden charges</li>
                                <li>Set reasonable fares that reflect distance and market rates</li>
                                <li>Communicate fare changes before ride begins</li>
                                <li>Do not pressure passengers into accepting unfair prices</li>
                            </ul>
                        </>
                    }
                />

                <Section
                    title="4. Fair Pricing & Negotiation Policy"
                    content={
                        <>
                            We promote fair pricing on our platform:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Drivers must provide competitive, reasonable fares</li>
                                <li>Fare estimates should be clear and include all charges</li>
                                <li>Passengers may negotiate within 15% of initial quote</li>
                                <li>Final pricing must be agreed upon before ride begins</li>
                                <li>Excessive pricing or price gouging is prohibited</li>
                                <li>Platform may suggest fair rates based on distance and time</li>
                            </ul>
                        </>
                    }
                />

                <Section
                    title="5. Account Management & Reviews"
                    content={
                        <>
                            <strong>Review System:</strong>
                            <ul className="list-disc pl-5 mt-2 mb-4 space-y-1">
                                <li>Users may leave honest reviews based on actual experiences</li>
                                <li>Reviews should be factual and respectful</li>
                                <li>False or malicious reviews may be removed</li>
                            </ul>

                            <strong>Account Actions:</strong>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Accounts receiving consistently poor reviews (below 2.0/5.0 average) will be temporarily suspended for review</li>
                                <li>Repeat violations or severe safety concerns result in permanent deactivation</li>
                                <li>Fraudulent activity leads to immediate account termination</li>
                                <li>Suspended users may appeal decisions through our support system</li>
                            </ul>
                        </>
                    }
                />

                <Section
                    title="6. Reporting System"
                    content={
                        <>
                            We prioritize user safety through our reporting mechanisms:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Report Suspicious Drivers/Passengers:</strong> Use the "Report" button on user profiles or ride details</li>
                                <li><strong>Emergency Assistance:</strong> Access emergency features within the app during active rides</li>
                                <li><strong>Malicious Behavior:</strong> Report harassment, fraud, or safety concerns immediately</li>
                                <li><strong>False Reporting:</strong> Misuse of reporting system may result in account penalties</li>
                                <li>All reports are investigated within 24-48 hours</li>
                            </ul>
                        </>
                    }
                />

                <Section
                    title="7. Your Rights"
                    content={
                        <div className="space-y-3">
                            <p>
                                As a user of our platform, you have full control over your personal information. 
                                You have the right to access, update, or delete your account at any time — whether 
                                you registered as a driver or as a regular user.
                            </p>
                            
                            <p>
                                <strong>How to Delete Your Account:</strong>  
                                Once logged in, scroll to the footer and click <em>“Delete Account”</em>. You will be 
                                taken to a secure page where you can permanently remove your account and all related 
                                data from our system.
                            </p>
                            
                            <p>
                                We only store information necessary to operate your account and provide our services 
                                effectively. No data is shared or sold to third parties.
                            </p>
                        </div>
                    }
                />

                <Section
                    title="8. Security"
                    content="We implement strong security measures to prevent unauthorized access, data loss, or misuse. Your information is protected with industry-standard encryption, secure payment processing, and safe handling of all transactions."
                />

                <Section
                    title="9. Platform Integrity"
                    content="We are committed to ensuring a safe platform. Fraudulent activity, impersonation, harassment, violation of our rules, or creating unsafe environments may result in suspension or permanent account removal. We reserve the right to ban users who compromise platform safety."
                />

                <Section
                    title="10. Contact Us"
                    content={
                        <div className="space-y-2">
                            <p>If you have questions or concerns about this policy, feel free to reach out:</p>
                            <p><strong>Email:</strong> nomopoventures@yahoo.com</p>
                            <p><strong>Phone:</strong> +234 902 368 8246</p>
                            <p><strong>Emergency Support:</strong> Available 24/7 through in-app emergency button</p>
                        </div>
                    }
                />

                {/* FOOTER */}
                <div className="mt-10 pt-6 border-t border-gray-300 text-center">
                    <p className="text-sm text-gray-500">
                        Last Updated: {lastUpdated}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        &copy; {new Date().getFullYear()} <span className="font-semibold">NOMO CAR</span>.  
                        Your trust and safety remain our top priority.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* REUSABLE SECTION COMPONENT - FIXED HYDRATION ERROR */
function Section({ title, content }: { title: string; content: any }) {
    return (
        <section className="mb-8 p-6 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">{title}</h2>
            <div className="text-gray-700 leading-relaxed">
                {content}
            </div>
        </section>
    );
}