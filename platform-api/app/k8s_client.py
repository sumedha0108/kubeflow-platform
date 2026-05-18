from kubernetes import client, config
import os

def get_k8s_clients():
    """
    Load Kubernetes config.
    - Inside cluster: uses the ServiceAccount token mounted into the pod
    - Outside cluster (local dev): uses your ~/.kube/config file
    """
    try:
        config.load_incluster_config()
    except:
        config.load_kube_config(context="kind-kubeflow")

    return {
        "apps": client.AppsV1Api(),      # Deployments, ReplicaSets
        "core": client.CoreV1Api(),       # Pods, Services, Namespaces
        "networking": client.NetworkingV1Api()  # Ingress
    }
