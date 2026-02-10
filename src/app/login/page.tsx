"use client";

import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { signInAction } from "@/actions/auth";
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

const initialState = { status: "idle" as const, message: "" };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign In"}
        </Button>
    );
}

export default function LoginPage() {
    const [state, formAction] = useFormState(signInAction, initialState);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-green-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2 text-4xl">🍍</div>
                    <CardTitle className="text-2xl font-bold">
                        Welcome back to Vamo
                    </CardTitle>
                    <CardDescription>
                        Sign in to continue building your startup
                    </CardDescription>
                </CardHeader>
                <form action={formAction}>
                    <CardContent className="space-y-4">
                        {state.status === "error" && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {state.message}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
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
                                autoComplete="current-password"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <SubmitButton />
                        <p className="text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/signup"
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Sign up
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
