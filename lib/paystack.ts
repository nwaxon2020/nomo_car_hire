declare global {
  interface Window {
    PaystackPop: any;
  }
}

export const loadPaystackScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.PaystackPop) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    document.body.appendChild(script);
  });
};

interface PaystackPaymentProps {
  email: string;
  amount: number;
  metadata: any;
  onSuccess: (response: any) => void;
  onClose: () => void;
}

export const initiatePaystackPayment = async ({
  email,
  amount,
  metadata,
  onSuccess,
  onClose,
}: PaystackPaymentProps) => {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  
  if (!publicKey) {
    throw new Error("Paystack Public Key is missing in environment variables.");
  }

  if (typeof window !== "undefined" && window.PaystackPop) {
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100), // Amount in kobo
      metadata,
      callback: (response: any) => {
        onSuccess(response);
      },
      onClose: () => {
        onClose();
      },
    });

    handler.openIframe();
  } else {
    throw new Error("Paystack script not loaded.");
  }
};
