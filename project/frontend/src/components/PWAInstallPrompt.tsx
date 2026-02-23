import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share, PlusSquare, MoreVertical, ChevronUp } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect browser and platform
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(ua);
  const isSamsungBrowser = /SamsungBrowser/.test(ua);
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
  
  return { isIOS, isAndroid, isSafari, isChrome, isFirefox, isSamsungBrowser, isMobile, isStandalone };
};

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof getBrowserInfo> | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const info = getBrowserInfo();
    setBrowserInfo(info);

    // Check if already installed
    if (info.isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      // Don't show again for 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // For browsers that support beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 seconds on mobile, 5 seconds on desktop
      setTimeout(() => {
        setShowPrompt(true);
      }, info.isMobile ? 3000 : 5000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', handleAppInstalled);

    // For Safari/iOS - show manual instructions after delay
    if (info.isIOS || (info.isSafari && !info.isChrome)) {
      setTimeout(() => {
        setShowPrompt(true);
      }, info.isMobile ? 3000 : 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt || !browserInfo) {
    return null;
  }

  const showIOSInstructions = browserInfo.isIOS;
  const showAndroidChromeInstructions = browserInfo.isAndroid && !deferredPrompt;
  const showSafariInstructions = browserInfo.isSafari && !browserInfo.isIOS && !deferredPrompt;
  const showNativePrompt = deferredPrompt !== null;
  const isMobile = browserInfo.isMobile;

  // Minimized view for mobile
  if (!isExpanded && isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div 
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between cursor-pointer active:bg-blue-700"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Install CameraLK Tasks</p>
              <p className="text-xs text-blue-100">Tap to see how</p>
            </div>
          </div>
          <ChevronUp className="w-5 h-5" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={handleDismiss}
        />
      )}
      
      {/* Main prompt */}
      <div className={`
        fixed z-50 
        ${isMobile 
          ? 'bottom-0 left-0 right-0 rounded-t-3xl safe-area-bottom animate-slide-up-mobile' 
          : 'bottom-4 right-4 max-w-sm rounded-2xl animate-slide-up'
        }
      `}>
        <div className={`
          bg-white shadow-2xl 
          ${isMobile ? 'rounded-t-3xl px-5 pt-3 pb-6' : 'rounded-2xl p-5 border border-gray-200'}
        `}>
          {/* Drag handle for mobile */}
          {isMobile && (
            <div className="flex justify-center mb-3">
              <div 
                className="w-12 h-1.5 bg-gray-300 rounded-full cursor-pointer"
                onClick={() => setIsExpanded(false)}
              />
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`
                bg-gradient-to-br from-blue-500 to-blue-600 
                ${isMobile ? 'p-3 rounded-2xl' : 'p-2.5 rounded-xl'}
              `}>
                <Smartphone className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} text-white`} />
              </div>
              <div>
                <h3 className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-base'}`}>
                  Install App
                </h3>
                <p className={`text-gray-500 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                  CameraLK Tasks
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className={`
                text-gray-400 hover:text-gray-600 transition-colors 
                ${isMobile ? 'p-2 -mr-2 -mt-1 active:bg-gray-100 rounded-full' : 'p-1'}
              `}
              aria-label="Dismiss"
            >
              <X className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
            </button>
          </div>

          {/* iOS Safari Instructions */}
          {showIOSInstructions && (
            <div className="space-y-4">
              <p className={`text-gray-600 ${isMobile ? 'text-base' : 'text-sm'}`}>
                Install for quick access & offline support:
              </p>
              <div className={`bg-gray-50 rounded-2xl ${isMobile ? 'p-4' : 'p-3'} space-y-3`}>
                {/* Step 1 */}
                <div className={`flex items-center gap-4 ${isMobile ? 'py-1' : ''}`}>
                  <div className={`
                    bg-blue-100 flex-shrink-0
                    ${isMobile ? 'p-3 rounded-xl' : 'p-2 rounded-lg'}
                  `}>
                    <Share className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-blue-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      <span className="font-bold text-blue-600">1.</span> Tap the{' '}
                      <span className="font-semibold">Share</span> button
                    </p>
                    {isMobile && (
                      <p className="text-xs text-gray-500 mt-0.5">At the bottom of your screen</p>
                    )}
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className={`flex items-center gap-4 ${isMobile ? 'py-1' : ''}`}>
                  <div className={`
                    bg-blue-100 flex-shrink-0
                    ${isMobile ? 'p-3 rounded-xl' : 'p-2 rounded-lg'}
                  `}>
                    <PlusSquare className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-blue-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      <span className="font-bold text-blue-600">2.</span> Tap{' '}
                      <span className="font-semibold">"Add to Home Screen"</span>
                    </p>
                    {isMobile && (
                      <p className="text-xs text-gray-500 mt-0.5">Scroll down if needed</p>
                    )}
                  </div>
                </div>
                
                {/* Step 3 */}
                <div className={`flex items-center gap-4 ${isMobile ? 'py-1' : ''}`}>
                  <div className={`
                    bg-green-100 flex-shrink-0
                    ${isMobile ? 'p-3 rounded-xl' : 'p-2 rounded-lg'}
                  `}>
                    <Download className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-green-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      <span className="font-bold text-green-600">3.</span> Tap{' '}
                      <span className="font-semibold">"Add"</span>
                    </p>
                    {isMobile && (
                      <p className="text-xs text-gray-500 mt-0.5">That's it! You're done</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Chrome without native prompt */}
          {showAndroidChromeInstructions && (
            <div className="space-y-4">
              <p className={`text-gray-600 ${isMobile ? 'text-base' : 'text-sm'}`}>
                Install for quick access & offline support:
              </p>
              <div className={`bg-gray-50 rounded-2xl ${isMobile ? 'p-4' : 'p-3'} space-y-3`}>
                <div className={`flex items-center gap-4 ${isMobile ? 'py-1' : ''}`}>
                  <div className={`bg-blue-100 flex-shrink-0 ${isMobile ? 'p-3 rounded-xl' : 'p-2 rounded-lg'}`}>
                    <MoreVertical className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-blue-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      <span className="font-bold text-blue-600">1.</span> Tap{' '}
                      <span className="font-semibold">⋮ menu</span>
                    </p>
                    {isMobile && <p className="text-xs text-gray-500 mt-0.5">Top right corner</p>}
                  </div>
                </div>
                <div className={`flex items-center gap-4 ${isMobile ? 'py-1' : ''}`}>
                  <div className={`bg-blue-100 flex-shrink-0 ${isMobile ? 'p-3 rounded-xl' : 'p-2 rounded-lg'}`}>
                    <PlusSquare className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-blue-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      <span className="font-bold text-blue-600">2.</span> Tap{' '}
                      <span className="font-semibold">"Add to Home screen"</span>
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-4 ${isMobile ? 'py-1' : ''}`}>
                  <div className={`bg-green-100 flex-shrink-0 ${isMobile ? 'p-3 rounded-xl' : 'p-2 rounded-lg'}`}>
                    <Download className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-green-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      <span className="font-bold text-green-600">3.</span> Tap{' '}
                      <span className="font-semibold">"Add"</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Safari Desktop Instructions */}
          {showSafariInstructions && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Add this app to your dock for quick access:
              </p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Share className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-700">
                    <strong>1.</strong> Click <strong>File → Share → Add to Dock</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Download className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">
                    <strong>2.</strong> Click <strong>"Add"</strong> to install
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Native Install Prompt (Chrome, Edge, etc.) */}
          {showNativePrompt && (
            <>
              <p className={`text-gray-600 ${isMobile ? 'text-base mb-5' : 'text-sm mb-4'}`}>
                Add to your home screen for quick access, offline support, and push notifications.
              </p>
              <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                <button
                  onClick={handleInstall}
                  className={`
                    bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                    text-white font-semibold transition-all flex items-center justify-center gap-2
                    active:scale-[0.98] shadow-lg shadow-blue-500/25
                    ${isMobile 
                      ? 'w-full py-4 rounded-xl text-base' 
                      : 'flex-1 px-4 py-2.5 rounded-lg text-sm'
                    }
                  `}
                >
                  <Download className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className={`
                    text-gray-600 hover:text-gray-800 font-medium transition-colors
                    active:bg-gray-100 rounded-xl
                    ${isMobile 
                      ? 'w-full py-3 text-base' 
                      : 'px-4 py-2.5 text-sm'
                    }
                  `}
                >
                  Not now
                </button>
              </div>
            </>
          )}

          {/* Dismiss button for manual instructions */}
          {!showNativePrompt && (
            <button
              onClick={handleDismiss}
              className={`
                w-full text-gray-500 hover:text-gray-700 font-medium transition-colors 
                border border-gray-200 hover:bg-gray-50 active:bg-gray-100
                ${isMobile 
                  ? 'mt-5 py-4 rounded-xl text-base' 
                  : 'mt-4 px-4 py-2.5 rounded-lg text-sm'
                }
              `}
            >
              Maybe later
            </button>
          )}

          {/* Benefits footer */}
          <div className={`border-t border-gray-100 ${isMobile ? 'mt-5 pt-4' : 'mt-3 pt-3'}`}>
            <div className={`flex items-center justify-center gap-2 text-gray-500 ${isMobile ? 'text-sm' : 'text-xs'}`}>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Works offline</span>
              <span className="text-gray-300">•</span>
              <span>Fast</span>
              <span className="text-gray-300">•</span>
              <span>Native feel</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations and safe area */}
      <style>{`
        @keyframes slide-up-mobile {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up-mobile {
          animation: slide-up-mobile 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </>
  );
}
