import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share, Plus, Check, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function Install() {
  const { t } = useTranslation();
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
            <CardTitle>{t('install.already_installed')}</CardTitle>
            <CardDescription>
              {t('install.installed_description')}
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
        <h1 className="text-2xl font-bold">{t('install.title')}</h1>
        <p className="text-muted-foreground">
          {t('install.description')}
        </p>
      </div>

      {isIOS ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('install.ios_title')}</CardTitle>
            <CardDescription>{t('install.ios_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('install.ios_step1')}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {t('install.ios_step1_detail')} <Share className="h-4 w-4" />
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                2
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('install.ios_step2')}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {t('install.ios_step2_detail')} <Plus className="h-4 w-4" />
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                3
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('install.ios_step3')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('install.ios_step3_detail')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isInstallable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('install.ready_to_install')}</CardTitle>
            <CardDescription>{t('install.one_tap')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={install} className="w-full" size="lg">
              <Download className="h-5 w-5 mr-2" />
              {t('install.install_app')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('install.android_title')}</CardTitle>
            <CardDescription>{t('install.android_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('install.android_step1')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('install.android_step1_detail')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                2
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('install.android_step2')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('install.android_step2_detail')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium shrink-0">
                3
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('install.android_step3')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('install.android_step3_detail')}
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
              <p className="font-medium text-sm">{t('install.works_offline')}</p>
              <p className="text-xs text-muted-foreground">{t('install.offline_description')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('install.quick_access')}</p>
              <p className="text-xs text-muted-foreground">{t('install.quick_description')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('install.push_notifications')}</p>
              <p className="text-xs text-muted-foreground">{t('install.push_description')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
