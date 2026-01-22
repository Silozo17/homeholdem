import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
    setIsDismissed(true);
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setIsDismissed(true);
    }
  };

  // Don't show if already installed, dismissed, or not installable (except iOS)
  if (isInstalled || isDismissed) return null;
  if (!isInstallable && !isIOS) return null;

  // iOS instructions modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card rounded-lg p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Install on iOS</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowIOSInstructions(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium shrink-0">1</span>
              <p>Tap the <Share className="inline h-4 w-4" /> Share button in Safari's toolbar</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium shrink-0">2</span>
              <p>Scroll down and tap "Add to Home Screen"</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium shrink-0">3</span>
              <p>Tap "Add" in the top right corner</p>
            </div>
          </div>
          <Button className="w-full" onClick={() => setShowIOSInstructions(false)}>
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-card border rounded-lg p-4 shadow-lg flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg p-2">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Install Home Hold'em Club</p>
          <p className="text-xs text-muted-foreground">Add to home screen for the best experience</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
          {isIOS ? (
            <Button size="sm" onClick={() => setShowIOSInstructions(true)} className="shrink-0">
              How to
            </Button>
          ) : (
            <Button size="sm" onClick={handleInstall} className="shrink-0">
              Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
