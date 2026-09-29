import asyncio
import websockets
import json

async def test_live_ws():
    uri = "ws://127.0.0.1:8000/ws/live"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("Connected to WebSocket live stream!")
        for i in range(5):
            msg_str = await ws.recv()
            msg = json.loads(msg_str)
            print(f"\n--- Update #{i+1} ---")
            print(f"Type: {msg.get('type')}")
            print(f"Timestamp: {msg.get('timestamp')}")
            print(f"Camera: {msg.get('camera', {}).get('name')} | Status: {msg.get('camera', {}).get('status')}")
            print(f"People Count: {msg.get('people_count')}")
            people = msg.get('people', [])
            for p in people:
                print(f"  Person {p['id']}: conf={p['confidence']} | bbox=({p['bbox']['x']}, {p['bbox']['y']}, {p['bbox']['width']}, {p['bbox']['height']}) | geo={p['geo']} | acc={p['location_accuracy']} | dist={p['distance_meters']}m | route={p['route_distance_meters']}m")
            metrics = msg.get('metrics', {})
            print(f"Metrics: FPS={metrics.get('fps')} | CamLatency={metrics.get('camera_latency_ms')}ms | InferenceLatency={metrics.get('inference_latency_ms')}ms")
    print("\nWebSocket verification test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_live_ws())
