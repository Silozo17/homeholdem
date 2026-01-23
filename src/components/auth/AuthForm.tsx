import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { OTPVerification } from './OTPVerification';

export function AuthForm() {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState<{ email: string; password: string; displayName: string } | null>(null);
  const { signIn } = useAuth();

  const signInSchema = z.object({
    email: z.string().email(t('validation.email_invalid')),
    password: z.string().min(6, t('validation.password_min')),
  });

  const signUpSchema = signInSchema.extend({
    displayName: z.string().min(2, t('validation.display_name_min')).max(50),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwords_no_match'),
    path: ['confirmPassword'],
  });

  type SignInFormData = z.infer<typeof signInSchema>;
  type SignUpFormData = z.infer<typeof signUpSchema>;

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', displayName: '' },
  });

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('auth.welcome_back'));
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    
    try {
      // Send OTP email instead of creating account directly
      const { data: otpResponse, error } = await supabase.functions.invoke('send-otp', {
        body: { email: data.email, name: data.displayName },
      });

      if (error || !otpResponse?.success) {
        toast.error(otpResponse?.error || t('auth.otp_send_failed'));
        setIsLoading(false);
        return;
      }

      // Store pending signup data and show OTP screen
      setPendingSignUp({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      setShowOTP(true);
      toast.success(t('auth.otp_sent'));
    } catch (err) {
      console.error('Signup error:', err);
      toast.error(t('common.error'));
    }
    
    setIsLoading(false);
  };

  const handleOTPSuccess = () => {
    setPendingSignUp(null);
    setShowOTP(false);
    // User is now signed in automatically after account creation
  };

  const handleOTPBack = () => {
    setShowOTP(false);
    setPendingSignUp(null);
  };

  // Show OTP verification screen
  if (showOTP && pendingSignUp) {
    return (
      <div className="w-full max-w-md relative">
        <OTPVerification
          email={pendingSignUp.email}
          password={pendingSignUp.password}
          displayName={pendingSignUp.displayName}
          onSuccess={handleOTPSuccess}
          onBack={handleOTPBack}
        />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-gold-gradient">
          {isSignUp ? t('auth.create_account') : t('auth.welcome_back')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isSignUp 
            ? t('auth.signup_description')
            : t('auth.signin_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSignUp ? (
          <Form {...signUpForm} key="signup-form">
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <FormField
                control={signUpForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.display_name')}</FormLabel>
                    <Input 
                      placeholder={t('auth.display_name_placeholder')}
                      className="bg-input/50 border-border/50 focus:border-primary"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <Input 
                      type="email" 
                      placeholder={t('auth.email_placeholder')}
                      className="bg-input/50 border-border/50 focus:border-primary"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-input/50 border-border/50 focus:border-primary"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.confirm_password')}</FormLabel>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-input/50 border-border/50 focus:border-primary"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full glow-gold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('auth.sending_code')}</>
                ) : (
                  t('auth.create_account')
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signInForm} key="signin-form">
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <Input 
                      type="email" 
                      placeholder={t('auth.email_placeholder')}
                      className="bg-input/50 border-border/50 focus:border-primary"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-input/50 border-border/50 focus:border-primary"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full glow-gold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('auth.signing_in')}</>
                ) : (
                  t('auth.sign_in')
                )}
              </Button>
            </form>
          </Form>
        )}
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignUp 
              ? t('auth.have_account')
              : t('auth.no_account')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
