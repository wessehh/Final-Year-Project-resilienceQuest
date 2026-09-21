import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Switch, Linking, Platform } from 'react-native';
import { blue, red } from 'react-native-reanimated/lib/typescript/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';


//-----Styles-----
const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  scrollCanvas: {
    paddingTop: 60,
    paddingBottom: 40, 
    paddingHorizontal: 16,
  },
  headerBlock: {
    backgroundColor:'#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth:1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize:24,
    fontWeight: '800',
    color:'#1a365d',
  },
  subTitle: {
    fontSize: 14,
    color: '#0080ff',
    marginTop: 4,
  },
  xpReadout: {
    fontSize: 15, 
    marginTop:6,
    color: '#4a5568',
    fontWeight: '500',
  },
  xpHighlight: {
    color: '#3182ce',
    fontWeight: '700',
  },
  componentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 16, 
    borderWidth: 1,
    borderColor: '#3f3e3f',
  },
  sectionHeading: {
    fontSize: 16, 
    fontWeight: '700',
    color: '#2d3748',
  },
  bodyDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf2f7'
  },
  checkboxMetric: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskLabel: {
    fontSize: 13,
    color: '#4a5568',
    fontWeight: '500',
    flex: 1
  },
  //toggle logic for checkbox
  taskItemChecked: {
    backgroundColor: '#f0fff4',
    borderColor: '#c6f6d5'
  },
  checkboxActive: {
    backgroundColor: '#38a169',
    borderColor: '#38a169'
  },
  taskLabelCrossed: {
    textDecorationLine: 'line-through',
    color: '#a0aec0'
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14, 
  },
  telemetryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  telemetryLabel: {
    fontSize: 13, 
    fontWeight: '600',
    color: '#4a5568'
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2b6cb0'
  },
  coordinateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ebf8ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 6
  },
  geoText: {
    fontSize: 12, 
    fontFamily: 'monospace',
    color: '#2b6cb0',
    fontWeight: '700'
  },
  geoAwaitingText: {
    fontSize: 12, 
    fontStyle: 'italic',
    color: '#a0aec0',
    marginTop: 6, 
    textAlign: 'center'
  },
  telemetryValueError: {
    color: '#e53e3e',
  },
  fallbackContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  syncButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 10,
    paddingHorizontal: 16, 
    borderRadius: 8,
    marginTop: 12, 
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b6cb0'
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 13, 
    fontWeight: '700'
  }
})

//-----Define the variables for prep tasks---
interface Task {
  id: number;
  text: string;
  completed: boolean;
  xpReward: number;
}

