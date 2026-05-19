from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.k8s_client import get_k8s_clients
from kubernetes import client as k8s
from typing import Optional, Dict

router = APIRouter()

# ── Request Models ────────────────────────────────────────────────────────

class DeployRequest(BaseModel):
    name: str
    image: str
    replicas: int = 1
    port: int = 80
    env_vars: Optional[Dict[str, str]] = {}  # e.g. {"WORDPRESS_DB_HOST": "localhost"}

class ScaleRequest(BaseModel):
    replicas: int

# ── Helpers ───────────────────────────────────────────────────────────────

def make_namespace(name):
    return k8s.V1Namespace(
        metadata=k8s.V1ObjectMeta(
            name=name,
            labels={"managed-by": "kubeflow-platform"}
        )
    )

def make_deployment(name, image, replicas, port, env_vars):
    # Convert env_vars dict into Kubernetes EnvVar objects
    env = [
        k8s.V1EnvVar(name=k, value=v)
        for k, v in (env_vars or {}).items()
    ]
    return k8s.V1Deployment(
        metadata=k8s.V1ObjectMeta(name=name, namespace=name),
        spec=k8s.V1DeploymentSpec(
            replicas=replicas,
            selector=k8s.V1LabelSelector(match_labels={"app": name}),
            template=k8s.V1PodTemplateSpec(
                metadata=k8s.V1ObjectMeta(labels={"app": name}),
                spec=k8s.V1PodSpec(
                    containers=[k8s.V1Container(
                        name=name,
                        image=image,
                        ports=[k8s.V1ContainerPort(container_port=port)],
                        env=env,
                        resources=k8s.V1ResourceRequirements(
                            requests={"cpu": "50m", "memory": "64Mi"},
                            limits={"cpu": "500m", "memory": "512Mi"}
                        )
                    )]
                )
            )
        )
    )

def make_service(name, port):
    return k8s.V1Service(
        metadata=k8s.V1ObjectMeta(name=name, namespace=name),
        spec=k8s.V1ServiceSpec(
            selector={"app": name},
            ports=[k8s.V1ServicePort(port=80, target_port=port)]
        )
    )

def make_ingress(name):
    return k8s.V1Ingress(
        metadata=k8s.V1ObjectMeta(
            name=name,
            namespace=name,
            annotations={"nginx.ingress.kubernetes.io/rewrite-target": "/"}
        ),
        spec=k8s.V1IngressSpec(
            ingress_class_name="nginx",
            rules=[k8s.V1IngressRule(
                host=f"{name}.local",
                http=k8s.V1HTTPIngressRuleValue(
                    paths=[k8s.V1HTTPIngressPath(
                        path="/",
                        path_type="Prefix",
                        backend=k8s.V1IngressBackend(
                            service=k8s.V1IngressServiceBackend(
                                name=name,
                                port=k8s.V1ServiceBackendPort(number=80)
                            )
                        )
                    )]
                )
            )]
        )
    )

def create_or_ignore(fn, *args, **kwargs):
    """Call a K8s create function, ignore 409 (already exists)."""
    try:
        fn(*args, **kwargs)
    except k8s.exceptions.ApiException as e:
        if e.status != 409:
            raise

# ── Routes ────────────────────────────────────────────────────────────────

@router.post("")
def deploy_app(req: DeployRequest):
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    apps = k8s_clients["apps"]
    networking = k8s_clients["networking"]

    try:
        create_or_ignore(core.create_namespace, body=make_namespace(req.name))
        create_or_ignore(apps.create_namespaced_deployment, namespace=req.name, body=make_deployment(req.name, req.image, req.replicas, req.port, req.env_vars))
        create_or_ignore(core.create_namespaced_service, namespace=req.name, body=make_service(req.name, req.port))
        create_or_ignore(networking.create_namespaced_ingress, namespace=req.name, body=make_ingress(req.name))
    except k8s.exceptions.ApiException as e:
        raise HTTPException(status_code=500, detail=f"Kubernetes error: {e.reason}")

    return {
        "status": "deployed",
        "app": req.name,
        "image": req.image,
        "replicas": req.replicas,
        "url": f"http://{req.name}.local"
    }


@router.get("")
def list_apps():
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    apps = k8s_clients["apps"]

    namespaces = core.list_namespace(label_selector="managed-by=kubeflow-platform")
    result = []

    for ns in namespaces.items:
        name = ns.metadata.name
        if name == "platform":
            continue
        try:
            deployment = apps.read_namespaced_deployment(name=name, namespace=name)
            pods = core.list_namespaced_pod(namespace=name, label_selector=f"app={name}")
            ready_pods = sum(1 for p in pods.items if p.status.phase == "Running")
            result.append({
                "name": name,
                "image": deployment.spec.template.spec.containers[0].image,
                "desired_replicas": deployment.spec.replicas,
                "ready_pods": ready_pods,
                "status": "healthy" if ready_pods == deployment.spec.replicas else "degraded",
                "url": f"http://{name}.local"
            })
        except:
            result.append({"name": name, "status": "unknown"})

    return result


@router.get("/{name}")
def get_app(name: str):
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    apps = k8s_clients["apps"]

    try:
        deployment = apps.read_namespaced_deployment(name=name, namespace=name)
    except k8s.exceptions.ApiException:
        raise HTTPException(status_code=404, detail=f"App '{name}' not found")

    pods = core.list_namespaced_pod(namespace=name, label_selector=f"app={name}")
    pod_list = [{
        "name": p.metadata.name,
        "phase": p.status.phase,
        "node": p.spec.node_name,
        "start_time": str(p.status.start_time)
    } for p in pods.items]

    return {
        "name": name,
        "image": deployment.spec.template.spec.containers[0].image,
        "desired_replicas": deployment.spec.replicas,
        "url": f"http://{name}.local",
        "pods": pod_list
    }


@router.put("/{name}/scale")
def scale_app(name: str, req: ScaleRequest):
    k8s_clients = get_k8s_clients()
    apps = k8s_clients["apps"]
    try:
        apps.patch_namespaced_deployment_scale(
            name=name, namespace=name,
            body={"spec": {"replicas": req.replicas}}
        )
    except k8s.exceptions.ApiException:
        raise HTTPException(status_code=404, detail=f"App '{name}' not found")
    return {"status": "scaled", "app": name, "replicas": req.replicas}


@router.delete("/{name}")
def delete_app(name: str):
    k8s_clients = get_k8s_clients()
    core = k8s_clients["core"]
    try:
        core.delete_namespace(name=name)
    except k8s.exceptions.ApiException:
        raise HTTPException(status_code=404, detail=f"App '{name}' not found")
    return {"status": "deleted", "app": name}
