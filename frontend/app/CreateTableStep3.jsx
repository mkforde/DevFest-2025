import React, { useState } from "react";
import { View, Text, Image, StyleSheet, ImageBackground, TouchableOpacity, ScrollView, useWindowDimensions, TextInput } from "react-native";
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';


interface DiningButtonProps {
  title: string;
  image: any;  // or more specific type if needed
  use: number;
  capacity: number;
}


function CustomBottomNav() {
  const [activeTab, setActiveTab] = useState("table");
  const navigation = useNavigation();
  
  return (
    <View style={styles.bottom}>
      <TouchableOpacity onPress={() => { setActiveTab("home"); navigation.navigate("home"); }}>
        <Image
          source={require("../assets/images/home.png")}
          style={[activeTab === "home" && styles.activeIcon]}
        />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => { setActiveTab("table"); navigation.navigate("table"); }}>
        <Image
          source={require("../assets/images/Table.png")}
          style={[activeTab === "table" && styles.activeIcon]}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setActiveTab("location"); navigation.navigate("location"); }}>
        <Image
          source={require("../assets/images/location.png")}
          style={[activeTab === "location" && styles.activeIcon]}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setActiveTab("profile"); navigation.navigate("profile"); }}>
        <Image
          source={require("../assets/images/profile.png")}
          style={[activeTab === "profile" && styles.activeIcon]}
        />
      </TouchableOpacity>
    </View>
  );
}

// Predefined arrays for vibes and interests
const VIBES = [
  "Chill & Casual",
  "Debate & Discuss",
  "Lively & Social",
  "Cram Session",
  "Quiet & Relaxed",
  "Speedy Vibes"
];

const INTERESTS = [
  "Music & Arts",
  "Travel & Adventure",
  "Gaming & Esports",
  "STEM & Tech Talk",
  "Fitness & Wellness",
  "Foodies & Chefs"
];

export default function CreateTableStep3() {
  const { height } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  
  const { diningHall, tableName, isPrivate, tableSize } = route.params || {};

  const [selectedVibes, setSelectedVibes] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const toggleVibe = (vibe) => {
    setSelectedVibes(prev => 
      prev.includes(vibe) 
        ? prev.filter(v => v !== vibe)
        : [...prev, vibe]
    );
  };

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    try {
      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session?.user) {
        alert('Please sign in to create a table');
        return;
      }

      // Get user's profile to get their UNI
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('uni')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.uni) {
        alert('Could not find your UNI. Please update your profile.');
        return;
      }

      // Now use the actual UNI from the profile
      const uni = profile.uni;

      // Generate PIN if table is private
      const pin = isPrivate ? Math.floor(1000 + Math.random() * 9000).toString() : null;

      // Create the table
      const { data: table, error: tableError } = await supabase
        .from('dining_tables')
        .insert({
          dining_hall: diningHall.name,
          table_name: tableName,
          privacy: isPrivate ? 'private' : 'public',
          size: tableSize.toString(),
          created_by: uni,
          is_locked: false,
          current_members: 1,
          pin: pin  // Store the PIN
        })
        .select()
        .single();

      if (tableError) throw tableError;

      // Add member
      const { error: memberError } = await supabase
        .from('members')  // Remove 'tables.' prefix
        .insert({
          table_id: table.id,
          uni: uni,
          is_host: true
        });

      if (memberError) throw memberError;

      // Get vibes and interests
      const { data: vibeIds } = await supabase
        .from('vibes')  // Remove 'tables.' prefix
        .select('id, name')
        .in('name', selectedVibes);

      const { data: interestIds } = await supabase
        .from('interests')  // Remove 'tables.' prefix
        .select('id, name')
        .in('name', selectedInterests);

      // Combine all interests
      const allInterests = [
        ...(vibeIds || []).map(v => ({ table_id: table.id, interest_id: v.id })),
        ...(interestIds || []).map(i => ({ table_id: table.id, interest_id: i.id }))
      ];

      // Add interests
      const { error: interestsError } = await supabase
        .from('table_interests')  // Remove 'tables.' prefix
        .insert(allInterests);

      if (interestsError) throw interestsError;

      // Pass the PIN to GenerateTable
      navigation.navigate('GenerateTable', {
        tableId: table.id,
        diningHall: diningHall.name,
        tableName,
        isPrivate,
        tableSize,
        selectedVibes,
        selectedInterests,
        pin  // Pass the PIN
      });

    } catch (error) {
      console.error('Error creating table:', error);
      alert('Failed to create table. Please try again.');
    }
  };

  const DiningButton = ({ title, image, use, capacity }: DiningButtonProps) => {
    const navigation = useNavigation();
    const fillPercentage = use / capacity;
    
    // Determine bar color
    let barColor;
    if (fillPercentage < 0.25) {
      barColor = "#9AD94B";
    } else if (fillPercentage <= 0.5) {
      barColor = "#FFC632";
    } else if (fillPercentage <= 0.75) {
      barColor = "#E15C11";
    } else {
      barColor = "#E11111";
    }

    return (
      <TouchableOpacity 
        style={styles.diningButton}
        onPress={() => {
          navigation.navigate('CreateTableStep2', { diningHall: title });
        }}
      >
        <ImageBackground source={image} resizeMode="cover" style={styles.imageBackground}>
          <View style={styles.overlay} />
          <Text style={styles.buttonText}>{title}</Text>
          {/* Progress Bar */}
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.body}>
      <View style={styles.container}>
        <ScrollView style={{ height: height - 82, marginBottom: 80 }}>
          <View style={styles.top}>
            <Text style={styles.title}>Create a table</Text>
            <Text style={styles.subtitle}>at {diningHall.name}</Text>
            <Image source={require("../assets/images/Progress bar3.png")}/>
          </View>

          {/* Vibes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's the vibe?</Text>
            <View style={styles.tagsContainer}>
              {VIBES.map((vibe) => (
                <TouchableOpacity
                  key={vibe}
                  style={[
                    styles.tagButton,
                    selectedVibes.includes(vibe) && styles.selectedTagButton
                  ]}
                  onPress={() => toggleVibe(vibe)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedVibes.includes(vibe) && styles.selectedTagText
                  ]}>
                    {vibe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interests Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests/topics:</Text>
            <View style={styles.tagsContainer}>
              {INTERESTS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.tagButton,
                    selectedInterests.includes(interest) && styles.selectedTagButton
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedInterests.includes(interest) && styles.selectedTagText
                  ]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Create a table</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.navigate('table')}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    height: 82,
    width: 393,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  body: {
    width: "100%",
    alignItems: "center",
    flex: 1,
    fontFamily: "Helvetica",
  },
  container: {
    flex: 1,
    backgroundColor: "#FDFECC",
    alignContent: "center",
    width: 393,
  },
  top: {
    flexDirection: "column",
    marginTop: 30,
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    color: "rgba(66, 57, 52, 1)",
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: "#423934",
    fontWeight: "600",
    marginBottom:20,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#423934",
    marginBottom: 15,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagButton: {
    backgroundColor: "#E15C11",
  },
  tagText: {
    color: "#423934",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedTagText: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#E15C11",
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  diningRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 10,
  },
  diningButton: {
    width: 152,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
  },
  imageBackground: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  buttonText: {
    fontSize: 17.55,
    color: "#FFFFFF", // Light yellow text
    fontWeight: "900",
    marginLeft: "5%",
  },
  closeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FDFECC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  closeButton: {
    backgroundColor: "#E15C11",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});