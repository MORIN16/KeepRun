import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import * as Location from "expo-location";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

interface Coordinate {
  latitude: number;
  longitude: number;
}

export default function TrackRunScreen() {
  const theme = Colors.light;

  // States
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0); // Dalam kilometer
  const [duration, setDuration] = useState<number>(0); // Dalam detik

  // Refs
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  const timerRef = useRef<
    NodeJS.Timeout | ReturnType<typeof setInterval> | null
  >(null);
  const mapRef = useRef<MapView | null>(null);

  // 1. Request Izin & Dapatkan Lokasi Awal
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Ditolak",
          "Izin lokasi diperlukan untuk melacak lari!",
        );
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLoc);
    })();

    return () => {
      stopLocationUpdates();
    };
  }, []);

  // 2. Timer untuk Durasi Lari (Hanya berjalan jika isTracking = true & isPaused = false)
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTracking, isPaused]);

  // 3. Formula Haversine (Hitung Jarak Antar 2 Koordinat)
  const calculateDistance = (newCoord: Coordinate, prevCoord: Coordinate) => {
    const R = 6371; // Jari-jari bumi dalam km
    const dLat = ((newCoord.latitude - prevCoord.latitude) * Math.PI) / 180;
    const dLon = ((newCoord.longitude - prevCoord.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((prevCoord.latitude * Math.PI) / 180) *
        Math.cos((newCoord.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Hasil dalam km
  };

  // 4. Stop Listening ke Sensor GPS
  const stopLocationUpdates = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // 5. Start / Resume Tracking
  const startTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000, // Sync tiap 2 detik
        distanceInterval: 5, // Filter: hanya abaikan jika pergerakan < 5 meter
      },
      (newLocation) => {
        // [FIX GPS DRIFT 1]: Abaikan jika akurasi lokasi sangat buruk (> 15 meter error)
        if (newLocation.coords.accuracy && newLocation.coords.accuracy > 15) {
          return;
        }

        const { latitude, longitude } = newLocation.coords;
        const newCoord = { latitude, longitude };

        setLocation(newLocation);

        setRouteCoordinates((prevCoords) => {
          if (prevCoords.length > 0) {
            const lastCoord = prevCoords[prevCoords.length - 1];
            const addedDistance = calculateDistance(newCoord, lastCoord);

            // [FIX GPS DRIFT 2]: Filter GPS Noise saat diam
            // Abaikan penambahan jarak jika perpindahan di bawah 5 meter (0.005 km)
            if (addedDistance < 0.005) {
              return prevCoords;
            }

            setDistance((prevDist) => prevDist + addedDistance);
          }
          return [...prevCoords, newCoord];
        });

        // Focus kamera ke lokasi terbaru
        mapRef.current?.animateCamera({
          center: newCoord,
          zoom: 17,
        });
      },
    );
  };

  // 6. Pause Tracking
  const pauseTracking = () => {
    setIsPaused(true);
    stopLocationUpdates(); // Matikan sensor GPS saat di-pause agar hemat baterai
  };

  // 7. Resume Tracking
  const resumeTracking = () => {
    startTracking();
  };

  // 8. Finish / Save Run
  const handleFinishRun = () => {
    Alert.alert(
      "Selesai Lari?",
      `Total Jarak: ${distance.toFixed(2)} KM\nDurasi: ${formatTime(duration)}`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Simpan & Selesai",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) {
                Alert.alert("Error", "Kamu harus login terlebih dahulu!");
                return;
              }

              // Simpan data lari lengkap dengan userId milik user yang sedang aktif
              await addDoc(collection(db, "runs"), {
                userId: user.uid, // <-- Dapatkan ID User aktif
                distanceKm: parseFloat(distance.toFixed(2)),
                durationSeconds: duration,
                routeCoordinates: routeCoordinates,
                createdAt: serverTimestamp(),
              });

              Alert.alert("Sukses", "Sesi lari berhasil disimpan!");
            } catch (error) {
              console.error("Gagal menyimpan data lari:", error);
              Alert.alert("Error", "Gagal menyimpan data lari.");
            } finally {
              stopLocationUpdates();
              setIsTracking(false);
              setIsPaused(false);
              setRouteCoordinates([]);
              setDistance(0);
              setDuration(0);
            }
          },
        },
      ],
    );
  };

  // Format Timer (MM:SS)
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {/* MAP VIEW SECTION */}
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {/* Garis Rute Lari */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#4ADE80"
              strokeWidth={6}
            />
          )}

          {/* Marker Start Point */}
          {routeCoordinates.length > 0 && (
            <Marker coordinate={routeCoordinates[0]} title="Start Point" />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Mencari Sinyal GPS...</Text>
        </View>
      )}

      {/* STATS OVERLAY CARD */}
      <View
        style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>DISTANCE</Text>
            <Text style={styles.metricValue}>
              {distance.toFixed(2)} <Text style={styles.unit}>KM</Text>
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TIME</Text>
            <Text style={styles.metricValue}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* BUTTON CONTROLS */}
        <View style={styles.buttonRow}>
          {!isTracking ? (
            /* STATE 1: BUMPER AWAL (Belum Mulai Lari) */
            <Pressable
              style={({ pressed }) => [
                styles.retroButton,
                {
                  backgroundColor: theme.primary,
                  transform: [{ translateY: pressed ? 4 : 0 }],
                },
              ]}
              onPress={startTracking}
            >
              <Text style={styles.buttonText}>START RUN</Text>
            </Pressable>
          ) : !isPaused ? (
            /* STATE 2: SEDANG LARI (Aktif Tracking) */
            <Pressable
              style={({ pressed }) => [
                styles.retroButton,
                {
                  backgroundColor: "#F87171", // Merah
                  transform: [{ translateY: pressed ? 4 : 0 }],
                },
              ]}
              onPress={pauseTracking}
            >
              <Text style={styles.buttonText}>PAUSE</Text>
            </Pressable>
          ) : (
            /* STATE 3: DI-PAUSE (Menu Resume & Finish) */
            <View style={styles.activeButtonGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.retroButtonHalf,
                  {
                    backgroundColor: "#4ADE80", // Hijau Resume
                    transform: [{ translateY: pressed ? 4 : 0 }],
                  },
                ]}
                onPress={resumeTracking}
              >
                <Text style={styles.buttonText}>RESUME</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.retroButtonHalf,
                  {
                    backgroundColor: "#E5E7EB", // Abu-abu Finish
                    transform: [{ translateY: pressed ? 4 : 0 }],
                  },
                ]}
                onPress={handleFinishRun}
              >
                <Text style={styles.buttonText}>FINISH</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFDF9",
  },
  loadingText: {
    fontWeight: "900",
    fontSize: 16,
  },
  statsCard: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    borderWidth: 4,
    borderColor: "#000000",
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#666",
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
  },
  unit: {
    fontSize: 14,
    fontWeight: "800",
  },
  buttonRow: {
    width: "100%",
  },
  activeButtonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
  },
  retroButtonHalf: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: "#000000",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },
});
