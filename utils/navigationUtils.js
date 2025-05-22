// Utility: Euclidean distance
function euclideanDistance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  
  // Graph: Nodes (coordinates)
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
  
  // Compute turn direction
  function getTurnDirection(prev, curr, next) {
    const angle = (from, to) => Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
    const a1 = angle(prev, curr);
    const a2 = angle(curr, next);
    const delta = ((a2 - a1 + 360) % 360);
  
    if (delta < 30 || delta > 330) return "Go straight";
    if (delta < 150) return "Turn right";
    if (delta > 210) return "Turn left";
    return "Turn around";
  }
  
  // Main function
  function getDirections(start, end) {
    const path = findShortestPath(start, end);
    const directions = [];
  
    for (let i = 1; i < path.length - 1; i++) {
      const prev = nodes[path[i - 1]];
      const curr = nodes[path[i]];
      const next = nodes[path[i + 1]];
  
      const instruction = getTurnDirection(prev, curr, next);
      directions.push(`From ${path[i]}: ${instruction} to ${path[i + 1]}`);
    }
  
    directions.unshift(`Start at ${path[0]}, go to ${path[1]}`);
    directions.push(`You have arrived at ${end}`);
  
    return directions;
  }
  
  // Attach nodes and edges to the functions so they can be accessed elsewhere
  findShortestPath.nodes = nodes;
  findShortestPath.edges = edges;

  // Export for use in other modules
  export { edges, findShortestPath, getDirections, nodes };
