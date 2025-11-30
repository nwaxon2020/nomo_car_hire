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
                    Your privacy is extremely important to us. Please read this policy to understand how we handle and protect your information.
                </p>

                {/* SECTIONS */}
                <Section
                    title="1. Data Collection"
                    content="We collect information that you provide directly, such as your name, email, phone number, vehicle details, and uploaded images. We may also collect usage data to improve our services."
                />

                <Section
                    title="2. Use of Information"
                    content="Your information is used to process bookings, improve platform experience, enhance security, communicate with you, and maintain a reliable service for all users."
                />

                <Section
                    title="3. Sharing of Data"
                    content="We do not sell your personal information. Data may be shared with trusted partners or legal authorities only when required to maintain user safety or comply with the law."
                />

                <Section
                    title="4. Your Rights"
                    content={
                        <>
                            <p>
                                As a user of our platform, you have full control over your personal information. 
                                You have the right to access, update, or delete your account at any time — whether 
                                you registered as a driver or as a regular user.
                                <br /><br />
                                <strong>How to Delete Your Account:</strong>  
                                Once logged in, scroll to the footer and click <em>“Delete Account”</em>. You will be 
                                taken to a secure page where you can permanently remove your account and all related 
                                data from our system.
                                <br /><br />
                                We only store information necessary to operate your account and provide our services 
                                effectively. No data is shared or sold to third parties.
                            </p>
                        </>
                    }
                />

                <Section
                    title="5. Security"
                    content="We implement strong security measures to prevent unauthorized access, data loss, or misuse. Your information is protected with industry-standard encryption and secure handling."
                />

                <Section
                    title="6. Platform Integrity"
                    content="We are committed to ensuring a safe platform. Fraudulent activity, impersonation, or violation of our rules may result in suspension or permanent account removal."
                />

                <Section
                    title="7. Contact Us"
                    content={
                        <>
                            If you have questions or concerns about this policy, feel free to reach out:
                            <br />
                            <strong>Email:</strong> nomopoventures@yahoo.com <br />
                            <strong>Phone:</strong> +234 902 368 8246
                        </>
                    }
                />

                {/* FOOTER */}
                <div className="mt-10 pt-6 border-t border-gray-300 text-center">
                    <p className="text-sm text-gray-500">
                        Last Updated: {lastUpdated}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        &copy; {new Date().getFullYear()} <span className="font-semibold">NOMO CARS</span>.  
                        Your trust and safety remain our top priority.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* REUSABLE SECTION COMPONENT */
function Section({ title, content }: { title: string; content: any }) {
    return (
        <section className="mb-8 p-6 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">{title}</h2>
            <p className="text-gray-700 leading-relaxed">{content}</p>
        </section>
    );
}
