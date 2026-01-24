import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Info, LogOut, Mail, Lock, BookOpen, Crown, Loader2 } from 'lucide-react';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { EmailNotificationSettings } from '@/components/settings/EmailNotificationSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { getAppUrl } from '@/lib/app-url';

export default function Settings() {
  const { t } = useTranslation();
  const { user, signOut, session } = useAuth();
  const { isActive, isTrialing, daysRemaining, plan, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error(t('subscription.checkout_error'));
    } finally {
      setManagingSubscription(false);
    }
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
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
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
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

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

        {/* Subscription Card */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {t('subscription.current_plan', 'Subscription')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isActive ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('subscription.plan_name')}</p>
                    <p className="text-sm text-muted-foreground capitalize">{plan}</p>
                  </div>
                  <Badge variant="default" className="bg-primary">
                    {isTrialing ? t('subscription.trial_ends_in', { days: daysRemaining }) : t('subscription.renews_in', { days: daysRemaining })}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={managingSubscription}
                >
                  {managingSubscription ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.loading')}</>
                  ) : (
                    t('subscription.manage_subscription')
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('subscription.subscription_required')}
                </p>
                <Button className="w-full glow-gold" onClick={() => setPaywallOpen(true)}>
                  <Crown className="mr-2 h-4 w-4" />
                  {t('subscription.upgrade_to_access')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <LanguageSettings />

        <CurrencySettings />

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

      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
