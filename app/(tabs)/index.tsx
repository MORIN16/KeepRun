import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions } from 'react-native';
import KeepRunLogo from '../../components/KeepRunLogo';
import  Colors  from '../../constants/Colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2; // Dynamic 2-column grid sizing

export default function HomeScreen() {
  const theme = Colors.light;
  // State to simulate permission acceptance for now
  const [hasPermission, setHasPermission] = useState(false);
  const [streakCount, setStreakCount] = useState(7);
  const [isStreakDayComplete, setIsStreakDayComplete] = useState(true);

  // 1. RENDER PERMISSION SCREEN IF NOT GRANTED
  if (!hasPermission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <KeepRunLogo />
          <Text style={styles.appTitle}>KEEP RUN</Text>
        </View>

        <View style={[styles.retroCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 24 }}>📍</Text>
          </View>
          
          <Text style={styles.cardTitle}>LOCATION ACCESS</Text>
          <Text style={styles.cardBody}>
            To track your running routes and provide precise mapping, Keep Run requires background location access.
          </Text>

          <Pressable 
            style={({ pressed }) => [
              styles.retroButton, 
              { backgroundColor: theme.primary, transform: [{ translateY: pressed ? 4 : 0 }] }
            ]}
            onPress={() => setHasPermission(true)} // Toggles to Dashboard
          >
            <Text style={styles.buttonText}>GRANT PERMISSION</Text>
          </Pressable>

          <Pressable onPress={() => console.log('Cancelled')}>
            <Text style={styles.cancelText}>NOT NOW</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 2. RENDER THE RETRO DASHBOARD 
  return (
    <ScrollView style={[styles.dashboardContainer, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top Profile Summary row */}
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryDate}>Sunday, 12 Jul</Text>
        </View>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>MVS</Text>
        </View>
      </View>

      {/* Weekly Streak Badge */}
      <View style={[styles.streakRowCard, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.streakCardHeader}>
          <Text style={styles.streakCardTitle}>Weekly Streak</Text>
          <Pressable style={styles.retroShareButton} onPress={() => console.log('Share Streak')}>
            <Text style={styles.shareButtonText}>SHARE</Text>
          </Pressable>
        </View>

        <View style={styles.streakRowLayout}>
          <View style={[styles.bigFlameBox, { backgroundColor: isStreakDayComplete ? '#4ADE80' : '#E5E7EB' }]}>
            <Text style={styles.flameNumber}>{streakCount}</Text>
            <Text style={styles.flameUnit}>DAYS</Text>
          </View>

        <View style={styles.daysContainer}>
          {[
            { day: 'M', date: '6', done: true },
            { day: 'T', date: '7', done: true },
            { day: 'W', date: '8', done: true },
            { day: 'T', date: '9', done: true },
            { day: 'F', date: '10', done: true },
            { day: 'S', date: '11', isIcon: true }, 
            { day: 'S', date: '12', current: true }, 
          ].map((item, index) => (
            <View key={index} style={styles.dayColumn}>
              <Text style={styles.dayLetter}>{item.day}</Text>
              <View 
                  style={[
                    styles.dayCircle,
                    item.done && { backgroundColor: theme.primary },
                    item.isIcon && { backgroundColor: '#000000' },
                    item.current && { borderColor: theme.primary, borderWidth: 3 }
                  ]}
                >
                  {item.isIcon ? (
                    <Text style={{ fontSize: 10, color: '#FFF' }}>👟</Text>
                  ) : (
                    <Text style={[styles.dayDateText, item.done && { color: '#000' }]}>
                      {item.date}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Hero Activity Ring Card */}
      <View style={[styles.heroCard, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.heroLayout}>
          <View style={styles.fakeRing}>
            <View style={[styles.fakeRingProgress, { borderColor: theme.primary }]} />
            <Text style={{ fontSize: 20 }}>🏃</Text>
          </View>
          <View style={styles.heroStats}>
            <Text style={styles.statLabel}>Move</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>57/110 KCAL</Text>
          </View>
        </View>
      </View>

      {/* 2x2 Neo-Brutalist Grid Section */}
      <View style={styles.gridContainer}>
        {/* Card 1: Step Count */}
        <View style={[styles.gridCard, { width: CARD_WIDTH, backgroundColor: theme.cardBackground }]}>
          <Text style={styles.gridCardTitle}>Step Count </Text>
          <Text style={styles.gridCardSub}>Today</Text>
          <Text style={styles.gridNumber}>2,825</Text>
          <View style={styles.fakeChartRow}>
            <View style={[styles.bar, { height: 10 }]} />
            <View style={[styles.bar, { height: 25 }]} />
            <View style={[styles.bar, { height: 40, backgroundColor: theme.primary }]} />
            <View style={[styles.bar, { height: 15 }]} />
          </View>
        </View>

        {/* Card 2: Step Distance */}
        <View style={[styles.gridCard, { width: CARD_WIDTH, backgroundColor: theme.cardBackground }]}>
          <Text style={styles.gridCardTitle}>Step Distance </Text>
          <Text style={styles.gridCardSub}>Today</Text>
          <Text style={styles.gridNumber}>1,35 KM</Text>
          <View style={styles.fakeChartRow}>
            <View style={[styles.bar, { height: 5 }]} />
            <View style={[styles.bar, { height: 15 }]} />
            <View style={[styles.bar, { height: 35, backgroundColor: theme.primary }]} />
            <View style={[styles.bar, { height: 20 }]} />
          </View>
        </View>

        {/* Card 3: Sessions */}
        <View style={[styles.gridCard, { width: CARD_WIDTH, backgroundColor: theme.cardBackground }]}>
          <Text style={styles.gridCardTitle}>Sessions </Text>
          <View style={styles.badge}><Text style={{fontSize: 12}}>⚡</Text></View>
          <Text style={styles.gridCardSub}>Outdoor Run</Text>
          <Text style={[styles.gridNumber, { color: '#4ADE80' }]}>0,67 KM</Text>
        </View>

        {/* Card 4: Awards */}
        <View style={[styles.gridCard, { width: CARD_WIDTH, backgroundColor: theme.cardBackground }]}>
          <Text style={styles.gridCardTitle}>Awards </Text>
          <View style={styles.awardBadge}>
            <Text style={{ fontSize: 28 }}>🏅</Text>
          </View>
          <Text style={styles.awardLabel}>July Runner</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* Permission Styles */
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
    marginTop: 10,
  },
  retroCard: {
    borderWidth: 4,
    borderColor: '#000000',
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333333',
    marginBottom: 24,
  },
  retroButton: {
    width: '100%',
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7F7F7F',
    textDecorationLine: 'underline',
  },

  /* Dashboard Styles */
  dashboardContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '900',
  },
  summaryDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '700',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '900',
  },
  heroCard: {
    borderWidth: 4,
    borderColor: '#000000',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  heroLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fakeRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fakeRingProgress: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    top: -6,
    left: -6,
  },
  heroStats: {
    marginLeft: 24,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#666',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridCard: {
    borderWidth: 3,
    borderColor: '#000000',
    padding: 14,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  gridCardSub: {
    fontSize: 11,
    color: '#666',
    fontWeight: '700',
    marginTop: 4,
  },
  gridNumber: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 6,
  },
  fakeChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 40,
  },
  bar: {
    width: 6,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#000000',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  awardBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  awardLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  //streak style
  streakRowCard: {
    borderWidth: 3,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  streakCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  streakCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  retroShareButton: {
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFDF9',
  },
  shareButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
  streakRowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigFlameBox: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 65,
    marginRight: 12,
  },
  flameNumber: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  flameUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: '#333',
  },
  daysContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#666',
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDateText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7F7F7F',
  },
});