import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  DocumentData,
  getDocs,
  onSnapshot, // Ditambahkan impor onSnapshot di sini
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

interface UserProfile {
  username?: string;
  email?: string;
  gender?: string;
  weight?: string | number;
  height?: string | number;
  targetKm?: number;
}

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/auth");
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Listener Realtime Profile User
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfileData(docSnap.data() as UserProfile);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Gagal realtime profile:", error);
        setLoading(false);
      },
    );

    // 2. Fetch Riwayat Lari (Tanpa orderBy Firestore agar tidak kena error Index)
    const fetchHistory = async () => {
      try {
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

        // Sorting riwayat lari secara lokal
        runs.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        setHistory(runs);
      } catch (error) {
        console.error("Gagal memuat history:", error);
      }
    };

    fetchHistory();

    // Cleanup Listener
    return () => {
      unsubscribeProfile();
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Gagal Sign Out:", error);
    }
  };

  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
      {/* Header Profile + Settings Button */}
      <View style={styles.profileCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.usernameText}>
              {profileData?.username || "Runner"}
            </Text>
            <Text style={styles.emailText}>{user?.email || "No Email"}</Text>
          </View>

          <Pressable
            style={styles.settingsIconButton}
            onPress={() => router.push("/settings")}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        </View>

        {/* User Details Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TARGET</Text>
            <Text style={styles.statValue}>
              {profileData?.targetKm || 2} KM
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GENDER</Text>
            <Text style={styles.statValue}>{profileData?.gender || "-"}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WEIGHT</Text>
            <Text style={styles.statValue}>
              {profileData?.weight ? `${profileData.weight} kg` : "-"}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>HEIGHT</Text>
            <Text style={styles.statValue}>
              {profileData?.height ? `${profileData.height} cm` : "-"}
            </Text>
          </View>
        </View>

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
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  profileCard: {
    borderWidth: 3,
    borderColor: "#000",
    backgroundColor: "#FFF",
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  usernameText: { fontSize: 22, fontWeight: "900", color: "#000" },
  emailText: { fontSize: 13, color: "#666", marginTop: 2, fontWeight: "600" },
  settingsIconButton: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 6,
    backgroundColor: "#F3F4F6",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#EEE",
  },
  statBox: { alignItems: "center" },
  statLabel: { fontSize: 10, fontWeight: "800", color: "#888" },
  statValue: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: "#F87171",
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
  },
  signOutText: { color: "#FFF", fontWeight: "900" },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 12 },
  historyCard: {
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#FFF",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyDistance: { fontSize: 18, fontWeight: "900", color: "#10B981" },
  historyTime: { fontSize: 12, fontWeight: "700", color: "#666", marginTop: 2 },
  historyDate: { fontSize: 12, fontWeight: "800", color: "#333" },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontWeight: "700",
  },
});
