import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, ImageBackground, TouchableOpacity, Dimensions, ScrollView, useWindowDimensions, SafeAreaView } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function menu() {
  const navigation = useNavigation(); // Initialize navigation
  const [menuItems, setMenuItems] = useState({});
  const [menuLoading, setMenuLoading] = useState(true);
  const [occupancyData, setOccupancyData] = useState({ use: 30, capacity: 60 });

  const reviews = [
    { name: "Alice", rating: 5, comment: "Delicious! Highly recommend." },
    { name: "John", rating: 4, comment: "Tasty but a bit salty." },
    { name: "Emma", rating: 3, comment: "Average, not the best I've had." },
    { name: "Mike", rating: 2, comment: "Not great, wouldn't order again." },
    { name: "Chris", rating: 1, comment: "Terrible. Avoid at all costs." },
  ];
  
  const renderStars = (rating) => {
    const totalStars = 5;
    let stars = [];
  
    for (let i = 0; i < totalStars; i++) {
      if (i < rating) {
        stars.push(
          <Image 
            key={i} 
            source={require("../assets/images/star_gold.png")} // Gold Star
            style={styles.starIcon} 
          />
        );
      } else {
        stars.push(
          <Image 
            key={i} 
            source={require("../assets/images/star_gray.png")} // Gray Star
            style={styles.starIcon} 
          />
        );
      }
    }
    return stars;
  };
  
  const dietIcons = {
    'Vegan': require("../assets/images/Vegan.png"),
    'Vegetarian': require("../assets/images/Vegan.png"),
    'Halal': require("../assets/images/Halal.png"),
    'Gluten Free': require("../assets/images/Gluten_Free.png")
  };
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Option 1", value: "option1" },
    { label: "Option 2", value: "option2" },
    { label: "Option 3", value: "option3" },
  ]);

  const name = "Alice";
  const clickedDining = "Chef Dons";
  const isOpen = "OPEN";
  const { height } = useWindowDimensions(); // Auto-updating height
  const timing = "{Insert time}";

  const DiningButton = ({ title, image, use, capacity }) => {
     const fillPercentage = use / capacity;
     const [selectedValue, setSelectedValue] = useState(null);

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
       <TouchableOpacity style={styles.diningButton}>
       
          <Text style={[styles.capacityText, {color: barColor}]}>{use}/{capacity}</Text>
 
           {/* Progress Bar */}
           <View style={styles.progressBarContainer}>
             <View style={[styles.progressBarFill, { width: `${fillPercentage * 100}%`, backgroundColor: barColor }]} />
           </View>

       </TouchableOpacity>
     );
   };

  // Fetch menu and nutrition data from cache
  useEffect(() => {
    async function fetchMenuData() {
      try {
        setMenuLoading(true);
        
        // Get menu items from cache
        const { data: menuData, error: menuError } = await supabase
          .from('menu_cache')
          .select('*')
          .eq('diningHall', "Chef Don's")
          .order('foodType');

        if (menuError) {
          console.error('Error fetching menu:', menuError);
          return;
        }

        // Get nutrition data from cache
        const { data: nutritionData, error: nutritionError } = await supabase
          .from('nutrition_cache')
          .select('*')
          .eq('dining_hall', "Chef Don's");

        if (nutritionError) {
          console.error('Error fetching nutrition:', nutritionError);
        }

        // Organize menu items by meal type and food type
        const organizedMenu = menuData.reduce((acc, item) => {
          // Create meal type section if it doesn't exist
          if (!acc[item.mealType]) {
            acc[item.mealType] = {};
          }
          
          // Create food type section if it doesn't exist
          if (!acc[item.mealType][item.foodType]) {
            acc[item.mealType][item.foodType] = [];
          }

          // Find nutrition data for this item
          const nutrition = nutritionData?.find(n => n.meal_name === item.foodName);

          // Add item with its nutrition data
          acc[item.mealType][item.foodType].push({
            ...item,
            // Ensure dietaryPreferences is a string
            dietaryPreferences: typeof item.dietaryPreferences === 'string' 
              ? item.dietaryPreferences 
              : JSON.stringify(item.dietaryPreferences),
            // Ensure contains is a string
            contains: typeof item.contains === 'string'
              ? item.contains
              : JSON.stringify(item.contains),
            nutrition: nutrition?.nutrition_data || {}
          });

          return acc;
        }, {});

        setMenuItems(organizedMenu);
        setMenuLoading(false);
      } catch (error) {
        console.error('Error loading menu data:', error);
        setMenuLoading(false);
      }
    }

    fetchMenuData();
  }, []);

  // Add useEffect to load stored data
  useEffect(() => {
    async function loadStoredData() {
      try {
        const cached = await AsyncStorage.getItem('chefdons_occupancy');
        if (cached) {
          setOccupancyData(JSON.parse(cached));
        }
      } catch (error) {
        console.error('Error loading stored data:', error);
      }
    }
    loadStoredData();
  }, []);

  // Update menu rendering
  const renderMenu = () => {
    if (menuLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      );
    }

    // Combine all items across meal types and organize by food type
    const foodTypes = {};
    Object.values(menuItems).forEach(mealPeriod => {
      Object.entries(mealPeriod).forEach(([foodType, items]) => {
        if (!foodTypes[foodType]) {
          foodTypes[foodType] = [];
        }
        foodTypes[foodType].push(...items);
      });
    });

    return Object.entries(foodTypes).map(([foodType, items]) => (
      <View key={foodType} style={styles.foodTypeSection}>
        <Text style={styles.foodTypeTitle}>{foodType}</Text>
        
        {items.map((item, index) => (
          <View key={index} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemName}>{item.foodName}</Text>
              {item.nutrition?.calories && (
                <Text style={styles.calories}>{item.nutrition.calories} cal</Text>
              )}
              {item.contains && 
               item.contains.replace(/[{}"\[\]]/g, '').split(',').filter(Boolean).length > 0 && (
                <Text style={styles.allergens}>
                  Contains: {item.contains.replace(/[{}]/g, '').split(',').filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
            <View style={styles.dietaryIcons}>
              {item.dietaryPreferences && 
                (typeof item.dietaryPreferences === 'string' 
                  ? item.dietaryPreferences
                  : JSON.stringify(item.dietaryPreferences))
                  .replace(/[{}"\[\]]/g, '')
                  .split(',')
                  .filter(pref => pref && pref.trim().length > 0)
                  .map((diet, i) => {
                    const cleanDiet = diet.trim();
                    return dietIcons[cleanDiet] && (
                      <Image 
                        key={i} 
                        source={dietIcons[cleanDiet]} 
                        style={styles.dietaryIcon} 
                      />
                    );
                  })
              }
            </View>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.container}>
          <ScrollView> 
            <View style={styles.header}>
                <ImageBackground source= {require("../assets/images/chefdons.jpg")} resizeMode="cover" style={styles.imageBackground}>
                  <View style={styles.overlay} />
                  <TouchableOpacity style={styles.imgback} onPress={() => navigation.goBack()}>
                    <Image style={styles.imgback} source={require("../assets/images/backsymb.png")} />
                  </TouchableOpacity>              
                  <View  style = {styles.topheader}>
                      <View style = {styles.openable}> <Text style={styles.openabletext}>{isOpen}</Text></View>
                      <Text style={styles.title}>{clickedDining}</Text>
                  </View>
                  <View style = {styles.bottomheader}>
                      <Text style={styles.subtitle}>{timing}</Text>
                  </View>
                </ImageBackground>
            </View>

            {/* Welcome Text */}
            <View>
              <View style = {styles.stats}>
                <View style = {styles.stat}>
                  <View style = {styles.nutri}>
                    <Text style = {styles.Stitle}>Nutri-score</Text>
                    <Image source={require("../assets/images/tooltip.png")} />
                  </View>
                  <View style = {styles.nutri}>
                    <Text style={styles.Stitle}>Current Seating Capacity</Text>
                    <Image source={require("../assets/images/tooltip.png")} />
                  </View>
                </View>
                <View style = {styles.imageM}>
                  <Image source={require("../assets/images/NutriB.png")} />
                  <DiningButton title="Chef Dons" image={require("../assets/images/chefdons.jpg")} use={30} capacity = {60}  />
                </View>
              </View>

              <View  style={styles.menuTitle}>
                <Text style={styles.titleM}>Menu</Text>
              </View>
              {renderMenu()}
              <View style={styles.reviewsContainer}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                {reviews.map((review, index) => (
                  <View key={index} style={styles.reviewItem}>
                    <Text style={styles.reviewText}>
                      <Text style={styles.bold}>{review.name}</Text>: {review.comment}
                    </Text>
                    <View style={styles.starContainer}>{renderStars(review.rating)}</View>
                  </View>
                ))}
              </View>


            </View>
           

          </ScrollView>
          
       
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  imgback:{
    position: "absolute",
    left:0,
    top:0,
    height: 50,
    width: 50,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#423934",
    
  },
  menuContainer:{
    gap: 10,
    marginLeft: 20,

  },
  menuItemCalories: {
    fontSize: 14,
    color: "#8D7861",
  },
  dietaryIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  dietaryIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
  },
  menuTitle:{
    marginLeft: 20,
    marginBottom: 20,
  },
  container:{
    flex: 1,
    backgroundColor: "#FDFECC", // Light yellow background
    alignContent: "center",
    width: 393,
    paddingTop: 47, // Add top padding for iPhone bezel
  }, 
  
  topheader:{
    flexDirection: "row",
    alignItems:"center",
    gap: 10,
    marginLeft: 20,
    

  }, 
  Stitle:{
    fontSize: 13.56,
    fontWeight:500, 
  },
  bottomheader:{
    marginBottom: 20,
    marginLeft: 20,
  },
  diningButton:{
    flexDirection: "row",
  },
  stats:{
    alignItems: "space-evenly",
    marginTop: 20,
    gap:10,
    marginBottom: 40,


  },
  imageM:{
    justifyContent: "space-evenly",
    flexDirection: "row",
    alignItems:"center",
  },
  stat:{
    
    flexDirection: "row", 
    justifyContent: "space-evenly",

  },
  nutri:{
    flexDirection: "row",
    gap: 5,
  },
  header:{
    height:192,
    width: 394,
    justifyContent: "flex-end",
  

  },
  subtitle:{
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",

  },
  openable:{
    width:50.08,
    height: 25.04, 
    backgroundColor: "#EEF168",
    alignItems: "center", 
    borderRadius: 19.26,
    justifyContent: "center",

  },
  openabletext:{
    color: "rgba(66, 57, 52, 1)",
    fontSize: 12.52,
    borderRadius: 19.26,
    fontWeight: 600,

  },
  titleM:{
    fontSize: 33.38,
    fontWeight: 900,
    color: "rgba(, 57, 52, 1)",
  },
  title:{
    fontSize: 33.38,
    fontWeight: 900,
    color: "#FFF",
  },
  body:{
    width:"100%",
    alignItems: "center",
    flex: 1, // Full height of the screen
    fontFamily: "Helvetica",

  },
 bold:{
    fontWeight: "bold",
 }, 
 imageBackground: {
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
},
overlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
},

  progressBarContainer: {
    width: 97,
    height: 8,
    backgroundColor: "#ccc",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 5,
    marginLeft: "5%",

  },
  progressBarFill: {
    height: "100%",
  },
  
  buttonText: {
    fontSize: 17.55,
    color: "#FFFFFF", // Light yellow text
    fontWeight: "900",
    marginLeft: "5%",

   
  },
  capacityText: {
    color: "#FFFFFF",
    fontSize: 13.56,
    fontWeight: "900",

    
  },
  reviewsContainer: {
    backgroundColor: "#FDFECC",
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 10,
    marginBottom: 10,
  },
  reviewText: {
    fontSize: 14,
    color: "#423934",
  },
  
  starContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  starIcon: {
    width: 18,
    height: 18,
    marginRight: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  foodTypeSection: {
    marginBottom: 20,
  },
  foodTypeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  menuItemLeft: {
    flex: 1,
  },
  calories: {
    fontSize: 14,
    color: '#8D7861',
  },
  allergens: {
    fontSize: 14,
    color: '#8D7861',
  },
});
