import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function RegisterScreen() {
  const router = useRouter();

  // State Form
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<"Men" | "Woman" | "Not Specified">(
    "Not Specified",
  );
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Validasi Input
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Harap isi semua kolom wajib!");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Konfirmasi password tidak cocok!");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter!");
      return;
    }

    setLoading(true);

    try {
      // 2. Buat Akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 3. Update Display Name di Auth
      await updateProfile(user, {
        displayName: username,
      });

      // 4. Simpan Data Profil Lengkap ke Firestore (Koleksi "users")
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: email,
        gender: gender,
        weightKg: weight ? parseFloat(weight) : null,
        heightCm: height ? parseFloat(height) : null,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Berhasil", "Akun berhasil dibuat!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error: any) {
      console.error("Register Error:", error);
      Alert.alert("Gagal Mendaftar", error.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.appTitle}>CREATE ACCOUNT</Text>
        <Text style={styles.subtitle}>Join Keep Run Community</Text>
      </View>

      <View style={styles.card}>
        {/* Username */}
        <Text style={styles.label}>USERNAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. runner_mvs"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        {/* Email */}
        <Text style={styles.label}>EMAIL *</Text>
        <TextInput
          style={styles.input}
          placeholder="runner@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password */}
        <Text style={styles.label}>PASSWORD *</Text>
        <TextInput
          style={styles.input}
          placeholder="Min. 6 Karakter"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Re-Password */}
        <Text style={styles.label}>RE-PASSWORD *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ulangi Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {/* Gender Selection */}
        <Text style={styles.label}>GENDER</Text>
        <View style={styles.genderRow}>
          {(["Men", "Woman", "Not Specified"] as const).map((item) => (
            <Pressable
              key={item}
              style={[
                styles.genderOption,
                gender === item && styles.genderOptionActive,
              ]}
              onPress={() => setGender(item)}
            >
              <Text style={styles.genderText}>
                {item === "Not Specified" ? "Skip" : item}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Weight & Height (Row) */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>WEIGHT (KG)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 65"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>HEIGHT (CM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 170"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.retroButton,
            { transform: [{ translateY: pressed ? 4 : 0 }] },
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "REGISTERING..." : "REGISTER"}
          </Text>
        </Pressable>

        {/* Kembali ke Auth */}
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>SUDAH PUNYA AKUN? LOGIN</Text>
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
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 1,
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
    padding: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  genderOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#000000",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#FFFDF9",
  },
  genderOptionActive: {
    backgroundColor: "#4ADE80",
  },
  genderText: {
    fontSize: 11,
    fontWeight: "900",
  },
  retroButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: "#000000",
    backgroundColor: "#4ADE80",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7F7F7F",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
