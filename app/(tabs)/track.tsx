import Colors from "@/constants/Colors";
import { auth, db } from "@/firebaseConfig";
import * as Location from "expo-location";
import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  MapPressEvent,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface CoinCheckpoint {
  id: string;
  coordinate: Coordinate;
  isCollected: boolean;
}

interface SavedRoute {
  id: string;
  name: string;
  distanceKm: number;
  coordinates: Coordinate[];
  usageCount: number;
}

interface RunSession {
  id: string;
  userId: string;
  distance: number;
  duration: number;
  date?: string;
  createdAt?: any;
}

export default function TrackRunScreen() {
  const theme = Colors.light;
  const user = auth.currentUser;
  const [runs, setRuns] = useState<RunSession[]>([]);

  // States Utama Track
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [userWeight, setUserWeight] = useState<number>(65);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFinishModalVisible, setIsFinishModalVisible] =
    useState<boolean>(false);

  // States Game Mode & Custom Route Creator
  const [isGameModeActive, setIsGameModeActive] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState<boolean>(false);
  const [customWaypoints, setCustomWaypoints] = useState<Coordinate[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  // Game States
  const [gameRoute, setGameRoute] = useState<Coordinate[]>([]);
  const [coins, setCoins] = useState<CoinCheckpoint[]>([]);
  const [score, setScore] = useState<number>(0);

  // Refs
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  const timerRef = useRef<
    NodeJS.Timeout | ReturnType<typeof setInterval> | null
  >(null);
  const mapRef = useRef<MapView | null>(null);
  const coinsRef = useRef<CoinCheckpoint[]>([]);
  coinsRef.current = coins;

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "runs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const runsData: RunSession[] = [];

        querySnapshot.forEach(
          (docSnap: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnap.data();
            runsData.push({
              id: docSnap.id,
              userId: data.userId,
              distance: data.distanceKm || data.distance || 0,
              duration: data.durationSeconds || data.duration || 0,
              date: data.createdAt?.toDate?.()?.toISOString() || "",
              createdAt: data.createdAt,
            });
          },
        );

        setRuns(runsData);
      },
      (error) => {
        console.error("Error fetching real-time runs: ", error);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 1. Inisialisasi Lokasi
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Izin lokasi diperlukan!");
        return;
      }
      let currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLoc);
    })();

    return () => stopLocationUpdates();
  }, []);

  // 2. Timer Lari
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(
        () => setDuration((prev) => prev + 1),
        1000,
      );
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, isPaused]);

  // 3. Formula Haversine (Hitung Jarak dalam KM)
  const calculateDistance = (coord1: Coordinate, coord2: Coordinate) => {
    const R = 6371;
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // 4. Hitung Jarak Kumulatif Suatu Jalur
  const calculateTotalPathDistance = (path: Coordinate[]): number => {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += calculateDistance(path[i], path[i + 1]);
    }
    return total;
  };

  // 5. Generator Checkpoint Koin Tiap 200m pada Rute
  const generateCoinsFromPath = (path: Coordinate[]): CoinCheckpoint[] => {
    const newCoins: CoinCheckpoint[] = [];
    let accumulatedDistMeters = 0;
    let nextCoinTargetMeters = 200; // Koin pertama di 200 meter
    let coinCounter = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segmentDistMeters = calculateDistance(p1, p2) * 1000;

      while (
        accumulatedDistMeters + segmentDistMeters >=
        nextCoinTargetMeters
      ) {
        coinCounter++;
        // Interpolasi posisi koin di antara p1 dan p2
        const ratio =
          (nextCoinTargetMeters - accumulatedDistMeters) / segmentDistMeters;
        const coinLat = p1.latitude + ratio * (p2.latitude - p1.latitude);
        const coinLng = p1.longitude + ratio * (p2.longitude - p1.longitude);

        newCoins.push({
          id: `coin-${coinCounter}`,
          coordinate: { latitude: coinLat, longitude: coinLng },
          isCollected: false,
        });

        nextCoinTargetMeters += 200; // Koin berikutnya 200 meter lagi
      }
      accumulatedDistMeters += segmentDistMeters;
    }
    return newCoins;
  };

  // 6. Fetch Database Rute yang Sering Digunakan / Disukai Komunitas
  const fetchCommunityRoutes = async () => {
    try {
      const routesRef = collection(db, "game_routes");
      // Mengambil rute dari database berdasarkan rute populer (paling sering dipakai)
      const q = query(routesRef, limit(5));
      const querySnapshot = await getDocs(q);

      const loadedRoutes: SavedRoute[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedRoutes.push({
          id: doc.id,
          name: data.name || "Rute Komunitas",
          distanceKm: data.distanceKm,
          coordinates: data.coordinates,
          usageCount: data.usageCount || 1,
        });
      });

      setSavedRoutes(loadedRoutes);
    } catch (error) {
      console.error("Gagal mengambil data rute:", error);
    }
  };

  // 7. Handler Tap Map Saat Membuat Rute Sendiri
  const handleMapPressForCustomRoute = (e: MapPressEvent) => {
    if (!isCreatingRoute) return;
    const newCoord = e.nativeEvent.coordinate;
    setCustomWaypoints((prev) => [...prev, newCoord]);
  };

  // 8. Simpan Rute Custom buatan User ke Firestore
  const handleSaveCustomRoute = async () => {
    if (customWaypoints.length < 2) {
      Alert.alert(
        "Rute Terlalu Pendek",
        "Tambahkan minimal 2 titik lokasi di map!",
      );
      return;
    }

    // 1. Ubah titik lurus menjadi rute mulus mengikuti jalan raya
    const snappedCoordinates = await fetchSnapToRoads(customWaypoints);

    // 2. Hitung jarak total & koin berdasarkan rute presisi jalan
    const pathDistKm = parseFloat(
      calculateTotalPathDistance(snappedCoordinates).toFixed(2),
    );
    const generatedCoins = generateCoinsFromPath(snappedCoordinates);

    try {
      // Simpan ke Firestore agar menjadi data rute sistem tanpa input manual lagi
      await addDoc(collection(db, "game_routes"), {
        name: `Rute Custom ${pathDistKm} KM`,
        distanceKm: pathDistKm,
        coordinates: snappedCoordinates,
        usageCount: 1,
        createdAt: serverTimestamp(),
      });
      setGameRoute(snappedCoordinates);
      setCoins(generatedCoins);
      setIsGameModeActive(true);
      setIsCreatingRoute(false);
      setCustomWaypoints([]);
      setScore(0);

      Alert.alert(
        "Rute Berhasil Disimpan! 🎮",
        `Rute (${pathDistKm} KM) telah disimpan ke sistem dan ${generatedCoins.length} koin siap dikumpulkan!`,
      );
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan rute ke server.");
    }
  };

  // 9. Pilih Rute Komunitas dari Pop-up
  const selectCommunityRoute = (selectedRoute: SavedRoute) => {
    const generatedCoins = generateCoinsFromPath(selectedRoute.coordinates);
    setGameRoute(selectedRoute.coordinates);
    setCoins(generatedCoins);
    setIsGameModeActive(true);
    setIsModalVisible(false);
    setScore(0);

    Alert.alert(
      "Game Mode Ready! 🎮",
      `Menggunakan "${selectedRoute.name}". Ada ${generatedCoins.length} koin untuk dikumpulkan!`,
    );
  };

  // 10. Cek Koin Terambil oleh User
  const checkCoinCollection = (userCoord: Coordinate) => {
    const currentCoins = coinsRef.current;

    // Cari indeks koin pertama yang BELUM diambil
    const nextCoinIndex = currentCoins.findIndex((c) => !c.isCollected);

    // Jika semua koin sudah diambil, keluar dari fungsi
    if (nextCoinIndex === -1) return;

    let isAnyCollected = false;
    const updatedCoins = [...currentCoins];

    const candidateIndices = [nextCoinIndex, nextCoinIndex + 1].filter(
      (idx) => idx < updatedCoins.length,
    );

    candidateIndices.forEach((idx) => {
      const coin = updatedCoins[idx];
      if (!coin.isCollected) {
        const distMeters = calculateDistance(userCoord, coin.coordinate) * 1000;
        // Toleransi radius 5 meter dari lokasi user
        if (distMeters <= 5) {
          updatedCoins[idx] = { ...coin, isCollected: true };
          isAnyCollected = true;
        }
      }
    });

    if (isAnyCollected) {
      const collectedCount = updatedCoins.filter((c) => c.isCollected).length;
      setScore(collectedCount * 10);
      setCoins(updatedCoins);
    }
  };

  // 11. GPS Tracking Loop
  const startTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (newLocation) => {
        if (newLocation.coords.accuracy && newLocation.coords.accuracy > 15)
          return;

        const { latitude, longitude } = newLocation.coords;
        const newCoord = { latitude, longitude };
        setLocation(newLocation);

        setRouteCoordinates((prev) => {
          if (prev.length > 0) {
            const addedDist = calculateDistance(
              newCoord,
              prev[prev.length - 1],
            );
            if (addedDist >= 0.005) setDistance((d) => d + addedDist);
          }
          return [...prev, newCoord];
        });

        if (isGameModeActive) checkCoinCollection(newCoord);

        mapRef.current?.animateCamera({ center: newCoord, zoom: 17 });
      },
    );
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.weight) {
            setUserWeight(parseFloat(data.weight) || 65);
          }
        }
      } catch (error) {
        console.error("Gagal memuat data profil untuk track:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const calculatePace = (distKm: number, durationSec: number): string => {
    if (distKm <= 0 || durationSec <= 0) return "0'00\"";

    const paceDecimal = durationSec / 60 / distKm; // dalam menit per km
    const paceMins = Math.floor(paceDecimal);
    const paceSecs = Math.round((paceDecimal - paceMins) * 60);

    // Format tampilan misal: 5'30"
    return `${paceMins}'${paceSecs.toString().padStart(2, "0")}"`;
  };

  // Hitung Estimasi Kalori Terbakar
  const calculateCalories = (distKm: number): number => {
    return Math.round(distKm * userWeight * 1.036);
  };

  const stopLocationUpdates = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const pauseTracking = () => {
    setIsPaused(true);
    stopLocationUpdates();
  };

  const handleFinishRun = () => {
    // Alert.alert("Selesai Lari?", `Total Jarak: ${distance.toFixed(2)} KM`, [
    //   { text: "Batal", style: "cancel" },
    //   {
    //     text: "Simpan & Selesai",
    //     onPress: async () => {
    //       try {
    //         const currentUser = auth.currentUser;
    //         if (currentUser) {
    //           // Simpan riwayat lari ke koleksi 'runs'
    //           await addDoc(collection(db, "runs"), {
    //             userId: currentUser.uid,
    //             distanceKm: parseFloat(distance.toFixed(2)),
    //             durationSeconds: duration,
    //             score: isGameModeActive ? score : 0,
    //             coordinates: routeCoordinates,
    //             createdAt: serverTimestamp(),
    //           });
    //         }
    //       } catch (error) {
    //         console.error("Gagal menyimpan data lari:", error);
    //       } finally {
    //         stopLocationUpdates();
    //         setIsTracking(false);
    //         setIsPaused(false);
    //         setRouteCoordinates([]);
    //         setGameRoute([]);
    //         setCoins([]);
    //         setIsGameModeActive(false);
    //         setDistance(0);
    //         setDuration(0);
    //       }
    //     },
    //   },
    // ]);
    setIsFinishModalVisible(true);
  };

  const confirmFinishRun = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const avgPace = calculatePace(distance, duration);
        const caloriesBurned = calculateCalories(distance);

        await addDoc(collection(db, "runs"), {
          userId: currentUser.uid,
          distanceKm: parseFloat(distance.toFixed(2)),
          durationSeconds: duration,
          pace: avgPace,
          calories: caloriesBurned,
          score: isGameModeActive ? score : 0,
          isGameMode: isGameModeActive,
          coordinates: routeCoordinates,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Gagal menyimpan data lari:", error);
    } finally {
      setIsFinishModalVisible(false);
      stopLocationUpdates();
      setIsTracking(false);
      setIsPaused(false);
      setRouteCoordinates([]);
      setGameRoute([]);
      setCoins([]);
      setIsGameModeActive(false);
      setDistance(0);
      setDuration(0);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper untuk mengurai string polyline terkompresi dari Google
  const decodePolyline = (encoded: string): Coordinate[] => {
    let points: Coordinate[] = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  // Fungsi Fetch Rute Mengikuti Jalan
  const fetchSnapToRoads = async (
    waypoints: Coordinate[],
  ): Promise<Coordinate[]> => {
    if (waypoints.length < 2) return waypoints;

    const apiKey = "AIzaSyCM8vxXYq31Wue1WQ6W7tzpDGCSm9Vxn14";
    const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
    const destination = `${waypoints[waypoints.length - 1].latitude},${waypoints[waypoints.length - 1].longitude}`;

    // Waypoints perantara jika user menatap lebih dari 2 titik
    let waypointsParam = "";
    if (waypoints.length > 2) {
      const intermediates = waypoints
        .slice(1, -1)
        .map((pt) => `${pt.latitude},${pt.longitude}`)
        .join("|");
      waypointsParam = `&waypoints=${intermediates}`;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&mode=walking&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes.length > 0) {
        return decodePolyline(data.routes[0].overview_polyline.points);
      }
    } catch (error) {
      console.error("Gagal melakukan Snap to Roads:", error);
    }

    return waypoints; // Fallback ke waypoints asli jika request gagal
  };

  return (
    <View style={styles.container}>
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
          followsUserLocation={!isCreatingRoute}
          onPress={handleMapPressForCustomRoute}
        >
          {/* Rute Game Terpilih (Kuning Putus-putus) */}
          {isGameModeActive && gameRoute.length > 0 && (
            <Polyline
              coordinates={gameRoute}
              strokeColor="#FBBF24"
              strokeWidth={5}
              lineDashPattern={[10, 5]}
            />
          )}

          {/* Rute Lari Nyata User (Hijau) */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#4ADE80"
              strokeWidth={6}
            />
          )}

          {/* Rute yang Sedang Digambar oleh User (Biru) */}
          {isCreatingRoute && customWaypoints.length > 0 && (
            <>
              <Polyline
                coordinates={customWaypoints}
                strokeColor="#3B82F6"
                strokeWidth={5}
              />
              {customWaypoints.map((pt, idx) => (
                <Marker
                  key={idx}
                  coordinate={pt}
                  pinColor="blue"
                  title={`Titik ${idx + 1}`}
                />
              ))}
            </>
          )}

          {/* Marker Checkpoint Koin */}
          {isGameModeActive &&
            coins.map(
              (coin) =>
                !coin.isCollected && (
                  <Marker
                    key={coin.id}
                    coordinate={coin.coordinate}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.coinMarker}>
                      <Text style={styles.coinText}>🪙</Text>
                    </View>
                  </Marker>
                ),
            )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Mencari Sinyal GPS...</Text>
        </View>
      )}

      {/* BANNER / PANEL SAAT BUAT RUTE CUSTOM */}
      {isCreatingRoute && (
        <View style={styles.createRouteBanner}>
          <Text style={styles.bannerTitle}>📍 Mode Buat Rute Custom</Text>
          <Text style={styles.bannerSubtitle}>
            Ketuk pada peta untuk membuat titik rute ({customWaypoints.length}{" "}
            titik)
          </Text>

          <View style={styles.bannerButtonRow}>
            <TouchableOpacity
              style={[styles.bannerBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => {
                setIsCreatingRoute(false);
                setCustomWaypoints([]);
              }}
            >
              <Text style={styles.bannerBtnText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bannerBtn, { backgroundColor: "#3B82F6" }]}
              onPress={() => setCustomWaypoints((prev) => prev.slice(0, -1))}
            >
              <Text style={styles.bannerBtnText}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bannerBtn, { backgroundColor: "#10B981" }]}
              onPress={handleSaveCustomRoute}
            >
              <Text style={styles.bannerBtnText}>Simpan & Main</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TOMBOL GAME MODE DI POJOK KANAN ATAS */}
      {!isCreatingRoute && (
        <TouchableOpacity
          style={[
            styles.gameModeButton,
            isGameModeActive && styles.gameModeButtonActive,
          ]}
          onPress={() => {
            fetchCommunityRoutes();
            setIsModalVisible(true);
          }}
        >
          <Text style={styles.gameModeButtonText}>
            {isGameModeActive ? `🎮 ${score} PTS` : "🎮 GAME MODE"}
          </Text>
        </TouchableOpacity>
      )}

      {/* MODAL SELEKSI RUTE */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎮 POPULER & CUSTOM ROUTE</Text>
            <Text style={styles.modalSubtitle}>
              Pilih rute rekomendasi atau buat rutemu sendiri!
            </Text>

            {/* Opsi 1: Buat Rute Custom */}
            <Pressable
              style={styles.createOptionBtn}
              onPress={() => {
                setIsModalVisible(false);
                setIsCreatingRoute(true);
                setCustomWaypoints([]);
              }}
            >
              <Text style={styles.createOptionText}>
                ✨ Buat Rute Sendiri di Map
              </Text>
            </Pressable>

            <Text style={styles.sectionHeader}>Rute Komunitas Terpopuler:</Text>

            {/* Opsi 2: List Rute Komunitas yang Terdaftar di Firestore */}
            {savedRoutes.length > 0 ? (
              savedRoutes.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.routeOptionButton}
                  onPress={() => selectCommunityRoute(item)}
                >
                  <Text style={styles.routeOptionText}>
                    📍 {item.name} ({item.distanceKm} KM)
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>
                Belum ada rute komunitas tersimpan.
              </Text>
            )}

            <Pressable
              style={styles.closeModalButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeModalText}>TUTUP</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isFinishModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFinishModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.finishModalCard}>
            <Text style={styles.finishModalTitle}>🏁 SELESAI LARI?</Text>

            <View style={styles.finishStatsBox}>
              <Text style={styles.finishStatText}>
                Total Jarak:{" "}
                <Text style={styles.finishStatHighlight}>
                  {distance.toFixed(2)} KM
                </Text>
              </Text>
              <Text style={styles.finishStatText}>
                Waktu:{" "}
                <Text style={styles.finishStatHighlight}>
                  {formatTime(duration)}
                </Text>
              </Text>
              {isGameModeActive && (
                <Text style={styles.finishStatText}>
                  Skor Game:{" "}
                  <Text style={styles.finishStatHighlight}>{score} PTS</Text>
                </Text>
              )}
            </View>

            <Text style={styles.finishModalSub}>
              Apakah kamu yakin ingin mengakhiri dan menyimpan sesi lari ini?
            </Text>

            <View style={styles.finishButtonRow}>
              <Pressable
                style={[styles.retroFinishBtn, { backgroundColor: "#E5E7EB" }]}
                onPress={() => setIsFinishModalVisible(false)}
              >
                <Text style={styles.retroFinishBtnText}>BATAL</Text>
              </Pressable>

              <Pressable
                style={[styles.retroFinishBtn, { backgroundColor: "#4ADE80" }]}
                onPress={confirmFinishRun}
              >
                <Text style={styles.retroFinishBtnText}>SIMPAN & SELESAI</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
            <Text style={styles.metricLabel}>PACE</Text>
            <Text style={styles.metricValue}>
              {calculatePace(distance, duration)}
            </Text>
          </View>

          {isGameModeActive && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SCORE</Text>
              <Text style={styles.metricValue}>{score}</Text>
            </View>
          )}

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
          ) : !isPaused ? (
            <Pressable
              style={({ pressed }) => [
                styles.retroButton,
                {
                  backgroundColor: "#F87171",
                  transform: [{ translateY: pressed ? 4 : 0 }],
                },
              ]}
              onPress={pauseTracking}
            >
              <Text style={styles.buttonText}>PAUSE</Text>
            </Pressable>
          ) : (
            <View style={styles.activeButtonGroup}>
              <Pressable style={styles.retroButtonHalf} onPress={startTracking}>
                <Text style={styles.buttonText}>RESUME</Text>
              </Pressable>
              <Pressable
                style={styles.retroButtonHalf}
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
  container: { flex: 1 },
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
  loadingText: { fontWeight: "900", fontSize: 16 },
  gameModeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#FBBF24",
    borderWidth: 3,
    borderColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 10,
    elevation: 5,
  },
  gameModeButtonActive: { backgroundColor: "#4ADE80" },
  gameModeButtonText: { fontWeight: "900", fontSize: 14, color: "#000" },
  coinMarker: {
    backgroundColor: "#FEF08A",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 20,
    padding: 4,
  },
  coinText: { fontSize: 16 },

  // Custom Route Banner
  createRouteBanner: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "#FFFDF9",
    borderWidth: 3,
    borderColor: "#000",
    padding: 12,
    zIndex: 20,
  },
  bannerTitle: { fontWeight: "900", fontSize: 16 },
  bannerSubtitle: { fontSize: 12, color: "#666", marginBottom: 10 },
  bannerButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  bannerBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  bannerBtnText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderWidth: 4,
    borderColor: "#000",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
    marginBottom: 16,
  },
  createOptionBtn: {
    backgroundColor: "#3B82F6",
    borderWidth: 3,
    borderColor: "#000",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  createOptionText: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: "#888",
    marginBottom: 8,
  },
  routeOptionButton: {
    backgroundColor: "#FEF08A",
    borderWidth: 2,
    borderColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  routeOptionText: { fontWeight: "800", fontSize: 13 },
  emptyText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#888",
    marginBottom: 12,
  },
  closeModalButton: {
    backgroundColor: "#E5E7EB",
    borderWidth: 2,
    borderColor: "#000",
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  closeModalText: { fontWeight: "900", fontSize: 12 },

  // Bottom Stats Card
  statsCard: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    borderWidth: 4,
    borderColor: "#000000",
    padding: 20,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricItem: { alignItems: "center", flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: "900", color: "#666" },
  metricValue: { fontSize: 24, fontWeight: "900", color: "#000" },
  unit: { fontSize: 14, fontWeight: "800" },
  buttonRow: { width: "100%" },
  activeButtonGroup: { flexDirection: "row", gap: 12 },
  retroButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: "#000000",
    alignItems: "center",
  },
  retroButtonHalf: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: "#000000",
    alignItems: "center",
    backgroundColor: "#4ADE80",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },
  // Retro Finish Modal Styles
  finishModalCard: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderWidth: 4,
    borderColor: "#000000",
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  finishModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },
  finishStatsBox: {
    backgroundColor: "#FEF08A",
    borderWidth: 3,
    borderColor: "#000000",
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  finishStatText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },
  finishStatHighlight: {
    fontWeight: "900",
    fontSize: 16,
  },
  finishModalSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666666",
    textAlign: "center",
    marginBottom: 16,
  },
  finishButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  retroFinishBtn: {
    flex: 1,
    borderWidth: 3,
    borderColor: "#000000",
    paddingVertical: 12,
    alignItems: "center",
  },
  retroFinishBtnText: {
    fontWeight: "900",
    fontSize: 12,
    color: "#000000",
  },
});
