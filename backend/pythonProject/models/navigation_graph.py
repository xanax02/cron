from typing import Dict, List


class NavigationGraph:
    def __init__(self):
        self.nodes: Dict[str, Dict] = {}  # { qr_id: {x, y, landmark} }
        self.edges: Dict[str, List[Dict]] = {}  # { qr_id: [{to: qr_id, distance: int}] }

    def add_node(self, qr_id: str, x: float, y: float, landmark: str):
        """Add a QR node (e.g., hallway junction, room entrance)."""
        self.nodes[qr_id] = {"x": x, "y": y, "landmark": landmark}

    def add_edge(self, qr1: str, qr2: str, distance: int):
        """Connect two QR nodes with a walkable path."""
        if qr1 not in self.edges:
            self.edges[qr1] = []
        self.edges[qr1].append({"to": qr2, "distance": distance})

        # Undirected graph (add reverse edge)
        if qr2 not in self.edges:
            self.edges[qr2] = []
        self.edges[qr2].append({"to": qr1, "distance": distance})

    def get_neighbors(self, qr_id: str) -> List[Dict]:
        """Get connected QR nodes."""
        return self.edges.get(qr_id, [])
