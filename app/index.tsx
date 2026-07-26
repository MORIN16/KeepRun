import { useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function LandingPage() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/auth" as any);
  };

  return (
    <ImageBackground
      source={require("@/assets/images/landing.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlayContainer}>
        <View style={styles.bubbleWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.retroBubble,
              {
                transform: [
                  { translateY: pressed ? 4 : 0 },
                  { translateX: pressed ? 4 : 0 },
                ],
              },
            ]}
            onPress={handleStart}
          >
            <Text style={styles.buttonText}>START RUNNING!</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "flex-end", // Mendorong ke bawah
    alignItems: "flex-end", // Mendorong ke kanan
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  bubbleWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  retroBubble: {
    backgroundColor: "#4ADE80", // Warna Hijau Neon Retro
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderWidth: 3,
    borderColor: "#000000",

    // Simetris tanpa ekor (rounded pill-ish shape)
    borderRadius: 20,

    // Neo-Brutalism Shadow
    shadowColor: "#000000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 0.5,
  },
});
