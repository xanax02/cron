from models.navigation_graph import NavigationGraph


class PathService:
    def __init__(self, graph: NavigationGraph):
        self.graph = graph

    def get_landmark(self, qr_id: str) -> str:
        """Returns the landmark name for a given QR code."""
        node = self.graph.nodes.get(qr_id)
        if not node:
            raise ValueError(f"QR code {qr_id} not found")
        return node["landmark"]

    def get_shortest_path(self, start_qr: str, end_landmark: str) -> list:
        """
        Returns the shortest path from start_qr to end_landmark.
        Args:
            start_qr: QR ID of the starting point
            end_landmark: Name of the destination landmark
        Returns:
            List of QR IDs representing the path
        """
        # Find QR ID for the end landmark
        end_qr = None
        for qr_id, data in self.graph.nodes.items():
            if data["landmark"].lower() == end_landmark.lower():
                end_qr = qr_id
                break

        if not end_qr:
            raise ValueError(f"Landmark {end_landmark} not found")

        # Get shortest path using Dijkstra's algorithm
        path = self.pathfinder.shortest_path(start_qr, end_qr)

        if not path:
            raise ValueError(f"No path found from {start_qr} to {end_landmark}")

        return path