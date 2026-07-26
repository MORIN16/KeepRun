import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [identifier, setIdentifier] = useState(""); // Email atau Username
  const [password, setPassword] = useState("");

  // Cek Status Autentikasi Pengguna saat pertama kali layar dibuka
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Jika akun adalah GUEST / ANONYMOUS -> Logout otomatis agar bisa memilih Login/Register akun asli
        if (user.isAnonymous) {
          await signOut(auth);
          setLoading(false);
        } else {
          // Jika akun REGULER -> Bypass langsung ke Dashboard Utama
          router.replace("/(tabs)");
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. Handle Login via Email atau Username
  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert("Error", "Harap isi Email/Username dan Password!");
      return;
    }

    setLoading(true);

    try {
      let emailToUse = identifier.trim();
      if (!emailToUse.includes("@")) {
        const q = query(
          collection(db, "users"),
          where("username", "==", emailToUse),
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          Alert.alert("Error", "Username tidak ditemukan!");
          setLoading(false);
          return;
        }

        // Ambil email dari dokumen user yang ditemukan
        const userDoc = querySnapshot.docs[0].data();
        emailToUse = userDoc.email;
      }

      // Autentikasi ke Firebase Auth menggunakan email
      await signInWithEmailAndPassword(auth, emailToUse, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Login Error:", error);
      Alert.alert("Gagal Login", "Email/Username atau Password salah.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Anonymous / Guest Login
  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Anonymous Login Error:", error);
      Alert.alert("Error", "Gagal masuk sebagai Tamu.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.appTitle}>KEEP RUN</Text>
        <Text style={styles.subtitle}>Track your runs in style</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>LOGIN</Text>

        {/* Form Input Email / Username */}
        <Text style={styles.label}>EMAIL OR USERNAME</Text>
        <TextInput
          style={styles.input}
          placeholder="runner@example.com or runner123"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
        />

        {/* Form Input Password */}
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Masukkan Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Tombol Login */}
        <Pressable
          style={({ pressed }) => [
            styles.retroButton,
            {
              backgroundColor: "#4ADE80",
              transform: [{ translateY: pressed ? 4 : 0 }],
            },
          ]}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>LOGIN</Text>
        </Pressable>

        {/* Tombol Register */}
        <Pressable
          style={({ pressed }) => [
            styles.retroButton,
            {
              backgroundColor: "#FFF",
              transform: [{ translateY: pressed ? 4 : 0 }],
            },
          ]}
          onPress={() => router.push("/register" as any)}
        >
          <Text style={styles.buttonText}>REGISTER</Text>
        </Pressable>

        {/* Link Text Masuk Sebagai Tamu (Anonymous) */}
        <Pressable onPress={handleAnonymousLogin} style={styles.guestButton}>
          <Text style={styles.guestText}>Masuk sebagai Tamu (Anonymous)</Text>
        </Pressable>

        {/* Tombol Kembali ke Landing */}
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.cancelText}>KEMBALI KE LANDING</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF9",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666666",
    marginTop: 4,
  },
  card: {
    borderWidth: 4,
    borderColor: "#000000",
    padding: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    marginBottom: 6,
  },
  input: {
    borderWidth: 3,
    borderColor: "#000000",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
  },
  retroButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: "#000000",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
  },
  guestButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  guestText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000000",
    textDecorationLine: "underline",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7F7F7F",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
