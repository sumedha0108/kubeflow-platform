from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.k8s_client import get_k8s_clients
from kubernetes import client as k8s
from typing import Optional

router = APIRouter()

# ── Request Models ──────────────────────────────────────────────────────────

class DeployRequest(BaseModel):
    name: str           # app name, becomes the namespace + deployment name
    image: str          # docker image e.g. nginx:alpine
    replicas: int = 1
    port: int = 80

class ScaleRequest(BaseModel):
    replicas: int

# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("")
def deploy_app(req: DeployRequest):
    """
    Deploy a new app. Creates:
    - A dedicated namespace
    - A Deployment running the container
    - A Service exposing it internally
    """
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    apps = k8s_clients["apps"]

    # 1. Create namespace
    try:
        namespace = k8s.V1Namespace(
            metadata=k8s.V1ObjectMeta(
                name=req.name,
                labels={"managed-by": "kubeflow-platform"}
            )
        )
        core.create_namespace(body=namespace)
    except k8s.exceptions.ApiException as e:
        if e.status != 409:  # 409 = already exists, that's fine
            raise HTTPException(status_code=500, detail=f"Namespace error: {e.reason}")

    # 2. Create Deployment
    deployment = k8s.V1Deployment(
        metadata=k8s.V1ObjectMeta(name=req.name, namespace=req.name),
        spec=k8s.V1DeploymentSpec(
            replicas=req.replicas,
            selector=k8s.V1LabelSelector(
                match_labels={"app": req.name}
            ),
            template=k8s.V1PodTemplateSpec(
                metadata=k8s.V1ObjectMeta(labels={"app": req.name}),
                spec=k8s.V1PodSpec(
                    containers=[
                        k8s.V1Container(
                            name=req.name,
                            image=req.image,
                            ports=[k8s.V1ContainerPort(container_port=req.port)],
                            resources=k8s.V1ResourceRequirements(
                                requests={"cpu": "50m", "memory": "64Mi"},
                                limits={"cpu": "200m", "memory": "256Mi"}
                            )
                        )
                    ]
                )
            )
        )
    )

    try:
        apps.create_namespaced_deployment(namespace=req.name, body=deployment)
    except k8s.exceptions.ApiException as e:
        if e.status != 409:
            raise HTTPException(status_code=500, detail=f"Deployment error: {e.reason}")

    # 3. Create Service
    service = k8s.V1Service(
        metadata=k8s.V1ObjectMeta(name=req.name, namespace=req.name),
        spec=k8s.V1ServiceSpec(
            selector={"app": req.name},
            ports=[k8s.V1ServicePort(port=80, target_port=req.port)]
        )
    )

    try:
        core.create_namespaced_service(namespace=req.name, body=service)
    except k8s.exceptions.ApiException as e:
        if e.status != 409:
            raise HTTPException(status_code=500, detail=f"Service error: {e.reason}")

    return {
        "status": "deployed",
        "app": req.name,
        "image": req.image,
        "replicas": req.replicas
    }


@router.get("")
def list_apps():
    """
    List all apps managed by this platform.
    Finds all namespaces with our managed-by label.
    """
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    apps = k8s_clients["apps"]

    namespaces = core.list_namespace(
        label_selector="managed-by=kubeflow-platform"
    )

    result = []
    for ns in namespaces.items:
        name = ns.metadata.name
        try:
            deployment = apps.read_namespaced_deployment(name=name, namespace=name)
            pods = core.list_namespaced_pod(
                namespace=name,
                label_selector=f"app={name}"
            )
            ready_pods = sum(
                1 for p in pods.items
                if p.status.phase == "Running"
            )
            result.append({
                "name": name,
                "image": deployment.spec.template.spec.containers[0].image,
                "desired_replicas": deployment.spec.replicas,
                "ready_pods": ready_pods,
                "status": "healthy" if ready_pods == deployment.spec.replicas else "degraded"
            })
        except:
            result.append({"name": name, "status": "unknown"})

    return result


@router.get("/{name}")
def get_app(name: str):
    """
    Get detailed status of one app including pod list.
    """
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    apps = k8s_clients["apps"]

    try:
        deployment = apps.read_namespaced_deployment(name=name, namespace=name)
    except k8s.exceptions.ApiException:
        raise HTTPException(status_code=404, detail=f"App '{name}' not found")

    pods = core.list_namespaced_pod(
        namespace=name,
        label_selector=f"app={name}"
    )

    pod_list = []
    for p in pods.items:
        pod_list.append({
            "name": p.metadata.name,
            "phase": p.status.phase,
            "node": p.spec.node_name,
            "start_time": str(p.status.start_time)
        })

    return {
        "name": name,
        "image": deployment.spec.template.spec.containers[0].image,
        "desired_replicas": deployment.spec.replicas,
        "pods": pod_list
    }


@router.put("/{name}/scale")
def scale_app(name: str, req: ScaleRequest):
    """
    Scale an app to a new replica count.
    Uses a patch instead of full update — only changes replicas.
    """
    k8s_clients = get_k8s_clients()
    apps = k8s_clients["apps"]

    try:
        apps.patch_namespaced_deployment_scale(
            name=name,
            namespace=name,
            body={"spec": {"replicas": req.replicas}}
        )
    except k8s.exceptions.ApiException:
        raise HTTPException(status_code=404, detail=f"App '{name}' not found")

    return {"status": "scaled", "app": name, "replicas": req.replicas}


@router.delete("/{name}")
def delete_app(name: str):
    """
    Delete an app by deleting its entire namespace.
    Deleting a namespace cascades — removes all resources inside it.
    """
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]

    try:
        core.delete_namespace(name=name)
    except k8s.exceptions.ApiException:
        raise HTTPException(status_code=404, detail=f"App '{name}' not found")

    return {"status": "deleted", "app": name}
