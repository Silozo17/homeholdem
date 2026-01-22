import { useEffect } from 'react';
import { Download, Share, Plus, Check, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function Install() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    // Auto-trigger install on Android/Chrome if available
    if (isInstallable && !isIOS) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        install();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isIOS, install]);

  if (isInstalled) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-500/10 rounded-full p-4 w-fit mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>Already Installed!</CardTitle>
            <CardDescription>
              Home Hold'em Club is installed on your device. You can find it on your home screen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Install the App</h1>
        <p className="text-muted-foreground">
          Get the full app experience with offline access and quick launch from your home screen.
        </p>
      </div>

      {isIOS ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Install on iOS</CardTitle>
            <CardDescription>Follow these steps in Safari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <div className="space-y-1">
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Look for the <Share className="h-4 w-4" /> icon in Safari's toolbar
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                2
              </div>
              <div className="space-y-1">
                <p className="font-medium">Add to Home Screen</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Scroll down and tap <Plus className="h-4 w-4" /> "Add to Home Screen"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                3
              </div>
              <div className="space-y-1">
                <p className="font-medium">Confirm</p>
                <p className="text-sm text-muted-foreground">
                  Tap "Add" in the top right corner
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isInstallable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ready to Install</CardTitle>
            <CardDescription>One tap to add to your home screen</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={install} className="w-full" size="lg">
              <Download className="h-5 w-5 mr-2" />
              Install App
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Install on Android</CardTitle>
            <CardDescription>Follow these steps in Chrome</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <div className="space-y-1">
                <p className="font-medium">Open Chrome menu</p>
                <p className="text-sm text-muted-foreground">
                  Tap the three dots ⋮ in the top right corner
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                2
              </div>
              <div className="space-y-1">
                <p className="font-medium">Install App</p>
                <p className="text-sm text-muted-foreground">
                  Tap "Install app" or "Add to Home screen"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                3
              </div>
              <div className="space-y-1">
                <p className="font-medium">Confirm</p>
                <p className="text-sm text-muted-foreground">
                  Tap "Install" to add the app
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Works offline</p>
              <p className="text-xs text-muted-foreground">Access your clubs and events anytime</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Quick access</p>
              <p className="text-xs text-muted-foreground">Launch directly from your home screen</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Push notifications</p>
              <p className="text-xs text-muted-foreground">Get notified about upcoming games</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
