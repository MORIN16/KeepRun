import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import {
  collection,
  doc, // Tambahkan ini untuk TypeScript
  DocumentData, // Tambahkan ini untuk TypeScript
  FirestoreError,
  getDoc,
  onSnapshot,
  query, // Tambahkan ini untuk TypeScript
  QueryDocumentSnapshot, // Tambahkan ini
  QuerySnapshot,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 16) / 2; // Dynamic 2-column grid sizing

const calculateDistanceFromCoords = (coords: any[]) => {
  if (!coords || coords.length < 2) return 0;
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    if (p1?.latitude && p1?.longitude && p2?.latitude && p2?.longitude) {
      const R = 6371; // Radius bumi (KM)
      const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.latitude * Math.PI) / 180) *
          Math.cos((p2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += R * c;
    }
  }
  return totalDist;
};

export default function HomeScreen() {
  const theme = Colors.light;

  // User Profile States
  const [username, setUsername] = useState<string>("Runner");
  const [initials, setInitials] = useState<string>("RN");
  const [userTargetKm, setUserTargetKm] = useState<number>(2);

  // Real Metric States
  const [totalDistanceAllTime, setTotalDistanceAllTime] = useState<number>(0);
  const [todayDistance, setTodayDistance] = useState<number>(0);
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [todayKcal, setTodayKcal] = useState<number>(0);
  const [latestSessionKm, setLatestSessionKm] = useState<number>(0);
  const [totalSessionsCount, setTotalSessionsCount] = useState<number>(0);

  // Streak States
  const [streakCount, setStreakCount] = useState(0);
  const [isStreakDayComplete, setIsStreakDayComplete] = useState(false);
  const [weeklyDaysStatus, setWeeklyDaysStatus] = useState<
    { day: string; date: string; done: boolean; current?: boolean }[]
  >([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Fetch data profil user
    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const name = userData.username || "Runner";
          const target = Number(userData.targetKm) || 2;
          setUsername(name);
          setUserTargetKm(target);
          setInitials(
            name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "RN",
          );
        }
      } catch (err) {
        console.error("Gagal memuat profil:", err);
      }
    };

    fetchUserProfile();

    // 2. Realtime listener untuk dokumen lari (Runs)
    const q = query(collection(db, "runs"), where("userId", "==", user.uid));

    // Tambahkan deklarasi tipe data pada parameter callback di bawah ini:
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        let sumAllTimeKm = 0;
        let sumTodayKm = 0;
        let latestKm = 0;
        let latestTimestamp = 0;

        // const startOfToday = new Date();
        // startOfToday.setHours(0, 0, 0, 0);
        // let runTodayFound = false;
        const dailyDistanceMap: { [key: string]: number } = {};

        querySnapshot.forEach(
          (docSnap: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnap.data();

            // Ambil distanceKm jika ada, jika tidak kalkulasi otomatis dari array koordinat
            let dist = Number(data.distanceKm) || 0;
            if (
              !dist &&
              Array.isArray(data.locations) &&
              data.locations.length > 1
            ) {
              dist = calculateDistanceFromCoords(data.locations);
            } else if (
              !dist &&
              Array.isArray(data.coordinates) &&
              data.coordinates.length > 1
            ) {
              dist = calculateDistanceFromCoords(data.coordinates);
            }

            sumAllTimeKm += dist;

            const runDate = data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date();

            // if (runDate >= startOfToday) {
            //   sumTodayKm += dist;
            //   runTodayFound = true;
            // }
            const dateKey = runDate.toISOString().split("T")[0];
            dailyDistanceMap[dateKey] = (dailyDistanceMap[dateKey] || 0) + dist;

            const todayKey = new Date().toISOString().split("T")[0];
            if (dateKey === todayKey) {
              sumTodayKm += dist;
            }

            const timeSec = data.createdAt?.seconds || 0;
            if (timeSec >= latestTimestamp) {
              latestTimestamp = timeSec;
              latestKm = dist;
            }
          },
        );

        // Kalkulasi Streak Consecutive Days
        const target = userTargetKm || 2;
        let currentStreak = 0;
        let checkDate = new Date();

        // Cek hari ini
        const todayStr = checkDate.toISOString().split("T")[0];
        const todayDist = dailyDistanceMap[todayStr] || 0;
        const todayAchieved = todayDist >= target;

        if (todayAchieved) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Jika hari ini belum selesai target, cek apakah kemarin streak berlanjut
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
          const key = checkDate.toISOString().split("T")[0];
          if ((dailyDistanceMap[key] || 0) >= target) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break; // Streak terputus
          }
        }

        // Buat Array 7 Hari Terakhir untuk UI Weekly Streak
        const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
        const weeklyList = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          const distOnDay = dailyDistanceMap[key] || 0;

          weeklyList.push({
            day: dayLabels[d.getDay()],
            date: d.getDate().toString(),
            done: distOnDay >= target,
            current: i === 0,
          });
        }

        setWeeklyDaysStatus(weeklyList);
        setStreakCount(currentStreak);
        setIsStreakDayComplete(todayAchieved);

        setTotalDistanceAllTime(sumAllTimeKm);
        setTodayDistance(sumTodayKm);
        setLatestSessionKm(latestKm);
        setTotalSessionsCount(querySnapshot.size);
        setTodaySteps(Math.round(sumTodayKm * 1300));
        setTodayKcal(Math.round(sumTodayKm * 60));
        // setIsStreakDayComplete(runTodayFound);
        // setStreakCount(runTodayFound ? 1 : 0);
      },
      (error: FirestoreError) => {
        console.error("Gagal realtime listener runs:", error);
      },
    );

    return () => unsubscribe();
  }, [userTargetKm]);

  return (
    <ScrollView
      style={[styles.dashboardContainer, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Top Profile Summary row */}
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryTitle}>Halo, {username}!</Text>
          <Text style={styles.summaryDate}>
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* Weekly Streak Badge */}
      <View
        style={[
          styles.streakRowCard,
          { backgroundColor: theme.cardBackground },
        ]}
      >
        <View style={styles.streakCardHeader}>
          <Text style={styles.streakCardTitle}>
            WEEKLY STREAK (TARGET: {userTargetKm} KM/DAY)
          </Text>
          <Pressable
            style={styles.retroShareButton}
            onPress={() => console.log("Share Streak")}
          >
            <Text style={styles.shareButtonText}>SHARE</Text>
          </Pressable>
        </View>

        <View style={styles.streakRowLayout}>
          <View
            style={[
              styles.bigFlameBox,
              { backgroundColor: isStreakDayComplete ? "#4ADE80" : "#FFC107" },
            ]}
          >
            <Text style={styles.flameNumber}>{streakCount}</Text>
            <Text style={styles.flameUnit}>DAYS</Text>
          </View>

          <View style={styles.daysContainer}>
            {weeklyDaysStatus.map((item, index) => (
              <View key={index} style={styles.dayColumn}>
                <Text style={styles.dayLetter}>{item.day}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    item.done && { backgroundColor: theme.primary },
                    item.current && {
                      borderColor: theme.primary,
                      borderWidth: 3,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayDateText,
                      item.done && { color: "#000", fontWeight: "900" },
                    ]}
                  >
                    {item.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Hero Activity Ring Card */}
      <View
        style={[styles.heroCard, { backgroundColor: theme.cardBackground }]}
      >
        <View style={styles.heroLayout}>
          <View style={styles.fakeRing}>
            <View
              style={[styles.fakeRingProgress, { borderColor: theme.primary }]}
            />
            <Text style={{ fontSize: 20 }}>🏃</Text>
          </View>
          <View style={styles.heroStats}>
            <Text style={styles.statLabel}>Move</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {todayKcal}/110 KCAL
            </Text>
          </View>
        </View>
      </View>

      {/* 2x2 Neo-Brutalist Grid Section */}
      <View style={styles.gridContainer}>
        {/* Card 1: Step Count */}
        <View
          style={[
            styles.gridCard,
            { width: CARD_WIDTH, backgroundColor: theme.cardBackground },
          ]}
        >
          <Text style={styles.gridCardTitle}>Step Count </Text>
          <Text style={styles.gridCardSub}>Today</Text>
          <Text style={styles.gridNumber}>
            {todaySteps.toLocaleString("id-ID")}
          </Text>
          <View style={styles.fakeChartRow}>
            <View style={[styles.bar, { height: 10 }]} />
            <View style={[styles.bar, { height: 25 }]} />
            <View
              style={[
                styles.bar,
                { height: 40, backgroundColor: theme.primary },
              ]}
            />
            <View style={[styles.bar, { height: 15 }]} />
          </View>
        </View>

        {/* Card 2: Step Distance */}
        <View
          style={[
            styles.gridCard,
            { width: CARD_WIDTH, backgroundColor: theme.cardBackground },
          ]}
        >
          <Text style={styles.gridCardTitle}>Step Distance </Text>
          <Text style={styles.gridCardSub}>Today</Text>
          <Text style={styles.gridNumber}>
            {todayDistance ? todayDistance.toFixed(2) : "0,00"} KM
          </Text>
          <View style={styles.fakeChartRow}>
            <View style={[styles.bar, { height: 5 }]} />
            <View style={[styles.bar, { height: 15 }]} />
            <View
              style={[
                styles.bar,
                { height: 35, backgroundColor: theme.primary },
              ]}
            />
            <View style={[styles.bar, { height: 20 }]} />
          </View>
        </View>

        {/* Card 3: Sessions */}
        <View
          style={[
            styles.gridCard,
            { width: CARD_WIDTH, backgroundColor: theme.cardBackground },
          ]}
        >
          <Text style={styles.gridCardTitle}>Sessions </Text>
          <View style={styles.badge}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
          </View>
          <Text style={styles.gridCardSub}>
            {totalSessionsCount} Outdoor Runs
          </Text>
          <Text style={[styles.gridNumber, { color: "#4ADE80" }]}>
            {latestSessionKm ? latestSessionKm.toFixed(2) : "0,00"} KM
          </Text>
        </View>

        {/* Card 4: Awards */}
        <View
          style={[
            styles.gridCard,
            { width: CARD_WIDTH, backgroundColor: theme.cardBackground },
          ]}
        >
          <Text style={styles.gridCardTitle}>Awards </Text>
          <View style={styles.awardBadge}>
            <Text style={{ fontSize: 28 }}>🏅</Text>
          </View>
          <Text style={styles.awardLabel}>
            {totalDistanceAllTime >= 10 ? "Pro Runner" : "Starter Runner"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* Dashboard Styles */
  dashboardContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  summaryDate: {
    fontSize: 14,
    color: "#666",
    fontWeight: "700",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "900",
  },
  heroCard: {
    borderWidth: 4,
    borderColor: "#000000",
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  heroLayout: {
    flexDirection: "row",
    alignItems: "center",
  },
  fakeRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  fakeRingProgress: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    top: -6,
    left: -6,
  },
  heroStats: {
    marginLeft: 24,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#666",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  gridCard: {
    borderWidth: 3,
    borderColor: "#000000",
    padding: 14,
    minHeight: 140,
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  gridCardSub: {
    fontSize: 11,
    color: "#666",
    fontWeight: "700",
    marginTop: 4,
  },
  gridNumber: {
    fontSize: 24,
    fontWeight: "900",
    marginVertical: 6,
  },
  fakeChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 40,
  },
  bar: {
    width: 6,
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#000000",
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  awardBadge: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  awardLabel: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  // streak style
  streakRowCard: {
    borderWidth: 3,
    borderColor: "#000000",
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  streakCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  streakCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  retroShareButton: {
    borderWidth: 2,
    borderColor: "#000000",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FFFDF9",
  },
  shareButtonText: {
    fontSize: 10,
    fontWeight: "900",
  },
  streakRowLayout: {
    flexDirection: "row",
    alignItems: "center",
  },
  bigFlameBox: {
    borderWidth: 2,
    borderColor: "#000000",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 65,
    marginRight: 12,
  },
  flameNumber: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  flameUnit: {
    fontSize: 9,
    fontWeight: "800",
    color: "#333",
  },
  daysContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap: 6,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: "800",
    color: "#666",
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  dayDateText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#7F7F7F",
  },
});
