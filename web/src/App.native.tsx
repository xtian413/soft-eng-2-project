import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import assets
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';

export default function App() {
  const [count, setCount] = useState(0);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Hero Area */}
        <View style={styles.heroSection}>
          <View style={styles.imageContainer}>
            {/* Base Background Image */}
            <Image source={heroImg as any} style={styles.baseImage} />
            {/* Overlaid Logos */}
            <View style={styles.logoOverlays}>
              <Image source={reactLogo as any} style={styles.reactLogo} />
              <Image source={viteLogo as any} style={styles.viteLogo} />
            </View>
          </View>
          
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.subtitle}>
            Edit <Text style={styles.codeText}>src/App.native.tsx</Text> and save to test HMR on mobile.
          </Text>
        </View>

        {/* Counter Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setCount((c) => c + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.counterText}>Count is {count}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Next Steps / Docs */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionHeader}>Documentation</Text>
          <Text style={styles.sectionDesc}>Your questions, answered</Text>
          
          <View style={styles.linkList}>
            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => openUrl('https://vite.dev/')}
            >
              <Image source={viteLogo as any} style={styles.linkIcon} />
              <Text style={styles.linkText}>Explore Vite</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => openUrl('https://react.dev/')}
            >
              <Image source={reactLogo as any} style={styles.linkIcon} />
              <Text style={styles.linkText}>Learn React</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Connect */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionHeader}>Connect with us</Text>
          <Text style={styles.sectionDesc}>Join the community</Text>
          
          <View style={styles.linkListGrid}>
            <TouchableOpacity 
              style={styles.gridLinkButton} 
              onPress={() => openUrl('https://github.com/vitejs/vite')}
            >
              <Text style={styles.gridLinkText}>GitHub</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.gridLinkButton} 
              onPress={() => openUrl('https://chat.vite.dev/')}
            >
              <Text style={styles.gridLinkText}>Discord</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.gridLinkButton} 
              onPress={() => openUrl('https://x.com/vite_js')}
            >
              <Text style={styles.gridLinkText}>X.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Tailwind slate-900 look
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  imageContainer: {
    width: 200,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  baseImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  logoOverlays: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    bottom: 10,
  },
  reactLogo: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  viteLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#38bdf8',
    fontWeight: '600',
    backgroundColor: '#1e293b',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  counterButton: {
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  counterText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 24,
  },
  infoSection: {
    width: '100%',
    alignItems: 'flex-start',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  linkList: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  linkIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  linkText: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 14,
  },
  linkListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  gridLinkButton: {
    flex: 1,
    minWidth: '28%',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gridLinkText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  spacer: {
    height: 50,
  },
});
