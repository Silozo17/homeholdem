import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Info, LogOut, Mail, Lock, BookOpen } from 'lucide-react';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { EmailNotificationSettings } from '@/components/settings/EmailNotificationSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { getAppUrl } from '@/lib/app-url';

export default function Settings() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error(t('settings.failed_reset'));
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: getAppUrl(),
    });

    if (error) {
      toast.error(t('settings.failed_reset'));
    } else {
      toast.success(t('settings.password_reset_sent'));
    }
  };

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gold-gradient">{t('settings.title')}</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('settings.account')}
            </CardTitle>
            <CardDescription>{t('settings.manage_account')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('settings.email')}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>

            <Separator />

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleResetPassword}
            >
              <Lock className="mr-2 h-4 w-4" />
              {t('settings.change_password')}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              {t('settings.edit_profile')}
            </Button>
          </CardContent>
        </Card>

        <LanguageSettings />

        <NotificationSettings />

        <EmailNotificationSettings />

        <PrivacySettings />

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {t('settings.about')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('settings.app_version')}</span>
              <span className="text-sm text-muted-foreground">1.0.0</span>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/rules')}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              {t('settings.texas_holdem_rules')}
            </Button>
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('settings.sign_out')}
        </Button>
      </main>
    </div>
  );
}
