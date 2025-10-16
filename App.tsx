/**
 * WebApp Container with Permissions
 * Displays a URL in fullscreen with zoom disabled and handles permissions
 */

import React, { useEffect, useState } from 'react';
import { 
  StatusBar, 
  StyleSheet, 
  useColorScheme, 
  View, 
  Alert, 
  Platform,
  ActivityIndicator,
  Text 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { request, PERMISSIONS, check, RESULTS } from 'react-native-permissions';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// Configure your URL here
const WEBAPP_URL = 'https://tb.pressgenai.com/'; // Change this to your desired URL

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        translucent={true}
        backgroundColor="transparent"
      />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webViewLoaded, setWebViewLoaded] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Request Android permissions
        const cameraPermission = await request(PERMISSIONS.ANDROID.CAMERA);
        const audioPermission = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
        const locationPermission = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

        console.log('Camera Permission:', cameraPermission);
        console.log('Audio Permission:', audioPermission);
        console.log('Location Permission:', locationPermission);

        // Check if all essential permissions are granted
        if (
          cameraPermission === RESULTS.GRANTED &&
          audioPermission === RESULTS.GRANTED &&
          locationPermission === RESULTS.GRANTED
        ) {
          setPermissionsGranted(true);
        } else {
          // Handle denied permissions
          Alert.alert(
            'Permissions Required',
            'Some features may not work properly without camera, microphone, and location permissions. You can enable them in app settings.',
            [{ text: 'OK' }]
          );
          setPermissionsGranted(true); // Still load the app
        }
      } else if (Platform.OS === 'ios') {
        // Request iOS permissions
        const cameraPermission = await request(PERMISSIONS.IOS.CAMERA);
        const microphonePermission = await request(PERMISSIONS.IOS.MICROPHONE);
        const locationPermission = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

        console.log('Camera Permission:', cameraPermission);
        console.log('Microphone Permission:', microphonePermission);
        console.log('Location Permission:', locationPermission);

        if (
          cameraPermission === RESULTS.GRANTED ||
          microphonePermission === RESULTS.GRANTED ||
          locationPermission === RESULTS.GRANTED
        ) {
          setPermissionsGranted(true);
        } else {
          Alert.alert(
            'Permissions Required',
            'Some features may not work properly without the requested permissions. You can enable them in Settings.',
            [{ text: 'OK' }]
          );
          setPermissionsGranted(true); // Still load the app
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionsGranted(true); // Load app even if permission request fails
    }
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setWebViewLoaded(true);
    // Small delay to show loading completed smoothly
    setTimeout(() => setLoading(false), 500);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError(nativeEvent.description || 'Failed to load web page');
    setLoading(false);
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError(`HTTP Error: ${nativeEvent.statusCode}`);
    setLoading(false);
  };

  const injectedJavaScript = `
    (function() {
      // Disable zoom gestures
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
      
      // Prevent double-tap zoom
      document.addEventListener('dblclick', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      
      // Prevent pinch zoom
      document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });
      
      document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });
      
      // Hide loading when content is ready
      document.addEventListener('DOMContentLoaded', function() {
        window.ReactNativeWebView.postMessage('DOMContentLoaded');
      });
      
      window.addEventListener('load', function() {
        window.ReactNativeWebView.postMessage('pageLoaded');
      });
      
      true;
    })();
  `;

  const handleMessage = (event: any) => {
    const message = event.nativeEvent.data;
    console.log('Message from webview:', message);
    
    if (message === 'pageLoaded' || message === 'DOMContentLoaded') {
      setWebViewLoaded(true);
      setTimeout(() => setLoading(false), 300);
    }
  };

  const reloadWebView = () => {
    setError(null);
    setLoading(true);
    setWebViewLoaded(false);
  };

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {/* Main WebView */}
      <WebView
        source={{ uri: WEBAPP_URL }}
        style={[styles.webview, loading && styles.hiddenWebview]}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={true}
        allowsBackForwardNavigationGestures={true}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        onMessage={handleMessage}
        startInLoadingState={false}
        renderLoading={() => <View />} // Empty loading renderer since we have our own
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {webViewLoaded ? 'Loading...' : 'Loading Sampark Mitra...'}
            </Text>
          </View>
        </View>
      )}

      {/* Error Overlay */}
      {error && !loading && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <View style={styles.buttonContainer}>
              <Text style={styles.retryButton} onPress={reloadWebView}>
                Try Again
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  hiddenWebview: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    maxWidth: '80%',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 8,
  },
  retryButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default App;