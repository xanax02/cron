export const availableData = {
    'AbhayBuilding': {
        floors: ['1st Floor', '2nd Floor', '3rd Floor'],
        mappedFloors: ['1st Floor'],
        navigator: ["Entrance", "Hall", "Kitchen", "Balcony", "Washroom1", "Room1", "WashroomR1"],
        nodes: {
            Entrance: { x: 0, y: 0 },
            Hall: { x: 0, y: 1 },
            Junction1: { x: -1, y: 0 },
            
            Kitchen: { x: -2, y: 0 },
            Balcony: { x: -2, y: 1 },
            
            Junction2: { x: -1, y: -1},
            Washroom1: { x: -2, y: -1 },
           
            Room1: { x: -1, y: -2 },
            WashroomR1: { x: -2, y: -2 },   
        },
        edges: {
            Entrance: ["Hall", "Junction1"],
            Hall: ["Entrance"],
            Junction1: ["Entrance", "Kitchen", "Junction2"],
            Kitchen: ["Junction1", "Balcony"],
            Balcony: ["Kitchen"],
            Junction2: ["Junction1", "Washroom1", "Room1"],
            Washroom1: ["Junction2"],
            Room1: ["Junction2", "WashroomR1"],
            WashroomR1: ["Room1"],
        }
    },
    'LalitBuilding': {
        floors: ['1st Floor', '2nd Floor', '3rd Floor'],
        mappedFloors: []
    },
    'WestendCenter3': {
        floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', '6th Floor'],
        mappedFloors: ['6th Floor']
    }
};

export default availableData;