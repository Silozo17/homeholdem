import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { OTPVerification } from './OTPVerification';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState<{ email: string; password: string; displayName: string } | null>(null);
  const { signIn } = useAuth();

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
      toast.success('Welcome back!');
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
        toast.error(otpResponse?.error || 'Failed to send verification code');
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
      toast.success('Verification code sent to your email!');
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Something went wrong. Please try again.');
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
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isSignUp 
            ? 'Join the club and start hosting poker nights' 
            : 'Sign in to access your poker clubs'}
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
                    <FormLabel>Display Name</FormLabel>
                    <Input 
                      placeholder="Your poker nickname" 
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
                    <FormLabel>Email</FormLabel>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
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
                    <FormLabel>Password</FormLabel>
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
                    <FormLabel>Confirm Password</FormLabel>
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...</>
                ) : (
                  'Create Account'
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
                    <FormLabel>Email</FormLabel>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
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
                    <FormLabel>Password</FormLabel>
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</>
                ) : (
                  'Sign In'
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
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