export default function App() {

  // lifecycle hook 
  useEffect(() => {
    loadSaveProgress();
    //trigger sensor handshake on boot
    initialiseTelemetry();
  }, []); // Runs exactly once when the compeonent mounts

  // declare reactive state metrics
  const [xp, setXp] = useState<number>(0)
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, text: 'Pack 3 litres of fresh drinking water', completed: false, xpReward: 30},
    { id: 2, text: 'Prepare non-perishable emergency rations', completed: false, xpReward: 30},
    { id: 3, text: 'Secure an offline AM/FM pocket radio', completed: false, xpReward: 40},
  ]);

  // telemetry and hardware states 
  // holds the physical location coordinates from the GPS chip 
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  // display tracking readouts directly to user
  const [trackingStatus, setTrackingStatus] = useState<string>('Initialising sensors...');
  
  //hardware sensor handshake 
  const initialiseTelemetry = async () => {
    try {
      // 1. verify location system switch 
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setTrackingStatus('Disabled');
         
        // if user clicks on the button while the hardware master switch is off:
        if (Platform.OS === 'android') {
          await Linking. sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        } else {
          await Linking.openSettings();
        }
        return;
      }

      //2. evaluate existing OS app permissions
      let permissionResult = await Location.getForegroundPermissionsAsync();
      let currentStatus = permissionResult.status;

      //3. if not granted yet, trigger request 
      if (currentStatus !== 'granted') {
        setTrackingStatus('Syncing...');
        const requestResult = await Location.requestForegroundPermissionsAsync();
        currentStatus = requestResult.status;
      }

      //4. handle denial gracefully
      if (currentStatus !== 'granted') {
        setTrackingStatus('Unauthorised');
        setCurrentLocation(null); //wipe old coords

        await Linking.openSettings();
        return;
      }

      //5. success = bind coords to memory
      setTrackingStatus('Active');

      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc) setCurrentLocation(loc.coords);

      } catch (hardwareError) {
        let lowAccuracyLoc = await Location.getCurrentPositionAsync ({ accuracy: Location.Accuracy.Lowest });
        if (lowAccuracyLoc) {
          setCurrentLocation(lowAccuracyLoc.coords);
          setTrackingStatus('Active (Approximate)');
        }
      }

    } catch (err) {
      console.error("Hardware telemetry connection failure:", err);
      setTrackingStatus('Error');
    }
  };

  // Controller Logic for checklist
    const handleTaskToggle = (id:number) =>{
      let xpChange = 0;

      // map through task and create a copy array 
      const updatedTasks = tasks.map(task =>{
        if (task.id == id) {
          const nextState = !task.completed;
          // Assign points based on whether the task has been checked or not
          xpChange = nextState ? task.xpReward : -task.xpReward;
          return {...task, completed: nextState};
        }
        //Return unchanged tasks exactly as they were
        return task; 
      });
      setTasks(updatedTasks);
      // Math.max prevents the score from dropping below 0
      setXp(Math.max(0, xp + xpChange));

      //call storage writer function
      saveProgressToDisk(Math.max(0, xp + xpChange), updatedTasks);

    };

    // AsyncStorage for persistent writing
    // Serialises state data structure and commits them to physical disk storage 
    const saveProgressToDisk = async (newXp: number, currentTasks: Task[]) => {
      try {
        //Convert data to strings because AsyncStorage only saves plain text string
        // @RQ_ keys
        await AsyncStorage.setItem('@RQ_USER_XP', newXp.toString());
        await AsyncStorage.setItem('@RQ_TASK_STATE', JSON.stringify(currentTasks));
      } catch (error) {
        console.error ("AsyncStorage write collision:", error);
      }
    };

    // AsyncStorage persistent reader 
    // Pulls data packages from disk memory and initialises the runtime application 
    const loadSaveProgress = async () => {
      try {
        const storedXp = await AsyncStorage.getItem('@RQ_USER_XP');
        const storedTasks = await AsyncStorage.getItem('@RQ_TASK_STATE');

        // Only assign sattes if the keys actually exists in the device memory
        if (storedXp !== null) setXp(parseInt(storedXp));
        if (storedTasks !== null) setTasks(JSON.parse(storedTasks));
      } catch (error) {
        console.error("Failed parsing local storage matrix:", error);
      }
    };
    

  return (
    
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        <View style={styles.headerBlock}>
          <Text style={styles.brandTitle}> ResilienceQuest</Text>
          <Text style={styles.subTitle}>Empowering Localised Disaster Response</Text>
          <Text style={styles.xpReadout}>Progress: <Text style={styles.xpHighlight}>{xp} XP</Text></Text>
        </View>

        {/* Checklist Card */}
        <View style={styles.componentCard}>
          <Text style={styles.sectionHeading}>Active Quests: Peacetime Prep</Text>
          <Text style={styles.bodyDescription}>
            Complete physical preparation objectives to XP!
          </Text>

          {tasks.map(task => (
            <TouchableOpacity 
            key={task.id} 
            // pass an array of styles. the check style only loads if completed is true.
            style={[styles.taskItem, task.completed && styles.taskItemChecked]}
            onPress={() => handleTaskToggle(task.id)}
            activeOpacity={0.7}
            >
              <View style={[styles.checkboxMetric, task.completed && styles.checkboxActive]}>
                {task.completed && (
                  <Text style={styles.checkmarkText}>✓</Text>
                )}
              </View>

              <Text style={[styles.taskLabel, task.completed && styles.taskLabelCrossed]}>
                {task.text} (+{task.xpReward} XP)
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Services */}
        <View style={styles.componentCard}>
          <Text style={styles.sectionHeading}>System Telemetry Matrix</Text>
          <Text style={styles.bodyDescription}>Monitoring native device hardware sensor arrays for localised coordinate tracking.</Text>

          <View style={styles.telemetryStatusRow}>
            <Text style={styles.telemetryLabel}>Sensor Node Link:</Text>
            {/* style dynamically changes based on system state */}
            <Text style={[
              styles.telemetryValue, 
              (trackingStatus === 'Unauthorised' || trackingStatus === 'Disabled') && styles.telemetryValueError
            ]}>
              {trackingStatus}
            </Text>
          </View>

          {currentLocation ? (
            <View style={styles.coordinateGrid}>
              <Text style={styles.geoText}>LAT: {currentLocation.latitude.toFixed(5)}</Text>
              <Text style={styles.geoText}>LON: {currentLocation.longitude.toFixed(5)}</Text>
            </View>
          ) : (
            <View style={styles.fallbackContainer}>
              <Text style={styles.geoAwaitingText}>
                {trackingStatus === 'Unauthorised'
                  ? "GPS core connection offline due to restricted security permissions."
                  : "Awaiting hardware communication link verification..."}
              </Text>

              {(trackingStatus === 'Unauthorised' || trackingStatus === 'Disabled') && (
                <TouchableOpacity
                style={styles.syncButton}
                onPress={initialiseTelemetry}
                activeOpacity={0.7}>
                  <Text style={styles.syncButtonText}>Re-Sync Hardware Sensors</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}