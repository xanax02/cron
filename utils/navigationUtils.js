import { availableData } from './availableBuildings';

// Utility: Euclidean distance
function euclideanDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Default nodes and edges as fallback
let defaultNodes = {
  Entrance: { x: 0, y: 0 },
  Hall: { x: 0, y: 1 },
  Junction1: { x: -1, y: 0 },
  Kitchen: { x: -2, y: 0 },
  Balcony: { x: -2, y: 1 },
  Junction2: { x: -1, y: -1},
  Washroom1: { x: -2, y: -1 },
  Room1: { x: -1, y: -2 },
  WashroomR1: { x: -2, y: -2 },
};

let defaultEdges = {
  Entrance: ["Hall", "Junction1"],
  Hall: ["Entrance"],
  Junction1: ["Entrance", "Kitchen", "Junction2"],
  Kitchen: ["Junction1", "Balcony"],
  Balcony: ["Kitchen"],
  Junction2: ["Junction1", "Washroom1", "Room1"],
  Washroom1: ["Junction2"],
  Room1: ["Junction2", "WashroomR1"],
  WashroomR1: ["Room1"],
};

// Variables to hold current nodes and edges
let nodes = { ...defaultNodes };
let edges = { ...defaultEdges };
  
// Function to set the current building's nodes and edges
function setCurrentBuilding(buildingName) {
  if (buildingName && buildingName in availableData) {
    const buildingData = availableData[buildingName];
    
    // If building has nodes and edges, use them
    if (buildingData.nodes && buildingData.edges) {
      nodes = buildingData.nodes;
      edges = buildingData.edges;
      return true;
    }
  }
  
  // Fallback to defaults if no valid building data
  nodes = { ...defaultNodes };
  edges = { ...defaultEdges };
  return false;
}

// Dijkstra's Algorithm
function findShortestPath(start, end) {
  const distances = {};
  const prev = {};
  const queue = new Set(Object.keys(nodes));

  for (let node of queue) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[start] = 0;

  while (queue.size > 0) {
    // Node with smallest distance
    let current = [...queue].reduce((a, b) => (distances[a] < distances[b] ? a : b));
    queue.delete(current);

    if (current === end) break;

    // Skip if no edges for current node
    if (!edges[current]) continue;

    for (let neighbor of edges[current]) {
      if (!queue.has(neighbor)) continue;

      let alt = distances[current] + euclideanDistance(nodes[current], nodes[neighbor]);
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = current;
      }
    }
  }

  // Build path
  const path = [];
  for (let at = end; at != null; at = prev[at]) {
    path.push(at);
  }
  return path.reverse();
}
  
  // Get relative direction using vector math for more accurate turns
  function getRelativeDirection(from, to, previous) {
    // If no previous point, assume initial facing direction is toward Hall (positive Y)
    if (!previous) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      
      // Determine direction relative to initial forward direction (toward Hall)
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
      } else {
        return dy > 0 ? 'straight' : 'back';
      }
    }
    
    // Calculate previous direction vector
    const prevDx = from.x - previous.x;
    const prevDy = from.y - previous.y;
    
    // Calculate current direction vector
    const currDx = to.x - from.x;
    const currDy = to.y - from.y;
    
    // Calculate cross product to determine turn direction
    const crossProduct = prevDx * currDy - prevDy * currDx;
    
    // Calculate dot product to determine if it's forward/backward
    const dotProduct = prevDx * currDx + prevDy * currDy;
    
    // Determine relative direction
    if (Math.abs(crossProduct) < 0.1) {
      // Going straight or backward
      if (dotProduct > 0) {
        return 'straight';
      } else {
        return 'around (180°)';
      }
    } else if (crossProduct > 0) {
      return 'left';
    } else {
      return 'right';
    }
  }
  
  // Calculate path description with distances and accurate turns, returning a map of node to direction info
  function getPathDescription(path, nodeMap) {
    if (!path || path.length < 2) return {};
    
    const directionMap = {};
    
    // First movement - no previous direction to reference
    if (path.length >= 2) {
      const first = path[0];
      const second = path[1];
      
      const distance = Math.sqrt(
        Math.pow(nodeMap[second].x - nodeMap[first].x, 2) + 
        Math.pow(nodeMap[second].y - nodeMap[first].y, 2)
      ).toFixed(1);
      
      const initialDirection = getRelativeDirection(nodeMap[first], nodeMap[second]);
      
      // Store direction info for first node
      directionMap[first] = {
        direction: initialDirection,
        distance: distance,
        nextNode: second,
        directionText: `Go ${initialDirection}`
      };
    }
    
    // For subsequent points, we can determine relative direction
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i-1];
      const current = path[i];
      const next = path[i + 1];
      
      const distance = Math.sqrt(
        Math.pow(nodeMap[next].x - nodeMap[current].x, 2) + 
        Math.pow(nodeMap[next].y - nodeMap[current].y, 2)
      ).toFixed(1);
      
      const direction = getRelativeDirection(nodeMap[current], nodeMap[next], nodeMap[prev]);
      
      // Store direction info for current node
      directionMap[current] = {
        direction: direction,
        distance: distance,
        nextNode: next,
        directionText: `Turn ${direction}`
      };
    }
    
    // Add the destination node
    if (path.length > 1) {
      const destination = path[path.length - 1];
      directionMap[destination] = {
        direction: 'destination',
        distance: 0,
        nextNode: null,
        directionText: 'You have reached your destination'
      };
    }
    
    return directionMap;
  }
  
  // Main function with accurate directions for yellow tape tracking
  function getDirections(start, end) {
    // Get the path from start to end
    const path = findShortestPath(start, end);
    
    // Use the new path description function to get direction map
    return getPathDescription(path, nodes);
  }
  
// Attach nodes and edges to the functions so they can be accessed elsewhere
findShortestPath.nodes = nodes;
findShortestPath.edges = edges;

// Export for use in other modules
export { edges, findShortestPath, getDirections, nodes, setCurrentBuilding };
