import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';
import { Check, Crown, Users, Trophy, BarChart3, Loader2, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaywallDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPABASE_URL = "https://kmsthmtbvuxmpjzmwybj.supabase.co";

export function PaywallDrawer({ open, onOpenChange }: PaywallDrawerProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const features = [
    { icon: Users, text: t('subscription.feature_1', 'Create unlimited poker clubs') },
    { icon: Crown, text: t('subscription.feature_2', 'Join private clubs with invite codes') },
    { icon: Trophy, text: t('subscription.feature_3', 'Full tournament management') },
    { icon: BarChart3, text: t('subscription.feature_4', 'Track stats and leaderboards') },
    { icon: Gamepad2, text: t('subscription.feature_5', 'Online multiplayer & tournament poker') },
  ];

  const handleSubscribe = async () => {
    if (!session?.access_token) {
      toast.error(t('auth.sign_in_required', 'Please sign in to continue'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: isAnnual ? 'annual' : 'monthly' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(t('subscription.checkout_error', 'Failed to start checkout'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95vh] bg-background overflow-hidden">
        {/* Wrapper for positioning context */}
        <div className="relative h-full w-full">
          {/* Full-screen Hero Image as Background */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={`${SUPABASE_URL}/storage/v1/object/public/graphics/paywall.webp`}
              alt="Poker night"
              className="w-full h-full object-cover"
            />
            {/* Subtle gradient at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>

          {/* Content overlays on top */}
          <div className="relative z-10 h-full flex flex-col px-6">
          {/* Logo at top */}
          <div className="flex justify-center pt-4">
            <Logo />
          </div>
          
          {/* Spacer to push content to bottom */}
          <div className="flex-1" />
          
          <DrawerHeader className="px-0 pt-0 pb-2">
            <DrawerTitle className="text-xl font-bold text-center text-gold-gradient">
              {t('subscription.unlock_title', 'Unlock Your Poker Club')}
            </DrawerTitle>
            <DrawerDescription className="text-center text-muted-foreground text-sm">
              {t('subscription.unlock_subtitle', 'Get full access to all features')}
            </DrawerDescription>
          </DrawerHeader>

          <ul className="space-y-2 mb-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </li>
            ))}
          </ul>

          {/* Plan Toggle */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t('subscription.monthly', 'Monthly')}
            </span>
            <Switch 
              checked={isAnnual} 
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('subscription.yearly', 'Yearly')}
              </span>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                {t('subscription.save_percent', 'Save 45%')}
              </Badge>
            </div>
          </div>

          {/* Plan Card */}
          <Card className="p-3 border-2 border-primary bg-card/50 backdrop-blur-sm mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{t('subscription.plan_name', 'Home Hold\'em Pro')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('subscription.full_access', 'Full access to all features')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">
                  {isAnnual ? '£12.99' : '£1.99'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAnnual ? t('subscription.per_year', '/year') : t('subscription.per_month', '/mo')}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Check className="w-4 h-4" />
                <span>{t('subscription.trial_included', '7-day free trial included')}</span>
              </div>
            </div>
          </Card>

          {/* CTA Button */}
          <Button 
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full h-11 text-base font-semibold glow-gold"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('common.loading', 'Loading...')}</>
            ) : (
              t('subscription.start_trial', 'Start 7-day free trial')
            )}
          </Button>

          {/* Footer */}
          <div className="pt-3 pb-[10px] space-y-1 text-center">
            <p className="text-xs text-muted-foreground">
              {t('subscription.cancel_anytime', 'Cancel anytime.')} {isAnnual 
                ? t('subscription.after_trial_yearly', 'After 7 days, charged annually.') 
                : t('subscription.after_trial_monthly', 'After 7 days, charged monthly.')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('subscription.terms_agreement', 'By continuing, you agree to our Terms, Privacy Policy & EULA.')}
            </p>
          </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
