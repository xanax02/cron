

const nodes = {
    Entrance: { x: 0, y: 0 },
    Hall: { x: 0, y: 1 },           // Straight ahead from entrance
    
    // Turn left from entrance, then branch point
    Junction1: { x: -1, y: 0 },      // Branch point after turning left from entrance
    
    Kitchen: { x: -2, y: 0 },      // Straight from left turn point
    Balcony: { x: -2, y: 1 },      // Right turn from kitchen, distance ~5
    
    Junction2: { x: -1, y: -1},
    Washroom1: { x: -2, y: -1 },     // Right turn from HallwayA
   
    Room1: { x: -1, y: -2 },        // Left then right from HallwayA (side by side with Room2)
    WashroomR1: { x: -2, y: -2 },    // Left turn inside Room1
};

// Updated edges based on navigation flow
const edges = {
    Entrance: ["Hall", "Junction1"],
    Hall: ["Entrance"],
    Junction1: ["Entrance", "Kitchen", "Junction2"],  // Branch point
    Kitchen: ["Junction1", "Balcony"],
    Balcony: ["Kitchen"],
    Junction2: ["Junction1", "Washroom1", "Room1"],
    Washroom1: ["Junction2"],
    Room1: ["Junction2", "WashroomR1"],
    WashroomR1: ["Room1"],
};