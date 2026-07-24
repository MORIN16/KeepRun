// app/index.tsx
import Colors from "@/constants/Colors";
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
  const theme = Colors.light;

  const handleStart = () => {
    router.replace("/(tabs)");
  };

  return (
    <ImageBackground
      source={require("@/assets/images/landing.png")}
      style={styles.background}
      resizeMode="cover" // 'cover' membuat gambar memenuhi seluruh layar
    >
      {/* Container transparan di dalam background untuk menata letak teks & tombol */}
      <View style={styles.overlayContainer}>
        <Text style={styles.appTitle}>KEEP RUN</Text>
        <Text style={styles.subtitle}>
          Track your runs, feel the retro vibe.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.retroButton,
            {
              backgroundColor: theme.primary,
              transform: [{ translateY: pressed ? 4 : 0 }],
            },
          ]}
          onPress={handleStart}
        >
          <Text style={styles.buttonText}>START RUNNING</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1, // Agar background memenuhi seluruh layar
    width: "100%",
    height: "100%",
  },
  overlayContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center", // Atau 'flex-end' jika ingin teks/tombol di bagian bawah
    padding: 24,
    // optional: backgroundColor: 'rgba(0,0,0,0.3)', // Jika ingin sedikit efek gelap agar teks lebih terbaca
  },
  appTitle: {
    fontSize: 40,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 2,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  retroButton: {
    width: "100%",
    paddingVertical: 16,
    borderWidth: 3,
    borderColor: "#000000",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "900",
  },
});
