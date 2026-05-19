from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.k8s_client import get_k8s_clients
from kubernetes import client as k8s
from kubernetes.stream import stream
import asyncio

router = APIRouter()

@router.get("/{namespace}/{pod_name}")
def get_logs(namespace: str, pod_name: str, tail: int = 100):
    """
    Get the last N lines of logs from a pod.
    Regular HTTP endpoint — returns logs as a list.
    """
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]

    try:
        logs = core.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=tail,
            timestamps=True
        )
        return {"logs": logs.split("\n") if logs else []}
    except k8s.exceptions.ApiException as e:
        return {"logs": [f"Error fetching logs: {e.reason}"]}


@router.websocket("/stream/{namespace}/{pod_name}")
async def stream_logs(websocket: WebSocket, namespace: str, pod_name: str):
    """
    WebSocket endpoint — streams live logs line by line.
    Client connects, server keeps sending new log lines as they appear.
    Connection stays open until client disconnects.
    """
    await websocket.accept()

    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]

    try:
        # follow=True keeps the connection open like `kubectl logs -f`
        # _preload_content=False gives us a raw stream we can iterate
        log_stream = core.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            follow=True,
            tail_lines=50,
            timestamps=True,
            _preload_content=False
        )

        # Read the stream line by line and send each line to the browser
        for line in log_stream:
            try:
                decoded = line.decode("utf-8").strip()
                if decoded:
                    await websocket.send_text(decoded)
                # yield control back to the event loop so other
                # requests aren't blocked while we wait for logs
                await asyncio.sleep(0)
            except WebSocketDisconnect:
                break

    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")
    finally:
        log_stream.close()
        try:
            await websocket.close()
        except:
            pass
