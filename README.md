# Architecture Board

An interactive, collaborative architecture design board for drawing system diagrams, with AI-powered design generation, real-time collaboration, and Kubernetes cluster visualization.

![Architecture Board](https://img.shields.io/badge/status-active-brightgreen)
![React Flow](https://img.shields.io/badge/React%20Flow-11.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## Features

### 🎨 Visual Architecture Design
- **Drag & drop** components from the palette onto the canvas — load balancers, databases, app servers, caches, message queues, VPCs, and more
- **Flow connections** — draw directional edges between nodes with configurable arrow styles (LTR, RTL, bidirectional, none)
- **Alignment guides** — blue dotted lines and distance indicators appear when dragging nodes, helping you align and space components
- **Selection tools** — pan, rectangle select, and freeform lasso for multi-selection
- **Undo/Redo** — full history stack with Ctrl+Z / Ctrl+Shift+Z support
- **Edge reconnection** — drag edge endpoints to change connections
- **Edge merging** — bidirectional pairs (A→B + B→A) automatically collapse into a single bidirectional edge

### 🧠 AI-Powered Design
- **Create mode** — describe a system and AI generates a complete architecture proposal with nodes, connections, and suggested requirements
- **Review mode** — AI scores your architecture (0–100) with specific strengths, weaknesses, and improvement suggestions
- **Modify mode** — AI fills in missing configuration details (DB schemas, API routes, LB rules, cache settings)
- **Smart layout engine** — auto-positions nodes in root-to-leaf layers with dynamic spacing and parent-proximity ordering
- **Layout directions** — toggle between Top→Bottom and Left→Right flow
- **Streaming responses** — AI tokens stream into the chat in real-time
- **Custom models** — configure any OpenAI-compatible API endpoint (OpenAI, Anthropic, DeepSeek, OpenRouter, etc.)
- **Random HLD questions** — generate YouTube/Twitter/Uber/WhatsApp system design prompts with requirements and capacity estimates

### ☸️ Kubernetes Cluster Visualization
- **Container nodes** — VPC, K8s Cluster, and Shapes (Rectangle, Square, Circle, Cloud) act as containers that can enclose other nodes
- **Drag-and-drop nesting** — drag nodes into a container to make them children; drag them out to detach
- **Resizable containers** — drag resize handles to change container dimensions
- **K8s-aware config** — namespaces with services, deployments, HPAs, VirtualServices, and DestinationRules
- **Visual namespace layout** — services and deployments rendered as mini-nodes inside the cluster with directional flow arrows
- **Auto-creation** — dragging an app server into a namespace auto-creates a deployment + service

### 👥 Real-Time Collaboration
- **Socket.IO** — live multiplayer editing with per-tab identity tracking
- **Control system** — request/accept/release control for conflict-free editing
- **User list** — see who's online with per-user tab counts
- **Unique identities** — random animal/adjective names (e.g. "SwiftFalcon42")

### 📋 Board Context
- **Problem statement** — describe what you're building
- **Notes sections** — functional requirements, non-functional requirements, capacity planning calculations
- **Context passed to AI** — all board context is included in AI prompts for better results

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Flow 11 |
| State | Zustand |
| Backend | Node.js, Express, Socket.IO |
| Database | JSON file persistence (`data/boards.json`) |
| AI | OpenAI-compatible API (BYO key) |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
git clone https://github.com/gaurav1704/architecture-board.git
cd architecture-board
npm install
npm run dev
```

This starts three processes:
- **Frontend** — [http://localhost:5173](http://localhost:5173)
- **Backend** — http://localhost:3001
- **Shared build** — watch mode

### Using AI Features

1. Open the ⚙️ **AI Settings** (topbar) and configure:
   - **API URL** — your OpenAI-compatible endpoint
   - **Model** — e.g., `gpt-4o-mini`, `deepseek-v4-flash`
   - **API Key** — your key (stored locally, never sent to our server)
2. Click 💬 **AI** to open the chat panel
3. Choose **Create**, **Review**, or **Modify** mode
4. Type your request and press Send

### Exposing via ngrok

```bash
ngrok http 5173
```

The `vite.config.ts` has `allowedHosts: true` for ngrok compatibility.

## Project Structure

```
architecture-board/
├── packages/
│   ├── shared/          # Shared types, node definitions, layout engine
│   │   └── src/nodes/   # 20+ node type definitions (pluggable registry)
│   ├── frontend/        # React + Vite + React Flow
│   │   └── src/
│   │       ├── components/  # Chat, modals, sidebar, review panels
│   │       ├── edges/       # Custom edge component with arrows
│   │       ├── hooks/       # Socket.IO, identity
│   │       ├── nodes/       # Custom node renderer
│   │       ├── store/       # Zustand store
│   │       └── styles/      # Global CSS
│   └── backend/         # Express + Socket.IO
│       └── src/
│           ├── routes/      # Board CRUD, AI endpoints
│           ├── ws/          # WebSocket collaboration
│           └── models/      # Board persistence
├── package.json         # Workspace root
└── vite.config.ts
```

## Node Types

| Category | Nodes |
|----------|-------|
| **Databases** | PostgreSQL, MongoDB, ClickHouse, MySQL, Elasticsearch |
| **Cache** | Redis, In-Memory Cache |
| **Network** | VPC, VPC Peering, Transit Gateway, Proxy, Reverse Proxy |
| **Load Balancer** | ALB, NLB, Mesh LB |
| **Components** | K8s Cluster, Prometheus, Grafana, Kibana, S3, GCS, External System |
| **Application Server** | Web Server, Cronjob, Producer, Consumer, Static Worker |
| **Messaging Queues** | Kafka, RabbitMQ |
| **Shapes** | Rectangle, Square, Circle, Cloud |

## License

MIT
