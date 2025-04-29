import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../../api/api-library';
import { GoogleSignIn } from '../../components/google-sign-in';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/useToast';
import { useUser } from '../../hooks/useUser';
import { cn } from '../../utils/cn';

export default function LoginPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { initializeUserContextData } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);

    const { data: loggedInSuccessfully, error } = await api.auth.loginWithEmail(
      {
        email,
        password,
      },
    );

    if (loggedInSuccessfully) {
      await initializeUserContextData();
    } else if (error) {
      if (error === 'Email not verified') {
        navigate(`/confirm-email?email=${email}`, { replace: true });
      } else if (error.includes('Too Many Requests')) {
        toast({
          title: 'Too many requests, please try again later.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Invalid credentials',
          variant: 'destructive',
        });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="container relative h-dvh flex flex-col items-center justify-center overflow-y-auto">
      <Link
        to="/welcome"
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute right-4 top-4 md:right-8 md:top-8',
        )}
      >
        Create Account
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col items-center space-y-2 text-center">
          <img
            src="branding/logo.png"
            className="size-20"
            alt="Lecca.io Logo"
          />
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back to Lecca.io
          </p>
        </div>
        <div className={cn('grid gap-6')}>
          <form onSubmit={onSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                  Email
                </Label>
                <Input
                  autoFocus
                  id="email"
                  type="email"
                  placeholder="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button loading={isSubmitting}>Login</Button>
            </div>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid gap-4">
            <GoogleSignIn />
            <Button
              variant="ghost"
              type="button"
              className="text-muted-foreground"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
