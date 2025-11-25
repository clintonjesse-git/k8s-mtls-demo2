Overview:
This project deploys a simple Node.js “Hello World” app to Kubernetes and secures it using mutual TLS:
The server presents a certificate signed by your self-signed Root CA.
The client must also present a valid certificate signed by the same CA.
The NGINX Ingress Controller enforces this requirement before traffic can reach the application.
Since this project was scoped to demonstrate mTLS enforcement inside Kubernetes, I used Kind to create a local cluster instead of provisioning cloud infrastructure. Terraform is typically used to provision the underlying infrastructure — like AKS or EKS clusters — but for this local, cost-efficient setup, plain Kubernetes YAML was the right choice for this.

This implementation is commonly used in Zero Trust, service-to-service authentication, and enterprise APIs that require strong identity verification.


Overall Structure:

k8s-mtls-demo2/
│
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── certs/
│   ├── ca2.crt
│   ├── ca2.key
│   ├── server2.crt
│   ├── server2.key
│   ├── client2.crt
│   ├── client2.key
│   ├── server2.csr
│   └── client2.csr
│
├── k8s/
│   ├── deployment.yaml
│   └── ingress.yaml
│
├── kind-mtls-demo2.yaml
└── README.md

Tools used:
Kubernetes, kind (Kubernetes in Docker), NGINX Ingress Controller, Node.js, Docker, OpenSSL (for certificate generation), YAML Infrastructure as Code (IaC).



Guide with bash commands:
Cloning the repo:
git clone https://github.com/clintonjesse-git/k8s-mtls-demo2.gitcd k8s-mtls-demo2
cd k8s-mtls-demo2

Building the App Img:
docker build -t hello-demo2:1.0.0 ./app

Creating the Local Kind Cluster
kind create cluster --name mtls-demo2 --config kind-mtls-demo2.yaml

Installing NGINX Ingress:
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.hostPort.enabled=true \
  --set controller.ingressClassResource.default=true \
  --set controller.watchIngressWithoutClass=true

Generating Self-Signed Certificates:
cd certs

openssl genrsa -out ca2.key 4096
openssl req -x509 -new -nodes -key ca2.key -sha256 -days 365 \
  -subj "/CN=Demo2 Root CA" -out ca2.crt

Note:Server + client cert generation is also included in certs/.

Creating Kubernetes Namespace + Secrets:
kubectl create namespace demo2

kubectl -n demo2 create secret tls demo2-tls \
  --cert=certs/server2.crt --key=certs/server2.key

kubectl -n demo2 create secret generic demo2-client-ca \
  --from-file=ca.crt=certs/ca2.crt

Deploying Application + Service:
Loaded the img into kind first: kind load docker-image hello-demo2:1.0.0 --name mtls-demo2
Apply manifests: kubectl apply -f k8s/deployment.yaml
                            kubectl -n demo2 rollout status deploy/demo2
Deploy Ingress with mTLS Enforcement:
kubectl apply -f k8s/ingress.yaml


Testing mTLS without client certificate(which should be rejected): 
curl -kv --resolve demo2.local:8443:127.0.0.1 https://demo2.local:8443/	

Output should be: 400 No required SSL certificate was sent


Testing mTLS with client certificate(which should return Hello World):
curl -kv --resolve demo2.local:8443:127.0.0.1 \--cert certs/client2.crt --key certs/client2.key \https://demo2.local:8443/

Output should be: Hello from Demo2 over mTLS! Verified client: CN=Demo2 Client



Final Outputs/Result:
Pods run
Ingress enforces mTLS
No client cert → blocked
Client cert → 200 OK
This completes an end-to-end Zero Trust mTLS Kubernetes deployment.
