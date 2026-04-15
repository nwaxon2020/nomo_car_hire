"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAContextType {
    deferredPrompt: BeforeInstallPromptEvent | null;
    installApp: () => Promise<void>;
    isInstallable: boolean;
    installing: boolean;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installing, setInstalling] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);
    const [manualFallback, setManualFallback] = useState(false);

    useEffect(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().catch(() => { });
        }
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
            setManualFallback(false);
        };

        window.addEventListener("beforeinstallprompt", handler);

        const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
        const isInstalled = localStorage.getItem("pwa_installed") === "true";

        if (isStandalone || isInstalled) {
            setIsInstallable(false);
            return;
        }

        const timeout = setTimeout(() => {
            if (!deferredPrompt && !isStandalone && !isInstalled) {
                setManualFallback(true);
                setIsInstallable(true);
            }
        }, 5000);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const installApp = async () => {
        if (deferredPrompt) {
            setInstalling(true);
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                localStorage.setItem("pwa_installed", "true");
                setIsInstallable(false);
            }
            setDeferredPrompt(null);
            setInstalling(false);
            return;
        }

        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);

        let message = "";

        if (isAndroid && isChrome) {
            message = "📱 To install Nomo Cars on Android Chrome:\n\n1. Tap the menu (⋮) in the top right\n2. Tap 'Install app'\n3. Tap 'Install' on the popup\n\nThe app will appear on your home screen!";
        } else if (isAndroid) {
            message = "📱 To install Nomo Cars on Android:\n\n1. Tap the menu (⋮) in your browser\n2. Look for 'Install app' or 'Add to Home screen'\n3. Follow the prompts to install";
        } else if (isIOS) {
            message = "🍎 To install Nomo Cars on iPhone/iPad:\n\n1. Tap the Share button (⬆️) at the bottom\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' in the top right corner\n\nThe app will appear on your home screen!";
        } else {
            message = "💻 To install this app:\n\n• Chrome/Edge: Click the install icon (⊕) in the address bar\n• Firefox: Click the '+' icon and select 'Install'\n• Safari: Click Share → 'Add to Home Screen'";
        }

        alert(message);
    };

    return (
        <PWAContext.Provider value={{ deferredPrompt, installApp, isInstallable, installing }}>
            {children}
        </PWAContext.Provider>
    );
}

export function usePWA() {
    const context = useContext(PWAContext);
    if (context === undefined) {
        throw new Error("usePWA must be used within a PWAProvider");
    }
    return context;
}

export { PWAContext };