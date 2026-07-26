import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Tipe data profil user
interface UserProfile {
  username?: string;
  email?: string;
}

// Tipe data riwayat lari
interface RunHistory {
  id: string;
  distanceKm?: number;
  durationSeconds?: number;
  createdAt?: any;
}

export default function ProfileScreen() {
  const theme = Colors.light;
  const user = auth.currentUser;
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<RunHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Pantau status Auth: Jika logout, langsung redirect ke /auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/auth");
      }
    });

    return unsubscribe;
  }, []);

  // 2. Fetch Data Profil & History Lari
  useEffect(() => {
    const fetchProfileAndHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch data profil
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setProfileData(userDocSnap.data() as UserProfile);
        }

        // Fetch data riwayat lari
        const q = query(
          collection(db, "runs"),
          where("userId", "==", user.uid),
        );
        const querySnapshot = await getDocs(q);

        const runs: RunHistory[] = [];
        querySnapshot.forEach(
          (docSnap: QueryDocumentSnapshot<DocumentData>) => {
            runs.push({ id: docSnap.id, ...docSnap.data() } as RunHistory);
          },
        );

        // Urutkan dari yang terbaru
        runs.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        setHistory(runs);
      } catch (error) {
        console.error("Gagal memuat profil/history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndHistory();
  }, [user]);

  // 3. Fungsi Logout
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Gagal Sign Out:", error);
    }
  };

  // Helper konversi detik ke format MM:SS
  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper format tanggal & jam
  const formatDate = (createdAt: any) => {
    if (!createdAt?.toDate) return "Baru saja";
    const date = createdAt.toDate();
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* User Info Header */}
      <View style={styles.profileCard}>
        <Text style={styles.usernameText}>
          {profileData?.username || "Runner"}
        </Text>
        <Text style={styles.emailText}>{user?.email || "No Email"}</Text>

        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>
      </View>

      {/* History List */}
      <Text style={styles.sectionTitle}>HISTORY LARI</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const distance = Number(item.distanceKm) || 0;
          return (
            <View style={styles.historyCard}>
              <View>
                <Text style={styles.historyDistance}>
                  {distance.toFixed(2)} KM
                </Text>
                <Text style={styles.historyTime}>
                  Durasi: {formatTime(item.durationSeconds)}
                </Text>
              </View>
              <Text style={styles.historyDate}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Belum ada riwayat lari.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  profileCard: {
    borderWidth: 3,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  usernameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
  },
  emailText: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: "#F87171",
    borderWidth: 2,
    borderColor: "#000000",
    alignItems: "center",
  },
  signOutText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  historyCard: {
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyDistance: {
    fontSize: 18,
    fontWeight: "900",
    color: "#10B981", // Hijau kontras neo-brutalism
  },
  historyTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666666",
    marginTop: 2,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: "800",
    color: "#333333",
  },
  emptyText: {
    textAlign: "center",
    color: "#888888",
    marginTop: 20,
    fontWeight: "700",
  },
});
