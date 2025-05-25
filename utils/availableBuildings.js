import { edges } from "./navigationUtils";

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
        mappedFloors: ['3rd Floor'],
        navigator: ["Entrance", "ConferenceRoom1", "ConferenceRoom2", "ConferenceRoom3", "ConferenceRoom4", "ConferenceRoom5", "ConferenceRoom6", "Pantry", "MyCubical"],
        nodes: {
            Entrance: { x: 0, y: 0 },
            Junction1: {x: 0, y: 1  },
            Junction2: {x: -1, y: 1},
            ConferenceRoom1: {x: -1, y: 0},
            Junction3: {x: -2, y: 1},
            ConferenceRoom2: {x: -3, y: 1},
            Junction4: {x: -2, y: 2},
            ConferenceRoom3: {x: -3, y: 2},
            Junction5: {x: -2, y: 5},
            ConferenceRoom4: {x: -3, y: 5},
            Junction6: {x: -2, y: 6},
            ConferenceRoom5: {x: -3, y: 6},
            Junction7: {x: -2, y: 7},
            Junction8: {x: -1, y: 7},
            Pantry: {x: -1, y: 9},
            Junction9: {x: 2, y: 8},
           Junction10: {x: 2, y: 4},
           MyCubical: {x: 1, y: 4},
           Junction11: {x: 2, y: 3},
           Junction12: {x:2, y:2},
           Junction13: {x: 2, y:1},
           Junction14: {x: 1, y: 1},
           ConferenceRoom6: {x: 1, y: 0},
           
        },
        edges: {
            Entrance: ["Junction1"],
            Junction1: ["Entrance", "Junction2", "Junction14"],
            Junction2: ["Junction1", "Junction3", "ConferenceRoom1"],
            ConferenceRoom1: ["Junction2"],
            Junction3: ["Junction2", "Junction4", "ConferenceRoom2"],
            ConferenceRoom2: ["Junction3"],
            Junction4: ["Junction3", "Junction5", "ConferenceRoom3"],
            ConferenceRoom3: ["Junction4"],
            Junction5: ["Junction4", "Junction6", "ConferenceRoom4"],
            ConferenceRoom4: ["Junction5"],
            Junction6: ["Junction5", "Junction7", "ConferenceRoom5"],
            ConferenceRoom5: ["Junction6"],
            Junction7: ["Junction6", "Junction8"],
            Junction8: ["Junction7", "Junction9", "Pantry"],
            Pantry: ["Junction8"],
            Junction9: ["Junction8", "Junction10"] ,
            Junction10: ["Junction9", "Junction11", "MyCubical"],
            MyCubical: ["Junction10"],
            Junction11: ["Junction10", "Junction12",],
            Junction12: ["Junction11", "Junction13"],
            Junction13: ["Junction12", "Junction14"],
            Junction14: ["Junction1", "Junction13", "ConferenceRoom6"],
            ConferenceRoom6: ["Junction14"],
        }
    }
};

export default availableData;