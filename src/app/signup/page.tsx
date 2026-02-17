"use client";

import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

import { signUpAction, signInWithGoogle } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LAST_SIGNIN_KEY = "vamo_last_signin_method";

const initialState = { status: "idle" as const, message: "" };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create Account"}
        </Button>
    );
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

function LastUsedBadge() {
    return (
        <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Last used
        </span>
    );
}

export default function SignupPage() {
    const [state, formAction] = useFormState(signUpAction, initialState);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [lastMethod, setLastMethod] = useState<string | null>(null);

    useEffect(() => {
        setLastMethod(localStorage.getItem(LAST_SIGNIN_KEY));
    }, []);

    async function handleGoogleSignIn() {
        setGoogleLoading(true);
        localStorage.setItem(LAST_SIGNIN_KEY, "google");
        try {
            const result = await signInWithGoogle(window.location.origin);
            if (result.url) {
                window.location.href = result.url;
            } else {
                setGoogleLoading(false);
            }
        } catch {
            setGoogleLoading(false);
        }
    }

    function handleEmailFormAction(formData: FormData) {
        localStorage.setItem(LAST_SIGNIN_KEY, "email");
        formAction(formData);
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-green-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex justify-center">
                        <Image
                            src="/vamo_logo.png"
                            alt="Vamo Logo"
                            width={48}
                            height={48}
                            className="w-12 h-12"
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold">Join Vamo</CardTitle>
                    <CardDescription>
                        Create an account and start building your startup
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Google OAuth */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={googleLoading}
                        onClick={handleGoogleSignIn}
                    >
                        <GoogleIcon />
                        {googleLoading ? "Redirecting…" : "Continue with Google"}
                        {lastMethod === "google" && <LastUsedBadge />}
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                or continue with email
                            </span>
                        </div>
                    </div>

                    {/* Email/Password form */}
                    <form action={handleEmailFormAction} className="space-y-4">
                        {state.status === "error" && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {state.message}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                Email
                                {lastMethod === "email" && <LastUsedBadge />}
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                            <p className="text-xs text-muted-foreground">
                                Must be at least 6 characters
                            </p>
                        </div>
                        <SubmitButton />
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
