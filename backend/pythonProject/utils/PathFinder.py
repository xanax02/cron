import heapq
from .models.graph import NavigationGraph

class Pathfinder:
    def __init__(self, graph: NavigationGraph):
        self.graph = graph

    def shortest_path(self, start_qr: str, end_landmark: str) -> List[str]:
        # Find QR ID of the target landmark
        end_qr = None
        for qr_id, data in self.graph.nodes.items():
            if data["landmark"] == end_landmark:
                end_qr = qr_id
                break
        if not end_qr:
            return []

        # Dijkstra's Algorithm
        heap = [(0, start_qr, [])]
        visited = set()

        while heap:
            cost, current, path = heapq.heappop(heap)
            if current in visited:
                continue
            visited.add(current)

            new_path = path + [current]
            if current == end_qr:
                return new_path

            for neighbor in self.graph.get_neighbors(current):
                heapq.heappush(
                    heap,
                    (cost + neighbor["distance"], neighbor["to"], new_path)
        return []