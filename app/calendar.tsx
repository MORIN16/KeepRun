import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";

interface RunItem {
  id: string;
  distanceKm?: number;
  durationSeconds?: number;
  createdAt?: any;
  dateString?: string; // Format YYYY-MM-DD
}

export default function CalendarDetailScreen() {
  const theme = Colors.light;
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [allRuns, setAllRuns] = useState<RunItem[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  // State untuk tanggal yang sedang dipilih & history di hari tersebut
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [runsOnSelectedDate, setRunsOnSelectedDate] = useState<RunItem[]>([]);

  useEffect(() => {
    fetchRunHistory();
  }, [user]);

  const fetchRunHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "runs"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const runs: RunItem[] = [];
      const marks: any = {};

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let dateStr = "";

        if (data.createdAt?.toDate) {
          // Format ke YYYY-MM-DD untuk pencocokan Kalender
          const dateObj = data.createdAt.toDate();
          dateStr = dateObj.toISOString().split("T")[0];
        }

        const runItem = {
          id: docSnap.id,
          ...data,
          dateString: dateStr,
        };
        runs.push(runItem);

        // Tandai tanggal yang memiliki data lari (Dot/Streak Indicator)
        if (dateStr) {
          marks[dateStr] = {
            marked: true,
            dotColor: "#10B981", // Warna hijau indikator streak
          };
        }
      });

      setAllRuns(runs);
      setMarkedDates(marks);

      // Default pilih hari ini
      const today = new Date().toISOString().split("T")[0];
      handleDayPress({ dateString: today } as DateData, runs, marks);
    } catch (err) {
      console.error("Gagal mengambil data kalender:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handler saat salah satu tanggal di-klik
  const handleDayPress = (
    day: DateData,
    runsList = allRuns,
    currentMarks = markedDates,
  ) => {
    const chosenDate = day.dateString;
    setSelectedDate(chosenDate);

    // Filter histori lari yang sesuai dengan tanggal yang diklik
    const filteredRuns = runsList.filter(
      (item) => item.dateString === chosenDate,
    );
    setRunsOnSelectedDate(filteredRuns);

    // Update style tanggal yang sedang dipilih tanpa menghilangkan penanda dot
    const updatedMarks = { ...currentMarks };

    // Hapus style selected dari tanggal sebelumnya, pertahankan dot
    Object.keys(updatedMarks).forEach((key) => {
      if (updatedMarks[key].selected) {
        delete updatedMarks[key].selected;
        delete updatedMarks[key].selectedColor;
      }
    });

    // Tambahkan highlight untuk tanggal yang aktif dipilih
    updatedMarks[chosenDate] = {
      ...updatedMarks[chosenDate],
      selected: true,
      selectedColor: "#000000",
    };

    setMarkedDates(updatedMarks);
  };

  const formatTime = (sec?: number) => {
    if (!sec) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Back Button */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ fontWeight: "900" }}>{"<"} KEMBALI</Text>
        </Pressable>
        <Text style={styles.headerTitle}>STREAK CALENDAR</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#000"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Komponen Kalender */}
          <View style={styles.calendarCard}>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={markedDates}
              theme={{
                calendarBackground: "#FFF",
                textSectionTitleColor: "#000",
                selectedDayBackgroundColor: "#000",
                selectedDayTextColor: "#FFF",
                todayTextColor: "#10B981",
                dayTextColor: "#000",
                textDisabledColor: "#D1D5DB",
                dotColor: "#10B981",
                selectedDotColor: "#FFF",
                arrowColor: "#000",
                monthTextColor: "#000",
                textDayFontWeight: "800",
                textMonthFontWeight: "900",
                textDayHeaderFontWeight: "800",
              }}
            />
          </View>

          {/* Section History / Note untuk tanggal yang diklik */}
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>
              NOTES & HISTORY ({selectedDate})
            </Text>
          </View>

          <FlatList
            data={runsOnSelectedDate}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View>
                  <Text style={styles.historyDistance}>
                    🏃‍♂️ {(Number(item.distanceKm) || 0).toFixed(2)} KM
                  </Text>
                  <Text style={styles.historyTime}>
                    Durasi: {formatTime(item.durationSeconds)}
                  </Text>
                </View>
                <Text style={styles.badgeSuccess}>Selesai</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyNoteCard}>
                <Text style={styles.emptyText}>
                  Tidak ada catatan aktivitas lari pada tanggal ini.
                </Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 8,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", marginLeft: 16 },
  calendarCard: {
    borderWidth: 3,
    borderColor: "#000",
    backgroundColor: "#FFF",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    elevation: 4,
    padding: 8,
  },
  historyHeader: {
    marginVertical: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  historyCard: {
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#FFF",
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyDistance: { fontSize: 16, fontWeight: "900", color: "#10B981" },
  historyTime: { fontSize: 12, fontWeight: "700", color: "#666", marginTop: 2 },
  badgeSuccess: {
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "#10B981",
    color: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyNoteCard: {
    borderWidth: 2,
    borderColor: "#DDD",
    backgroundColor: "#F9FAFB",
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  emptyText: {
    color: "#888",
    fontWeight: "700",
    fontSize: 12,
  },
});
