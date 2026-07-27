import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SettingsScreen() {
  const theme = Colors.light;
  const router = useRouter();
  const user = auth.currentUser;

  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Male");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // Target KM Box State
  const [targetKm, setTargetKm] = useState<number>(2);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customKmInput, setCustomKmInput] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username || "");
          setGender(data.gender || "Male");
          setWeight(data.weight ? String(data.weight) : "");
          setHeight(data.height ? String(data.height) : "");
          setTargetKm(data.targetKm || 2);
        }
      } catch (err) {
        console.error("Gagal memuat data settings:", err);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        username: username,
        gender: gender,
        weight: weight,
        height: height,
        targetKm: targetKm,
      });

      Alert.alert("Sukses", "Pengaturan profil & target berhasil disimpan!");
      router.back();
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustomKm = () => {
    const parsed = parseFloat(customKmInput);
    if (!isNaN(parsed) && parsed > 0) {
      setTargetKm(parsed);
      setIsCustomMode(false);
    } else {
      Alert.alert("Invalid Input", "Masukkan angka KM yang valid.");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ fontWeight: "900" }}>{"<"} KEMBALI</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      {/* Section User Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PROFIL USER</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
        />

        <Text style={styles.label}>Email (Read-only)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#E5E7EB" }]}
          value={email}
          editable={false}
        />

        <Text style={styles.label}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {["Male", "Female"].map((g) => (
            <Pressable
              key={g}
              style={[
                styles.genderOption,
                gender === g && { backgroundColor: theme.primary },
              ]}
              onPress={() => setGender(g)}
            >
              <Text style={{ fontWeight: "900" }}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="60"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="170"
            />
          </View>
        </View>
      </View>

      {/* Target KM Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>SETTING TARGET LARI HARIAN</Text>

        {/* Display Box Target */}
        <View style={styles.displayTargetBox}>
          <Text style={styles.displayTargetSub}>TARGET DIPILIH</Text>
          <Text style={styles.displayTargetValue}>
            {targetKm.toFixed(1)} KM
          </Text>
        </View>

        {/* Slider / Custom Input Switcher */}
        {!isCustomMode ? (
          <View style={{ marginVertical: 16 }}>
            <Slider
              minimumValue={1}
              maximumValue={20}
              step={0.5}
              value={targetKm}
              onValueChange={(val) => setTargetKm(val)}
              minimumTrackTintColor="#000000"
              maximumTrackTintColor="#D1D5DB"
              thumbTintColor="#000000"
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontWeight: "700" }}>1 KM</Text>
              <Text style={{ fontWeight: "700" }}>20 KM</Text>
            </View>
          </View>
        ) : (
          <View style={{ marginVertical: 12 }}>
            <Text style={styles.label}>Ketik Target KM Custom:</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={customKmInput}
                onChangeText={setCustomKmInput}
                keyboardType="numeric"
                placeholder="Contoh: 3.5"
              />
              <Pressable
                style={styles.customApplyBtn}
                onPress={handleApplyCustomKm}
              >
                <Text style={{ fontWeight: "900", color: "#FFF" }}>OK</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Action Buttons: Custom Toggle & Select Confirmation */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <Pressable
            style={styles.customToggleBtn}
            onPress={() => setIsCustomMode(!isCustomMode)}
          >
            <Text style={{ fontWeight: "900", fontSize: 12 }}>
              {isCustomMode ? "GUNAKAN SLIDER" : "CUSTOM KETIK"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Save Button */}
      <Pressable
        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        onPress={handleSaveSettings}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>
          {saving ? "SAVING..." : "SIMPAN PERUBAHAN"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButton: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 8,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", marginLeft: 16 },
  card: {
    borderWidth: 3,
    borderColor: "#000",
    backgroundColor: "#FFF",
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 4,
    color: "#333",
  },
  input: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 10,
    fontWeight: "700",
    backgroundColor: "#FFF",
  },
  genderOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#000",
    padding: 10,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  displayTargetBox: {
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#F3F4F6",
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  displayTargetSub: { fontSize: 10, fontWeight: "800", color: "#666" },
  displayTargetValue: { fontSize: 28, fontWeight: "900", marginTop: 2 },
  customToggleBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#000",
    padding: 10,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  customApplyBtn: {
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#000",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  saveBtn: {
    borderWidth: 3,
    borderColor: "#000",
    padding: 16,
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: "900" },
});
