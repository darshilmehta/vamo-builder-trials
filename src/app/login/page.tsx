"use client";

import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";
import { useState, useEffect } from "react";
import Link from "next/link";

import { signInAction, signInWithGoogle } from "@/actions/auth";
import { useI18n } from "@/components/I18nProvider";
import { PineapplePhysics } from "@/components/PineapplePhysics";
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
    const { t } = useI18n();
    return (
        <Button type="submit" className="w-full gradient-orange text-white border-0" disabled={pending}>
            {pending ? t("auth.signingIn") : t("auth.signInBtn")}
        </Button>
    );
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

function LastUsedBadge() {
    const { t } = useI18n();
    return (
        <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t("auth.lastUsed")}
        </span>
    );
}

export default function LoginPage() {
    const { t } = useI18n();
    const [state, formAction] = useFormState(signInAction, initialState);
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
        <div className="relative h-screen overflow-hidden flex items-center justify-center bg-background">
            {/* Interactive pineapple background */}
            <PineapplePhysics />

            {/* Auth card */}
            <div className="relative z-10 w-full max-w-md px-4 animate-fade-in-up">
                {/* Back to home */}
                <div className="mb-6 text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <span className="text-lg">🍍</span>
                        <span className="font-bold text-gradient-orange">Vamo</span>
                    </Link>
                </div>

                <Card className="border-primary/10 shadow-lg orange-glow backdrop-blur-sm bg-card/95">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">
                            {t("auth.loginTitle")}
                        </CardTitle>
                        <CardDescription>
                            {t("auth.loginDesc")}
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
                            {googleLoading ? t("auth.redirecting") : t("auth.continueGoogle")}
                            {lastMethod === "google" && <LastUsedBadge />}
                        </Button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                    {t("auth.orEmail")}
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
                                    {t("auth.email")}
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
                                <Label htmlFor="password">{t("auth.password")}</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    autoComplete="current-password"
                                />
                            </div>
                            <SubmitButton />
                        </form>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <p className="text-sm text-muted-foreground">
                            {t("auth.noAccount")}{" "}
                            <Link
                                href="/signup"
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                {t("auth.signUpLink")}
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
