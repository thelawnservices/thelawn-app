import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { GreatVibes_400Regular } from "@expo-google-fonts/great-vibes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/auth";
import { initAnalytics } from "@/utils/analytics";
import { JobsProvider } from "@/contexts/jobs";
import { NotificationsProvider } from "@/contexts/notifications";
import { LandscaperProfileProvider, useLandscaperProfile, SERVICE_BLOCK_MINUTES } from "@/contexts/landscaperProfile";
import { RecurringProvider, useRecurring } from "@/contexts/recurring";
import { WalletProvider } from "@/contexts/wallet";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Short-month lookup for converting recurring dates ("April 18, 2026") to
// the same key format used by bookedSlots ("Apr 18, 2026").
const FULL_TO_SHORT: Record<string, string> = {
  January: "Jan", February: "Feb", March: "Mar",   April: "Apr",
  May:     "May", June:     "Jun", July:    "Jul",  August:    "Aug",
  September:"Sep",October:  "Oct", November:"Nov",  December:  "Dec",
};

/**
 * Invisible bridge component that must live inside BOTH RecurringProvider
 * and LandscaperProfileProvider.  It mirrors every active recurring instance
 * as a booked slot so customers cannot book that landscaper during those
 * times, and frees the slot when an instance is completed / disputed.
 */
function RecurringSlotSyncer() {
  const { instances } = useRecurring();
  const { addBookedSlot, removeBookedSlot } = useLandscaperProfile();

  // Track which instance IDs we have registered so we only call
  // addBookedSlot once per instance and remove when status changes.
  const registeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    instances.forEach((inst) => {
      const done = inst.status === "completed" || inst.status === "disputed";
      const parts = inst.date.split(/[\s,]+/).filter(Boolean);
      const shortMonth = FULL_TO_SHORT[parts[0]] ?? parts[0];
      const dateKey = `${shortMonth} ${parts[1]}, ${parts[2]}`;
      const duration = SERVICE_BLOCK_MINUTES[inst.service] ?? 60;

      if (done) {
        // Release the slot if we previously blocked it
        if (registeredRef.current.has(inst.id)) {
          removeBookedSlot(dateKey, inst.time);
          registeredRef.current.delete(inst.id);
        }
      } else {
        // Block the slot (addBookedSlot is idempotent internally)
        if (!registeredRef.current.has(inst.id)) {
          addBookedSlot(dateKey, inst.time, duration, inst.service);
          registeredRef.current.add(inst.id);
        }
      }
    });
  }, [instances, addBookedSlot, removeBookedSlot]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pay" options={{ headerShown: false, animation: "slide_from_bottom", presentation: "modal" }} />
      <Stack.Screen name="dispute" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    GreatVibes_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    initAnalytics().catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <WalletProvider>
            <JobsProvider>
              <RecurringProvider>
              <NotificationsProvider>
              <LandscaperProfileProvider>
              <RecurringSlotSyncer />
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
              </LandscaperProfileProvider>
              </NotificationsProvider>
              </RecurringProvider>
            </JobsProvider>
            </WalletProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
