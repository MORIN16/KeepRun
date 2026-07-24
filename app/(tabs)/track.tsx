import Colors from "@/constants/Colors";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
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
        alert("Izin lokasi diperlukan untuk melacak lari!");
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLoc);
    })();

    return () => {
      stopTracking();
    };
  }, []);

  // 2. Timer untuk Durasi Lari
  useEffect(() => {
    if (isTracking) {
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
  }, [isTracking]);

  // 3. Hitung Jarak Antar 2 Koordinat
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
    return R * c; // Hasil dalam kilometer
  };

  // 4. Mulai Tracking Lari (Live GPS Update)
  const startTracking = async () => {
    setIsTracking(true);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000, // Update tiap 2 detik
        distanceInterval: 3, // Update tiap pergerakan 3 meter
      },
      (newLocation) => {
        const { latitude, longitude } = newLocation.coords;
        const newCoord = { latitude, longitude };

        setLocation(newLocation);

        setRouteCoordinates((prevCoords) => {
          if (prevCoords.length > 0) {
            const lastCoord = prevCoords[prevCoords.length - 1];
            const addedDistance = calculateDistance(newCoord, lastCoord);
            setDistance((prevDist) => prevDist + addedDistance);
          }
          return [...prevCoords, newCoord];
        });

        // Animasikan kamera peta mengikut user
        mapRef.current?.animateCamera({
          center: newCoord,
          zoom: 17,
        });
      },
    );
  };

  // 5. Stop / Pause Tracking
  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  // 6. Reset Sesi Lari
  const resetRun = () => {
    stopTracking();
    setRouteCoordinates([]);
    setDistance(0);
    setDuration(0);
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
              strokeColor="#4ADE80" // Warna hijau neon ala KeepRun
              strokeWidth={6}
            />
          )}

          {/* Marker Posisi Awal (Start Point) */}
          {routeCoordinates.length > 0 && (
            <Marker coordinate={routeCoordinates[0]} title="Start Point" />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Mencari Sinyal GPS...</Text>
        </View>
      )}

      {/* STATS OVERLAY CARD (Retro Neo-Brutalism Style) */}
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
          ) : (
            <View style={styles.activeButtonGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.retroButtonHalf,
                  {
                    backgroundColor: "#F87171",
                    transform: [{ translateY: pressed ? 4 : 0 }],
                  },
                ]}
                onPress={stopTracking}
              >
                <Text style={styles.buttonText}>PAUSE</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.retroButtonHalf,
                  {
                    backgroundColor: "#E5E7EB",
                    transform: [{ translateY: pressed ? 4 : 0 }],
                  },
                ]}
                onPress={resetRun}
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
