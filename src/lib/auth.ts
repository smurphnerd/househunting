"use client";

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (response.ok) {
    return { success: true };
  }

  const data = await response.json();
  return { success: false, error: data.error || "Invalid password" };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
