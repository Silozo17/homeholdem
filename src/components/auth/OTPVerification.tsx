import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAppUrl } from '@/lib/app-url';

interface OTPVerificationProps {
  email: string;
  password: string;
  displayName: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function OTPVerification({ email, password, displayName, onSuccess, onBack }: OTPVerificationProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error(t('auth.otp_enter_code'));
      return;
    }

    setIsVerifying(true);
    try {
      // Verify OTP via edge function
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, code },
      });

      if (error || !data?.success) {
        toast.error(data?.error || t('auth.otp_invalid'));
        setIsVerifying(false);
        return;
      }

      // OTP verified - now create the actual account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAppUrl(),
          data: {
            display_name: displayName,
          },
        },
      });

      if (signUpError) {
        toast.error(signUpError.message);
        setIsVerifying(false);
        return;
      }

      toast.success(t('auth.account_created'));
      onSuccess();
    } catch (err) {
      console.error('Verification error:', err);
      toast.error(t('common.error'));
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, name: displayName },
      });

      if (error || !data?.success) {
        toast.error(data?.error || t('auth.otp_resend_failed'));
      } else {
        toast.success(t('auth.otp_new_sent'));
        setCountdown(60); // 60 second cooldown
        setCode('');
      }
    } catch (err) {
      console.error('Resend error:', err);
      toast.error(t('auth.otp_resend_failed'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.back')}
        </Button>
        <div className="text-4xl mb-2">🔐</div>
        <CardTitle className="text-xl">{t('auth.check_email')}</CardTitle>
        <CardDescription className="text-sm">
          {t('auth.otp_sent_to')}<br />
          <span className="text-foreground font-medium">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
            disabled={isVerifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-11 h-12 text-lg border-border bg-background" />
              <InputOTPSlot index={1} className="w-11 h-12 text-lg border-border bg-background" />
              <InputOTPSlot index={2} className="w-11 h-12 text-lg border-border bg-background" />
              <InputOTPSlot index={3} className="w-11 h-12 text-lg border-border bg-background" />
              <InputOTPSlot index={4} className="w-11 h-12 text-lg border-border bg-background" />
              <InputOTPSlot index={5} className="w-11 h-12 text-lg border-border bg-background" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          className="w-full"
          disabled={code.length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.verifying')}
            </>
          ) : (
            t('auth.verify_create')
          )}
        </Button>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={countdown > 0 || isResending}
            className="text-muted-foreground hover:text-foreground"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                {t('auth.sending')}
              </>
            ) : countdown > 0 ? (
              t('auth.resend_countdown', { seconds: countdown })
            ) : (
              <>
                <RefreshCw className="mr-2 h-3 w-3" />
                {t('auth.resend_code')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
