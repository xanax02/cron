from models.navigation_graph import NavigationGraph


def init_demo_graph() -> NavigationGraph:
    """Initialize and return a demo navigation graph with:
    - 4 key locations (nodes)
    - 3 connecting paths (edges)
    """
    graph = NavigationGraph()

    # ========================
    # 1. Add Nodes (QR Locations)
    # ========================
    # Format: add_node(qr_id, x_coord, y_coord, landmark_name)
    graph.add_node("entrance", x=0, y=0, landmark="Main Entrance")
    graph.add_node("hallway1", x=10, y=0, landmark="Hallway Junction")
    graph.add_node("cafeteria", x=10, y=15, landmark="Cafeteria")
    graph.add_node("elevator", x=20, y=0, landmark="Elevator")

    # ========================
    # 2. Add Edges (Walkable Paths)
    # ========================
    # Format: add_edge(qr_id1, qr_id2, walking_distance)
    graph.add_edge("entrance", "hallway1", distance=10)  # Entrance to Hallway
    graph.add_edge("hallway1", "cafeteria", distance=15)  # Hallway to Cafeteria
    graph.add_edge("hallway1", "elevator", distance=10)  # Hallway to Elevator

    return graph